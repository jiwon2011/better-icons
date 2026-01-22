import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface CollectionUsage {
  count: number;
  lastUsed: string;
}

export interface IconHistoryEntry {
  iconId: string;
  timestamp: string;
}

export interface Preferences {
  collections: Record<string, CollectionUsage>;
  history: IconHistoryEntry[];
}

const MAX_HISTORY_SIZE = 50;

const DEFAULT_PREFERENCES: Preferences = {
  collections: {},
  history: [],
};

export function getPreferencesPath(): string {
  return join(homedir(), ".better-icons", "preferences.json");
}

export function loadPreferences(): Preferences {
  const path = getPreferencesPath();
  
  if (!existsSync(path)) {
    return { ...DEFAULT_PREFERENCES };
  }
  
  try {
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content) as Preferences;
    return {
      collections: parsed.collections || {},
      history: parsed.history || [],
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, history: [] };
  }
}

export function savePreferences(prefs: Preferences): void {
  const path = getPreferencesPath();
  const dir = dirname(path);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(path, JSON.stringify(prefs, null, 2), "utf-8");
}

export function trackUsage(collectionPrefix: string): void {
  const prefs = loadPreferences();
  const existing = prefs.collections[collectionPrefix];
  
  prefs.collections[collectionPrefix] = {
    count: (existing?.count || 0) + 1,
    lastUsed: new Date().toISOString(),
  };
  
  savePreferences(prefs);
}

export function getPreferredCollections(): string[] {
  const prefs = loadPreferences();
  
  return Object.entries(prefs.collections)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([prefix]) => prefix);
}

export function clearPreferences(): void {
  savePreferences({ ...DEFAULT_PREFERENCES });
}
