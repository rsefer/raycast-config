import { LocalStorage } from "@raycast/api";

export type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

export async function getCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.timestamp !== "number") {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

export function isCacheFresh(entry: CacheEntry<unknown>, maxAgeMs: number) {
  return Date.now() - entry.timestamp < maxAgeMs;
}

export async function setCacheEntry<T>(key: string, value: T) {
  const entry: CacheEntry<T> = {
    value,
    timestamp: Date.now(),
  };

  await LocalStorage.setItem(key, JSON.stringify(entry));
}

export async function clearCacheEntry(key: string) {
  await LocalStorage.removeItem(key);
}
