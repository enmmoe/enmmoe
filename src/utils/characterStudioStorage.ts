import {
  CharacterConfig,
  GraphicsQuality,
  SavedOutfitLook,
  SavedStudioPhoto,
  StoreFashionItem,
  StudioPhotoFilterId,
  STUDIO_PHOTO_FILTERS,
  WalletState,
  WorldDistrictId,
  createDefaultCharacter,
} from '../types/characterStudio';
import { safeStorage } from './storage';

const CHARACTERS_STORAGE_KEY = 'enmmoe_3d_characters_v2';
const ACTIVE_CHARACTER_ID_KEY = 'enmmoe_3d_active_character_v2';
const OUTFIT_LOOKS_KEY = 'enmmoe_3d_outfits_v2';
const STUDIO_PHOTOS_KEY = 'enmmoe_3d_studio_photos_v2';
const WALLET_STORAGE_KEY = 'enmmoe_3d_wallet_v1';
const QUALITY_STORAGE_KEY = 'enmmoe_3d_quality_v1';

const MAX_SAVED_CHARACTERS = 4;
const MAX_SAVED_PHOTOS = 24;
const MAX_SAVED_OUTFITS = 10;

const DEFAULT_WALLET: WalletState = {
  balance: 120000,
  ownedItemIds: [],
  discoveredDistricts: ['seongsu_street', 'photo_studio'],
  photosTaken: 0,
  lastDailyClaimAt: 0,
};

function normalizeCharacter(raw: Partial<CharacterConfig>): CharacterConfig {
  const frame = raw.frame === 'male' ? 'male' : 'female';
  const base = createDefaultCharacter(frame, raw.id || `char-${Date.now()}`, raw.name || 'Seo-yeon');
  return {
    ...base,
    ...raw,
    frame,
    primaryFabric: raw.primaryFabric || base.primaryFabric,
    secondaryFabric: raw.secondaryFabric || base.secondaryFabric,
  };
}

export function getSavedCharacters(): CharacterConfig[] {
  const list = safeStorage.getJSON<Partial<CharacterConfig>[]>(CHARACTERS_STORAGE_KEY, []);
  if (Array.isArray(list) && list.length > 0) {
    return list.map(normalizeCharacter);
  }
  const starter = createDefaultCharacter('female', 'char-default-seoyeon', 'Seo-yeon');
  return [starter];
}

export function saveCharacterSlot(character: CharacterConfig): CharacterConfig[] {
  const existing = getSavedCharacters();
  const nextChar: CharacterConfig = { ...character, updatedAt: Date.now() };
  const idx = existing.findIndex((c) => c.id === nextChar.id);

  let updated: CharacterConfig[];
  if (idx >= 0) {
    updated = existing.map((c) => (c.id === nextChar.id ? nextChar : c));
  } else {
    updated = [nextChar, ...existing].slice(0, MAX_SAVED_CHARACTERS);
  }

  safeStorage.setJSON(CHARACTERS_STORAGE_KEY, updated);
  safeStorage.setItem(ACTIVE_CHARACTER_ID_KEY, nextChar.id);
  return updated;
}

export function deleteCharacterSlot(characterId: string): CharacterConfig[] {
  const existing = getSavedCharacters();
  const filtered = existing.filter((c) => c.id !== characterId);
  const next =
    filtered.length > 0
      ? filtered
      : [createDefaultCharacter('female', 'char-default-seoyeon', 'Seo-yeon')];
  safeStorage.setJSON(CHARACTERS_STORAGE_KEY, next);
  if (getActiveCharacterId() === characterId) {
    safeStorage.setItem(ACTIVE_CHARACTER_ID_KEY, next[0].id);
  }
  return next;
}

export function getActiveCharacterId(): string {
  return safeStorage.getItem(ACTIVE_CHARACTER_ID_KEY) || getSavedCharacters()[0].id;
}

export function setActiveCharacterId(characterId: string): void {
  safeStorage.setItem(ACTIVE_CHARACTER_ID_KEY, characterId);
}

export function getSavedOutfitLooks(): SavedOutfitLook[] {
  return safeStorage.getJSON<SavedOutfitLook[]>(OUTFIT_LOOKS_KEY, []);
}

export function saveOutfitLook(character: CharacterConfig, label: string): SavedOutfitLook[] {
  const existing = getSavedOutfitLooks();
  const newLook: SavedOutfitLook = {
    id: `look-${Date.now()}`,
    name: label.trim() || `Look ${existing.length + 1}`,
    outfitPreset: character.outfitPreset,
    topStyle: character.topStyle,
    bottomStyle: character.bottomStyle,
    outerwearStyle: character.outerwearStyle,
    footwearStyle: character.footwearStyle,
    primaryOutfitColor: character.primaryOutfitColor,
    secondaryOutfitColor: character.secondaryOutfitColor,
    footwearColor: character.footwearColor,
    primaryFabric: character.primaryFabric,
    secondaryFabric: character.secondaryFabric,
    glassesStyle: character.glassesStyle,
    jewelryStyle: character.jewelryStyle,
    bagStyle: character.bagStyle,
  };
  const next = [newLook, ...existing].slice(0, MAX_SAVED_OUTFITS);
  safeStorage.setJSON(OUTFIT_LOOKS_KEY, next);
  return next;
}

export function getSavedStudioPhotos(): SavedStudioPhoto[] {
  return safeStorage.getJSON<SavedStudioPhoto[]>(STUDIO_PHOTOS_KEY, []);
}

export function saveStudioPhoto(photo: SavedStudioPhoto): SavedStudioPhoto[] {
  const existing = getSavedStudioPhotos();
  const next = [photo, ...existing.filter((p) => p.id !== photo.id)].slice(0, MAX_SAVED_PHOTOS);
  safeStorage.setJSON(STUDIO_PHOTOS_KEY, next);
  return next;
}

export function deleteStudioPhoto(photoId: string): SavedStudioPhoto[] {
  const existing = getSavedStudioPhotos();
  const next = existing.filter((p) => p.id !== photoId);
  safeStorage.setJSON(STUDIO_PHOTOS_KEY, next);
  return next;
}

// =========================================================================
// ECONOMY WALLET & GRAPHICS QUALITY STORAGE
// =========================================================================

export function getWalletState(): WalletState {
  const saved = safeStorage.getJSON<Partial<WalletState>>(WALLET_STORAGE_KEY, {});
  return {
    balance: typeof saved.balance === 'number' ? saved.balance : DEFAULT_WALLET.balance,
    ownedItemIds: Array.isArray(saved.ownedItemIds) ? saved.ownedItemIds : [],
    discoveredDistricts:
      Array.isArray(saved.discoveredDistricts) && saved.discoveredDistricts.length > 0
        ? saved.discoveredDistricts
        : DEFAULT_WALLET.discoveredDistricts,
    photosTaken: typeof saved.photosTaken === 'number' ? saved.photosTaken : 0,
    lastDailyClaimAt: typeof saved.lastDailyClaimAt === 'number' ? saved.lastDailyClaimAt : 0,
  };
}

function writeWalletState(wallet: WalletState): WalletState {
  safeStorage.setJSON(WALLET_STORAGE_KEY, wallet);
  return wallet;
}

export function purchaseStoreItem(item: StoreFashionItem): {
  success: boolean;
  alreadyOwned?: boolean;
  wallet: WalletState;
} {
  const wallet = getWalletState();
  if (wallet.ownedItemIds.includes(item.id)) {
    return { success: true, alreadyOwned: true, wallet };
  }
  if (wallet.balance < item.price) {
    return { success: false, wallet };
  }
  const next = writeWalletState({
    ...wallet,
    balance: wallet.balance - item.price,
    ownedItemIds: [...wallet.ownedItemIds, item.id],
  });
  return { success: true, wallet: next };
}

export function payTravelFare(
  districtId: WorldDistrictId,
  fare: number
): { success: boolean; newlyDiscovered: boolean; wallet: WalletState } {
  const wallet = getWalletState();
  if (wallet.balance < fare) {
    return { success: false, newlyDiscovered: false, wallet };
  }
  const newlyDiscovered = !wallet.discoveredDistricts.includes(districtId);
  const discoveryBonus = newlyDiscovered && fare > 0 ? 4000 : 0;
  const next = writeWalletState({
    ...wallet,
    balance: wallet.balance - fare + discoveryBonus,
    discoveredDistricts: newlyDiscovered
      ? [...wallet.discoveredDistricts, districtId]
      : wallet.discoveredDistricts,
  });
  return { success: true, newlyDiscovered, wallet: next };
}

export function grantActivityReward(amount: number, incrementPhotos = false): WalletState {
  const wallet = getWalletState();
  return writeWalletState({
    ...wallet,
    balance: wallet.balance + amount,
    photosTaken: incrementPhotos ? wallet.photosTaken + 1 : wallet.photosTaken,
  });
}

export function claimDailyAllowance(): { claimed: boolean; wallet: WalletState } {
  const wallet = getWalletState();
  const oneDayMs = 20 * 3600 * 1000;
  if (Date.now() - wallet.lastDailyClaimAt < oneDayMs) {
    return { claimed: false, wallet };
  }
  const next = writeWalletState({
    ...wallet,
    balance: wallet.balance + 15000,
    lastDailyClaimAt: Date.now(),
  });
  return { claimed: true, wallet: next };
}

export function getGraphicsQuality(): GraphicsQuality {
  const raw = safeStorage.getItem(QUALITY_STORAGE_KEY);
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  const isSmallMobile =
    typeof window !== 'undefined' && /Android|iPhone/i.test(navigator.userAgent);
  return isSmallMobile ? 'medium' : 'high';
}

export function setGraphicsQuality(q: GraphicsQuality): void {
  safeStorage.setItem(QUALITY_STORAGE_KEY, q);
}

/**
 * Renders the final WebGL capture through optional film grading and Story text/sticker overlays,
 * producing a crisp, clean JPEG export (never a UI screenshot).
 */
export async function composeStudioPhotoExport(options: {
  rawCanvasDataUrl: string;
  filterId: StudioPhotoFilterId;
  caption?: string;
  stickerLabel?: string;
  squareAvatarCrop?: boolean;
}): Promise<string> {
  const { rawCanvasDataUrl, filterId, caption, stickerLabel, squareAvatarCrop } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const targetWidth = squareAvatarCrop ? 640 : Math.min(1080, img.naturalWidth || 1080);
      const targetHeight = squareAvatarCrop
        ? 640
        : Math.round(targetWidth * ((img.naturalHeight || 1350) / Math.max(1, img.naturalWidth || 1080)));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetWidth;
      outCanvas.height = targetHeight;
      const ctx = outCanvas.getContext('2d');
      if (!ctx) {
        resolve(rawCanvasDataUrl);
        return;
      }

      const filterMeta = STUDIO_PHOTO_FILTERS.find((f) => f.id === filterId);
      if (filterMeta && filterMeta.cssFilter !== 'none') {
        ctx.filter = filterMeta.cssFilter;
      }

      if (squareAvatarCrop) {
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        const side = Math.min(srcW, srcH);
        const sx = Math.max(0, (srcW - side) * 0.5);
        const sy = Math.max(0, (srcH - side) * 0.14);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetWidth, targetHeight);
      } else {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      ctx.filter = 'none';

      if (stickerLabel && stickerLabel.trim() && !squareAvatarCrop) {
        ctx.save();
        ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        const text = stickerLabel.trim();
        const metrics = ctx.measureText(text);
        const padX = 20;
        const boxW = metrics.width + padX * 2;
        const boxH = 44;
        const x = 32;
        const y = 36;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.roundRect(x, y, boxW, boxH, 14);
        ctx.fill();

        ctx.fillStyle = '#007AFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + padX, y + boxH / 2 + 1);
        ctx.restore();
      }

      if (caption && caption.trim() && !squareAvatarCrop) {
        ctx.save();
        const text = caption.trim();
        ctx.font = '600 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
        const maxWidth = targetWidth - 80;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach((word) => {
          const test = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(test).width <= maxWidth) {
            currentLine = test;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);

        const lineHeight = 34;
        const blockHeight = lines.length * lineHeight + 28;
        const startY = targetHeight - blockHeight - 44;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
        ctx.beginPath();
        ctx.roundRect(32, startY, targetWidth - 64, blockHeight, 20);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((line, idx) => {
          ctx.fillText(line, targetWidth / 2, startY + 26 + idx * lineHeight);
        });
        ctx.restore();
      }

      try {
        resolve(outCanvas.toDataURL('image/jpeg', 0.88));
      } catch {
        resolve(rawCanvasDataUrl);
      }
    };
    img.onerror = () => resolve(rawCanvasDataUrl);
    img.src = rawCanvasDataUrl;
  });
}
