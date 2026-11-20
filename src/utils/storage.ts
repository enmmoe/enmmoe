/**
 * Safe LocalStorage Wrapper
 * Handles restricted iframes, private browsing mode, disabled storage,
 * and quota limits without throwing uncaught exceptions.
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryFallback = new MemoryStorage();

function getStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const testKey = '__enmmoe_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Storage restricted, blocked by iframe sandbox, or cookies disabled
  }
  return memoryFallback;
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return getStorage().getItem(key);
    } catch {
      return memoryFallback.getItem(key);
    }
  },

  setItem(key: string, value: string): void {
    try {
      getStorage().setItem(key, value);
    } catch {
      memoryFallback.setItem(key, value);
    }
  },

  removeItem(key: string): void {
    try {
      getStorage().removeItem(key);
    } catch {
      memoryFallback.removeItem(key);
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = this.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJSON(key: string, value: unknown): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  },
};
