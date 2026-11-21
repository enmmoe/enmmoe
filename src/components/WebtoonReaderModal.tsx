import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  List,
  MessageCircle,
  Send,
  Share2,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import {
  WebtoonItem,
  WebtoonEpisode,
  getCanonicalWebtoonId,
  resolveWebtoonById,
} from '../data/webtoonData';
import { safeStorage } from '../utils/storage';
import {
  BottomSheet,
  Button,
  ProgressBar,
  SmartImage,
  Toggle,
  useToast,
} from './ui';

export interface SavedReadingProgress {
  episodeId: string;
  episodeNumber: number;
  scrollTop: number;
  percent: number;
  updatedAt: number;
}

export interface ReaderPreferences {
  bgMode: 'theme' | 'white' | 'paper' | 'dark';
  panelGap: 'seamless' | 'comfort';
  autoHideControls: boolean;
}

export interface ChapterComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: number;
  likes: number;
  isLiked?: boolean;
}

const PROGRESS_STORAGE_KEY = 'enmmoe_reading_progress_v1';
const READER_PREFS_KEY = 'enmmoe_reader_prefs_v1';
const CHAPTER_COMMENTS_KEY = 'enmmoe_chapter_comments_v1';
const SERIES_RATINGS_KEY = 'enmmoe_series_ratings_v1';

const DEFAULT_READER_PREFS: ReaderPreferences = {
  bgMode: 'dark',
  panelGap: 'seamless',
  autoHideControls: true,
};

export interface SavedSeriesRating {
  score: number;
  updatedAt: number;
}

export function getBookReadingProgress(bookId: string): SavedReadingProgress | null {
  const canonicalId = getCanonicalWebtoonId(bookId);
  const all = safeStorage.getJSON<Record<string, SavedReadingProgress>>(PROGRESS_STORAGE_KEY, {});
  return all[canonicalId] || all[bookId] || null;
}

export function getAllReadingProgress(): Record<string, SavedReadingProgress> {
  return safeStorage.getJSON<Record<string, SavedReadingProgress>>(PROGRESS_STORAGE_KEY, {});
}

export function getAllSeriesRatings(): Record<string, SavedSeriesRating> {
  return safeStorage.getJSON<Record<string, SavedSeriesRating>>(SERIES_RATINGS_KEY, {});
}

export function getSeriesUserRating(bookId: string): number | null {
  const canonicalId = getCanonicalWebtoonId(bookId);
  const all = getAllSeriesRatings();
  return all[canonicalId]?.score ?? all[bookId]?.score ?? null;
}

export function saveSeriesUserRating(bookId: string, score: number): SavedSeriesRating {
  const canonicalId = getCanonicalWebtoonId(bookId);
  const clamped = Math.max(1, Math.min(10, Math.round(score)));
  const all = getAllSeriesRatings();
  const entry: SavedSeriesRating = { score: clamped, updatedAt: Date.now() };
  all[canonicalId] = entry;
  safeStorage.setJSON(SERIES_RATINGS_KEY, all);
  return entry;
}

export function computeDisplaySeriesRating(baseRating: number, userScore: number | null): number {
  if (userScore === null) return baseRating;
  const BASE_VOTES = 25;
  return Number(((baseRating * BASE_VOTES + userScore) / (BASE_VOTES + 1)).toFixed(2));
}

export function getReaderPreferences(): ReaderPreferences {
  return {
    ...DEFAULT_READER_PREFS,
    ...safeStorage.getJSON<Partial<ReaderPreferences>>(READER_PREFS_KEY, {}),
  };
}

export function saveReaderPreferences(prefs: ReaderPreferences): void {
  safeStorage.setJSON(READER_PREFS_KEY, prefs);
}

export function saveBookReadingProgress(bookId: string, progress: SavedReadingProgress): void {
  const canonicalId = getCanonicalWebtoonId(bookId);
  const all = safeStorage.getJSON<Record<string, SavedReadingProgress>>(PROGRESS_STORAGE_KEY, {});
  all[canonicalId] = progress;
  safeStorage.setJSON(PROGRESS_STORAGE_KEY, all);
}

export function resolveSeriesStartEpisode(
  webtoon: WebtoonItem,
  preferredEpisodeNumber?: number
): {
  canonical: WebtoonItem;
  episode: WebtoonEpisode | undefined;
  index: number;
  saved: SavedReadingProgress | null;
} {
  const canonical = resolveWebtoonById(webtoon.id) || webtoon;
  const saved = getBookReadingProgress(canonical.id);

  if (saved) {
    const savedIdx = canonical.episodes.findIndex(
      (e) => e.id === saved.episodeId || e.number === saved.episodeNumber
    );
    if (savedIdx >= 0) {
      return {
        canonical,
        episode: canonical.episodes[savedIdx],
        index: savedIdx,
        saved,
      };
    }
  }

  if (preferredEpisodeNumber !== undefined) {
    const prefIdx = canonical.episodes.findIndex((e) => e.number === preferredEpisodeNumber);
    if (prefIdx >= 0) {
      return {
        canonical,
        episode: canonical.episodes[prefIdx],
        index: prefIdx,
        saved,
      };
    }
  }

  return {
    canonical,
    episode: canonical.episodes[0],
    index: 0,
    saved,
  };
}

export function prepareSeriesReadNow(
  webtoon: WebtoonItem,
  preferredEpisodeNumber?: number
): {
  canonical: WebtoonItem;
  episode: WebtoonEpisode | undefined;
  index: number;
} {
  const resolved = resolveSeriesStartEpisode(webtoon, preferredEpisodeNumber);
  if (resolved.episode && !resolved.saved) {
    saveBookReadingProgress(resolved.canonical.id, {
      episodeId: resolved.episode.id,
      episodeNumber: resolved.episode.number,
      scrollTop: 0,
      percent: 0,
      updatedAt: Date.now(),
    });
  }
  return {
    canonical: resolved.canonical,
    episode: resolved.episode,
    index: resolved.index,
  };
}

export interface WebtoonReaderModalProps {
  webtoon: WebtoonItem | null;
  isOpen?: boolean;
  initialEpisodeNumber?: number;
  initialEpisodeId?: string;
  initialTab?: 'episodes' | 'reader' | 'details';
  onClose: () => void;
  onBack?: () => void;
  onSelectChapter?: (chapterId: string, episodeNumber?: number) => void;
  onBackToBook?: () => void;
  onToggleSubscribe?: (webtoonId: string) => void;
  onSelectTag?: (tag: string) => void;
  isSubscribed?: boolean;
  theme?: 'light' | 'dark';
}

export const WebtoonReaderModal: React.FC<WebtoonReaderModalProps> = ({
  webtoon: rawWebtoon,
  isOpen = true,
  initialEpisodeNumber,
  initialEpisodeId,
  initialTab = 'episodes',
  onClose,
  onBack,
  onSelectChapter,
  onBackToBook,
  onToggleSubscribe,
  onSelectTag,
  isSubscribed,
}) => {
  const { showToast } = useToast();

  const webtoon = rawWebtoon ? resolveWebtoonById(rawWebtoon.id) || rawWebtoon : null;
  const bookId = webtoon?.id || '';
  const episodes = webtoon?.episodes || [];
  const savedProgress = bookId ? getBookReadingProgress(bookId) : null;

  const [activeTab, setActiveTab] = useState<'episodes' | 'reader' | 'details'>(initialTab);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(() => {
    if (initialEpisodeId) {
      const idx = episodes.findIndex((e) => e.id === initialEpisodeId);
      if (idx >= 0) return idx;
    }
    if (initialEpisodeNumber !== undefined) {
      const idx = episodes.findIndex((e) => e.number === initialEpisodeNumber);
      if (idx >= 0) return idx;
    }
    if (savedProgress) {
      const idx = episodes.findIndex(
        (e) => e.id === savedProgress.episodeId || e.number === savedProgress.episodeNumber
      );
      if (idx >= 0) return idx;
    }
    return 0;
  });

  // Immersive reader HUD & Sheets
  const [showReaderControls, setShowReaderControls] = useState<boolean>(false);
  const [readPercent, setReadPercent] = useState<number>(0);
  const [showEpisodesSheet, setShowEpisodesSheet] = useState<boolean>(false);
  const [showPreferencesSheet, setShowPreferencesSheet] = useState<boolean>(false);
  const [showCommentsSheet, setShowCommentsSheet] = useState<boolean>(false);
  const [showRatingSheet, setShowRatingSheet] = useState<boolean>(false);
  const [userRating, setUserRating] = useState<number | null>(() =>
    bookId ? getSeriesUserRating(bookId) : null
  );
  const [draftRating, setDraftRating] = useState<number>(() =>
    bookId ? getSeriesUserRating(bookId) ?? 10 : 10
  );
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(getReaderPreferences);
  const [episodeLikes, setEpisodeLikes] = useState<Record<string, number>>({});
  const [likedEpisodes, setLikedEpisodes] = useState<Record<string, boolean>>({});
  const [subscribed, setSubscribed] = useState<boolean>(() =>
    isSubscribed !== undefined ? isSubscribed : Boolean(webtoon?.isSubscribed)
  );
  const [commentInput, setCommentInput] = useState('');
  const [chapterCommentsMap, setChapterCommentsMap] = useState<Record<string, ChapterComment[]>>(() =>
    safeStorage.getJSON<Record<string, ChapterComment[]>>(CHAPTER_COMMENTS_KEY, {})
  );

  const readerScrollRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const saveThrottleRef = useRef<number>(0);
  const latestProgressRef = useRef<SavedReadingProgress | null>(null);

  useEffect(() => {
    setSubscribed(isSubscribed !== undefined ? isSubscribed : Boolean(webtoon?.isSubscribed));
  }, [isSubscribed, bookId, webtoon?.isSubscribed]);

  useEffect(() => {
    const existing = bookId ? getSeriesUserRating(bookId) : null;
    setUserRating(existing);
    setDraftRating(existing ?? 10);
  }, [bookId]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialEpisodeId) {
      const idx = episodes.findIndex((e) => e.id === initialEpisodeId);
      if (idx >= 0) setCurrentEpisodeIndex(idx);
    } else if (initialEpisodeNumber !== undefined) {
      const idx = episodes.findIndex((e) => e.number === initialEpisodeNumber);
      if (idx >= 0) setCurrentEpisodeIndex(idx);
    }
  }, [initialEpisodeId, initialEpisodeNumber, episodes]);

  useEffect(() => {
    saveReaderPreferences(readerPrefs);
  }, [readerPrefs]);

  useEffect(() => {
    safeStorage.setJSON(CHAPTER_COMMENTS_KEY, chapterCommentsMap);
  }, [chapterCommentsMap]);

  const currentEpisode: WebtoonEpisode | undefined =
    episodes[currentEpisodeIndex] || episodes[0];

  const currentCommentsKey = currentEpisode ? `${bookId}:${currentEpisode.id}` : bookId;
  const currentComments: ChapterComment[] = chapterCommentsMap[currentCommentsKey] || [
    {
      id: `seed-${bookId}-1`,
      authorName: 'Sora Lin',
      text: 'The pacing and artwork composition in this chapter are extraordinary.',
      createdAt: Date.now() - 3600000 * 4,
      likes: 28,
    },
    {
      id: `seed-${bookId}-2`,
      authorName: 'Maya Chen',
      text: 'Been waiting all week for this update — cannot wait for the next episode.',
      createdAt: Date.now() - 3600000 * 1.5,
      likes: 14,
    },
  ];

  // Auto-hide controls naturally after 3.5 seconds when enabled and idle
  const scheduleAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!readerPrefs.autoHideControls) return;
    hideTimerRef.current = setTimeout(() => {
      setShowReaderControls(false);
    }, 3500);
  }, [readerPrefs.autoHideControls]);

  useEffect(() => {
    if (activeTab === 'reader' && showReaderControls && !showEpisodesSheet && !showPreferencesSheet && !showCommentsSheet) {
      scheduleAutoHide();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [activeTab, showReaderControls, showEpisodesSheet, showPreferencesSheet, showCommentsSheet, scheduleAutoHide]);

  // Flush latest reading progress on exit/unmount so rapid Back taps never drop progress
  const flushLatestProgress = useCallback(() => {
    if (bookId && latestProgressRef.current) {
      saveBookReadingProgress(bookId, latestProgressRef.current);
    }
  }, [bookId]);

  useEffect(() => {
    return () => {
      flushLatestProgress();
    };
  }, [flushLatestProgress]);

  // Restore saved scroll position when opening an episode in reader mode
  useEffect(() => {
    if (!isOpen || !bookId || activeTab !== 'reader' || !currentEpisode) return;
    setShowReaderControls(true);
    const el = readerScrollRef.current;
    if (!el) return;

    const latestSaved = getBookReadingProgress(bookId);
    if (!latestSaved) {
      const initialEntry: SavedReadingProgress = {
        episodeId: currentEpisode.id,
        episodeNumber: currentEpisode.number,
        scrollTop: 0,
        percent: 0,
        updatedAt: Date.now(),
      };
      saveBookReadingProgress(bookId, initialEntry);
      latestProgressRef.current = initialEntry;
    }

    if (latestSaved && latestSaved.episodeId === currentEpisode.id && latestSaved.scrollTop > 20) {
      const applyScroll = () => {
        if (readerScrollRef.current) {
          readerScrollRef.current.scrollTop = latestSaved.scrollTop;
          setReadPercent(latestSaved.percent || 0);
        }
      };
      requestAnimationFrame(applyScroll);
      const t = setTimeout(applyScroll, 180);
      return () => clearTimeout(t);
    } else {
      el.scrollTop = 0;
      setReadPercent(0);
    }
  }, [isOpen, activeTab, currentEpisode?.id, currentEpisode?.number, bookId]);

  if (!isOpen || !webtoon) return null;

  const readerCanvasClass =
    readerPrefs.bgMode === 'white'
      ? 'bg-white text-black'
      : readerPrefs.bgMode === 'paper'
      ? 'bg-[#F2F2F7] text-black'
      : readerPrefs.bgMode === 'dark'
      ? 'bg-black text-white'
      : 'bg-white dark:bg-black text-black dark:text-white';

  const handleReaderScroll = () => {
    const el = readerScrollRef.current;
    if (!el || !currentEpisode) return;

    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const pct = Math.min(100, Math.max(0, Math.round((el.scrollTop / maxScroll) * 100)));
    setReadPercent(pct);

    const delta = Math.abs(el.scrollTop - lastScrollTopRef.current);
    if (readerPrefs.autoHideControls && delta > 36 && showReaderControls) {
      setShowReaderControls(false);
    }
    lastScrollTopRef.current = el.scrollTop;

    const now = Date.now();
    const entry: SavedReadingProgress = {
      episodeId: currentEpisode.id,
      episodeNumber: currentEpisode.number,
      scrollTop: el.scrollTop,
      percent: pct,
      updatedAt: now,
    };
    latestProgressRef.current = entry;

    if (now - saveThrottleRef.current > 250) {
      saveThrottleRef.current = now;
      saveBookReadingProgress(webtoon.id, entry);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    const down = pointerDownPosRef.current;
    pointerDownPosRef.current = null;
    if (!down) return;
    const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (dist > 8) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, a, input')) return;

    setShowReaderControls((prev) => {
      const next = !prev;
      if (next) scheduleAutoHide();
      return next;
    });
  };

  const handleScrubProgress = (newPercent: number) => {
    const el = readerScrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    el.scrollTo({ top: (newPercent / 100) * maxScroll, behavior: 'auto' });
    setReadPercent(newPercent);
    scheduleAutoHide();
  };

  const goToEpisode = (idx: number) => {
    const targetEp = webtoon.episodes[idx];
    if (!targetEp) return;
    saveBookReadingProgress(webtoon.id, {
      episodeId: targetEp.id,
      episodeNumber: targetEp.number,
      scrollTop: 0,
      percent: 0,
      updatedAt: Date.now(),
    });
    if (onSelectChapter) {
      onSelectChapter(targetEp.id, targetEp.number);
    } else {
      setCurrentEpisodeIndex(idx);
      setActiveTab('reader');
    }
    setShowEpisodesSheet(false);
  };

  const handleToggleLikeEpisode = (epId: string, initialCount: number) => {
    const isLiked = likedEpisodes[epId];
    setLikedEpisodes((prev) => ({ ...prev, [epId]: !isLiked }));
    setEpisodeLikes((prev) => ({
      ...prev,
      [epId]: (prev[epId] ?? initialCount) + (isLiked ? -1 : 1),
    }));
  };

  const handleToggleSub = () => {
    const next = !subscribed;
    setSubscribed(next);
    onToggleSubscribe?.(webtoon.id);
    showToast(next ? `Subscribed to ${webtoon.title}` : 'Removed from library', {
      type: 'success',
      durationMs: 2000,
    });
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
      showToast('Series link copied', { type: 'success', durationMs: 2000 });
    } catch {
      showToast('Unable to copy link', { type: 'error' });
    }
  };

  const handlePostChapterComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const newComment: ChapterComment = {
      id: `ep-cmt-${Date.now()}`,
      authorName: 'You',
      text: commentInput.trim(),
      createdAt: Date.now(),
      likes: 0,
      isLiked: false,
    };
    setChapterCommentsMap((prev) => ({
      ...prev,
      [currentCommentsKey]: [newComment, ...(prev[currentCommentsKey] || currentComments)],
    }));
    setCommentInput('');
  };

  const handleToggleCommentLike = (commentId: string) => {
    setChapterCommentsMap((prev) => {
      const list = prev[currentCommentsKey] || currentComments;
      return {
        ...prev,
        [currentCommentsKey]: list.map((c) =>
          c.id === commentId
            ? {
                ...c,
                isLiked: !c.isLiked,
                likes: Math.max(0, c.likes + (c.isLiked ? -1 : 1)),
              }
            : c
        ),
      };
    });
  };

  const renderPreferencesSheet = () => (
    <BottomSheet
      isOpen={showPreferencesSheet}
      onClose={() => setShowPreferencesSheet(false)}
      title="Reader Preferences"
    >
      <div className="p-4 space-y-5">
        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">
            Page Background
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { id: 'theme', label: 'Auto' },
                { id: 'white', label: 'White' },
                { id: 'paper', label: 'Soft Tint' },
                { id: 'dark', label: 'Dark' },
              ] as const
            ).map((opt) => {
              const active = readerPrefs.bgMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReaderPrefs((p) => ({ ...p, bgMode: opt.id }))}
                  className={`py-2.5 px-2 rounded-xl text-[13px] font-semibold border cursor-pointer ios-press ${
                    active
                      ? 'bg-[#007AFF] text-white border-[#007AFF]'
                      : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">
            Panel Spacing
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'seamless', label: 'Seamless' },
                { id: 'comfort', label: 'Comfortable Gap' },
              ] as const
            ).map((opt) => {
              const active = readerPrefs.panelGap === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setReaderPrefs((p) => ({ ...p, panelGap: opt.id }))}
                  className={`py-2.5 px-3 rounded-xl text-[14px] font-semibold border cursor-pointer ios-press ${
                    active
                      ? 'bg-[#007AFF] text-white border-[#007AFF]'
                      : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold">Auto-Hide Controls</p>
            <p className="text-[13px] text-[#8E8E93]">Hide reader bars while scrolling</p>
          </div>
          <Toggle
            checked={readerPrefs.autoHideControls}
            onChange={(val) => setReaderPrefs((p) => ({ ...p, autoHideControls: val }))}
            ariaLabel="Auto-hide reader controls"
          />
        </div>
      </div>
    </BottomSheet>
  );

  const renderCommentsSheet = () => (
    <BottomSheet
      isOpen={showCommentsSheet}
      onClose={() => setShowCommentsSheet(false)}
      title={`Comments (${currentComments.length})`}
    >
      <div className="flex flex-col min-h-[300px]">
        <div className="p-4 space-y-3 flex-1">
          {currentComments.map((comment) => (
            <div
              key={comment.id}
              className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-semibold">{comment.authorName}</span>
                <span className="text-[11px] text-[#8E8E93]">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[14px] leading-snug">{comment.text}</p>
              <button
                type="button"
                onClick={() => handleToggleCommentLike(comment.id)}
                className={`inline-flex items-center gap-1 text-[12px] cursor-pointer ios-press ${
                  comment.isLiked
                    ? 'text-[#007AFF] font-semibold'
                    : 'text-[#8E8E93]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-current' : ''}`} />
                <span className="tabular-nums">{comment.likes}</span>
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={handlePostChapterComment}
          className="sticky bottom-0 px-4 py-3 bg-white dark:bg-[#1C1C1E] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2"
        >
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Share a thought on this episode..."
            className="flex-1 h-10 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] outline-none"
          />
          <button
            type="submit"
            disabled={!commentInput.trim()}
            aria-label="Post episode comment"
            className="w-10 h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center disabled:opacity-35 cursor-pointer ios-press"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </BottomSheet>
  );

  const handleSubmitRating = () => {
    if (!bookId) return;
    if (userRating === draftRating) return;
    saveSeriesUserRating(bookId, draftRating);
    setUserRating(draftRating);
    setShowRatingSheet(false);
    showToast(
      userRating !== null
        ? `Rating updated to ${draftRating}/10`
        : `Rated ${draftRating}/10`,
      { type: 'success', durationMs: 2000 }
    );
  };

  const renderRatingSheet = () => (
    <BottomSheet
      isOpen={showRatingSheet}
      onClose={() => setShowRatingSheet(false)}
      title="Rate Series"
    >
      <div className="p-5 space-y-5 text-center">
        <div className="space-y-1">
          <h3 className="text-[18px] font-semibold text-black dark:text-white">
            {webtoon.title}
          </h3>
          <p className="text-[14px] text-[#8E8E93]">
            {userRating !== null
              ? `Your rating: ${userRating} / 10`
              : 'Tap a star to rate this series'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-1.5 py-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
            const active = score <= draftRating;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setDraftRating(score)}
                aria-label={`Rate ${score} out of 10`}
                className="p-1 cursor-pointer ios-press focus-visible:outline-none"
              >
                <Star
                  className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
                    active
                      ? 'text-[#FFD60A] fill-[#FFD60A]'
                      : 'text-[#8E8E93] stroke-[1.75]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <p className="text-[22px] font-bold tabular-nums text-black dark:text-white">
          {draftRating} / 10
        </p>

        <Button
          id="submit-series-rating-btn"
          variant="primary"
          size="lg"
          fullWidth
          disabled={userRating === draftRating}
          onClick={handleSubmitRating}
        >
          {userRating !== null
            ? userRating === draftRating
              ? `Rated ${userRating}/10`
              : 'Update Rating'
            : 'Submit Rating'}
        </Button>
      </div>
    </BottomSheet>
  );

  // ================= 1. IMMERSIVE FULL-SCREEN READER =================
  if (activeTab === 'reader' && currentEpisode) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden select-none ${readerCanvasClass}`}>
        {/* Top Auto-Hiding Navigation HUD */}
        <AnimatePresence>
          {showReaderControls && (
            <motion.header
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-0 inset-x-0 z-30 bg-white/92 dark:bg-[#1C1C1E]/92 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] text-black dark:text-white pt-safe"
            >
              <div className="max-w-3xl mx-auto h-12 px-2 flex items-center justify-between gap-2">
                <button
                  id="chapter-back-button"
                  type="button"
                  onClick={() => {
                    flushLatestProgress();
                    if (onBack) onBack();
                    else if (onClose) onClose();
                    else if (onBackToBook) onBackToBook();
                    else setActiveTab('episodes');
                  }}
                  aria-label="Back"
                  className="min-w-[44px] min-h-[44px] inline-flex items-center gap-0.5 px-2 text-[#007AFF] cursor-pointer ios-press"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                  <span className="text-[16px]">Back</span>
                </button>

                <div className="flex-1 min-w-0 text-center">
                  <p className="text-[15px] font-semibold truncate">{webtoon.title}</p>
                  <p className="text-[12px] text-[#8E8E93] tabular-nums">
                    Ep. {currentEpisode.number} · {readPercent}%
                  </p>
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPreferencesSheet(true)}
                    aria-label="Reader preferences"
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#007AFF] cursor-pointer ios-press"
                  >
                    <SlidersHorizontal className="w-[20px] h-[20px] stroke-[1.85]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEpisodesSheet(true)}
                    aria-label="Episode list"
                    className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#007AFF] cursor-pointer ios-press"
                  >
                    <List className="w-[21px] h-[21px] stroke-[1.85]" />
                  </button>
                </div>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        {/* Full-Screen Vertical Comic Scroll Canvas */}
        <div
          ref={readerScrollRef}
          onScroll={handleReaderScroll}
          onPointerDown={handleCanvasPointerDown}
          onPointerUp={handleCanvasPointerUp}
          className="flex-1 overflow-y-auto overflow-x-hidden w-full overscroll-contain"
        >
          <div className="max-w-2xl mx-auto w-full pb-24">
            {/* Clean Chapter Opener */}
            <div className="px-5 pt-16 pb-6 text-center">
              <p className="text-[13px] font-semibold text-[#007AFF] uppercase tracking-wider">
                {webtoon.title}
              </p>
              <h1 className="text-[24px] font-bold tracking-tight mt-1">{currentEpisode.title}</h1>
              <p className="text-[13px] text-[#8E8E93] mt-1">
                Episode {currentEpisode.number} · Tap anywhere for controls
              </p>
            </div>

            {/* Uncropped Vertical Comic Panels */}
            <div className={`flex flex-col w-full ${readerPrefs.panelGap === 'comfort' ? 'gap-2 py-2' : 'gap-0'}`}>
              {currentEpisode.panels.map((panelUrl, pIdx) => (
                <div key={`${currentEpisode.id}-p-${pIdx}`} className="w-full leading-none">
                  <SmartImage
                    src={panelUrl}
                    alt={`${currentEpisode.title} — Panel ${pIdx + 1}`}
                    loading={pIdx < 3 ? 'eager' : 'lazy'}
                    preserveNaturalAspect
                    showRetryOnError
                    fallbackText={`Panel ${pIdx + 1} failed to load`}
                  />
                </div>
              ))}
            </div>

            {/* End of Chapter Actions */}
            <div className="px-5 py-8 border-t border-black/[0.08] dark:border-white/[0.08] text-center space-y-5">
              <div>
                <p className="text-[13px] font-medium text-[#8E8E93]">End of Episode {currentEpisode.number}</p>
                <h2 className="text-[20px] font-semibold mt-0.5">{currentEpisode.title}</h2>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleLikeEpisode(
                      currentEpisode.id,
                      episodeLikes[currentEpisode.id] ?? currentEpisode.likes
                    )
                  }
                  className={`min-h-[44px] px-4 rounded-2xl text-[15px] font-semibold inline-flex items-center gap-2 ios-press cursor-pointer ${
                    likedEpisodes[currentEpisode.id]
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${likedEpisodes[currentEpisode.id] ? 'fill-current' : ''}`}
                  />
                  <span className="tabular-nums">
                    {(episodeLikes[currentEpisode.id] ?? currentEpisode.likes).toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommentsSheet(true)}
                  className="min-h-[44px] px-4 rounded-2xl text-[15px] font-semibold bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white inline-flex items-center gap-2 ios-press cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-[#007AFF]" />
                  <span>Comments ({currentComments.length})</span>
                </button>

                <Button
                  variant={subscribed ? 'secondary' : 'primary'}
                  size="md"
                  onClick={handleToggleSub}
                >
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentEpisodeIndex <= 0}
                  onClick={() => goToEpisode(currentEpisodeIndex - 1)}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Prev Ep
                </Button>

                <button
                  type="button"
                  onClick={() => setShowEpisodesSheet(true)}
                  className="text-[14px] font-medium text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  All Episodes ({webtoon.episodes.length})
                </button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={currentEpisodeIndex >= webtoon.episodes.length - 1}
                  onClick={() => goToEpisode(currentEpisodeIndex + 1)}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Next Ep
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Auto-Hiding Progress & Chapter Navigation HUD */}
        <AnimatePresence>
          {showReaderControls && (
            <motion.footer
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="fixed bottom-0 inset-x-0 z-30 bg-white/92 dark:bg-[#1C1C1E]/92 backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/[0.1] text-black dark:text-white pb-safe"
            >
              <div className="max-w-3xl mx-auto px-4 py-3 space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-[#8E8E93] tabular-nums w-9">
                    {readPercent}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={readPercent}
                    aria-label="Reading progress"
                    onChange={(e) => handleScrubProgress(Number(e.target.value))}
                    className="flex-1 accent-[#007AFF] h-1.5 cursor-pointer"
                  />
                  <span className="text-[12px] font-medium text-[#8E8E93] tabular-nums">
                    {currentEpisode.panels.length}p
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={currentEpisodeIndex <= 0}
                    onClick={() => goToEpisode(currentEpisodeIndex - 1)}
                    className="min-h-[40px] px-3 rounded-xl inline-flex items-center gap-1 text-[15px] font-medium text-[#007AFF] disabled:opacity-35 cursor-pointer ios-press"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCommentsSheet(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ios-press"
                  >
                    <MessageCircle className="w-4 h-4 text-[#007AFF]" />
                    <span>Ep. {currentEpisode.number} / {webtoon.episodes.length}</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentEpisodeIndex >= webtoon.episodes.length - 1}
                    onClick={() => goToEpisode(currentEpisodeIndex + 1)}
                    className="min-h-[40px] px-3 rounded-xl inline-flex items-center gap-1 text-[15px] font-semibold text-[#007AFF] disabled:opacity-35 cursor-pointer ios-press"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.footer>
          )}
        </AnimatePresence>

        {/* Slide-up Episodes Picker Sheet */}
        <BottomSheet
          isOpen={showEpisodesSheet}
          onClose={() => setShowEpisodesSheet(false)}
          title={`Episodes (${webtoon.episodes.length})`}
        >
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] px-4">
            {webtoon.episodes.map((ep, idx) => {
              const isCurrent = idx === currentEpisodeIndex;
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => goToEpisode(idx)}
                  className="w-full py-3 flex items-center gap-3 text-left cursor-pointer ios-press"
                >
                  <div className="w-16 h-11 rounded-lg overflow-hidden shrink-0 border border-black/[0.06] dark:border-white/[0.08]">
                    <SmartImage src={ep.thumbnail} alt={ep.title} aspectClassName="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[15px] font-semibold truncate ${
                        isCurrent ? 'text-[#007AFF]' : ''
                      }`}
                    >
                      Ep. {ep.number} · {ep.title}
                    </p>
                    <p className="text-[13px] text-[#8E8E93] mt-0.5">{ep.date}</p>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
                </button>
              );
            })}
          </div>
        </BottomSheet>

        {renderPreferencesSheet()}
        {renderCommentsSheet()}
        {renderRatingSheet()}
      </div>
    );
  }

  // ================= 2. SERIES DETAILS & EPISODE DIRECTORY =================
  const effectiveRating = computeDisplaySeriesRating(webtoon.rating, userRating);
  const { episode: resumeEp, index: resumeEpIndex } = resolveSeriesStartEpisode(
    webtoon,
    initialEpisodeNumber
  );

  const handleStartReading = () => {
    const { episode, index } = prepareSeriesReadNow(webtoon, initialEpisodeNumber);
    if (!episode) return;
    if (onSelectChapter) {
      onSelectChapter(episode.id, episode.number);
    } else {
      setCurrentEpisodeIndex(index);
      setActiveTab('reader');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-black text-black dark:text-white flex flex-col overflow-hidden select-none">
      {/* iOS Top Navigation Bar */}
      <header className="shrink-0 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] pt-safe">
        <div className="max-w-3xl mx-auto h-12 px-2 flex items-center justify-between gap-2">
          <button
            id="book-back-button"
            type="button"
            onClick={onBack || onClose}
            aria-label="Back"
            className="min-w-[44px] min-h-[44px] inline-flex items-center gap-0.5 px-2 text-[#007AFF] cursor-pointer ios-press"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
            <span className="text-[17px]">Back</span>
          </button>

          <h2 className="text-[17px] font-semibold truncate flex-1 text-center">
            {webtoon.title}
          </h2>

          <div className="flex items-center -mr-1">
            <button
              type="button"
              onClick={() => setShowPreferencesSheet(true)}
              aria-label="Reader preferences"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#007AFF] cursor-pointer ios-press"
            >
              <SlidersHorizontal className="w-[20px] h-[20px] stroke-[1.85]" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share series"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#007AFF] cursor-pointer ios-press"
            >
              <Share2 className="w-[20px] h-[20px] stroke-[1.85]" />
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Details & Episodes */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto pb-12">
          {/* Editorial Artwork Banner */}
          <div className="px-4 pt-4">
            <div className="relative rounded-[20px] overflow-hidden aspect-[16/10] bg-[#F2F2F7] dark:bg-[#1C1C1E]">
              <SmartImage
                src={webtoon.bannerImage || webtoon.coverImage}
                alt={webtoon.title}
                aspectClassName="w-full h-full"
                className="object-cover object-[center_18%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/25 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-[13px] font-medium text-white/85">
                  {webtoon.genre} ·{' '}
                  {webtoon.dayOfWeek
                    ? `Updates ${webtoon.dayOfWeek}`
                    : `${webtoon.totalEpisodes} Episodes`}
                </p>
                <h1 className="text-[28px] font-bold tracking-tight leading-tight mt-0.5">
                  {webtoon.title}
                </h1>
                <p className="text-[15px] text-white/80 mt-0.5">{webtoon.author}</p>
              </div>
            </div>
          </div>

          {/* Unboxed Tabular Stats & Primary Actions */}
          <div className="px-4 pt-5 pb-4 space-y-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="grid grid-cols-3 divide-x divide-black/[0.08] dark:divide-white/[0.08] text-center">
              <button
                id="series-rating-stat-btn"
                type="button"
                onClick={() => {
                  setDraftRating(userRating ?? 10);
                  setShowRatingSheet(true);
                }}
                aria-label={
                  userRating !== null
                    ? `Rated ${userRating} out of 10. Tap to update rating`
                    : 'Rate this series'
                }
                className="flex flex-col items-center justify-center cursor-pointer ios-press focus-visible:outline-none"
              >
                <p className="text-[18px] font-semibold inline-flex items-center gap-1 tabular-nums text-black dark:text-white">
                  <Star
                    className={`w-4 h-4 transition-colors ${
                      userRating !== null
                        ? 'text-[#FFD60A] fill-[#FFD60A]'
                        : 'text-[#8E8E93] stroke-[1.9]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{effectiveRating.toFixed(2)}</span>
                </p>
                <p className="text-[13px] text-[#8E8E93]">Rating</p>
              </button>

              <div>
                <p className="text-[18px] font-semibold inline-flex items-center gap-1 tabular-nums text-black dark:text-white">
                  <Eye className="w-4 h-4 text-[#8E8E93]" aria-hidden="true" />
                  <span>{webtoon.viewsCount}</span>
                </p>
                <p className="text-[13px] text-[#8E8E93]">Views</p>
              </div>

              <button
                id="series-subscribe-stat-btn"
                type="button"
                onClick={handleToggleSub}
                aria-pressed={subscribed}
                aria-label={subscribed ? 'Unsubscribe from series' : 'Subscribe to series'}
                className="flex flex-col items-center justify-center cursor-pointer ios-press focus-visible:outline-none"
              >
                <p className="text-[18px] font-semibold inline-flex items-center gap-1 tabular-nums text-black dark:text-white">
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      subscribed
                        ? 'text-[#FF3B30] fill-[#FF3B30]'
                        : 'text-[#8E8E93] stroke-[1.9]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{webtoon.subscribersCount}</span>
                </p>
                <p className="text-[13px] text-[#8E8E93]">Subscribers</p>
              </button>
            </div>

            {savedProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px] text-[#8E8E93]">
                  <span>Last read: Episode {savedProgress.episodeNumber}</span>
                  <span className="tabular-nums">{savedProgress.percent}%</span>
                </div>
                <ProgressBar value={savedProgress.percent} />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                id="series-start-reading-btn"
                variant="primary"
                size="md"
                onClick={handleStartReading}
                className="flex-1"
              >
                {savedProgress
                  ? `Continue Ep. ${resumeEp?.number ?? savedProgress.episodeNumber}`
                  : 'Read Now'}
              </Button>

              <Button
                id="series-subscribe-btn"
                variant={subscribed ? 'secondary' : 'outline'}
                size="md"
                onClick={handleToggleSub}
              >
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>
          </div>

          {/* Synopsis */}
          <div className="px-4 py-4 border-b border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider">
              Synopsis
            </h3>
            <p className="text-[15px] leading-relaxed text-black/85 dark:text-white/85">
              {webtoon.summary}
            </p>
            {webtoon.subGenres.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
                {webtoon.subGenres.map((sg) => (
                  <button
                    key={sg}
                    type="button"
                    onClick={() => onSelectTag?.(sg)}
                    className={`text-[13px] font-medium text-black dark:text-white leading-snug ${
                      onSelectTag
                        ? 'cursor-pointer hover:opacity-70 transition-opacity'
                        : 'cursor-default'
                    }`}
                  >
                    #{sg.replace(/\s+/g, '')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode Directory */}
          <div className="px-4 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                Episodes ({webtoon.episodes.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowCommentsSheet(true)}
                className="text-[13px] font-semibold text-[#007AFF] inline-flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Comments ({currentComments.length})</span>
              </button>
            </div>

            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {webtoon.episodes.map((ep, idx) => {
                const isLastRead = savedProgress?.episodeId === ep.id;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => {
                      if (!savedProgress || savedProgress.episodeId !== ep.id) {
                        saveBookReadingProgress(webtoon.id, {
                          episodeId: ep.id,
                          episodeNumber: ep.number,
                          scrollTop: 0,
                          percent: 0,
                          updatedAt: Date.now(),
                        });
                      }
                      if (onSelectChapter) {
                        onSelectChapter(ep.id, ep.number);
                      } else {
                        setCurrentEpisodeIndex(idx);
                        setActiveTab('reader');
                      }
                    }}
                    className="w-full py-3 flex items-center gap-3.5 text-left hover:bg-[#F2F2F7]/60 dark:hover:bg-[#1C1C1E]/60 px-2 -mx-2 rounded-xl transition-colors ios-press cursor-pointer"
                  >
                    <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 border border-black/[0.06] dark:border-white/[0.08] relative">
                      <SmartImage
                        src={ep.thumbnail}
                        alt={ep.title}
                        aspectClassName="w-full h-full"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-[16px] font-semibold truncate ${
                            isLastRead ? 'text-[#007AFF]' : ''
                          }`}
                        >
                          {ep.title}
                        </p>
                      </div>
                      <p className="text-[13px] text-[#8E8E93] mt-0.5 tabular-nums">
                        Ep. {ep.number} · {ep.date} · {ep.likes.toLocaleString()} likes
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-[#C7C7CC] dark:text-[#636366] shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {renderPreferencesSheet()}
      {renderCommentsSheet()}
      {renderRatingSheet()}
    </div>
  );
};
