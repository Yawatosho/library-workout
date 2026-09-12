import { storageKey, workoutTypes } from "./data.js?v=16";

const workoutTypeById = new Map(workoutTypes.map((type) => [type.id, type]));

const emptyData = () => ({
  version: 1,
  entries: {},
  libraries: [],
  settings: { favorites: ["visit", "borrow", "read", "browse", "study"] },
});

function normalizeData(source) {
  const result = emptyData();
  if (!source || source.version !== 1 || typeof source.entries !== "object" || source.entries === null || Array.isArray(source.entries)) {
    return result;
  }

  Object.entries(source.entries).forEach(([dateKey, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !entry || typeof entry !== "object") return;
    const activities = {};
    if (entry.activities && typeof entry.activities === "object" && !Array.isArray(entry.activities)) {
      Object.entries(entry.activities).forEach(([id, rawValue]) => {
        const type = workoutTypeById.get(id);
        if (!type) return;
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) return;
        const normalized = type.inputType === "check" ? 1 : Math.max(type.step, Math.round(value / type.step) * type.step);
        activities[id] = type.max ? Math.min(type.max, normalized) : normalized;
      });
    }
    const library = typeof entry.library === "string" ? entry.library.trim().slice(0, 80) : "";
    if ((Object.keys(activities).length || library) && !activities.visit) activities.visit = 1;
    if (Object.keys(activities).length || library) result.entries[dateKey] = { library, activities };
  });

  result.libraries = Array.isArray(source.libraries)
    ? [...new Set(source.libraries.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 12)
    : [];
  if (source.settings && Array.isArray(source.settings.favorites)) {
    result.settings.favorites = source.settings.favorites.filter((item) => workoutTypeById.has(item));
  }
  return result;
}

export function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (!parsed || parsed.version !== 1 || typeof parsed.entries !== "object") return emptyData();
    const normalized = normalizeData(parsed);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) saveData(normalized);
    return normalized;
  } catch {
    return emptyData();
  }
}

export function saveData(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function getEntry(data, dateKey) {
  return data.entries[dateKey] || { library: "", activities: {} };
}

export function setActivity(data, dateKey, activityId, value) {
  const current = getEntry(data, dateKey);
  const activities = { ...current.activities };
  const type = workoutTypeById.get(activityId);
  if (value > 0 && type) {
    const normalized = type.inputType === "check" ? 1 : Math.max(type.step, Math.round(value / type.step) * type.step);
    activities[activityId] = type.max ? Math.min(type.max, normalized) : normalized;
  }
  else delete activities[activityId];

  const next = { ...current, activities };
  if (!next.library && Object.keys(activities).length === 0) delete data.entries[dateKey];
  else data.entries[dateKey] = next;
  saveData(data);
}

export function clearEntry(data, dateKey) {
  delete data.entries[dateKey];
  saveData(data);
}

export function setLibrary(data, dateKey, library) {
  const normalized = library.trim().replace(/\s+/g, " ");
  const current = getEntry(data, dateKey);
  const next = { ...current, library: normalized, activities: { ...current.activities } };

  if (normalized) {
    data.libraries = [normalized, ...data.libraries.filter((item) => item !== normalized)].slice(0, 12);
    data.entries[dateKey] = next;
  } else if (Object.keys(next.activities).length) {
    data.entries[dateKey] = next;
  } else {
    delete data.entries[dateKey];
  }
  saveData(data);
}

export function removeSavedLibrary(data, libraryName) {
  data.libraries = data.libraries.filter((name) => name !== libraryName);
  saveData(data);
}

export function replaceData(nextData) {
  const data = normalizeData(nextData);
  saveData(data);
  return data;
}

export function isValidImportData(value) {
  return Boolean(value && value.version === 1 && typeof value.entries === "object" && value.entries !== null && !Array.isArray(value.entries));
}
