import { storageKey } from "./data.js";

const emptyData = () => ({
  version: 1,
  entries: {},
  libraries: [],
  settings: { favorites: ["visit", "borrow", "read", "browse", "lookup"] },
});

export function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (!parsed || parsed.version !== 1 || typeof parsed.entries !== "object") return emptyData();
    return {
      ...emptyData(),
      ...parsed,
      entries: parsed.entries || {},
      libraries: Array.isArray(parsed.libraries) ? parsed.libraries : [],
    };
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
  if (value > 0) activities[activityId] = value;
  else delete activities[activityId];

  const next = { ...current, activities };
  if (!next.library && Object.keys(activities).length === 0) delete data.entries[dateKey];
  else data.entries[dateKey] = next;
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

export function replaceData(nextData) {
  const data = { ...emptyData(), ...nextData, version: 1 };
  saveData(data);
  return data;
}
