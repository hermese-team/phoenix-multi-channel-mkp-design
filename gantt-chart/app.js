/* app.js */

// Task data loaded from data.json
let tasksData = [];

async function loadTasksData() {
  let data;

  try {
    const res = await fetch('data.json');
    if (res.ok) data = await res.json();
  } catch (e) {
    // fetch failed (e.g. file:// protocol), fall through to embedded data
  }

  if (!data) data = EMBEDDED_DATA;

  // Compile owners list and calculate durations dynamically
  data.forEach(task => {
    const ownersList = [];
    if (task.primaryOwner) ownersList.push(task.primaryOwner);
    if (task.supportingOwners) {
      task.supportingOwners.forEach(o => {
        if (!ownersList.includes(o)) ownersList.push(o);
      });
    }
    if (task.qaOwner) {
      const qas = task.qaOwner.split(',').map(q => q.trim());
      qas.forEach(q => {
        if (!ownersList.includes(q)) ownersList.push(q);
      });
    }
    task.owners = ownersList;

    if (task.isMilestone) {
      task.duration = 0;
    } else {
      const s = new Date(task.start);
      const e = new Date(task.end);
      task.duration = Math.ceil((e - s) / (24 * 60 * 60 * 1000)) + 1;
    }
  });

  // Merge saved task overrides (name, rationale)
  try {
    const saved = JSON.parse(localStorage.getItem('phoenix_gantt_task_overrides') || '{}');
    data.forEach(task => {
      const o = saved[task.id];
      if (o) {
        if (o.name) task.name = o.name;
        if (o.rationale) task.rationale = o.rationale;
      }
    });
  } catch (e) {}

  // Extract progress from data.json (if present) for new users without localStorage
  const progressFromData = {};
  data.forEach(task => {
    if (task.progress !== undefined && task.progress !== null) {
      progressFromData[task.id] = Number(task.progress);
    }
    delete task.progress;
  });
  importedProgress = progressFromData;

  tasksData = data;
}

// Project timeline configuration
const projectStart = new Date("2026-06-29");
const projectEnd = new Date("2026-11-06"); // Extended to cover hypercare
const totalProjectDays = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24)) + 1; // 131 days

// State management
let resolvedDependencies = {};
let currentZoom = 15; // pixels per day
let collapsedSections = new Set();
let selectedTaskId = null;
let currentModalTaskId = null;

// Initialize resolved dependencies from localStorage
function initAppState() {
  const savedState = localStorage.getItem('phoenix_gantt_dependencies');
  if (savedState) {
    resolvedDependencies = JSON.parse(savedState);
    // Ensure all data tasks are modeled in savedState
    tasksData.forEach(task => {
      if (task.predecessors.length > 0) {
        if (!resolvedDependencies[task.id]) {
          resolvedDependencies[task.id] = {};
        }
        task.predecessors.forEach(predId => {
          if (!resolvedDependencies[task.id][predId]) {
            resolvedDependencies[task.id][predId] = { resolved: false, note: "" };
          }
        });
      }
    });
  } else {
    // Generate default empty state
    tasksData.forEach(task => {
      if (task.predecessors.length > 0) {
        resolvedDependencies[task.id] = {};
        task.predecessors.forEach(predId => {
          resolvedDependencies[task.id][predId] = { resolved: false, note: "" };
        });
      }
    });
    saveState();
  }
}

function saveState() {
  localStorage.setItem('phoenix_gantt_dependencies', JSON.stringify(resolvedDependencies));
  updateBadges();
}

// Progress state management
let taskProgress = {};
let importedProgress = {};
function initProgress() {
  const saved = localStorage.getItem('phoenix_gantt_progress');
  if (saved) {
    taskProgress = JSON.parse(saved);
  } else if (Object.keys(importedProgress).length > 0) {
    taskProgress = { ...importedProgress };
    saveProgress();
  }
}
function saveProgress() {
  localStorage.setItem('phoenix_gantt_progress', JSON.stringify(taskProgress));
}
function getTaskProgress(taskId) {
  return taskProgress[taskId] || 0;
}
function setTaskProgress(taskId, value) {
  taskProgress[taskId] = Math.max(0, Math.min(100, Math.round(value)));
  saveProgress();
}

// Notes state management
let taskNotes = {};
function initNotes() {
  const saved = localStorage.getItem('phoenix_gantt_notes');
  if (saved) taskNotes = JSON.parse(saved);
}
function saveNotes() {
  localStorage.setItem('phoenix_gantt_notes', JSON.stringify(taskNotes));
}
function getTaskNote(taskId) {
  return taskNotes[taskId] || '';
}
function setTaskNote(taskId, text) {
  taskNotes[taskId] = text;
  saveNotes();
}

// Save task field override (name, rationale) to localStorage and tasksData
function saveTaskOverride(taskId, field, value) {
  const task = tasksData.find(t => t.id === taskId);
  if (task) task[field] = value;
  try {
    const all = JSON.parse(localStorage.getItem('phoenix_gantt_task_overrides') || '{}');
    if (!all[taskId]) all[taskId] = {};
    all[taskId][field] = value;
    localStorage.setItem('phoenix_gantt_task_overrides', JSON.stringify(all));
  } catch (e) {}
}

// Download full dataset as JSON
function downloadJSON() {
  const exportData = tasksData.map(task => ({
    ...task,
    note: getTaskNote(task.id),
    progress: getTaskProgress(task.id) || 0
  }));
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Compute if a task is currently blocked
function isTaskBlocked(taskId) {
  const deps = resolvedDependencies[taskId];
  if (!deps) return false;

  // A task is blocked if ANY of its predecessors is NOT resolved
  return Object.values(deps).some(dep => !dep.resolved);
}

// Update the blocked badge count and indicators
function updateBadges() {
  let blockedCount = 0;
  tasksData.forEach(task => {
    if (!task.isMilestone && task.predecessors.length > 0) {
      if (isTaskBlocked(task.id)) {
        blockedCount++;
      }
    }
  });

  const badge = document.getElementById('blocked-count-badge');
  badge.textContent = blockedCount;
  if (blockedCount > 0) {
    badge.classList.add('warning');
  } else {
    badge.classList.remove('warning');
  }
}

// Format date into YYYY-MM-DD
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Get finish date from start date and duration (in calendar days)
function calculateFinishDate(startStr, duration) {
  if (duration === 0) return startStr;
  const start = new Date(startStr);
  const finish = new Date(start.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
  return formatDate(finish);
}

const DAY_MS = 1000 * 60 * 60 * 24;

// Days from projectStart for a date string (mirrors task-bar positioning)
function getStartDayOffset(startStr) {
  return Math.ceil(Math.abs(new Date(startStr) - projectStart) / DAY_MS);
}

// Today reference for progress tracking
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayOffset = Math.floor((today - projectStart) / DAY_MS);

function getExpectedProgress(task) {
  if (task.isMilestone) return todayOffset >= getStartDayOffset(task.start) ? 100 : 0;
  const sOff = getStartDayOffset(task.start);
  const eOff = sOff + task.duration;
  if (todayOffset < sOff) return 0;
  if (todayOffset >= eOff) return 100;
  return Math.round(((todayOffset - sOff) / task.duration) * 100);
}

function getProgressFillClass(actual, expected) {
  if (actual === 0) return 'fill-grey';
  if (actual >= expected) return 'fill-green';
  return 'fill-yellow';
}

// Roll up a list of tasks into a single timeline span (earliest start -> latest finish)
function calculateGroupBounds(tasks) {
  let startDay = Infinity;
  let endDay = -Infinity;
  tasks.forEach(t => {
    const s = getStartDayOffset(t.start);
    startDay = Math.min(startDay, s);
    endDay = Math.max(endDay, s + t.duration);
  });
  if (!isFinite(startDay)) return null;
  return {
    startDay,
    endDay,
    durationDays: endDay - startDay,
    startStr: formatDate(new Date(projectStart.getTime() + startDay * DAY_MS)),
    finishStr: formatDate(new Date(projectStart.getTime() + (endDay - 1) * DAY_MS)),
  };
}

// Generate the visual headers for the timeline
function renderTimelineHeaders() {
  const monthRow = document.getElementById('month-header-row');
  const sprintRow = document.getElementById('sprint-header-row');
  const dayRow = document.getElementById('day-header-row');

  monthRow.innerHTML = '';
  sprintRow.innerHTML = '';
  dayRow.innerHTML = '';

  const monthGroups = [];
  const sprintGroups = [];

  let currentMonthName = "";
  let currentMonthSpan = 0;
  let currentMonthHasWeekend = false;

  let currentSprintNum = 14;
  let currentSprintSpan = 0;

  for (let i = 0; i < totalProjectDays; i++) {
    const currentDate = new Date(projectStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    // Day cell
    const dayCell = document.createElement('div');
    dayCell.className = `header-cell day-cell ${isWeekend ? 'weekend' : ''}`;
    dayCell.style.width = `${currentZoom}px`;

    const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek];
    dayCell.innerHTML = `
      <span class="day-num">${currentDate.getDate()}</span>
      <span class="day-letter">${dayLetter}</span>
    `;
    dayRow.appendChild(dayCell);

    // Group Sprints (2 weeks starting with Sprint 14 on Day 0)
    const sprintIndex = Math.floor(i / 14);
    const sprintNum = 14 + sprintIndex;

    if (sprintGroups.length === 0 || sprintGroups[sprintGroups.length - 1].sprintNum !== sprintNum) {
      sprintGroups.push({
        sprintNum: sprintNum,
        spanDays: 1
      });
    } else {
      sprintGroups[sprintGroups.length - 1].spanDays++;
    }

    // Group Months
    const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (monthGroups.length === 0 || monthGroups[monthGroups.length - 1].label !== monthLabel) {
      monthGroups.push({
        label: monthLabel,
        spanDays: 1
      });
    } else {
      monthGroups[monthGroups.length - 1].spanDays++;
    }
  }

  // Render Months
  monthGroups.forEach(m => {
    const cell = document.createElement('div');
    cell.className = 'header-cell';
    cell.style.width = `${m.spanDays * currentZoom}px`;
    cell.textContent = m.label;
    monthRow.appendChild(cell);
  });

  // Render Sprints
  sprintGroups.forEach(s => {
    const cell = document.createElement('div');
    cell.className = 'header-cell';
    cell.style.width = `${s.spanDays * currentZoom}px`;
    cell.textContent = `Sprint ${s.sprintNum}`;
    sprintRow.appendChild(cell);
  });
}

// Generate the background grid vertical columns
function renderGridBackground() {
  const gridBg = document.getElementById('grid-background');
  gridBg.innerHTML = '';

  for (let i = 0; i < totalProjectDays; i++) {
    const currentDate = new Date(projectStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = currentDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    const col = document.createElement('div');
    col.className = `grid-col ${isWeekend ? 'weekend' : ''}`;
    col.style.width = `${currentZoom}px`;
    gridBg.appendChild(col);
  }
}

// Get the color and text styling for owner chips
function getOwnerChipHTML(owner) {
  let typeClass = 'dev-owner';
  if (owner.startsWith('QA') || owner === 'QA Lead') {
    typeClass = 'qa-owner';
  } else if (owner === 'TL') {
    typeClass = 'tl-owner';
  }
  return `<span class="owner-chip ${typeClass}">${owner}</span>`;
}

// Check if a task matches current filters
function taskMatchesFilters(task, searchTerm, sectionFilter, ownerFilter) {
  // 1. Search term check
  if (searchTerm) {
    const nameMatch = task.name.toLowerCase().includes(searchTerm);
    const ownerMatch = task.owners.some(owner => owner.toLowerCase().includes(searchTerm));
    const idMatch = task.id.toLowerCase().includes(searchTerm);
    if (!nameMatch && !ownerMatch && !idMatch) return false;
  }

  // 2. Section check
  if (sectionFilter !== 'all' && task.section !== sectionFilter) {
    return false;
  }

  // 3. Owner check
  if (ownerFilter !== 'all' && !task.owners.includes(ownerFilter)) {
    return false;
  }

  return true;
}

// Main render function for WBS Table and Gantt Bars
function renderGantt() {
  const wbsBody = document.getElementById('wbs-body');
  const barsContainer = document.getElementById('bars-container');

  wbsBody.innerHTML = '';
  barsContainer.innerHTML = '';

  const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
  const sectionFilter = document.getElementById('filter-section').value;
  const ownerFilter = document.getElementById('filter-owner').value;

  // Group tasks by section
  const sections = {};
  tasksData.forEach(task => {
    if (!sections[task.section]) {
      sections[task.section] = [];
    }
    sections[task.section].push(task);
  });

  let globalIndex = 1;

  Object.keys(sections).forEach(sectionName => {
    const sectionTasks = sections[sectionName];
    const filteredSectionTasks = sectionTasks.filter(t => taskMatchesFilters(t, searchTerm, sectionFilter, ownerFilter));

    // If we're filtering, and no items match in this section, skip the section heading
    if (filteredSectionTasks.length === 0 && (searchTerm || sectionFilter !== 'all' || ownerFilter !== 'all')) {
      return;
    }

    const isSectionCollapsed = collapsedSections.has(sectionName);

    // Compute section aggregate progress
    const sectionNonMilestone = sectionTasks.filter(t => !t.isMilestone);
    const totalEffort = sectionNonMilestone.reduce((sum, t) => sum + (t.effort || t.duration), 0);
    const completedEffort = sectionNonMilestone.reduce((sum, t) => sum + (t.effort || t.duration) * getTaskProgress(t.id) / 100, 0);
    const sectionAggProgress = totalEffort > 0 ? Math.round(completedEffort / totalEffort * 100) : 0;

    // Roll up the section's visible tasks into a single group span
    const groupBounds = calculateGroupBounds(filteredSectionTasks);

    // 1. Render Section Heading Row in WBS & Timeline
    const secRowId = `sec-${sectionName.replace(/\s+/g, '-')}`;

    // WBS section row
    const wbsSecRow = document.createElement('div');
    wbsSecRow.className = `wbs-row wbs-section-row`;
    wbsSecRow.dataset.section = sectionName;
    wbsSecRow.innerHTML = `
      <div class="wbs-cell cell-id"></div>
      <div class="wbs-cell cell-indicators"></div>
      <div class="wbs-cell cell-wbs"></div>
      <div class="wbs-cell cell-name" style="padding-left: 5px;">
        <span class="section-toggle ${isSectionCollapsed ? 'collapsed' : ''}"><i class="fa-solid fa-chevron-down"></i></span>
        <i class="fa-solid fa-folder-open" style="margin-right: 6px; color: #60a5fa;"></i> ${sectionName}
      </div>
      <div class="wbs-cell cell-start">${groupBounds ? groupBounds.startStr : ''}</div>
      <div class="wbs-cell cell-finish">${groupBounds ? groupBounds.finishStr : ''}</div>
      <div class="wbs-cell cell-duration">${groupBounds ? groupBounds.durationDays + 'd' : ''}</div>
      <div class="wbs-cell cell-progress">${sectionAggProgress}%</div>
      <div class="wbs-cell cell-owners"></div>
      <div class="wbs-cell cell-predecessors"></div>
    `;

    // Toggle collapse handler
    wbsSecRow.querySelector('.section-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (collapsedSections.has(sectionName)) {
        collapsedSections.delete(sectionName);
      } else {
        collapsedSections.add(sectionName);
      }
      renderGantt();
    });

    wbsBody.appendChild(wbsSecRow);

    // Timeline section row (background highlight only)
    const timelineSecRow = document.createElement('div');
    timelineSecRow.className = 'timeline-row wbs-section-row';
    timelineSecRow.style.width = `${totalProjectDays * currentZoom}px`;

    // When collapsed, draw a rollup bar spanning the whole group's timeline.
    // Styled exactly like a subtask bar, reflecting the group's aggregate
    // progress: any blocked -> amber border, fill colored by aggregate progress.
    if (isSectionCollapsed && groupBounds && groupBounds.durationDays > 0) {
      const groupBlocked = filteredSectionTasks.some(t => isTaskBlocked(t.id));
      const aggExpected = totalEffort > 0
        ? Math.round(sectionNonMilestone.reduce((sum, t) => sum + (t.effort || t.duration) * getExpectedProgress(t) / 100, 0) / totalEffort * 100)
        : 0;
      const fillClass = getProgressFillClass(sectionAggProgress, aggExpected);

      const rollup = document.createElement('div');
      rollup.className = 'task-bar-wrapper';
      rollup.style.left = `${groupBounds.startDay * currentZoom}px`;
      rollup.style.width = `${groupBounds.durationDays * currentZoom}px`;

      const bar = document.createElement('div');
      bar.className = `task-bar ${groupBlocked ? 'task-bar-blocked' : ''}`;
      bar.title = `${sectionName} | ${sectionAggProgress}% complete | Expected: ${aggExpected}% | ${groupBounds.startStr} to ${groupBounds.finishStr}`;

      const fill = document.createElement('div');
      fill.className = `task-bar-fill ${fillClass}`;
      fill.style.width = `${sectionAggProgress}%`;
      bar.appendChild(fill);

      // Percentage label centered on bar
      const pctLabel = document.createElement('span');
      pctLabel.className = 'task-bar-pct';
      pctLabel.textContent = `${sectionAggProgress}%`;
      bar.appendChild(pctLabel);

      rollup.appendChild(bar);

      const label = document.createElement('span');
      label.className = 'bar-resource-label';
      label.textContent = `${sectionAggProgress}% (${groupBounds.startStr} → ${groupBounds.finishStr})`;
      rollup.appendChild(label);

      rollup.addEventListener('click', () => {
        collapsedSections.delete(sectionName);
        renderGantt();
      });

      timelineSecRow.appendChild(rollup);
    }

    barsContainer.appendChild(timelineSecRow);

    // 2. Render Section Tasks
    sectionTasks.forEach(task => {
      const isVisible = taskMatchesFilters(task, searchTerm, sectionFilter, ownerFilter);
      const isCollapsed = isSectionCollapsed;

      if (!isVisible && (searchTerm || sectionFilter !== 'all' || ownerFilter !== 'all')) {
        return;
      }

      const finishDate = calculateFinishDate(task.start, task.duration);
      const isBlocked = isTaskBlocked(task.id);

      // Build WBS Row
      const wbsRow = document.createElement('div');
      wbsRow.className = `wbs-row ${isCollapsed ? 'hidden' : ''} ${selectedTaskId === task.id ? 'selected' : ''}`;
      wbsRow.dataset.id = task.id;

      // Indicators column HTML
      let indicatorHTML = '';
      if (task.predecessors.length > 0) {
        if (isBlocked) {
          indicatorHTML = `<i class="fa-solid fa-triangle-exclamation indicator-btn blocked" title="Blocked by unresolved dependencies"></i>`;
        } else {
          indicatorHTML = `<i class="fa-solid fa-circle-check indicator-btn" style="color: var(--color-emerald)" title="All dependencies resolved"></i>`;
        }
      }

      // Check if there are saved notes in dependencies
      const taskDeps = resolvedDependencies[task.id];
      let hasNotes = false;
      if (taskDeps) {
        hasNotes = Object.values(taskDeps).some(dep => dep.note && dep.note.trim().length > 0);
      }
      if (hasNotes) {
        indicatorHTML += ` <i class="fa-solid fa-file-lines indicator-btn has-notes" title="Contains resolution notes"></i>`;
      }

      wbsRow.innerHTML = `
        <div class="wbs-cell cell-id">${globalIndex++}</div>
        <div class="wbs-cell cell-indicators">${indicatorHTML}</div>
        <div class="wbs-cell cell-wbs">${task.id}</div>
        <div class="wbs-cell cell-name" style="padding-left: 20px;">
          ${task.isMilestone ? '<i class="fa-solid fa-circle" style="font-size: 8px; margin-right: 6px; color: #94a3b8;"></i>' : '<i class="fa-solid fa-file" style="font-size: 10px; margin-right: 6px; color: #64748b;"></i>'}
          <span style="${task.isCritical && !isCollapsed ? 'font-weight: 500;' : ''}">${task.name}</span>
        </div>
        <div class="wbs-cell cell-start">${task.start}</div>
        <div class="wbs-cell cell-finish">${finishDate}</div>
        <div class="wbs-cell cell-duration">${task.isMilestone ? '0d' : task.duration + 'd'}</div>
        <div class="wbs-cell cell-progress">${task.isMilestone ? '—' : getTaskProgress(task.id) + '%'}</div>
        <div class="wbs-cell cell-owners">${task.owners.map(o => getOwnerChipHTML(o)).join('')}</div>
        <div class="wbs-cell cell-predecessors">${task.predecessors.join(', ')}</div>
      `;

      wbsRow.addEventListener('click', () => {
        selectTask(task.id);
        openTaskModal(task);
      });
      wbsBody.appendChild(wbsRow);

      // Build Timeline Row and Task Bar
      const timelineRow = document.createElement('div');
      timelineRow.className = `timeline-row ${isCollapsed ? 'hidden' : ''} ${selectedTaskId === task.id ? 'selected' : ''}`;
      timelineRow.dataset.id = task.id;
      timelineRow.style.width = `${totalProjectDays * currentZoom}px`;

      // Position calculation
      const startDate = new Date(task.start);
      const diffTime = Math.abs(startDate - projectStart);
      const startDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const leftPx = startDays * currentZoom;
      const widthPx = task.duration * currentZoom;

      if (task.isMilestone) {
        // Milestone diamond representation
        const wrapper = document.createElement('div');
        wrapper.className = 'task-bar-milestone-wrapper';
        wrapper.style.left = `${leftPx}px`;

        const diamond = document.createElement('div');
        diamond.className = 'task-bar-milestone';
        diamond.title = `${task.name} (${task.start})`;

        const label = document.createElement('span');
        label.className = 'bar-milestone-label';
        label.textContent = task.name;

        wrapper.appendChild(diamond);
        wrapper.appendChild(label);

        wrapper.addEventListener('click', () => {
          selectTask(task.id);
          openTaskModal(task);
        });

        timelineRow.appendChild(wrapper);
      } else {
        // Regular or critical task bar with progress fill
        const wrapper = document.createElement('div');
        wrapper.className = 'task-bar-wrapper';
        wrapper.style.left = `${leftPx}px`;
        wrapper.style.width = `${widthPx}px`;

        const bar = document.createElement('div');

        const pct = getTaskProgress(task.id);
        const expected = getExpectedProgress(task);
        const fillClass = getProgressFillClass(pct, expected);

        bar.className = `task-bar ${isBlocked ? 'task-bar-blocked' : ''}`;
        bar.title = `${task.name} | ${pct}% complete | Expected: ${expected}% | Duration: ${task.duration}d`;

        const fill = document.createElement('div');
        fill.className = `task-bar-fill ${fillClass}`;
        fill.style.width = `${pct}%`;
        bar.appendChild(fill);

        // Percentage label centered on bar
        const pctLabel = document.createElement('span');
        pctLabel.className = 'task-bar-pct';
        pctLabel.textContent = `${pct}%`;
        bar.appendChild(pctLabel);

        // Owner label on timeline
        const label = document.createElement('span');
        label.className = 'bar-resource-label';
        label.textContent = `${task.owners.join(', ')} (${pct}%)`;

        wrapper.appendChild(bar);
        wrapper.appendChild(label);

        wrapper.addEventListener('click', () => {
          selectTask(task.id);
          openTaskModal(task);
        });

        timelineRow.appendChild(wrapper);
      }

      barsContainer.appendChild(timelineRow);
    });
  });

  // Draw today line
  let todayLine = document.getElementById('today-line');
  if (!todayLine) {
    todayLine = document.createElement('div');
    todayLine.id = 'today-line';
    todayLine.className = 'today-line';
    document.getElementById('timeline-body').appendChild(todayLine);
  }
  todayLine.style.left = `${todayOffset * currentZoom}px`;
  todayLine.style.display = (todayOffset >= 0 && todayOffset <= totalProjectDays) ? 'block' : 'none';

  // Sync scrolling between WBS body and Timeline container vertically
  syncScroll();

  // Draw SVG lines (after a microtask to allow elements to lay out in DOM)
  setTimeout(drawDependencyLines, 0);
}

// Maintain vertical scrolling alignment
function syncScroll() {
  const wbsBody = document.getElementById('wbs-body');
  const scrollContainer = document.getElementById('timeline-scroll-container');

  let isSyncingWbs = false;
  let isSyncingScroll = false;

  wbsBody.addEventListener('scroll', () => {
    if (!isSyncingWbs) {
      isSyncingScroll = true;
      scrollContainer.scrollTop = wbsBody.scrollTop;
      isSyncingScroll = false;
    }
  });

  scrollContainer.addEventListener('scroll', () => {
    if (!isSyncingScroll) {
      isSyncingWbs = true;
      wbsBody.scrollTop = scrollContainer.scrollTop;
      isSyncingWbs = false;
    }
  });
}

// Highlight selected rows in WBS & Timeline
function selectTask(taskId) {
  selectedTaskId = taskId;

  document.querySelectorAll('.wbs-row').forEach(row => {
    if (row.dataset.id === taskId) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });

  document.querySelectorAll('.timeline-row').forEach(row => {
    if (row.dataset.id === taskId) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });

  // Highlight active SVG dependency lines
  document.querySelectorAll('.dep-line').forEach(line => {
    if (line.dataset.successor === taskId || line.dataset.predecessor === taskId) {
      line.classList.add('dep-active');
    } else {
      line.classList.remove('dep-active');
    }
  });
}

// Draw Microsoft Project style dependency arrows on SVG
function drawDependencyLines() {
  const svg = document.getElementById('dependency-svg');
  svg.innerHTML = '';

  // Define SVG Marker for Arrowheads
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  // Unresolved dependency marker
  const markerBlocked = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  markerBlocked.setAttribute("id", "arrow-blocked");
  markerBlocked.setAttribute("viewBox", "0 0 10 10");
  markerBlocked.setAttribute("refX", "6");
  markerBlocked.setAttribute("refY", "5");
  markerBlocked.setAttribute("markerWidth", "6");
  markerBlocked.setAttribute("markerHeight", "6");
  markerBlocked.setAttribute("orient", "auto-start-reverse");
  markerBlocked.innerHTML = `<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-amber)" />`;
  defs.appendChild(markerBlocked);

  // Normal/Resolved dependency marker
  const markerNormal = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  markerNormal.setAttribute("id", "arrow-normal");
  markerNormal.setAttribute("viewBox", "0 0 10 10");
  markerNormal.setAttribute("refX", "6");
  markerNormal.setAttribute("refY", "5");
  markerNormal.setAttribute("markerWidth", "6");
  markerNormal.setAttribute("markerHeight", "6");
  markerNormal.setAttribute("orient", "auto-start-reverse");
  markerNormal.innerHTML = `<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-muted)" />`;
  defs.appendChild(markerNormal);

  // Active/selected dependency marker
  const markerActive = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  markerActive.setAttribute("id", "arrow-active");
  markerActive.setAttribute("viewBox", "0 0 10 10");
  markerActive.setAttribute("refX", "6");
  markerActive.setAttribute("refY", "5");
  markerActive.setAttribute("markerWidth", "6");
  markerActive.setAttribute("markerHeight", "6");
  markerActive.setAttribute("orient", "auto-start-reverse");
  markerActive.innerHTML = `<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-indigo)" />`;
  defs.appendChild(markerActive);

  svg.appendChild(defs);

  // Get positions relative to timeline-body
  const timelineBody = document.getElementById('timeline-body');
  const containerRect = timelineBody.getBoundingClientRect();

  tasksData.forEach(task => {
    // Check if task is visible
    const successorRow = document.querySelector(`.timeline-row[data-id="${task.id}"]`);
    if (!successorRow || successorRow.classList.contains('hidden')) return;

    task.predecessors.forEach(predId => {
      const predecessorRow = document.querySelector(`.timeline-row[data-id="${predId}"]`);
      if (!predecessorRow || predecessorRow.classList.contains('hidden')) return;

      const predTask = tasksData.find(t => t.id === predId);
      if (!predTask) return;

      // Find the visual bar wrappers inside the rows
      const predBar = predecessorRow.querySelector('.task-bar-wrapper, .task-bar-milestone-wrapper');
      const succBar = successorRow.querySelector('.task-bar-wrapper, .task-bar-milestone-wrapper');

      if (!predBar || !succBar) return;

      const predRect = predBar.getBoundingClientRect();
      const succRect = succBar.getBoundingClientRect();

      // Calculate coordinates relative to the timeline body container
      const x1 = predRect.right - containerRect.left;
      const y1 = (predRect.top + predRect.bottom) / 2 - containerRect.top;

      const x2 = succRect.left - containerRect.left;
      const y2 = (succRect.top + succRect.bottom) / 2 - containerRect.top;

      // State check
      const isResolved = resolvedDependencies[task.id] && resolvedDependencies[task.id][predId].resolved;

      // Create path element
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.dataset.predecessor = predId;
      path.dataset.successor = task.id;

      let lineClass = 'dep-line';
      let markerUrl = 'url(#arrow-normal)';

      if (!isResolved) {
        lineClass += ' dep-blocked';
        markerUrl = 'url(#arrow-blocked)';
      }

      if (selectedTaskId === task.id || selectedTaskId === predId) {
        lineClass += ' dep-active';
        markerUrl = 'url(#arrow-active)';
      }

      path.setAttribute("class", lineClass);
      path.setAttribute("marker-end", markerUrl);

      // Build orthonormal path route
      let d = "";
      const gap = 12; // offset padding

      if (x1 + gap < x2) {
        // Normal flow: predecessor ends before successor starts
        const midX = x1 + gap;
        d = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
      } else {
        // Backwards/overlap flow
        const midY = y1 + (y2 - y1) / 2;
        d = `M ${x1} ${y1} H ${x1 + gap} V ${midY} H ${x2 - gap} V ${y2} H ${x2}`;
      }

      path.setAttribute("d", d);
      svg.appendChild(path);
    });
  });
}

// Modal Interaction
function formatRationale(text) {
  if (!text) return '<span class="rationale-empty">No detailed rationale provided in the plan.</span>';
  const escapeHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const renderInline = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const lines = text.split('\n');
  let html = '', inList = false;
  for (const raw of lines) {
    const line = escapeHtml(raw);
    const isBullet = /^[-*]\s/.test(line);
    if (isBullet) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += '<li>' + renderInline(line.replace(/^[-*]\s+/, '')) + '</li>';
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (line) {
        html += '<p>' + renderInline(line) + '</p>';
      }
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function openTaskModal(task) {
  const modal = document.getElementById('task-modal');

  // Set basic task fields
  document.getElementById('modal-task-title').value = task.name;
  document.getElementById('modal-task-wbs').textContent = `${task.id} (WBS ${task.wbs})`;
  document.getElementById('modal-task-section').textContent = task.section;
  document.getElementById('modal-task-start').textContent = task.start;
  document.getElementById('modal-task-finish').textContent = calculateFinishDate(task.start, task.duration);

  // Progress
  const pct = getTaskProgress(task.id);
  const slider = document.getElementById('modal-progress-slider');
  const val = document.getElementById('modal-progress-val');
  slider.value = pct;
  val.textContent = `${pct}%`;
  currentModalTaskId = task.id;

  document.getElementById('modal-task-duration').textContent = task.isMilestone ? 'Milestone (0 Days)' : `${task.duration} Days`;
  document.getElementById('modal-task-effort').textContent = task.effort !== undefined ? `${task.effort} MD` : '—';
  let ownersHTML = '';
  if (task.primaryOwner) {
    ownersHTML += `<div><strong style="font-size: 11px; color: var(--text-secondary);">Primary:</strong> ${getOwnerChipHTML(task.primaryOwner)}</div>`;
  }
  if (task.supportingOwners && task.supportingOwners.length > 0) {
    ownersHTML += `<div style="margin-top: 4px;"><strong style="font-size: 11px; color: var(--text-secondary);">Supporting:</strong> ${task.supportingOwners.map(o => getOwnerChipHTML(o)).join(' ')}</div>`;
  }
  if (task.qaOwner) {
    const qas = task.qaOwner.split(',').map(q => q.trim());
    ownersHTML += `<div style="margin-top: 4px;"><strong style="font-size: 11px; color: var(--text-secondary);">QA:</strong> ${qas.map(q => getOwnerChipHTML(q)).join(' ')}</div>`;
  }
  document.getElementById('modal-task-owners').innerHTML = ownersHTML || task.owners.map(o => getOwnerChipHTML(o)).join(' ');
  document.getElementById('modal-task-rationale').value = task.rationale;

  // Notes
  document.getElementById('modal-task-notes').value = getTaskNote(task.id);

  const tbody = document.getElementById('modal-dependencies-tbody');
  tbody.innerHTML = '';

  if (task.predecessors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); font-style: italic;">
          No predecessors defined for this task.
        </td>
      </tr>
    `;
  } else {
    task.predecessors.forEach(predId => {
      const predTask = tasksData.find(t => t.id === predId);
      const name = predTask ? predTask.name : "Unknown Task";

      const isResolved = resolvedDependencies[task.id][predId].resolved;
      const note = resolvedDependencies[task.id][predId].note || "";

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-weight: bold;">${predId}</td>
        <td>${name}</td>
        <td style="text-align: center;">
          <div class="dep-status-badge ${isResolved ? 'status-resolved' : 'status-unresolved'}" data-pred="${predId}">
            ${isResolved ? '<i class="fa-solid fa-circle-check"></i> Resolved' : '<i class="fa-solid fa-circle-xmark"></i> Unresolved'}
          </div>
        </td>
        <td>
          <input type="text" class="dep-note-input" data-pred="${predId}" placeholder="Add note (e.g. specs approved)..." value="${note}">
        </td>
      `;

      // Status badge toggle handler
      const badge = tr.querySelector('.dep-status-badge');
      badge.addEventListener('click', () => {
        const pId = badge.dataset.pred;
        const currentStatus = resolvedDependencies[task.id][pId].resolved;
        resolvedDependencies[task.id][pId].resolved = !currentStatus;

        // Refresh inline badge UI
        if (resolvedDependencies[task.id][pId].resolved) {
          badge.className = 'dep-status-badge status-resolved';
          badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Resolved';
        } else {
          badge.className = 'dep-status-badge status-unresolved';
          badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Unresolved';
        }

        saveState();
        renderGantt();
        selectTask(task.id);
      });

      // Notes input handler (auto-saves on input edit)
      const input = tr.querySelector('.dep-note-input');
      input.addEventListener('input', (e) => {
        const pId = input.dataset.pred;
        resolvedDependencies[task.id][pId].note = e.target.value;
        saveState();
        // Render Gantt to update indicator on WBS table
        renderGantt();
        selectTask(task.id);
      });

      tbody.appendChild(tr);
    });
  }

  modal.classList.add('show');
}

function closeTaskModal() {
  const modal = document.getElementById('task-modal');
  modal.classList.remove('show');
}

// Window resizing adjustments
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    drawDependencyLines();
  }, 100);
});

// Setup Left WBS Pane resizing functionality
function setupSplitter() {
  const splitter = document.getElementById('pane-splitter');
  const wbsPane = document.getElementById('wbs-pane');
  let isResizing = false;

  splitter.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth > 200 && newWidth < 800) {
      wbsPane.style.width = newWidth + 'px';
      document.documentElement.style.setProperty('--wbs-width', newWidth + 'px');
      drawDependencyLines();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      drawDependencyLines();
    }
  });
}

// Setup per-column resizing inside the frozen WBS pane
function setupColumnResize() {
  // Map each header cell's column class to its CSS width variable + min width
  const COLUMN_VARS = {
    'cell-id': { varName: '--col-id-w', min: 30 },
    'cell-indicators': { varName: '--col-ind-w', min: 30 },
    'cell-wbs': { varName: '--col-wbs-w', min: 30 },
    'cell-name': { varName: '--col-name-w', min: 80 },
    'cell-start': { varName: '--col-start-w', min: 50 },
    'cell-finish': { varName: '--col-finish-w', min: 50 },
    'cell-duration': { varName: '--col-duration-w', min: 40 },
    'cell-progress': { varName: '--col-progress-w', min: 50 },
    'cell-owners': { varName: '--col-owners-w', min: 60 },
    'cell-predecessors': { varName: '--col-pred-w', min: 60 },
  };

  const rootStyle = document.documentElement.style;
  const headerCells = document.querySelectorAll('.wbs-header-row .wbs-header-cell');

  let active = null; // { varName, min, startX, startWidth, handle }

  headerCells.forEach(cell => {
    const colClass = Object.keys(COLUMN_VARS).find(c => cell.classList.contains(c));
    if (!colClass) return;
    const { varName, min } = COLUMN_VARS[colClass];

    const handle = document.createElement('div');
    handle.className = 'col-resize-handle';

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = parseInt(getComputedStyle(cell).width, 10);
      active = { varName, min, startX: e.clientX, startWidth: current, handle };
      handle.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    cell.appendChild(handle);
  });

  document.addEventListener('mousemove', (e) => {
    if (!active) return;
    const newWidth = Math.max(active.min, active.startWidth + (e.clientX - active.startX));
    rootStyle.setProperty(active.varName, newWidth + 'px');
  });

  document.addEventListener('mouseup', () => {
    if (!active) return;
    active.handle.classList.remove('resizing');
    active = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    drawDependencyLines();
  });
}

// Event Listeners Initialization
function initEventListeners() {
  // Search
  document.getElementById('search-input').addEventListener('input', renderGantt);

  // Filters
  document.getElementById('filter-section').addEventListener('change', renderGantt);
  document.getElementById('filter-owner').addEventListener('change', renderGantt);

  // Zoom
  const zoomSlider = document.getElementById('zoom-slider');
  zoomSlider.addEventListener('input', (e) => {
    currentZoom = parseInt(e.target.value);
    document.getElementById('zoom-val').textContent = `${currentZoom}px/day`;
    renderTimelineHeaders();
    renderGridBackground();
    renderGantt();
  });

  // Trackpad pinch-to-zoom
  const timelinePane = document.getElementById('timeline-pane');
  timelinePane.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();

      const minZoom = parseInt(zoomSlider.min);
      const maxZoom = parseInt(zoomSlider.max);

      // Trackpad pinch deltaY is usually smaller but smooth.
      const zoomChange = -e.deltaY * 0.15;
      let newZoom = currentZoom + zoomChange;
      newZoom = Math.max(minZoom, Math.min(maxZoom, Math.round(newZoom)));

      if (newZoom !== currentZoom) {
        const scrollContainer = document.getElementById('timeline-scroll-container');
        const containerLeft = scrollContainer.getBoundingClientRect().left;
        const clientXInContainer = e.clientX - containerLeft;

        // Position of mouse cursor in the scrollable space before zoom
        const mouseXInScroll = clientXInContainer + scrollContainer.scrollLeft;

        // Ratio of X position to currentZoom
        const ratio = mouseXInScroll / currentZoom;

        // Apply zoom change
        currentZoom = newZoom;
        zoomSlider.value = currentZoom;
        document.getElementById('zoom-val').textContent = `${currentZoom}px/day`;

        renderTimelineHeaders();
        renderGridBackground();
        renderGantt();

        // Scroll to maintain the cursor position
        const newScrollLeft = (ratio * currentZoom) - clientXInContainer;
        scrollContainer.scrollLeft = newScrollLeft;
      }
    }
  }, { passive: false });

  // Projection chart
  document.getElementById('projection-btn').addEventListener('click', openProjectionModal);

  // Save Data
  document.getElementById('save-btn').addEventListener('click', downloadJSON);

  // Task name inline save (Enter or blur)
  const titleInput = document.getElementById('modal-task-title');
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInput.blur();
    }
  });
  titleInput.addEventListener('blur', () => {
    if (!currentModalTaskId) return;
    saveTaskOverride(currentModalTaskId, 'name', titleInput.value);
    renderGantt();
    selectTask(currentModalTaskId);
  });

  // Rationale inline save (blur)
  document.getElementById('modal-task-rationale').addEventListener('blur', (e) => {
    if (!currentModalTaskId) return;
    saveTaskOverride(currentModalTaskId, 'rationale', e.target.value);
  });

  // Progress slider in modal
  document.getElementById('modal-progress-slider').addEventListener('input', (e) => {
    if (!currentModalTaskId) return;
    const val = parseInt(e.target.value);
    document.getElementById('modal-progress-val').textContent = `${val}%`;
    setTaskProgress(currentModalTaskId, val);
    renderGantt();
    if (currentModalTaskId) selectTask(currentModalTaskId);
  });

  // Notes auto-save in modal
  document.getElementById('modal-task-notes').addEventListener('input', (e) => {
    if (!currentModalTaskId) return;
    setTaskNote(currentModalTaskId, e.target.value);
  });

  // Close Modals
  document.getElementById('modal-close-btn').addEventListener('click', closeTaskModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeTaskModal);

  document.getElementById('task-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('task-modal')) {
      closeTaskModal();
    }
  });

  // Projection modal close
  document.getElementById('projection-close-btn').addEventListener('click', closeProjectionModal);
  document.getElementById('projection-cancel-btn').addEventListener('click', closeProjectionModal);
  document.getElementById('projection-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('projection-modal')) {
      closeProjectionModal();
    }
  });
}

// Projection chart functions
function computePlanCurve() {
  const nonMilestone = tasksData.filter(t => !t.isMilestone);
  const totalEffort = nonMilestone.reduce((sum, t) => sum + (t.effort || t.duration), 0);
  if (totalEffort === 0) return { plan: [], actualOverall: 0, todayExpected: 0, totalMandays: 0, actualMandays: 0, plannedMandays: 0 };

  const todayExpected = nonMilestone.reduce((sum, t) => sum + (t.effort || t.duration) * getExpectedProgress(t), 0) / totalEffort;
  const actualOverall = nonMilestone.reduce((sum, t) => sum + (t.effort || t.duration) * getTaskProgress(t.id), 0) / totalEffort;

  const actualMandays = nonMilestone.reduce((sum, t) => sum + (t.effort || t.duration) * getTaskProgress(t.id) / 100, 0);
  const plannedMandays = nonMilestone.reduce((sum, t) => sum + (t.effort || t.duration) * getExpectedProgress(t) / 100, 0);

  const plan = [];
  for (let d = 0; d <= totalProjectDays; d++) {
    let plannedWeight = 0;
    nonMilestone.forEach(t => {
      const sOff = getStartDayOffset(t.start);
      const eOff = sOff + t.duration;
      let tp;
      if (d < sOff) tp = 0;
      else if (d >= eOff) tp = 100;
      else tp = ((d - sOff) / t.duration) * 100;
      plannedWeight += tp * (t.effort || t.duration);
    });
    plan.push(plannedWeight / totalEffort);
  }

  return { plan, actualOverall, todayExpected, totalMandays: totalEffort, actualMandays, plannedMandays };
}

function drawProjectionChart(planData, actualOverall) {
  const canvas = document.getElementById('projection-chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 24, right: 20, bottom: 44, left: 52 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // Grid lines and Y-axis labels
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.5;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let pct = 0; pct <= 100; pct += 25) {
    const y = pad.top + chartH * (1 - pct / 100);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(pct + '%', pad.left - 8, y);
  }

  // X-axis: month labels
  const monthLabels = [];
  for (let i = 0; i < totalProjectDays; i++) {
    const d = new Date(projectStart.getTime() + i * DAY_MS);
    const key = d.getFullYear() + '-' + d.getMonth();
    const label = d.toLocaleString('default', { month: 'short' });
    if (!monthLabels.length || monthLabels[monthLabels.length - 1].key !== key) {
      monthLabels.push({ key, label, dayIdx: i });
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, sans-serif';

  // Draw month separators
  monthLabels.forEach(m => {
    const x = pad.left + (m.dayIdx / totalProjectDays) * chartW;
    ctx.fillText(m.label, x + ((monthLabels.indexOf(m) < monthLabels.length - 1)
      ? (monthLabels[monthLabels.indexOf(m) + 1].dayIdx - m.dayIdx) / totalProjectDays * chartW / 2
      : (totalProjectDays - m.dayIdx) / totalProjectDays * chartW / 2), pad.top + chartH + 10);
    // Vertical separator
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + chartH);
    ctx.stroke();
  });

  // Draw plan curve
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  planData.forEach((val, i) => {
    const x = pad.left + (i / totalProjectDays) * chartW;
    const y = pad.top + chartH * (1 - val / 100);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw today vertical line
  const clampedToday = Math.min(todayOffset, planData.length - 1);
  const todayX = pad.left + (clampedToday / totalProjectDays) * chartW;
  ctx.strokeStyle = '#0d9488';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(todayX, pad.top);
  ctx.lineTo(todayX, pad.top + chartH);
  ctx.stroke();
  ctx.setLineDash([]);

  // Today label
  ctx.fillStyle = '#0d9488';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Today', todayX, pad.top - 4);

  // Today expected progress dot
  const todayExpectedY = pad.top + chartH * (1 - planData[clampedToday] / 100);
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(todayX, todayExpectedY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Actual progress horizontal line
  const actualY = pad.top + chartH * (1 - actualOverall / 100);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.left, actualY);
  ctx.lineTo(W - pad.right, actualY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Actual progress dot at today
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(todayX, actualY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Legend
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(W - pad.right - 150, pad.top + 6, 14, 3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Plan', W - pad.right - 130, pad.top + 2);

  ctx.fillStyle = '#22c55e';
  ctx.fillRect(W - pad.right - 150, pad.top + 22, 14, 3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Actual', W - pad.right - 130, pad.top + 18);

  ctx.fillStyle = '#0d9488';
  ctx.fillRect(W - pad.right - 150, pad.top + 38, 14, 3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Today', W - pad.right - 130, pad.top + 34);
}

function openProjectionModal() {
  const { plan, actualOverall, todayExpected, totalMandays, actualMandays, plannedMandays } = computePlanCurve();
  document.getElementById('proj-planned').textContent = `${todayExpected.toFixed(1)}% (${plannedMandays.toFixed(0)} MD)`;
  document.getElementById('proj-actual').textContent = `${actualOverall.toFixed(1)}% (${actualMandays.toFixed(0)} MD)`;
  const variance = actualOverall - todayExpected;
  const varEl = document.getElementById('proj-variance');
  varEl.textContent = (variance >= 0 ? '+' : '') + variance.toFixed(1) + '%';
  varEl.style.color = variance >= 0 ? '#22c55e' : '#ef4444';

  drawProjectionChart(plan, actualOverall);
  document.getElementById('projection-modal').classList.add('show');
}

function closeProjectionModal() {
  document.getElementById('projection-modal').classList.remove('show');
}

// App Launch
document.addEventListener('DOMContentLoaded', async () => {
  await loadTasksData();
  initAppState();
  initProgress();
  initNotes();
  renderTimelineHeaders();
  renderGridBackground();
  initEventListeners();
  setupSplitter();
  setupColumnResize();
  renderGantt();
});
const EMBEDDED_DATA = JSON.parse("[{\"id\":\"m1\",\"wbs\":\"1.1\",\"name\":\"Kickoff, scope lock, delivery governance\",\"section\":\"Mobilization and Design\",\"start\":\"2026-06-29\",\"end\":\"2026-07-03\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"TL\",\"supportingOwners\":[\"QA-01\",\"Product Owner\",\"Release Manager\"],\"qaOwner\":\"QA-01\",\"predecessors\":[],\"rationale\":\"Confirm scope, excluded features, decision owners, escalation paths, sprint cadence, release gates, and fallback rules.\"},{\"id\":\"m2\",\"wbs\":\"1.2\",\"name\":\"Architecture adoption and NFR confirmation\",\"section\":\"Mobilization and Design\",\"start\":\"2026-06-29\",\"end\":\"2026-07-10\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"TL\",\"supportingOwners\":[\"DEV-01\",\"DEV-02\",\"DEV-03\",\"QA-05\"],\"qaOwner\":\"QA-01\",\"predecessors\":[],\"rationale\":\"Translate approved architecture into ADRs, service boundaries, topic/schema conventions, sizing assumptions, NFR test targets, operational responsibilities, and workstream-ready acceptance criteria.\"},{\"id\":\"m3\",\"wbs\":\"1.3\",\"name\":\"External dependency contract discovery\",\"section\":\"Mobilization and Design\",\"start\":\"2026-06-29\",\"end\":\"2026-07-24\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"TL\",\"supportingOwners\":[\"DEV-05\",\"DEV-06\",\"DEV-08\",\"DEV-09\"],\"qaOwner\":\"QA-02\",\"predecessors\":[],\"rationale\":\"Confirm owners, quotas, payload samples, replay behavior, maintenance windows, error codes, and test endpoints for RMS, R10/LDD, Stock Service, and WMS/MFC.\"},{\"id\":\"m4\",\"wbs\":\"1.4\",\"name\":\"Canonical contract definition and fixture design\",\"section\":\"Mobilization and Design\",\"start\":\"2026-06-29\",\"end\":\"2026-07-31\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-03\",\"supportingOwners\":[\"TL\",\"DEV-05\",\"DEV-06\",\"DEV-07\",\"DEV-09\"],\"qaOwner\":\"QA-02\",\"predecessors\":[\"m1\",\"m2\"],\"rationale\":\"Stabilize product, price, stock, order, fulfilment, and adapter result contracts before parallel build teams diverge.\\n- Define canonical domain schemas and Avro/Protobuf compatibility rules across all domains (4 md)\\n- Design error taxonomy, reason codes, and idempotency key strategy (3 md)\\n- Create canonical test fixtures: success, boundary, error, replay scenarios per domain (3 md)\\n- **Total: 10 md**\"},{\"id\":\"f1\",\"wbs\":\"2.1\",\"name\":\"Kubernetes CI CD GitOps environments\",\"section\":\"Foundation and DevOps\",\"start\":\"2026-06-29\",\"end\":\"2026-08-07\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-01\",\"supportingOwners\":[\"DEV-02\"],\"qaOwner\":\"QA-05\",\"predecessors\":[],\"rationale\":\"Kubernetes, CI/CD, GitOps environments to support many parallel services.\\n- Service templates, namespace/env setup, secrets management (3 md)\\n- Container build, deployment manifests, GitOps pipeline (3 md)\\n- Progressive delivery, rollback hooks, resource limits, topology spread (3 md)\\n- Environment promotion across dev/staging/prod (2 md)\\n- **Total: 11 md**\"},{\"id\":\"f2\",\"wbs\":\"2.2\",\"name\":\"Kafka schema registry retry DLQ topics\",\"section\":\"Foundation and DevOps\",\"start\":\"2026-07-01\",\"end\":\"2026-08-04\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-02\",\"supportingOwners\":[\"DEV-03\",\"DEV-01\"],\"qaOwner\":\"QA-02\",\"predecessors\":[\"f1\",\"m4\"],\"rationale\":\"Kafka, schema registry, retry/DLQ topics. Correct partitioning critical for orders and stock.\\n- Broker configuration, topic naming, partition strategy per domain (3 md)\\n- Schema registry: Avro/Protobuf contracts, compatibility checks (2 md)\\n- Retry topic topology (immediate/deferred/DLQ); producer/consumer conventions (3 md)\\n- Operational dashboards: Kafka health, lag, partition balance (2 md)\\n- **Total: 10 md**\"},{\"id\":\"f3\",\"wbs\":\"2.3\",\"name\":\"PostgreSQL schemas, partitions, ledgers\",\"section\":\"Foundation and DevOps\",\"start\":\"2026-07-06\",\"end\":\"2026-08-07\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-02\",\"supportingOwners\":[\"DEV-03\",\"DEV-07\",\"DEV-09\"],\"qaOwner\":\"QA-02\",\"predecessors\":[\"m4\"],\"rationale\":\"PostgreSQL schemas, partitions, ledgers for all domains.\\n- Domain schemas: order partitions, stock ledger, sync ledger, idempotency tables (3 md)\\n- Audit tables, indexes, archive/retention strategy (2 md)\\n- Migration scripts, connection budgets, read/query constraints for ops screens (3 md)\\n- **Total: 8 md**\"},{\"id\":\"f4\",\"wbs\":\"2.4\",\"name\":\"Redis quota infrastructure and Lua primitives\",\"section\":\"Foundation and DevOps\",\"start\":\"2026-07-13\",\"end\":\"2026-08-14\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-09\",\"supportingOwners\":[\"DEV-01\",\"DEV-10\"],\"qaOwner\":\"QA-05\",\"predecessors\":[\"f1\",\"m2\"],\"rationale\":\"Redis for distributed rate limiting. Produces token-bucket infrastructure and reusable Lua building blocks. ATS calculation logic belongs to i2.\\n- Redis key design for distributed token buckets (2 md)\\n- Lua scripts for atomic quota consumption/refill; failover behavior testing (3 md)\\n- Test fixtures for rate-limit, token-bucket edge cases, 429 backpressure (2 md)\\n- **Total: 7 md**\"},{\"id\":\"f5\",\"wbs\":\"2.5\",\"name\":\"Observability platform (metrics, logs, traces, audit pipeline)\",\"section\":\"Foundation and DevOps\",\"start\":\"2026-07-15\",\"end\":\"2026-09-16\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-01\",\"supportingOwners\":[\"DEV-02\",\"DEV-04\",\"DEV-05\",\"DEV-06\",\"DEV-07\",\"DEV-08\",\"DEV-09\",\"DEV-10\",\"DEV-11\",\"DEV-12\"],\"qaOwner\":\"QA-01\",\"predecessors\":[\"f1\"],\"rationale\":\"Platform observability layer. Consumed by a5 (Admin Portal telemetry views). Starts early, completes after domain services emit real signals.\\n- Log/metric/trace pipeline: OpenTelemetry collectors, exporters (3 md)\\n- Operational dashboards: queue age, platform wait, source delay, retry/DLQ counts (3 md)\\n- Alerting rules with SLO burn-rate alerts; channel health monitoring (3 md)\\n- Audit trail infrastructure: immutable event stream for operator actions (2 md)\\n- **Total: 11 md**\"},{\"id\":\"f6\",\"wbs\":\"2.6\",\"name\":\"Load and stress test harness\",\"section\":\"Foundation and DevOps\",\"start\":\"2026-08-03\",\"end\":\"2026-09-04\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"QA-05\",\"supportingOwners\":[\"DEV-01\",\"DEV-02\",\"DEV-04\"],\"qaOwner\":\"QA-05\",\"predecessors\":[\"m4\",\"f1\"],\"rationale\":\"Load/stress test harness for 250/500 ops/sec validation.\\n- Synthetic order/price/stock event generators for load scenarios (3 md)\\n- Configurable channel API simulators for quota/failure injection (3 md)\\n- Measurement scripts: repeatable 250/500 ops/sec scenario definitions (2 md)\\n- **Total: 8 md**\"},{\"id\":\"s1\",\"wbs\":\"3.1\",\"name\":\"Adapter SDK: auth, retry, circuit breaker, quota, telemetry\",\"section\":\"Shared Integration Layer\",\"start\":\"2026-07-06\",\"end\":\"2026-08-14\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-04\",\"supportingOwners\":[\"DEV-11\",\"DEV-12\",\"DEV-01\"],\"qaOwner\":\"QA-02\",\"predecessors\":[\"m3\",\"f4\",\"f2\"],\"rationale\":\"Shared adapter SDK standardizing external call mechanics across all channels.\\n- Auth hooks, request signing extension points for all channel adapters (3 md)\\n- Idempotency/request keys, retry taxonomy (immediate/deferred/permanent), 429 handling (3 md)\\n- Distributed quota integration with f4; circuit breaker per endpoint (3 md)\\n- Metrics, traces, and result publishing via Kafka (1 md)\\n- **Total: 10 md**\"},{\"id\":\"s2\",\"wbs\":\"3.2\",\"name\":\"Capability registry and feature flags\",\"section\":\"Shared Integration Layer\",\"start\":\"2026-07-13\",\"end\":\"2026-08-14\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-04\",\"supportingOwners\":[\"DEV-03\",\"DEV-01\"],\"qaOwner\":\"QA-02\",\"predecessors\":[\"s1\"],\"rationale\":\"Capability registry and feature flags for safe configuration across channels.\\n- Endpoint capability model: per-channel, per-operation field support matrix (3 md)\\n- Quota and batch-size configuration store (runtime-editable, feeds r3) (2 md)\\n- Writer ownership model: domain/channel/cohort scope with kill switches (3 md)\\n- Staged rollout by channel/account/SKU cohort; certification evidence tracking (2 md)\\n- **Total: 10 md**\"},{\"id\":\"s3\",\"wbs\":\"3.3\",\"name\":\"Channel API contract simulators\",\"section\":\"Shared Integration Layer\",\"start\":\"2026-07-20\",\"end\":\"2026-08-28\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"QA-02\",\"supportingOwners\":[\"DEV-03\",\"DEV-04\",\"DEV-11\",\"DEV-12\"],\"qaOwner\":\"QA-02\",\"predecessors\":[\"m3\"],\"rationale\":\"Channel API contract simulators for QA/dev testing before sandboxes are stable.\\n- Shopee/Lazada API simulators: success, retry, rate-limit, failure responses (3 md)\\n- TikTok/Amaze/AxtraMall API simulators (3 md)\\n- Out-of-order, duplicate, malformed payload scenario simulators (2 md)\\n- **Total: 8 md**\"},{\"id\":\"r3\",\"wbs\":\"3.4\",\"name\":\"Shared quota-aware scheduler and drain forecast\",\"section\":\"Shared Integration Layer\",\"start\":\"2026-07-27\",\"end\":\"2026-09-11\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-06\",\"supportingOwners\":[\"DEV-04\",\"DEV-09\",\"DEV-10\",\"DEV-01\"],\"qaOwner\":\"QA-05\",\"predecessors\":[\"f4\",\"m3\",\"s2\"],\"rationale\":\"Shared quota-aware scheduler and drain forecast (moved from Price section). All domains depend on this.\\n- Per-channel/account/endpoint quota scheduling engine consuming f4 token buckets (3 md)\\n- 80/20 normal-vs-urgent budget, dynamic batch sizing, retry budget (2 md)\\n- Campaign drain estimation: effective items/minute, deadline risk, 429 storm safety (2 md)\\n- **Total: 7 md**\"},{\"id\":\"p1\",\"wbs\":\"4.1\",\"name\":\"RMS ingestion and product delta engine\",\"section\":\"Product Sync\",\"start\":\"2026-07-07\",\"end\":\"2026-08-15\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-05\",\"supportingOwners\":[\"DEV-03\",\"DEV-02\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"m3\"],\"rationale\":\"RMS ingestion and product delta engine.\\n- RMS snapshot/change ingestion: payload references, version comparison, replay (3 md)\\n- Deterministic insert/update/deactivate/unchanged decisions; stale source handling (2 md)\\n- Source delay measurement; integration with p2 desired-state ledger (1 md)\\n- **Total: 6 md**\"},{\"id\":\"p2\",\"wbs\":\"4.2\",\"name\":\"Mapping, validation, desired-state ledger\",\"section\":\"Product Sync\",\"start\":\"2026-07-14\",\"end\":\"2026-08-22\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-05\",\"supportingOwners\":[\"DEV-03\",\"DEV-11\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"m3\"],\"rationale\":\"Mapping, validation, desired-state ledger.\\n- SKU/PLU to channel listing ID resolution engine; eligibility validation (3 md)\\n- Handling inactive, unmapped, ambiguous items with stable reason codes (2 md)\\n- Desired-state persistence: version, payload hash, priority, reconciliation keys (3 md)\\n- **Total: 8 md**\"},{\"id\":\"p3a\",\"wbs\":\"4.3\",\"name\":\"Product outbound command generation\",\"section\":\"Product Sync\",\"start\":\"2026-08-04\",\"end\":\"2026-08-21\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-05\",\"supportingOwners\":[\"DEV-04\",\"DEV-11\",\"DEV-12\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"s1\",\"c1\",\"c2\",\"c3\"],\"rationale\":\"Product outbound command generation.\\n- Transform desired-state to channel-neutral commands; coalesce obsolete pending (2 md)\\n- Integrate with s1 SDK for outbound dispatch; result classification (3 md)\\n- **Total: 5 md**\"},{\"id\":\"p3b\",\"wbs\":\"4.4\",\"name\":\"Product reconciliation and drill-down\",\"section\":\"Product Sync\",\"start\":\"2026-08-22\",\"end\":\"2026-09-05\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-05\",\"supportingOwners\":[\"DEV-11\",\"DEV-12\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"p3a\"],\"rationale\":\"Product reconciliation and drill-down.\\n- Desired-vs-sent-vs-acknowledged state comparison per SKU/channel (2 md)\\n- Read-back integration where available; operator drill-down views (1 md)\\n- **Total: 3 md**\"},{\"id\":\"p4\",\"wbs\":\"4.5\",\"name\":\"Channel listing read-back and stale-product verification\",\"section\":\"Product Sync\",\"start\":\"2026-08-17\",\"end\":\"2026-09-11\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-05\",\"supportingOwners\":[\"DEV-11\",\"DEV-12\",\"DEV-03\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"p2\",\"c1\",\"c2\"],\"rationale\":\"Channel listing read-back and stale-product verification.\\n- Ingest listing data from seller centers via channel read-back APIs; map to RMS product master (p1) (3 md)\\n- Stale-product detection engine: flag orphaned, deactivated, or drifted listings before publishing for sale (3 md)\\n- Verified listing state persistence with drift metadata; integration with Admin Portal (a4) for auto/manual field configuration (2 md)\\n- **Total: 8 md**\"},{\"id\":\"r1\",\"wbs\":\"5.1\",\"name\":\"R10 LDD ingestion and effective price engine\",\"section\":\"Price and Promotion Sync\",\"start\":\"2026-07-06\",\"end\":\"2026-08-14\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-06\",\"supportingOwners\":[\"DEV-03\",\"DEV-02\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"m3\"],\"rationale\":\"R10 LDD ingestion and effective price engine. Effective-dated behavior creates many edge cases.\\n- R10/LDD ingestion: source versioning, effective dates, timezone handling, replay (3 md)\\n- Deterministic effective price calculation at business timestamp; promotion active/expiry (3 md)\\n- Product/store scope resolution; integration with desired-state comparison (2 md)\\n- **Total: 8 md**\"},{\"id\":\"r2\",\"wbs\":\"5.2\",\"name\":\"Promotion business rules, guardrails, and precedence\",\"section\":\"Price and Promotion Sync\",\"start\":\"2026-07-13\",\"end\":\"2026-07-20\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-06\",\"supportingOwners\":[\"TL\",\"Product Owner\"],\"qaOwner\":\"QA-03\",\"predecessors\":[],\"rationale\":\"Promotion business rules, guardrails, and precedence. Narrow scope: rule confirmation + fixtures.\\n- Business rule fixtures: precedence, manual ownership, overrides, clubpack multiplication (3 md)\\n- Activation/expiry rules; quarantine for suspicious prices (guardrails) (2 md)\\n- **Total: 5 md**\"},{\"id\":\"r4\",\"wbs\":\"5.3\",\"name\":\"Price and promo reconciliation\",\"section\":\"Price and Promotion Sync\",\"start\":\"2026-08-17\",\"end\":\"2026-09-11\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-06\",\"supportingOwners\":[\"DEV-05\",\"DEV-04\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"c1\",\"c2\",\"c3\",\"f5\"],\"rationale\":\"Price and promo reconciliation. Depends on core engine and adapters being functional.\\n- Desired/sent/acknowledged state matching (reuse p3b shared reconciliation pattern) (2 md)\\n- Permanent vs retryable failure classification; operator evidence views (2 md)\\n- **Total: 4 md**\"},{\"id\":\"o1a\",\"wbs\":\"6.1\",\"name\":\"Order ingestion: shared raw archival and Kafka\",\"section\":\"Order Sync and Fulfilment Routing\",\"start\":\"2026-07-13\",\"end\":\"2026-08-07\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-07\",\"supportingOwners\":[\"DEV-04\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"m3\",\"f1\",\"f2\"],\"rationale\":\"Shared inbound order infrastructure. Channel-specific webhook signing belongs to channel adapters.\\n- Raw order payload archival to object storage with payload reference (2 md)\\n- Kafka quorum acknowledge topic for accepted orders, separate from domain topics (2 md)\\n- Worker pool isolation pattern (inbound/polling/outbound) shared by all adapters (1 md)\\n- **Total: 5 md**\"},{\"id\":\"o1b\",\"wbs\":\"6.2\",\"name\":\"Polling cursor management and leases\",\"section\":\"Order Sync and Fulfilment Routing\",\"start\":\"2026-08-08\",\"end\":\"2026-08-21\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-07\",\"supportingOwners\":[\"DEV-11\",\"DEV-12\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"o1a\"],\"rationale\":\"Reusable polling cursor framework for channels with polling/hybrid mechanics.\\n- Distributed polling lease framework: overlap-safe cursors, lease expiry, persistence (2 md)\\n- Reusable polling state machine: incremental, full-sync, catch-up modes (1 md)\\n- **Total: 3 md**\"},{\"id\":\"o2\",\"wbs\":\"6.3\",\"name\":\"Canonical normalization, idempotency, persistence\",\"section\":\"Order Sync and Fulfilment Routing\",\"start\":\"2026-07-20\",\"end\":\"2026-08-07\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-07\",\"supportingOwners\":[\"DEV-03\",\"DEV-02\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"m4\",\"f3\"],\"rationale\":\"Canonical normalization, idempotency, persistence. Correctness-critical.\\n- Channel-to-canonical order model mapping (header, line, address, payment, references, timestamps) (2 md)\\n- Partition-aware persistence using f3 partitions; duplicate suppression (2 md)\\n- Out-of-order event handling; cancellation state legality (1 md)\\n- **Total: 5 md**\"},{\"id\":\"o3\",\"wbs\":\"6.3\",\"name\":\"Fulfilment routing\",\"section\":\"Order Sync and Fulfilment Routing\",\"start\":\"2026-08-03\",\"end\":\"2026-09-11\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-08\",\"supportingOwners\":[\"DEV-07\",\"TL\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"m3\"],\"rationale\":\"Fulfilment routing to WMS/MFC via idempotent hand-off contract.\\n- Route accepted orders to WMS/MFC via idempotent hand-off contract (2 md)\\n- Retry behavior, timeout handling, stable rejection reason codes, correlation IDs (3 md)\\n- Separate Phoenix acceptance time from external fulfilment time (1 md)\\n- **Total: 6 md**\"},{\"id\":\"o4\",\"wbs\":\"6.4\",\"name\":\"Cancellation status minimum flow\",\"section\":\"Order Sync and Fulfilment Routing\",\"start\":\"2026-08-17\",\"end\":\"2026-08-28\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-08\",\"supportingOwners\":[\"DEV-07\",\"DEV-11\",\"DEV-12\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"m3\"],\"rationale\":\"Cancellation status minimum flow. Bounded to minimum needed for go-live.\\n- Cancellation before fulfilment acceptance (where supported); minimum external status mapping (2 md)\\n- State transition legality (prevent invalid backward); stuck hand-off reconciliation (2 md)\\n- **Total: 4 md**\"},{\"id\":\"i1\",\"wbs\":\"7.1\",\"name\":\"Stock Service stock ingestion and stock ledger\",\"section\":\"Stock Sync\",\"start\":\"2026-07-13\",\"end\":\"2026-08-21\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-09\",\"supportingOwners\":[\"DEV-03\",\"DEV-02\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"m3\"],\"rationale\":\"Stock Service stock ingestion and stock ledger.\\n- Stock Service ingestion: consume movement/snapshot events, unique movement identity (3 md)\\n- Stale version rejection; ordering by store/SKU for correct ATS calculation (1 md)\\n- Durable PostgreSQL stock ledger with reconciliation snapshot support (2 md)\\n- **Total: 6 md**\"},{\"id\":\"i2\",\"wbs\":\"7.2\",\"name\":\"ATS calculation and safety-stock baseline\",\"section\":\"Stock Sync\",\"start\":\"2026-07-27\",\"end\":\"2026-09-04\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-09\",\"supportingOwners\":[\"DEV-10\",\"TL\"],\"qaOwner\":\"QA-05\",\"predecessors\":[\"f4\"],\"rationale\":\"ATS calculation, reserves, and safety-stock. Uses f4 Lua primitives.\\n- Atomic movement application using f4 Lua primitives; maintain ATS state (3 md)\\n- Damage, pending, unpaid, flash reserve handling with idempotency and replay (2 md)\\n- Safety-stock configuration and enforcement; failure recovery testing (2 md)\\n- **Total: 7 md**\"},{\"id\":\"i3\",\"wbs\":\"7.3\",\"name\":\"Stock sync orchestration and coalescing\",\"section\":\"Stock Sync\",\"start\":\"2026-08-10\",\"end\":\"2026-09-11\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-10\",\"supportingOwners\":[\"DEV-09\",\"DEV-04\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"i2\",\"s1\",\"c1\",\"c2\",\"c3\"],\"rationale\":\"Stock sync orchestration and coalescing.\\n- Convert ATS changes to channel-specific desired stock commands (2 md)\\n- Coalesce pending stock updates to latest version; prioritize campaign SKUs (2 md)\\n- Respect quotas via r3 scheduler; avoid stale outbound writes (2 md)\\n- **Total: 6 md**\"},{\"id\":\"i4\",\"wbs\":\"7.4\",\"name\":\"Stock reconciliation\",\"section\":\"Stock Sync\",\"start\":\"2026-08-25\",\"end\":\"2026-09-11\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-10\",\"supportingOwners\":[\"DEV-09\",\"DEV-11\",\"DEV-12\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"m3\",\"f5\"],\"rationale\":\"Stock reconciliation. Reuses sync ledger and reconciliation patterns from p3b/r4.\\n- Compare Phoenix desired stock with seller acknowledgement/read-back (reuse p3b/r4 pattern) (2 md)\\n- Drift surfacing and replay/repair path evidence (1 md)\\n- **Total: 3 md**\"},{\"id\":\"c1\",\"wbs\":\"8.1\",\"name\":\"Shopee E2E adapter\",\"section\":\"Channel Adapters\",\"start\":\"2026-07-27\",\"end\":\"2026-09-18\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-11\",\"supportingOwners\":[\"DEV-04\",\"DEV-07\",\"DEV-10\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"m3\"],\"rationale\":\"Shopee E2E adapter. Primary volume channel.\\n- Shopee auth, signing, channel-specific webhook verification; polling cursor integration with o1b (2 md)\\n- Inbound order path: raw order to Kafka via o1a shared infrastructure (2 md)\\n- Outbound sync: product, price, stock, status transformation using s1 SDK and s2 capability registry (3 md)\\n- Sandbox certification, error mapping, production configuration (2 md)\\n- **Total: 9 md**\"},{\"id\":\"c2\",\"wbs\":\"8.2\",\"name\":\"Lazada E2E adapter\",\"section\":\"Channel Adapters\",\"start\":\"2026-07-27\",\"end\":\"2026-09-18\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-11\",\"supportingOwners\":[\"DEV-04\",\"DEV-07\",\"DEV-10\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"m3\"],\"rationale\":\"Lazada E2E adapter. Parallel track with separate fixtures.\\n- Lazada auth, signing, channel-specific webhook verification; polling cursor integration with o1b (2 md)\\n- Inbound order path: raw order to Kafka via o1a (2 md)\\n- Outbound sync: product, price, stock, status transformation via s1 SDK (3 md)\\n- Sandbox certification, error mapping, production configuration (2 md)\\n- **Total: 9 md**\"},{\"id\":\"c3\",\"wbs\":\"8.3\",\"name\":\"TikTok E2E adapter\",\"section\":\"Channel Adapters\",\"start\":\"2026-08-03\",\"end\":\"2026-09-18\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-12\",\"supportingOwners\":[\"DEV-04\",\"DEV-07\",\"DEV-10\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"m3\"],\"rationale\":\"TikTok E2E adapter. Starts 1 week after c1/c2 to reuse SDK lessons.\\n- TikTok auth, signing, channel-specific webhook/polling mechanics (2 md)\\n- Inbound order path: raw order to Kafka (2 md)\\n- Outbound sync: product, price, stock, status transformation via s1 SDK (3 md)\\n- Sandbox certification, error mapping, production configuration (2 md)\\n- **Total: 9 md**\"},{\"id\":\"c4\",\"wbs\":\"8.4\",\"name\":\"Amaze/AxtraMall E2E adapter\",\"section\":\"Channel Adapters\",\"start\":\"2026-08-10\",\"end\":\"2026-09-18\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-12\",\"supportingOwners\":[\"DEV-04\",\"DEV-07\"],\"qaOwner\":\"QA-04\",\"predecessors\":[\"c3\"],\"rationale\":\"Amaze/AxtraMall E2E adapter. Reuses SDK and patterns from c1-c3.\\n- Amaze/AxtraMall auth, signing, polling mechanics (2 md)\\n- Inbound order path: raw order to Kafka (2 md)\\n- Outbound sync: product, price, stock, status transformation via s1 SDK (2 md)\\n- Sandbox certification, error mapping, production configuration (2 md)\\n- **Total: 8 md**\"},{\"id\":\"a1\",\"wbs\":\"9.1\",\"name\":\"Admin UX flows and permissions\",\"section\":\"Admin Portal\",\"start\":\"2026-07-13\",\"end\":\"2026-08-07\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-13\",\"supportingOwners\":[\"DEV-14\",\"TL\",\"QA-06\"],\"qaOwner\":\"QA-06\",\"predecessors\":[],\"rationale\":\"Admin UX flows and permissions. Must finish before screens built to avoid rework.\\n- Operator role definition, screen flow design, navigation hierarchy (3 md)\\n- Permission boundaries: view-only vs executable actions; audit requirements (2 md)\\n- Retry authorization rules: who can retry what, two-person approval model (2 md)\\n- **Total: 7 md**\"},{\"id\":\"a2\",\"wbs\":\"9.2\",\"name\":\"Order monitoring portal\",\"section\":\"Admin Portal\",\"start\":\"2026-07-27\",\"end\":\"2026-09-04\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-13\",\"supportingOwners\":[\"DEV-07\",\"DEV-14\"],\"qaOwner\":\"QA-06\",\"predecessors\":[\"a1\",\"o1b\"],\"rationale\":\"Order monitoring portal with searchable views and evidence links.\\n- Searchable order views: filters by channel/account/order/SKU/status; lifecycle timeline (3 md)\\n- Fulfilment hand-off status, error/exceptions, raw evidence links (2 md)\\n- Backend read APIs with query constraints (no overload on transactional tables) (2 md)\\n- **Total: 7 md**\"},{\"id\":\"a3\",\"wbs\":\"9.3\",\"name\":\"Manual SKU warehouse mapping upload\",\"section\":\"Admin Portal\",\"start\":\"2026-07-27\",\"end\":\"2026-09-11\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-14\",\"supportingOwners\":[\"DEV-08\",\"DEV-13\",\"DEV-09\"],\"qaOwner\":\"QA-06\",\"predecessors\":[\"a1\",\"o3\"],\"rationale\":\"Manual SKU warehouse mapping upload. Critical because WMS routing depends on correct mapping.\\n- Upload template and CSV parser with validation; preview of parsed data (3 md)\\n- Duplicate detection, SKU and warehouse reference checks (2 md)\\n- Approval/activation workflow, versioning, audit trail, rollback capability (3 md)\\n- Routing-service lookup integration with WMS/MFC (1 md)\\n- **Total: 9 md**\"},{\"id\":\"a4\",\"wbs\":\"9.4\",\"name\":\"Product sync manual auto configuration\",\"section\":\"Admin Portal\",\"start\":\"2026-08-03\",\"end\":\"2026-09-11\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-14\",\"supportingOwners\":[\"DEV-05\",\"DEV-13\"],\"qaOwner\":\"QA-06\",\"predecessors\":[\"a1\",\"p2\"],\"rationale\":\"Product sync manual/auto configuration UI and APIs.\\n- UI for manual/auto product master sync per channel/account/SKU cohort (3 md)\\n- Effective dating, validation, audit, conflict prevention with writer ownership (3 md)\\n- Backend APIs for configuration persistence and rollback (2 md)\\n- **Total: 8 md**\"},{\"id\":\"a5\",\"wbs\":\"9.5\",\"name\":\"Sync telemetry, retry controls, and governance\",\"section\":\"Admin Portal\",\"start\":\"2026-08-10\",\"end\":\"2026-09-18\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-13\",\"supportingOwners\":[\"DEV-14\",\"DEV-04\",\"DEV-05\",\"DEV-06\",\"DEV-10\"],\"qaOwner\":\"QA-06\",\"predecessors\":[\"a1\",\"s2\"],\"rationale\":\"Sync telemetry, retry controls, and governance. Consumes f5 observability pipeline.\\n- Sync telemetry views: product/price/stock/order queue age, retry/DLQ state, failure classification (3 md)\\n- Manual retry preview: scope, idempotency impact, rate-limit protection, permission check (3 md)\\n- Immutable audit for all retry actions; scoped retry execution controls (2 md)\\n- **Total: 8 md**\"},{\"id\":\"a6\",\"wbs\":\"9.6\",\"name\":\"Admin Portal UX polish, accessibility, and UAT hardening\",\"section\":\"Admin Portal\",\"start\":\"2026-09-01\",\"end\":\"2026-09-18\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"DEV-13\",\"supportingOwners\":[\"DEV-14\",\"QA-06\"],\"qaOwner\":\"QA-06\",\"predecessors\":[\"a2\",\"a3\",\"a4\",\"a5\"],\"rationale\":\"Admin Portal UX polish, accessibility, and UAT hardening.\\n- Operator workflow polish based on UAT feedback; empty/error/loading states (3 md)\\n- Permission defect fixes; import edge cases; retry confirmation wording (2 md)\\n- Accessibility basics; UAT evidence capture for sign-off (1 md)\\n- **Total: 6 md**\"},{\"id\":\"devdone\",\"wbs\":\"10.1\",\"name\":\"End-to-end feature complete\",\"section\":\"Development Completion\",\"start\":\"2026-09-18\",\"end\":\"2026-09-18\",\"isCritical\":false,\"isMilestone\":true,\"primaryOwner\":\"TL\",\"supportingOwners\":[],\"qaOwner\":\"QA-01\",\"predecessors\":[\"p3b\",\"p4\",\"r4\",\"o4\",\"i4\",\"c4\",\"f5\",\"f6\",\"s3\",\"a6\"],\"rationale\":\"End-to-end feature complete milestone. Marks transition from active code-writing to full integrated verification.\"},{\"id\":\"t1\",\"wbs\":\"11.1\",\"name\":\"SIT integrated functional and regression\",\"section\":\"Testing and Release\",\"start\":\"2026-08-24\",\"end\":\"2026-10-02\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"QA-01\",\"supportingOwners\":[\"DEV-03\",\"DEV-04\",\"DEV-07\",\"DEV-09\",\"DEV-11\",\"DEV-12\",\"DEV-13\",\"DEV-14\"],\"qaOwner\":\"QA-01\",\"predecessors\":[\"devdone\"],\"rationale\":\"SIT integrated functional and regression.\\n- Phase 1: completed domain flows integrated and tested together (5 md)\\n- Phase 2: full regression after all features complete; defect fix and retest cycles (4 md)\\n- **Total: 9 md**\"},{\"id\":\"t2\",\"wbs\":\"11.2\",\"name\":\"Load and stress testing\",\"section\":\"Testing and Release\",\"start\":\"2026-09-21\",\"end\":\"2026-10-09\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"QA-05\",\"supportingOwners\":[\"DEV-01\",\"DEV-02\",\"DEV-04\"],\"qaOwner\":\"QA-05\",\"predecessors\":[\"f6\",\"f1\"],\"rationale\":\"Load and stress testing. Includes tuning and retesting.\\n- 250 orders/sec baseline: execute, measure, tune (3 md)\\n- 500 orders/sec headroom: burst test with price/promo and stock bursts (3 md)\\n- Retry storm and backlog drain scenarios (2 md)\\n- **Total: 8 md**\"},{\"id\":\"t3\",\"wbs\":\"11.3\",\"name\":\"Resilience failover replay DLQ testing\",\"section\":\"Testing and Release\",\"start\":\"2026-09-28\",\"end\":\"2026-10-16\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"QA-05\",\"supportingOwners\":[\"DEV-01\",\"DEV-02\",\"DEV-07\",\"DEV-09\"],\"qaOwner\":\"QA-05\",\"predecessors\":[\"f1\",\"f2\",\"f3\",\"f4\",\"devdone\"],\"rationale\":\"Resilience failover replay DLQ testing.\\n- Failure scenarios: pod, broker, Redis, PostgreSQL, external API outage (3 md)\\n- Replay correctness and duplicate suppression; no-loss acceptance evidence (3 md)\\n- **Total: 6 md**\"},{\"id\":\"t4\",\"wbs\":\"11.4\",\"name\":\"UAT and business sign-off\",\"section\":\"Testing and Release\",\"start\":\"2026-10-05\",\"end\":\"2026-10-30\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"QA-04\",\"supportingOwners\":[\"DEV-05\",\"DEV-06\",\"DEV-07\",\"DEV-09\",\"DEV-11\",\"DEV-13\",\"DEV-14\",\"TL\"],\"qaOwner\":\"QA-04, QA-06\",\"predecessors\":[\"devdone\"],\"rationale\":\"UAT and business sign-off. Overlaps late SIT.\\n- Business UAT: mappings, campaign rules, price behavior, order handling, stock outcomes (4 md)\\n- Operations user validation: Admin Portal workflows, exception handling (2 md)\\n- UAT evidence and sign-off (2 md)\\n- **Total: 8 md**\"},{\"id\":\"t5\",\"wbs\":\"11.5\",\"name\":\"Parallel run and reconciliation\",\"section\":\"Testing and Release\",\"start\":\"2026-10-05\",\"end\":\"2026-10-30\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"QA-03\",\"supportingOwners\":[\"DEV-05\",\"DEV-06\",\"DEV-09\",\"DEV-10\"],\"qaOwner\":\"QA-03\",\"predecessors\":[\"devdone\"],\"rationale\":\"Parallel run and reconciliation. Required before writer ownership transfer.\\n- Compare Phoenix vs legacy/shadow outputs per domain (3 md)\\n- Reconciliation reports and drift analysis; writer transfer readiness confirmation (2 md)\\n- **Total: 5 md**\"},{\"id\":\"t6\",\"wbs\":\"11.6\",\"name\":\"Production readiness, cutover, and rollback rehearsal\",\"section\":\"Testing and Release\",\"start\":\"2026-10-19\",\"end\":\"2026-10-30\",\"isCritical\":true,\"isMilestone\":false,\"primaryOwner\":\"DEV-01\",\"supportingOwners\":[\"DEV-13\",\"QA-01\",\"QA-05\",\"QA-06\",\"Release Manager\",\"TL\"],\"qaOwner\":\"QA-01\",\"predecessors\":[\"devdone\"],\"rationale\":\"Production readiness, cutover, and rollback rehearsal.\\n- Production readiness: secrets, PII, access control, deployment approvals, runbooks (3 md)\\n- Cutover and rollback rehearsal: kill switches, writer transfer, on-call handover (3 md)\\n- **Total: 6 md**\"},{\"id\":\"cutover\",\"wbs\":\"11.7\",\"name\":\"Technical cutover\",\"section\":\"Testing and Release\",\"start\":\"2026-10-30\",\"end\":\"2026-10-30\",\"isCritical\":false,\"isMilestone\":true,\"primaryOwner\":\"TL\",\"supportingOwners\":[\"DEV-01\",\"DEV-07\",\"DEV-09\",\"DEV-11\",\"DEV-12\",\"DEV-13\"],\"qaOwner\":\"QA-01\",\"predecessors\":[\"t1\",\"t2\",\"t3\",\"t4\",\"t5\",\"t6\"],\"rationale\":\"Technical cutover milestone. Production release complete and monitored.\"},{\"id\":\"live\",\"wbs\":\"11.8\",\"name\":\"Business go-live and hypercare\",\"section\":\"Testing and Release\",\"start\":\"2026-11-01\",\"end\":\"2026-11-06\",\"isCritical\":false,\"isMilestone\":false,\"primaryOwner\":\"TL\",\"supportingOwners\":[\"DEV-01\",\"DEV-07\",\"DEV-09\",\"DEV-11\",\"DEV-12\",\"DEV-13\"],\"qaOwner\":\"QA-01, QA-04, QA-05, QA-06\",\"predecessors\":[\"cutover\"],\"rationale\":\"Business go-live and hypercare period. Release officially in operation with intense hypercare support, daily reconciliation, incident response, and production monitoring.\"}]");
