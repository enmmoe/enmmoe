import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Moon,
  Plus,
  Search,
  Star,
  Sun,
} from 'lucide-react';
import { User } from '../types';
import {
  ALL_WEBTOONS,
  CONTINUE_READING_ITEMS,
  FEATURED_WEBTOONS,
  NEW_RELEASES_WEBTOONS,
  RECOMMENDED_WEBTOONS,
  TRENDING_WEBTOONS,
  WEBTOON_GRID_ITEMS,
  WebtoonItem,
} from '../data/webtoonData';
import { WebtoonReaderModal, getBookReadingProgress } from './WebtoonReaderModal';
import { useLanguage } from '../utils/i18n';
import {
  BookCover,
  Button,
  EmptyState,
  HomeFeedSkeleton,
  ProgressBar,
  SearchBar,
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
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  subscribedWebtoons?: Record<string, boolean>;
  onToggleSubscribe?: (webtoonId: string) => void;
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  currentUser,
  onToggleTheme,
  onOpenWebtoon,
  onOpenBook,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  subscribedWebtoons: externalSubscribed,
  onToggleSubscribe: externalToggleSubscribe,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [selectedWebtoon, setSelectedWebtoon] = useState<WebtoonItem | null>(null);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [localSubscribed, setLocalSubscribed] = useState<Record<string, boolean>>({
    'otherworldly-family-man': true,
    'down-to-earth': true,
    'father-i-dont-want-marriage': true,
    'trend-1': true,
    'new-1': true,
  });
  const [activeScheduleTab, setActiveScheduleTab] = useState<string>('POPULAR');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const subscribedIds = externalSubscribed || localSubscribed;

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 220);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectWebtoon = (item: WebtoonItem, initialEpisodeNumber?: number) => {
    if (onOpenBook) {
      onOpenBook(item.id, initialEpisodeNumber);
      return;
    }
    if (onOpenWebtoon) {
      onOpenWebtoon(item);
      return;
    }
    setSelectedWebtoon(item);
  };

  const featured = FEATURED_WEBTOONS[activeBannerIdx] || FEATURED_WEBTOONS[0];
  const isFeaturedSubscribed = subscribedIds[featured.id] ?? featured.isSubscribed;

  const handleToggleSubscribe = (id: string, title?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextState = !(subscribedIds[id] ?? false);
    if (externalToggleSubscribe) {
      externalToggleSubscribe(id);
    } else {
      setLocalSubscribed((prev) => ({
        ...prev,
        [id]: nextState,
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
    const list = searchQuery.trim() ? ALL_WEBTOONS : WEBTOON_GRID_ITEMS;
    return list.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.genre.toLowerCase().includes(q) ||
          item.subGenres.some((sg) => sg.toLowerCase().includes(q))
        );
      }
      if (activeScheduleTab === 'POPULAR') return true;
      return item.dayOfWeek === activeScheduleTab;
    });
  }, [searchQuery, activeScheduleTab]);

  const isDark = currentUser.theme === 'dark';

  return (
    <div
      id="enmmoe-home-view"
      className="w-full min-h-full bg-white dark:bg-black text-black dark:text-white pb-8 select-none"
    >
      {/* iOS Top Navigation Header */}
      <header
        id="home-top-bar"
        className="sticky top-0 z-30 bg-white/88 dark:bg-black/88 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] pt-safe"
      >
        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          {!isSearchOpen ? (
            <>
              <div className="flex items-baseline gap-2 min-w-0">
                <h1 className="text-[28px] font-bold tracking-tight leading-none lowercase text-black dark:text-white">
                  enm<span className="text-[#007AFF] dark:text-[#0A84FF]">moe</span>
                </h1>
              </div>

              <div className="flex items-center gap-1">
                <button
                  id="home-search-negative-btn"
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 60);
                  }}
                  aria-label={t('search', 'Search')}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] ios-press cursor-pointer"
                >
                  <Search className="w-[20px] h-[20px] stroke-[1.9]" />
                </button>

                {onOpenNotifications && (
                  <button
                    type="button"
                    onClick={onOpenNotifications}
                    aria-label={t('notifications_title', 'Notifications')}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center text-black dark:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] ios-press cursor-pointer"
                  >
                    <Bell className="w-[20px] h-[20px] stroke-[1.9]" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#007AFF] dark:bg-[#0A84FF] ring-2 ring-white dark:ring-black" />
                    )}
                  </button>
                )}

                {onToggleTheme && (
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] ios-press cursor-pointer"
                  >
                    {isDark ? (
                      <Sun className="w-[20px] h-[20px] text-white stroke-[1.9]" />
                    ) : (
                      <Moon className="w-[20px] h-[20px] stroke-[1.9]" />
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full py-0.5">
              <SearchBar
                ref={searchInputRef}
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('search', 'Search series, authors, genres...')}
                showCancelOnFocus
                cancelLabel={t('cancel', 'Cancel')}
                onCancel={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                autoFocus
              />
            </div>
          )}
        </div>
      </header>

      {isInitialLoading ? (
        <HomeFeedSkeleton />
      ) : (
        <div className="space-y-7 pt-3">
          {/* Spotlight Hero Carousel */}
          {!searchQuery && (
            <section aria-label="Featured Series" className="px-4">
              <div
                onClick={() => handleSelectWebtoon(featured)}
                className="relative w-full rounded-[24px] overflow-hidden aspect-[4/5] sm:aspect-[16/9] max-h-[440px] bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.1] shadow-[0_8px_30px_rgba(0,0,0,0.08)] cursor-pointer group"
              >
                <SmartImage
                  src={featured.bannerImage || featured.coverImage}
                  alt={featured.title}
                  aspectClassName="w-full h-full"
                  className="object-top transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  fallbackText={featured.title}
                />

                {/* Clean bottom scrim only for crisp readable typography */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/35 to-transparent pointer-events-none" />

                {/* Carousel Indicators */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-2.5 py-1.5 rounded-full"
                >
                  {FEATURED_WEBTOONS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveBannerIdx(idx)}
                      aria-label={`Featured slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                        idx === activeBannerIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/45'
                      }`}
                    />
                  ))}
                </div>

                {/* Editorial Spotlight Content */}
                <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 text-white">
                  <p className="text-[13px] font-medium text-white/85 tracking-wide">
                    {featured.genre} · {featured.matchScore || 98}% Match
                  </p>
                  <h2 className="text-[28px] font-bold tracking-tight leading-[1.15] mt-1 line-clamp-2">
                    {featured.title}
                  </h2>
                  <p className="text-[15px] text-white/80 line-clamp-2 mt-1.5 max-w-xl leading-snug">
                    {featured.summary}
                  </p>

                  <div className="flex items-center gap-2.5 mt-2.5 text-[13px] text-white/80 tabular-nums">
                    <span className="inline-flex items-center gap-1 text-[#0A84FF] font-semibold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {featured.rating.toFixed(2)}
                    </span>
                    <span>·</span>
                    <span>
                      {featured.viewsCount} {t('reads', 'reads')}
                    </span>
                    <span>·</span>
                    <span>{featured.subLabel}</span>
                  </div>

                  <div
                    className="flex items-center gap-2.5 mt-4 max-w-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      id="hero-start-reading-btn"
                      variant="primary"
                      size="md"
                      leftIcon={<BookOpen className="w-4 h-4" />}
                      onClick={() => handleSelectWebtoon(featured)}
                      className="flex-1"
                    >
                      {t('read_now', 'Start Reading')}
                    </Button>

                    <button
                      id="hero-subscribe-btn"
                      type="button"
                      onClick={(e) => handleToggleSubscribe(featured.id, featured.title, e)}
                      className={`min-h-[44px] px-4 rounded-2xl text-[15px] font-semibold backdrop-blur-md border inline-flex items-center justify-center gap-1.5 ios-press cursor-pointer whitespace-nowrap shrink-0 ${
                        isFeaturedSubscribed
                          ? 'bg-white text-black border-white'
                          : 'bg-white/18 hover:bg-white/25 text-white border-white/30'
                      }`}
                    >
                      {isFeaturedSubscribed ? (
                        <>
                          <Check className="w-4 h-4 text-[#007AFF] stroke-[2.5]" />
                          <span>{t('subscribed', 'Subscribed')}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[2.2]" />
                          <span>{t('subscribe', 'Subscribe')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Continue Reading */}
          {!searchQuery && (
            <section aria-label="Continue Reading">
              <div className="px-4 flex items-center justify-between mb-3">
                <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                  {t('continue_reading', 'Continue Reading')}
                </h2>
                <span className="text-[13px] font-medium text-[#8E8E93] tabular-nums">
                  {CONTINUE_READING_ITEMS.length} {t('in_progress', 'In Progress')}
                </span>
              </div>

              <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
                {CONTINUE_READING_ITEMS.map((item) => {
                  const saved = getBookReadingProgress(item.id);
                  const currentEp = saved?.episodeNumber || item.lastReadEpisode || 1;
                  const pct = Math.min(100, Math.round((currentEp / item.totalEpisodes) * 100));
                  return (
                    <div key={item.id} className="w-[126px] sm:w-[144px] shrink-0">
                      <BookCover
                        title={item.title}
                        subtitle={`Ep. ${currentEp} · ${pct}%`}
                        coverImage={item.coverImage}
                        badgeText={`Ep. ${currentEp}`}
                        progressPercent={pct}
                        onClick={() => handleSelectWebtoon(item, currentEp)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Trending Now */}
          {!searchQuery && (
            <section aria-label="Trending Now">
              <div className="px-4 flex items-center justify-between mb-3">
                <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                  {t('feed_trending', 'Trending Now')}
                </h2>
                <span className="text-[13px] font-medium text-[#8E8E93]">Top 6</span>
              </div>

              <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
                {TRENDING_WEBTOONS.map((item, idx) => (
                  <div key={item.id} className="w-[126px] sm:w-[144px] shrink-0">
                    <BookCover
                      title={item.title}
                      subtitle={`${item.genre} · ★ ${item.rating.toFixed(1)}`}
                      coverImage={item.coverImage}
                      badgeText={`#${idx + 1}`}
                      onClick={() => handleSelectWebtoon(item)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* New Releases */}
          {!searchQuery && (
            <section aria-label="New Releases">
              <div className="px-4 flex items-center justify-between mb-3">
                <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                  {t('new_releases', 'New Releases')}
                </h2>
                <span className="text-[13px] font-medium text-[#8E8E93]">
                  {t('fresh_episodes', 'Fresh Episodes')}
                </span>
              </div>

              <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
                {NEW_RELEASES_WEBTOONS.map((item) => (
                  <div key={item.id} className="w-[126px] sm:w-[144px] shrink-0">
                    <BookCover
                      title={item.title}
                      subtitle={item.subLabel || 'New episodes'}
                      coverImage={item.coverImage}
                      badgeText={item.topBadgeText || 'New'}
                      onClick={() => handleSelectWebtoon(item)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommended for You */}
          {!searchQuery && (
            <section aria-label="Recommended for You">
              <div className="px-4 flex items-center justify-between mb-3">
                <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                  {t('suggested_for_you', 'Recommended for You')}
                </h2>
                <span className="text-[13px] font-medium text-[#8E8E93]">
                  {t('based_on_your_taste', 'For You')}
                </span>
              </div>

              <div className="px-4 flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-1">
                {RECOMMENDED_WEBTOONS.map((item) => (
                  <div key={item.id} className="w-[126px] sm:w-[144px] shrink-0">
                    <BookCover
                      title={item.title}
                      subtitle={`${item.genre} · ${item.matchScore || 95}%`}
                      coverImage={item.coverImage}
                      onClick={() => handleSelectWebtoon(item)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weekly Release Schedule & Catalog Grid */}
          <section aria-label="Release Schedule" className="pt-1">
            <div className="px-4 flex items-center justify-between mb-3">
              <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                {searchQuery
                  ? `${t('search', 'Search')} (${filteredGridItems.length})`
                  : t('weekly_release_schedule', 'Weekly Schedule')}
              </h2>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => setActiveScheduleTab('POPULAR')}
                  className="inline-flex items-center gap-0.5 text-[15px] font-medium text-[#007AFF] dark:text-[#0A84FF] cursor-pointer"
                >
                  <span>All</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {!searchQuery && (
              <div className="px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-3">
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
                          ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                          : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {tabLabel}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="px-4">
              {filteredGridItems.length === 0 ? (
                <EmptyState
                  icon={<BookOpen className="w-6 h-6" />}
                  title="No series found"
                  description={t(
                    'no_webtoons_found',
                    'No webtoons found matching your filter.'
                  ).replace('{searchQuery}', searchQuery)}
                  actionLabel={searchQuery ? 'Clear Search' : 'Show Popular'}
                  onAction={() => {
                    setSearchQuery('');
                    setActiveScheduleTab('POPULAR');
                  }}
                />
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
                  {filteredGridItems.map((item) => {
                    const saved = getBookReadingProgress(item.id);
                    const pct = saved
                      ? Math.min(100, Math.round((saved.episodeNumber / item.totalEpisodes) * 100))
                      : undefined;
                    return (
                      <BookCover
                        key={item.id}
                        title={item.title}
                        subtitle={item.subLabel || item.genre}
                        coverImage={item.coverImage}
                        badgeText={item.topBadgeText}
                        progressPercent={pct}
                        onClick={() => handleSelectWebtoon(item)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subtle Reading Progress Footer Note if user has progress */}
            {!searchQuery && CONTINUE_READING_ITEMS.length > 0 && (
              <div className="px-4 mt-6">
                <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#8E8E93]">Reading Goal</p>
                    <p className="text-[15px] font-semibold text-black dark:text-white truncate">
                      {CONTINUE_READING_ITEMS.length} active series in your queue
                    </p>
                    <ProgressBar value={65} className="mt-2 max-w-[200px]" />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSelectWebtoon(CONTINUE_READING_ITEMS[0])}
                    className="bg-white dark:bg-[#2C2C2E]"
                  >
                    Resume
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Fallback Modal if onOpenBook wasn't passed */}
      {selectedWebtoon && (
        <WebtoonReaderModal
          webtoon={selectedWebtoon}
          onClose={() => setSelectedWebtoon(null)}
          isSubscribed={subscribedIds[selectedWebtoon.id]}
          onToggleSubscribe={(id) => handleToggleSubscribe(id, selectedWebtoon.title)}
          theme={currentUser.theme === 'light' ? 'light' : 'dark'}
        />
      )}
    </div>
  );
};
