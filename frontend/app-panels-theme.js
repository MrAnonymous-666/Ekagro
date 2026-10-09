// Opening/closing the side menus, plus theme and font switching.
// Part of the app - loaded alongside the other files in index.html.

// ===================================================================
// SIDE PANELS
// ===================================================================

function openLeftPanel(){
  document.getElementById("leftPanel").classList.add("open");
  document.getElementById("overlay").classList.add("open");
  resetMenuToHome();
  renderScheduleDaily();
  renderScheduleWeekly();
  renderPieChart();
  renderLineChart();
  loadProjects();
}
function openRightPanel(){
  document.getElementById("rightPanel").classList.add("open");
  document.getElementById("overlay").classList.add("open");
}
function closeAllPanels(){
  document.getElementById("leftPanel").classList.remove("open");
  document.getElementById("rightPanel").classList.remove("open");
  document.getElementById("overlay").classList.remove("open");
}

function toggleAccordion(name){
  const body = document.getElementById(name + "Body");
  const toggle = document.getElementById(name + "Toggle");
  body.classList.toggle("open");
  toggle.classList.toggle("open");
}

const MENU_NAV_HINTS = {
  home: "You're already on the home screen. Close this menu to keep working.",
  customize: "Turn optional widgets on or off for your home screen.",
  schedule: "See your tasks laid out by day and by week.",
  progress: "Review your completion stats and download reports.",
  notes: "Plain text notes - no due dates, just type."
};
const MENU_NAV_PANELS = {
  customize: "panelCustomize",
  schedule: "panelSchedule",
  progress: "panelProgress",
  notes: "panelNotes"
};
function resetMenuToHome(){
  document.querySelectorAll(".menu-nav-item").forEach(btn => btn.classList.remove("active"));
  document.getElementById("navHome").classList.add("active");
  document.getElementById("menuNavHint").textContent = MENU_NAV_HINTS.home;
  document.getElementById("menuNavHint").classList.remove("hidden");
  document.querySelectorAll(".menu-tab-panel").forEach(panel => panel.classList.remove("active"));
}
function menuNavGoTo(section){
  if(section === "home"){
    closeAllPanels();
    document.title = "Ekagro \u2014 Focused Task Management";
    return;
  }
  document.querySelectorAll(".menu-nav-item").forEach(btn => btn.classList.remove("active"));
  document.getElementById("nav" + section.charAt(0).toUpperCase() + section.slice(1)).classList.add("active");
  document.getElementById("menuNavHint").classList.add("hidden");
  document.querySelectorAll(".menu-tab-panel").forEach(panel => panel.classList.remove("active"));
  document.getElementById(MENU_NAV_PANELS[section]).classList.add("active");
  document.getElementById("leftPanel").scrollTo({ top: 0, behavior: "smooth" });
  const titles = { customize: "Customize", schedule: "Schedule", progress: "Progress Report", notes: "Notes" };
  document.title = "Ekagro \u2014 " + (titles[section] || "");
  if(section === "notes"){ backToNotesList(); loadNotes(); }
}


// ===================================================================
// THEME + FONT
// ===================================================================

async function setTheme(mode){
  document.documentElement.setAttribute("data-theme", mode);
  await deviceStorage.set(THEME_KEY, mode);
  ["themeCool","themeWarm","themeDark"].forEach(function(id){ document.getElementById(id).classList.remove("active"); });
  const btnId = mode === "cool" ? "themeCool" : mode === "warm" ? "themeWarm" : "themeDark";
  document.getElementById(btnId).classList.add("active");
}

function setFont(fontValue, skipSave){
  document.documentElement.style.setProperty("--font-family", fontValue);
  if(!skipSave) localStorage.setItem(FONT_KEY, fontValue);
  const select = document.getElementById("fontSelect");
  if(select) select.value = fontValue;
}

