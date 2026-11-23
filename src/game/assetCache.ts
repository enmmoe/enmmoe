import { AssetRecord, GameSaveState } from './types';

const DB_NAME = 'enmmoe_webtoon_life_db';
const DB_VERSION = 1;
const STORE_ASSETS = 'assets';
const STORE_SAVES = 'saves';

function openGameDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SAVES)) {
          db.createObjectStore(STORE_SAVES, { keyPath: 'slotId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getAssetFromCache(assetId: string): Promise<AssetRecord | null> {
  const db = await openGameDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ASSETS, 'readonly');
      const store = tx.objectStore(STORE_ASSETS);
      const req = store.get(assetId);
      req.onsuccess = () => resolve((req.result as AssetRecord) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveAssetToCache(record: AssetRecord): Promise<boolean> {
  const db = await openGameDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ASSETS, 'readwrite');
      const store = tx.objectStore(STORE_ASSETS);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function listAssetsByKind(kind?: AssetRecord['kind']): Promise<AssetRecord[]> {
  const db = await openGameDatabase();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ASSETS, 'readonly');
      const store = tx.objectStore(STORE_ASSETS);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = (req.result as AssetRecord[]) || [];
        resolve(kind ? all.filter((item) => item.kind === kind) : all);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function deleteAssetFromCache(assetId: string): Promise<boolean> {
  const db = await openGameDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ASSETS, 'readwrite');
      tx.objectStore(STORE_ASSETS).delete(assetId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function saveGameMirrorToIDB(
  slotId: string,
  state: GameSaveState
): Promise<boolean> {
  const db = await openGameDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVES, 'readwrite');
      tx.objectStore(STORE_SAVES).put({
        slotId,
        savedAt: Date.now(),
        state,
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function loadGameMirrorFromIDB(
  slotId: string
): Promise<GameSaveState | null> {
  const db = await openGameDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVES, 'readonly');
      const req = tx.objectStore(STORE_SAVES).get(slotId);
      req.onsuccess = () => {
        const row = req.result as { state?: GameSaveState } | undefined;
        resolve(row?.state || null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Compresses any dataURL image to WebP/JPEG within target maxDimension so mobile IndexedDB
 * stays compact and responsive without bloat.
 */
export async function compressDataUrlImage(
  dataUrl: string,
  maxDimension = 768,
  quality = 0.86
): Promise<{ dataUrl: string; mimeType: string; width: number; height: number }> {
  if (typeof window === 'undefined') {
    return { dataUrl, mimeType: 'image/png', width: 512, height: 640 };
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const srcW = Math.max(1, img.naturalWidth || 512);
      const srcH = Math.max(1, img.naturalHeight || 640);
      const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
      const width = Math.max(1, Math.round(srcW * scale));
      const height = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, mimeType: 'image/png', width: srcW, height: srcH });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp.startsWith('data:image/webp')) {
          resolve({ dataUrl: webp, mimeType: 'image/webp', width, height });
          return;
        }
      } catch {
        // Fallback below
      }
      try {
        const jpeg = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl: jpeg, mimeType: 'image/jpeg', width, height });
      } catch {
        resolve({ dataUrl, mimeType: 'image/png', width: srcW, height: srcH });
      }
    };
    img.onerror = () =>
      resolve({ dataUrl, mimeType: 'image/png', width: 512, height: 640 });
    img.src = dataUrl;
  });
}
