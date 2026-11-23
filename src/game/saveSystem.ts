import { loadGameMirrorFromIDB, saveGameMirrorToIDB } from './assetCache';
import { MAIN_CHARACTERS } from './characterData';
import { BOUTIQUE_OUTFITS } from './wardrobeCatalog';
import {
  GameSaveState,
  LocationId,
  OutfitItem,
  PlayerCharacter,
  RelationshipState,
  TimeOfDay,
} from './types';
import { safeStorage } from '../utils/storage';

export const STARTING_MONEY = 135000;
const SAVE_PRIMARY_KEY = 'enmmoe_webtoon_save_v1';
const SAVE_BACKUP_KEY = 'enmmoe_webtoon_save_backup_v1';

export const LOCATION_META: Record<
  LocationId,
  {
    id: LocationId;
    name: string;
    koreanName: string;
    subtitle: string;
    streetX: number;
    timeAdvanceOnEnter?: boolean;
  }
> = {
  street: {
    id: 'street',
    name: 'Seongsu Promenade',
    koreanName: '성수 산책로',
    subtitle: 'Sunlit Korean webtoon avenue',
    streetX: 50,
  },
  home: {
    id: 'home',
    name: 'Home Loft',
    koreanName: '우리 집',
    subtitle: 'Rest to start a fresh morning & organize outfits',
    streetX: 11,
  },
  cafe: {
    id: 'cafe',
    name: 'Cafe Bomnal',
    koreanName: '봄날 카페',
    subtitle: 'Pastel bakery dates, desserts & barista work',
    streetX: 25,
  },
  boutique: {
    id: 'boutique',
    name: 'Atelier Boutique',
    koreanName: '아틀리에 부티크',
    subtitle: '32+ curated looks, gift counter & styling job',
    streetX: 40,
  },
  photo_studio: {
    id: 'photo_studio',
    name: 'Starlight Photo Studio',
    koreanName: '별빛 사진관',
    subtitle: 'Solo, couple & outfit portraits + PNG export',
    streetX: 55,
  },
  park: {
    id: 'park',
    name: 'Cherry Fountain Park',
    koreanName: '벚꽃 공원',
    subtitle: 'Picnic strolls, portraits & street photography gig',
    streetX: 70,
  },
  metro: {
    id: 'metro',
    name: 'Seoul Metro Station',
    koreanName: '지하철역',
    subtitle: 'Quick transit across districts',
    streetX: 84,
  },
  taxi: {
    id: 'taxi',
    name: 'Orange Taxi Stand',
    koreanName: '택시 승강장',
    subtitle: 'Instant evening or afternoon ride',
    streetX: 93,
  },
};

export function createInitialPlayerCharacter(customName = 'Seo-yeon'): PlayerCharacter {
  const now = Date.now();
  return {
    id: 'player_main',
    name: customName,
    presentation: 'feminine',
    faceShape: 'oval',
    hairStyle: 'silky_waves',
    hairColor: '#2B2228',
    skinTone: '#FCE3D4',
    eyeColor: '#4A3642',
    equippedOutfitId: 'casual_mint_cardigan',
    accessory: 'none',
    masterReferenceAssetId: 'ref:player:player_main',
    createdAt: now,
    updatedAt: now,
  };
}

function createInitialRelationships(): Record<string, RelationshipState> {
  const map: Record<string, RelationshipState> = {};
  for (const c of MAIN_CHARACTERS) {
    map[c.id] = {
      affection: 8,
      conversationsHad: 0,
      datesHad: 0,
      giftsGiven: 0,
      unlockedEventIds: [],
      rememberedChoices: {},
      lastMetDay: 0,
    };
  }
  return map;
}

export function createFreshGameSave(playerName = 'Seo-yeon'): GameSaveState {
  return {
    version: 1,
    player: createInitialPlayerCharacter(playerName),
    money: STARTING_MONEY,
    day: 1,
    timeOfDay: 'morning',
    currentLocation: 'street',
    playerX: 46,
    facing: 'right',
    ownedOutfitIds: ['casual_mint_cardigan'],
    customOutfits: [],
    inventoryGifts: {
      gift_strawberry_daifuku: 1,
    },
    relationships: createInitialRelationships(),
    unlockedLocations: ['street', 'home', 'cafe', 'boutique', 'photo_studio', 'park', 'metro', 'taxi'],
    choiceLog: [],
    studioGallery: [],
    settings: {
      textSpeed: 'normal',
      soundEnabled: true,
      swipeMoveEnabled: true,
    },
    lastSavedAt: Date.now(),
  };
}

function normalizeSaveState(raw: Partial<GameSaveState> | null | undefined): GameSaveState {
  const fresh = createFreshGameSave();
  if (!raw || typeof raw !== 'object') return fresh;

  const mergedRelationships: Record<string, RelationshipState> = { ...fresh.relationships };
  if (raw.relationships && typeof raw.relationships === 'object') {
    for (const c of MAIN_CHARACTERS) {
      const existing = raw.relationships[c.id];
      if (existing) {
        mergedRelationships[c.id] = {
          affection: typeof existing.affection === 'number' ? Math.max(0, existing.affection) : 8,
          conversationsHad: existing.conversationsHad || 0,
          datesHad: existing.datesHad || 0,
          giftsGiven: existing.giftsGiven || 0,
          unlockedEventIds: Array.isArray(existing.unlockedEventIds) ? existing.unlockedEventIds : [],
          rememberedChoices: existing.rememberedChoices || {},
          lastMetDay: existing.lastMetDay || 0,
        };
      }
    }
  }

  return {
    version: 1,
    player: {
      ...fresh.player,
      ...(raw.player || {}),
    },
    money: typeof raw.money === 'number' && Number.isFinite(raw.money) ? Math.max(0, raw.money) : STARTING_MONEY,
    day: typeof raw.day === 'number' && raw.day >= 1 ? raw.day : 1,
    timeOfDay:
      raw.timeOfDay === 'morning' || raw.timeOfDay === 'afternoon' || raw.timeOfDay === 'evening'
        ? raw.timeOfDay
        : 'morning',
    currentLocation:
      raw.currentLocation && raw.currentLocation in LOCATION_META ? raw.currentLocation : 'street',
    playerX: typeof raw.playerX === 'number' ? Math.min(94, Math.max(6, raw.playerX)) : 46,
    facing: raw.facing === 'left' ? 'left' : 'right',
    ownedOutfitIds: Array.isArray(raw.ownedOutfitIds)
      ? Array.from(new Set(['casual_mint_cardigan', ...raw.ownedOutfitIds]))
      : fresh.ownedOutfitIds,
    customOutfits: Array.isArray(raw.customOutfits) ? raw.customOutfits : [],
    inventoryGifts:
      raw.inventoryGifts && typeof raw.inventoryGifts === 'object' ? raw.inventoryGifts : fresh.inventoryGifts,
    relationships: mergedRelationships,
    unlockedLocations:
      Array.isArray(raw.unlockedLocations) && raw.unlockedLocations.length > 0
        ? raw.unlockedLocations
        : fresh.unlockedLocations,
    choiceLog: Array.isArray(raw.choiceLog) ? raw.choiceLog.slice(-60) : [],
    studioGallery: Array.isArray(raw.studioGallery) ? raw.studioGallery.slice(0, 40) : [],
    settings: {
      ...fresh.settings,
      ...(raw.settings || {}),
    },
    lastSavedAt: typeof raw.lastSavedAt === 'number' ? raw.lastSavedAt : Date.now(),
  };
}

export function loadGameSaveSync(fallbackPlayerName = 'Seo-yeon'): {
  state: GameSaveState;
  recoveredFromBackup: boolean;
  isNewSave: boolean;
} {
  const primary = safeStorage.getJSON<Partial<GameSaveState> | null>(SAVE_PRIMARY_KEY, null);
  if (primary && primary.player) {
    return {
      state: normalizeSaveState(primary),
      recoveredFromBackup: false,
      isNewSave: false,
    };
  }

  const backup = safeStorage.getJSON<Partial<GameSaveState> | null>(SAVE_BACKUP_KEY, null);
  if (backup && backup.player) {
    const restored = normalizeSaveState(backup);
    safeStorage.setJSON(SAVE_PRIMARY_KEY, restored);
    return {
      state: restored,
      recoveredFromBackup: true,
      isNewSave: false,
    };
  }

  return {
    state: createFreshGameSave(fallbackPlayerName),
    recoveredFromBackup: false,
    isNewSave: true,
  };
}

export async function recoverGameSaveFromIDB(): Promise<GameSaveState | null> {
  const mirror = await loadGameMirrorFromIDB('primary');
  if (!mirror || !mirror.player) return null;
  const normalized = normalizeSaveState(mirror);
  safeStorage.setJSON(SAVE_PRIMARY_KEY, normalized);
  safeStorage.setJSON(SAVE_BACKUP_KEY, normalized);
  return normalized;
}

export function persistGameSave(state: GameSaveState): GameSaveState {
  const stamped: GameSaveState = {
    ...state,
    lastSavedAt: Date.now(),
  };
  safeStorage.setJSON(SAVE_PRIMARY_KEY, stamped);
  safeStorage.setJSON(SAVE_BACKUP_KEY, stamped);
  void saveGameMirrorToIDB('primary', stamped);
  return stamped;
}

export function resetGameSave(playerName = 'Seo-yeon'): GameSaveState {
  const fresh = createFreshGameSave(playerName);
  return persistGameSave(fresh);
}

export function getAllCatalogOutfits(customOutfits: OutfitItem[] = []): OutfitItem[] {
  return [...customOutfits, ...BOUTIQUE_OUTFITS];
}

export function getOutfitById(
  outfitId: string,
  customOutfits: OutfitItem[] = []
): OutfitItem {
  return (
    customOutfits.find((o) => o.id === outfitId) ||
    BOUTIQUE_OUTFITS.find((o) => o.id === outfitId) ||
    BOUTIQUE_OUTFITS[0]
  );
}

export function advanceGameTime(
  day: number,
  timeOfDay: TimeOfDay,
  steps = 1
): { day: number; timeOfDay: TimeOfDay } {
  const order: TimeOfDay[] = ['morning', 'afternoon', 'evening'];
  let idx = order.indexOf(timeOfDay);
  let nextDay = day;
  for (let i = 0; i < steps; i++) {
    idx += 1;
    if (idx >= order.length) {
      idx = 0;
      nextDay += 1;
    }
  }
  return { day: nextDay, timeOfDay: order[idx] };
}

export function formatTimeLabel(timeOfDay: TimeOfDay): string {
  if (timeOfDay === 'morning') return 'Morning';
  if (timeOfDay === 'afternoon') return 'Afternoon';
  return 'Evening';
}
