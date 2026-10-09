// Customize toggles, default view, notifications, desktop view, and custom accent colors.
// Part of the app - loaded alongside the other files in index.html.

// ===================================================================
// CUSTOMIZE TOGGLES (4 remaining optional widgets)
// ===================================================================

function loadFeatureToggles(){
  try{ return JSON.parse(localStorage.getItem(FEATURE_KEY)) || {}; }catch(e){ return {}; }
}
function saveFeatureToggles(toggles){ localStorage.setItem(FEATURE_KEY, JSON.stringify(toggles)); }

function onFeatureToggleChange(name, isOn){
  const toggles = loadFeatureToggles();
  toggles[name] = isOn;
  saveFeatureToggles(toggles);
  applyFeatureVisibility();
  if(isOn && name === "bills") loadBills();
  if(isOn && name === "calendar") renderCalendar();
  renderAll();
}

// ===================================================================
// DEFAULT VIEW
// ===================================================================

const DEFAULT_VIEW_KEY = "defaultView";

function setDefaultView(value){
  localStorage.setItem(DEFAULT_VIEW_KEY, value);
}

function applyDefaultViewOnLoad(){
  const saved = localStorage.getItem(DEFAULT_VIEW_KEY) || "top";
  const select = document.getElementById("defaultViewSelect");
  if(select) select.value = saved;
  if(saved === "top") return;
  const target = document.getElementById(saved);
  if(target) setTimeout(function(){ target.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
}

// ===================================================================
// DUE DATE NOTIFICATIONS
// ===================================================================

const NOTIFY_KEY = "dueNotificationsEnabled";
let notifiedTaskIds = new Set();
let notificationTimer = null;

function onNotificationToggleChange(isOn){
  if(isOn){
    if(!("Notification" in window)){
      alert("This browser doesn't support notifications.");
      document.getElementById("toggleNotifications").checked = false;
      return;
    }
    Notification.requestPermission().then(function(permission){
      if(permission === "granted"){
        localStorage.setItem(NOTIFY_KEY, "true");
        startDueDateNotificationTimer();
      }else{
        alert("Notifications were blocked. Enable them in your browser settings to use this.");
        document.getElementById("toggleNotifications").checked = false;
      }
    });
  }else{
    localStorage.setItem(NOTIFY_KEY, "false");
    stopDueDateNotificationTimer();
  }
}

function initDueDateNotifications(){
  const enabled = localStorage.getItem(NOTIFY_KEY) === "true";
  const checkbox = document.getElementById("toggleNotifications");
  if(checkbox) checkbox.checked = enabled && "Notification" in window && Notification.permission === "granted";
  if(checkbox.checked) startDueDateNotificationTimer();
}

function startDueDateNotificationTimer(){
  stopDueDateNotificationTimer();
  checkDueTasksForNotification();
  notificationTimer = setInterval(checkDueTasksForNotification, 60000);
}
function stopDueDateNotificationTimer(){
  if(notificationTimer){ clearInterval(notificationTimer); notificationTimer = null; }
}

function checkDueTasksForNotification(){
  if(!("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  tasks.forEach(function(task){
    if(task.completed || !task.dueDate || notifiedTaskIds.has(task._id)) return;
    const due = new Date(task.dueDate + "T" + (task.dueTime || "23:59"));
    const diffMinutes = (due - now) / 60000;
    if(diffMinutes <= 15 && diffMinutes >= -5){
      new Notification("Task due soon: " + task.text, {
        body: "Due " + formatDueDisplay(task),
        tag: task._id
      });
      notifiedTaskIds.add(task._id);
    }
  });
}

// ===================================================================
// DESKTOP VIEW (for phone browsers)
// ===================================================================

const DESKTOP_VIEW_KEY = "desktopViewEnabled";

function onDesktopViewToggleChange(isOn){
  localStorage.setItem(DESKTOP_VIEW_KEY, isOn ? "true" : "false");
  applyDesktopViewPreference();
}

function applyDesktopViewPreference(){
  const enabled = localStorage.getItem(DESKTOP_VIEW_KEY) === "true";
  document.body.classList.toggle("force-desktop", enabled);
  const checkbox = document.getElementById("toggleDesktopView");
  if(checkbox) checkbox.checked = enabled;
  const viewport = document.querySelector('meta[name="viewport"]');
  if(viewport){
    viewport.setAttribute("content", enabled ? "width=1200" : "width=device-width, initial-scale=1.0");
  }
}

// ===================================================================
// CUSTOM ACCENT COLORS (primary = majority, secondary = minority)
// ===================================================================

const ACCENT_COLOR_PALETTE = [
  { name: "Red",          hex: "#ef4444" },
  { name: "Crimson",      hex: "#dc2626" },
  { name: "Maroon",       hex: "#7f1d1d" },
  { name: "Rose",         hex: "#f43f5e" },
  { name: "Wine",         hex: "#9f1239" },
  { name: "Coral",        hex: "#fb7185" },
  { name: "Salmon",       hex: "#f87171" },
  { name: "Rust",         hex: "#b45309" },
  { name: "Orange",       hex: "#f97316" },
  { name: "Deep Orange",  hex: "#ea580c" },
  { name: "Peach",        hex: "#fdba74" },
  { name: "Amber",        hex: "#f59e0b" },
  { name: "Gold",         hex: "#d4af37" },
  { name: "Yellow",       hex: "#eab308" },
  { name: "Olive",        hex: "#4d7c0f" },
  { name: "Lime",         hex: "#84cc16" },
  { name: "Green",        hex: "#22c55e" },
  { name: "Forest",       hex: "#15803d" },
  { name: "Emerald",      hex: "#10b981" },
  { name: "Jade",         hex: "#059669" },
  { name: "Mint",         hex: "#6ee7b7" },
  { name: "Seafoam",      hex: "#34d399" },
  { name: "Teal",         hex: "#0d9488" },
  { name: "Turquoise",    hex: "#2dd4bf" },
  { name: "Aqua",         hex: "#22d3ee" },
  { name: "Cyan",         hex: "#06b6d4" },
  { name: "Sky",          hex: "#0ea5e9" },
  { name: "Cobalt",       hex: "#1d4ed8" },
  { name: "Blue",         hex: "#2563eb" },
  { name: "Navy",         hex: "#1e3a8a" },
  { name: "Periwinkle",   hex: "#818cf8" },
  { name: "Indigo",       hex: "#5b5ff0" },
  { name: "Violet",       hex: "#8b5cf6" },
  { name: "Lavender",     hex: "#c4b5fd" },
  { name: "Purple",       hex: "#a855f7" },
  { name: "Orchid",       hex: "#c084fc" },
  { name: "Plum",         hex: "#86198f" },
  { name: "Fuchsia",      hex: "#d946ef" },
  { name: "Magenta",      hex: "#db2777" },
  { name: "Pink",         hex: "#ec4899" },
  { name: "Steel",        hex: "#475569" },
  { name: "Slate",        hex: "#64748b" },
  { name: "Graphite",     hex: "#52525b" },
  { name: "Charcoal",     hex: "#334155" },
  { name: "Zinc",         hex: "#71717a" },
  { name: "Stone",        hex: "#78716c" },
  { name: "Gray",         hex: "#6b7280" },
  { name: "Sand",         hex: "#ca8a04" },
  { name: "Brown",        hex: "#92400e" },
  { name: "Espresso",     hex: "#5c3a21" }
];
const PRIMARY_COLOR_KEY = "customAccentPrimary";
const SECONDARY_COLOR_KEY = "customAccentSecondary";
const ACCENT_MODE_KEY = "accentColorMode"; // "default" or "custom"

function setAccentMode(mode){
  localStorage.setItem(ACCENT_MODE_KEY, mode);
  // First time switching to custom with nothing chosen yet, seed sensible
  // defaults so the app isn't left with no accent at all.
  if(mode === "custom" && !localStorage.getItem(PRIMARY_COLOR_KEY)){
    const defaultPrimary = ACCENT_COLOR_PALETTE.find(function(c){ return c.name === "Indigo"; });
    const defaultSecondary = ACCENT_COLOR_PALETTE.find(function(c){ return c.name === "Violet"; });
    localStorage.setItem(PRIMARY_COLOR_KEY, defaultPrimary.hex);
    localStorage.setItem(SECONDARY_COLOR_KEY, defaultSecondary.hex);
  }
  renderColorSwatches();
  applyAccentColors();
}

function renderColorSwatches(){
  const mode = localStorage.getItem(ACCENT_MODE_KEY) || "default";
  document.getElementById("accentModeDefault").classList.toggle("active", mode === "default");
  document.getElementById("accentModeCustom").classList.toggle("active", mode === "custom");
  document.getElementById("customColorSection").classList.toggle("hidden", mode !== "custom");

  const primary = localStorage.getItem(PRIMARY_COLOR_KEY);
  const secondary = localStorage.getItem(SECONDARY_COLOR_KEY);

  const primaryRow = document.getElementById("primarySwatchRow");
  const secondaryRow = document.getElementById("secondarySwatchRow");
  primaryRow.innerHTML = "";
  secondaryRow.innerHTML = "";

  ACCENT_COLOR_PALETTE.forEach(function(c){
    const pBtn = document.createElement("button");
    pBtn.className = "color-swatch" + (c.hex === primary ? " selected" : "");
    pBtn.style.background = c.hex;
    pBtn.title = c.name;
    pBtn.type = "button";
    pBtn.onclick = function(){ setAccentColor("primary", c.hex); };
    if(c.hex === primary) pBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5 5L20 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    primaryRow.appendChild(pBtn);

    const sBtn = document.createElement("button");
    sBtn.className = "color-swatch" + (c.hex === secondary ? " selected" : "");
    sBtn.style.background = c.hex;
    sBtn.title = c.name;
    sBtn.type = "button";
    sBtn.onclick = function(){ setAccentColor("secondary", c.hex); };
    if(c.hex === secondary) sBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5 5L20 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    secondaryRow.appendChild(sBtn);
  });
}

function setAccentColor(role, hex){
  const warning = document.getElementById("accentColorWarning");
  const otherKey = role === "primary" ? SECONDARY_COLOR_KEY : PRIMARY_COLOR_KEY;
  if(localStorage.getItem(otherKey) === hex){
    warning.style.display = "block";
    setTimeout(function(){ warning.style.display = "none"; }, 2500);
    return;
  }
  localStorage.setItem(role === "primary" ? PRIMARY_COLOR_KEY : SECONDARY_COLOR_KEY, hex);
  renderColorSwatches();
  applyAccentColors();
}

function applyAccentColors(){
  const mode = localStorage.getItem(ACCENT_MODE_KEY) || "default";
  const root = document.documentElement.style;
  if(mode === "custom"){
    const primary = localStorage.getItem(PRIMARY_COLOR_KEY);
    const secondary = localStorage.getItem(SECONDARY_COLOR_KEY);
    if(primary) root.setProperty("--accent", primary);
    if(secondary) root.setProperty("--accent2", secondary);
  }else{
    root.removeProperty("--accent");
    root.removeProperty("--accent2");
  }
}

function applyFeatureVisibility(){
  const toggles = loadFeatureToggles();
  const sectionMap = { heatmap: "heatmapSection", bills: "billsSection", calendar: "calendarSection", conflicts: "conflictsSection" };
  Object.keys(sectionMap).forEach(function(name){
    const el = document.getElementById(sectionMap[name]);
    const checkbox = document.getElementById("toggle" + name.charAt(0).toUpperCase() + name.slice(1));
    const isOn = !!toggles[name];
    if(el) el.classList.toggle("hidden", !isOn);
    if(checkbox) checkbox.checked = isOn;
  });
  document.getElementById("toggleHideCompleted").checked = !!toggles.hideCompleted;
  document.getElementById("toggleCompact").checked = !!toggles.compact;
  document.body.classList.toggle("compact-mode", !!toggles.compact);
}

function renderHeatmap(){
  const toggles = loadFeatureToggles();
  if(!toggles.heatmap) return;
  const row = document.getElementById("heatmapRow");
  row.innerHTML = "";
  const days = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  days.forEach(function(dateStr){
    const count = tasks.filter(function(t){ return t.dueDate === dateStr && t.completed; }).length;
    let color = "#374151";
    if(count >= 1 && count <= 2) color = "#166534";
    else if(count >= 3 && count <= 4) color = "#22c55e";
    else if(count >= 5) color = "#4ade80";
    const dayLabel = new Date(dateStr).toLocaleDateString(undefined, { weekday: "short" });
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.style.background = color;
    cell.innerHTML = '<div style="font-weight:bold;margin-bottom:4px;">' + dayLabel + '</div><div style="font-size:16px;font-weight:bold;">' + count + '</div>';
    row.appendChild(cell);
  });
}

async function loadBills(){
  const res = await fetch(API_URL + "/bills", { headers: authHeaders() });
  if(res.status === 401 || res.status === 403) return;
  bills = await res.json();
  renderBills();
}

async function addBill(){
  const name = document.getElementById("billNameInput").value.trim();
  const amount = document.getElementById("billAmountInput").value;
  const dueDate = document.getElementById("billDueDateInput").value;
  if(!name || !dueDate){ alert("Enter a bill name and due date"); return; }
  const res = await fetch(API_URL + "/bills", { method: "POST", headers: authHeaders(), body: JSON.stringify({ name: name, amount: amount || 0, dueDate: dueDate }) });
  if(res.ok){
    document.getElementById("billNameInput").value = "";
    document.getElementById("billAmountInput").value = "";
    document.getElementById("billDueDateInput").value = "";
    await loadBills();
  }
}

async function toggleBillPaid(id, currentPaid){
  await fetch(API_URL + "/bills/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ paid: !currentPaid }) });
  await loadBills();
}

async function deleteBill(id){
  await fetch(API_URL + "/bills/" + id, { method: "DELETE", headers: authHeaders() });
  await loadBills();
}

function renderBills(){
  const list = document.getElementById("billsList");
  list.innerHTML = "";
  if(bills.length === 0){ list.innerHTML = '<p class="timeline-empty">No bills added yet.</p>'; return; }
  const today = new Date(new Date().toDateString());
  bills.forEach(function(b){
    const dueDate = new Date(b.dueDate);
    const daysUntil = Math.round((dueDate - today) / 86400000);
    let statusClass = "";
    if(b.paid) statusClass = "paid";
    else if(daysUntil < 0) statusClass = "overdue";
    else if(daysUntil <= 3) statusClass = "due-soon";
    let statusText = b.paid ? "Paid" : (daysUntil < 0 ? (Math.abs(daysUntil) + " days overdue") : daysUntil === 0 ? "Due today" : ("Due in " + daysUntil + " days"));
    const card = document.createElement("div");
    card.className = "bill-card " + statusClass;
    card.innerHTML =
      '<div class="bill-info"><strong>' + escapeHtml(b.name) + '</strong><div>Rs ' + b.amount + ' - ' + b.dueDate + ' - ' + statusText + '</div></div>' +
      '<div class="bill-actions">' +
        '<button class="add-btn" onclick="toggleBillPaid(\'' + b._id + '\', ' + b.paid + ')">' + (b.paid ? "Mark Unpaid" : "Mark Paid") + '</button>' +
        '<button class="logout-btn" onclick="deleteBill(\'' + b._id + '\')">Delete</button>' +
      '</div>';
    list.appendChild(card);
  });
}

function changeCalendarMonth(delta){
  calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar(){
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("calendarMonthLabel");
  grid.innerHTML = "";
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  label.innerText = calendarViewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(function(d){
    const el = document.createElement("div");
    el.className = "calendar-day-label";
    el.innerText = d;
    grid.appendChild(el);
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];
  for(let i = 0; i < firstDay; i++){
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    grid.appendChild(empty);
  }
  for(let day = 1; day <= daysInMonth; day++){
    const dateStr = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    const dayTasks = tasks.filter(function(t){ return t.dueDate === dateStr; });
    const cell = document.createElement("div");
    cell.className = "calendar-day" + (dateStr === todayStr ? " today" : "");
    cell.innerHTML = '<div style="font-weight:bold;">' + day + '</div>';
    if(dayTasks.length > 0) cell.innerHTML += '<div class="calendar-day-dot"></div>';
    cell.onclick = function(){ showCalendarDayTasks(dateStr); };
    grid.appendChild(cell);
  }
}

function showCalendarDayTasks(dateStr){
  const container = document.getElementById("calendarDayTasks");
  const dayTasks = tasks.filter(function(t){ return t.dueDate === dateStr; });
  if(dayTasks.length === 0){ container.innerHTML = '<p class="timeline-empty">No tasks on ' + dateStr + '.</p>'; return; }
  container.innerHTML = '<h3 style="font-size:14px;margin-bottom:8px;">Tasks on ' + dateStr + '</h3>' +
    dayTasks.map(function(t){
      return '<div class="mini-task"><div class="mini-task-title">' + escapeHtml(t.text) + '</div><div class="mini-task-meta">' + (t.dueTime ? formatTimeDisplay(t.dueTime) : "Anytime") + '</div></div>';
    }).join("");
}

function renderConflicts(){
  const toggles = loadFeatureToggles();
  if(!toggles.conflicts) return;
  const container = document.getElementById("conflictsList");
  const timedTasks = tasks.filter(function(t){ return t.dueDate && t.dueTime && !t.completed; });
  const conflicts = [];
  for(let i = 0; i < timedTasks.length; i++){
    for(let j = i + 1; j < timedTasks.length; j++){
      const a = timedTasks[i], b = timedTasks[j];
      if(a.dueDate !== b.dueDate) continue;
      const aStart = new Date(a.dueDate + "T" + a.dueTime);
      const aEnd = new Date(aStart.getTime() + (a.durationMinutes||30)*60000);
      const bStart = new Date(b.dueDate + "T" + b.dueTime);
      const bEnd = new Date(bStart.getTime() + (b.durationMinutes||30)*60000);
      if(aStart < bEnd && bStart < aEnd) conflicts.push({ a: a, b: b });
    }
  }
  if(conflicts.length === 0){ container.innerHTML = '<p class="no-conflicts">No time conflicts found.</p>'; return; }
  container.innerHTML = conflicts.map(function(c){
    return '<div class="conflict-card">"' + c.a.text + '" (' + formatTimeDisplay(c.a.dueTime) + ') overlaps with "' + c.b.text + '" (' + formatTimeDisplay(c.b.dueTime) + ') on ' + c.a.dueDate + '</div>';
  }).join("");
}

