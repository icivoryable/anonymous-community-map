// --- js/storage.js ---
let userRole = "observer";
let lastLoginAttempt = 0; // Debounce tracker

async function checkAccess() {
  // 1. Debounce Login (Prevents brute-force spamming, 2 second cooldown)
  if (Date.now() - lastLoginAttempt < 2000) return;
  lastLoginAttempt = Date.now();

  // 2. Safer Optional Chaining
  const inputEl = document.getElementById('accessCodeInput');
  const errorEl = document.getElementById('login-error');
  
  // 3. Upgraded to sessionStorage! (Wipes completely when the browser tab closes)
  const code = inputEl?.value || sessionStorage.getItem('map_access_code');
  
  if (!code) return;
  if (errorEl) errorEl.textContent = "Checking credentials...";
  setStatus('Verifying access...');
  
  try {
    // We only call the server ONCE now
    const res = await fetch('/api/pins', { headers: { 'x-access-code': code } });
    if (res.status === 401 || !res.ok) {
      if (errorEl) errorEl.textContent = "Incorrect access code.";
      sessionStorage.removeItem('map_access_code');
      setStatus('Invalid access code');
      return;
    }
    
    // Login successful!
    const data = await res.json();
    userRole = data.role || "observer";
    sessionStorage.setItem('map_access_code', code);
    
    // Show UI and Map
    if (typeof showApp === 'function') showApp();
    if (window.initMap) window.initMap();
    
    // Fix Leaflet sizing and draw pins from the data we already fetched
    setTimeout(() => {
      if (window.map) {
        window.map.invalidateSize(true);
        window.map.setView([27.9506, -82.4572], 12);
      }
      
      if (window.markers) {
        window.markers.clearLayers();
        if (data.pins && data.pins.length > 0) {
          data.pins.forEach(p => window.renderPin(p));
          if (window.updateRecentList) window.updateRecentList(data.pins);
        }
      }
    }, 100);

    setStatus(`Ready (Logged in as: ${userRole})`);
  } catch (err) {
    // 4. Hide exact internal errors from users in production
    if (errorEl) errorEl.textContent = "Unable to connect to map server.";
    setStatus('Connection failed');
  }
}
window.checkAccess = checkAccess;

async function submitReport() {
  if (typeof window.triggerHaptic === 'function') window.triggerHaptic(); 
  
  if (!confirm("Are you sure you want to submit this report to the community map?")) {
    return; 
  }
  if (!window.clickLatLng) return;

  const count = window.sanitize ? window.sanitize(document.getElementById("count")?.value) : "";
  const locationDetail = window.sanitize ? window.sanitize(document.getElementById("location")?.value) : "";
  const equipment = window.sanitize ? window.sanitize(document.getElementById("equipment")?.value) : "";
  const actions = window.sanitize ? window.sanitize(document.getElementById("actions")?.value) : "";
  const resources = window.sanitize ? window.sanitize(document.getElementById("resources")?.value) : "";
  const priority = document.getElementById("priority")?.value || "Low"; 

  // 5. Server-side rejection of completely empty reports
  if (!count && !locationDetail && !equipment && !actions && !resources) {
    setStatus("Cannot submit completely empty report.");
    return;
  }

  const reportData = {
    count: count,
    location: locationDetail,
    equipment: equipment,
    resources: resources,
    actions: actions,
    priority: priority
  };

  let safeLat = window.clickLatLng.lat;
  let safeLng = window.clickLatLng.lng;
  
  if (typeof window.obfuscateLocation === 'function') {
    const safeCoords = window.obfuscateLocation(safeLat, safeLng);
    safeLat = safeCoords.lat;
    safeLng = safeCoords.lng;
  }

  try {
    setStatus('Saving pin...');
    const code = sessionStorage.getItem('map_access_code');
    
    // 6. JSON IN JSON DESIGN SMELL FIXED! We now send a clean nested object called "report"
    const res = await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ 
        lat: safeLat, 
        lng: safeLng, 
        report: reportData, // <-- Replaces the messy JSON.stringify description!
        status: 'Reported' 
      })
    });
    
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error("Server rejected pin.");
    
    // Refresh the map data manually by re-triggering checkAccess
    checkAccess();
    setStatus('Pin saved securely');
  } catch (err) {
    setStatus("Failed to save report.");
  } finally {
    if (typeof closeReportModal === 'function') closeReportModal();
    window.dropMode = false;
    const mapEl = document.getElementById('map');
    if (mapEl) mapEl.classList.remove('crosshair-mode'); 
  }
}
window.submitReport = submitReport;

async function updatePin(id, newStatus) {
  try {
    setStatus(`Updating to ${newStatus}...`);
    const code = sessionStorage.getItem('map_access_code');
    
    const res = await fetch('/api/pins', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-access-code': code },
      body: JSON.stringify({ id, newStatus })
    });

    if (!res.ok) throw new Error();
    checkAccess(); // Refreshes the map
  } catch (e) {
    setStatus("Failed to update status.");
  }
}
window.updatePin = updatePin;

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("submitReportBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", window.submitReport);
  }
  if (sessionStorage.getItem('map_access_code')) {
    checkAccess();
  }
});

