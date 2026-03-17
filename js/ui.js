function openReportModal(){

document.getElementById("reportModal").style.display="flex"

}

function closeReportModal(){

document.getElementById("reportModal").style.display="none"

}

function openCopyModal(text){

document.getElementById("reportText").value=text

document.getElementById("copyModal").style.display="flex"

}

function closeCopyModal(){

document.getElementById("copyModal").style.display="none"

}

async function copyReport(){
  const textarea = document.getElementById("reportText");
  textarea.select();
  await navigator.clipboard.writeText(textarea.value);
}

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
  return `Count: ${r.count || 'N/A'}\nLocation: ${r.location || 'N/A'}\nEquipment: ${r.equipment || 'N/A'}\nActions: ${r.actions || 'N/A'}\nReport Time: ${new Date(r.createdAt || Date.now()).toLocaleTimeString()}`;
}

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
