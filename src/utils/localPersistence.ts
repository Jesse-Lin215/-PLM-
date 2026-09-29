// 本地状态缓存工具：防止任何自动重置或网络波动造成页面重新读取/刷新
const STORAGE_PREFIX = 'PLM_SYSTEM_DATA_V11_';

export function loadLocalState<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn(`[Storage] Failed to read ${key} from localStorage:`, e);
  }
  return defaultValue;
}

export function saveLocalState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn(`[Storage] Failed to write ${key} to localStorage:`, e);
  }
}

export function clearAllLocalState(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[Storage] Failed to clear localStorage:', e);
  }
}
