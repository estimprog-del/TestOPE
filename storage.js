export const STORAGE_KEY = "testope.web.progress.v1";
export const INFO_ACK_KEY = "testope.web.info.acknowledged.v1";
export const PREFERENCES_KEY = "testope.web.preferences.v1";
export const PINNED_KEY = "testope.web.pinned-batteries.v1";
export const FILTER_KEY = "testope.web.battery-filter.v1";
export const THEMES = ["light", "dark", "sepia"];
export const MIN_FONT_SCALE = 0.9;
export const MAX_FONT_SCALE = 1.4;

export function normalizePreferences(value) {
  return {
    theme: THEMES.includes(value?.theme) ? value.theme : "light",
    fontScale: Number.isFinite(value?.fontScale)
      ? Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(value.fontScale * 10) / 10))
      : 1
  };
}

function readJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readProgress() {
  const progress = readJson(STORAGE_KEY, null);
  if (!progress) {
    return { results: [], failed: [], attempted: [], answerOverrides: {} };
  }
  return {
    results: Array.isArray(progress.results) ? progress.results : [],
    failed: Array.isArray(progress.failed) ? progress.failed : [],
    attempted: Array.isArray(progress.attempted) ? progress.attempted : [],
    answerOverrides: progress.answerOverrides && typeof progress.answerOverrides === "object"
      ? progress.answerOverrides
      : {}
  };
}

export function readPreferences() {
  return normalizePreferences(readJson(PREFERENCES_KEY, {}));
}

export function readPinnedBatteries() {
  const parsed = readJson(PINNED_KEY, []);
  return Array.isArray(parsed) ? parsed.filter(String) : [];
}

export function readBatteryFilter() {
  const stored = readJson(FILTER_KEY, null);
  return typeof stored === "string" && ["all", "favorites", "pinned"].includes(stored)
    ? stored
    : "all";
}

export function savePreferencesRaw(preferences) {
  return writeJson(PREFERENCES_KEY, preferences);
}

export function savePinnedBatteriesRaw(ids) {
  return writeJson(PINNED_KEY, [...new Set(ids)]);
}

export function saveBatteryFilterRaw(filter) {
  return writeJson(FILTER_KEY, filter);
}
