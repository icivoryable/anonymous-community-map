
// --- js/map.js ---
window.map = null;
window.markers = null;
window.dropMode = false;
window.clickLatLng = null;

function initMap() {
  if (window.map !== null) return; 
  
  window.map = L.map('map').setView([27.9506, -82.4572], 12); // Kept it in Tampa
  window.markers = L.layerGroup().addTo(window.map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(window.map);

  window.map.on('click', (e) => {
    if (!window.dropMode) return;
    window.clickLatLng = e.latlng;
    openReportModal();
  });
}

function toggleReport() {
  window.dropMode = !window.dropMode;
  setStatus(window.dropMode ? 'Drop mode: click map to add a pin' : `Ready (Logged in as: ${userRole})`);
}

function getColoredIcon(status) {
  let color = 'blue'; 
  if (status === 'Reported') color = 'grey';
  if (status === 'Confirmed') color = 'red';
  if (status === 'Resolved') color = 'green';
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
}

window.renderPin = function renderPin(pin) {
  const div = document.createElement('div');
  
  // Try to parse the JSON string back into your structured report
  let reportData = { actions: pin.description }; 
  try { reportData = JSON.parse(pin.description); } catch(e) {}
  
  const formattedText = formatReport({ ...reportData, createdAt: pin.createdAt });

  let html = `
    <strong>Status: ${pin.status}</strong><br/>
    <pre style="font-size: 0.8em; margin: 5px 0;">${formattedText}</pre>
    <button onclick="openCopyModal(\`${formattedText.replace(/`/g, "'")}\`)" style="padding:4px; font-size:12px;">Copy</button>
  `;

  if (userRole === 'admin') {
    html += `<hr style="margin:5px 0;">
      <div style="display:flex; flex-direction:column; gap:4px;">
        <button onclick="updatePin('${pin.id}', 'Under Verification')" style="background:#005a87; color:white; border:none; padding:4px; font-size:12px;">Set: Verifying</button>
        <button onclick="updatePin('${pin.id}', 'Confirmed')" style="background:#b30000; color:white; border:none; padding:4px; font-size:12px;">Set: Confirmed</button>
        <button onclick="updatePin('${pin.id}', 'Resolved')" style="background:#006600; color:white; border:none; padding:4px; font-size:12px;">Set: Resolved</button>
      </div>`;
  }
  
  div.innerHTML = html;

  L.marker([pin.lat, pin.lng], { icon: getColoredIcon(pin.status) })
    .addTo(window.markers)
    .bindPopup(div);
}

window.loadPins = async function loadPins(code) {
  const res = await fetch('/api/pins', { headers: { 'x-access-code': code } });
  if (res.status === 401) return false; 
  
  const data = await res.json();
  userRole = data.role; 
  
  if (!window.markers) initMap(); 
  window.markers.clearLayers();
  
  if (data.pins && data.pins.length > 0) {
    data.pins.forEach(p => window.renderPin(p));
  }
  return true;
}
