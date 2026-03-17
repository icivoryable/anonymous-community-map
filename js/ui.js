// --- js/ui.js ---
const statusEl = document.getElementById('status');
const clearBox = document.getElementById('clearReport');
const clearText = document.getElementById('clearText');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');

// --- XSS SANITIZER ---
window.sanitize = function(input) {
  if (!input) return "";
  return input.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

function setStatus(msg) { 
  if (statusEl) statusEl.textContent = msg; 
}

function showApp() {
  if (loginScreen) {
    loginScreen.classList.add('hidden-screen');
    loginScreen.setAttribute('inert', '');
    loginScreen.setAttribute('aria-hidden', 'true');
  }
  
  if (mainApp) {
    mainApp.classList.remove('hidden-screen');
    mainApp.removeAttribute('inert');
    mainApp.setAttribute('aria-hidden', 'false');
  }
}

// Toggle the menu visibility
window.toggleDropdown = function(event) {
  if (event) event.stopPropagation(); 
  
  const dropdown = document.getElementById("actionDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden-dropdown");
  }
};

// Close the dropdown automatically if the user clicks anywhere outside of it
document.addEventListener("click", function(event) {
  const dropdown = document.getElementById("actionDropdown");
  const menuContainer = document.getElementById("menuContainer");
  
  if (dropdown && !dropdown.classList.contains("hidden-dropdown")) {
    if (menuContainer && !menuContainer.contains(event.target)) {
      dropdown.classList.add("hidden-dropdown");
    }
  }
});

// --- FORM VALIDATION ---
function validateForm() {
  const fields = ["count", "location", "equipment", "actions", "resources"];
  
  const hasData = fields.some(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== "";
  });
  
  const submitBtn = document.getElementById("submitReportBtn");
  const errorMsg = document.getElementById("reportError");
  
  if (submitBtn) {
    submitBtn.disabled = !hasData; 
  }
  if (errorMsg) {
    errorMsg.style.display = hasData ? "none" : "block"; 
  }
}

// --- MODAL FUNCTIONS ---
function openReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.style.display = "flex";
  
  validateForm();
  
  const fields = ["count", "location", "equipment", "actions", "resources"];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.removeEventListener('input', validateForm); 
      el.addEventListener('input', validateForm);
    }
  });
}

function closeReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.style.display = "none";
  
  const fields = ["count", "location", "equipment", "actions", "resources"];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  
  const priorityEl = document.getElementById("priority");
  if (priorityEl) priorityEl.value = "Low";
  
  window.dropMode = false;
  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.classList.remove('crosshair-mode');
  
  if (typeof userRole !== 'undefined') {
    setStatus(`Ready (Logged in as: ${userRole})`);
  }
}

function openCopyModal(text) {
  const reportText = document.getElementById("reportText");
  if (reportText) reportText.value = text;
  
  const copyModal = document.getElementById("copyModal");
  if (copyModal) copyModal.style.display = "flex";
}

function closeCopyModal() {
  const copyModal = document.getElementById("copyModal");
  if (copyModal) copyModal.style.display = "none";
}

async function copyReport() {
  const textarea = document.getElementById("reportText");
  if (!textarea) return;
  
  textarea.select();
  try {
    await navigator.clipboard.writeText(textarea.value);
    setStatus("Copied to clipboard!");
  } catch (err) {
    setStatus("Failed to copy. Please copy manually.");
  }
}

function formatReport(r) {
  // Uses XSS Sanitizer from top of file
  const c = window.sanitize(r.count || 'N/A');
  const l = window.sanitize(r.location || 'N/A');
  const e = window.sanitize(r.equipment || 'N/A');
  const a = window.sanitize(r.actions || 'N/A');
  const res = window.sanitize(r.resources || 'N/A');
  
  return `C - Count: ${c}
L - Location: ${l}
E - Equipment: ${e}
A - Actions: ${a}
R - Resources: ${res}
[Report Time: ${new Date(r.createdAt || Date.now()).toLocaleTimeString()}]`;
}

// Generate master CLEAR report of ACTIVE pins only
window.copyCLEAR = async function copyCLEAR() {
  setStatus('Generating CLEAR report...');
  
  const code = sessionStorage.getItem('map_access_code');
  if (!code) {
    setStatus('Error: Not logged in');
    return;
  }

  try {
    const res = await fetch('/api/pins', { headers: { 'x-access-code': code } });
    const data = await res.json(); 
    
    let reportedPins = data.pins ? data.pins.filter(p => p.status === 'Reported' || p.status === 'Under Verification') : [];
    
    if (reportedPins.length === 0) {
      alert("No active pins to report.");
      setStatus('Ready');
      return;
    }

    const getScore = (pin) => {
      const reportData = pin.report || {}; 
      const p = reportData.priority || 'Low';
      if (p === 'High') return 3;
      if (p === 'Medium') return 2;
      return 1; 
    };

    reportedPins.sort((a, b) => getScore(b) - getScore(a));

    let fullReport = "=== CLEAR REPORT ===\n\n";
    
    reportedPins.forEach((pin, index) => {
      const reportData = pin.report || {}; 
      const priorityLabel = reportData.priority || 'Low';
      
      fullReport += `[Incident ${index + 1} - PRIORITY: ${priorityLabel.toUpperCase()} - Status: ${pin.status}]\n`;
      fullReport += formatReport({ ...reportData, createdAt: pin.createdAt });
      fullReport += `\n----------------------\n`;
    });

    openCopyModal(fullReport);
    setStatus('Ready');

  } catch (err) {
    setStatus(`Failed to generate report`);
  }
};

// Authentication UI
const accessInput = document.getElementById('accessCodeInput');
if (accessInput) {
  accessInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      if (typeof window.checkAccess === 'function') window.checkAccess();
    }
  });
}

function logout() {
  sessionStorage.removeItem('map_access_code');
  location.reload();
}

window.onload = () => {
  if (sessionStorage.getItem('map_access_code')) {
    if (typeof window.checkAccess === 'function') window.checkAccess();
  }
};

// Search for an intersection or neighborhood
window.searchLocation = async function searchLocation() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const query = searchInput.value;
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
    setStatus('Search error.');
  }
}

const searchInputEl = document.getElementById('searchInput');
if (searchInputEl) {
  searchInputEl.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      window.searchLocation();
    }
  });
}

// --- MOBILE HAPTICS & GEOLOCATION ---
window.triggerHaptic = function() {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

window.centerOnMe = function() {
  if (!navigator.geolocation) {
    setStatus("Geolocation not supported by your browser.");
    return;
  }
  
  setStatus("Locating you...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      if (window.map) {
        window.map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
        setStatus("Location found.");
      }
    },
    (error) => {
      setStatus("Could not access location. Please check permissions.");
    }
  );
};
