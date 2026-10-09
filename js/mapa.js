/* OleoRuta · mapas (Leaflet + mosaicos de OpenStreetMap, oscurecidos con CSS) y ubicación del dispositivo.
   - En la app iOS la ubicación viene de CoreLocation (puente nativo); en el navegador, de navigator.geolocation.
   - El pin se puede arrastrar o colocar tocando el mapa (sirve en computadoras sin GPS y en el simulador). */
(function () {
  'use strict';
  const CDMX = [19.405, -99.17];
  const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';   // sin clave; uso moderado según la política de OSM
  const ATRIB = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const pin = (txt, cls = '') => L.divIcon({
    className: 'or-pin-wrap', iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -38],
    html: `<div class="or-pin ${cls}"><span>${txt || ''}</span></div>`,
  });

  // Crea un mapa dentro de «el». opciones: { centro:[lat,lng], zoom, zonas:[{lat,lng,colonia}], estatico }
  function crear(el, op = {}) {
    if (!window.L || !el) return null;
    const m = L.map(el, {
      center: op.centro || CDMX, zoom: op.zoom || 13, zoomControl: !op.estatico, attributionControl: true,
      dragging: !op.estatico, scrollWheelZoom: false, doubleClickZoom: !op.estatico, touchZoom: !op.estatico, boxZoom: false, keyboard: !op.estatico, tap: !op.estatico,
    });
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATRIB, className: 'or-tiles' }).addTo(m);
    // Zona piloto: límites de las 10 colonias permitidas
    if (op.zonas) {
      const G = (window.OLEO_ZONAS_GEO || {}).poligonos || {};
      Object.keys(G).forEach(c => L.polygon(G[c], { color: '#ffc21a', weight: 1.5, opacity: .7, fillColor: '#ffc21a', fillOpacity: .09, interactive: false }).addTo(m)
        .bindTooltip(c, { permanent: false, direction: 'center', className: 'or-tip' }));
    }
    setTimeout(() => m.invalidateSize(), 60);
    setTimeout(() => m.invalidateSize(), 400);
    return m;
  }

  // Mapa con un pin editable: onCambio({lat,lng}) cada vez que el usuario lo mueve
  function selector(el, op = {}) {
    const m = crear(el, op); if (!m) return null;
    let mk = null;
    const poner = (lat, lng, mover = true, avisar = true) => {
      if (!mk) {
        mk = L.marker([lat, lng], { icon: pin('', 'yo'), draggable: true, autoPan: true }).addTo(m);
        mk.on('dragend', () => { const p = mk.getLatLng(); op.onCambio && op.onCambio({ lat: p.lat, lng: p.lng }); });
      } else mk.setLatLng([lat, lng]);
      if (mover) m.setView([lat, lng], Math.max(m.getZoom(), 16));
      if (avisar) op.onCambio && op.onCambio({ lat, lng });
    };
    m.on('click', (e) => poner(e.latlng.lat, e.latlng.lng, false));
    if (op.pos && op.pos.lat != null) poner(op.pos.lat, op.pos.lng, true, false);
    // Pin amarillo dentro de la zona piloto, rojo fuera
    const estado = (dentro) => { if (mk) mk.setIcon(pin('', dentro ? 'yo' : 'fuera')); };
    // Círculo con la precisión del GPS (se quita en cuanto el usuario mueve el pin a mano)
    let circ = null;
    const precision = (lat, lng, metros) => {
      if (circ) { m.removeLayer(circ); circ = null; }
      if (metros) circ = L.circle([lat, lng], { radius: Math.max(metros, 8), color: '#5ab0ff', weight: 1, fillColor: '#5ab0ff', fillOpacity: .12, interactive: false }).addTo(m);
    };
    m.on('click', () => precision());
    if (mk) mk.on('dragstart', () => precision());
    const ponerOrig = poner;
    return { mapa: m, poner: (...a) => { ponerOrig(...a); mk && mk.off('dragstart').on('dragstart', () => precision()); }, estado, precision, centrar: (lat, lng, z) => m.setView([lat, lng], z || m.getZoom()), pos: () => mk && mk.getLatLng() };
  }

  // Mapa con varios pines numerados (ruta del día): puntos [{lat,lng,txt,titulo,sub,href,cls}]
  function puntos(el, lista, op = {}) {
    const m = crear(el, op); if (!m) return null;
    const ok = lista.filter(p => p.lat != null && p.lng != null);
    const marcas = ok.map(p => {
      const mk = L.marker([p.lat, p.lng], { icon: pin(p.txt, p.cls) }).addTo(m);
      if (p.titulo) mk.bindPopup(`<b>${p.titulo}</b>${p.sub ? `<br><span>${p.sub}</span>` : ''}${p.href ? `<br><a href="${p.href}">Ver ficha</a>` : ''}`);
      return mk;
    });
    if (marcas.length > 1) m.fitBounds(L.featureGroup(marcas).getBounds().pad(0.25));
    else if (marcas.length === 1) m.setView(marcas[0].getLatLng(), op.zoom || 16);
    return m;
  }

  // ---------- ubicación del dispositivo ----------
  let pendiente = null;
  const err = (msg, codigo) => Object.assign(new Error(msg), { codigo });
  // Estado del permiso en el navegador (si el navegador lo permite consultar)
  async function permisoWeb() {
    try { return (await navigator.permissions.query({ name: 'geolocation' })).state; } catch (e) { return 'desconocido'; }
  }
  function ubicar() {
    return new Promise((resolve, reject) => {
      const nativo = window.OleoNativeInfo;
      if (nativo) {
        pendiente = { resolve, reject };
        try { window.webkit.messageHandlers.oleo.postMessage({ type: 'location' }); } catch (e) { pendiente = null; reject(err('No disponible', 'nodisponible')); }
        setTimeout(() => { if (pendiente) { pendiente = null; reject(err('El GPS tardó demasiado. Toca el mapa para colocar el pin.', 'error')); } }, 30000);
        return;
      }
      if (!navigator.geolocation || !window.isSecureContext) return reject(err('Este navegador no permite obtener la ubicación. Toca el mapa para colocar el pin.', 'nodisponible'));
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy }),
        e => reject(e.code === 1
          ? err('Permiso de ubicación denegado. Actívalo en tu navegador: toca el ícono junto a la dirección de la página → Ubicación → Permitir. O toca el mapa para colocar el pin.', 'denegado')
          : err('No se pudo obtener la ubicación. Revisa que el GPS esté encendido o toca el mapa para colocar el pin.', 'error')),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    });
  }
  // Respuesta del puente nativo (iOS)
  function resultadoNativo(json) {
    const r = JSON.parse(json), p = pendiente; pendiente = null; if (!p) return;
    r.ok ? p.resolve({ lat: r.lat, lng: r.lng, precision: r.precision }) : p.reject(err(r.error || 'No se pudo obtener la ubicación. Toca el mapa para colocar el pin.', r.codigo || 'error'));
  }

  const enlaceComoLlegar = (lat, lng) => window.OleoNativeInfo
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const abrirAjustes = () => { try { window.webkit.messageHandlers.oleo.postMessage({ type: 'openSettings' }); } catch (e) { } };
  window.OleoMapa = { crear, selector, puntos, ubicar, resultadoNativo, enlaceComoLlegar, permisoWeb, abrirAjustes, CDMX };
})();
