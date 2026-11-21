import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  BookOpen,
  ChevronRight,
  Heart,
  Star,
} from 'lucide-react';
import { User } from '../types';
import {
  CONTINUE_READING_ITEMS,
  FEATURED_WEBTOONS,
  NEW_RELEASES_WEBTOONS,
  RECOMMENDED_WEBTOONS,
  TRENDING_WEBTOONS,
  WEBTOON_GRID_ITEMS,
  WebtoonItem,
  getCanonicalWebtoonId,
  resolveWebtoonById,
} from '../data/webtoonData';
import {
  WebtoonReaderModal,
  computeDisplaySeriesRating,
  getBookReadingProgress,
  getSeriesUserRating,
  saveBookReadingProgress,
} from './WebtoonReaderModal';
import { useLanguage } from '../utils/i18n';
import { safeStorage } from '../utils/storage';
import {
  EmptyState,
  HomeFeedSkeleton,
  ProgressBar,
  SmartImage,
  useToast,
} from './ui';

export interface HomeFeedViewProps {
  currentUser: User;
  onToggleTheme?: () => void;
  onOpenWebtoon?: (webtoon: WebtoonItem) => void;
  onOpenBook?: (bookId: string, initialEpisodeNumber?: number) => void;
  onOpenChapter?: (chapterId: string, bookId?: string, episodeNumber?: number) => void;
  onOpenUserProfile?: (user: { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) => void;
  onOpenCreate?: () => void;
  onOpenPulse?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  subscribedWebtoons?: Record<string, boolean>;
  onToggleSubscribe?: (webtoonId: string) => void;
  isActive?: boolean;
}

interface HomePosterCardProps {
  item: WebtoonItem;
  onClick: () => void;
  rank?: number;
  progressPercent?: number;
  currentEpisode?: number;
  kickerText?: string;
  showEpisodesCount?: boolean;
  priorityLoad?: boolean;
}

const HomePosterCard: React.FC<HomePosterCardProps> = ({
  item,
  onClick,
  rank,
  progressPercent,
  currentEpisode,
  kickerText,
  showEpisodesCount = false,
  priorityLoad = false,
}) => {
  const canonicalId = getCanonicalWebtoonId(item.id);
  const liveRating = computeDisplaySeriesRating(
    item.rating,
    getSeriesUserRating(canonicalId)
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex flex-col bg-transparent border-0 p-0 cursor-pointer ios-press focus-visible:outline-none"
    >
      <div className="relative w-full aspect-[2/3] rounded-[14px] overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] mb-2.5">
        <SmartImage
          src={item.coverImage}
          alt={item.title}
          loading={priorityLoad ? 'eager' : 'lazy'}
          aspectClassName="w-full h-full"
          className="object-cover object-[center_18%] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          fallbackText={item.title}
        />

        {typeof rank === 'number' && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
            <span className="absolute bottom-2.5 left-3 text-[28px] font-bold leading-none tracking-tight text-white tabular-nums drop-shadow-sm">
              {rank}
            </span>
          </>
        )}

        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30 pointer-events-none">
            <div
              className="h-full bg-[#007AFF] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      {kickerText && (
        <span className="text-[11px] font-semibold text-[#007AFF] leading-tight mb-0.5 truncate w-full">
          {kickerText}
        </span>
      )}

      <h3 className="text-[15px] font-semibold text-black dark:text-white truncate w-full leading-snug group-hover:text-[#007AFF] transition-colors">
        {item.title}
      </h3>

      {typeof currentEpisode === 'number' ? (
        <p className="text-[13px] text-[#8E8E93] truncate w-full mt-0.5 leading-tight tabular-nums">
          Ep. {currentEpisode} of {item.totalEpisodes} · {progressPercent ?? 0}%
        </p>
      ) : (
        <p className="text-[13px] text-[#8E8E93] flex items-center gap-1.5 truncate w-full mt-0.5 leading-tight tabular-nums">
          <span className="inline-flex items-center gap-1 text-black dark:text-white font-medium shrink-0">
            <Star
              className="w-3.5 h-3.5 text-[#FFD60A] fill-[#FFD60A]"
              aria-hidden="true"
            />
            <span>{liveRating.toFixed(1)}</span>
          </span>
          <span className="truncate">{item.genre}</span>
          {showEpisodesCount && (
            <span className="shrink-0">· {item.totalEpisodes} eps</span>
          )}
        </p>
      )}
    </button>
  );
};

interface FeaturedPosterSlideProps {
  item: WebtoonItem;
  index: number;
  isSubscribed: boolean;
  readsLabel: string;
  subscribedLabel: string;
  subscribeLabel: string;
  onOpenSeries: (item: WebtoonItem) => void;
  onReadNow: (item: WebtoonItem, e: React.MouseEvent) => void;
  onToggleSubscribe: (item: WebtoonItem, e: React.MouseEvent) => void;
}

const FeaturedPosterSlide: React.FC<FeaturedPosterSlideProps> = ({
  item,
  index,
  isSubscribed,
  readsLabel,
  subscribedLabel,
  subscribeLabel,
  onOpenSeries,
  onReadNow,
  onToggleSubscribe,
}) => {
  const canonicalId = getCanonicalWebtoonId(item.id);
  const slideRating = computeDisplaySeriesRating(
    item.rating,
    getSeriesUserRating(canonicalId)
  );
  const stopCarouselPointer = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={() => onOpenSeries(item)}
      className="relative w-full shrink-0 snap-center overflow-hidden aspect-[3/4] sm:aspect-[16/9] max-h-[480px] bg-black cursor-pointer group"
    >
      <SmartImage
        src={item.bannerImage || item.coverImage}
        alt={item.title}
        loading="eager"
        aspectClassName="w-full h-full"
        className="object-cover object-[center_18%] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        fallbackText={item.title}
      />

      {/* Subtle lower scrim for clean text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 via-45% to-transparent pointer-events-none" />

      {/* Spotlight Content */}
      <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 text-white">
        <p className="text-[13px] font-medium text-white/80">
          {item.genre}
        </p>

        <h2 className="text-[27px] sm:text-[32px] font-bold tracking-tight leading-[1.12] text-white mt-1 line-clamp-2 text-balance">
          {item.title}
        </h2>

        <p className="text-[14px] sm:text-[15px] text-white/85 line-clamp-2 mt-2 max-w-xl leading-[1.42]">
          {item.summary}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[13px] text-white/85 tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <Star
              className="w-3.5 h-3.5 text-[#FFD60A] fill-[#FFD60A]"
              aria-hidden="true"
            />
            <span>{slideRating.toFixed(2)}</span>
          </span>
          <span>
            {item.viewsCount} {readsLabel}
          </span>
          <span>{item.subLabel}</span>
        </div>

        <div
          className="relative z-10 grid grid-cols-2 gap-2.5 mt-4 max-w-sm"
          onClick={stopCarouselPointer}
          onPointerDown={stopCarouselPointer}
          onPointerMove={stopCarouselPointer}
          onPointerUp={stopCarouselPointer}
          onTouchStart={stopCarouselPointer}
          onTouchMove={stopCarouselPointer}
          onTouchEnd={stopCarouselPointer}
        >
          <button
            id={`hero-read-now-btn-${index}`}
            type="button"
            onClick={(e) => onReadNow(item, e)}
            className="h-[44px] px-4 rounded-[13px] bg-[#007AFF] hover:bg-[#0066D6] text-white text-[15px] font-semibold inline-flex items-center justify-center ios-press cursor-pointer whitespace-nowrap touch-manipulation"
          >
            Read Now
          </button>

          <button
            id={`hero-subscribe-btn-${index}`}
            type="button"
            aria-pressed={isSubscribed}
            onClick={(e) => onToggleSubscribe(item, e)}
            className={`h-[44px] px-4 rounded-[13px] text-[15px] font-semibold inline-flex items-center justify-center ios-press cursor-pointer whitespace-nowrap touch-manipulation transition-colors ${
              isSubscribed
                ? 'bg-white text-black'
                : 'bg-white/20 hover:bg-white/28 text-white backdrop-blur-md'
            }`}
          >
            {isSubscribed ? subscribedLabel : subscribeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  currentUser,
  onOpenWebtoon,
  onOpenBook,
  onOpenChapter,
  onOpenPulse,
  onOpenNotifications,
  subscribedWebtoons: externalSubscribed,
  onToggleSubscribe: externalToggleSubscribe,
  isActive = true,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [readerOpenState, setReaderOpenState] = useState<{
    webtoon: WebtoonItem;
    initialTab: 'episodes' | 'reader';
    episodeNumber?: number;
  } | null>(null);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const activeBannerIdxRef = useRef(0);
  const wasActiveRef = useRef(isActive);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    scrollLeft: number;
    dragged: boolean;
  }>({ isDown: false, startX: 0, scrollLeft: 0, dragged: false });
  const [localSubscribed, setLocalSubscribed] = useState<Record<string, boolean>>(() =>
    safeStorage.getJSON<Record<string, boolean>>('enmmoe_subscribed_webtoons_v1', {
      'otherworldly-family-man': true,
      'down-to-earth': true,
      'father-i-dont-want-marriage': true,
    })
  );
  const [activeScheduleTab, setActiveScheduleTab] = useState<string>('POPULAR');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const subscribedIds = externalSubscribed || localSubscribed;
  const featuredSlides = useMemo(() => FEATURED_WEBTOONS.slice(0, 3), []);

  useEffect(() => {
    if (!externalSubscribed) {
      safeStorage.setJSON('enmmoe_subscribed_webtoons_v1', localSubscribed);
    }
  }, [externalSubscribed, localSubscribed]);

  useEffect(() => {
    activeBannerIdxRef.current = activeBannerIdx;
  }, [activeBannerIdx]);

  useEffect(() => {
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (!wasActive && isActive) {
      const restoreScroll = () => {
        if (carouselRef.current && carouselRef.current.clientWidth > 0) {
          carouselRef.current.scrollLeft =
            activeBannerIdxRef.current * carouselRef.current.clientWidth;
        }
      };
      restoreScroll();
      requestAnimationFrame(restoreScroll);
    }
  }, [isActive]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 220);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectWebtoon = (item: WebtoonItem, initialEpisodeNumber?: number) => {
    const canonicalItem = resolveWebtoonById(item.id) || item;
    if (onOpenBook) {
      onOpenBook(canonicalItem.id, initialEpisodeNumber);
      return;
    }
    if (onOpenWebtoon) {
      onOpenWebtoon(canonicalItem);
      return;
    }
    setReaderOpenState({
      webtoon: canonicalItem,
      initialTab: 'episodes',
      episodeNumber: initialEpisodeNumber,
    });
  };

  const handleReadNow = (item: WebtoonItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const canonicalItem = resolveWebtoonById(item.id) || item;
    const saved = getBookReadingProgress(canonicalItem.id);
    const targetEp =
      (saved &&
        canonicalItem.episodes.find(
          (ep) => ep.id === saved.episodeId || ep.number === saved.episodeNumber
        )) ||
      canonicalItem.episodes[0];

    if (targetEp && !saved) {
      saveBookReadingProgress(canonicalItem.id, {
        episodeId: targetEp.id,
        episodeNumber: targetEp.number,
        scrollTop: 0,
        percent: 0,
        updatedAt: Date.now(),
      });
    }

    if (onOpenChapter && targetEp) {
      onOpenChapter(targetEp.id, canonicalItem.id, targetEp.number);
      return;
    }

    if (targetEp) {
      setReaderOpenState({
        webtoon: canonicalItem,
        initialTab: 'reader',
        episodeNumber: targetEp.number,
      });
      return;
    }

    handleSelectWebtoon(canonicalItem);
  };

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el || el.clientWidth <= 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(featuredSlides.length - 1, idx));
    if (clamped !== activeBannerIdx) {
      setActiveBannerIdx(clamped);
    }
  };

  const scrollToBanner = (idx: number) => {
    const el = carouselRef.current;
    setActiveBannerIdx(idx);
    if (el) {
      el.scrollTo({
        left: idx * el.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleToggleSubscribe = (id: string, title?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const canonicalId = getCanonicalWebtoonId(id);
    const defaultSub = Boolean(resolveWebtoonById(canonicalId)?.isSubscribed);
    const nextState = !(subscribedIds[canonicalId] ?? defaultSub);
    if (externalToggleSubscribe) {
      externalToggleSubscribe(canonicalId);
    } else {
      setLocalSubscribed((prev) => ({
        ...prev,
        [canonicalId]: nextState,
      }));
    }
    showToast(
      nextState
        ? `${title ? `${title} · ` : ''}${t('subscribed', 'Subscribed')}`
        : `${title ? `${title} · ` : ''}Removed from library`,
      { type: 'success', durationMs: 2000 }
    );
  };

  const scheduleTabs = ['POPULAR', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const filteredGridItems = useMemo(() => {
    return WEBTOON_GRID_ITEMS.filter((item) => {
      if (activeScheduleTab === 'POPULAR') return true;
      return item.dayOfWeek === activeScheduleTab;
    });
  }, [activeScheduleTab]);

  return (
    <div
      id="enmmoe-home-view"
      className="w-full min-h-full bg-white dark:bg-black text-black dark:text-white pb-8 select-none"
    >
      {/* Minimal Borderless Home Header (Pulse — Centered Script Wordmark — Heart) */}
      <header
        id="home-top-bar"
        className="sticky top-0 z-30 bg-white dark:bg-black pt-safe"
      >
        <div className="h-[48px] px-4 grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Far Left: Existing Pulse Icon */}
          <button
            id="home-pulse-btn"
            type="button"
            onClick={onOpenPulse}
            aria-label="Pulse"
            className="justify-self-start min-w-[44px] min-h-[44px] -ml-2.5 flex items-center justify-center text-black dark:text-white bg-transparent border-0 p-0 cursor-pointer active:opacity-50 transition-opacity focus-visible:outline-none"
          >
            <Activity className="w-[22px] h-[22px] stroke-[1.8]" aria-hidden="true" />
          </button>

          {/* True Horizontally Centered Script Wordmark */}
          <h1
            aria-label="enmmoe"
            className="enmmoe-wordmark justify-self-center text-[32px] sm:text-[34px] font-normal leading-none lowercase text-[#000000] dark:text-[#FFFFFF] select-none pointer-events-none translate-y-[1px]"
          >
            enmmoe
          </h1>

          {/* Far Right: Clean Outline Heart */}
          <button
            id="home-activity-btn"
            type="button"
            onClick={onOpenNotifications}
            aria-label={t('notifications_title', 'Activity & Notifications')}
            className="justify-self-end min-w-[44px] min-h-[44px] -mr-2.5 flex items-center justify-center text-black dark:text-white bg-transparent border-0 p-0 cursor-pointer active:opacity-50 transition-opacity focus-visible:outline-none"
          >
            <Heart className="w-[22px] h-[22px] stroke-[1.8]" aria-hidden="true" />
          </button>
        </div>
      </header>

      {isInitialLoading ? (
        <HomeFeedSkeleton />
      ) : (
        <div className="space-y-8 pt-2">
          {/* Cinematic Edge-Aware Featured Series Carousel */}
          <section aria-label="Featured Series" className="px-4">
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              onPointerDown={(e) => {
                const target = e.target as HTMLElement | null;
                if (
                  e.pointerType !== 'mouse' ||
                  e.button !== 0 ||
                  !carouselRef.current ||
                  target?.closest('button, a, input')
                ) {
                  dragStateRef.current.isDown = false;
                  dragStateRef.current.dragged = false;
                  return;
                }
                dragStateRef.current = {
                  isDown: true,
                  startX: e.clientX,
                  scrollLeft: carouselRef.current.scrollLeft,
                  dragged: false,
                };
              }}
              onPointerMove={(e) => {
                const st = dragStateRef.current;
                if (!st.isDown || e.pointerType !== 'mouse' || !carouselRef.current) return;
                const dx = e.clientX - st.startX;
                if (Math.abs(dx) > 6) st.dragged = true;
                carouselRef.current.scrollLeft = st.scrollLeft - dx;
              }}
              onPointerUp={() => {
                const st = dragStateRef.current;
                if (!st.isDown || !carouselRef.current) return;
                st.isDown = false;
                const el = carouselRef.current;
                if (st.dragged && el.clientWidth > 0) {
                  const targetIdx = Math.max(
                    0,
                    Math.min(featuredSlides.length - 1, Math.round(el.scrollLeft / el.clientWidth))
                  );
                  scrollToBanner(targetIdx);
                  setTimeout(() => {
                    dragStateRef.current.dragged = false;
                  }, 0);
                } else {
                  st.dragged = false;
                }
              }}
              onPointerCancel={() => {
                dragStateRef.current.isDown = false;
                dragStateRef.current.dragged = false;
              }}
              onPointerLeave={() => {
                dragStateRef.current.isDown = false;
                dragStateRef.current.dragged = false;
              }}
              className="w-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x rounded-[20px]"
            >
              {featuredSlides.map((item, idx) => {
                const canonicalId = getCanonicalWebtoonId(item.id);
                const isSlideSubscribed =
                  subscribedIds[canonicalId] ?? Boolean(item.isSubscribed);
                return (
                  <FeaturedPosterSlide
                    key={item.id}
                    item={item}
                    index={idx}
                    isSubscribed={isSlideSubscribed}
                    readsLabel={t('reads', 'reads')}
                    subscribedLabel={t('subscribed', 'Subscribed')}
                    subscribeLabel={t('subscribe', 'Subscribe')}
                    onOpenSeries={(series) => {
                      if (dragStateRef.current.dragged) {
                        dragStateRef.current.dragged = false;
                        return;
                      }
                      handleSelectWebtoon(series);
                    }}
                    onReadNow={(series, e) => handleReadNow(series, e)}
                    onToggleSubscribe={(series, e) =>
                      handleToggleSubscribe(series.id, series.title, e)
                    }
                  />
                );
              })}
            </div>

            {/* Minimal 3-Slide Indicators */}
            <div
              aria-label="Featured slides"
              className="flex items-center justify-center gap-1.5 mt-3"
            >
              {featuredSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => scrollToBanner(idx)}
                  aria-label={`Featured slide ${idx + 1}`}
                  aria-current={idx === activeBannerIdx ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    idx === activeBannerIdx
                      ? 'w-5 bg-[#007AFF]'
                      : 'w-1.5 bg-black/20 dark:bg-white/25 hover:bg-black/35 dark:hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </section>

          {/* Continue Reading */}
          <section aria-label="Continue Reading">
            <div className="px-4 flex items-baseline justify-between mb-3">
              <h2 className="text-[21px] font-semibold tracking-tight text-black dark:text-white">
                {t('continue_reading', 'Continue Reading')}
              </h2>
              <span className="text-[13px] font-medium text-[#8E8E93] tabular-nums">
                {CONTINUE_READING_ITEMS.length} {t('in_progress', 'In Progress')}
              </span>
            </div>

            <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
              {CONTINUE_READING_ITEMS.map((item) => {
                const canonicalId = getCanonicalWebtoonId(item.id);
                const saved = getBookReadingProgress(canonicalId);
                const currentEp = saved?.episodeNumber || item.lastReadEpisode || 1;
                const pct = Math.min(100, Math.round((currentEp / item.totalEpisodes) * 100));
                return (
                  <div key={item.id} className="w-[146px] sm:w-[164px] shrink-0">
                    <HomePosterCard
                      item={item}
                      currentEpisode={currentEp}
                      progressPercent={pct}
                      priorityLoad
                      onClick={() => handleSelectWebtoon(item, currentEp)}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trending Now */}
          <section aria-label="Trending Now">
            <div className="px-4 flex items-baseline justify-between mb-3">
              <h2 className="text-[21px] font-semibold tracking-tight text-black dark:text-white">
                {t('feed_trending', 'Trending Now')}
              </h2>
              <span className="text-[13px] font-medium text-[#8E8E93]">Top 6</span>
            </div>

            <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
              {TRENDING_WEBTOONS.map((item, idx) => (
                <div key={item.id} className="w-[146px] sm:w-[164px] shrink-0">
                  <HomePosterCard
                    item={item}
                    rank={idx + 1}
                    onClick={() => handleSelectWebtoon(item)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* New Releases */}
          <section aria-label="New Releases">
            <div className="px-4 flex items-baseline justify-between mb-3">
              <h2 className="text-[21px] font-semibold tracking-tight text-black dark:text-white">
                {t('new_releases', 'New Releases')}
              </h2>
              <span className="text-[13px] font-medium text-[#8E8E93]">
                {t('fresh_episodes', 'Fresh Episodes')}
              </span>
            </div>

            <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
              {NEW_RELEASES_WEBTOONS.map((item) => (
                <div key={item.id} className="w-[146px] sm:w-[164px] shrink-0">
                  <HomePosterCard
                    item={item}
                    kickerText={item.topBadgeText || 'New'}
                    showEpisodesCount
                    onClick={() => handleSelectWebtoon(item)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Recommended for You */}
          <section aria-label="Recommended for You">
            <div className="px-4 flex items-baseline justify-between mb-3">
              <h2 className="text-[21px] font-semibold tracking-tight text-black dark:text-white">
                {t('suggested_for_you', 'Recommended for You')}
              </h2>
              <span className="text-[13px] font-medium text-[#8E8E93]">
                {t('based_on_your_taste', 'For You')}
              </span>
            </div>

            <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
              {RECOMMENDED_WEBTOONS.map((item) => (
                <div key={item.id} className="w-[146px] sm:w-[164px] shrink-0">
                  <HomePosterCard
                    item={item}
                    showEpisodesCount
                    onClick={() => handleSelectWebtoon(item)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Weekly Release Schedule & Catalog Posters */}
          <section aria-label="Release Schedule" className="pt-1">
            <div className="px-4 flex items-baseline justify-between mb-3">
              <h2 className="text-[21px] font-semibold tracking-tight text-black dark:text-white">
                {t('weekly_release_schedule', 'Weekly Schedule')}
              </h2>
              <button
                type="button"
                onClick={() => setActiveScheduleTab('POPULAR')}
                className="inline-flex items-center gap-0.5 text-[15px] font-medium text-[#007AFF] cursor-pointer"
              >
                <span>All</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3.5">
              {scheduleTabs.map((tab) => {
                const isActive = activeScheduleTab === tab;
                const tabLabel =
                  tab === 'POPULAR' ? t('popular', 'Popular') : t(tab.toLowerCase(), tab);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveScheduleTab(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ios-press ${
                      isActive
                        ? 'bg-[#007AFF] text-white'
                        : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>

            <div className="px-4">
              {filteredGridItems.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="w-6 h-6" />}
                  title="No series found"
                  description={t(
                    'no_webtoons_found',
                    'No webtoons found matching your filter.'
                  ).replace('{searchQuery}', '')}
                  actionLabel="Show Popular"
                  onAction={() => {
                    setActiveScheduleTab('POPULAR');
                  }}
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3.5 gap-y-5">
                  {filteredGridItems.map((item) => {
                    const canonicalId = getCanonicalWebtoonId(item.id);
                    const saved = getBookReadingProgress(canonicalId);
                    const pct = saved
                      ? Math.min(100, Math.round((saved.episodeNumber / item.totalEpisodes) * 100))
                      : undefined;
                    return (
                      <HomePosterCard
                        key={item.id}
                        item={item}
                        progressPercent={pct}
                        showEpisodesCount
                        onClick={() => handleSelectWebtoon(item)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clean Hairline Reading Queue Footer (No Heavy Container Box) */}
            {CONTINUE_READING_ITEMS.length > 0 && (
              <div className="px-4 mt-7">
                <div className="pt-5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#8E8E93]">Reading Queue</p>
                    <p className="text-[15px] font-semibold text-black dark:text-white truncate mt-0.5">
                      {CONTINUE_READING_ITEMS.length} active series in progress
                    </p>
                    <ProgressBar value={65} className="mt-2 max-w-[200px]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectWebtoon(CONTINUE_READING_ITEMS[0])}
                    className="h-9 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-[14px] font-semibold shrink-0 cursor-pointer ios-press whitespace-nowrap"
                  >
                    Resume
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Fallback Modal if onOpenBook/onOpenChapter wasn't passed */}
      {readerOpenState && (
        <WebtoonReaderModal
          webtoon={readerOpenState.webtoon}
          initialTab={readerOpenState.initialTab}
          initialEpisodeNumber={readerOpenState.episodeNumber}
          onClose={() => setReaderOpenState(null)}
          isSubscribed={
            subscribedIds[getCanonicalWebtoonId(readerOpenState.webtoon.id)] ??
            Boolean(readerOpenState.webtoon.isSubscribed)
          }
          onToggleSubscribe={(id) =>
            handleToggleSubscribe(id, readerOpenState.webtoon.title)
          }
          theme={currentUser.theme === 'light' ? 'light' : 'dark'}
        />
      )}
    </div>
  );
};
