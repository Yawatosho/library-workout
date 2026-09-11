import { workoutTypes, unitLabels, storageKey } from "./data.js?v=10";
import {
  clearEntry,
  getEntry,
  isValidImportData,
  loadData,
  removeSavedLibrary,
  replaceData,
  setActivity,
  setLibrary,
} from "./storage.js?v=10";

const locale = "en-US";
const today = new Date();
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const todayKey = toDateKey(today);
const dayControllerType = workoutTypes.find((type) => type.controlsDay);
const dayControllerId = dayControllerType.id;
let data = loadData();
let activeView = "today";
let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let statsMode = "month";
let statsMonthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let statsYearCursor = today.getFullYear();
let openSheetDate = null;
let returnFocus = null;
let toastTimer = null;
let activeHold = null;
let helpReturnFocus = null;
const managedLibraryDates = new Set();

const els = {
  headerDate: document.querySelector("#header-date"),
  openHelp: document.querySelector("#open-help"),
  primary: document.querySelector("#primary-activities"),
  secondary: document.querySelector("#secondary-activities"),
  more: document.querySelector("#more-workouts"),
  moreCount: document.querySelector("#more-count"),
  summaryCount: document.querySelector("#today-summary-count"),
  summaryLibrary: document.querySelector("#today-summary-library"),
  summaryMark: document.querySelector("#today-summary-mark"),
  calendarMonth: document.querySelector("#calendar-month"),
  calendarGrid: document.querySelector("#calendar-grid"),
  previousMonth: document.querySelector("#previous-month"),
  nextMonth: document.querySelector("#next-month"),
  recentDays: document.querySelector("#recent-days-list"),
  statsPeriodLabel: document.querySelector("#stats-period-label"),
  previousStatsPeriod: document.querySelector("#previous-stats-period"),
  nextStatsPeriod: document.querySelector("#next-stats-period"),
  workoutDaysCard: document.querySelector("#workout-days-card"),
  workoutDays: document.querySelector("#workout-days-number"),
  statTotals: document.querySelector("#stat-totals"),
  yearTrend: document.querySelector("#year-trend"),
  monthBars: document.querySelector("#month-bars"),
  activityBars: document.querySelector("#activity-bars"),
  chartTitle: document.querySelector("#chart-title"),
  librariesSection: document.querySelector("#libraries-month-section"),
  librariesTitle: document.querySelector("#libraries-title"),
  librariesList: document.querySelector("#libraries-month-list"),
  importInput: document.querySelector("#import-input"),
  backdrop: document.querySelector("#sheet-backdrop"),
  sheet: document.querySelector("#day-sheet"),
  sheetTitle: document.querySelector("#sheet-title"),
  sheetContent: document.querySelector("#sheet-content"),
  helpBackdrop: document.querySelector("#help-backdrop"),
  helpSheet: document.querySelector("#help-sheet"),
  closeHelp: document.querySelector("#close-help"),
  toast: document.querySelector("#save-toast"),
};

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isFutureDate(dateKey) {
  return fromDateKey(dateKey) > todayStart;
}

function formatValue(type, value) {
  if (type.inputType === "check") return value ? "Recorded" : "Not recorded";
  const unit = unitLabels[type.unit];
  return unit ? `${value} ${unit}` : String(value);
}

function formatAggregateValue(type, value) {
  if (type.inputType === "check") return `${value} ${value === 1 ? "day" : "days"}`;
  return formatValue(type, value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function stopHold() {
  if (!activeHold) return;
  const hold = activeHold;
  clearTimeout(hold.delay);
  clearInterval(hold.interval);
  activeHold = null;
  if (hold.dirty) {
    const value = getEntry(data, hold.dateKey).activities[hold.type.id] || 0;
    showToast(value ? "Recorded" : "Removed");
    rerenderAfterChange(hold.type.id);
  }
}

function attachStepperButton(button, dateKey, type, delta) {
  let repeated = false;
  const supportsHold = type.holdToRepeat === true;

  button.addEventListener("click", () => {
    if (repeated) {
      repeated = false;
      return;
    }
    changeActivity(dateKey, type, delta);
  });

  if (!supportsHold) return;
  button.addEventListener("pointerdown", (event) => {
    if (button.disabled || event.button !== 0) return;
    stopHold();
    const hold = { delay: null, interval: null, startedAt: performance.now(), dirty: false, dateKey, type };
    const pulse = () => {
      const current = getEntry(data, dateKey).activities[type.id] || 0;
      if ((delta < 0 && current <= 0) || (delta > 0 && current >= type.max)) {
        stopHold();
        return;
      }
      const elapsed = performance.now() - hold.startedAt;
      const multiplier = elapsed >= 2400 ? 6 : elapsed >= 1000 ? 3 : 1;
      repeated = true;
      hold.dirty = changeActivity(dateKey, type, Math.sign(delta) * type.step * multiplier, true) || hold.dirty;
    };
    activeHold = hold;
    hold.delay = setTimeout(() => {
      if (activeHold !== hold) return;
      pulse();
      hold.interval = setInterval(pulse, 180);
    }, 430);
  });
}

function activityCopyMarkup(type, compact) {
  const icon = type.primary && !compact && type.icon
    ? `<span class="activity-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${type.icon}</svg></span>`
    : "";
  return `<div class="activity-leading">${icon}<div class="activity-copy"><span class="activity-name">${type.shortLabel}</span><span class="activity-description">${type.label}</span></div></div>`;
}

function activityRow(type, dateKey, compact = false) {
  const entry = getEntry(data, dateKey);
  const value = entry.activities[type.id] || 0;
  const visitOn = entry.activities[dayControllerId] === 1;
  const locked = !type.controlsDay && !visitOn;
  const row = document.createElement("div");
  row.className = `activity-row${value ? " has-value" : ""}${compact ? " is-compact" : ""}${locked ? " is-locked" : ""}`;
  row.dataset.activity = type.id;
  row.dataset.date = dateKey;

  if (type.inputType === "check") {
    if (!type.controlsDay) {
      row.innerHTML = `
        ${activityCopyMarkup(type, compact)}
        <button type="button" class="check-toggle${value ? " is-on" : ""}" aria-pressed="${Boolean(value)}" aria-label="${value ? `${type.label}の記録を解除` : `${type.label}を記録`}" ${locked ? "disabled" : ""}>
          <span aria-hidden="true">${value ? "✓" : "+"}</span>
        </button>`;
      row.querySelector(".check-toggle").addEventListener("click", () => toggleCheckActivity(dateKey, type));
      return row;
    }
    row.innerHTML = `
      ${activityCopyMarkup(type, compact)}
      <button type="button" class="visit-toggle${visitOn ? " is-on" : ""}" aria-pressed="${visitOn}" aria-label="${visitOn ? "図書館への訪問記録を解除" : "図書館への訪問を記録"}">
        <span aria-hidden="true">${visitOn ? "✓" : "+"}</span>${visitOn ? "記録済み" : "記録する"}
      </button>`;
    row.querySelector(".visit-toggle").addEventListener("click", () => toggleVisit(dateKey));
    return row;
  }

  row.innerHTML = `
    ${activityCopyMarkup(type, compact)}
    <div class="stepper" aria-label="${type.label}">
      <button type="button" class="step-button minus" aria-label="${type.label}を減らす" ${locked || value === 0 ? "disabled" : ""}>−</button>
      <output aria-live="polite">${formatValue(type, value)}</output>
      <button type="button" class="step-button plus" aria-label="${type.label}を増やす" ${locked || value >= type.max ? "disabled" : ""}>＋</button>
    </div>`;

  attachStepperButton(row.querySelector(".minus"), dateKey, type, -type.step);
  attachStepperButton(row.querySelector(".plus"), dateKey, type, type.step);
  return row;
}

function toggleVisit(dateKey) {
  if (isFutureDate(dateKey)) return;
  const entry = getEntry(data, dateKey);
  const visitOn = entry.activities[dayControllerId] === 1;

  if (visitOn) {
    const hasOtherActivities = Object.entries(entry.activities).some(([id, value]) => id !== dayControllerId && value > 0);
    if (hasOtherActivities && !window.confirm("この日のワークアウト記録も削除されます。よろしいですか？")) return;
    clearEntry(data, dateKey);
    showToast("Removed");
  } else {
    setActivity(data, dateKey, dayControllerId, 1);
    showToast("Visit recorded");
  }
  rerenderAfterChange(dayControllerId);
}

function toggleCheckActivity(dateKey, type) {
  if (isFutureDate(dateKey) || type.controlsDay) return;
  const entry = getEntry(data, dateKey);
  if (entry.activities[dayControllerId] !== 1) return;
  const next = entry.activities[type.id] ? 0 : 1;
  setActivity(data, dateKey, type.id, next);
  showToast(next ? "Recorded" : "Removed");
  rerenderAfterChange(type.id);
}

function changeActivity(dateKey, type, delta, deferRender = false) {
  if (isFutureDate(dateKey)) return;
  const entry = getEntry(data, dateKey);
  if (type.inputType !== "quantity" || entry.activities[dayControllerId] !== 1) return;
  const current = entry.activities[type.id] || 0;
  const next = Math.min(type.max, Math.max(0, current + delta));
  if (next === current) return false;
  setActivity(data, dateKey, type.id, next);
  if (deferRender) {
    updateActivityRows(dateKey, type);
    return true;
  }
  showToast(next ? "Recorded" : "Removed");
  rerenderAfterChange(type.id);
  return true;
}

function updateActivityRows(dateKey, type) {
  const value = getEntry(data, dateKey).activities[type.id] || 0;
  document.querySelectorAll(`[data-date="${dateKey}"][data-activity="${type.id}"]`).forEach((row) => {
    row.classList.toggle("has-value", value > 0);
    row.querySelector("output").textContent = formatValue(type, value);
    row.querySelector(".minus").disabled = value <= 0;
    row.querySelector(".plus").disabled = value >= type.max;
  });
}

function rerenderAfterChange(activityId) {
  renderAll();
  if (openSheetDate) renderSheet(openSheetDate);
  document.querySelectorAll(`[data-activity="${activityId}"]`).forEach((row) => {
    row.classList.add("just-changed");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      row.querySelector("output, .visit-toggle, .check-toggle")?.animate(
        [{ transform: "translateY(3px)", opacity: .45 }, { transform: "translateY(0)", opacity: 1 }],
        { duration: 180, easing: "ease-out" },
      );
    }
  });
}

function libraryField(dateKey) {
  const entry = getEntry(data, dateKey);
  const wrap = document.createElement("div");
  wrap.className = "library-field";
  const listId = `libraries-${dateKey}`;
  const managing = managedLibraryDates.has(dateKey);
  const visibleLibraries = managing ? data.libraries : data.libraries.slice(0, 3);
  wrap.innerHTML = `
    <label for="library-${dateKey}">Which library? <span>Optional</span></label>
    <div class="library-input-wrap">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V6l8-3 8 3v14M8 20v-8h8v8M3 20h18" /></svg>
      <input id="library-${dateKey}" type="text" maxlength="80" value="${escapeHtml(entry.library || "")}" placeholder="Add a library name" autocomplete="off" list="${listId}" />
      ${entry.library ? `<button type="button" class="clear-library" aria-label="図書館名を削除">×</button>` : ""}
    </div>
    <datalist id="${listId}">${data.libraries.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>
    ${data.libraries.length ? `<div class="recent-library-area${managing ? " is-managing" : ""}">
      <div class="recent-library-heading"><span>Recent</span><button type="button" class="manage-libraries">${managing ? "Done" : "Manage"}</button></div>
      <div class="recent-libraries">${visibleLibraries.map((name) => managing
        ? `<button type="button" class="saved-library-remove" data-remove-library="${escapeHtml(name)}" aria-label="${escapeHtml(name)}を候補履歴から削除"><span>${escapeHtml(name)}</span><b aria-hidden="true">×</b></button>`
        : `<button type="button" data-library="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div>
    </div>` : ""}
    <p class="field-note">You can leave this blank.</p>`;

  const input = wrap.querySelector("input");
  const commit = () => {
    setLibrary(data, dateKey, input.value);
    showToast(input.value.trim() ? "Library saved" : "Library removed");
    renderAll();
    if (openSheetDate) renderSheet(openSheetDate);
  };
  input.addEventListener("change", commit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); input.blur(); }
  });
  wrap.querySelector(".clear-library")?.addEventListener("click", () => {
    input.value = "";
    commit();
  });
  wrap.querySelectorAll("[data-library]").forEach((button) => button.addEventListener("click", () => {
    input.value = button.dataset.library;
    commit();
  }));
  wrap.querySelector(".manage-libraries")?.addEventListener("click", () => {
    if (managing) managedLibraryDates.delete(dateKey); else managedLibraryDates.add(dateKey);
    renderAll();
    if (openSheetDate) renderSheet(openSheetDate);
  });
  wrap.querySelectorAll("[data-remove-library]").forEach((button) => button.addEventListener("click", () => {
    removeSavedLibrary(data, button.dataset.removeLibrary);
    showToast("History removed");
    renderAll();
    if (openSheetDate) renderSheet(openSheetDate);
  }));
  return wrap;
}

function appendActivityRows(container, types, dateKey, compact = false) {
  const fragment = document.createDocumentFragment();
  types.forEach((type) => {
    fragment.append(activityRow(type, dateKey, compact));
    if (type.controlsDay && getEntry(data, dateKey).activities[dayControllerId] === 1) fragment.append(libraryField(dateKey));
  });
  container.replaceChildren(fragment);
}

function renderToday() {
  const primary = workoutTypes.filter((type) => type.primary);
  appendActivityRows(els.primary, primary, todayKey);
  const secondary = workoutTypes.filter((type) => !type.primary);
  appendActivityRows(els.secondary, secondary, todayKey, true);
  const entry = getEntry(data, todayKey);
  const extraCount = secondary.filter((type) => entry.activities[type.id]).length;
  els.moreCount.textContent = extraCount ? `${extraCount} active` : `${secondary.length} options`;
  els.more.classList.toggle("is-locked", entry.activities[dayControllerId] !== 1);
  if (extraCount) els.more.open = true;

  const count = activityVariety(entry);
  els.summaryCount.textContent = count ? `${count} ${count === 1 ? "activity" : "activities"}` : "No activities yet";
  const summaryLibrary = entry.activities[dayControllerId] ? entry.library : "";
  els.summaryLibrary.textContent = summaryLibrary || "";
  els.summaryLibrary.hidden = !summaryLibrary;
  els.summaryMark.classList.toggle("is-active", count > 0);
}

function activityVariety(entry) {
  return Object.values(entry.activities || {}).filter((value) => value > 0).length;
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  els.calendarMonth.textContent = calendarCursor.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const fragment = document.createDocumentFragment();

  els.nextMonth.disabled = year === today.getFullYear() && month === today.getMonth();
  for (let i = 0; i < firstDay; i += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-spacer";
    fragment.append(spacer);
  }
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    const entry = getEntry(data, key);
    const variety = activityVariety(entry);
    const future = date > todayStart;
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = future;
    button.className = `calendar-day${variety ? " has-entry" : ""}${variety >= 2 ? " level-2" : ""}${variety >= 4 ? " level-3" : ""}${key === todayKey ? " is-today" : ""}${future ? " is-future" : ""}`;
    button.dataset.date = key;
    button.setAttribute("aria-label", `${date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}${future ? "、未来の日付" : variety ? `、${variety}種類の記録あり` : "、記録なし"}`);
    button.innerHTML = `<span>${day}</span>${variety ? `<i aria-hidden="true"></i>` : ""}`;
    if (!future) button.addEventListener("click", () => openDaySheet(key, button));
    fragment.append(button);
  }
  els.calendarGrid.replaceChildren(fragment);

  const recent = Object.keys(data.entries).filter((key) => key <= todayKey && activityVariety(data.entries[key]) > 0).sort().reverse().slice(0, 5);
  if (!recent.length) {
    els.recentDays.innerHTML = `<p class="empty-copy">Your recorded days will appear here.</p>`;
  } else {
    els.recentDays.replaceChildren(...recent.map((key) => {
      const entry = getEntry(data, key);
      const date = fromDateKey(key);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "recent-day-row";
      const variety = activityVariety(entry);
      row.innerHTML = `<span class="recent-date"><strong>${date.toLocaleDateString(locale, { month: "short", day: "numeric" })}</strong><small>${entry.library ? escapeHtml(entry.library) : date.toLocaleDateString(locale, { weekday: "long" })}</small></span><span class="recent-activity-count">${variety}<small>${variety === 1 ? "type" : "types"}</small></span><span aria-hidden="true">→</span>`;
      row.addEventListener("click", () => openDaySheet(key, row));
      return row;
    }));
  }
}

function entriesForStats() {
  const prefix = statsMode === "month"
    ? `${statsMonthCursor.getFullYear()}-${String(statsMonthCursor.getMonth() + 1).padStart(2, "0")}`
    : `${statsYearCursor}-`;
  return Object.entries(data.entries).filter(([key]) => key <= todayKey && key.startsWith(prefix));
}

function aggregateEntries(entries) {
  const totals = Object.fromEntries(workoutTypes.map((type) => [type.id, 0]));
  const activityDays = Object.fromEntries(workoutTypes.map((type) => [type.id, 0]));
  const libraries = {};
  let days = 0;
  entries.forEach(([, entry]) => {
    if (activityVariety(entry) > 0) days += 1;
    Object.entries(entry.activities || {}).forEach(([id, value]) => {
      if (id in totals && value > 0) {
        totals[id] += value;
        activityDays[id] += 1;
      }
    });
    if (entry.library && entry.activities?.[dayControllerId]) libraries[entry.library] = (libraries[entry.library] || 0) + 1;
  });
  return { totals, activityDays, libraries, days };
}

function renderYearTrend() {
  const counts = Array.from({ length: 12 }, (_, month) => {
    const prefix = `${statsYearCursor}-${String(month + 1).padStart(2, "0")}`;
    return Object.entries(data.entries).filter(([key, entry]) => key <= todayKey && key.startsWith(prefix) && activityVariety(entry) > 0).length;
  });
  const monthIsFuture = (month) => statsYearCursor > today.getFullYear()
    || (statsYearCursor === today.getFullYear() && month > today.getMonth());
  const pastCounts = counts.filter((_, month) => !monthIsFuture(month));
  const max = Math.max(1, ...pastCounts);
  els.monthBars.innerHTML = counts.map((count, month) => {
    const future = monthIsFuture(month);
    return `
    <div class="month-bar-row${future ? " is-future" : ""}">
      <span>${new Date(2000, month, 1).toLocaleDateString(locale, { month: "short" }).toUpperCase()}</span>
      <div class="month-bar-track">${future ? "" : `<i style="--bar-width:${count ? Math.max(5, Math.round((count / max) * 100)) : 0}%"></i>`}</div>
      <strong>${future ? "—" : count}</strong>
    </div>`;
  }).join("");
}

function renderStats() {
  const isMonth = statsMode === "month";
  const label = isMonth
    ? statsMonthCursor.toLocaleDateString(locale, { month: "long", year: "numeric" })
    : String(statsYearCursor);
  els.statsPeriodLabel.textContent = label;
  els.previousStatsPeriod.setAttribute("aria-label", isMonth ? "前の月" : "前の年");
  els.nextStatsPeriod.setAttribute("aria-label", isMonth ? "次の月" : "次の年");
  els.nextStatsPeriod.disabled = isMonth
    ? statsMonthCursor.getFullYear() === today.getFullYear() && statsMonthCursor.getMonth() === today.getMonth()
    : statsYearCursor === today.getFullYear();
  document.querySelectorAll("[data-stats-mode]").forEach((button) => {
    const active = button.dataset.statsMode === statsMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });

  const { totals, activityDays, libraries, days } = aggregateEntries(entriesForStats());
  els.workoutDays.textContent = days;
  els.workoutDaysCard.setAttribute("aria-label", `${label}の活動日数 ${days}日`);
  const featured = ["visit", "borrow", "read", "browse", "study"].map((id) => workoutTypes.find((type) => type.id === id));
  els.statTotals.innerHTML = featured.map((type) => `<div><span>${type.shortLabel}</span><strong>${formatAggregateValue(type, totals[type.id])}</strong></div>`).join("");

  els.yearTrend.hidden = isMonth;
  if (!isMonth) renderYearTrend();
  els.chartTitle.textContent = isMonth ? "This month at a glance" : "This year at a glance";
  const activeTypes = workoutTypes.filter((type) => activityDays[type.id] > 0);
  const max = Math.max(1, ...activeTypes.map((type) => activityDays[type.id]));
  els.activityBars.innerHTML = activeTypes.length ? activeTypes.map((type) => {
    const recordedDays = activityDays[type.id];
    return `<div class="bar-row" aria-label="${type.shortLabel}: ${recordedDays} ${recordedDays === 1 ? "day" : "days"}, total ${formatAggregateValue(type, totals[type.id])}"><span>${type.shortLabel}</span><div class="bar-track" title="${recordedDays} ${recordedDays === 1 ? "day" : "days"}"><i style="--bar-width:${Math.max(8, Math.round((recordedDays / max) * 100))}%"></i></div><strong>${formatAggregateValue(type, totals[type.id])}</strong></div>`;
  }).join("") : `<p class="empty-copy">Activities recorded in this ${statsMode} will take shape here.</p>`;

  const libraryRows = Object.entries(libraries).sort((a, b) => b[1] - a[1]);
  els.librariesSection.hidden = !libraryRows.length;
  els.librariesTitle.textContent = isMonth ? "LIBRARIES THIS MONTH" : "LIBRARIES THIS YEAR";
  els.librariesList.innerHTML = libraryRows.map(([name, visits]) => `<div><span>${escapeHtml(name)}</span><strong>${visits} ${visits === 1 ? "visit" : "visits"}</strong></div>`).join("");
}

function moveStatsPeriod(delta) {
  if (statsMode === "month") statsMonthCursor = new Date(statsMonthCursor.getFullYear(), statsMonthCursor.getMonth() + delta, 1);
  else statsYearCursor += delta;
  renderStats();
}

function openDaySheet(dateKey, trigger) {
  if (isFutureDate(dateKey)) return;
  openSheetDate = dateKey;
  returnFocus = trigger;
  renderSheet(dateKey);
  els.backdrop.hidden = false;
  els.sheet.hidden = false;
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => {
    els.backdrop.classList.add("is-open");
    els.sheet.classList.add("is-open");
    document.querySelector("#close-sheet").focus();
  });
}

function renderSheet(dateKey) {
  const date = fromDateKey(dateKey);
  els.sheetTitle.textContent = date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  const rows = document.createElement("div");
  rows.className = "activity-list sheet-activities";
  appendActivityRows(rows, workoutTypes, dateKey, true);
  els.sheetContent.replaceChildren(rows);
}

function closeDaySheet() {
  stopHold();
  els.backdrop.classList.remove("is-open");
  els.sheet.classList.remove("is-open");
  document.body.classList.remove("sheet-open");
  setTimeout(() => {
    els.backdrop.hidden = true;
    els.sheet.hidden = true;
    openSheetDate = null;
    returnFocus?.focus();
  }, 220);
}

function openHelp() {
  helpReturnFocus = document.activeElement;
  els.helpBackdrop.hidden = false;
  els.helpSheet.hidden = false;
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => {
    els.helpBackdrop.classList.add("is-open");
    els.helpSheet.classList.add("is-open");
    els.closeHelp.focus();
  });
}

function closeHelp() {
  els.helpBackdrop.classList.remove("is-open");
  els.helpSheet.classList.remove("is-open");
  document.body.classList.remove("sheet-open");
  setTimeout(() => {
    els.helpBackdrop.hidden = true;
    els.helpSheet.hidden = true;
    helpReturnFocus?.focus();
    helpReturnFocus = null;
  }, 220);
}

function trapHelpFocus(event) {
  if (event.key !== "Tab" || els.helpSheet.hidden) return;
  const focusable = [...els.helpSheet.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function showToast(message, duration = 950, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle("is-error", isError);
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), duration);
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `library-workout-${todayKey}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Exported");
}

async function importData(file) {
  try {
    const parsed = JSON.parse(await file.text());
    if (!isValidImportData(parsed)) throw new Error("invalid");
    if (!window.confirm("Importすると現在の記録が置き換わります。よろしいですか？")) return;
    data = replaceData(parsed);
    renderAll();
    showToast("Import complete", 1600);
  } catch {
    showToast("Could not import this file", 2600, true);
  } finally {
    els.importInput.value = "";
  }
}

function navigate(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((section) => {
    const active = section.dataset.view === view;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    const active = button.dataset.target === view;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  if (view === "calendar") renderCalendar();
  if (view === "stats") renderStats();
  document.querySelector("#app-main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderToday();
  if (activeView === "calendar") renderCalendar();
  if (activeView === "stats") renderStats();
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.target)));
document.querySelector(".brand").addEventListener("click", (event) => { event.preventDefault(); navigate("today"); });
els.previousMonth.addEventListener("click", () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1); renderCalendar(); });
els.nextMonth.addEventListener("click", () => {
  const next = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  if (next <= new Date(today.getFullYear(), today.getMonth(), 1)) { calendarCursor = next; renderCalendar(); }
});
document.querySelectorAll("[data-stats-mode]").forEach((button) => button.addEventListener("click", () => { statsMode = button.dataset.statsMode; renderStats(); }));
els.previousStatsPeriod.addEventListener("click", () => moveStatsPeriod(-1));
els.nextStatsPeriod.addEventListener("click", () => { if (!els.nextStatsPeriod.disabled) moveStatsPeriod(1); });
document.querySelector("#export-data").addEventListener("click", exportData);
document.querySelector("#import-data").addEventListener("click", () => els.importInput.click());
els.importInput.addEventListener("change", () => { if (els.importInput.files?.[0]) importData(els.importInput.files[0]); });
document.querySelector("#close-sheet").addEventListener("click", closeDaySheet);
els.backdrop.addEventListener("click", closeDaySheet);
els.openHelp.addEventListener("click", openHelp);
els.closeHelp.addEventListener("click", closeHelp);
els.helpBackdrop.addEventListener("click", closeHelp);
document.addEventListener("pointerup", stopHold);
document.addEventListener("pointercancel", stopHold);
document.addEventListener("visibilitychange", () => { if (document.hidden) stopHold(); });
document.addEventListener("keydown", (event) => {
  trapHelpFocus(event);
  if (event.key === "Escape" && !els.helpSheet.hidden) closeHelp();
  else if (event.key === "Escape" && openSheetDate) closeDaySheet();
});

els.headerDate.textContent = today.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
renderAll();

function sampleData() {
  const sample = { version: 1, entries: {}, libraries: ["中央図書館", "大学図書館", "まちの図書室"], settings: { favorites: ["visit", "borrow", "read", "browse", "study"] } };
  for (let offset = 0; offset < 370; offset += 1) {
    if (![0, 2, 5, 8, 13, 21, 34, 55, 89, 144, 233, 365].includes(offset)) continue;
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    sample.entries[toDateKey(date)] = {
      library: offset % 3 === 0 ? "中央図書館" : offset % 3 === 2 ? "大学図書館" : "",
      activities: { visit: 1, read: 15 + (offset % 4) * 10, browse: 10 + (offset % 3) * 5, study: 20 + (offset % 5) * 10, ...(offset % 2 ? { borrow: 2 } : { lookup: 1 }), ...(offset % 5 === 0 ? { search: 1 } : {}) },
    };
  }
  return sample;
}

window.LibraryWorkoutDev = {
  loadSampleData() { data = replaceData(sampleData()); renderAll(); return `Sample data saved to ${storageKey}`; },
  clearAllData() { localStorage.removeItem(storageKey); data = loadData(); renderAll(); return "All local data cleared"; },
  exportData() { return JSON.stringify(data, null, 2); },
};

function registerWebMcp() {
  if (!document.modelContext?.registerTool) return;
  document.modelContext.registerTool({
    name: "record_library_activity",
    title: "Record library activity",
    description: "Record one library workout activity for today or a past local calendar date. A visit must be recorded before other activities.",
    inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, activity: { type: "string", enum: workoutTypes.map((type) => type.id) }, value: { type: "number", minimum: 0 } }, required: ["date", "activity", "value"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const type = workoutTypes.find((item) => item.id === input.activity);
      if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || isFutureDate(input.date) || !Number.isFinite(input.value) || input.value < 0) throw new Error("Invalid activity record");
      const normalized = type.inputType === "check" ? (input.value > 0 ? 1 : 0) : Math.round(input.value / type.step) * type.step;
      const value = type.max ? Math.min(type.max, normalized) : normalized;
      const entry = getEntry(data, input.date);
      if (!type.controlsDay && entry.activities[dayControllerId] !== 1) throw new Error("Record VISIT first");
      if (type.controlsDay && value === 0 && activityVariety(entry) > 1) throw new Error("Remove dependent activities in the interface first");
      if (type.controlsDay && value === 0) clearEntry(data, input.date); else setActivity(data, input.date, input.activity, value);
      renderAll();
      return { date: input.date, activity: input.activity, value };
    },
  });
}
registerWebMcp();
