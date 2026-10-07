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
    { zona: 'Doctores', codigo: 'DOC', alcaldia: 'Cuauhtémoc' },
    { zona: 'Portales', codigo: 'POR', alcaldia: 'Benito Juárez' },
  ];

  // Hoja «Generadores» (datos de prueba del equipo)
  const GENERADORES = [
    { id: 'GEN-001', nombre: 'Tacos Don Beto', tipo: 'Puesto de tacos', responsable: 'Roberto M.', telefono: '5500000001', colonia: 'Narvarte Poniente', zona: 'Narvarte', litrosSemana: 5, clabe: '646180000000000011', fechaAlta: '2026-10-05', contenedor: 20 },
    { id: 'GEN-002', nombre: 'Quesadillas Doña Lupe', tipo: 'Puesto de quesadillas', responsable: 'Guadalupe R.', telefono: '5500000002', colonia: 'Narvarte Poniente', zona: 'Narvarte', litrosSemana: 15, clabe: '646180000000000022', fechaAlta: '2026-10-05', contenedor: 20 },
    { id: 'GEN-003', nombre: 'Tianguis del Martes – Pasillo A', tipo: 'Tianguis (contenedor)', responsable: 'Mesa directiva', telefono: '5500000003', colonia: 'Doctores', zona: 'Doctores', litrosSemana: 40, clabe: '646180000000000033', fechaAlta: '2026-10-05', contenedor: 200 },
    { id: 'GEN-004', nombre: 'Garnachas El Portal', tipo: 'Fritanga', responsable: 'Jorge P.', telefono: '5500000004', colonia: 'Portales Norte', zona: 'Portales', litrosSemana: 5, clabe: '646180000000000044', fechaAlta: '2026-10-05', contenedor: 20 },
    { id: 'GEN-005', nombre: 'Churros La Esquina', tipo: 'Puesto de churros', responsable: 'Ana L.', telefono: '5500000005', colonia: 'Portales Norte', zona: 'Portales', litrosSemana: 6, clabe: '646180000000000055', fechaAlta: '2026-10-05', contenedor: 20 },
    { id: 'GEN-006', nombre: 'Tacos de Canasta Rosy', tipo: 'Puesto de tacos', responsable: 'Rosa H.', telefono: '5500000006', colonia: 'Doctores', zona: 'Doctores', litrosSemana: 8, clabe: '646180000000000066', fechaAlta: '2026-10-05', contenedor: 20 },
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
    const contador = { Narvarte: 0, Doctores: 0, Portales: 0 };
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

    return { version: 1, config: cfg, generadores: GENERADORES.map(g => ({ ...g })), recolecciones, lotes, solicitudes, creado: iso(new Date()) };

    function zonaDe(id) { return GENERADORES.find(g => g.id === id).zona; }
  }

  // ---------- store ----------
  let db = null;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || db.version !== 1) { db = seed(); save(); }
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
    const orden = { Narvarte: 0, Doctores: 1, Portales: 2 };
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
  function registrarEntrega({ idGenerador, litros, foto }) {
    const cfg = db.config;
    const r = rng(Date.now() & 0xffffffff);
    const ahora = new Date();
    const item = {
      id: hex8(r), idGenerador, fecha: iso(ahora), litros: +litros,
      pago: +(litros * cfg.precio_litro).toFixed(2), agua: Math.round(litros * cfg.factor_agua), precio: cfg.precio_litro,
      foto: foto || null, estatus: 'EN PROCESO', claveRastreo: null, folio: siguienteFolio(), fechaLiquidacion: null,
      estadoLote: 'PENDIENTE', idLote: null, recolector: cfg.recolector, pipeline: null,
    };
    db.recolecciones.push(item);
    db.solicitudes.filter(s => s.idGenerador === idGenerador && s.estado === 'ABIERTA').forEach(s => s.estado = 'ATENDIDA');
    save();
    return item;
  }

  // Pasos 8–10: respuesta de la API SPEI simulada y actualización de la fila
  function liquidar(id, pipeline) {
    const item = rec(id);
    if (!item || item.estatus === 'LIQUIDADO') return item;
    const r = rng((Date.now() ^ 0x5bd1e995) >>> 0);
    const fl = new Date();
    item.estatus = 'LIQUIDADO';
    item.claveRastreo = claveRastreo(fl, r);
    item.fechaLiquidacion = iso(fl);
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
    load, save, reset, get db() { return db; }, ZONAS, iso,
    gen, rec, recsDe, zonas, zona, resumen, nivelEstimado, rutaDelDia,
    registrarEntrega, liquidar, enviarLote, altaGenerador, siguienteId, solicitar, setConfig,
  };
})();
