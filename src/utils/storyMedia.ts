import { Story, StoryDraft, User } from '../types';
import { safeStorage } from './storage';

const DRAFT_STORAGE_KEY = 'enmmoe_story_draft_v1';
const SEEN_STORIES_CACHE_KEY = 'enmmoe_seen_story_ids_v1';
const MEDIA_CACHE_TTL_KEY = 'enmmoe_story_media_ttl_v1';

export interface ProcessedStoryMedia {
  mediaUrl: string;
  thumbnailUrl: string;
  mediaType: 'photo' | 'video';
  mediaHash: string;
  width: number;
  height: number;
  durationSec?: number;
}

export interface StoryAuthorGroup {
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  stories: Story[];
  hasUnseen: boolean;
  hasCloseFriends: boolean;
  isMuted: boolean;
  isOwn: boolean;
  latestCreatedAt: number;
}

export function sanitizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function formatRelativeStoryTime(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function computeFastHash(input: string): string {
  let hash = 2166136261;
  const step = Math.max(1, Math.floor(input.length / 512));
  for (let i = 0; i < input.length; i += step) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h_${(hash >>> 0).toString(16)}_${input.length}`;
}

export async function processStoryImageFile(file: File): Promise<ProcessedStoryMedia> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, WebP, or GIF image.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image is larger than 15 MB. Please choose a smaller image.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  // Load into Image for resizing & compression
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not decode selected image.'));
    el.src = dataUrl;
  });

  const maxDim = 1080;
  let targetW = img.naturalWidth || 720;
  let targetH = img.naturalHeight || 1280;
  if (targetW > maxDim || targetH > maxDim) {
    const scale = Math.min(maxDim / targetW, maxDim / targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas unavailable for image optimization.');
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Use WebP or JPEG fallback for reliable cross-browser size savings
  const compressed = canvas.toDataURL('image/jpeg', 0.82);

  // Generate compact thumbnail (180px)
  const thumbScale = Math.min(180 / targetW, 180 / targetH, 1);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.max(1, Math.round(targetW * thumbScale));
  thumbCanvas.height = Math.max(1, Math.round(targetH * thumbScale));
  const thumbCtx = thumbCanvas.getContext('2d');
  thumbCtx?.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
  const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);

  return {
    mediaUrl: compressed,
    thumbnailUrl,
    mediaType: 'photo',
    mediaHash: computeFastHash(compressed),
    width: targetW,
    height: targetH,
  };
}

export async function processStoryVideoFile(file: File): Promise<ProcessedStoryMedia> {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported video format. Please select MP4, WebM, or MOV.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Video must be 12 MB or smaller for smooth story playback.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read video file.'));
    reader.readAsDataURL(file);
  });

  const videoInfo = await new Promise<{ width: number; height: number; duration: number; thumbnailUrl: string }>(
    (resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';

      const cleanup = () => {
        video.removeAttribute('src');
        video.load();
      };

      video.onloadeddata = () => {
        const dur = Number.isFinite(video.duration) ? video.duration : 0;
        if (dur > 31) {
          cleanup();
          reject(new Error('Story videos can be up to 30 seconds long.'));
          return;
        }
        try {
          video.currentTime = Math.min(0.4, dur * 0.1 || 0);
        } catch {
          // ignore seek error
        }
      };

      video.onseeked = () => {
        const w = video.videoWidth || 540;
        const h = video.videoHeight || 960;
        const scale = Math.min(200 / w, 200 / h, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.72);
        const duration = video.duration || 5;
        cleanup();
        resolve({ width: w, height: h, duration, thumbnailUrl });
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Could not load video metadata.'));
      };

      video.src = dataUrl;
    }
  );

  return {
    mediaUrl: dataUrl,
    thumbnailUrl: videoInfo.thumbnailUrl,
    mediaType: 'video',
    mediaHash: computeFastHash(dataUrl),
    width: videoInfo.width,
    height: videoInfo.height,
    durationSec: Math.round(videoInfo.duration),
  };
}

export function isStoryVisibleToUser(
  story: Story,
  viewer: User,
  now: number = Date.now(),
  options?: { allowExpiredForArchive?: boolean }
): boolean {
  if (!options?.allowExpiredForArchive && story.expiresAt <= now) {
    return false;
  }

  const isOwn = story.authorId === viewer.id;
  if (isOwn) return true;

  if ((viewer.blockedUserIds || []).includes(story.authorId)) {
    return false;
  }

  if ((story.hiddenFromIds || []).includes(viewer.id)) {
    return false;
  }

  if (story.audience === 'subscribers') {
    const isSubscribed = (viewer.followingIds || []).includes(story.authorId);
    if (!isSubscribed) return false;
  }

  if (story.audience === 'close_friends') {
    // Viewer sees close_friends story only if author added them or seeded demo close friend
    const closeFriends = viewer.closeFriendIds || [];
    if (!closeFriends.includes(story.authorId)) {
      return false;
    }
  }

  return true;
}

export function groupStoriesByAuthor(
  stories: Story[],
  viewer: User,
  now: number = Date.now()
): StoryAuthorGroup[] {
  const mutedIds = new Set(viewer.mutedStoryAuthorIds || []);
  const groupsMap = new Map<string, StoryAuthorGroup>();

  for (const story of stories) {
    if (!isStoryVisibleToUser(story, viewer, now)) continue;
    const isOwn = story.authorId === viewer.id;
    const isMuted = !isOwn && mutedIds.has(story.authorId);

    let group = groupsMap.get(story.authorId);
    if (!group) {
      group = {
        authorId: story.authorId,
        authorName: story.authorName,
        authorUsername: story.authorUsername,
        authorAvatar: story.authorAvatar,
        authorVerified: story.authorVerified,
        stories: [],
        hasUnseen: false,
        hasCloseFriends: false,
        isMuted,
        isOwn,
        latestCreatedAt: story.createdAt,
      };
      groupsMap.set(story.authorId, group);
    }

    group.stories.push(story);
    if (!story.isSeen) group.hasUnseen = true;
    if (story.audience === 'close_friends') group.hasCloseFriends = true;
    if (story.createdAt > group.latestCreatedAt) {
      group.latestCreatedAt = story.createdAt;
    }
  }

  const groups = Array.from(groupsMap.values());
  groups.forEach((g) => {
    g.stories.sort((a, b) => a.createdAt - b.createdAt);
  });

  // Sort order: Own story first -> Unseen stories -> Seen stories -> Muted at end
  return groups.sort((a, b) => {
    if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
    if (a.isMuted !== b.isMuted) return a.isMuted ? 1 : -1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return b.latestCreatedAt - a.latestCreatedAt;
  });
}

export function getStoryDraft(): StoryDraft | null {
  return safeStorage.getJSON<StoryDraft | null>(DRAFT_STORAGE_KEY, null);
}

export function saveStoryDraft(draft: StoryDraft | null): void {
  if (!draft) {
    safeStorage.removeItem(DRAFT_STORAGE_KEY);
    return;
  }
  safeStorage.setJSON(DRAFT_STORAGE_KEY, { ...draft, savedAt: Date.now() });
}

export function pruneExpiredStoryCaches(activeStoryIds: string[]): void {
  const activeSet = new Set(activeStoryIds);
  const seenMap = safeStorage.getJSON<Record<string, number>>(SEEN_STORIES_CACHE_KEY, {});
  const nextSeen: Record<string, number> = {};
  const now = Date.now();
  Object.entries(seenMap).forEach(([id, ts]) => {
    if (activeSet.has(id) || now - ts < 48 * 3600 * 1000) {
      nextSeen[id] = ts;
    }
  });
  safeStorage.setJSON(SEEN_STORIES_CACHE_KEY, nextSeen);
  safeStorage.setJSON(MEDIA_CACHE_TTL_KEY, { prunedAt: now });
}
