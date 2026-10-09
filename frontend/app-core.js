// State, shared helpers, and login/register/2FA/password-reset screens.
// Part of the app - loaded alongside the other files in index.html.

// ===================================================================
// STATE
// ===================================================================
let tasks = [];
let habits = [];
let bills = [];
let projects = [];
let notes = [];
let currentNoteId = null;
let noteSaveTimer = null;
let selectedPeriod = "week";
let isRegisterMode = false;
let emailPendingReset = "";
let pending2FAUserId = null;
let changePasswordFromAccount = false;
let calendarViewDate = new Date();
let dashboardClockInterval = null;
const THEME_KEY = "themeMode";
const FONT_KEY = "fontFamily";
const FEATURE_KEY = "featureToggles";

// Turns anything the user typed (task names, tags, habit names, project
// names...) into safe plain text before it's placed on the page, so a
// task named e.g. "<script>...</script>" just shows up as those literal
// characters instead of running as code. Wrap any user-typed text in
// this before putting it into an innerHTML string.
function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

const KANBAN_COLUMNS = [
  { key: "icebox",     label: "Ice Box",     color: "#607d8b", gradient: "linear-gradient(135deg,#78909c,#455a64)",
    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M2 12h20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
  { key: "emergency",  label: "Emergency",   color: "#e53935", gradient: "linear-gradient(135deg,#ff7043,#d32f2f)",
    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3L12 3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9.5v4.2M12 16.8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' },
  { key: "inprogress", label: "In Progress", color: "#fbc02d", gradient: "linear-gradient(135deg,#ffca28,#f9a825)",
    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
  { key: "complete",   label: "Complete",    color: "#43a047", gradient: "linear-gradient(135deg,#66bb6a,#2e7d32)",
    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5 5L20 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }
];

// ===================================================================
// AUTH
// ===================================================================

function getToken(){ return localStorage.getItem("token"); }
function authHeaders(){
  return { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() };
}

function toggleAuthMode(){
  isRegisterMode = !isRegisterMode;
  document.getElementById("authTitle").innerText = isRegisterMode ? "Register" : "Login";
  document.getElementById("authSubmitBtn").innerText = isRegisterMode ? "Register" : "Login";
  document.getElementById("authToggleBtn").innerText = isRegisterMode ? "Already have an account? Login" : "Need an account? Register";
  document.getElementById("nameField").classList.toggle("hidden", !isRegisterMode);
  document.getElementById("authError").innerText = "";
}

async function handleAuthSubmit(){
  const email = document.getElementById("emailField").value.trim();
  const password = document.getElementById("passwordField").value;
  const name = document.getElementById("nameField").value.trim();
  const errorEl = document.getElementById("authError");
  errorEl.innerText = "";

  if(!email || !password || (isRegisterMode && !name)){
    errorEl.innerText = "Please fill all fields";
    return;
  }

  const endpoint = isRegisterMode ? "register" : "login";
  const website = document.getElementById("authWebsiteField").value;
  const body = isRegisterMode ? { name: name, email: email, password: password, website: website } : { email: email, password: password, website: website };

  const submitBtn = document.getElementById("authSubmitBtn");
  const originalLabel = submitBtn.innerText;
  submitBtn.disabled = true;
  submitBtn.innerText = isRegisterMode ? "Creating account..." : "Logging in...";

  try{
    const res = await fetch(API_URL + "/auth/" + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if(!res.ok){
      errorEl.innerText = data.message || "Something went wrong";
      return;
    }

    if(data.requires2FA){
      pending2FAUserId = data.userId;
      document.getElementById("authScreen").classList.add("hidden");
      document.getElementById("twoFaScreen").classList.remove("hidden");
      document.getElementById("twoFaError").innerText = "";
      document.getElementById("twoFaEmailHint").innerText = "Code sent to " + data.email;
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("twoFactorEnabled", data.twoFactorEnabled ? "true" : "false");

    if(data.restored){
      alert(data.message || "Welcome back! Your account has been restored.");
    }

    showApp();
  }catch(err){
    errorEl.innerText = "Cannot reach server. Is the backend running?";
  }finally{
    submitBtn.disabled = false;
    submitBtn.innerText = originalLabel;
  }
}

async function verifyLogin2FA(){
  const otp = document.getElementById("twoFaOtpField").value.trim();
  const errorEl = document.getElementById("twoFaError");
  errorEl.innerText = "";
  if(!otp){ errorEl.innerText = "Enter the code from your email"; return; }

  try{
    const res = await fetch(API_URL + "/auth/login/verify-2fa", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: pending2FAUserId, otp: otp })
    });
    const data = await res.json();
    if(!res.ok){ errorEl.innerText = data.message || "Invalid code"; return; }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("twoFactorEnabled", "true");
    document.getElementById("twoFaOtpField").value = "";
    document.getElementById("twoFaScreen").classList.add("hidden");
    pending2FAUserId = null;
    showApp();
  }catch(err){ errorEl.innerText = "Cannot reach server. Is the backend running?"; }
}

function cancelLogin2FA(){
  pending2FAUserId = null;
  document.getElementById("twoFaOtpField").value = "";
  document.getElementById("twoFaScreen").classList.add("hidden");
  document.getElementById("authScreen").classList.remove("hidden");
}

function showForgotPasswordScreen(){
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("forgotScreen").classList.remove("hidden");
  document.getElementById("forgotError").innerText = "";
}

function initiateChangePasswordFromAccount(){
  changePasswordFromAccount = true;
  closeAllPanels();
  document.getElementById("appContainer").classList.add("hidden");
  document.getElementById("forgotScreen").classList.remove("hidden");
  document.getElementById("forgotError").innerText = "";
  document.getElementById("forgotEmailField").value = localStorage.getItem("userEmail") || "";
}

function backToLogin(){
  document.getElementById("forgotScreen").classList.add("hidden");
  document.getElementById("resetScreen").classList.add("hidden");
  if(changePasswordFromAccount){
    changePasswordFromAccount = false;
    document.getElementById("appContainer").classList.remove("hidden");
  }else{
    document.getElementById("authScreen").classList.remove("hidden");
  }
}

async function requestOTP(){
  const email = document.getElementById("forgotEmailField").value.trim();
  const errorEl = document.getElementById("forgotError");
  errorEl.innerText = "";
  if(!email){ errorEl.innerText = "Please enter your email"; return; }

  try{
    const res = await fetch(API_URL + "/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, website: document.getElementById("forgotWebsiteField").value })
    });
    const data = await res.json();
    if(!res.ok){ errorEl.innerText = data.message || "Something went wrong"; return; }
    emailPendingReset = email;
    document.getElementById("forgotScreen").classList.add("hidden");
    document.getElementById("resetScreen").classList.remove("hidden");
  }catch(err){ errorEl.innerText = "Cannot reach server. Is the backend running?"; }
}

async function submitNewPassword(){
  const otp = document.getElementById("otpField").value.trim();
  const newPassword = document.getElementById("newPasswordField").value;
  const errorEl = document.getElementById("resetError");
  errorEl.innerText = "";
  if(!otp || !newPassword){ errorEl.innerText = "Please enter the OTP and a new password"; return; }

  try{
    const res = await fetch(API_URL + "/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailPendingReset, otp: otp, newPassword: newPassword })
    });
    const data = await res.json();
    if(!res.ok){ errorEl.innerText = data.message || "Something went wrong"; return; }
    alert(changePasswordFromAccount ? "Password updated successfully." : "Password reset successful! Please log in with your new password.");
    document.getElementById("otpField").value = "";
    document.getElementById("newPasswordField").value = "";
    backToLogin();
  }catch(err){ errorEl.innerText = "Cannot reach server. Is the backend running?"; }
}

function logout(){
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("twoFactorEnabled");
  closeAllPanels();
  document.getElementById("appContainer").classList.add("hidden");
  document.getElementById("authScreen").classList.remove("hidden");
}

async function handleDeleteAccount(){
  const firstConfirm = confirm("This will schedule your account for deletion (7-day recovery window). Continue?");
  if(!firstConfirm) return;

  try{
    const otpReqRes = await fetch(API_URL + "/auth/request-delete-otp", { method: "POST", headers: authHeaders() });
    const otpReqData = await otpReqRes.json();
    if(!otpReqRes.ok){ alert(otpReqData.message || "Could not send OTP."); return; }
  }catch(err){ alert("Cannot reach server. Is the backend running?"); return; }

  const otp = prompt("We've emailed a 6-digit OTP to confirm account deletion. Enter it below:");
  if(!otp){ alert("Account deletion cancelled."); return; }

  try{
    const res = await fetch(API_URL + "/auth/account", {
      method: "DELETE", headers: authHeaders(), body: JSON.stringify({ otp: otp })
    });
    const data = await res.json();
    if(!res.ok){ alert(data.message || "Something went wrong."); return; }
    alert(data.message);
    logout();
  }catch(err){ alert("Cannot reach server. Is the backend running?"); }
}

async function showApp(){
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("forgotScreen").classList.add("hidden");
  document.getElementById("resetScreen").classList.add("hidden");
  document.getElementById("twoFaScreen").classList.add("hidden");
  document.getElementById("appContainer").classList.remove("hidden");

  renderProfileInfo();
  applyFeatureVisibility();

  const themePref = await deviceStorage.get(THEME_KEY);
  await setTheme(themePref || "cool");

  const fontPref = localStorage.getItem(FONT_KEY);
  setFont(fontPref || "'Inter', Arial, sans-serif", true);

  await loadTasks();
  await loadHabits();
  await loadProjects();

  const toggles = loadFeatureToggles();
  if(toggles.bills) await loadBills();
  if(toggles.calendar) renderCalendar();

  applyDefaultViewOnLoad();
  applyDesktopViewPreference();
  renderColorSwatches();
  applyAccentColors();
  initDueDateNotifications();

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js").catch(function(){});
  }
}

function renderProfileInfo(){
  document.getElementById("profileName").innerText = localStorage.getItem("userName") || "-";
  document.getElementById("profileEmail").innerText = localStorage.getItem("userEmail") || "-";
  const twoFaCheckbox = document.getElementById("toggleTwoFactor");
  if(twoFaCheckbox) twoFaCheckbox.checked = localStorage.getItem("twoFactorEnabled") === "true";
}

function startEditProfileName(){
  document.getElementById("profileNameInput").value = localStorage.getItem("userName") || "";
  document.getElementById("profileNameEditRow").classList.remove("hidden");
  document.getElementById("profileName").parentElement.classList.add("hidden");
  document.getElementById("profileNameInput").focus();
}
function cancelEditProfileName(){
  document.getElementById("profileNameEditRow").classList.add("hidden");
  document.getElementById("profileName").parentElement.classList.remove("hidden");
}
async function saveProfileName(){
  const newName = document.getElementById("profileNameInput").value.trim();
  if(!newName){ alert("Name can't be empty."); return; }
  try{
    const res = await fetch(API_URL + "/auth/profile", {
      method: "PUT", headers: authHeaders(), body: JSON.stringify({ name: newName })
    });
    const data = await res.json();
    if(!res.ok){ alert(data.message || "Could not update name."); return; }
    localStorage.setItem("userName", data.name);
    renderProfileInfo();
    document.getElementById("profileNameEditRow").classList.add("hidden");
    document.getElementById("profileName").parentElement.classList.remove("hidden");
  }catch(err){ alert("Cannot reach server. Is the backend running?"); }
}

function switchAccount(){
  const proceed = confirm("This will log you out so a different account can sign in. Continue?");
  if(!proceed) return;
  logout();
}

async function onTwoFactorToggleChange(isOn){
  const checkbox = document.getElementById("toggleTwoFactor");
  try{
    const res = await fetch(API_URL + "/auth/2fa", {
      method: "PUT", headers: authHeaders(), body: JSON.stringify({ enabled: isOn })
    });
    const data = await res.json();
    if(!res.ok){ alert(data.message || "Could not update 2FA."); checkbox.checked = !isOn; return; }
    localStorage.setItem("twoFactorEnabled", data.twoFactorEnabled ? "true" : "false");
    alert(data.twoFactorEnabled
      ? "Two-factor authentication is on. You'll get an email code each time you log in."
      : "Two-factor authentication is off.");
  }catch(err){
    alert("Cannot reach server. Is the backend running?");
    checkbox.checked = !isOn;
  }
}

