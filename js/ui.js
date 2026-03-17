// --- js/ui.js ---
const statusEl = document.getElementById('status');
const clearBox = document.getElementById('clearReport');
const clearText = document.getElementById('clearText');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');

function setStatus(msg) { statusEl.textContent = msg; }

function showApp() {
  loginScreen.classList.add('hidden-screen');
  loginScreen.setAttribute('inert', '');
  loginScreen.setAttribute('aria-hidden', 'true');
  
  mainApp.classList.remove('hidden-screen');
  mainApp.removeAttribute('inert');
  mainApp.setAttribute('aria-hidden', 'false');
}

// Modal Functions
function openReportModal() {
  document.getElementById("reportModal").style.display = "flex";
}

function closeReportModal() {
  document.getElementById("reportModal").style.display = "none";
  
  // Clear the inputs
  document.getElementById("count").value = "";
  document.getElementById("location").value = "";
  document.getElementById("equipment").value = "";
  document.getElementById("actions").value = "";
  document.getElementById("resources").value = "";
  
  // Turn off drop mode and crosshairs if they cancel!
  window.dropMode = false;
  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.classList.remove('crosshair-mode');
  
  // Reset the status bar
  if (typeof userRole !== 'undefined') {
    setStatus(`Ready (Logged in as: ${userRole})`);
  }
}

function openCopyModal(text) {
  document.getElementById("reportText").value = text;
  document.getElementById("copyModal").style.display = "flex";
}

function closeCopyModal() {
  document.getElementById("copyModal").style.display = "none";
}

async function copyReport() {
  const textarea = document.getElementById("reportText");
  textarea.select();
  await navigator.clipboard.writeText(textarea.value);
  setStatus("Copied to clipboard!");
}

function formatReport(r) {
  return `C - Count: ${r.count || 'N/A'}
L - Location: ${r.location || 'N/A'}
E - Equipment: ${r.equipment || 'N/A'}
A - Actions: ${r.actions || 'N/A'}
R - Resources: ${r.resources || 'N/A'}
[Report Time: ${new Date(r.createdAt || Date.now()).toLocaleTimeString()}]`;
}

// Function to generate and copy a master CLEAR report of ALL visible pins
// Function to generate and copy a master CLEAR report of ACTIVE pins only
window.copyCLEAR = async function copyCLEAR() {
  setStatus('Generating CLEAR report...');
  
  const code = localStorage.getItem('map_access_code');
  if (!code) {
    setStatus('Error: Not logged in');
    return;
  }

  try {
    const res = await fetch('/api/pins', { headers: { 'x-access-code': code } });
    const data = await res.json(); // <-- MUST be parsed before we filter it!
    
    // FILTER: Only keep pins that are "Reported" or "Under Verification"
    const reportedPins = data.pins ? data.pins.filter(p => p.status === 'Reported' || p.status === 'Under Verification') : [];
    
    if (reportedPins.length === 0) {
      alert("No active pins to report.");
      setStatus('Ready');
      return;
    }

    let fullReport = "=== CLEAR REPORT ===\n\n";
    
    // Loop through the FILTERED pins, not the raw data!
    reportedPins.forEach((pin, index) => {
      let reportData = { actions: pin.description }; 
      try { reportData = JSON.parse(pin.description); } catch(e) {}
      
      fullReport += `[Incident ${index + 1} - Status: ${pin.status}]\n`;
      fullReport += formatReport({ ...reportData, createdAt: pin.createdAt });
      fullReport += `\n----------------------\n`;
    });

    openCopyModal(fullReport);
    setStatus('Ready');

  } catch (err) {
    setStatus(`Failed to generate report: ${err.message}`);
  }
};

// Authentication UI
document.getElementById('accessCodeInput')?.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') window.checkAccess();
});

function logout() {
  localStorage.removeItem('map_access_code');
  location.reload();
}

window.onload = () => {
  if (localStorage.getItem('map_access_code')) window.checkAccess();
};

// Function to search for an intersection or neighborhood and fly the map there
window.searchLocation = async function searchLocation() {
  const query = document.getElementById('searchInput').value;
  if (!query) return;

  setStatus('Searching...');
  
  try {
    const searchQuery = encodeURIComponent(query + ", Tampa, FL");
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&limit=1`);
    const data = await res.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      
      if (window.map) {
        window.map.flyTo([lat, lon], 16, { animate: true, duration: 1.5 });
      }
      
      const cleanName = data[0].display_name.split(',')[0];
      setStatus(`Found: ${cleanName}`);
      
    } else {
      setStatus('Location not found. Try a broader term.');
    }
  } catch (err) {
    setStatus('Search error. Try zooming manually.');
  }
}

document.getElementById('searchInput')?.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault(); 
    window.searchLocation();
  }
});
