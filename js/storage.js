// --- js/storage.js ---
let userRole = "observer";

async function checkAccess() {
  const inputEl = document.getElementById('accessCodeInput');
  const errorEl = document.getElementById('login-error');
  const code = inputEl ? inputEl.value : null || localStorage.getItem('map_access_code');
  
  if (!code) return;
  if (errorEl) errorEl.textContent = "Checking credentials...";
  
  try {
    setStatus('Verifying access...');
    const success = await window.loadPins(code);
    
    if (!success) {
      if (errorEl) errorEl.textContent = "Incorrect access code.";
      localStorage.removeItem('map_access_code');
      setStatus('Invalid access code');
      return;
    }
    
    // Login successful!
    localStorage.setItem('map_access_code', code);
    
    // Show the app first
    if (typeof showApp === 'function') showApp();
    
    // Wait for the browser to render the un-hidden DOM
    setTimeout(() => {
      // 1. Initialize the map
      if (window.initMap) window.initMap();
      
      // 2. Aggressively force Leaflet to recalculate everything
      if (window.map) {
        window.map.invalidateSize(true);
        window.map.setView([27.9506, -82.4572], 12); // Re-center on Tampa
      }
      
      // 3. Force pins to draw right now
      window.loadPins(code);
    }, 100);

    setStatus(`Ready (Logged in as: ${userRole})`);
  } catch (err) {
    if (errorEl) errorEl.textContent = `Network error: ${err.message}`;
  }
}

window.checkAccess = checkAccess;

async function submitReport() {
  // 1. Make sure we actually clicked the map first!
  if (!window.clickLatLng) return;

  // 2. Gather all the data from your HTML form FIRST
  const statusString = 'Reported'; // Default
  const count = document.getElementById("count") ? document.getElementById("count").value : "";
  const locationDetail = document.getElementById("location") ? document.getElementById("location").value : "";
  const equipment = document.getElementById("equipment") ? document.getElementById("equipment").value : "";
  const actions = document.getElementById("actions") ? document.getElementById("actions").value : "";
  const resources = document.getElementById("resources") ? document.getElementById("resources").value : "";
  const priority = document.getElementById("priority") ? document.getElementById("priority").value : "Low"; 

  // 3. Combine it into the reportData object
  const reportData = {
    count: count,
    location: locationDetail,
    equipment: equipment,
    resources: resources,
    actions: actions,
    priority: priority
  };

  // 4. Secure the coordinates BEFORE sending them over the internet
  let safeLat = window.clickLatLng.lat;
  let safeLng = window.clickLatLng.lng;
  
  if (typeof window.obfuscateLocation === 'function') {
    const safeCoords = window.obfuscateLocation(safeLat, safeLng);
    safeLat = safeCoords.lat;
    safeLng = safeCoords.lng;
  }

  // 5. Send it to Upstash!
  try {
    setStatus('Saving pin to community map…');
    const code = localStorage.getItem('map_access_code');
    
    // Notice we use "description" here instead of "message" to match your renderer!
    const res = await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ 
        lat: safeLat, 
        lng: safeLng, 
        description: JSON.stringify(reportData), 
        status: statusString 
      })
    });
    
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    
    // Force a full reload of the map pins to grab the new one and draw it correctly
    await window.loadPins(code);
    setStatus('Pin saved securely to community map');
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  } finally {
    // 6. Clean up the UI
    if (typeof closeReportModal === 'function') closeReportModal();
    window.dropMode = false;
    
    const mapEl = document.getElementById('map');
    if (mapEl) mapEl.classList.remove('crosshair-mode'); 
    
    setStatus(`Ready (Logged in as: ${userRole})`); 
  }
}

window.submitReport = submitReport;

async function updatePin(id, newStatus) {
  try {
    setStatus(`Updating to ${newStatus}...`);
    const code = localStorage.getItem('map_access_code');
    
    const res = await fetch('/api/pins', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ id, newStatus })
    });

    if (!res.ok) throw new Error('Failed to update pin');
    await window.loadPins(code);
    setStatus('Status updated.');
  } catch (e) {
    setStatus(`Error: ${e.message}`);
  }
}

window.updatePin = updatePin;
