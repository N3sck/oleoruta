/* OleoRuta · Capa de datos local (simula Google Sheets «BD_OleoRuta»)
   Tablas: Generadores, Recolecciones, Zonas (calculada), Lotes, Config, Solicitudes y Resumen (calculada).
   Todo vive en localStorage: el prototipo funciona sin internet ni servidor. */
(function () {
  'use strict';

  const KEY = 'oleoruta.db.v1';

  const CONFIG_DEFAULT = {
    precio_litro: 9,          // MXN por litro (rango Kolibrie $7–$11)
    factor_agua: 1000,        // litros de agua protegidos por litro de aceite
    umbral_lote: 20,          // litros mínimos que exige la recicladora
    recicladora: 'Kolibrie Energy',
    emisor: 'STP-SIM',
    recolector: 'Unidad OR-01',
  };

  const ZONAS = [
    { zona: 'Narvarte', codigo: 'NAR', alcaldia: 'Benito Juárez' },
    { zona: 'Polanco', codigo: 'POL', alcaldia: 'Miguel Hidalgo' },
    { zona: 'Portales', codigo: 'POR', alcaldia: 'Benito Juárez' },
  ];

  // Zona piloto: solo estas colonias pueden crear cuenta e iniciar sesión (negocios).
  // Cada colonia se asigna sola a una de las 3 zonas de recolección (lotes de 20 L).
  const COLONIAS = [
    { colonia: 'Narvarte', zona: 'Narvarte', alcaldia: 'Benito Juárez', lat: 19.396, lng: -99.156 },
    { colonia: 'Del Valle', zona: 'Narvarte', alcaldia: 'Benito Juárez', lat: 19.38, lng: -99.165 },
    { colonia: 'Condesa', zona: 'Narvarte', alcaldia: 'Cuauhtémoc', lat: 19.412, lng: -99.174 },
    { colonia: 'Roma Norte', zona: 'Narvarte', alcaldia: 'Cuauhtémoc', lat: 19.418, lng: -99.161 },
    { colonia: 'Polanco', zona: 'Polanco', alcaldia: 'Miguel Hidalgo', lat: 19.433, lng: -99.195 },
    { colonia: 'Lomas de Chapultepec', zona: 'Polanco', alcaldia: 'Miguel Hidalgo', lat: 19.423, lng: -99.216 },
    { colonia: 'Santa Fe', zona: 'Polanco', alcaldia: 'Cuajimalpa', lat: 19.36, lng: -99.26 },
    { colonia: 'Portales', zona: 'Portales', alcaldia: 'Benito Juárez', lat: 19.368, lng: -99.146 },
    { colonia: 'Coyoacán', zona: 'Portales', alcaldia: 'Coyoacán', lat: 19.35, lng: -99.162 },
    { colonia: 'San Ángel', zona: 'Portales', alcaldia: 'Álvaro Obregón', lat: 19.346, lng: -99.19 },
  ];
  // Centros de referencia (dentro de cada polígono) para centrar el mapa
  const CEN = (window.OLEO_ZONAS_GEO || {}).centros || {};
  COLONIAS.forEach(c => { if (CEN[c.colonia]) { c.lat = CEN[c.colonia][0]; c.lng = CEN[c.colonia][1]; } });
  const sinAcentos = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  // «Narvarte Poniente», «Portales Norte», «Del Valle Centro»… cuentan como su colonia base
  function coloniaPermitida(texto) {
    const t = sinAcentos(texto);
    return COLONIAS.find(c => t === sinAcentos(c.colonia) || t.startsWith(sinAcentos(c.colonia) + ' ')) || null;
  }

  // Hoja «Generadores» (datos de prueba del equipo)
  const GENERADORES = [
    { id: 'GEN-001', nombre: 'Tacos Don Beto', tipo: 'Puesto de tacos', responsable: 'Roberto M.', telefono: '5500000001', colonia: 'Narvarte Poniente', zona: 'Narvarte', litrosSemana: 5, clabe: '646180000000000011', fechaAlta: '2026-10-05', contenedor: 20, lat: 19.3968, lng: -99.1553 },
    { id: 'GEN-002', nombre: 'Quesadillas Doña Lupe', tipo: 'Puesto de quesadillas', responsable: 'Guadalupe R.', telefono: '5500000002', colonia: 'Narvarte Poniente', zona: 'Narvarte', litrosSemana: 15, clabe: '646180000000000022', fechaAlta: '2026-10-05', contenedor: 20, lat: 19.3993, lng: -99.1588 },
    { id: 'GEN-003', nombre: 'Tianguis del Martes – Pasillo A', tipo: 'Tianguis (contenedor)', responsable: 'Mesa directiva', telefono: '5500000003', colonia: 'Polanco', zona: 'Polanco', litrosSemana: 40, clabe: '646180000000000033', fechaAlta: '2026-10-05', contenedor: 200, lat: 19.4335, lng: -99.1938 },
    { id: 'GEN-004', nombre: 'Garnachas El Portal', tipo: 'Fritanga', responsable: 'Jorge P.', telefono: '5500000004', colonia: 'Portales Norte', zona: 'Portales', litrosSemana: 5, clabe: '646180000000000044', fechaAlta: '2026-10-05', contenedor: 20, lat: 19.3712, lng: -99.1445 },
    { id: 'GEN-005', nombre: 'Churros La Esquina', tipo: 'Puesto de churros', responsable: 'Ana L.', telefono: '5500000005', colonia: 'Portales Norte', zona: 'Portales', litrosSemana: 6, clabe: '646180000000000055', fechaAlta: '2026-10-05', contenedor: 20, lat: 19.3698, lng: -99.1478 },
    { id: 'GEN-006', nombre: 'Tacos de Canasta Rosy', tipo: 'Puesto de tacos', responsable: 'Rosa H.', telefono: '5500000006', colonia: 'Polanco', zona: 'Polanco', litrosSemana: 8, clabe: '646180000000000066', fechaAlta: '2026-10-05', contenedor: 20, lat: 19.4298, lng: -99.2011 },
  ];

  // Patrón de uso simulado de cada puesto (cada cuántos días entrega y a qué hora)
  const PLANES = {
    'GEN-001': { cada: 14, primer: [2026, 7, 11], hora: [13, 30] },
    'GEN-002': { cada: 7, primer: [2026, 7, 13], hora: [12, 10] },
    'GEN-003': { cada: 7, primer: [2026, 7, 11], hora: [8, 40] },
    'GEN-004': { cada: 14, primer: [2026, 7, 21], hora: [17, 20] },
    'GEN-005': { cada: 14, primer: [2026, 7, 12], hora: [18, 5] },
    'GEN-006': { cada: 10, primer: [2026, 7, 15], hora: [11, 45] },
  };
  const SEED_FIN = new Date(2026, 9, 6, 9, 0); // datos simulados hasta el martes 6 oct 2026, 9:00

  // ---------- utilidades ----------
  function rng(seed) { // mulberry32 determinista
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  function stamp(d) { return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
  function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
  function hex8(r) { let s = ''; for (let i = 0; i < 8; i++) s += Math.floor(r() * 16).toString(16); return s; }
  function claveRastreo(d, r) { return 'RMX' + stamp(d) + pad(Math.floor(r() * 1000), 3); }
  const round05 = (x) => Math.round(x * 2) / 2;

  // ---------- semilla ----------
  function seed() {
    const cfg = { ...CONFIG_DEFAULT };
    const r = rng(20261008);
    const recs = [];
    GENERADORES.forEach((g, gi) => {
      const p = PLANES[g.id];
      const rg = rng(1000 + gi * 77);
      let d = new Date(p.primer[0], p.primer[1], p.primer[2], p.hora[0], p.hora[1]);
      while (d <= SEED_FIN) {
        const fecha = new Date(d.getTime() + Math.floor(rg() * 50 - 25) * 60000);
        const litros = Math.max(2, round05(g.litrosSemana * p.cada / 7 * (0.85 + rg() * 0.3)));
        recs.push({ g, fecha, litros });
        d = new Date(d.getTime() + p.cada * 86400000);
      }
    });
    recs.sort((a, b) => a.fecha - b.fecha);

    const recolecciones = recs.map((x, i) => {
      const liqSeg = 3 + Math.floor(r() * 5);
      const fl = new Date(x.fecha.getTime() + liqSeg * 1000);
      const bot = 300 + Math.floor(r() * 400), a = 600 + Math.floor(r() * 500), b = 900 + Math.floor(r() * 900);
      return {
        id: hex8(r),
        idGenerador: x.g.id,
        fecha: iso(x.fecha),
        litros: x.litros,
        pago: +(x.litros * cfg.precio_litro).toFixed(2),
        agua: Math.round(x.litros * cfg.factor_agua),
        precio: cfg.precio_litro,
        foto: null,
        estatus: 'LIQUIDADO',
        claveRastreo: claveRastreo(fl, r),
        folio: 'OR-' + pad(i + 1, 5),
        fechaLiquidacion: iso(fl),
        estadoLote: 'PENDIENTE',
        idLote: null,
        recolector: cfg.recolector,
        pipeline: { bot, makeA: a, makeB: b, total: bot + a + b + 250 },
      };
    });

    // Corridas a planta: cada viernes 16:00 se envían las zonas con ≥ umbral
    const lotes = [];
    const contador = { Narvarte: 0, Polanco: 0, Portales: 0 };
    for (let f = new Date(2026, 7, 14, 16, 0); f < SEED_FIN; f = new Date(f.getTime() + 7 * 86400000)) {
      ZONAS.forEach(z => {
        const pend = recolecciones.filter(x => x.estadoLote === 'PENDIENTE' && new Date(x.fecha) < f && zonaDe(x.idGenerador) === z.zona);
        const litros = pend.reduce((s, x) => s + x.litros, 0);
        if (litros >= cfg.umbral_lote) {
          contador[z.zona]++;
          const id = `LT-${z.codigo}-${pad(contador[z.zona], 3)}`;
          pend.forEach(x => { x.estadoLote = 'EN PLANTA'; x.idLote = id; });
          const listo = new Date(Math.max(...pend.map(x => +new Date(x.fecha))));
          lotes.push({ id, zona: z.zona, litros, recolecciones: pend.length, fechaListo: iso(listo), fechaEnvio: iso(f), destino: cfg.recicladora, manifiesto: 'MAN-KOL-' + pad(lotes.length + 101, 4), estado: 'ENTREGADO A PLANTA' });
        }
      });
    }

    const solicitudes = [
      { id: 'SOL-0007', idGenerador: 'GEN-002', fecha: '2026-10-06T07:55:00', litrosEstimados: 11, nota: 'Tuve mucha venta el fin de semana, el bidón ya va a la mitad.', estado: 'ABIERTA' },
      { id: 'SOL-0006', idGenerador: 'GEN-004', fecha: '2026-10-02T10:20:00', litrosEstimados: 10, nota: 'Paso de 3 a 7 pm.', estado: 'ATENDIDA' },
      { id: 'SOL-0005', idGenerador: 'GEN-006', fecha: '2026-09-24T09:05:00', litrosEstimados: 10, nota: 'Estoy en la esquina de Dr. Vértiz.', estado: 'ATENDIDA' },
    ];

    return { version: 3, config: cfg, generadores: GENERADORES.map(g => ({ ...g })), recolecciones, lotes, solicitudes, creado: iso(new Date()) };

    function zonaDe(id) { return GENERADORES.find(g => g.id === id).zona; }
  }

  // ---------- store ----------
  let db = null;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || db.version !== 3) { db = seed(); save(); }   // v3: ubicación de los negocios
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('No se pudo guardar', e); } }
  function reset() { db = seed(); save(); return db; }

  const gen = (id) => db.generadores.find(g => g.id === id);
  const recsDe = (id) => db.recolecciones.filter(r => r.idGenerador === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const rec = (id) => db.recolecciones.find(r => r.id === id);

  function zonas() {
    const u = db.config.umbral_lote;
    return ZONAS.map(z => {
      const pend = db.recolecciones.filter(r => r.estadoLote === 'PENDIENTE' && gen(r.idGenerador).zona === z.zona);
      const litros = pend.reduce((s, r) => s + r.litros, 0);
      const avance = Math.min(1, litros / u);
      const lotes = db.lotes.filter(l => l.zona === z.zona);
      return { ...z, litrosPendientes: litros, avance, estatus: litros >= u ? 'LISTO PARA PLANTA' : 'ACUMULANDO', pendientes: pend, lotesEnviados: lotes.length, litrosEnviados: lotes.reduce((s, l) => s + l.litros, 0), generadores: db.generadores.filter(g => g.zona === z.zona) };
    });
  }
  const zona = (nombre) => zonas().find(z => z.zona === nombre);

  function resumen(desde) {
    const rs = db.recolecciones.filter(r => !desde || new Date(r.fecha) >= desde);
    const litros = rs.reduce((s, r) => s + r.litros, 0);
    const pago = rs.reduce((s, r) => s + r.pago, 0);
    const agua = rs.reduce((s, r) => s + r.agua, 0);
    const activos = new Set(rs.map(r => r.idGenerador)).size;
    const tiempos = rs.map(r => r.pipeline ? r.pipeline.total : 0).filter(Boolean);
    return {
      entregas: rs.length, litros, pago, agua, activos,
      lotes: db.lotes.filter(l => !desde || new Date(l.fechaEnvio) >= desde).length,
      ticket: rs.length ? pago / rs.length : 0,
      liquidacionSeg: tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length / 1000 : 0,
    };
  }

  // Nivel estimado en el contenedor del puesto desde su última entrega
  function nivelEstimado(g, ahora = new Date()) {
    const rs = recsDe(g.id);
    const ultima = rs[0] ? new Date(rs[0].fecha) : new Date(g.fechaAlta);
    const dias = Math.max(0, (ahora - ultima) / 86400000);
    const litros = Math.min(g.contenedor, g.litrosSemana * dias / 7);
    const plan = PLANES[g.id];
    const cada = plan ? plan.cada : Math.max(7, Math.round(g.contenedor * 0.5 / g.litrosSemana * 7));
    const proxima = new Date(ultima.getTime() + cada * 86400000);
    return { litros, pct: litros / g.contenedor, ultima, proxima, cada };
  }

  // Ruta del día: puestos con recolección hoy, vencida, de mañana o con aviso abierto
  function rutaDelDia(ahora = new Date()) {
    const hoy = new Date(ahora); hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy.getTime() + 2 * 86400000);
    const orden = { Narvarte: 0, Polanco: 1, Portales: 2 };
    const paradas = [];
    db.generadores.forEach(g => {
      const hoyRec = recsDe(g.id).find(r => new Date(r.fecha) >= hoy);
      const n = nivelEstimado(g, ahora);
      const sol = db.solicitudes.find(s => s.idGenerador === g.id && s.estado === 'ABIERTA');
      if (hoyRec) paradas.push({ g, estado: 'RECOLECTADO', rec: hoyRec, n, sol: null });
      else if (sol || n.proxima < manana) paradas.push({ g, estado: 'PENDIENTE', n, sol });
    });
    return paradas.sort((a, b) => (a.estado === b.estado ? 0 : a.estado === 'RECOLECTADO' ? -1 : 1) || orden[a.g.zona] - orden[b.g.zona]);
  }

  function siguienteFolio() { return 'OR-' + pad(db.recolecciones.length + 1, 5); }

  // Paso 4–5 del pipeline: el recolector guarda la entrega (estatus EN PROCESO)
  function registrarEntrega({ idGenerador, litros, foto, recolector }) {
    const cfg = db.config;
    const r = rng(Date.now() & 0xffffffff);
    const ahora = new Date();
    const item = {
      id: hex8(r), idGenerador, fecha: iso(ahora), litros: +litros,
      pago: +(litros * cfg.precio_litro).toFixed(2), agua: Math.round(litros * cfg.factor_agua), precio: cfg.precio_litro,
      foto: foto || null, estatus: 'EN PROCESO', claveRastreo: null, folio: siguienteFolio(), fechaLiquidacion: null,
      estadoLote: 'PENDIENTE', idLote: null, recolector: recolector || cfg.recolector, pipeline: null,
    };
    db.recolecciones.push(item);
    db.solicitudes.filter(s => s.idGenerador === idGenerador && s.estado === 'ABIERTA').forEach(s => s.estado = 'ATENDIDA');
    save();
    return item;
  }

  // Pasos 8–10: respuesta de la API SPEI simulada y actualización de la fila
  function liquidar(id, pipeline, ext) {
    const item = rec(id);
    if (!item || item.estatus === 'LIQUIDADO') return item;
    const r = rng((Date.now() ^ 0x5bd1e995) >>> 0);
    const fl = new Date();
    item.estatus = 'LIQUIDADO';
    item.claveRastreo = (ext && ext.clave_rastreo) || claveRastreo(fl, r);
    item.fechaLiquidacion = (ext && ext.fecha_liquidacion) ? String(ext.fecha_liquidacion).slice(0, 19) : iso(fl);
    item.pipeline = pipeline;
    save();
    return item;
  }

  function enviarLote(nombreZona) {
    const z = zona(nombreZona);
    if (!z || z.litrosPendientes <= 0) return null;
    const n = db.lotes.filter(l => l.zona === nombreZona).length + 1;
    const id = `LT-${z.codigo}-${pad(n, 3)}`;
    z.pendientes.forEach(p => { const x = rec(p.id); x.estadoLote = 'EN PLANTA'; x.idLote = id; });
    const ahora = new Date();
    const lote = { id, zona: nombreZona, litros: z.litrosPendientes, recolecciones: z.pendientes.length, fechaListo: iso(ahora), fechaEnvio: iso(ahora), destino: db.config.recicladora, manifiesto: 'MAN-KOL-' + pad(db.lotes.length + 101, 4), estado: 'ENTREGADO A PLANTA' };
    db.lotes.push(lote); save();
    return lote;
  }

  function altaGenerador(data) {
    const g = { ...data, litrosSemana: +data.litrosSemana || 5, contenedor: data.tipo && /tianguis/i.test(data.tipo) ? 200 : 20, fechaAlta: iso(new Date()).slice(0, 10) };
    db.generadores.push(g); save(); return g;
  }
  // Tipos de negocio (mismos valores que la columna «Tipo» y que el backend) con su consumo típico por semana
  const TIPOS = [
    { valor: 'Puesto de tacos', corto: 'Tacos', litros: 5 },
    { valor: 'Puesto de quesadillas', corto: 'Quesadillas', litros: 15 },
    { valor: 'Tacos de canasta', corto: 'Canasta', litros: 8 },
    { valor: 'Fritanga', corto: 'Fritanga', litros: 5 },
    { valor: 'Puesto de churros', corto: 'Churros', litros: 6 },
    { valor: 'Fonda', corto: 'Fonda', litros: 10 },
    { valor: 'Tianguis (contenedor fijo)', corto: 'Tianguis', litros: 40 },
    { valor: 'Otro', corto: 'Otro', litros: 5 },
  ];

  function fechaISO(v) {
    const s = String(v || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return iso(new Date()).slice(0, 10);
  }

  // Zona de recolección: se calcula desde la colonia (zona piloto); «Doctores» ya no existe → Polanco
  function zonaDe(colonia, zonaHoja) {
    const c = coloniaPermitida(colonia);
    if (c) return c.zona;
    if (ZONAS.some(z => z.zona === zonaHoja)) return zonaHoja;
    return 'Polanco';
  }

  // Fila de la hoja «Generadores» (o respuesta del alta) → generador local
  function desdeHoja(r) {
    const id = String(r.ID_Generador || r.id_generador || '').trim().toUpperCase();
    if (!/^GEN-\d{3,4}$/.test(id)) return null;
    const tipo = r.Tipo || r.tipo || 'Otro';
    return {
      id, nombre: String(r.Nombre_Negocio || r.nombre || '').trim(), tipo,
      responsable: r.Responsable || r.responsable || '', telefono: String(r.Telefono || r.telefono || '').replace(/\D/g, ''),
      colonia: r.Colonia || r.colonia || '', zona: zonaDe(r.Colonia || r.colonia, r.Zona || r.zona),
      litrosSemana: +(r.Litros_Semana || r.litros_semana) || 5, clabe: String(r.CLABE_Simulada || r.clabe || '').replace(/\D/g, ''),
      fechaAlta: fechaISO(r.Fecha_Alta || r.fecha_alta), contenedor: /tianguis/i.test(tipo) ? 200 : 20,
      lat: num(r.Latitud ?? r.lat), lng: num(r.Longitud ?? r.lng), ubicacionFecha: r.Ubicacion_Fecha || r.ubicacion_fecha || '',
    };
  }

  const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : null; };

  // Distancia en km entre dos puntos (fórmula del haversine)
  function distanciaKm(a, b) {
    const R = 6371, rad = (x) => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // Colonia de la zona piloto que CONTIENE el punto (polígonos de js/zonas_geo.js); null si está fuera
  function dentroAnillo(lat, lng, ring) {
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  function coloniaDePunto(pos) {
    const G = (window.OLEO_ZONAS_GEO || {}).poligonos || {};
    const nombre = Object.keys(G).find(c => G[c].some(r => dentroAnillo(pos.lat, pos.lng, r)));
    return nombre ? COLONIAS.find(c => c.colonia === nombre) : null;
  }
  // Colonia permitida más cercana a un punto (null si está a más de 2.5 km de todas)
  function coloniaCercana(pos, maxKm = 2.5) {
    let mejor = null, dMin = Infinity;
    COLONIAS.forEach(c => { const d = distanciaKm(pos, c); if (d < dMin) { dMin = d; mejor = c; } });
    return dMin <= maxKm ? { ...mejor, km: dMin } : null;
  }

  // Agrega o actualiza un generador con los datos de la nube (no toca su historial)
  function upsertGenerador(g) {
    if (!g) return null;
    const i = db.generadores.findIndex(x => x.id === g.id);
    if (i < 0) db.generadores.push(g);
    else {
      const prev = db.generadores[i];
      db.generadores[i] = { ...prev, ...g, contenedor: prev.contenedor || g.contenedor,
        lat: g.lat ?? prev.lat ?? null, lng: g.lng ?? prev.lng ?? null, ubicacionFecha: g.ubicacionFecha || prev.ubicacionFecha || '' };
    }
    save();
    return gen(g.id);
  }

  function siguienteId() {
    const max = db.generadores.reduce((m, g) => Math.max(m, parseInt(g.id.slice(4), 10) || 0), 0);
    return 'GEN-' + pad(max + 1, 3);
  }

  function solicitar(idGenerador, litrosEstimados, nota) {
    const n = db.solicitudes.length + 1;
    const s = { id: 'SOL-' + pad(n + 1, 4), idGenerador, fecha: iso(new Date()), litrosEstimados, nota: nota || '', estado: 'ABIERTA' };
    db.solicitudes.unshift(s); save(); return s;
  }

  function setConfig(c) { Object.assign(db.config, c); save(); }

  window.OleoDB = {
    load, save, reset, get db() { return db; }, ZONAS, COLONIAS, coloniaPermitida, iso,
    gen, rec, recsDe, zonas, zona, resumen, nivelEstimado, rutaDelDia,
    registrarEntrega, liquidar, enviarLote, altaGenerador, siguienteId, solicitar, setConfig,
    TIPOS, desdeHoja, upsertGenerador, distanciaKm, coloniaCercana, coloniaDePunto,
    setUbicacion: (id, lat, lng) => { const g = gen(id); if (g) { g.lat = lat; g.lng = lng; g.ubicacionFecha = iso(new Date()).replace('T', ' ').slice(0, 16); save(); } return g; },
  };
})();
