import { workoutTypes, unitLabels, storageKey } from "./data.js";
import { getEntry, loadData, replaceData, setActivity, setLibrary } from "./storage.js";

const locale = "en-US";
const today = new Date();
const todayKey = toDateKey(today);
let data = loadData();
let activeView = "today";
let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let openSheetDate = null;
let returnFocus = null;
let toastTimer = null;

const els = {
  headerDate: document.querySelector("#header-date"),
  primary: document.querySelector("#primary-activities"),
  secondary: document.querySelector("#secondary-activities"),
  more: document.querySelector("#more-workouts"),
  moreCount: document.querySelector("#more-count"),
  summaryCount: document.querySelector("#today-summary-count"),
  summaryLibrary: document.querySelector("#today-summary-library"),
  summaryMark: document.querySelector("#today-summary-mark"),
  calendarMonth: document.querySelector("#calendar-month"),
  calendarGrid: document.querySelector("#calendar-grid"),
  recentDays: document.querySelector("#recent-days-list"),
  statsMonth: document.querySelector("#stats-month"),
  workoutDays: document.querySelector("#workout-days-number"),
  statTotals: document.querySelector("#stat-totals"),
  activityBars: document.querySelector("#activity-bars"),
  librariesSection: document.querySelector("#libraries-month-section"),
  librariesList: document.querySelector("#libraries-month-list"),
  backdrop: document.querySelector("#sheet-backdrop"),
  sheet: document.querySelector("#day-sheet"),
  sheetTitle: document.querySelector("#sheet-title"),
  sheetContent: document.querySelector("#sheet-content"),
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

function formatValue(type, value) {
  if (type.id === "visit") return value ? "✓" : "—";
  const unit = unitLabels[type.unit];
  return unit ? `${value} ${unit}` : String(value);
}

function activityRow(type, dateKey, compact = false) {
  const value = getEntry(data, dateKey).activities[type.id] || 0;
  const row = document.createElement("div");
  row.className = `activity-row${value ? " has-value" : ""}${compact ? " is-compact" : ""}`;
  row.dataset.activity = type.id;
  row.innerHTML = `
    <div class="activity-copy">
      <span class="activity-name">${type.shortLabel}</span>
      <span class="activity-description">${type.label}</span>
    </div>
    <div class="stepper" aria-label="${type.label}">
      <button type="button" class="step-button minus" aria-label="${type.label}を減らす" ${value === 0 ? "disabled" : ""}>−</button>
      <output aria-live="polite">${formatValue(type, value)}</output>
      <button type="button" class="step-button plus" aria-label="${type.label}を増やす">＋</button>
    </div>`;

  row.querySelector(".minus").addEventListener("click", () => changeActivity(dateKey, type, -type.step));
  row.querySelector(".plus").addEventListener("click", () => changeActivity(dateKey, type, type.step));
  return row;
}

function changeActivity(dateKey, type, delta) {
  const current = getEntry(data, dateKey).activities[type.id] || 0;
  const next = Math.max(0, current + delta);
  setActivity(data, dateKey, type.id, next);
  if (type.id === "visit" && next === 0) setLibrary(data, dateKey, "");
  showToast(next ? "Recorded" : "Removed");
  renderAll();
  if (openSheetDate) renderSheet(openSheetDate);
  document.querySelectorAll(`[data-activity="${type.id}"]`).forEach((row) => {
    row.classList.add("just-changed");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      row.querySelector("output")?.animate(
        [{ transform: "translateY(3px)", opacity: .35 }, { transform: "translateY(0)", opacity: 1 }],
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
  wrap.innerHTML = `
    <label for="library-${dateKey}">Which library? <span>Optional</span></label>
    <div class="library-input-wrap">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V6l8-3 8 3v14M8 20v-8h8v8M3 20h18" /></svg>
      <input id="library-${dateKey}" type="text" maxlength="80" value="${escapeHtml(entry.library || "")}" placeholder="Add a library name" autocomplete="off" list="${listId}" />
      ${entry.library ? `<button type="button" class="clear-library" aria-label="図書館名を削除">×</button>` : ""}
    </div>
    <datalist id="${listId}">${data.libraries.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>
    ${data.libraries.length ? `<div class="recent-libraries"><span>Recent</span>${data.libraries.slice(0, 3).map((name) => `<button type="button" data-library="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div>` : ""}
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
  return wrap;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function renderToday() {
  els.primary.replaceChildren(...workoutTypes.filter((type) => type.primary).map((type) => activityRow(type, todayKey)));
  const secondary = workoutTypes.filter((type) => !type.primary);
  els.secondary.replaceChildren(...secondary.map((type) => activityRow(type, todayKey, true)));
  const entry = getEntry(data, todayKey);
  const extraCount = secondary.filter((type) => entry.activities[type.id]).length;
  els.moreCount.textContent = extraCount ? `${extraCount} active` : "7 options";
  if (extraCount) els.more.open = true;

  if (entry.activities.visit) els.primary.append(libraryField(todayKey));
  const count = Object.values(entry.activities).filter((value) => value > 0).length;
  els.summaryCount.textContent = count ? `${count} ${count === 1 ? "activity" : "activities"}` : "No activities yet";
  const summaryLibrary = entry.activities.visit ? entry.library : "";
  els.summaryLibrary.textContent = summaryLibrary || "";
  els.summaryLibrary.hidden = !summaryLibrary;
  els.summaryMark.classList.toggle("is-active", count > 0);
}

function activityWeight(entry) {
  return Object.entries(entry.activities || {}).reduce((sum, [id, value]) => {
    const type = workoutTypes.find((item) => item.id === id);
    if (!type) return sum;
    return sum + (type.unit === "minutes" ? value / 10 : value);
  }, 0);
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  els.calendarMonth.textContent = calendarCursor.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < firstDay; i += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-spacer";
    fragment.append(spacer);
  }
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    const entry = getEntry(data, key);
    const weight = activityWeight(entry);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day${weight ? " has-entry" : ""}${weight >= 5 ? " level-2" : ""}${weight >= 12 ? " level-3" : ""}${key === todayKey ? " is-today" : ""}`;
    button.dataset.date = key;
    button.setAttribute("aria-label", `${date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}${weight ? "、記録あり" : "、記録なし"}`);
    button.innerHTML = `<span>${day}</span>${weight ? `<i aria-hidden="true"></i>` : ""}`;
    button.addEventListener("click", () => openDaySheet(key, button));
    fragment.append(button);
  }
  els.calendarGrid.replaceChildren(fragment);

  const recent = Object.keys(data.entries).filter((key) => activityWeight(data.entries[key]) > 0).sort().reverse().slice(0, 5);
  if (!recent.length) {
    els.recentDays.innerHTML = `<p class="empty-copy">Your recorded days will appear here.</p>`;
  } else {
    els.recentDays.replaceChildren(...recent.map((key) => {
      const entry = getEntry(data, key);
      const date = fromDateKey(key);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "recent-day-row";
      row.innerHTML = `<span class="recent-date"><strong>${date.toLocaleDateString(locale, { month: "short", day: "numeric" })}</strong><small>${entry.library ? escapeHtml(entry.library) : date.toLocaleDateString(locale, { weekday: "long" })}</small></span><span class="recent-activity-count">${Object.keys(entry.activities).length}<small>activities</small></span><span aria-hidden="true">→</span>`;
      row.addEventListener("click", () => openDaySheet(key, row));
      return row;
    }));
  }
}

function renderStats() {
  const year = today.getFullYear();
  const month = today.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const entries = Object.entries(data.entries).filter(([key]) => key.startsWith(prefix));
  const totals = Object.fromEntries(workoutTypes.map((type) => [type.id, 0]));
  const libraries = {};
  let days = 0;

  entries.forEach(([, entry]) => {
    if (Object.values(entry.activities || {}).some((value) => value > 0)) days += 1;
    Object.entries(entry.activities || {}).forEach(([id, value]) => { if (id in totals) totals[id] += value; });
    if (entry.library && entry.activities?.visit) libraries[entry.library] = (libraries[entry.library] || 0) + entry.activities.visit;
  });

  els.statsMonth.textContent = today.toLocaleDateString(locale, { month: "long", year: "numeric" });
  els.workoutDays.textContent = days;
  const featured = ["visit", "borrow", "read", "browse", "search"].map((id) => workoutTypes.find((type) => type.id === id));
  els.statTotals.innerHTML = featured.map((type) => `<div><span>${type.shortLabel}</span><strong>${formatValue(type, totals[type.id])}</strong></div>`).join("");

  const activeTypes = workoutTypes.filter((type) => totals[type.id] > 0);
  const max = Math.max(1, ...activeTypes.map((type) => type.unit === "minutes" ? totals[type.id] / type.step : totals[type.id]));
  els.activityBars.innerHTML = activeTypes.length ? activeTypes.map((type) => {
    const normalized = type.unit === "minutes" ? totals[type.id] / type.step : totals[type.id];
    return `<div class="bar-row"><span>${type.shortLabel}</span><div class="bar-track"><i style="--bar-width:${Math.max(8, Math.round((normalized / max) * 100))}%"></i></div><strong>${formatValue(type, totals[type.id])}</strong></div>`;
  }).join("") : `<p class="empty-copy">Activities recorded this month will take shape here.</p>`;

  const libraryRows = Object.entries(libraries).sort((a, b) => b[1] - a[1]);
  els.librariesSection.hidden = !libraryRows.length;
  els.librariesList.innerHTML = libraryRows.map(([name, visits]) => `<div><span>${escapeHtml(name)}</span><strong>${visits} ${visits === 1 ? "visit" : "visits"}</strong></div>`).join("");
}

function openDaySheet(dateKey, trigger) {
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
  const entry = getEntry(data, dateKey);
  els.sheetTitle.textContent = date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
  const rows = document.createElement("div");
  rows.className = "activity-list sheet-activities";
  rows.replaceChildren(...workoutTypes.map((type) => activityRow(type, dateKey, true)));
  const content = document.createDocumentFragment();
  content.append(rows);
  if (entry.activities.visit || entry.library) content.append(libraryField(dateKey));
  els.sheetContent.replaceChildren(content);
}

function closeDaySheet() {
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

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 950);
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
document.querySelector("#previous-month").addEventListener("click", () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1); renderCalendar(); });
document.querySelector("#next-month").addEventListener("click", () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1); renderCalendar(); });
document.querySelector("#close-sheet").addEventListener("click", closeDaySheet);
els.backdrop.addEventListener("click", closeDaySheet);
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && openSheetDate) closeDaySheet(); });

els.headerDate.textContent = today.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
renderAll();

function sampleData() {
  const sample = { version: 1, entries: {}, libraries: ["中央図書館", "大学図書館", "まちの図書室"], settings: { favorites: ["visit", "borrow", "read", "browse", "lookup"] } };
  for (let offset = 0; offset < 28; offset += 1) {
    if (![0, 2, 5, 8, 9, 13, 17, 21, 26].includes(offset)) continue;
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    if (date.getMonth() !== today.getMonth()) continue;
    sample.entries[toDateKey(date)] = {
      library: offset % 3 === 0 ? "中央図書館" : offset % 3 === 2 ? "大学図書館" : "",
      activities: { visit: 1, read: 15 + (offset % 4) * 10, browse: 10 + (offset % 3) * 5, ...(offset % 2 ? { borrow: 2 } : { lookup: 1 }), ...(offset % 5 === 0 ? { search: 2 } : {}) },
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
    description: "Record one library workout activity for a local calendar date.",
    inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, activity: { type: "string", enum: workoutTypes.map((type) => type.id) }, value: { type: "number", minimum: 0 } }, required: ["date", "activity", "value"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const type = workoutTypes.find((item) => item.id === input.activity);
      if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(input.value) || input.value < 0) throw new Error("Invalid activity record");
      const value = Math.round(input.value / type.step) * type.step;
      setActivity(data, input.date, input.activity, value);
      renderAll();
      return { date: input.date, activity: input.activity, value };
    },
  });
}
registerWebMcp();
