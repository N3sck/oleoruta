/* OleoRuta · aplicación (enrutador por hash + pantallas P1–P7)
   Rutas del recolector: #/r/...   Rutas del generador: #/g/GEN-00X/... */
(function () {
  'use strict';
  const D = window.OleoDB, U = window.UI;
  const { icon, fmt, esc } = U;
  D.load();

  const app = document.getElementById('app');
  let cleanup = null;
  const SKEY = 'oleoruta.session';

  // Puente con la app nativa de iOS (WKWebView). En navegador NATIVE es null.
  const NATIVE = window.OleoNativeInfo || null;
  const post = (m) => { try { window.webkit.messageHandlers.oleo.postMessage(m); } catch (e) { } };
  const haptic = (style = 'light') => { if (NATIVE) post({ type: 'haptic', style }); else if (navigator.vibrate) navigator.vibrate(style === 'success' ? [30, 40, 30] : 20); };
  if (NATIVE && NATIVE.reset) { D.reset(); try { localStorage.removeItem(SKEY); } catch (e) { } }
  window.OleoPrint = () => NATIVE ? post({ type: 'print' }) : window.print();
  window.OleoNative = {
    scanResult: (code) => handleCode(code),
    scanCancelled: () => { },
    scanUnavailable: () => U.toast('Cámara no disponible · usa la simulación', 'camera'),
    fetchResult: (json) => window.OleoCloud && OleoCloud.fetchResultado(json),
  };
  const go = (h) => { location.hash = h; };
  const setSession = (s) => { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { } };
  const getSession = () => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch (e) { return null; } };
  const db = () => D.db;
  const cfg = () => D.db.config;

  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const q = Object.fromEntries(new URLSearchParams(qs || ''));
    return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), q };
  }

  // ---------- piezas comunes ----------
  const top = (title, back, right = '<div class="spacer40"></div>') =>
    `<div class="topbar">${back ? `<a class="icon-btn" href="${back}" aria-label="Regresar">${icon('back')}</a>` : '<div class="spacer40"></div>'}<div class="title">${title}</div>${right}</div>`;

  function tabbarR(on) {
    const t = [['inicio', 'home', 'Inicio'], ['ruta', 'route', 'Ruta'], ['escanear', 'scan', 'Escanear'], ['tablero', 'chart', 'Tablero'], ['mas', 'more', 'Más']];
    return `<nav class="tabbar">${t.map(([k, i, l]) => k === 'escanear'
      ? `<a class="fab ${on === k ? 'on' : ''}" href="#/r/${k}"><span class="fabc">${icon(i)}</span>${l}</a>`
      : `<a class="${on === k ? 'on' : ''}" href="#/r/${k}">${icon(i)}${l}</a>`).join('')}</nav>`;
  }
  function tabbarG(id, on) {
    const t = [['inicio', 'home', 'Inicio'], ['entregas', 'receipt', 'Entregas'], ['qr', 'qr', 'Mi QR'], ['impacto', 'leaf', 'Impacto'], ['perfil', 'user', 'Perfil']];
    return `<nav class="tabbar">${t.map(([k, i, l]) => k === 'qr'
      ? `<a class="fab ${on === k ? 'on' : ''}" href="#/g/${id}/${k}"><span class="fabc">${icon(i)}</span>${l}</a>`
      : `<a class="${on === k ? 'on' : ''}" href="#/g/${id}/${k}">${icon(i)}${l}</a>`).join('')}</nav>`;
  }
  const row = (href, ic, title, sub = '', val = '', valSub = '') =>
    `<a class="row" href="${href}"><span class="ri">${icon(ic)}</span><span class="rt"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</span>${val ? `<span class="rv">${val}${valSub ? `<span>${valSub}</span>` : ''}</span>` : ''}${icon('chev', 'chev')}</a>`;
  const gauge = (p, cls = '', ghost = 0) => `<div class="gauge ${cls}">${ghost ? `<span class="ghost" style="width:${Math.min(100, (p + ghost) * 100)}%"></span>` : ''}<i style="width:${Math.min(100, p * 100)}%"></i></div>`;
  const estatusPill = (z) => z.estatus === 'LISTO PARA PLANTA' ? `<span class="pill solid">${icon('factory')}Listo para planta</span>` : `<span class="pill">Acumulando</span>`;

  function zonaRow(z, href = '#/r/zonas') {
    return `<a class="row" href="${href}" style="display:block">
      <div class="between"><b style="font-weight:500">${z.zona}</b><span class="flex">${estatusPill(z)}<span class="num" style="font-weight:600;min-width:46px;text-align:right">${fmt.pct(z.avance)}</span></span></div>
      <div class="mt8">${gauge(z.avance, '')}</div>
      <div class="gauge-legend"><span>${fmt.L(z.litrosPendientes)} de ${cfg().umbral_lote} L</span><span>${z.generadores.length} puestos · ${z.lotesEnviados} lotes enviados</span></div></a>`;
  }

  // ======================================================
  //  SESIÓN · iniciar sesión y crear cuenta
  //  Usuario = ID_Generador · Contraseña = Nombre_Negocio (se validan contra la hoja «Generadores»)
  // ======================================================
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const normId = (t) => { const m = String(t || '').toUpperCase().match(/GEN\s*-?\s*(\d{1,4})/); return m ? 'GEN-' + m[1].padStart(3, '0') : null; };

  // Trae las cuentas de la hoja y las agrega al teléfono (para iniciar sesión y para que el recolector las vea)
  async function sincronizarCuentas() {
    if (!window.OleoCloud) return false;
    try { (await OleoCloud.hoja('Generadores')).forEach(r => D.upsertGenerador(D.desdeHoja(r))); return true; }
    catch (e) { return false; }
  }

  function cuentaSheet() {
    const s = getSession() || {};
    const g = s.role === 'G' ? D.gen(s.id) : null;
    U.sheet(`<div class="between"><h3 style="margin:0;font-size:20px">Tu cuenta</h3><button class="icon-btn" data-close>${icon('close')}</button></div>
      <div class="rows"><div class="acct">${g ? `<span class="avatar">${fmt.iniciales(g.nombre)}</span><span class="rt"><b>${esc(g.nombre)}</b><span>Usuario ${g.id} · ${g.zona}</span></span>` : `<span class="avatar dark">${icon('truck')}</span><span class="rt"><b>Recolector · ${esc(cfg().recolector)}</b><span>Operación en calle</span></span>`}</div></div>
      <a class="btn ghost mt16" href="#/login" data-act="logout">${icon('logout')}Cerrar sesión</a>`);
  }

  function authHead(sub) {
    return `<div class="logo">${U.logo(44)}<b>Oleo<span>Ruta</span></b></div>
      <h2>Cada litro de aceite,<br><em>pagado al instante.</em></h2>
      <p class="lead">${sub}</p>`;
  }
  function authTabs(on) {
    return `<div class="seg auth-tabs"><a class="${on === 'login' ? 'on' : ''}" href="#/login">Iniciar sesión</a><a class="${on === 'registro' ? 'on' : ''}" href="#/registro">Crear cuenta</a></div>`;
  }

  function Login(q) {
    app.innerHTML = `<div class="login">
      ${authHead('Entra con tu usuario y contraseña para ver tus pagos, tu QR y tu impacto.')}
      ${authTabs('login')}
      <form id="lf" novalidate autocomplete="on">
        <div class="field"><label>Usuario (ID de generador)</label><div class="inp">${icon('user')}<input name="u" id="lu" placeholder="GEN-001" autocapitalize="characters" autocomplete="username" spellcheck="false" value="${esc(q.u || '')}"></div></div>
        <div class="field"><label>Contraseña</label><div class="inp">${icon('shield')}<input name="p" id="lp" type="password" placeholder="Nombre de tu negocio" autocomplete="current-password"><button type="button" class="eye" id="eye" aria-label="Mostrar contraseña">${icon('eye')}</button></div>
          <div class="hint">Tu contraseña es el nombre de tu negocio, tal como lo registraste.</div></div>
        <div id="err"></div>
        <button class="btn mt16" type="submit" id="go">${icon('check')}<span>Iniciar sesión</span></button>
      </form>
      <p class="center small muted mt16">¿Aún no tienes cuenta? <a href="#/registro" style="color:var(--oil);font-weight:600">Crea una aquí</a></p>
      <div class="rows mt24"><button class="acct feature" id="rec"><span class="avatar dark">${icon('truck')}</span><span class="rt"><b>Acceso del recolector</b><span>Operación en calle · ${esc(cfg().recolector)}</span></span>${icon('chev', 'chev')}</button></div>
      <p class="foot-note">Prototipo funcional MVP · Sprint 2<br>Cuentas guardadas en Google Sheets · BD_OleoRuta</p>
    </div>`;
    const f = app.querySelector('#lf'), err = app.querySelector('#err'), btn = app.querySelector('#go');
    app.querySelector('#eye').onclick = () => { const p = app.querySelector('#lp'); p.type = p.type === 'password' ? 'text' : 'password'; };
    app.querySelector('#rec').onclick = () => { setSession({ role: 'R' }); go('#/r/inicio'); };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const id = normId(f.u.value), pass = f.p.value;
      const fail = (m) => { err.innerHTML = `<div class="field"><div class="err">${m}</div></div>`; haptic('light'); };
      if (!id) return fail('Escribe tu usuario, por ejemplo GEN-001.');
      if (!pass.trim()) return fail('Escribe tu contraseña (el nombre de tu negocio).');
      btn.disabled = true; btn.querySelector('span').textContent = 'Verificando…'; err.innerHTML = '';
      await sincronizarCuentas();
      btn.disabled = false; btn.querySelector('span').textContent = 'Iniciar sesión';
      const g = D.gen(id);
      if (!g) return fail(`No encontramos la cuenta ${id}. Revisa tu usuario o crea una cuenta nueva.`);
      if (norm(pass) !== norm(g.nombre)) return fail('La contraseña no coincide. Recuerda: es el nombre de tu negocio.');
      haptic('success');
      setSession({ role: 'G', id: g.id });
      go(`#/g/${g.id}/inicio`);
    };
  }

  // Formulario de alta (lo usan «Crear cuenta» y el alta de puesto del recolector)
  function formAlta(prefijo) {
    return `
      <div class="field"><label>Nombre del negocio</label><div class="inp">${icon('store')}<input name="nombre" maxlength="60" placeholder="Ej. Tortas La Güera" autocapitalize="words"></div><div class="hint">Será tu contraseña para iniciar sesión.</div></div>
      <div class="field"><label>Tipo de negocio <span class="muted">· desliza para ver más</span></label>
        <div class="tipos" id="${prefijo}tipos">${D.TIPOS.map((t, i) => `<button type="button" class="tipo ${i === 0 ? 'on' : ''}" data-tipo="${esc(t.valor)}"><span class="ti">${icon(/Tianguis/.test(t.valor) ? 'layers' : t.valor === 'Fonda' ? 'home' : t.valor === 'Otro' ? 'more' : 'store')}</span><b>${t.corto}</b><span>≈ ${t.litros} L/sem</span></button>`).join('')}</div></div>
      <div class="field"><label>Nombre del responsable</label><div class="inp">${icon('user')}<input name="responsable" maxlength="40" placeholder="Nombre y apellido" autocapitalize="words"></div></div>
      <div class="field"><label>Teléfono (WhatsApp)</label><div class="inp">${icon('phone')}<input name="telefono" inputmode="numeric" maxlength="14" autocomplete="tel-national" placeholder="10 dígitos"></div></div>
      <div class="field"><label>Colonia</label><div class="inp">${icon('pin')}<input name="colonia" maxlength="40" placeholder="Ej. Narvarte Oriente" autocapitalize="words"></div></div>
      <div class="field"><label>Zona de recolección</label><div class="seg mt0" id="${prefijo}zona">${D.ZONAS.map((z, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-zona="${z.zona}">${z.zona}</button>`).join('')}</div></div>`;
  }
  function bindAlta(root, prefijo, onDone) {
    const f = root.querySelector('form'), err = root.querySelector('#err'), btn = root.querySelector('button[type=submit]');
    let tipo = D.TIPOS[0].valor, zona = D.ZONAS[0].zona;
    root.querySelectorAll(`#${prefijo}tipos .tipo`).forEach(b => b.onclick = () => {
      root.querySelectorAll(`#${prefijo}tipos .tipo`).forEach(x => x.classList.remove('on')); b.classList.add('on'); tipo = b.dataset.tipo; haptic('light');
      b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    root.querySelectorAll(`#${prefijo}zona button`).forEach(b => b.onclick = () => {
      root.querySelectorAll(`#${prefijo}zona button`).forEach(x => x.classList.remove('on')); b.classList.add('on'); zona = b.dataset.zona;
    });
    f.telefono.oninput = () => { f.telefono.value = f.telefono.value.replace(/\D/g, '').slice(0, 10); };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = { nombre: f.nombre.value.trim().replace(/\s+/g, ' '), tipo, responsable: f.responsable.value.trim(), telefono: f.telefono.value, colonia: f.colonia.value.trim(), zona };
      const faltan = [];
      if (d.nombre.length < 3) faltan.push('el nombre del negocio (mínimo 3 letras)');
      if (d.responsable.length < 2) faltan.push('el nombre del responsable');
      if (!/^\d{10}$/.test(d.telefono)) faltan.push('un teléfono de 10 dígitos');
      if (d.colonia.length < 2) faltan.push('la colonia');
      const fail = (m) => { err.innerHTML = `<div class="field"><div class="err">${m}</div></div>`; haptic('light'); };
      if (faltan.length) return fail('Falta ' + faltan.join(', ') + '.');
      if (db().generadores.some(g => norm(g.nombre) === norm(d.nombre))) return fail('Ya existe una cuenta con ese nombre de negocio.');
      if (!window.OleoCloud || !OleoCloud.enabled()) return fail('Se necesita conexión a internet para crear la cuenta.');
      btn.disabled = true; const txt = btn.querySelector('span').textContent; btn.querySelector('span').textContent = 'Creando cuenta…'; err.innerHTML = '';
      let r;
      try { r = await OleoCloud.alta(d); } catch (e2) { r = { ok: false, data: { error: e2.name === 'AbortError' ? 'El servidor tardó demasiado en responder.' : 'No se pudo conectar con el servidor.' } }; }
      btn.disabled = false; btn.querySelector('span').textContent = txt;
      if (!r.ok) {
        const viejo = r.data && /litros fuera de rango|ID de generador inválido/.test(r.data.error || '');
        const m = viejo ? 'El servidor aún no tiene activada la creación de cuentas (falta publicar la nueva versión del Apps Script).' : (r.data && r.data.error) || 'No se pudo crear la cuenta. Intenta de nuevo.';
        return fail(m);
      }
      const g = D.upsertGenerador(D.desdeHoja(r.data.generador));
      haptic('success');
      onDone(g);
    };
  }

  function Registro() {
    app.innerHTML = `<div class="login">
      ${authHead('Registra tu negocio para recibir pagos digitales por tu aceite usado.')}
      ${authTabs('registro')}
      <form id="rf" novalidate>
        ${formAlta('r')}
        <div class="note mt16">${icon('info')}<span>Tu <b>usuario</b> será tu ID de generador (se asigna en orden) y tu <b>contraseña</b> será el <b>nombre de tu negocio</b>.</span></div>
        <div id="err"></div>
        <button class="btn mt16" type="submit">${icon('check')}<span>Crear cuenta</span></button>
      </form>
      <p class="center small muted mt16">¿Ya tienes cuenta? <a href="#/login" style="color:var(--oil);font-weight:600">Inicia sesión</a></p>
    </div>`;
    bindAlta(app, 'r', (g) => go(`#/bienvenida/${g.id}`));
  }

  function Bienvenida(id) {
    const g = D.gen(id);
    if (!g) return go('#/login');
    app.innerHTML = `<div class="login center">
      <div class="okmark">${icon('check')}</div>
      <h2 style="margin-top:22px">¡Tu cuenta<br><em>está lista!</em></h2>
      <p class="lead">${esc(g.nombre)} · ${esc(g.colonia)}, ${g.zona}</p>
      <div class="cred mt24">
        <div class="label">Tu usuario</div>
        <div class="cid">${g.id}</div>
        <div class="label mt16">Tu contraseña</div>
        <div class="cpass">${esc(g.nombre)}</div>
      </div>
      <div class="note mt16" style="text-align:left">${icon('info')}<span>Tu contraseña es el <b>nombre de tu negocio</b>, tal como lo escribiste. Guarda tu usuario <b>${g.id}</b>.</span></div>
      <button class="btn mt24" id="entrar">${icon('chev')}<span>Entrar a mi cuenta</span></button>
      <a class="btn ghost small mt8" href="#/login?u=${g.id}">Ir a iniciar sesión</a>
    </div>`;
    app.querySelector('#entrar').onclick = () => { setSession({ role: 'G', id: g.id }); go(`#/g/${g.id}/inicio`); };
  }

  // ======================================================
  //  RECOLECTOR
  // ======================================================
  function hoy0() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  // P1 · Inicio
  function RInicio() {
    const ruta = D.rutaDelDia();
    const hechos = ruta.filter(p => p.estado === 'RECOLECTADO');
    const pend = ruta.filter(p => p.estado === 'PENDIENTE');
    const litrosHoy = db().recolecciones.filter(r => new Date(r.fecha) >= hoy0()).reduce((s, r) => s + r.litros, 0);
    const zs = D.zonas();
    const listos = zs.filter(z => z.estatus === 'LISTO PARA PLANTA');
    const next = pend[0];
    return `<div class="screen">
      <div class="brand-head"><div><h1>${esc(cfg().recolector)}</h1><div class="sub"><span class="dot ${pend.length ? '' : 'ok'}"></span>${pend.length ? `En ruta · ${pend.length} ${pend.length === 1 ? 'parada pendiente' : 'paradas pendientes'}` : 'Ruta completada'}</div></div><button class="avatar dark" id="sw" aria-label="Tu cuenta">${icon('swap')}</button></div>
      <div class="hero">${U.van(litrosHoy, 120)}
        <div class="big num">${fmt.n1(litrosHoy)}<small>L</small></div>
        <div class="cap">a bordo hoy · ${hechos.length} de ${ruta.length} paradas · ${fmt.mxn0(litrosHoy * cfg().precio_litro)} pagados</div>
      </div>
      <div class="quick">
        <a href="#/r/escanear"><span class="q on">${icon('scan')}</span>Escanear</a>
        <a href="#/r/ruta"><span class="q">${icon('route')}</span>Ruta</a>
        <a href="#/r/zonas"><span class="q">${icon('layers')}</span>Lotes</a>
        <a href="#/r/tablero"><span class="q">${icon('chart')}</span>Tablero</a>
      </div>
      ${listos.length ? `<a class="card oil flex" href="#/r/zonas" style="display:flex"><span class="ri" style="width:40px;height:40px;border-radius:12px;background:var(--oil);color:#111;display:grid;place-items:center;flex:none">${icon('factory')}</span><span style="flex:1"><b style="display:block">Lote listo para planta</b><span class="muted small">${listos.map(z => `${z.zona} · ${fmt.L(z.litrosPendientes)}`).join(' · ')} — aviso enviado a ${esc(cfg().recicladora)}</span></span>${icon('chev', 'chev')}</a>` : ''}
      ${next ? `<div class="section-title"><span class="label">Siguiente parada</span><a href="#/r/ruta">Ver ruta</a></div>
      <div class="card">
        <div class="flex"><span class="avatar">${fmt.iniciales(next.g.nombre)}</span><div style="flex:1;min-width:0"><b style="display:block">${esc(next.g.nombre)}</b><span class="muted small">${next.g.id} · ${esc(next.g.colonia)}</span></div><span class="pill oil">≈ ${fmt.L(next.n.litros)}</span></div>
        ${next.sol ? `<div class="mt16 small" style="background:var(--card-2);border-radius:12px;padding:10px 12px"><span class="pill oil" style="margin-bottom:6px">${icon('bell')}Aviso del puesto</span><div class="muted mt8">“${esc(next.sol.nota)}”</div></div>` : ''}
        <div class="btn-row"><a class="btn small" href="#/r/escanear">${icon('scan')}Escanear QR</a><a class="btn small ghost" href="#/r/puesto/${next.g.id}">Ver ficha</a></div>
      </div>` : ''}
      <div class="section-title"><span class="label">Avance de lotes por zona</span><a href="#/r/zonas">Detalle</a></div>
      <div class="rows">${zs.map(z => zonaRow(z)).join('')}</div>
      <div class="section-title"><span class="label">Operación</span></div>
      <div class="rows">
        ${row('#/r/puestos', 'store', 'Puestos registrados', `${db().generadores.length} generadores con QR`)}
        ${row('#/r/monitor', 'bolt', 'Monitor de automatización', 'Bot · Escenario A · API SPEI simulada', '<span class="pill ok">Activo</span>')}
        ${row('#/r/bd', 'db', 'Base de datos', 'BD_OleoRuta · 5 tablas')}
        ${row('#/r/etiquetas', 'tag', 'Etiquetas QR', 'Imprime el QR de cada puesto')}
      </div>
    </div>${tabbarR('inicio')}`;
  }

  // Ruta del día
  function RRuta() {
    const ruta = D.rutaDelDia();
    const zs = D.zonas().filter(z => z.estatus === 'LISTO PARA PLANTA');
    const est = ruta.filter(p => p.estado === 'PENDIENTE').reduce((s, p) => s + p.n.litros, 0);
    return `<div class="screen">
      ${top('Ruta del día', '#/r/inicio')}
      <div class="grid3">
        <div class="tile"><span class="label">Paradas</span><div class="v num">${ruta.length}</div></div>
        <div class="tile"><span class="label">Hechas</span><div class="v num">${ruta.filter(p => p.estado === 'RECOLECTADO').length}</div></div>
        <div class="tile oil"><span class="label">Estimado</span><div class="v num">${fmt.n(est)}<small>L</small></div></div>
      </div>
      <div class="steps card">
        ${ruta.map((p, i) => `<a class="step ${p.estado === 'RECOLECTADO' ? 'done' : ''}" href="${p.estado === 'RECOLECTADO' ? `#/r/comprobante/${p.rec.id}` : `#/r/puesto/${p.g.id}`}" style="display:flex">
          <span class="si">${p.estado === 'RECOLECTADO' ? icon('check') : `<b style="font-size:13px">${i + 1}</b>`}</span>
          <span class="st"><b>${esc(p.g.nombre)}</b><span>${p.g.zona}${p.g.colonia !== p.g.zona ? ' · ' + esc(p.g.colonia) : ''} · ${p.estado === 'RECOLECTADO' ? `${fmt.L(p.rec.litros)} a las ${fmt.hora(p.rec.fecha)}` : `≈ ${fmt.L(p.n.litros)} estimados`}</span>${p.sol ? `<span style="display:block;color:var(--oil);margin-top:3px">${icon('bell', '').replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-2px"')} Avisó: “${esc(p.sol.nota)}”</span>` : ''}</span>
          <span class="ms">${p.estado === 'RECOLECTADO' ? '<span class="pill ok">Pagado</span>' : icon('chev', 'chev')}</span></a>`).join('')}
        ${zs.map(z => `<a class="step" href="#/r/zonas" style="display:flex"><span class="si" style="background:var(--oil);color:#111">${icon('factory')}</span><span class="st"><b>Centro de acopio → ${esc(cfg().recicladora)}</b><span>Lote ${z.zona} listo · ${fmt.L(z.litrosPendientes)}</span></span><span class="ms">${icon('chev', 'chev')}</span></a>`).join('')}
      </div>
      <p class="muted small center mt16">La ruta se arma con la frecuencia de cada puesto, los avisos recibidos y la regla de ${cfg().umbral_lote} L por zona.</p>
      <a class="btn mt16" href="#/r/escanear">${icon('scan')}Escanear siguiente puesto</a>
    </div>${tabbarR('ruta')}`;
  }

  // P2 · Escanear QR
  function REscanear(q) {
    const demo = q.demo && D.gen(q.demo);
    const html = `<div class="screen">
      ${top('Escanear QR', '#/r/inicio')}
      <div class="scanner" id="scn">
        <video id="vid" playsinline muted></video>
        <div class="sim" id="sim">${demo ? labelFeed(demo) : ''}</div>
        <div class="frame"><i></i><i></i><i></i><i></i><div class="laser"></div></div>
        ${demo ? detectedHTML(demo) : '<div class="hint" id="hint">Apunta la cámara a la etiqueta del puesto</div>'}
      </div>
      <div class="section-title"><span class="label">Simular escaneo (demo)</span></div>
      <div class="chips mt8">${db().generadores.map(g => `<button class="chip ${demo && demo.id === g.id ? 'on' : ''}" data-sim="${g.id}">${g.id}</button>`).join('')}<button class="chip" data-sim="${D.siguienteId()}">QR no registrado</button></div>
      <div class="flex mt16"><div class="field" style="flex:1;margin:0"><input id="manual" placeholder="Captura manual · GEN-001" autocapitalize="characters"></div><button class="icon-btn" style="width:52px;height:52px;border-radius:14px;background:var(--oil);color:#111" id="go" aria-label="Buscar">${icon('chev')}</button></div>
    </div>${tabbarR('escanear')}`;
    setTimeout(() => {
      app.querySelectorAll('[data-sim]').forEach(b => b.onclick = () => handleCode(U.qrPayload(b.dataset.sim)));
      const m = app.querySelector('#manual');
      app.querySelector('#go').onclick = () => m.value && handleCode(m.value);
      m.onkeydown = (e) => { if (e.key === 'Enter' && m.value) handleCode(m.value); };
      if (!demo) NATIVE ? nativeScanner() : startCamera();
    });
    return html;
  }
  function labelFeed(g) {
    return `<div style="transform:rotate(-4deg);width:58%;background:#fff;border-radius:14px;padding:10px;box-shadow:0 20px 50px rgba(0,0,0,.6);color:#111;text-align:center;font-weight:700;font-size:11px">${U.qrSVG(U.qrPayload(g.id), 'qr-feed')}<div style="font-family:var(--mono);font-size:14px">${g.id}</div><div style="font-size:9px;font-weight:600">${esc(g.nombre)}</div></div>`;
  }
  function detectedHTML(g) {
    return `<div class="detected"><span class="avatar">${fmt.iniciales(g.nombre)}</span><span class="rt"><b>${esc(g.nombre)}</b><span>QR detectado · ${g.id} · ${g.zona}</span></span><a class="btn small" style="width:auto;padding:0 16px" href="#/r/puesto/${g.id}">Abrir ficha</a></div>`;
  }
  function handleCode(raw) {
    const m = String(raw).toUpperCase().match(/GEN-?(\d{1,4})/);
    if (!m) { U.toast('El código no pertenece a OleoRuta', 'alert'); return; }
    const id = 'GEN-' + m[1].padStart(3, '0');
    const g = D.gen(id);
    haptic('light');
    if (!g) { U.toast(`QR ${id} no registrado · alta del puesto`, 'info'); go(`#/r/alta?id=${id}`); return; }
    const scn = app.querySelector('#scn');
    if (scn) {
      const old = scn.querySelector('.detected, #hint'); old && old.remove();
      scn.insertAdjacentHTML('beforeend', detectedHTML(g));
    }
    setTimeout(() => { if (location.hash.startsWith('#/r/escanear')) go(`#/r/puesto/${g.id}`); }, 1100);
  }
  function nativeScanner() {
    const sim = app.querySelector('#sim'), hint = app.querySelector('#hint');
    if (!NATIVE.camera) {
      if (sim) sim.innerHTML = `<div class="center" style="padding:30px;color:var(--text-2)">${icon('camera').replace('<svg', '<svg style="width:42px;height:42px;color:var(--oil)"')}<div style="margin-top:10px;font-size:14px">${NATIVE.simulator ? 'El simulador no tiene cámara' : 'Cámara no disponible'}</div><div class="small" style="color:var(--text-3);margin-top:6px">Usa la simulación de abajo o la captura manual.</div></div>`;
      if (hint) hint.remove();
      return;
    }
    if (sim) sim.innerHTML = `<button id="openCam" class="center" style="padding:30px;color:var(--text-2)">${icon('camera').replace('<svg', '<svg style="width:46px;height:46px;color:var(--oil)"')}<div style="margin-top:10px;font-size:15px;color:var(--text)">Toca para abrir la cámara</div></button>`;
    app.querySelector('#openCam').onclick = () => post({ type: 'scan' });
    post({ type: 'scan' });
  }
  function startCamera() {
    const v = app.querySelector('#vid'), sim = app.querySelector('#sim'), hint = app.querySelector('#hint');
    const noCam = (msg) => { if (sim) sim.innerHTML = `<div class="center" style="padding:30px;color:var(--text-2)">${icon('camera').replace('<svg', '<svg style="width:42px;height:42px;color:var(--oil)"')}<div style="margin-top:10px;font-size:14px">${msg}</div><div class="small" style="color:var(--text-3);margin-top:6px">Usa la simulación de abajo o la captura manual.</div></div>`; if (hint) hint.remove(); };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { noCam('Cámara no disponible en este navegador'); return; }
    let stream = null, raf = 0, alive = true;
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(s => {
      if (!alive) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s; v.srcObject = s; v.play(); if (sim) sim.innerHTML = '';
      const tick = () => {
        if (!alive) return;
        if (v.readyState >= 2) {
          const w = 480, h = Math.round(v.videoHeight / v.videoWidth * w) || 360;
          cv.width = w; cv.height = h; ctx.drawImage(v, 0, 0, w, h);
          const code = window.jsQR && jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (code && code.data) { alive = false; stop(); handleCode(code.data); return; }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => noCam('Permite el acceso a la cámara para escanear'));
    const stop = () => { cancelAnimationFrame(raf); stream && stream.getTracks().forEach(t => t.stop()); };
    cleanup = () => { alive = false; stop(); };
  }

  // P2b · Alta de puesto
  function RAlta(q) {
    const html = `<div class="screen">
      ${top('Alta de puesto', '#/r/escanear')}
      <div class="card oil flex mt16" style="display:flex"><span class="avatar">${icon('qr')}</span><div><b>Puesto nuevo${q.id ? ' · QR ' + esc(q.id) + ' sin registro' : ''}</b><div class="muted small">El ID se asigna en orden en BD_OleoRuta; después imprime su etiqueta QR.</div></div></div>
      <form id="af" novalidate>
        ${formAlta('a')}
        <div id="err"></div>
        <button class="btn mt16" type="submit">${icon('check')}<span>Registrar y asignar QR</span></button>
      </form>
    </div>`;
    setTimeout(() => bindAlta(app, 'a', (g) => { U.toast(`${g.nombre} registrado con ${g.id}`); go(`#/r/puesto/${g.id}`); }));
    return html;
  }

  // P3 · Ficha del puesto
  function RPuesto(id) {
    const g = D.gen(id); if (!g) return notFound('#/r/puestos');
    const rs = D.recsDe(id), n = D.nivelEstimado(g), z = D.zona(g.zona);
    const tot = rs.reduce((s, r) => s + r.litros, 0), pago = rs.reduce((s, r) => s + r.pago, 0);
    const sol = db().solicitudes.find(s => s.idGenerador === id && s.estado === 'ABIERTA');
    return `<div class="screen">
      ${top('Ficha del puesto', '#/r/ruta', `<a class="icon-btn" href="#/r/etiquetas?id=${id}" aria-label="QR">${icon('qr')}</a>`)}
      <div class="flex mt16"><span class="avatar lg">${fmt.iniciales(g.nombre)}</span><div style="min-width:0"><h2 style="margin:0;font-size:22px;letter-spacing:-.01em">${esc(g.nombre)}</h2><div class="muted small">${esc(g.tipo)} · ${esc(g.responsable)}</div><div class="flex mt8"><span class="pill oil">${g.id}</span><span class="pill">${icon('pin')}${g.zona}</span></div></div></div>
      ${sol ? `<div class="card oil small"><b>${icon('bell').replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px;color:var(--oil)"')} Aviso ${fmt.rel(sol.fecha)}</b><div class="muted mt8">“${esc(sol.nota)}” · ≈ ${fmt.L(sol.litrosEstimados)}</div></div>` : ''}
      <div class="card">
        <div class="between"><span class="label">Contenedor · nivel estimado</span><span class="num" style="font-weight:600">${fmt.L(n.litros)} / ${g.contenedor} L</span></div>
        <div class="mt8">${gauge(n.pct)}</div>
        <div class="gauge-legend"><span>Última entrega ${rs[0] ? fmt.fecha(rs[0].fecha) : '—'}</span><span>Próxima ${fmt.fecha(n.proxima)}</span></div>
      </div>
      <div class="grid2">
        <div class="tile"><span class="label">Litros / semana</span><div class="v num">${fmt.n1(g.litrosSemana)}<small>L</small></div></div>
        <div class="tile"><span class="label">Entregas</span><div class="v num">${rs.length}</div><div class="d">${fmt.L(tot)} en total</div></div>
        <div class="tile oil"><span class="label">Pagado</span><div class="v num">${fmt.mxn0(pago)}</div><div class="d">CLABE ${fmt.clabe(g.clabe)}</div></div>
        <div class="tile"><span class="label">Lote ${g.zona}</span><div class="v num">${fmt.pct(z.avance)}</div><div class="d">${fmt.L(z.litrosPendientes)} de ${cfg().umbral_lote} L</div></div>
      </div>
      <div class="section-title"><span class="label">Historial</span><span class="small muted">${rs.length} registros</span></div>
      <div class="rows">${rs.length ? rs.slice(0, 6).map(r => row(`#/r/comprobante/${r.id}`, 'receipt', `${fmt.L(r.litros)} · ${fmt.mxn(r.pago)}`, `${fmt.fh(r.fecha)} · ${r.folio}`, `<span class="pill ${r.estatus === 'LIQUIDADO' ? 'ok' : 'oil'}">${r.estatus === 'LIQUIDADO' ? 'Liquidado' : 'En proceso'}</span>`)).join('') : '<div class="empty">Sin entregas todavía</div>'}</div>
      <div class="rows">
        ${row(`tel:${g.telefono}`, 'phone', fmt.tel(g.telefono), 'Teléfono · WhatsApp')}
        ${row('#/r/zonas', 'pin', esc(g.colonia), `Zona ${g.zona} · alta ${fmt.fechaL(g.fechaAlta + 'T12:00')}`)}
      </div>
      <a class="btn mt24" href="#/r/entrega/${g.id}">${icon('drop')}Registrar entrega</a>
    </div>${tabbarR('ruta')}`;
  }

  // P4 · Registrar entrega
  function REntrega(id, q) {
    const g = D.gen(id); if (!g) return notFound('#/r/escanear');
    const max = g.contenedor;
    let litros = q.l ? Math.max(0, Math.min(max, +q.l)) : 0;
    let foto = q.foto === 'demo' ? 'demo' : null;
    const z = D.zona(g.zona), u = cfg().umbral_lote;
    const html = `<div class="screen">
      ${top('Registrar entrega', `#/r/puesto/${id}`)}
      <div class="flex" style="justify-content:center;margin-top:2px"><span class="pill oil">${g.id}</span><b>${esc(g.nombre)}</b></div>
      <div class="dial" id="dial"><div id="arc"></div><div class="center"><div class="v num" id="lv"></div><div class="u">Litros pesados</div></div></div>
      <div class="stepper"><button id="dec" aria-label="Menos">${icon('minus')}</button><span class="muted small" style="width:90px;text-align:center">± 0.5 L</span><button id="inc" aria-label="Más">${icon('plus')}</button></div>
      <input type="range" class="oil" id="rg" min="0" max="${max}" step="0.5" value="${litros}">
      <div class="gauge-legend"><span>0 L</span><span>Contenedor ${max} L</span></div>
      <label class="photo" id="ph"><span class="ph" id="phi">${icon('camera')}</span><span class="rt"><b id="pht">Foto del contenedor</b><span id="phs">Toca para tomar la foto en la báscula</span></span><input type="file" accept="image/*" capture="environment" id="file" hidden></label>
      <button class="chip mt8" id="demoPh" type="button" style="margin-left:auto;display:block">Usar foto de demostración</button>
      <div class="calc">
        <div><span class="label">Pago al generador</span><div class="v oil num" id="cp"></div><div class="f">litros × $${cfg().precio_litro}</div></div>
        <div><span class="label">Agua protegida</span><div class="v num" id="ca"></div><div class="f">litros × ${fmt.n(cfg().factor_agua)} L</div></div>
        <div class="full"><div class="between"><span class="label">Lote ${g.zona}</span><span class="small num" id="cz"></span></div><div class="mt8" id="cg"></div><div class="gauge-legend"><span id="cl"></span><span>umbral ${u} L</span></div></div>
      </div>
      <div id="err"></div>
      <button class="btn" style="margin-top:12px" id="ok">${icon('check')}<span id="okt">Confirmar entrega</span></button>
      <p class="muted small center mt8">El pago y el comprobante se generan automáticamente al confirmar.</p>
    </div>`;
    setTimeout(() => {
      const $ = (s) => app.querySelector(s);
      const upd = () => {
        $('#arc').innerHTML = U.dialArc(litros / max);
        $('#lv').innerHTML = `${fmt.n1(litros)}<small>L</small>`;
        $('#cp').textContent = fmt.mxn(litros * cfg().precio_litro);
        $('#ca').innerHTML = `${fmt.n(litros * cfg().factor_agua)}<small style="font-size:14px;color:var(--text-2)"> L</small>`;
        const antes = z.avance, despues = Math.min(1, (z.litrosPendientes + litros) / u);
        $('#cz').innerHTML = `${fmt.pct(antes)} → <b style="color:var(--oil)">${fmt.pct(despues)}</b>`;
        $('#cg').innerHTML = gauge(antes, '', despues - antes);
        $('#cl').textContent = (z.litrosPendientes + litros >= u) ? `${fmt.L(z.litrosPendientes + litros)} · quedará LISTO PARA PLANTA` : `${fmt.L(z.litrosPendientes + litros)} acumulados`;
        $('#rg').value = litros;
        $('#okt').textContent = litros > 0 ? `Confirmar · ${fmt.mxn(litros * cfg().precio_litro)}` : 'Confirmar entrega';
        $('#ok').disabled = !(litros > 0 && foto);
        $('#err').innerHTML = litros > 0 ? '' : '<div class="field"><div class="err">Captura los litros: con 0 L la entrega no se guarda.</div></div>';
        if (foto) {
          $('#ph').classList.add('done');
          $('#phi').innerHTML = foto === 'demo' ? U.fotoDemo(litros || 6, 3) : `<img src="${foto}" alt="Foto del contenedor">`;
          $('#pht').textContent = 'Foto capturada'; $('#phs').textContent = 'Toca para repetir la foto';
          $('#demoPh').style.display = 'none';
        }
      };
      const set = (v) => { litros = Math.max(0, Math.min(max, Math.round(v * 2) / 2)); upd(); };
      $('#dec').onclick = () => set(litros - 0.5);
      $('#inc').onclick = () => set(litros + 0.5);
      $('#rg').oninput = (e) => set(+e.target.value);
      $('#demoPh').onclick = () => { foto = 'demo'; upd(); };
      $('#file').onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const img = new Image(); const rd = new FileReader();
        rd.onload = () => { img.onload = () => { const c = document.createElement('canvas'); const s = 360 / Math.max(img.width, img.height); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); foto = c.toDataURL('image/jpeg', .7); upd(); }; img.src = rd.result; };
        rd.readAsDataURL(f);
      };
      $('#ok').onclick = () => {
        if (!(litros > 0)) { U.toast('Con 0 L la entrega no se guarda', 'alert'); return; }
        const r = D.registrarEntrega({ idGenerador: id, litros, foto: foto === 'demo' ? null : foto });
        go(`#/r/confirmacion/${r.id}`);
      };
      upd();
    });
    return html;
  }

  // P5 · Confirmación (pipeline automático) — dura < 10 s
  const PASOS = [
    ['sheet', 'Fila guardada en BD_OleoRuta', 'Recolecciones · App Formulas: pago y agua'],
    ['bolt', 'Bot «Nueva recolección»', 'Evento Adds only detectado'],
    ['webhook', 'Webhook → Escenario A', 'POST JSON con la entrega · token validado'],
    ['bank', 'API SPEI simulada · Escenario B', 'POST /spei/transferencias'],
    ['shield', 'HTTP 200 · LIQUIDADO', 'Clave de rastreo y folio emitidos'],
    ['layers', 'Fila LIQUIDADA · lote recalculado', 'Escenario A → BD_OleoRuta'],
  ];
  const PASOS_NUBE = [
    ['sheet', 'Entrega registrada en la app', 'Motor de reglas: pago y agua protegida'],
    ['bolt', 'Bot «Nueva recolección»', 'Evento Adds only detectado'],
    ['webhook', 'Webhook → Escenario A (Apps Script)', 'POST a script.google.com · token validado'],
    ['bank', 'API SPEI simulada · Escenario B', 'Llamada HTTP desde el orquestador'],
    ['shield', 'HTTP 200 · LIQUIDADO', 'Clave de rastreo emitida por la API'],
    ['layers', 'Fila nueva en Google Sheets', 'BD_OleoRuta · Recolecciones (en la nube)'],
  ];
  function RConfirmacion(id) {
    const r = D.rec(id); if (!r) return notFound('#/r/inicio');
    const g = D.gen(r.idGenerador);
    const done = r.estatus === 'LIQUIDADO';
    const payload = { id_recoleccion: r.id, id_generador: g.id, negocio: g.nombre, clabe: g.clabe, litros: r.litros, monto: r.pago, agua_protegida_l: r.agua, zona: g.zona };
    const html = `<div class="screen no-nav">
      ${top(done ? 'Pago liquidado' : 'Pago en proceso', '#/r/inicio')}
      <div class="ring" id="ring">${U.ring(done ? 1 : 0.02)}<div class="rc"><div class="v num">${fmt.mxn(r.pago)}</div><div class="s" id="rs">${done ? 'LIQUIDADO' : 'Procesando…'}</div></div></div>
      <p class="center muted small" style="margin:0">${esc(g.nombre)} · ${fmt.L(r.litros)} · CLABE ${fmt.clabe(g.clabe)}</p>
      <div class="card oil flex" style="display:flex"><span class="ri" style="width:44px;height:44px;border-radius:14px;background:var(--oil);color:#111;display:grid;place-items:center;flex:none">${icon('water')}</span><div><b style="display:block;font-size:18px" class="num">${fmt.n(r.agua)} L de agua protegidos</b><span class="muted small">Impacto ambiental de esta entrega</span></div></div>
      <div class="card steps" id="steps">${(window.OleoCloud && OleoCloud.enabled() && !done ? PASOS_NUBE : PASOS).map((p, i) => `<div class="step ${done ? 'done' : 'wait'}" data-i="${i}"><span class="si">${icon(done ? 'check' : p[0])}</span><span class="st"><b>${p[1]}</b><span>${p[2]}</span></span><span class="ms" data-ms></span></div>`).join('')}</div>
      <details class="card"><summary class="label" style="cursor:pointer">Contrato de integración (JSON)</summary><pre class="json">POST /webhook/escenario-A  <span class="h">(simulado)</span>\n${U.json(payload)}</pre><pre class="json" id="resp">${done ? respuesta(r) : '<span class="h">Esperando respuesta de la API…</span>'}</pre></details>
      <a class="btn mt16" id="ver" href="#/r/comprobante/${r.id}" ${done ? '' : 'style="opacity:.35;pointer-events:none"'}>${icon('receipt')}Ver comprobante</a>
    </div>`;
    if (!done) setTimeout(() => runPipeline(r, g), 50);
    return html;
  }
  function respuesta(r) {
    const nube = r.pipeline && r.pipeline.modo === 'nube';
    return `HTTP 200  ← API SPEI simulada (${nube ? 'Escenario B en Apps Script, vía Escenario A' : 'Escenario B, simulación local'})\n` + U.json({ estatus: r.estatus, clave_rastreo: r.claveRastreo, monto: r.pago, concepto: `Pago aceite usado ${r.id}`, fecha_liquidacion: r.fechaLiquidacion, emisor: cfg().emisor });
  }
  function runPipeline(r, g) {
    if (window.OleoCloud && OleoCloud.enabled()) return runPipelineNube(r, g);
    runPipelineLocal(r, g);
  }
  async function runPipelineNube(r, g) {
    let alive = true; const timers = [];
    cleanup = () => { alive = false; timers.forEach(clearTimeout); };
    const zAntes = D.zona(g.zona);
    const steps = () => app.querySelectorAll('#steps .step');
    const setRing = (p) => { const c = app.querySelector('#ring .ring-fg'); if (c) c.style.strokeDashoffset = c.getAttribute('stroke-dasharray') * (1 - p); };
    const run = (i) => { const s = steps()[i]; if (!s) return; s.classList.remove('wait'); s.classList.add('run'); s.querySelector('.si').innerHTML = icon('spinner'); };
    const ok = (i, ms) => { const s = steps()[i]; if (!s) return; s.classList.remove('run', 'wait'); s.classList.add('done'); s.querySelector('.si').innerHTML = icon('check'); if (ms != null) s.querySelector('[data-ms]').textContent = ms + ' ms'; setRing((i + 1) / 6); };
    const sleep = (ms) => new Promise(res => timers.push(setTimeout(res, ms)));
    run(0); await sleep(150); if (!alive) return; ok(0, 150);
    run(1); await sleep(120); if (!alive) return; ok(1, 120);
    run(2); run(3);
    let resp = null;
    try {
      resp = await OleoCloud.enviar({
        id_recoleccion: r.id, fecha: r.fecha.replace('T', ' '), id_generador: g.id, negocio: g.nombre, clabe: g.clabe,
        recolector: r.recolector, litros: r.litros, precio_litro: r.precio, monto: r.pago, agua_protegida_l: r.agua,
        zona: g.zona, folio: r.folio, foto: r.foto ? 'capturada en la app' : 'demo',
      });
    } catch (e) { resp = { ok: false, error: e.name === 'AbortError' ? 'tiempo agotado' : e.message }; }
    if (!alive) return;
    if (!resp.ok) {
      U.toast('Sin respuesta del backend · se usó la simulación de respaldo', 'alert');
      app.querySelector('#steps').innerHTML = PASOS.map((p, i) => `<div class="step wait" data-i="${i}"><span class="si">${icon(p[0])}</span><span class="st"><b>${p[1]}</b><span>${p[2]}</span></span><span class="ms" data-ms></span></div>`).join('');
      return runPipelineLocal(r, g);
    }
    const t = resp.ms;
    ok(2, Math.round(t * 0.35)); ok(3, Math.round(t * 0.45));
    run(4); await sleep(120); if (!alive) return;
    const rr = D.liquidar(r.id, { bot: 120, makeA: Math.round(t * 0.35), makeB: Math.round(t * 0.45), total: 270 + t + 240, modo: 'nube', http: resp.status }, resp.data);
    ok(4, 120);
    app.querySelector('#resp').innerHTML = respuesta(rr);
    app.querySelector('#rs').textContent = 'LIQUIDADO';
    haptic('success');
    run(5); await sleep(120); if (!alive) return; ok(5, Math.round(t * 0.2));
    const v = app.querySelector('#ver'); v.removeAttribute('style');
    const tt = app.querySelector('.topbar .title'); if (tt) tt.textContent = 'Pago liquidado';
    const zDesp = D.zona(g.zona);
    if (zAntes.estatus !== 'LISTO PARA PLANTA' && zDesp.estatus === 'LISTO PARA PLANTA') U.toast(`Lote ${g.zona} listo para planta · aviso enviado a ${cfg().recicladora}`, 'factory');
    else U.toast('Pago liquidado y guardado en Google Sheets', 'check');
    timers.push(setTimeout(() => { if (alive) go(`#/r/comprobante/${r.id}`); }, 1800));
  }
  function runPipelineLocal(r, g) {
    const ms = [180, 300 + Math.random() * 300 | 0, 600 + Math.random() * 400 | 0, 900 + Math.random() * 700 | 0, 260, 380];
    const timers = []; let t = 0, alive = true;
    const zAntes = D.zona(g.zona);
    cleanup = () => { alive = false; timers.forEach(clearTimeout); };
    const steps = () => app.querySelectorAll('#steps .step');
    const setRing = (p) => { const c = app.querySelector('#ring .ring-fg'); if (c) c.style.strokeDashoffset = c.getAttribute('stroke-dasharray') * (1 - p); };
    ms.forEach((d, i) => {
      timers.push(setTimeout(() => { if (!alive) return; const s = steps()[i]; s.classList.remove('wait'); s.classList.add('run'); s.querySelector('.si').innerHTML = icon('spinner'); }, t));
      t += d;
      timers.push(setTimeout(() => {
        if (!alive) return; const s = steps()[i];
        s.classList.remove('run'); s.classList.add('done'); s.querySelector('.si').innerHTML = icon('check'); s.querySelector('[data-ms]').textContent = d + ' ms';
        setRing((i + 1) / ms.length);
        if (i === 4) {
          const total = ms.reduce((a, b) => a + b, 0);
          const rr = D.liquidar(r.id, { bot: ms[1], makeA: ms[2], makeB: ms[3], total, modo: 'simulado' });
          app.querySelector('#resp').innerHTML = respuesta(rr);
          app.querySelector('#rs').textContent = 'LIQUIDADO';
          haptic('success');
        }
        if (i === ms.length - 1) {
          const v = app.querySelector('#ver'); v.removeAttribute('style');
          const tt = app.querySelector('.topbar .title'); if (tt) tt.textContent = 'Pago liquidado';
          const zDesp = D.zona(g.zona);
          if (zAntes.estatus !== 'LISTO PARA PLANTA' && zDesp.estatus === 'LISTO PARA PLANTA') U.toast(`Lote ${g.zona} listo para planta · aviso enviado a ${cfg().recicladora}`, 'factory');
          timers.push(setTimeout(() => { if (alive) go(`#/r/comprobante/${r.id}`); }, 1600));
        }
      }, t));
    });
  }

  // P6 · Comprobante (recolector y generador)
  function Comprobante(id, back, next = true) {
    const r = D.rec(id); if (!r) return notFound(back);
    const g = D.gen(r.idGenerador);
    const z = D.zona(g.zona);
    const lote = r.idLote ? db().lotes.find(l => l.id === r.idLote) : null;
    const liq = r.estatus === 'LIQUIDADO';
    const html = `<div class="receipt">
        <div class="rh">
          <div class="check">${icon(liq ? 'check' : 'clock')}</div>
          <span class="pill ${liq ? 'solid' : 'oil'}">${liq ? 'Liquidado' : 'En proceso'}</span>
          <div class="amt num">${fmt.mxn(r.pago)}<small> MXN</small></div>
          <div class="muted small mt8">${esc(g.nombre)} · ${g.id}</div>
        </div>
        <div class="cut"></div>
        <div class="rf">
          <div class="kv"><span>Clave de rastreo</span><b class="mono">${r.claveRastreo || '—'}</b></div>
          <div class="kv"><span>Folio</span><b class="mono">${r.folio}</b></div>
          <div class="kv"><span>Fecha de liquidación</span><b>${r.fechaLiquidacion ? fmt.fh(r.fechaLiquidacion) + ':' + r.fechaLiquidacion.slice(17, 19) : '—'}</b></div>
          <div class="kv"><span>Litros entregados</span><b>${fmt.L(r.litros)}</b></div>
          <div class="kv"><span>Precio por litro</span><b>${fmt.mxn(r.precio)}</b></div>
          <div class="kv"><span>Agua protegida</span><b style="color:var(--oil)">${fmt.n(r.agua)} L</b></div>
          <div class="kv"><span>Cuenta destino</span><b class="mono">CLABE ${fmt.clabe(g.clabe)}</b></div>
          <div class="kv"><span>Emisor</span><b>${esc(cfg().emisor)} · SPEI simulado</b></div>
          <div class="kv"><span>Concepto</span><b>Pago aceite usado ${r.id}</b></div>
          <div class="kv"><span>Lote</span><b>${lote ? `${lote.id} · ${esc(lote.destino)}` : `${g.zona} · ${fmt.pct(z.avance)} ${z.estatus === 'LISTO PARA PLANTA' ? '· listo para planta' : 'acumulado'}`}</b></div>
          <div class="kv"><span>Recolector</span><b>${esc(r.recolector)}</b></div>
          ${r.pipeline ? `<div class="kv"><span>Tiempo de liquidación</span><b>${fmt.n1(r.pipeline.total / 1000)} s · automático</b></div>` : ''}
          ${r.pipeline && r.pipeline.modo === 'nube' ? `<div class="kv"><span>Registro en la nube</span><b>Apps Script + Google Sheets ✓</b></div>` : ''}
        </div>
      </div>
      <div class="photo done" style="border-style:solid"><span class="ph">${r.foto ? `<img src="${r.foto}" alt="Foto del contenedor">` : U.fotoDemo(r.litros, r.id.charCodeAt(0))}</span><span class="rt"><b>Evidencia de pesaje</b><span>${fmt.fh(r.fecha)} · ${esc(g.colonia)}</span></span></div>`;
    return { html, next, r, g };
  }
  function RComprobante(id) {
    const c = Comprobante(id, '#/r/inicio');
    if (typeof c === 'string') return c;
    const out = `<div class="screen">${top('Comprobante', '#/r/inicio', shareBtn())}${c.html}
      <a class="btn mt16" href="#/r/escanear">${icon('scan')}Siguiente puesto</a>
      <div class="btn-row"><a class="btn ghost small" href="#/r/tablero">${icon('chart')}Tablero</a><a class="btn ghost small" href="#/r/puesto/${c.g.id}">${icon('store')}Ficha</a></div>
    </div>${tabbarR('')}`;
    setTimeout(() => bindShare(c.r, c.g));
    return out;
  }
  const shareBtn = () => `<button class="icon-btn" id="share" aria-label="Compartir">${icon('share')}</button>`;
  function bindShare(r, g) {
    const b = app.querySelector('#share'); if (!b) return;
    b.onclick = async () => {
      const txt = `OleoRuta · Comprobante ${r.folio}\n${g.nombre} (${g.id})\n${fmt.L(r.litros)} → ${fmt.mxn(r.pago)} MXN\nClave de rastreo: ${r.claveRastreo}\nAgua protegida: ${fmt.n(r.agua)} L`;
      if (NATIVE) { post({ type: 'shareText', text: txt }); return; }
      try { if (navigator.share) await navigator.share({ title: 'Comprobante OleoRuta', text: txt }); else { await navigator.clipboard.writeText(txt); U.toast('Comprobante copiado'); } } catch (e) { }
    };
  }

  // P7 · Tablero de impacto
  function semanas(n, filtro = () => true) {
    const out = []; const lunes = hoy0(); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    for (let i = n - 1; i >= 0; i--) {
      const a = new Date(lunes.getTime() - i * 7 * 86400000), b = new Date(a.getTime() + 7 * 86400000);
      const v = db().recolecciones.filter(r => filtro(r) && new Date(r.fecha) >= a && new Date(r.fecha) < b).reduce((s, r) => s + r.litros, 0);
      out.push({ l: a.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''), v, tip: `Semana del ${a.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}` });
    }
    return out;
  }
  function RTablero(q) {
    setTimeout(() => { cargarNube(); const b = app.querySelector('#nubeR'); if (b) b.onclick = cargarNube; });
    const per = q.p || 'todo';
    const desde = per === '7' ? new Date(Date.now() - 7 * 86400000) : per === '30' ? new Date(Date.now() - 30 * 86400000) : null;
    const R = D.resumen(desde);
    const dias = desde ? (Date.now() - desde) / 86400000 : Math.max(7, (Date.now() - new Date(db().recolecciones.reduce((m, r) => r.fecha < m ? r.fecha : m, '9999'))) / 86400000);
    const ingresoMes = R.activos ? R.pago / R.activos / dias * 30 : 0;
    const zs = D.zonas();
    const rank = db().generadores.map(g => ({ g, l: db().recolecciones.filter(r => r.idGenerador === g.id && (!desde || new Date(r.fecha) >= desde)).reduce((s, r) => s + r.litros, 0) })).sort((a, b) => b.l - a.l);
    const maxL = Math.max(1, ...rank.map(x => x.l));
    return `<div class="screen">
      ${top('Tablero de impacto', '#/r/inicio')}
      <div class="seg">${[['7', '7 días'], ['30', '30 días'], ['todo', 'Todo']].map(([k, l]) => `<a class="${per === k ? 'on' : ''}" href="#/r/tablero?p=${k}">${l}</a>`).join('')}</div>
      <div class="hero" style="margin-top:14px"><div class="label">Litros recolectados</div><div class="big num" style="margin-top:8px">${fmt.n1(R.litros)}<small>L</small></div><div class="cap">${R.entregas} entregas · ${R.activos} generadores activos</div></div>
      <div class="grid2">
        <div class="tile oil">${icon('water', 'ti')}<div class="v num">${fmt.agua(R.agua)}</div><div class="d">agua protegida</div></div>
        <div class="tile">${icon('peso', 'ti')}<div class="v num">${fmt.mxn0(R.pago)}</div><div class="d">pagado a generadores</div></div>
        <div class="tile">${icon('factory', 'ti')}<div class="v num">${R.lotes}</div><div class="d">lotes ≥ ${cfg().umbral_lote} L a planta</div></div>
        <div class="tile">${icon('zap', 'ti')}<div class="v num">${fmt.n1(R.liquidacionSeg)}<small>s</small></div><div class="d">liquidación promedio</div></div>
      </div>
      <div class="card"><div class="between"><span class="label">Litros por semana</span><span class="small muted">últimas 8 semanas</span></div>${U.bars(semanas(8))}</div>
      <div class="section-title"><span class="label">Negocio</span></div>
      <div class="rows">
        ${kvRow('Ticket promedio por entrega', fmt.mxn(R.ticket))}
        ${kvRow('Precio vigente (Config)', fmt.mxn(cfg().precio_litro) + ' / L')}
        ${kvRow('Pagos digitales trazables', '100 %')}
        ${kvRow('Entregas con comprobante', `${R.entregas} de ${R.entregas}`)}
      </div>
      <div class="section-title"><span class="label">Ambiental</span></div>
      <div class="rows">
        ${kvRow('Aceite desviado del drenaje', fmt.L(R.litros))}
        ${kvRow('Agua protegida (× ' + fmt.n(cfg().factor_agua) + ')', fmt.n(R.agua) + ' L')}
        ${kvRow('Enviado a biodiésel (' + esc(cfg().recicladora) + ')', fmt.L(db().lotes.filter(l => !desde || new Date(l.fechaEnvio) >= desde).reduce((s, l) => s + l.litros, 0)))}
      </div>
      <div class="section-title"><span class="label">Social</span></div>
      <div class="rows">
        ${kvRow('Generadores con ingreso extra', `${R.activos}`)}
        ${kvRow('Ingreso promedio por generador', fmt.mxn0(ingresoMes) + ' / mes')}
        ${kvRow('Pasos para el generador', '0 · no instala nada')}
      </div>
      <div class="section-title"><span class="label">Lotes por zona</span></div>
      <div class="rows">${zs.map(z => zonaRow(z)).join('')}</div>
      <div class="section-title"><span class="label">En la nube · Google Sheets</span><button id="nubeR">Actualizar</button></div>
      <div class="card" id="nube"><div class="muted small">Leyendo BD_OleoRuta…</div></div>
      <div class="section-title"><span class="label">Generadores por litros</span></div>
      <div class="rows">${rank.map(x => `<a class="row" href="#/r/puesto/${x.g.id}" style="display:block"><div class="between"><span class="small" style="font-weight:500">${esc(x.g.nombre)}</span><span class="small num">${fmt.L(x.l)}</span></div><div class="mt8">${gauge(x.l / maxL, 'thin')}</div></a>`).join('')}</div>
    </div>${tabbarR('tablero')}`;
  }
  async function cargarNube() {
    const box = app.querySelector('#nube'); if (!box || !window.OleoCloud) return;
    box.innerHTML = '<div class="muted small">Leyendo BD_OleoRuta…</div>';
    try {
      const [res, recs] = await Promise.all([OleoCloud.hoja('Resumen'), OleoCloud.hoja('Recolecciones')]);
      if (!app.contains(box)) return;
      const ult = recs.slice(-4).reverse();
      box.innerHTML = `<div class="between"><span class="pill ok">${icon('check')}En vivo</span><a class="small" style="color:var(--oil)" href="${OleoCloud.sheetUrl()}" target="_blank" rel="noopener noreferrer">Abrir hoja</a></div>
        <div class="rows" style="margin-top:12px">${res.map(x => kvRow(esc(x.Indicador), esc(x.Valor))).join('')}</div>
        <div class="label mt16">Últimas recolecciones en la nube</div>
        ${ult.length ? `<div class="rows" style="margin-top:8px">${ult.map(x => `<div class="row"><span class="ri">${icon('receipt')}</span><span class="rt"><b>${esc(x.ID_Generador)} · ${esc(x.Litros)} L · $${esc(x.Monto_Pago)}</b><span>${esc(x.Fecha)} · ${esc(x.Clave_Rastreo)}</span></span><span class="pill ok">${esc(x.Estatus_Pago || '—')}</span></div>`).join('')}</div>` : '<div class="muted small mt8">Todavía no hay recolecciones registradas en la hoja.</div>'}`;
    } catch (e) {
      box.innerHTML = `<div class="muted small">No se pudo leer la hoja (${esc(e.message)}). Revisa la conexión.</div>`;
    }
  }
  const kvRow = (k, v) => `<div class="row"><span class="rt"><b style="font-weight:400;color:var(--text-2)">${k}</b></span><span class="rv num">${v}</span></div>`;

  // Zonas y lotes
  function RZonas() {
    const zs = D.zonas();
    const html = `<div class="screen">
      ${top('Zonas y lotes', '#/r/inicio')}
      <p class="muted small">Cada zona acumula litros hasta formar un lote de ${cfg().umbral_lote} L, el mínimo que exige la recicladora. Al llegar al umbral, el sistema avisa a ${esc(cfg().recicladora)} sin que nadie llame.</p>
      ${zs.map(z => `<div class="card ${z.estatus === 'LISTO PARA PLANTA' ? 'oil' : ''}">
        <div class="between"><div><h3>${z.zona}</h3><span class="muted small">${z.alcaldia} · ${z.generadores.length} puestos</span></div>${estatusPill(z)}</div>
        <div class="flex mt16" style="align-items:flex-end"><div class="num" style="font-size:44px;font-weight:200;letter-spacing:-.03em;line-height:1">${fmt.n1(z.litrosPendientes)}<small style="font-size:16px;color:var(--text-2)"> / ${cfg().umbral_lote} L</small></div><div style="margin-left:auto" class="num">${fmt.pct(z.avance)}</div></div>
        <div class="mt8">${gauge(z.avance)}</div>
        <div class="gauge-legend"><span>${z.pendientes.length} entregas pendientes</span><span>${z.lotesEnviados} lotes · ${fmt.L(z.litrosEnviados)} enviados</span></div>
        ${z.litrosPendientes > 0 ? `<button class="btn small ${z.estatus === 'LISTO PARA PLANTA' ? '' : 'ghost'} mt16" data-lote="${z.zona}" ${z.estatus === 'LISTO PARA PLANTA' ? '' : 'disabled'}>${icon('factory')}${z.estatus === 'LISTO PARA PLANTA' ? 'Entregar lote a planta' : `Faltan ${fmt.L(cfg().umbral_lote - z.litrosPendientes)}`}</button>` : ''}
      </div>`).join('')}
      <div class="section-title"><span class="label">Lotes enviados a planta</span></div>
      <div class="rows">${db().lotes.slice().reverse().slice(0, 10).map(l => `<div class="row"><span class="ri">${icon('factory')}</span><span class="rt"><b>${l.id} · ${fmt.L(l.litros)}</b><span>${fmt.fecha(l.fechaEnvio)} · ${l.manifiesto} · ${l.recolecciones} entregas</span></span><span class="pill ok">Entregado</span></div>`).join('')}</div>
    </div>${tabbarR('')}`;
    setTimeout(() => app.querySelectorAll('[data-lote]').forEach(b => b.onclick = () => { const l = D.enviarLote(b.dataset.lote); if (l) { U.toast(`${l.id} · ${fmt.L(l.litros)} entregado a ${l.destino} · ${l.manifiesto}`, 'factory'); render(); } }));
    return html;
  }

  // Puestos
  function RPuestos() {
    return `<div class="screen">
      ${top('Puestos', '#/r/mas', `<a class="icon-btn" href="#/r/alta" aria-label="Alta">${icon('plus')}</a>`)}
      <div class="rows">${db().generadores.map(g => { const n = D.nivelEstimado(g); return `<a class="row" href="#/r/puesto/${g.id}"><span class="avatar">${fmt.iniciales(g.nombre)}</span><span class="rt"><b>${esc(g.nombre)}</b><span>${g.id} · ${g.zona} · ${fmt.n1(g.litrosSemana)} L/sem</span><div class="mt8" style="max-width:180px">${gauge(n.pct, 'thin')}</div></span><span class="rv num">${fmt.L(n.litros)}<span>estimado</span></span>${icon('chev', 'chev')}</a>`; }).join('')}</div>
      <a class="btn ghost mt16" href="#/r/alta">${icon('plus')}Alta de puesto nuevo</a>
    </div>${tabbarR('mas')}`;
  }

  // Monitor de automatización (evidencia del pipeline)
  function RMonitor(q) {
    const wide = q.wide === '1';
    if (wide) document.body.classList.add('wide');
    const rs = db().recolecciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ok = rs.filter(r => r.estatus === 'LIQUIDADO');
    const avg = ok.reduce((s, r) => s + (r.pipeline ? r.pipeline.total : 0), 0) / Math.max(1, ok.length) / 1000;
    const last = rs[0], lg = last && D.gen(last.idGenerador);
    const runs = rs.slice(0, wide ? 9 : 20).map(r => {
      const g = D.gen(r.idGenerador), p = r.pipeline || {};
      const liq = r.estatus === 'LIQUIDADO';
      return `<details class="exec"><summary style="list-style:none;cursor:pointer"><div class="rh"><span class="pill ${liq ? 'ok' : 'oil'}">${liq ? 'Éxito' : 'En curso'}</span><b>${esc(g.nombre)} · ${fmt.L(r.litros)}</b><time>${fmt.fecha(r.fecha)} ${fmt.hora(r.fecha)}</time></div>
        <div class="mods"><span class="mod ${p.modo === 'nube' ? '' : 'pend'}"><i></i>${p.modo === 'nube' ? 'Apps Script + Google Sheets' : 'Simulación local'}</span><span class="mod ${p.bot ? '' : 'pend'}"><i></i>Bot ${p.bot ? p.bot + ' ms' : '…'}</span><span class="mod ${p.makeA ? '' : 'pend'}"><i></i>Escenario A ${p.makeA ? p.makeA + ' ms' : '…'}</span><span class="mod ${p.makeB ? '' : 'pend'}"><i></i>B · SPEI ${p.makeB ? p.makeB + ' ms' : '…'}</span><span class="mod ${liq ? '' : 'pend'}"><i></i>${liq ? '200 LIQUIDADO' : 'pendiente'}</span></div></summary>
        <pre class="json">${U.json({ id_recoleccion: r.id, id_generador: g.id, monto: r.pago, litros: r.litros, zona: g.zona })}\n<span class="h">→</span> ${U.json({ estatus: r.estatus, clave_rastreo: r.claveRastreo, folio: r.folio })}</pre></details>`;
    }).join('');
    const nube = !!(window.OleoCloud && OleoCloud.enabled());
    const svc = (ic, t, s) => `<div class="row"><span class="ri">${icon(ic)}</span><span class="rt"><b>${t}</b><span>${s}</span></span><span class="pill ${nube ? 'ok' : ''}">${nube ? icon('check') + 'En línea' : 'Respaldo local'}</span></div>`;
    return `<div class="screen">
      ${top('Monitor de automatización', '#/r/mas', `<a class="icon-btn" href="#/r/monitor${wide ? '' : '?wide=1'}" aria-label="Vista consola">${icon('layers')}</a>`)}
      <p class="muted small mt8" style="margin-bottom:0">${nube ? 'Pipeline en la nube (Google Workspace): la app envía el webhook al Escenario A en Apps Script, que llama por HTTP a la API SPEI simulada (Escenario B) y registra la fila en Google Sheets.' : 'Sin conexión al backend: el pipeline se simula en el dispositivo con el mismo contrato de integración.'}</p>
      <div class="console-grid">
      <div>
        <div class="grid3">
          <div class="tile"><span class="label">Ejecuciones</span><div class="v num">${rs.length}</div></div>
          <div class="tile"><span class="label">Éxito</span><div class="v num" style="color:var(--ok)">${fmt.pct(ok.length / Math.max(1, rs.length))}</div></div>
          <div class="tile oil"><span class="label">Promedio</span><div class="v num">${fmt.n1(avg)}<small>s</small></div></div>
        </div>
        <div class="rows">
          ${svc('bolt', 'Bot «Nueva recolección»', 'Evento: Adds only · dispara el webhook')}
          ${svc('webhook', 'Apps Script · Escenario A (orquestador)', 'Webhook → API SPEI → Google Sheets → respuesta')}
          ${svc('bank', 'Apps Script · Escenario B (API SPEI simulada)', 'Responde estatus y clave de rastreo · emisor ' + esc(cfg().emisor))}
          ${svc('sheet', 'Google Sheets · BD_OleoRuta', 'Generadores · Recolecciones · Zonas · Config · Resumen')}
          ${svc('bell', 'Aviso de lote ≥ ' + cfg().umbral_lote + ' L', 'Notificación a ' + esc(cfg().recicladora))}
        </div>
        ${wide && last ? `<div class="card"><span class="label">Última ejecución · contrato de integración</span><pre class="json">POST /webhook/escenario-A   <span class="h">Content-Type: application/json · X-OleoRuta-Token: •••••• · simulado</span>\n${U.json({ id_recoleccion: last.id, id_generador: lg.id, negocio: lg.nombre, clabe: lg.clabe, litros: last.litros, monto: last.pago, agua_protegida_l: last.agua, zona: lg.zona })}</pre><pre class="json">${last.estatus === 'LIQUIDADO' ? respuesta(last) : 'Esperando…'}</pre></div>` : ''}
      </div>
      <div>
        <div class="section-title ${wide ? 'mt0' : ''}" style="${wide ? 'margin-top:14px' : ''}"><span class="label">Historial de ejecuciones</span><span class="small muted">toca para ver el JSON</span></div>
        <div class="card flush">${runs}</div>
        <a class="btn ghost small mt16" href="${window.OleoCloud ? OleoCloud.sheetUrl() : '#'}" target="_blank" rel="noopener noreferrer">${icon('sheet')}Abrir BD_OleoRuta en Google Sheets</a>
      </div>
      </div>
    </div>${tabbarR('mas')}`;
  }

  // Base de datos (vista de las hojas)
  function RBD(q) {
    const tab = q.t || 'Generadores';
    const tabs = ['Generadores', 'Recolecciones', 'Zonas', 'Lotes', 'Config', 'Resumen'];
    const T = tablas()[tab];
    const html = `<div class="screen">
      ${top('BD_OleoRuta', '#/r/mas', `<button class="icon-btn" id="csv" aria-label="Exportar CSV">${icon('download')}</button>`)}
      <div class="chips mt16">${tabs.map(t => `<a class="chip ${t === tab ? 'on' : ''}" href="#/r/bd?t=${t}">${t}</a>`).join('')}</div>
      <div class="table-wrap"><table class="t"><thead><tr>${T.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${T.rows.map(r => `<tr>${r.map(v => `<td class="${typeof v === 'number' ? 'r num' : ''}">${esc(typeof v === 'number' ? fmt.n1(v) : v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="muted small mt8">${T.rows.length} filas · los cálculos se ejecutan como App Formulas al guardar.</p>
    </div>${tabbarR('mas')}`;
    setTimeout(() => { app.querySelector('#csv').onclick = () => { const csv = [T.cols, ...T.rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'); if (NATIVE) { post({ type: 'shareFile', name: `BD_OleoRuta_${tab}.csv`, text: csv }); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `BD_OleoRuta_${tab}.csv`; a.click(); }; });
    return html;
  }
  function tablas() {
    const R = D.resumen();
    return {
      Generadores: { cols: ['ID_Generador', 'Nombre_Negocio', 'Tipo', 'Responsable', 'Telefono', 'Colonia', 'Zona', 'Litros_Semana', 'CLABE_Simulada', 'Fecha_Alta'], rows: db().generadores.map(g => [g.id, g.nombre, g.tipo, g.responsable, g.telefono, g.colonia, g.zona, g.litrosSemana, g.clabe, g.fechaAlta]) },
      Recolecciones: { cols: ['ID_Recoleccion', 'Fecha', 'ID_Generador', 'Litros', 'Pago_MXN', 'Agua_Protegida_L', 'Estatus', 'Clave_Rastreo', 'Folio', 'Estado_Lote', 'ID_Lote'], rows: db().recolecciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => [r.id, r.fecha.replace('T', ' ').slice(0, 16), r.idGenerador, r.litros, r.pago, r.agua, r.estatus, r.claveRastreo || '', r.folio, r.estadoLote, r.idLote || '']) },
      Zonas: { cols: ['Zona', 'Litros_Pendientes', 'Avance_Lote', 'Estatus_Lote', 'Lotes_Enviados'], rows: D.zonas().map(z => [z.zona, z.litrosPendientes, fmt.pct(z.avance), z.estatus, z.lotesEnviados]) },
      Lotes: { cols: ['ID_Lote', 'Zona', 'Litros', 'Entregas', 'Fecha_Envio', 'Destino', 'Manifiesto'], rows: db().lotes.slice().reverse().map(l => [l.id, l.zona, l.litros, l.recolecciones, l.fechaEnvio.slice(0, 10), l.destino, l.manifiesto]) },
      Config: { cols: ['Parametro', 'Valor'], rows: [['precio_litro', cfg().precio_litro], ['factor_agua', cfg().factor_agua], ['umbral_lote', cfg().umbral_lote], ['recicladora', cfg().recicladora], ['emisor_spei', cfg().emisor]] },
      Resumen: { cols: ['KPI', 'Valor'], rows: [['Entregas', R.entregas], ['Litros recolectados', R.litros], ['Pagado (MXN)', R.pago], ['Agua protegida (L)', R.agua], ['Generadores activos', R.activos], ['Lotes a planta', R.lotes], ['Liquidación promedio (s)', +R.liquidacionSeg.toFixed(1)]] },
    };
  }

  // Configuración
  function RConfig() {
    const c = cfg();
    const html = `<div class="screen">
      ${top('Configuración', '#/r/mas')}
      <p class="muted small">Los parámetros viven en la tabla Config: el precio o el factor ambiental se actualizan sin modificar la aplicación.</p>
      <form id="f">
        <div class="field"><label>Precio por litro (MXN) · rango Kolibrie $7–$11</label><input name="precio_litro" type="number" step="0.5" min="1" value="${c.precio_litro}"></div>
        <div class="field"><label>Factor de agua (L protegidos por litro)</label><input name="factor_agua" type="number" step="50" min="1" value="${c.factor_agua}"></div>
        <div class="field"><label>Umbral de lote (L)</label><input name="umbral_lote" type="number" step="1" min="1" value="${c.umbral_lote}"></div>
        <div class="field"><label>Recicladora destino</label><input name="recicladora" value="${esc(c.recicladora)}"></div>
        <div class="field"><label>Nombre de la unidad</label><input name="recolector" value="${esc(c.recolector)}"></div>
        <button class="btn mt16" type="submit">${icon('check')}Guardar parámetros</button>
      </form>
      <button class="btn ghost mt16" id="reset">${icon('sync')}Restablecer datos de demostración</button>
      <p class="muted small center mt16">Prototipo sin servidor: la información se guarda en este dispositivo (localStorage).</p>
    </div>${tabbarR('mas')}`;
    setTimeout(() => {
      app.querySelector('#f').onsubmit = (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); D.setConfig({ precio_litro: +d.precio_litro || 9, factor_agua: +d.factor_agua || 1000, umbral_lote: +d.umbral_lote || 20, recicladora: d.recicladora || 'Kolibrie Energy', recolector: d.recolector || 'Unidad OR-01' }); U.toast('Parámetros actualizados'); };
      app.querySelector('#reset').onclick = () => { if (confirm('¿Restablecer todos los datos simulados?')) { D.reset(); U.toast('Datos de demostración restablecidos'); render(); } };
    });
    return html;
  }

  // Etiquetas QR
  function REtiquetas(q) {
    const list = q.id ? [D.gen(q.id)].filter(Boolean) : db().generadores;
    const html = `<div class="screen">
      ${top('Etiquetas QR', q.id ? `#/r/puesto/${q.id}` : '#/r/mas', `<button class="icon-btn" data-act="print" aria-label="Imprimir">${icon('print')}</button>`)}
      <p class="muted small no-print">Imprime y pega la etiqueta en el puesto. El recolector la escanea para abrir su ficha.</p>
      <div class="${list.length > 1 ? 'labels' : ''} mt16">${list.map(qrLabel).join('')}</div>
    </div>${tabbarR('mas')}`;
    return html;
  }
  function qrLabel(g) {
    return `<div class="qr-card"><div class="qb">${U.logo(22)}OleoRuta</div>${U.qrSVG(U.qrPayload(g.id))}<div class="qid">${g.id}</div><div class="qn">${esc(g.nombre)}</div><div class="qs">${esc(g.colonia)}${g.colonia !== g.zona ? ' · ' + g.zona : ''} · CDMX</div></div>`;
  }

  // Más
  function RMas() {
    return `<div class="screen">
      ${top('Más', null)}
      <div class="rows mt16">
        ${row('#/r/puestos', 'store', 'Puestos', 'Generadores y alta de puesto')}
        ${row('#/r/zonas', 'layers', 'Zonas y lotes', 'Avance y envío a planta')}
        ${row('#/r/monitor', 'bolt', 'Monitor de automatización', 'Historial del bot y escenarios')}
        ${row('#/r/bd', 'db', 'Base de datos', 'Generadores, Recolecciones, Zonas, Config, Resumen')}
        ${row('#/r/etiquetas', 'tag', 'Etiquetas QR', 'Imprimir QR de los puestos')}
        ${row('#/r/config', 'gear', 'Configuración', 'Precio, factor de agua y umbral')}
      </div>
      <div class="rows">
        <a class="row" href="#/login" data-act="logout"><span class="ri">${icon('logout')}</span><span class="rt"><b>Cerrar sesión</b></span></a>
      </div>
      <p class="foot-note">OleoRuta · Prototipo funcional MVP · Sprint 2<br>Universidad La Salle México · 900 CIB</p>
    </div>${tabbarR('mas')}`;
  }

  // ======================================================
  //  GENERADOR
  // ======================================================
  function GInicio(g) {
    const n = D.nivelEstimado(g), rs = D.recsDe(g.id), z = D.zona(g.zona);
    const mesIni = new Date(Date.now() - 30 * 86400000);
    const mes = rs.filter(r => new Date(r.fecha) >= mesIni);
    const ultMes = new Date(Date.now() - 60 * 86400000);
    const prev = rs.filter(r => new Date(r.fecha) >= ultMes && new Date(r.fecha) < mesIni);
    const totPago = rs.reduce((s, r) => s + r.pago, 0), totAgua = rs.reduce((s, r) => s + r.agua, 0);
    const sol = db().solicitudes.find(s => s.idGenerador === g.id && s.estado === 'ABIERTA');
    const last = rs[0];
    const html = `<div class="screen">
      <div class="brand-head"><div style="min-width:0"><h1>${esc(g.nombre)}</h1><div class="sub"><span class="dot ${sol ? '' : 'ok'}"></span>${sol ? 'Aviso enviado · recolector en camino' : `${g.id} · ${esc(g.colonia)}`}</div></div><button class="avatar" id="sw" aria-label="Tu cuenta">${fmt.iniciales(g.nombre)}</button></div>
      <div class="hero"><div class="hero-row">${U.bidon(n.pct, { tambo: g.contenedor > 50 })}
        <div class="hero-stat"><div class="label">Nivel estimado</div><div class="big num" style="font-size:54px;margin-top:6px">${fmt.n1(n.litros)}<small>L</small></div><div class="cap">de ${g.contenedor} L · ${fmt.pct(n.pct)}</div><div class="status-line mt16">${icon('truck').replace('<svg', '<svg style="width:15px;height:15px;color:var(--oil)"')}<span>Próxima <b>${fmt.fecha(n.proxima)}</b></span></div></div></div>
      </div>
      <div class="mt16">${gauge(n.pct)}</div>
      <div class="gauge-legend"><span>Última entrega ${last ? fmt.rel(last.fecha) : '—'}</span><span>${fmt.n1(g.litrosSemana)} L por semana</span></div>
      <div class="quick">
        <a href="#/g/${g.id}/qr"><span class="q on">${icon('qr')}</span>Mi QR</a>
        <button id="avisar"><span class="q">${icon('bell')}</span>Avisar</button>
        <a href="#/g/${g.id}/entregas"><span class="q">${icon('receipt')}</span>Pagos</a>
        <a href="#/g/${g.id}/impacto"><span class="q">${icon('leaf')}</span>Impacto</a>
      </div>
      <div class="card oil">
        <div class="between"><span class="label" style="color:var(--oil)">Recibido · últimos 30 días</span><span class="pill ok">${icon('check')}SPEI</span></div>
        <div class="num" style="font-size:42px;font-weight:200;letter-spacing:-.03em;margin-top:8px">${fmt.mxn(mes.reduce((s, r) => s + r.pago, 0))}</div>
        <div class="muted small">${mes.length} ${mes.length === 1 ? 'entrega' : 'entregas'} · 30 días previos ${fmt.mxn0(prev.reduce((s, r) => s + r.pago, 0))}</div>
        ${last ? `<a class="row" href="#/g/${g.id}/comprobante/${last.id}" style="margin:14px -18px -18px;width:calc(100% + 36px);border-top:1px solid rgba(255,194,26,.18)"><span class="ri">${icon('receipt')}</span><span class="rt"><b>Último pago · ${fmt.mxn(last.pago)}</b><span>${fmt.fh(last.fecha)} · ${last.claveRastreo || 'en proceso'}</span></span>${icon('chev', 'chev')}</a>` : ''}
      </div>
      <div class="grid2">
        <div class="tile">${icon('drop', 'ti')}<div class="v num">${fmt.n1(rs.reduce((s, r) => s + r.litros, 0))}<small>L</small></div><div class="d">reciclados en total</div></div>
        <div class="tile oil">${icon('water', 'ti')}<div class="v num">${fmt.agua(totAgua)}</div><div class="d">de agua protegida</div></div>
      </div>
      <div class="section-title"><span class="label">Lote de tu zona · ${g.zona}</span></div>
      <div class="rows">${zonaRow(z, `#/g/${g.id}/impacto`)}</div>
      <div class="rows">
        ${row(`#/g/${g.id}/entregas`, 'receipt', 'Entregas y comprobantes', `${rs.length} entregas · ${fmt.mxn0(totPago)} recibidos`)}
        ${row(`#/g/${g.id}/impacto`, 'leaf', 'Impacto ambiental', 'Agua protegida y logros')}
        ${row(`#/g/${g.id}/perfil`, 'store', 'Datos del negocio', `CLABE ${fmt.clabe(g.clabe)}`)}
        <div class="row"><span class="ri">${icon('gift')}</span><span class="rt"><b>Canjear saldo en tiendas</b><span>Tiendas de barrio participantes</span></span><span class="pill">Próximamente</span></div>
      </div>
    </div>${tabbarG(g.id, 'inicio')}`;
    setTimeout(() => { const b = app.querySelector('#avisar'); if (b) b.onclick = () => avisarSheet(g); });
    return html;
  }
  function avisarSheet(g) {
    const n = D.nivelEstimado(g);
    let l = Math.max(1, Math.round(n.litros));
    U.sheet(`<div class="between"><h3 style="margin:0;font-size:20px">Avisar que el aceite está listo</h3><button class="icon-btn" data-close>${icon('close')}</button></div>
      <p class="muted small">El recolector agrega tu puesto a la ruta del día.</p>
      <div class="center mt16"><div class="label">Litros aproximados</div><div class="num" id="al" style="font-size:56px;font-weight:200">${l} L</div></div>
      <div class="stepper mt8"><button id="am">${icon('minus')}</button><span style="width:90px"></span><button id="ap">${icon('plus')}</button></div>
      <div class="field"><label>Nota para el recolector (opcional)</label><textarea id="an" placeholder="Ej. Estoy de 3 a 7 pm"></textarea></div>
      <button class="btn mt16" id="as">${icon('bell')}Enviar aviso</button>`, (sh, close) => {
      const upd = () => sh.querySelector('#al').textContent = l + ' L';
      sh.querySelector('#am').onclick = () => { l = Math.max(1, l - 1); upd(); };
      sh.querySelector('#ap').onclick = () => { l = Math.min(g.contenedor, l + 1); upd(); };
      sh.querySelector('#as').onclick = () => { D.solicitar(g.id, l, sh.querySelector('#an').value.trim()); close(); U.toast('Aviso enviado · tu puesto está en la ruta', 'bell'); render(); };
    });
  }

  function GEntregas(g) {
    const rs = D.recsDe(g.id);
    const porMes = {};
    rs.slice().reverse().forEach(r => { const k = r.fecha.slice(0, 7); porMes[k] = (porMes[k] || 0) + r.pago; });
    const data = Object.entries(porMes).map(([k, v]) => ({ l: new Date(k + '-15').toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''), v, tip: new Date(k + '-15').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) }));
    const sol = db().solicitudes.filter(s => s.idGenerador === g.id);
    return `<div class="screen">
      ${top('Entregas y pagos', `#/g/${g.id}/inicio`)}
      <div class="hero mt16"><div class="label">Total recibido</div><div class="big num" style="margin-top:8px">${fmt.mxn0(rs.reduce((s, r) => s + r.pago, 0))}</div><div class="cap">${rs.length} pagos digitales · CLABE ${fmt.clabe(g.clabe)}</div></div>
      <div class="card"><div class="between"><span class="label">Pagos por mes</span><span class="small muted">MXN</span></div>${U.bars(data, { unit: 'MXN', fmtV: (v) => fmt.mxn0(v) })}</div>
      <div class="section-title"><span class="label">Comprobantes</span></div>
      <div class="rows">${rs.length ? rs.map(r => row(`#/g/${g.id}/comprobante/${r.id}`, 'receipt', fmt.mxn(r.pago), `${fmt.fh(r.fecha)} · ${fmt.L(r.litros)}`, `<span class="pill ${r.estatus === 'LIQUIDADO' ? 'ok' : 'oil'}">${r.estatus === 'LIQUIDADO' ? 'Liquidado' : 'En proceso'}</span>`, r.folio)).join('') : '<div class="empty">Aún no tienes entregas. Muestra tu QR al recolector.</div>'}</div>
      ${sol.length ? `<div class="section-title"><span class="label">Avisos enviados</span></div><div class="rows">${sol.map(s => `<div class="row"><span class="ri">${icon('bell')}</span><span class="rt"><b>≈ ${fmt.L(s.litrosEstimados)}</b><span>${fmt.fh(s.fecha)}${s.nota ? ' · ' + esc(s.nota) : ''}</span></span><span class="pill ${s.estado === 'ABIERTA' ? 'oil' : 'ok'}">${s.estado === 'ABIERTA' ? 'En ruta' : 'Atendido'}</span></div>`).join('')}</div>` : ''}
    </div>${tabbarG(g.id, 'entregas')}`;
  }

  function GComprobante(g, id) {
    const c = Comprobante(id, `#/g/${g.id}/entregas`);
    if (typeof c === 'string') return c;
    setTimeout(() => bindShare(c.r, c.g));
    return `<div class="screen">${top('Comprobante', `#/g/${g.id}/entregas`, shareBtn())}${c.html}</div>${tabbarG(g.id, 'entregas')}`;
  }

  function GQR(g) {
    return `<div class="screen">
      ${top('Mi QR', `#/g/${g.id}/inicio`, `<button class="icon-btn" data-act="print" aria-label="Imprimir">${icon('print')}</button>`)}
      <p class="muted small center mt16">Muéstralo o pégalo en tu puesto. El recolector lo escanea y tú recibes el pago al momento.</p>
      ${qrLabel(g)}
      <div class="rows">
        ${kvRow('ID del puesto', `<span class="mono">${g.id}</span>`)}
        ${kvRow('Pago a', `<span class="mono">CLABE ${fmt.clabe(g.clabe)}</span>`)}
        ${kvRow('Precio vigente', fmt.mxn(cfg().precio_litro) + ' / L')}
      </div>
    </div>${tabbarG(g.id, 'qr')}`;
  }

  function GImpacto(g) {
    const rs = D.recsDe(g.id), z = D.zona(g.zona);
    const L = rs.reduce((s, r) => s + r.litros, 0), A = rs.reduce((s, r) => s + r.agua, 0);
    const lotes = new Set(rs.map(r => r.idLote).filter(Boolean));
    const zonaL = db().recolecciones.filter(r => D.gen(r.idGenerador).zona === g.zona).reduce((s, r) => s + r.litros, 0);
    const logros = [
      ['drop', 'Primera entrega', rs.length >= 1], ['receipt', '5 entregas', rs.length >= 5], ['star', '50 L reciclados', L >= 50],
      ['factory', 'Aporte a 3 lotes', lotes.size >= 3], ['water', '100 mil L de agua', A >= 100000], ['shield', 'Cero aceite al drenaje', rs.length >= 3],
    ];
    return `<div class="screen">
      ${top('Impacto ambiental', `#/g/${g.id}/inicio`)}
      <div class="hero mt16"><div class="label">Agua protegida</div><div class="big num" style="margin-top:8px">${fmt.n(A)}<small>L</small></div><div class="cap">≈ ${fmt.n(A / 20)} garrafones de 20 L</div></div>
      <div class="grid2">
        <div class="tile">${icon('drop', 'ti')}<div class="v num">${fmt.n1(L)}<small>L</small></div><div class="d">aceite fuera del drenaje</div></div>
        <div class="tile oil">${icon('factory', 'ti')}<div class="v num">${lotes.size}</div><div class="d">lotes a biodiésel</div></div>
      </div>
      <div class="card"><div class="between"><span class="label">Tu aporte a ${g.zona}</span><span class="num">${fmt.pct(L / Math.max(1, zonaL))}</span></div><div class="mt8">${gauge(L / Math.max(1, zonaL), 'thin')}</div><div class="gauge-legend"><span>${fmt.L(L)} tuyos</span><span>${fmt.L(zonaL)} en la zona</span></div></div>
      <div class="section-title"><span class="label">Lote actual · ${g.zona}</span></div>
      <div class="rows">${zonaRow(z, `#/g/${g.id}/impacto`)}</div>
      <div class="card"><span class="label">Ruta de tu aceite</span>
        <div class="steps">${[['store', 'Tu puesto', 'Guardas el aceite en tu bidón'], ['truck', 'Recolector OleoRuta', 'Pesa, escanea y te paga al instante'], ['layers', 'Centro de acopio', `Se consolida en lotes de ${cfg().umbral_lote} L`], ['factory', esc(cfg().recicladora), 'Se transforma en biodiésel']].map(s => `<div class="step done"><span class="si">${icon(s[0])}</span><span class="st"><b>${s[1]}</b><span>${s[2]}</span></span></div>`).join('')}</div></div>
      <div class="section-title"><span class="label">Logros</span></div>
      <div class="wrap-badges">${logros.map(([i, t, on]) => `<span class="badge ${on ? '' : 'off'}">${icon(i)}${t}</span>`).join('')}</div>
    </div>${tabbarG(g.id, 'impacto')}`;
  }

  function GPerfil(g) {
    return `<div class="screen">
      ${top('Perfil', `#/g/${g.id}/inicio`)}
      <div class="center mt16"><span class="avatar lg" style="margin:0 auto">${fmt.iniciales(g.nombre)}</span><h2 style="margin:12px 0 2px;font-size:22px">${esc(g.nombre)}</h2><div class="muted small">${esc(g.tipo)}</div></div>
      <div class="rows mt24">
        ${kvRow('ID', `<span class="mono">${g.id}</span>`)}
        ${kvRow('Responsable', esc(g.responsable))}
        ${kvRow('Teléfono', fmt.tel(g.telefono))}
        ${kvRow('Colonia', esc(g.colonia))}
        ${kvRow('Zona', g.zona)}
        ${kvRow('Litros por semana', fmt.L(g.litrosSemana))}
        ${kvRow('CLABE (simulada)', `<span class="mono" style="font-size:13px">${fmt.clabeFull(g.clabe)}</span>`)}
        ${kvRow('Fecha de alta', fmt.fechaL(g.fechaAlta + 'T12:00'))}
      </div>
      <div class="rows">
        <a class="row" href="#/login" data-act="logout"><span class="ri">${icon('logout')}</span><span class="rt"><b>Cerrar sesión</b></span></a>
      </div>
      <p class="foot-note">Tus datos se usan solo para pagarte y rastrear tu aceite.<br>OleoRuta · prototipo</p>
    </div>${tabbarG(g.id, 'perfil')}`;
  }

  function notFound(back) { return `<div class="screen">${top('No encontrado', back)}<div class="empty">El registro no existe.</div></div>`; }

  // ======================================================
  //  ENRUTADOR
  // ======================================================
  function render() {
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    document.body.classList.remove('wide');
    document.querySelectorAll('.sheet, .sheet-bg').forEach(e => e.remove());
    const { parts, q } = parse();
    let html = '';
    const ses = getSession();
    const dev = !!(NATIVE && NATIVE.dev);   // ruta abierta desde Xcode con -route (pruebas)
    if (!parts.length) {
      if (ses && ses.role === 'R') return go('#/r/inicio');
      if (ses && ses.role === 'G' && D.gen(ses.id)) return go(`#/g/${ses.id}/inicio`);
      return go('#/login');
    }
    if (parts[0] === 'login') { if (ses && ses.role === 'G' && D.gen(ses.id)) return go(`#/g/${ses.id}/inicio`); Login(q); return after(); }
    if (parts[0] === 'registro') { Registro(); return after(); }
    if (parts[0] === 'bienvenida') { Bienvenida(parts[1]); return after(); }
    if (parts[0] === 'r') {
      if (!(ses && ses.role === 'R') && !dev) return go('#/login');
      setSession({ role: 'R' });
      const [, v, a] = parts;
      html = ({
        inicio: () => RInicio(), ruta: () => RRuta(), escanear: () => REscanear(q), alta: () => RAlta(q),
        puesto: () => RPuesto(a), entrega: () => REntrega(a, q), confirmacion: () => RConfirmacion(a), comprobante: () => RComprobante(a),
        tablero: () => RTablero(q), zonas: () => RZonas(), puestos: () => RPuestos(), monitor: () => RMonitor(q), bd: () => RBD(q),
        config: () => RConfig(), etiquetas: () => REtiquetas(q), mas: () => RMas(),
      }[v] || (() => RInicio()))();
    } else if (parts[0] === 'g') {
      const g = D.gen(parts[1]);
      if (!g) return go('#/login');
      if (!(ses && ses.role === 'G' && ses.id === g.id) && !dev) return go('#/login');
      setSession({ role: 'G', id: g.id });
      const v = parts[2], a = parts[3];
      html = ({ inicio: () => GInicio(g), entregas: () => GEntregas(g), comprobante: () => GComprobante(g, a), qr: () => GQR(g), impacto: () => GImpacto(g), perfil: () => GPerfil(g) }[v] || (() => GInicio(g)))();
    } else return go('#/login');
    app.innerHTML = html;
    after();
  }
  function after() {
    U.bindCharts(app);
    const sw = app.querySelector('#sw'); if (sw) sw.onclick = cuentaSheet;
    window.scrollTo(0, 0);
  }

  // Acciones delegadas (sin manejadores en línea, compatible con CSP estricta)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    if (t.dataset.act === 'print') { e.preventDefault(); window.OleoPrint(); }
    if (t.dataset.act === 'logout') { try { localStorage.removeItem(SKEY); } catch (err) { } }
  });
  window.addEventListener('hashchange', render);
  render();
  sincronizarCuentas();

  if (!NATIVE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
    // Cuando se activa una versión nueva del service worker, recarga una sola vez para mostrarla
    let recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargado) { recargado = true; location.reload(); } });
  }
})();
