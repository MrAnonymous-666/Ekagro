// The Notes feature: creating, listing, editing, and deleting notes.
// Part of the app - loaded alongside the other files in index.html.

// ===================================================================
// NOTES (plain text, no due dates - just type)
// ===================================================================

async function loadNotes(){
  const res = await fetch(API_URL + "/notes", { headers: authHeaders() });
  if(res.status === 401 || res.status === 403) return;
  notes = await res.json();
  renderNotesList();
}

function renderNotesList(){
  const list = document.getElementById("notesList");
  if(!notes.length){
    list.innerHTML = '<p class="timeline-empty">No notes yet. Tap "+ New Note" to add one.</p>';
    return;
  }
  list.innerHTML = notes.map(function(n){
    const preview = (n.content || "").slice(0, 60) || "Empty note";
    const dateStr = new Date(n.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return '<div class="note-card" onclick="openNote(\'' + n._id + '\')">' +
      '<div class="note-card-title">' + escapeHtml(n.title || "Untitled Note") + '</div>' +
      '<div class="note-card-preview">' + escapeHtml(preview) + '</div>' +
      '<div class="note-card-date">Edited ' + dateStr + '</div>' +
    '</div>';
  }).join("");
}

async function createNewNote(){
  const res = await fetch(API_URL + "/notes", {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ title: "Untitled Note", content: "" })
  });
  const note = await res.json();
  notes.unshift(note);
  openNote(note._id);
}

function openNote(id){
  const note = notes.find(function(n){ return n._id === id; });
  if(!note) return;
  currentNoteId = id;
  document.getElementById("noteTitleInput").value = note.title || "";
  document.getElementById("noteContentInput").value = note.content || "";
  document.getElementById("noteSaveStatus").textContent = "Saved";
  document.getElementById("notesListView").classList.add("hidden");
  document.getElementById("noteEditorView").classList.remove("hidden");
}

function backToNotesList(){
  currentNoteId = null;
  clearTimeout(noteSaveTimer);
  document.getElementById("noteEditorView").classList.add("hidden");
  document.getElementById("notesListView").classList.remove("hidden");
  renderNotesList();
}

// saving on every keystroke was hitting the API way too much, so debounce it
// 900ms seemed to feel right, didn't really measure it just tried a few values
function scheduleNoteSave(){
  if(!currentNoteId) return;
  document.getElementById("noteSaveStatus").textContent = "Saving...";
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(saveCurrentNote, 900);
}

async function saveCurrentNote(){
  if(!currentNoteId) return;
  const title = document.getElementById("noteTitleInput").value.trim() || "Untitled Note";
  const content = document.getElementById("noteContentInput").value;
  const res = await fetch(API_URL + "/notes/" + currentNoteId, {
    method: "PUT", headers: authHeaders(),
    body: JSON.stringify({ title: title, content: content })
  });
  const updated = await res.json();
  const idx = notes.findIndex(function(n){ return n._id === currentNoteId; });
  if(idx !== -1) notes[idx] = updated;
  document.getElementById("noteSaveStatus").textContent = "Saved";
}

async function deleteCurrentNote(){
  if(!currentNoteId) return;
  if(!confirm("Delete this note? This can't be undone.")) return;
  await fetch(API_URL + "/notes/" + currentNoteId, { method: "DELETE", headers: authHeaders() });
  notes = notes.filter(function(n){ return n._id !== currentNoteId; });
  backToNotesList();
}

async function loadProjects(){
  const res = await fetch(API_URL + "/projects", { headers: authHeaders() });
  if(res.status === 401 || res.status === 403) return;
  projects = await res.json();
  renderProjects();
}

async function addProject(){
  const input = document.getElementById("projectNameInput");
  const name = input.value.trim();
  if(!name){ alert("Enter a project name"); return; }
  const res = await fetch(API_URL + "/projects", { method: "POST", headers: authHeaders(), body: JSON.stringify({ name: name }) });
  if(res.ok){ input.value = ""; await loadProjects(); }
}

async function updateProjectProgress(id, value){
  await fetch(API_URL + "/projects/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ progress: Number(value) }) });
  await loadProjects();
}

async function deleteProject(id){
  await fetch(API_URL + "/projects/" + id, { method: "DELETE", headers: authHeaders() });
  await loadProjects();
}

function renderProjects(){
  const list = document.getElementById("projectsList");
  if(!list) return;
  if(!projects.length){
    list.innerHTML = '<p class="timeline-empty">No projects yet. Add one above.</p>';
    return;
  }
  list.innerHTML = projects.map(function(p){
    return '<div class="project-card">' +
      '<div class="project-card-top"><strong>' + escapeHtml(p.name) + '</strong>' +
      '<button class="habit-delete-x" onclick="deleteProject(\'' + p._id + '\')">x</button></div>' +
      '<input type="range" min="0" max="100" value="' + p.progress + '" onchange="updateProjectProgress(\'' + p._id + '\', this.value)">' +
      '<div class="project-bar-track"><div class="project-bar-fill" style="width:' + p.progress + '%;"></div></div>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:4px;">' + p.progress + '% complete</div>' +
      '<button class="theme-btn" style="margin-top:8px;" onclick="viewProjectProgress(\'' + p._id + '\')">View Progress</button>' +
      '</div>';
  }).join("");
}

// Logic that turns a raw percentage into a meaningful status label -
// this is the "how much is done" reasoning requested, since progress
// itself is set manually (there's no subtask data to compute it from).
function getProjectStatusLabel(progress){
  if(progress <= 0) return "Not started yet";
  if(progress < 25) return "Just getting started";
  if(progress < 50) return "Making progress";
  if(progress < 75) return "Halfway there";
  if(progress < 100) return "Almost done";
  return "Completed!";
}

function viewProjectProgress(id){
  const project = projects.find(function(p){ return p._id === id; });
  if(!project) return;

  document.getElementById("progressModalName").innerText = project.name;
  document.getElementById("progressModalRing").style.setProperty("--pct", project.progress);
  document.getElementById("progressModalValue").innerText = project.progress + "%";
  document.getElementById("progressModalStatus").innerText = getProjectStatusLabel(project.progress);

  const deleteBtn = document.getElementById("progressModalDeleteBtn");
  deleteBtn.onclick = function(){
    if(confirm('Delete "' + project.name + '"? This cannot be undone.')){
      deleteProject(id);
      closeProjectProgress();
    }
  };

  document.getElementById("progressModalOverlay").classList.add("open");
}

function closeProjectProgress(e){
  document.getElementById("progressModalOverlay").classList.remove("open");
}

