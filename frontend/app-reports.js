// The Schedule tab and the Progress Report tab (AI insights, PDF export, charts, projects).
// Part of the app - loaded alongside the other files in index.html.

// ===================================================================
// SCHEDULE (left menu: Daily / Weekly)
// ===================================================================

function renderScheduleDaily(){
  const container = document.getElementById("scheduleDailyList");
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const todayTasks = tasks.filter(function(t){ return t.dueDate === todayStr; }).sort(function(a, b){ return (a.dueTime || "23:59").localeCompare(b.dueTime || "23:59"); });

  if(todayTasks.length === 0){ container.innerHTML = '<p class="timeline-empty">No tasks due today.</p>'; return; }

  container.innerHTML = "";
  todayTasks.forEach(function(t){
    const timeLabel = t.dueTime ? formatTimeDisplay(t.dueTime) : "Anytime";
    let isCurrent = false;
    if(t.dueTime){
      const taskDt = new Date(t.dueDate + "T" + t.dueTime);
      isCurrent = Math.abs(taskDt - now) < 30 * 60000;
    }
    const item = document.createElement("div");
    item.className = "timeline-item" + (isCurrent ? " current" : "");
    item.innerHTML = '<div class="timeline-time">' + timeLabel + '</div><div><div class="timeline-title">' + escapeHtml(t.text) + '</div><div class="timeline-meta">' + escapeHtml(t.category) + ' - ' + t.priority + '</div></div>';
    container.appendChild(item);
  });
}

function renderScheduleWeekly(){
  const grid = document.getElementById("scheduleWeeklyGrid");
  const weekDates = getCurrentWeekDates();
  const dayLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  grid.innerHTML = "";
  weekDates.forEach(function(dateStr, i){
    const dayTasks = tasks.filter(function(t){ return t.dueDate === dateStr; });
    const col = document.createElement("div");
    col.className = "weekly-schedule-day";
    let html = '<div class="weekly-schedule-day-label">' + dayLabels[i] + '</div>';
    if(dayTasks.length === 0){
      html += '<div style="font-size:11px;color:var(--muted);">-</div>';
    } else {
      dayTasks.forEach(function(t){
        html += '<div class="weekly-schedule-task">' + escapeHtml(t.text) + '</div>';
      });
    }
    col.innerHTML = html;
    grid.appendChild(col);
  });
}

// ===================================================================
// PROGRESS REPORT: AI Insights, PDF, Pie chart, Line chart, Projects
// ===================================================================

function selectPeriod(period){
  selectedPeriod = period;
  document.getElementById("tabWeek").classList.toggle("active", period === "week");
  document.getElementById("tabMonth").classList.toggle("active", period === "month");
  document.getElementById("tabYear").classList.toggle("active", period === "year");
}

async function generateInsights(){
  const output = document.getElementById("insightsOutput");
  output.innerText = "Generating insights...";
  try{
    const res = await fetch(API_URL + "/ai/insights", { method: "POST", headers: authHeaders(), body: JSON.stringify({ period: selectedPeriod }) });
    const data = await res.json();
    if(!res.ok){ output.innerText = "AI error: " + (data.message || "Something went wrong"); return; }
    output.innerText = data.summary;
  }catch(err){ output.innerText = "AI error: " + err.message; }
}

function getPeriodRange(period){
  const now = new Date();
  const end = new Date(now);
  let start = null;
  if(period === "week"){ start = new Date(now); start.setDate(start.getDate() - 6); }
  else if(period === "month"){ start = new Date(now); start.setDate(start.getDate() - 29); }
  else if(period === "year"){ start = new Date(now); start.setDate(start.getDate() - 364); }
  return { start: start, end: end };
}

function taskDateForFiltering(task){
  const raw = task.dueDate || task.createdAt;
  return raw ? new Date(raw) : null;
}

function getTasksForPeriod(period){
  if(period === "all") return tasks;
  const range = getPeriodRange(period);
  return tasks.filter(function(task){
    const d = taskDateForFiltering(task);
    if(!d) return false;
    return d >= range.start && d <= range.end;
  });
}

const PERIOD_LABELS = {
  week: "Weekly Report (Last 7 Days)", month: "Monthly Report (Last 30 Days)",
  year: "Yearly Report (Last 365 Days)", all: "Full Progress Report (All-Time)"
};

function downloadReport(period){
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const periodTasks = getTasksForPeriod(period);
  const completed = periodTasks.filter(function(t){ return t.completed; }).length;
  const pending = periodTasks.length - completed;
  const completionRate = periodTasks.length ? Math.round((completed / periodTasks.length) * 100) : 0;
  const overdue = periodTasks.filter(function(t){
    if(t.completed || !t.dueDate) return false;
    const dueDateTime = t.dueTime ? new Date(t.dueDate + "T" + t.dueTime) : new Date(t.dueDate);
    return dueDateTime < new Date();
  }).length;

  doc.setFillColor(91, 95, 240);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("Ekagro", 14, 14);
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(PERIOD_LABELS[period] || "Report", 14, 23);
  doc.setFontSize(9);
  doc.text("Generated: " + new Date().toLocaleString(), pageWidth - 14, 23, { align: "right" });

  doc.setTextColor(0, 0, 0);
  const boxY = 40;
  const boxW = (pageWidth - 14 * 2 - 3 * 6) / 4;
  const boxes = [
    { label: "Total Tasks", value: periodTasks.length, color: [230, 230, 230] },
    { label: "Completed", value: completed, color: [212, 237, 218] },
    { label: "Pending", value: pending, color: [255, 243, 205] },
    { label: "Overdue", value: overdue, color: [248, 215, 218] }
  ];
  boxes.forEach(function(box, i){
    const x = 14 + i * (boxW + 6);
    doc.setFillColor(box.color[0], box.color[1], box.color[2]);
    doc.roundedRect(x, boxY, boxW, 22, 3, 3, "F");
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(String(box.value), x + boxW / 2, boxY + 11, { align: "center" });
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(box.label, x + boxW / 2, boxY + 18, { align: "center" });
  });

  doc.setFontSize(10);
  doc.text("Completion rate: " + completionRate + "%", 14, boxY + 32);

  const tableRows = periodTasks.map(function(t){
    return [t.text, t.category, t.priority.charAt(0).toUpperCase() + t.priority.slice(1), t.dueDate || "-", t.completed ? "Done" : "Pending"];
  });

  doc.autoTable({
    startY: boxY + 40,
    head: [["Task", "Category", "Priority", "Due Date", "Status"]],
    body: tableRows.length ? tableRows : [["No tasks in this period", "-", "-", "-", "-"]],
    headStyles: { fillColor: [91, 95, 240], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9, cellPadding: 4 }
  });

  doc.save("TaskReport_" + period + "_" + new Date().toISOString().split("T")[0] + ".pdf");
}

function renderPieChart(){
  const completed = tasks.filter(function(t){ return t.completed; }).length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const ring = document.getElementById("pieChartRing");
  const value = document.getElementById("pieChartValue");
  if(ring){ ring.style.setProperty("--pct", rate); }
  if(value){ value.innerText = rate + "%"; }
}

function renderLineChart(){
  const svg = document.getElementById("lineChartSvg");
  if(!svg) return;

  const months = [];
  const now = new Date();
  for(let i = 5; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString(undefined, { month: "short" }) });
  }

  const counts = months.map(function(m){
    return tasks.filter(function(t){
      if(!t.completed || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length;
  });

  const maxCount = Math.max.apply(null, counts.concat([1]));
  const padding = 20;
  const width = 280;
  const height = 120;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const stepX = chartW / (months.length - 1);

  let points = "";
  let circles = "";
  let labels = "";
  counts.forEach(function(c, i){
    const x = padding + i * stepX;
    const y = padding + chartH - (c / maxCount) * chartH;
    points += x + "," + y + " ";
    circles += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#5b5ff0"></circle>';
    labels += '<text x="' + x + '" y="' + (height - 4) + '" font-size="9" text-anchor="middle" fill="#9ca3af">' + months[i].label + '</text>';
  });

  svg.innerHTML =
    '<polyline points="' + points.trim() + '" fill="none" stroke="#5b5ff0" stroke-width="2"></polyline>' +
    circles + labels;
}

