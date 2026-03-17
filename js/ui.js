// --- js/ui.js ---
const statusEl = document.getElementById('status');
const clearBox = document.getElementById('clearReport');
const clearText = document.getElementById('clearText');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');

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
  
  // Check if at least one text box has text in it
  const hasData = fields.some(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== "";
  });
  
  const submitBtn = document.getElementById("submitReportBtn");
  const errorMsg = document.getElementById("reportError");
  
  if (submitBtn) {
    submitBtn.disabled = !hasData; // Disables button if false
  }
  if (errorMsg) {
    errorMsg.style.display = hasData ? "none" : "block"; // Shows error if empty
  }
}


// --- MODAL FUNCTIONS ---
function openReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.style.display = "flex";
  
  // Run validation immediately so the button starts disabled
  validateForm();
  
  // Listen for typing in any of the fields
  const fields = ["count", "location", "equipment", "actions", "resources"];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.removeEventListener('input', validateForm); // Prevent duplicates
      el.addEventListener('input', validateForm);
    }
  });
}

function closeReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.style.display = "none";
  
  // Clear the inputs
  const fields = ["count", "location", "equipment", "actions", "resources"];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  
  // Reset priority dropdown to Low
  const priorityEl = document.getElementById("priority");
  if (priorityEl) priorityEl.value = "Low";
  
  // Turn off drop mode and crosshairs if they cancel
  window.dropMode = false;
  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.classList.remove('crosshair-mode');
  
  // Reset the status bar
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
  return `C - Count: ${r.count || 'N/A'}
L - Location: ${r.location || 'N/A'}
E - Equipment: ${r.equipment || 'N/A'}
A - Actions: ${r.actions || 'N/A'}
R - Resources: ${r.resources || 'N/A'}
[Report Time: ${new Date(r.createdAt || Date.now()).toLocaleTimeString()}]`;
}

// Function to generate and copy a master CLEAR report of ACTIVE pins only, sorted by priority
window.copyCLEAR = async function copyCLEAR() {
  setStatus('Generating CLEAR report...');
  
  const code = localStorage.getItem('map_access_code');
  if (!code) {
    setStatus('Error: Not logged in');
    return;
  }

  try {
    const res = await fetch('/api/pins', { headers: { 'x-access-code': code } });
    const data = await res.json(); 
    
    // FILTER: Only keep pins that are "Reported" or "Under Verification"
    let reportedPins = data.pins ? data.pins.filter(p => p.status === 'Reported' || p.status === 'Under Verification') : [];
    
    if (reportedPins.length === 0) {
      alert("No active pins to report.");
      setStatus('Ready');
      return;
    }

    // Helper function to assign a numerical score to the priority
    const getScore = (pin) => {
      let reportData = {};
      try { reportData = JSON.parse(pin.description); } catch(e) {}
      const p = reportData.priority || 'Low';
      if (p === 'High') return 3;
      if (p === 'Medium') return 2;
      return 1; // Low
    };

    // Sort the array: highest score (3) goes to the top
    reportedPins.sort((a, b) => getScore(b) - getScore(a));

    let fullReport = "=== CLEAR REPORT ===\n\n";
    
    // Loop through the FILTERED and SORTED pins!
    reportedPins.forEach((pin, index) => {
      let reportData = { actions: pin.description }; 
      try { reportData = JSON.parse(pin.description); } catch(e) {}
      
      const priorityLabel = reportData.priority || 'Low';
      
      fullReport += `[Incident ${index + 1} - PRIORITY: ${priorityLabel.toUpperCase()} - Status: ${pin.status}]\n`;
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
const accessInput = document.getElementById('accessCodeInput');
if (accessInput) {
  accessInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      if (typeof window.checkAccess === 'function') window.checkAccess();
    }
  });
}

function logout() {
  localStorage.removeItem('map_access_code');
  location.reload();
}

window.onload = () => {
  if (localStorage.getItem('map_access_code')) {
    if (typeof window.checkAccess === 'function') window.checkAccess();
  }
};

// Function to search for an intersection or neighborhood and fly the map there
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
    setStatus('Search error. Try zooming manually.');
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
