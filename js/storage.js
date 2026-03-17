// --- js/storage.js ---
let userRole = "observer";

async function checkAccess() {
  const inputEl = document.getElementById('accessCodeInput');
  const errorEl = document.getElementById('login-error');
  const code = inputEl.value || localStorage.getItem('map_access_code');
  
  if (!code) return;
  errorEl.textContent = "Checking credentials...";
  
  try {
    const success = await window.loadPins(code);
    if (!success) {
      errorEl.textContent = "Incorrect access code.";
      localStorage.removeItem('map_access_code');
      return;
    }
    
    localStorage.setItem('map_access_code', code);
    showApp();
    if (window.map) window.map.invalidateSize(); 
    setStatus(`Ready (Logged in as: ${userRole})`);
  } catch (err) {
    errorEl.textContent = `Network error: ${err.message}`;
  }
}
window.checkAccess = checkAccess;

async function submitReport() {
  // 1. Make sure we actually clicked the map first!
  if (!window.clickLatLng) return;

  // 2. Gather all the data from your new HTML form
  const statusString = 'Reported'; // Default
  const count = document.getElementById("count").value;
  const location = document.getElementById("location").value;
  const equipment = document.getElementById("equipment").value;
  const actions = document.getElementById("actions").value;
  
  // 3. Combine the form data into a single string for your backend
  const message = JSON.stringify({ count, location, equipment, actions });

  // 4. Secure the coordinates BEFORE sending them over the internet
  const safeCoords = window.obfuscateLocation(window.clickLatLng.lat, window.clickLatLng.lng);

  // 5. Send it to Upstash!
  try {
    setStatus('Saving pin to community map…');
    const code = localStorage.getItem('map_access_code');
    
    const res = await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ 
        lat: safeCoords.lat, // Using the secured latitude
        lng: safeCoords.lng, // Using the secured longitude
        message: message, 
        status: statusString 
      })
    });
    
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    
    const pin = await res.json();
    window.renderPin(pin);
    setStatus('Pin saved securely to community map');
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  } finally {
    closeReportModal();
    window.dropMode = false;
  }
}

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
