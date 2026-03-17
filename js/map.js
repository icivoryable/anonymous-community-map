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

window.toggleReport = function toggleReport() {
  window.dropMode = !window.dropMode;
  
  if (window.dropMode) {
    setStatus('Drop mode: click map to add a pin');
    document.getElementById('map').classList.add('crosshair-mode');
  } else {
    setStatus(`Ready (Logged in as: ${userRole})`);
    document.getElementById('map').classList.remove('crosshair-mode');
  }
}

// 1. COMBINED ICON FUNCTION (Priority + Status)
function getPinIcon(status, priorityLevel) {
  let color = 'blue'; // Default for Low priority
  
  // Set color based on Priority for active pins
  if (priorityLevel === 'Medium') color = 'gold';
  if (priorityLevel === 'High') color = 'red';
  
  // Override color if the pin is resolved or false!
  if (status === 'Resolved') color = 'green';
  if (status === 'False') color = 'black';
  
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
  
  let reportData = { actions: pin.description }; 
  try { reportData = JSON.parse(pin.description); } catch(e) {}
  
  // Grab the priority we saved, or default to 'Low'
  const pinPriority = reportData.priority || 'Low'; 
  
  const formattedText = formatReport({ ...reportData, createdAt: pin.createdAt });

  let html = `
    <strong>Status: ${pin.status}</strong><br/>
    <strong>Priority: ${pinPriority}</strong><br/>
    <pre style="font-size: 0.8em; margin: 5px 0; white-space: pre-wrap; font-family: inherit;">${formattedText}</pre>
    <button onclick="openCopyModal(\`${formattedText.replace(/`/g, "'")}\`)" style="background: #222; width: 100%; margin: 5px 0 0 0;">📋 Copy This Report</button>
  `;

  if (userRole === 'admin') {
    html += `<hr style="margin:5px 0;">
      <div style="display:flex; flex-direction:column; gap:4px;">
        <button onclick="updatePin('${pin.id}', 'Under Verification')" style="background:#005a87; color:white; border:none; padding:4px; font-size:12px;">Set: Verifying</button>
        <button onclick="updatePin('${pin.id}', 'Confirmed')" style="background:#b30000; color:white; border:none; padding:4px; font-size:12px;">Set: Confirmed</button>
        <button onclick="updatePin('${pin.id}', 'Resolved')" style="background:#006600; color:white; border:none; padding:4px; font-size:12px;">Set: Resolved</button>
        <button onclick="updatePin('${pin.id}', 'False')" style="background:#222222; color:white; border:none; padding:4px; font-size:12px;">Set: False Report</button>
      </div>`;
  }
  
  div.innerHTML = html;

  // Create marker using the new combined function
  L.marker([pin.lat, pin.lng], { icon: getPinIcon(pin.status, pinPriority) })
    .addTo(window.markers)
    .bindPopup(div);
}

window.loadPins = async function loadPins(code) {
  const res = await fetch('/api/pins', { headers: { 'x-access-code': code } });
  if (res.status === 401) return false; 
  
  const data = await res.json();
  userRole = data.role; 
  
  if (window.markers) {
    window.markers.clearLayers();
    if (data.pins && data.pins.length > 0) {
      data.pins.forEach(p => window.renderPin(p));
      window.updateRecentList(data.pins);
    }
  }
  return true;
}

window.updateRecentList = function(pins) {
  const list = document.getElementById("recentList");
  if (!list) return;
  list.innerHTML = "";
  
  pins.slice(-5).reverse().forEach(pin => {
    let reportData = { actions: pin.description };
    try { reportData = JSON.parse(pin.description); } catch(e) {}
    
    const formattedText = formatReport({ ...reportData, createdAt: pin.createdAt });
    
    const div = document.createElement("div");
    div.style.padding = "8px 5px";
    div.style.borderBottom = "1px solid #eee";
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    
    const textSpan = document.createElement("span");
    textSpan.innerText = `📍 ${reportData.location || 'Reported Location'} – ${new Date(pin.createdAt).toLocaleTimeString()}`;
    
    const copyBtn = document.createElement("button");
    copyBtn.innerText = "📋 Copy";
    copyBtn.style.margin = "0";
    copyBtn.style.padding = "4px 8px";
    copyBtn.style.fontSize = "12px";
    copyBtn.style.background = "#222";
    
    copyBtn.onclick = function() {
      openCopyModal(formattedText.replace(/`/g, "'"));
    };
    
    div.appendChild(textSpan);
    div.appendChild(copyBtn);
    list.appendChild(div);
  });
}
