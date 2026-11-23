import { safeStorage } from './storage';
import {
  UNIQUE_WEBTOONS,
  WebtoonItem,
  getCanonicalWebtoonId,
  resolveWebtoonById,
} from '../data/webtoonData';

export const SUBSCRIBED_WEBTOONS_KEY = 'enmmoe_subscribed_webtoons_v1';
export const LIKED_WEBTOONS_KEY = 'enmmoe_liked_webtoons_v1';
export const LIKED_EPISODES_KEY = 'enmmoe_liked_episodes_v1';

export const DEFAULT_SUBSCRIBED_WEBTOONS: Record<string, boolean> = {
  'otherworldly-family-man': true,
  'down-to-earth': true,
  'father-i-dont-want-marriage': true,
};

function sanitizeBooleanMap(
  raw: Record<string, boolean> | null | undefined,
  canonicalizeKey: boolean
): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {};
  const cleaned: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'boolean') continue;
    const normalizedKey = canonicalizeKey ? getCanonicalWebtoonId(key) : key;
    if (canonicalizeKey) {
      // Preserve explicit true/false without creating alias duplicates
      cleaned[normalizedKey] = value;
    } else if (value) {
      cleaned[normalizedKey] = true;
    }
  }
  return cleaned;
}

export function loadSubscribedWebtoons(): Record<string, boolean> {
  const stored = safeStorage.getJSON<Record<string, boolean> | null>(
    SUBSCRIBED_WEBTOONS_KEY,
    null
  );
  if (!stored) {
    return { ...DEFAULT_SUBSCRIBED_WEBTOONS };
  }
  return sanitizeBooleanMap(stored, true);
}

export function saveSubscribedWebtoons(map: Record<string, boolean>): void {
  safeStorage.setJSON(SUBSCRIBED_WEBTOONS_KEY, sanitizeBooleanMap(map, true));
}

export function isWebtoonSubscribed(
  subscribedMap: Record<string, boolean> | undefined,
  webtoonId: string,
  fallbackDefault?: boolean
): boolean {
  const canonicalId = getCanonicalWebtoonId(webtoonId);
  if (subscribedMap && canonicalId in subscribedMap) {
    return Boolean(subscribedMap[canonicalId]);
  }
  if (subscribedMap && webtoonId in subscribedMap) {
    return Boolean(subscribedMap[webtoonId]);
  }
  if (typeof fallbackDefault === 'boolean') {
    return fallbackDefault;
  }
  return Boolean(resolveWebtoonById(canonicalId)?.isSubscribed);
}

export function toggleWebtoonSubscription(
  current: Record<string, boolean>,
  webtoonId: string
): {
  nextMap: Record<string, boolean>;
  canonicalId: string;
  isSubscribed: boolean;
} {
  const canonicalId = getCanonicalWebtoonId(webtoonId);
  const currentVal = isWebtoonSubscribed(current, canonicalId);
  const nextVal = !currentVal;
  const cleaned = sanitizeBooleanMap(current, true);
  cleaned[canonicalId] = nextVal;
  return {
    nextMap: cleaned,
    canonicalId,
    isSubscribed: nextVal,
  };
}

export function loadLikedWebtoons(): Record<string, boolean> {
  const stored = safeStorage.getJSON<Record<string, boolean> | null>(
    LIKED_WEBTOONS_KEY,
    null
  );
  if (!stored || typeof stored !== 'object') return {};
  const cleaned: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (value === true) {
      cleaned[getCanonicalWebtoonId(key)] = true;
    }
  }
  return cleaned;
}

export function saveLikedWebtoons(map: Record<string, boolean>): void {
  const cleaned: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(map || {})) {
    if (value === true) {
      cleaned[getCanonicalWebtoonId(key)] = true;
    }
  }
  safeStorage.setJSON(LIKED_WEBTOONS_KEY, cleaned);
}

export function isWebtoonLiked(
  likedMap: Record<string, boolean> | undefined,
  webtoonId: string
): boolean {
  if (!likedMap) return false;
  const canonicalId = getCanonicalWebtoonId(webtoonId);
  return Boolean(likedMap[canonicalId] ?? likedMap[webtoonId]);
}

export function toggleWebtoonLike(
  current: Record<string, boolean>,
  webtoonId: string
): {
  nextMap: Record<string, boolean>;
  canonicalId: string;
  isLiked: boolean;
} {
  const canonicalId = getCanonicalWebtoonId(webtoonId);
  const wasLiked = isWebtoonLiked(current, canonicalId);
  const nextMap: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(current || {})) {
    if (value === true) {
      const normalized = getCanonicalWebtoonId(key);
      if (normalized !== canonicalId) {
        nextMap[normalized] = true;
      }
    }
  }
  if (!wasLiked) {
    nextMap[canonicalId] = true;
  }
  return {
    nextMap,
    canonicalId,
    isLiked: !wasLiked,
  };
}

export function getLikedWebtoonItems(
  likedMap: Record<string, boolean> | undefined
): WebtoonItem[] {
  if (!likedMap) return [];
  const seen = new Set<string>();
  const results: WebtoonItem[] = [];
  for (const item of UNIQUE_WEBTOONS) {
    const canonicalId = getCanonicalWebtoonId(item.id);
    if (seen.has(canonicalId)) continue;
    if (isWebtoonLiked(likedMap, canonicalId)) {
      seen.add(canonicalId);
      results.push(item);
    }
  }
  return results;
}

export function loadLikedEpisodes(): Record<string, boolean> {
  const stored = safeStorage.getJSON<Record<string, boolean> | null>(
    LIKED_EPISODES_KEY,
    null
  );
  if (!stored || typeof stored !== 'object') return {};
  const cleaned: Record<string, boolean> = {};
  for (const [epId, value] of Object.entries(stored)) {
    if (value === true) {
      cleaned[epId] = true;
    }
  }
  return cleaned;
}

export function saveLikedEpisodes(map: Record<string, boolean>): void {
  const cleaned: Record<string, boolean> = {};
  for (const [epId, value] of Object.entries(map || {})) {
    if (value === true) {
      cleaned[epId] = true;
    }
  }
  safeStorage.setJSON(LIKED_EPISODES_KEY, cleaned);
}

export function toggleEpisodeLike(
  current: Record<string, boolean>,
  episodeId: string
): {
  nextMap: Record<string, boolean>;
  isLiked: boolean;
} {
  const wasLiked = Boolean(current?.[episodeId]);
  const nextMap: Record<string, boolean> = {};
  for (const [id, val] of Object.entries(current || {})) {
    if (val === true && id !== episodeId) {
      nextMap[id] = true;
    }
  }
  if (!wasLiked) {
    nextMap[episodeId] = true;
  }
  return {
    nextMap,
    isLiked: !wasLiked,
  };
}

export function getSeriesBaseLikesCount(webtoon: WebtoonItem): number {
  const canonical = resolveWebtoonById(webtoon.id) || webtoon;
  const firstEpisodeLikes = canonical.episodes?.[0]?.likes;
  if (typeof firstEpisodeLikes === 'number' && firstEpisodeLikes > 0) {
    return firstEpisodeLikes;
  }
  return 12400;
}

export function getSeriesDisplayLikesCount(
  webtoon: WebtoonItem,
  isLiked: boolean
): number {
  return getSeriesBaseLikesCount(webtoon) + (isLiked ? 1 : 0);
}
