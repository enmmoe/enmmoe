import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X,
  ChevronRight,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { User, SocialPost, ShortVideo } from '../types';
import {
  UNIQUE_WEBTOONS,
  WebtoonItem,
  getCanonicalWebtoonId,
  resolveWebtoonById,
} from '../data/webtoonData';
import { useLanguage } from '../utils/i18n';
import { WebtoonReaderModal } from './WebtoonReaderModal';
import { safeStorage } from '../utils/storage';
import {
  Avatar,
  BookCover,
  Button,
  EmptyState,
  SearchBar,
  SearchSkeleton,
  SmartImage,
  VerifiedBadge,
} from './ui';

interface DiscoverViewProps {
  currentUser?: User;
  creators?: User[];
  posts?: SocialPost[];
  reels?: ShortVideo[];
  onToggleFollow?: (userId: string) => void;
  onOpenReel?: (reelIndex: number) => void;
  onSelectHashtag?: (tag: string) => void;
  onOpenWebtoon?: (webtoon: WebtoonItem) => void;
  onOpenUserProfile?: (user: { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) => void;
  subscribedWebtoons?: Record<string, boolean>;
  onToggleSubscribe?: (webtoonId: string) => void;
  externalSearchTrigger?: { query: string; nonce: number } | null;
}

type CategoryTab = 'all' | 'trending' | 'creators' | 'genres';

const RECENT_SEARCHES_KEY = 'enmmoe_recent_searches_v1';
const DEFAULT_RECENT = [
  'Solo Leveling',
  'Lore Olympus',
  'Tower of God',
  'Fantasy',
];

const SUGGESTIONS = ['Action', 'Romance', 'Omniscient Reader', 'Cyberpunk', 'Comedy'];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  currentUser,
  creators = [],
  onToggleFollow,
  onOpenWebtoon,
  onOpenUserProfile,
  subscribedWebtoons,
  onToggleSubscribe,
  externalSearchTrigger,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    safeStorage.getJSON<string[]>(RECENT_SEARCHES_KEY, DEFAULT_RECENT)
  );

  const [activeReadingWebtoon, setActiveReadingWebtoon] = useState<{
    webtoon: WebtoonItem;
    episode: number;
  } | null>(null);

  useEffect(() => {
    safeStorage.setJSON(RECENT_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 160);
    return () => clearTimeout(timer);
  }, [activeCategory, selectedGenre, searchQuery]);

  useEffect(() => {
    if (externalSearchTrigger?.query) {
      setActiveCategory('all');
      setSelectedGenre(null);
      setSearchQuery(externalSearchTrigger.query);
    }
  }, [externalSearchTrigger?.nonce, externalSearchTrigger?.query]);

  const categories: { id: CategoryTab; label: string }[] = [
    { id: 'all', label: t('all', 'All') },
    { id: 'trending', label: t('trending', 'Trending') },
    { id: 'creators', label: 'Creators' },
    { id: 'genres', label: t('genres', 'Genres') },
  ];

  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>();
    UNIQUE_WEBTOONS.forEach((w) => {
      if (w.genre) genresSet.add(w.genre);
      w.subGenres?.forEach((sg) => genresSet.add(sg));
    });
    return Array.from(genresSet).slice(0, 14);
  }, []);

  const filteredWebtoons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return UNIQUE_WEBTOONS.filter((w) => {
      if (q) {
        const matchesTitle = w.title.toLowerCase().includes(q);
        const matchesAuthor = w.author.toLowerCase().includes(q);
        const matchesGenre = w.genre.toLowerCase().includes(q);
        const matchesSubGenres = w.subGenres?.some((sg) => sg.toLowerCase().includes(q));
        const matchesSummary = w.summary?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesGenre && !matchesSubGenres && !matchesSummary) {
          return false;
        }
      }

      if (activeCategory === 'genres' && selectedGenre) {
        const matchesActiveGenre =
          w.genre.toLowerCase() === selectedGenre.toLowerCase() ||
          w.subGenres?.some((sg) => sg.toLowerCase() === selectedGenre.toLowerCase());
        if (!matchesActiveGenre) return false;
      }

      return true;
    });
  }, [searchQuery, activeCategory, selectedGenre]);

  const filteredCreators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.bio?.toLowerCase().includes(q)
    );
  }, [creators, searchQuery]);

  const trendingSeries = useMemo(() => {
    return [...UNIQUE_WEBTOONS]
      .sort((a, b) => (b.matchScore || 90) - (a.matchScore || 90))
      .slice(0, 8);
  }, []);

  const saveSearchTerm = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) =>
      [clean, ...prev.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 8)
    );
  };

  const handleOpenSeries = (webtoon: WebtoonItem) => {
    const canonical = resolveWebtoonById(webtoon.id) || webtoon;
    if (searchQuery.trim()) {
      saveSearchTerm(canonical.title);
    }
    if (onOpenWebtoon) {
      onOpenWebtoon(canonical);
    } else {
      setActiveReadingWebtoon({ webtoon: canonical, episode: 1 });
    }
  };

  return (
    <div
      id="ios-search-screen"
      className="w-full min-h-full bg-white dark:bg-black text-black dark:text-white pb-8 select-none"
    >
      {/* Sticky iOS Large Title + Search Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] pt-safe">
        <div className="px-4 pt-2 pb-3 space-y-3">
          {!isSearchFocused && !searchQuery && (
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[34px] font-bold tracking-tight leading-none text-black dark:text-white">
                {t('search', 'Search')}
              </h1>
            </div>
          )}

          <SearchBar
            ref={searchInputRef}
            value={searchQuery}
            onChange={setSearchQuery}
            onFocusChange={setIsSearchFocused}
            onCancel={() => {
              setSearchQuery('');
              setIsSearchFocused(false);
              searchInputRef.current?.blur();
            }}
            showCancelOnFocus
            cancelLabel={t('cancel', 'Cancel')}
            placeholder="Series, creators, genres..."
          />

          {/* iOS Segmented Category Control */}
          <div className="grid grid-cols-4 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E]">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    if (cat.id !== 'genres') setSelectedGenre(null);
                  }}
                  className={`relative py-1.5 text-[13px] font-semibold rounded-lg transition-colors cursor-pointer z-10 ${
                    isActive
                      ? 'text-black dark:text-white'
                      : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="discover-category-pill"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] -z-10"
                    />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Genre Filter Row */}
          {activeCategory === 'genres' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium shrink-0 cursor-pointer transition-colors ${
                  selectedGenre === null
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93]'
                }`}
              >
                All Genres
              </button>
              {availableGenres.map((g) => {
                const isSelected = selectedGenre?.toLowerCase() === g.toLowerCase();
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGenre(isSelected ? null : g)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-medium shrink-0 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6">
        {/* Recent & Suggested Searches */}
        {!searchQuery && activeCategory === 'all' && (
          <div className="space-y-4">
            {recentSearches.length > 0 && (
              <section aria-label="Recent Searches">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[15px] font-semibold text-[#8E8E93]">
                    {t('recent_searches', 'Recent Searches')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setRecentSearches([])}
                    className="text-[14px] font-medium text-[#007AFF] cursor-pointer"
                  >
                    {t('clear_all', 'Clear')}
                  </button>
                </div>

                <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="flex items-center justify-between px-3.5 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setSearchQuery(term)}
                        className="flex-1 flex items-center gap-2.5 text-left text-[16px] text-black dark:text-white cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-[#8E8E93] shrink-0" />
                        <span className="truncate">{term}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${term}`}
                        onClick={() =>
                          setRecentSearches((prev) => prev.filter((item) => item !== term))
                        }
                        className="p-1.5 text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Suggestions */}
            <section aria-label="Suggestions">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-4 h-4 text-[#007AFF]" />
                <h2 className="text-[15px] font-semibold text-[#8E8E93]">Suggested</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      saveSearchTerm(s);
                      setSearchQuery(s);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] text-[14px] font-medium text-black dark:text-white ios-press cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {isFiltering ? (
          <SearchSkeleton />
        ) : (
          <>
            {/* Creators Directory (shown in Creators tab, All tab, or matching Search) */}
            {filteredCreators.length > 0 &&
              (activeCategory === 'creators' ||
                (activeCategory === 'all' && !searchQuery) ||
                Boolean(searchQuery.trim())) && (
                <section aria-label="Creators">
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                      {searchQuery ? `Creators (${filteredCreators.length})` : 'Creators to Subscribe'}
                    </h2>
                    {activeCategory !== 'creators' && creators.length > 3 && !searchQuery && (
                      <button
                        type="button"
                        onClick={() => setActiveCategory('creators')}
                        className="text-[14px] font-medium text-[#007AFF] cursor-pointer"
                      >
                        See All
                      </button>
                    )}
                  </div>

                  <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                    {(activeCategory === 'creators' || searchQuery
                      ? filteredCreators
                      : filteredCreators.slice(0, 4)
                    ).map((creator) => {
                      const isSubscribed = (currentUser?.followingIds || []).includes(creator.id);
                      return (
                        <div
                          key={creator.id}
                          className="flex items-center gap-3 px-3.5 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onOpenUserProfile?.({
                                id: creator.id,
                                name: creator.name,
                                username: creator.username,
                                avatar: creator.avatar,
                                isVerified: creator.isVerified,
                              })
                            }
                            className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <Avatar src={creator.avatar} name={creator.name} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[16px] font-semibold truncate">
                                  {creator.name}
                                </span>
                                {creator.isVerified && <VerifiedBadge size={14} />}
                              </div>
                              <p className="text-[13px] text-[#8E8E93] truncate">
                                @{creator.username} · {creator.followersCount.toLocaleString()} subscribers
                              </p>
                            </div>
                          </button>

                          {onToggleFollow && (
                            <Button
                              variant={isSubscribed ? 'secondary' : 'primary'}
                              size="sm"
                              aria-label={isSubscribed ? `Unsubscribe from ${creator.name}` : `Subscribe to ${creator.name}`}
                              title={isSubscribed ? t('unsubscribe', 'Unsubscribe') : t('subscribe', 'Subscribe')}
                              onClick={() => onToggleFollow(creator.id)}
                              className={isSubscribed ? 'bg-white dark:bg-[#2C2C2E]' : ''}
                            >
                              {isSubscribed ? t('subscribed', 'Subscribed') : t('subscribe', 'Subscribe')}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            {/* Trending List */}
            {!searchQuery && (activeCategory === 'all' || activeCategory === 'trending') && (
              <section aria-label="Top Trending">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                    Top Charts
                  </h2>
                  <span className="text-[13px] font-medium text-[#8E8E93]">Top 8</span>
                </div>

                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {trendingSeries.map((series, idx) => (
                    <button
                      key={series.id}
                      type="button"
                      onClick={() => handleOpenSeries(series)}
                      className="w-full py-2.5 flex items-center gap-3.5 text-left hover:bg-[#F2F2F7]/70 dark:hover:bg-[#1C1C1E]/70 px-1.5 -mx-1.5 rounded-xl transition-colors ios-press cursor-pointer"
                    >
                      <span
                        className={`w-6 text-center text-[17px] font-bold tabular-nums shrink-0 ${
                          idx < 3 ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 border border-black/[0.06] dark:border-white/[0.08]">
                        <SmartImage
                          src={series.coverImage}
                          alt={series.title}
                          aspectClassName="w-full h-full"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-semibold text-black dark:text-white truncate leading-snug">
                          {series.title}
                        </p>
                        <p className="text-[14px] text-[#8E8E93] truncate mt-0.5 tabular-nums">
                          {series.genre} · {series.viewsCount} reads
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-[#C7C7CC] dark:text-[#636366] shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Catalog / Search Results */}
            {activeCategory !== 'creators' && (
              <section aria-label="Results">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                    {searchQuery
                      ? `Series (${filteredWebtoons.length})`
                      : activeCategory === 'genres'
                      ? selectedGenre
                        ? `${selectedGenre} (${filteredWebtoons.length})`
                        : 'Browse Genres'
                      : 'Explore Originals'}
                  </h2>
                  <span className="text-[13px] font-medium text-[#8E8E93] tabular-nums">
                    {filteredWebtoons.length} titles
                  </span>
                </div>

                {filteredWebtoons.length === 0 && filteredCreators.length === 0 ? (
                  <EmptyState
                    icon={<Search className="w-6 h-6" />}
                    title={`No results for "${searchQuery}"`}
                    description="Try searching a different title, creator, or genre."
                    actionLabel="Clear Search"
                    onAction={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                  />
                ) : filteredWebtoons.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                    {filteredWebtoons.map((webtoon) => (
                      <BookCover
                        key={webtoon.id}
                        title={webtoon.title}
                        subtitle={`${webtoon.author} · ★ ${webtoon.rating.toFixed(1)}`}
                        coverImage={webtoon.coverImage}
                        badgeText={webtoon.topBadgeText}
                        onClick={() => handleOpenSeries(webtoon)}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            )}
          </>
        )}
      </div>

      {activeReadingWebtoon && (
        <WebtoonReaderModal
          webtoon={activeReadingWebtoon.webtoon}
          initialEpisodeNumber={activeReadingWebtoon.episode}
          onClose={() => setActiveReadingWebtoon(null)}
          isSubscribed={
            subscribedWebtoons?.[getCanonicalWebtoonId(activeReadingWebtoon.webtoon.id)] ??
            Boolean(activeReadingWebtoon.webtoon.isSubscribed)
          }
          onToggleSubscribe={onToggleSubscribe}
          onSelectTag={(tag) => {
            setActiveReadingWebtoon(null);
            setActiveCategory('all');
            setSelectedGenre(null);
            setSearchQuery(tag);
          }}
        />
      )}
    </div>
  );
};
