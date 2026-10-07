/* OleoRuta · componentes visuales: íconos, ilustraciones, formato y gráficas */
(function () {
  'use strict';

  // ---------- íconos (trazo 1.8, estilo lineal) ----------
  const P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2M17 17v1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    drop: '<path d="M12 3.5c3.6 4.3 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.4-6.3 6-10.6z"/>',
    water: '<path d="M12 3.5c3.6 4.3 6 7.6 6 10.6a6 6 0 0 1-12 0c0-3 2.4-6.3 6-10.6z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
    peso: '<path d="M12 3v18"/><path d="M16.5 7.5c-.7-1.3-2.4-2-4.5-2-2.6 0-4.5 1.3-4.5 3.2 0 4.6 9.3 2.3 9.3 7 0 2-2 3.3-4.8 3.3-2.3 0-4-.9-4.8-2.4"/>',
    truck: '<path d="M2.5 6.5h11v10h-11z"/><path d="M13.5 9.5h4l3.5 3.5v3.5h-7.5"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    store: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 11.5V20h13v-8.5"/><path d="M10 20v-5h4v5"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z"/>',
    db: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    tag: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9-8-8z"/><circle cx="8" cy="8" r="1.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19 13 11"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.6 3.6-5.5 6.5-5.5s5.3 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.4.9 2.4 2.6 3 5.2"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    share: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v8h14v-8"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2C11 19.5 4.5 13 4.5 5.5a2 2 0 0 1 2-2z"/>',
    bank: '<path d="m3 9 9-5 9 5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
    gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20"/><path d="M12 8.5C10 4 6.5 4.5 7 7c.3 1.4 3 1.5 5 1.5zM12 8.5c2-4.5 5.5-4 5-1.5-.3 1.4-3 1.5-5 1.5z"/>',
    factory: '<path d="M3 20V10l5 3V10l5 3V5h3v15z"/><path d="M16 9h5v11h-5M3 20h18"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    download: '<path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M4 3.5V8h4.5M20 20.5V16h-4.5"/>',
    logout: '<path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    zap: '<path d="M4 14 14 3l-2 8h8L10 21l2-7z"/>',
    spinner: '<path d="M12 3a9 9 0 1 1-9 9"/>',
    webhook: '<circle cx="12" cy="6" r="2.5"/><circle cx="5.5" cy="17" r="2.5"/><circle cx="18.5" cy="17" r="2.5"/><path d="m10.8 8.2-4 6.5M13.2 8.2l4 6.5M8 17h8"/>',
    sheet: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  };
  function icon(name, cls = '') { return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`; }

  // ---------- logotipo ----------
  function logo(size = 44) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe082"/><stop offset=".55" stop-color="#ffc21a"/><stop offset="1" stop-color="#d98a00"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="#111"/><path d="M24 8c6.6 7.6 11 13.4 11 18.8a11 11 0 0 1-22 0C13 21.4 17.4 15.6 24 8z" fill="url(#lg-d)"/><path d="M17.5 29.5c0 0 3 4.2 8.5 3" stroke="#111" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".75"/><circle cx="29.5" cy="22" r="2.3" fill="#fff" opacity=".55"/></svg>`;
  }

  // ---------- camioneta de recolección (héroe del recolector) ----------
  function van(cargaL = 0, capacidad = 120) {
    const pct = Math.max(0, Math.min(1, cargaL / capacidad));
    return `<svg class="art" viewBox="0 0 380 170" aria-label="Camioneta de recolección">
      <defs>
        <linearGradient id="vb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a40"/><stop offset=".45" stop-color="#1c1c20"/><stop offset="1" stop-color="#0a0a0b"/></linearGradient>
        <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a5a66"/><stop offset="1" stop-color="#101014"/></linearGradient>
        <linearGradient id="vy" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d98a00"/><stop offset=".6" stop-color="#ffc21a"/><stop offset="1" stop-color="#ffe082"/></linearGradient>
        <radialGradient id="vl" cx="1" cy=".5" r="1"><stop offset="0" stop-color="#ffd54f" stop-opacity=".55"/><stop offset="1" stop-color="#ffd54f" stop-opacity="0"/></radialGradient>
        <radialGradient id="vs" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc21a" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <clipPath id="vtank"><rect x="66" y="66" width="128" height="34" rx="6"/></clipPath>
      </defs>
      <ellipse cx="190" cy="146" rx="170" ry="14" fill="url(#vs)"/>
      <path d="M352 96 L380 82 L380 128 L352 114 Z" fill="url(#vl)"/>
      <path d="M34 128 V58 Q34 36 56 36 H238 Q254 36 266 46 L306 80 Q338 84 346 100 L348 118 Q348 128 338 128 Z" fill="url(#vb)" stroke="rgba(255,255,255,.14)" stroke-width="1"/>
      <path d="M44 40 H236 Q250 40 260 48" stroke="rgba(255,255,255,.28)" stroke-width="1.4" fill="none"/>
      <path d="M244 48 L268 50 L300 80 L246 80 Z" fill="url(#vg)" stroke="rgba(255,255,255,.18)"/>
      <rect x="206" y="50" width="32" height="30" rx="4" fill="url(#vg)" stroke="rgba(255,255,255,.12)"/>
      <path d="M200 46 V124" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/>
      <path d="M240 84 V124" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/>
      <rect x="64" y="64" width="132" height="38" rx="8" fill="rgba(0,0,0,.45)" stroke="rgba(255,194,26,.35)"/>
      <g clip-path="url(#vtank)"><rect x="66" y="66" width="${(128 * pct).toFixed(1)}" height="34" fill="url(#vy)" opacity=".9"/></g>
      <text x="130" y="88" text-anchor="middle" font-family="-apple-system,Segoe UI,sans-serif" font-size="12" font-weight="700" fill="#fff" stroke="rgba(0,0,0,.55)" stroke-width="2.5" paint-order="stroke" letter-spacing="1.5">OLEORUTA</text>
      <path d="M34 112 H348" stroke="url(#vy)" stroke-width="3"/>
      <rect x="336" y="94" width="12" height="8" rx="3" fill="#ffe082"/>
      <rect x="34" y="70" width="5" height="20" rx="2" fill="#ff3b30" opacity=".85"/>
      <g><circle cx="96" cy="128" r="21" fill="#050505" stroke="#2a2a2e" stroke-width="3"/><circle cx="96" cy="128" r="11" fill="#1f1f23" stroke="#ffc21a" stroke-width="1.5"/><circle cx="96" cy="128" r="3" fill="#ffc21a"/></g>
      <g><circle cx="290" cy="128" r="21" fill="#050505" stroke="#2a2a2e" stroke-width="3"/><circle cx="290" cy="128" r="11" fill="#1f1f23" stroke="#ffc21a" stroke-width="1.5"/><circle cx="290" cy="128" r="3" fill="#ffc21a"/></g>
    </svg>`;
  }

  // ---------- bidón / contenedor con nivel (héroe del generador) ----------
  let uid = 0;
  function bidon(pct = .5, opts = {}) {
    const id = 'bd' + (++uid);
    const p = Math.max(0, Math.min(1, pct));
    const top = 52, bot = 222, h = bot - top;
    const y = bot - h * p;
    const tambo = opts.tambo;
    const body = tambo
      ? `<rect x="36" y="40" width="128" height="186" rx="14"/>`
      : `<path d="M40 60 Q40 40 60 40 H116 L140 22 H160 Q170 22 170 34 V206 Q170 226 150 226 H60 Q40 226 40 206 Z"/>`;
    const ticks = [0, .25, .5, .75, 1].map(t => {
      const ty = bot - h * t;
      return `<line x1="${tambo ? 172 : 176}" x2="${tambo ? 182 : 186}" y1="${ty}" y2="${ty}" stroke="rgba(255,255,255,.25)"/>`;
    }).join('');
    return `<svg class="art" viewBox="0 0 200 250" aria-label="Contenedor de aceite al ${Math.round(p * 100)} %">
      <defs>
        <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe082"/><stop offset=".35" stop-color="#ffc21a"/><stop offset="1" stop-color="#b86f00"/></linearGradient>
        <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#26262b"/><stop offset=".5" stop-color="#16161a"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient>
        <clipPath id="${id}c">${body}</clipPath>
        <radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc21a" stop-opacity=".4"/><stop offset="1" stop-color="#ffc21a" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="104" cy="236" rx="80" ry="10" fill="url(#${id}g)"/>
      <g fill="url(#${id}b)" stroke="rgba(255,255,255,.16)" stroke-width="1.5">${body}</g>
      ${tambo ? '<path d="M36 90 H164 M36 176 H164" stroke="rgba(255,255,255,.1)" stroke-width="3"/>' : '<path d="M60 56 H112" stroke="rgba(255,255,255,.12)" stroke-width="10" stroke-linecap="round"/><rect x="146" y="12" width="18" height="12" rx="3" fill="#ffc21a"/>'}
      <g clip-path="url(#${id}c)">
        <g class="liquid">
          <path d="M0 ${y} Q 25 ${y - 6} 50 ${y} T 100 ${y} T 150 ${y} T 200 ${y} T 250 ${y} V 260 H 0 Z" fill="url(#${id}o)">
            <animateTransform attributeName="transform" type="translate" from="0 0" to="-100 0" dur="4s" repeatCount="indefinite"/>
          </path>
        </g>
        <rect x="52" y="${y + 8}" width="8" height="${Math.max(0, bot - y - 20)}" rx="4" fill="#fff" opacity=".18"/>
      </g>
      ${ticks}
    </svg>`;
  }

  // Foto simulada para entregas sin cámara: contenedor sobre báscula
  function fotoDemo(litros = 6, seed = 1) {
    const kg = (litros * 0.92).toFixed(1);
    const hue = 30 + (seed % 5) * 6;
    return `<svg class="pic" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="fd${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},18%,32%)"/><stop offset="1" stop-color="hsl(${hue},12%,14%)"/></linearGradient><linearGradient id="fo${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd54f" stop-opacity=".9"/><stop offset="1" stop-color="#b36b00"/></linearGradient></defs><rect width="120" height="120" fill="url(#fd${seed})"/><rect x="0" y="86" width="120" height="34" fill="rgba(0,0,0,.35)"/><rect x="22" y="82" width="76" height="14" rx="3" fill="#2b2b30"/><rect x="44" y="86" width="32" height="7" rx="1.5" fill="#0d1a10"/><text x="60" y="92.2" font-size="6.4" text-anchor="middle" fill="#7CFFB2" font-family="monospace">${kg} kg</text><path d="M38 30 Q38 24 44 24 H64 L72 18 H80 V78 Q80 82 76 82 H42 Q38 82 38 78 Z" fill="rgba(255,255,255,.55)"/><path d="M39 ${82 - 52 * Math.min(1, litros / 20)} H79 V78 Q79 81 76 81 H42 Q39 81 39 78 Z" fill="url(#fo${seed})"/><rect x="74" y="14" width="7" height="5" rx="1" fill="#e04b2b"/></svg>`;
  }

  // ---------- QR ----------
  function qrSVG(text, cls = 'qr') {
    const q = qrcode(0, 'M');
    q.addData(text); q.make();
    const n = q.getModuleCount(), m = 2;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg class="${cls}" viewBox="0 0 ${n + m * 2} ${n + m * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  }
  const qrPayload = (id) => `OLEORUTA|${id}`;

  // ---------- formato ----------
  const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
  const fmt = {
    n: (x) => nf0.format(x), n1: (x) => nf1.format(x),
    mxn: (x) => money.format(x).replace('MX', ''),
    mxn0: (x) => '$' + nf0.format(Math.round(x)),
    L: (x) => nf1.format(x) + ' L',
    agua: (x) => x >= 1e6 ? nf1.format(x / 1e6) + ' M L' : nf0.format(x) + ' L',
    fecha: (s) => new Date(s).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', ''),
    fechaL: (s) => new Date(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
    hora: (s) => new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
    fh: (s) => fmt.fecha(s) + ' · ' + fmt.hora(s),
    pct: (x) => Math.round(x * 100) + ' %',
    clabe: (c) => '•••• ' + c.slice(-4),
    clabeFull: (c) => c.replace(/(\d{3})(\d{3})(\d{11})(\d)/, '$1 $2 $3 $4'),
    tel: (t) => t.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3'),
    iniciales: (s) => s.replace(/[–-].*/, '').split(/\s+/).filter(w => w && !/^(de|del|la|las|el|los|y)$/i.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
    rel: (s) => {
      const d = (Date.now() - new Date(s)) / 86400000;
      if (d < 1 / 24) return 'hace minutos';
      if (d < 1) return 'hace ' + Math.round(d * 24) + ' h';
      if (d < 2) return 'ayer';
      return 'hace ' + Math.round(d) + ' días';
    },
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- gráfica de barras de una serie (con tooltip) ----------
  function bars(data, { h = 150, unit = 'L', fmtV = (v) => fmt.n1(v), highlightLast = true } = {}) {
    const W = 340, padB = 22, padT = 18, bw = Math.min(28, (W - 10) / data.length - 8);
    const max = Math.max(1, ...data.map(d => d.v)) * 1.12;
    const step = (W - 10) / data.length;
    const grid = [0.5, 1].map(t => { const y = padT + (h - padB - padT) * (1 - t / 1.12); return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.06)" stroke-dasharray="3 4"/>`; }).join('');
    const items = data.map((d, i) => {
      const bh = Math.max(2, (h - padB - padT) * d.v / max);
      const x = 5 + step * i + (step - bw) / 2;
      const y = h - padB - bh;
      const last = highlightLast && i === data.length - 1;
      const r = Math.min(4, bw / 2);
      const path = `M${x} ${h - padB} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + bw - r} Q${x + bw} ${y} ${x + bw} ${y + r} V${h - padB} Z`;
      return `<g class="bar-hit" data-tip="${esc(d.tip || d.l)}" data-val="${esc(fmtV(d.v))} ${unit}" data-x="${x + bw / 2}" data-y="${y}">
        <rect x="${5 + step * i}" y="${padT - 10}" width="${step}" height="${h - padT + 10}" fill="transparent"/>
        <path d="${path}" fill="${last ? 'url(#barOil)' : 'rgba(255,194,26,.38)'}"/>
        ${last ? `<text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#f5f5f7" font-weight="600">${fmtV(d.v)}</text>` : ''}
        <text x="${x + bw / 2}" y="${h - 6}" text-anchor="middle" font-size="10" fill="#6b6b73">${esc(d.l)}</text></g>`;
    }).join('');
    return `<div class="chart"><svg viewBox="0 0 ${W} ${h}"><defs><linearGradient id="barOil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd54f"/><stop offset="1" stop-color="#e59a00"/></linearGradient></defs>${grid}<line x1="0" x2="${W}" y1="${h - padB}" y2="${h - padB}" stroke="rgba(255,255,255,.12)"/>${items}</svg><div class="tip"></div></div>`;
  }
  function bindCharts(root) {
    root.querySelectorAll('.chart').forEach(ch => {
      const tip = ch.querySelector('.tip'); const svg = ch.querySelector('svg');
      if (!tip || !svg) return;
      const show = (g) => {
        const vb = svg.viewBox.baseVal, rect = svg.getBoundingClientRect(), k = rect.width / vb.width;
        tip.innerHTML = `${g.dataset.val}<span>${g.dataset.tip}</span>`;
        tip.style.left = (+g.dataset.x * k) + 'px'; tip.style.top = (+g.dataset.y * k) + 'px';
        tip.classList.add('on');
      };
      ch.querySelectorAll('.bar-hit').forEach(g => {
        g.addEventListener('mouseenter', () => show(g));
        g.addEventListener('click', () => show(g));
        g.addEventListener('mouseleave', () => tip.classList.remove('on'));
      });
    });
  }

  // anillo de progreso
  function ring(p, size = 200, stroke = 12) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return `<svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#222226" stroke-width="${stroke}"/><circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#ringOil)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" style="transition:stroke-dashoffset .6s ease"/><defs><linearGradient id="ringOil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe082"/><stop offset="1" stop-color="#e59a00"/></linearGradient></defs></svg>`;
  }

  // arco de la perilla de litros
  function dialArc(p) {
    const cx = 130, cy = 130, r = 108, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    const pt = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const arc = (from, to) => { const [x0, y0] = pt(from), [x1, y1] = pt(to); const large = to - from > Math.PI ? 1 : 0; return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const ap = a0 + (a1 - a0) * Math.max(0.001, Math.min(1, p));
    const [kx, ky] = pt(ap);
    let ticks = '';
    for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; const r1 = i % 5 ? 92 : 88; ticks += `<line x1="${(cx + r1 * Math.cos(a)).toFixed(1)}" y1="${(cy + r1 * Math.sin(a)).toFixed(1)}" x2="${(cx + 96 * Math.cos(a)).toFixed(1)}" y2="${(cy + 96 * Math.sin(a)).toFixed(1)}" stroke="${i / 40 <= p ? 'rgba(255,194,26,.7)' : 'rgba(255,255,255,.15)'}" stroke-width="${i % 5 ? 1 : 2}"/>`; }
    return `<svg viewBox="0 0 260 230" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="dialG" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#e59a00"/><stop offset="1" stop-color="#ffe082"/></linearGradient><filter id="dglow"><feGaussianBlur stdDeviation="4"/></filter></defs>${ticks}<path d="${arc(a0, a1)}" fill="none" stroke="#222226" stroke-width="10" stroke-linecap="round"/><path d="${arc(a0, ap)}" fill="none" stroke="url(#dialG)" stroke-width="10" stroke-linecap="round" filter="url(#dglow)" opacity=".6"/><path d="${arc(a0, ap)}" fill="none" stroke="url(#dialG)" stroke-width="10" stroke-linecap="round"/><circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="9" fill="#fff" stroke="#ffc21a" stroke-width="3"/></svg>`;
  }

  // JSON con resaltado
  function json(obj) {
    const s = JSON.stringify(obj, null, 2);
    return esc(s).replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
      .replace(/:\s(&quot;.*?&quot;)/g, ': <span class="s">$1</span>')
      .replace(/:\s(-?\d+\.?\d*)/g, ': <span class="n">$1</span>');
  }

  function toast(msg, ic = 'check') {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = icon(ic) + `<span>${msg}</span>`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
  }

  function sheet(html, onMount) {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    const sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = '<div class="grab"></div>' + html;
    const close = () => { bg.remove(); sh.remove(); };
    bg.onclick = close; document.body.append(bg, sh);
    sh.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    onMount && onMount(sh, close);
    return close;
  }

  window.UI = { icon, logo, van, bidon, fotoDemo, qrSVG, qrPayload, fmt, esc, bars, bindCharts, ring, dialArc, json, toast, sheet };
})();
