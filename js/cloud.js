/* OleoRuta · conexión con la nube (Google Workspace)
   Escritura: POST al webhook del Escenario A (Google Apps Script) → API SPEI simulada (Escenario B) → fila en Google Sheets.
   Lectura:   hoja pública «BD_OleoRuta» en Google Sheets (consulta gviz en CSV, solo lectura).
   El envío usa application/x-www-form-urlencoded para evitar la solicitud previa (preflight) de CORS. */
(function () {
  'use strict';

  const CLOUD = {
    webhook: 'https://script.google.com/macros/s/AKfycbwxx_PmWY45fpQcxhPg2_JlKKc6gICIu9vv-m4fWNlwtVNucN-Rvobir8L38t-sAfbh/exec', // Escenario A (Apps Script)
    token: 'oleoruta-2026',     // el orquestador rechaza las solicitudes que no traen este token
    sheetId: '1XY0240hBkm0UtH5v4nyFAsKh7ptD3rIt3cuSUjlE9Cw',
    timeoutMs: 12000,
  };

  const enabled = () => !!CLOUD.webhook && navigator.onLine !== false;

  async function enviar(payload) {
    const body = new URLSearchParams({ ...payload, token: CLOUD.token });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CLOUD.timeoutMs);
    const t0 = performance.now();
    try {
      const res = await fetch(CLOUD.webhook, { method: 'POST', body, signal: ctrl.signal, cache: 'no-store' });
      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch (e) { }
      return { ok: res.ok && !!(data && data.estatus === 'LIQUIDADO'), status: res.status, data, raw, ms: Math.round(performance.now() - t0) };
    } finally {
      clearTimeout(t);
    }
  }

  // Acciones de cuenta (alta de generador, alta y login de recolector): POST con «accion» y token
  async function accion(nombre, datos) {
    const body = new URLSearchParams({ ...datos, accion: nombre, token: CLOUD.token });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CLOUD.timeoutMs);
    try {
      const res = await fetch(CLOUD.webhook, { method: 'POST', body, signal: ctrl.signal, cache: 'no-store' });
      let data = null;
      try { data = JSON.parse(await res.text()); } catch (e) { }
      return { ok: !!(data && data.estatus === 'OK'), data };
    } finally {
      clearTimeout(t);
    }
  }
  // Alta de generador: el backend asigna el siguiente ID_Generador en orden
  const alta = async (datos) => { const r = await accion('alta', datos); r.ok = r.ok && !!(r.data && r.data.generador); return r; };
  const altaRecolector = (datos) => accion('alta_recolector', datos);
  const loginRecolector = (id, contrasena) => accion('login_recolector', { id, contrasena });

  // CSV → arreglo de objetos (respeta comillas y comas dentro de los campos)
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const [head, ...body] = rows;
    return body.filter(r => r.some(Boolean)).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  }

  // En la app iOS (file://) la lectura se hace desde Swift; en el navegador, con fetch normal.
  const pendientes = {};
  function fetchNativo(url) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      pendientes[id] = { resolve, reject };
      setTimeout(() => { if (pendientes[id]) { delete pendientes[id]; reject(new Error('tiempo agotado')); } }, CLOUD.timeoutMs);
      window.webkit.messageHandlers.oleo.postMessage({ type: 'fetch', id, url });
    });
  }
  function fetchResultado(json) {
    const r = JSON.parse(json); const p = pendientes[r.id]; if (!p) return;
    delete pendientes[r.id];
    r.ok ? p.resolve(r.text) : p.reject(new Error('HTTP ' + r.status));
  }

  async function hoja(nombre) {
    const url = `https://docs.google.com/spreadsheets/d/${CLOUD.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nombre)}`;
    if (window.OleoNativeInfo && location.protocol === 'file:') return parseCSV(await fetchNativo(url));
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return parseCSV(await res.text());
  }

  window.OleoCloud = {
    CLOUD, enabled, enviar, alta, altaRecolector, loginRecolector, hoja, parseCSV, fetchResultado,
    sheetUrl: () => `https://docs.google.com/spreadsheets/d/${CLOUD.sheetId}/edit`,
  };
})();
