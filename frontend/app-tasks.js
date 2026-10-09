// Everything about tasks: add/edit/delete, the dashboard, habit tracker, and Kanban board.
// Part of the app - loaded alongside the other files in index.html.

// ===================================================================
// TASKS
// ===================================================================

async function loadTasks(){
  const res = await fetch(API_URL + "/tasks", { headers: authHeaders() });
  if(res.status === 401 || res.status === 403){ logout(); return; }
  tasks = await res.json();
  renderAll();
}

async function addTask(){
  const text = document.getElementById("taskInput").value;
  const category = document.getElementById("category").value;
  const priority = document.getElementById("priority").value;
  const dueDate = document.getElementById("dueDate").value;
  const dueTime = document.getElementById("dueTime").value;
  const recurring = document.getElementById("recurring").value;
  const tags = document.getElementById("taskTags").value.split(",").map(function(t){ return t.trim(); }).filter(Boolean);

  if(text.trim() === ""){ alert("Enter task"); return; }

  const res = await fetch(API_URL + "/tasks", {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ text: text, category: category, priority: priority, dueDate: dueDate, dueTime: dueTime, status: "icebox", recurring: recurring, tags: tags })
  });

  if(res.ok){
    document.getElementById("taskInput").value = "";
    document.getElementById("dueTime").value = "";
    document.getElementById("taskTags").value = "";
    document.getElementById("recurring").value = "none";
    await loadTasks();
  }
}

async function deleteTask(id){
  await fetch(API_URL + "/tasks/" + id, { method: "DELETE", headers: authHeaders() });
  await loadTasks();
}

function nextRecurringDate(dueDate, recurring){
  const base = dueDate ? new Date(dueDate + "T00:00:00") : new Date();
  if(recurring === "daily") base.setDate(base.getDate() + 1);
  else if(recurring === "weekly") base.setDate(base.getDate() + 7);
  else if(recurring === "monthly") base.setMonth(base.getMonth() + 1);
  return base.toISOString().split("T")[0];
}

async function toggleComplete(id, currentStatus){
  const newCompleted = !currentStatus;
  await fetch(API_URL + "/tasks/" + id, {
    method: "PUT", headers: authHeaders(),
    body: JSON.stringify({ completed: newCompleted, status: newCompleted ? "complete" : "icebox" })
  });

  // If a recurring task was just completed, spin up its next occurrence
  // so nothing falls through the cracks.
  if(newCompleted){
    const task = tasks.find(function(t){ return t._id === id; });
    if(task && task.recurring && task.recurring !== "none"){
      await fetch(API_URL + "/tasks", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          text: task.text, category: task.category, priority: task.priority,
          dueDate: nextRecurringDate(task.dueDate, task.recurring), dueTime: task.dueTime,
          status: "icebox", recurring: task.recurring, tags: task.tags || []
        })
      });
    }
  }

  await loadTasks();
}

async function editTask(id){
  const task = tasks.find(function(t){ return t._id === id; });
  const newText = prompt("Edit Task", task ? task.text : "");
  if(newText){
    await fetch(API_URL + "/tasks/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ text: newText }) });
    await loadTasks();
  }
}

function renderAll(){
  renderTasks();
  renderKanban();
  renderTodaysTasks();
  renderHabitTracker();
  renderDashboardOverview();
  renderHeatmap();
  renderConflicts();
}

function formatTimeDisplay(timeStr){
  if(!timeStr) return "";
  const parts = timeStr.split(":");
  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if(hour === 0) hour = 12;
  return hour + ":" + minute + " " + ampm;
}

function formatDueDisplay(task){
  if(!task.dueDate) return "Not Set";
  const timePart = task.dueTime ? (" at " + formatTimeDisplay(task.dueTime)) : "";
  return task.dueDate + timePart;
}

function renderTasks(){
  let list = document.getElementById("taskList");
  list.innerHTML = "";

  let search = document.getElementById("search").value.toLowerCase();
  let category = document.getElementById("filterCategory").value;
  let sort = document.getElementById("sortPriority").value;
  let tagFilter = document.getElementById("filterTag").value;
  let hideCompleted = !!loadFeatureToggles().hideCompleted;

  populateTagFilter();

  let filtered = tasks.filter(function(task){
    let matchSearch = task.text.toLowerCase().indexOf(search) !== -1;
    let matchCategory = category === "All" || task.category === category;
    let matchCompleted = !hideCompleted || !task.completed;
    let matchTag = tagFilter === "All" || (task.tags || []).indexOf(tagFilter) !== -1;
    return matchSearch && matchCategory && matchCompleted && matchTag;
  });

  const rank = { high: 3, medium: 2, low: 1 };
  if(sort === "high") filtered.sort(function(a,b){ return rank[b.priority] - rank[a.priority]; });
  if(sort === "low") filtered.sort(function(a,b){ return rank[a.priority] - rank[b.priority]; });

  filtered.forEach(function(task){
    let div = document.createElement("div");
    div.className = "task " + task.priority;
    let tagPills = (task.tags || []).map(function(t){ return '<span class="pill pill-tag">' + escapeHtml(t) + '</span>'; }).join("");
    let repeatBadge = (task.recurring && task.recurring !== "none")
      ? '<span class="pill pill-repeat">&#8635; ' + task.recurring.charAt(0).toUpperCase() + task.recurring.slice(1) + '</span>' : "";
    div.innerHTML =
      '<div>' +
        '<h3 class="' + (task.completed ? 'completed' : '') + '">' + escapeHtml(task.text) + '</h3>' +
        '<div style="margin:8px 0;">' +
          '<span class="pill pill-' + task.priority + '">' + (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) + '</span>' +
          '<span class="pill pill-category">' + escapeHtml(task.category) + '</span>' +
          repeatBadge + tagPills +
        '</div>' +
        '<p style="color:var(--muted);font-size:13px;">Due: ' + formatDueDisplay(task) + '</p>' +
      '</div>' +
      '<div class="actions">' +
        '<button onclick="toggleComplete(\'' + task._id + '\', ' + task.completed + ')">Done</button>' +
        '<button onclick="editTask(\'' + task._id + '\')">Edit</button>' +
        '<button onclick="deleteTask(\'' + task._id + '\')">Delete</button>' +
      '</div>';
    list.appendChild(div);
  });

  updateStats();
}

function populateTagFilter(){
  const select = document.getElementById("filterTag");
  const current = select.value;
  const allTags = Array.from(new Set(tasks.reduce(function(acc, t){ return acc.concat(t.tags || []); }, [])));
  select.innerHTML = '<option value="All">All Tags</option>' + allTags.map(function(t){ return '<option value="' + t + '">' + t + '</option>'; }).join("");
  if(allTags.indexOf(current) !== -1) select.value = current;
}

function updateStats(){
  let completed = tasks.filter(function(t){ return t.completed; }).length;
}

// Today's Tasks split card: only today's, chronological by time, priority breaks ties
function renderTodaysTasks(){
  const container = document.getElementById("todaysTasksList");
  const todayStr = new Date().toISOString().split("T")[0];
  const rank = { high: 3, medium: 2, low: 1 };

  const todays = tasks.filter(function(t){ return t.dueDate === todayStr; }).sort(function(a,b){
    const ta = a.dueTime || "23:59";
    const tb = b.dueTime || "23:59";
    if(ta !== tb) return ta.localeCompare(tb);
    return rank[b.priority] - rank[a.priority];
  });

  if(todays.length === 0){
    container.innerHTML = '<p class="timeline-empty">No tasks due today.</p>';
    return;
  }

  container.innerHTML = todays.map(function(t){
    return '<div class="mini-task"><div class="mini-task-title">' + escapeHtml(t.text) + '</div>' +
      '<div class="mini-task-meta">' + (t.dueTime ? formatTimeDisplay(t.dueTime) : "Anytime") + ' - ' + escapeHtml(t.category) + ' - ' + t.priority + '</div></div>';
  }).join("");
}

// ===================================================================
// DASHBOARD (always visible, core)
// ===================================================================

function renderDashboardOverview(){
  updateDashboardClock();
  if(!dashboardClockInterval){ dashboardClockInterval = setInterval(updateDashboardClock, 1000); }

  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();

  const todayCount = tasks.filter(function(t){ return t.dueDate === todayStr; }).length;
  const upcomingCount = tasks.filter(function(t){ return t.dueDate && t.dueDate > todayStr && !t.completed; }).length;
  const completedCount = tasks.filter(function(t){ return t.completed; }).length;
  const pendingCount = tasks.filter(function(t){ return !t.completed; }).length;
  const overdueCount = tasks.filter(function(t){
    if(t.completed || !t.dueDate) return false;
    const dueDateTime = t.dueTime ? new Date(t.dueDate + "T" + t.dueTime) : new Date(t.dueDate);
    return dueDateTime < now;
  }).length;

  document.getElementById("dashToday").innerText = todayCount;
  document.getElementById("dashUpcoming").innerText = upcomingCount;
  document.getElementById("dashCompleted").innerText = completedCount;
  document.getElementById("dashPending").innerText = pendingCount;
  document.getElementById("dashOverdue").innerText = overdueCount;

  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const ring = document.getElementById("progressRing");
  const ringValue = document.getElementById("progressRingValue");
  if(ring && ringValue){
    ring.style.setProperty("--pct", completionRate);
    ringValue.innerText = completionRate + "%";
  }

  const upcoming = tasks.filter(function(t){ return !t.completed && t.dueDate; })
    .map(function(t){ return { t: t, dt: new Date(t.dueDate + "T" + (t.dueTime || "23:59")) }; })
    .filter(function(x){ return x.dt >= now; })
    .sort(function(a, b){ return a.dt - b.dt; });

  const countdownEl = document.getElementById("dashCountdown");
  if(upcoming.length === 0){
    countdownEl.innerText = "No upcoming deadlines";
  } else {
    const t = upcoming[0].t;
    const dt = upcoming[0].dt;
    const diffMs = dt - now;
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    let parts = [];
    if(days > 0) parts.push(days + "d");
    if(hours > 0) parts.push(hours + "h");
    parts.push(minutes + "m");
    countdownEl.innerText = '"' + t.text + '" due in ' + parts.join(" ");
  }
}

function updateDashboardClock(){
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if(hours === 0) hours = 12;

  document.getElementById("dashClock").innerText = hours + ":" + minutes + " " + ampm;
  document.getElementById("dashDate").innerText = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const h = now.getHours();
  let greeting = "Good evening";
  if(h < 12) greeting = "Good morning";
  else if(h < 17) greeting = "Good afternoon";
  document.getElementById("dashGreeting").innerText = greeting + ", " + (localStorage.getItem("userName") || "there") + "!";
}

// ===================================================================
// HABIT TRACKER (weekly Mon-Sun grid, core, always visible)
// ===================================================================

function getCurrentWeekDates(){
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const result = [];
  for(let i = 0; i < 7; i++){
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result.push(d.toISOString().split("T")[0]);
  }
  return result;
}

async function loadHabits(){
  const res = await fetch(API_URL + "/habits", { headers: authHeaders() });
  if(res.status === 401 || res.status === 403) return;
  habits = await res.json();
  renderHabitTracker();
}

async function addHabit(){
  const nameInput = document.getElementById("habitNameInput");
  const name = nameInput.value.trim();
  if(!name){ alert("Enter a habit name"); return; }
  const res = await fetch(API_URL + "/habits", { method: "POST", headers: authHeaders(), body: JSON.stringify({ name: name }) });
  if(res.ok){ nameInput.value = ""; await loadHabits(); }
}

async function toggleHabitDate(id, dateStr){
  await fetch(API_URL + "/habits/" + id + "/toggle-date", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ date: dateStr }) });
  await loadHabits();
}

async function deleteHabit(id){
  await fetch(API_URL + "/habits/" + id, { method: "DELETE", headers: authHeaders() });
  await loadHabits();
}

function renderHabitTracker(){
  const container = document.getElementById("habitTrackerList");
  if(!container) return;
  container.innerHTML = "";

  if(habits.length === 0){
    container.innerHTML = '<p class="timeline-empty">No habits yet. Add one above.</p>';
    return;
  }

  const weekDates = getCurrentWeekDates();
  const dayLabels = ["M","T","W","T","F","S","S"];

  habits.forEach(function(h){
    const row = document.createElement("div");
    row.className = "habit-row";
    let ticksHtml = "";
    weekDates.forEach(function(dateStr, i){
      const done = h.completions.indexOf(dateStr) !== -1;
      ticksHtml += '<button class="habit-tick ' + (done ? 'done' : '') + '" onclick="toggleHabitDate(\'' + h._id + '\', \'' + dateStr + '\')">' + dayLabels[i] + '</button>';
    });
    row.innerHTML =
      '<div class="habit-row-top"><span class="habit-row-name">' + h.icon + ' ' + escapeHtml(h.name) + '</span>' +
      '<button class="habit-delete-x" onclick="deleteHabit(\'' + h._id + '\')">x</button></div>' +
      '<div class="habit-week">' + ticksHtml + '</div>';
    container.appendChild(row);
  });
}

// ===================================================================
// KANBAN (4 columns, core, always visible)
// ===================================================================

function kanbanDueUrgency(task){
  if(!task.dueDate) return null;
  const due = new Date(task.dueDate + "T" + (task.dueTime || "23:59"));
  const now = new Date();
  const diffHrs = (due - now) / 3600000;
  if(diffHrs < 0) return { cls: "overdue", label: "Overdue" };
  if(diffHrs <= 24) return { cls: "due-soon", label: "Due today" };
  return { cls: "upcoming", label: formatDueDisplay(task) };
}

function renderKanban(){
  const board = document.getElementById("kanbanBoard");
  board.innerHTML = "";

  function normalizeStatus(s){ return s === "testing" ? "inprogress" : (s || "icebox"); }
  const totalTasks = tasks.length || 1;

  KANBAN_COLUMNS.forEach(function(col, colIndex){
    const colTasks = tasks.filter(function(t){ return normalizeStatus(t.status) === col.key; });
    const colDiv = document.createElement("div");
    colDiv.className = "kanban-column";
    colDiv.dataset.status = col.key;

    const header = document.createElement("div");
    header.className = "kanban-column-header";
    header.style.background = col.gradient;
    header.innerHTML =
      '<span class="kanban-col-icon">' + col.icon + '</span>' +
      '<span class="kanban-col-label">' + col.label + '</span>' +
      '<span class="kanban-col-count">' + colTasks.length + '</span>';
    colDiv.appendChild(header);

    const barFill = document.createElement("div");
    barFill.className = "kanban-col-bar";
    barFill.innerHTML = '<span style="width:' + Math.round((colTasks.length / totalTasks) * 100) + '%;background:' + col.color + ';"></span>';
    colDiv.appendChild(barFill);

    const dropZone = document.createElement("div");
    dropZone.className = "kanban-drop-zone";

    if(colTasks.length === 0){
      const empty = document.createElement("div");
      empty.className = "kanban-empty";
      empty.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="opacity:.5;margin-bottom:6px;"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/></svg><div>Drag tasks here</div>';
      dropZone.appendChild(empty);
    }

    colTasks.forEach(function(task){
      const card = document.createElement("div");
      card.className = "kanban-card priority-" + task.priority;
      card.draggable = true;
      card.dataset.id = task._id;

      card.addEventListener("dragstart", function(e){
        e.dataTransfer.setData("text/plain", task._id);
        setTimeout(function(){ card.classList.add("dragging"); }, 0);
      });
      card.addEventListener("dragend", function(){ card.classList.remove("dragging"); });

      const canMoveLeft = colIndex > 0;
      const canMoveRight = colIndex < KANBAN_COLUMNS.length - 1;
      const urgency = kanbanDueUrgency(task);
      const dueBadge = urgency ? '<span class="kanban-due-badge ' + urgency.cls + '">' + urgency.label + '</span>' : '<span class="kanban-due-badge">No date</span>';
      const tagPills = (task.tags || []).slice(0, 3).map(function(t){ return '<span class="pill pill-tag">' + escapeHtml(t) + '</span>'; }).join("");
      const repeatBadge = (task.recurring && task.recurring !== "none")
        ? '<span class="pill pill-repeat">&#8635; ' + task.recurring + '</span>' : "";

      card.innerHTML =
        '<div class="kanban-card-top">' +
          '<span class="kanban-drag-handle" title="Drag to move"><svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="2" r="1.4"/><circle cx="9" cy="2" r="1.4"/><circle cx="3" cy="8" r="1.4"/><circle cx="9" cy="8" r="1.4"/><circle cx="3" cy="14" r="1.4"/><circle cx="9" cy="14" r="1.4"/></svg></span>' +
          dueBadge +
        '</div>' +
        '<div class="kanban-card-title">' + escapeHtml(task.text) + '</div>' +
        '<div class="kanban-card-meta">' + escapeHtml(task.category) + '' + repeatBadge + tagPills + '</div>' +
        '<div class="kanban-card-actions">' +
          '<button class="kanban-arrow-btn" ' + (canMoveLeft ? "" : "disabled") + ' onclick="moveKanbanTask(\'' + task._id + '\', -1)" aria-label="Move left">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.5 6.5L8 12l6.5 5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
          '<button class="kanban-arrow-btn" ' + (canMoveRight ? "" : "disabled") + ' onclick="moveKanbanTask(\'' + task._id + '\', 1)" aria-label="Move right">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9.5 6.5L16 12l-6.5 5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</div>';
      dropZone.appendChild(card);
    });

    dropZone.addEventListener("dragover", function(e){
      e.preventDefault();
      colDiv.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", function(){ colDiv.classList.remove("drag-over"); });
    dropZone.addEventListener("drop", function(e){
      e.preventDefault();
      colDiv.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      moveKanbanTaskTo(id, col.key);
    });

    colDiv.appendChild(dropZone);
    board.appendChild(colDiv);
  });
}

async function moveKanbanTaskTo(id, newStatus){
  const task = tasks.find(function(t){ return t._id === id; });
  if(!task) return;
  const normalized = task.status === "testing" ? "inprogress" : (task.status || "icebox");
  if(normalized === newStatus) return;
  await fetch(API_URL + "/tasks/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status: newStatus, completed: newStatus === "complete" }) });
  await loadTasks();
}

async function moveKanbanTask(id, direction){
  const task = tasks.find(function(t){ return t._id === id; });
  if(!task) return;
  // "testing" column used to exist, removed it but some old tasks in the db
  // still have status:"testing" saved so this just folds them into inprogress
  // const normalized = task.status || "icebox"; // old version, broke on old data
  const normalized = task.status === "testing" ? "inprogress" : (task.status || "icebox");
  const currentIndex = KANBAN_COLUMNS.findIndex(function(c){ return c.key === normalized; });
  const newIndex = currentIndex + direction;
  if(newIndex < 0 || newIndex >= KANBAN_COLUMNS.length) return;
  const newStatus = KANBAN_COLUMNS[newIndex].key;
  await fetch(API_URL + "/tasks/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status: newStatus, completed: newStatus === "complete" }) });
  await loadTasks();
}

