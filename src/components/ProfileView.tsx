import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Heart,
  Lock,
  Menu,
  MessageCircle,
  Repeat2,
  ShieldBan,
  Users,
} from 'lucide-react';
import {
  AchievementItem,
  ReadingStoryItem,
  ShortVideo,
  SocialPost,
  Story,
  StoryHighlight,
  User,
} from '../types';
import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_COMPLETED_STORIES,
  INITIAL_CURRENTLY_READING,
  INITIAL_SAVED_STORIES,
} from '../data/achievementsData';
import { INITIAL_CREATORS } from '../data/socialMockData';
import {
  ALL_WEBTOONS,
  WebtoonItem,
  getCanonicalWebtoonId,
  resolveWebtoonById,
} from '../data/webtoonData';
import { formatLocalizedNumber, useLanguage } from '../utils/i18n';
import { getAuthoredWebtoons, resolvePublicUser } from '../utils/profileResolver';
import {
  getLikedWebtoonItems,
  isWebtoonLiked,
  isWebtoonSubscribed,
  loadLikedWebtoons,
} from '../utils/webtoonInteractions';
import { EmojiText } from './AppleEmoji';
import { SettingsView } from './SettingsView';
import {
  BadgesExplanationModal,
  BlueVerifiedBadge,
  TelegramPremiumStar,
} from './Badges';
import { AchievementShowcaseModal } from './AchievementShowcaseModal';
import { ProfilePrivacyModal } from './ProfilePrivacyModal';
import { UserProfileModal } from './UserProfileModal';
import { HighlightEditorModal, StoryArchiveModal } from './StoryHighlightsModal';
import { WebtoonReaderModal, getAllReadingProgress } from './WebtoonReaderModal';
import {
  Avatar,
  BookCover,
  BottomSheet,
  Button,
  EmptyState,
  ProgressBar,
  SmartImage,
  VerifiedBadge,
  useToast,
} from './ui';

export interface ProfileViewProps {
  currentUser: User;
  creators?: User[];
  profileUser?:
    | (Partial<User> & {
        id: string;
        name: string;
        username: string;
        avatar: string;
        isVerified?: boolean;
      })
    | null;
  posts?: SocialPost[];
  reels?: ShortVideo[];
  isFollowing?: boolean;
  onOpenSettings?: () => void;
  onOpenEditProfile?: () => void;
  onReactPost?: (postId: string, reaction: unknown) => void;
  onOpenComments?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
  onToggleRepost?: (postId: string) => void;
  onToggleFollow?: (authorId: string) => void;
  onSendMessage?: (authorId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onOpenReportModal?: (postId: string) => void;
  onUpdateUser?: (updatedFields: Partial<User>) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  onOpenBook?: (bookId: string, initialEpisodeNumber?: number) => void;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  }) => void;
  subscribedWebtoons?: Record<string, boolean>;
  onToggleSubscribe?: (webtoonId: string) => void;
  likedWebtoons?: Record<string, boolean>;
  onToggleLikeWebtoon?: (webtoonId: string) => void;
  highlights?: StoryHighlight[];
  archiveStories?: Story[];
  onOpenHighlight?: (highlight: StoryHighlight) => void;
  onSaveHighlight?: (payload: {
    id?: string;
    title: string;
    coverImage: string;
    storyIds: string[];
  }) => Promise<void> | void;
  onDeleteHighlight?: (highlightId: string) => Promise<void> | void;
  onOpenArchivedStory?: (story: Story) => void;
  isLoadingPosts?: boolean;
  postsError?: string | null;
  isActive?: boolean;
}

function formatRelativePostTime(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  creators = INITIAL_CREATORS,
  profileUser,
  posts = [],
  onOpenSettings,
  onOpenEditProfile,
  onReactPost,
  onOpenComments,
  onToggleSave,
  onToggleRepost,
  onVotePoll,
  onUpdateUser,
  onToggleFollow,
  onSendMessage,
  onBack,
  showBackButton,
  onOpenBook,
  onOpenUserProfile,
  isFollowing,
  subscribedWebtoons,
  onToggleSubscribe,
  likedWebtoons,
  onToggleLikeWebtoon,
  archiveStories = [],
  onSaveHighlight,
  onDeleteHighlight,
  onOpenArchivedStory,
  isLoadingPosts = false,
  postsError = null,
  isActive,
}) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const safePosts = useMemo(() => (Array.isArray(posts) ? posts.filter(Boolean) : []), [posts]);

  const isOtherUser = Boolean(
    profileUser && profileUser.id && profileUser.id !== currentUser.id
  );

  const displayUser: User = useMemo(
    () =>
      isOtherUser
        ? resolvePublicUser({
            userId: profileUser!.id,
            partialUser: profileUser,
            currentUser,
            creators,
            posts: safePosts,
            webtoons: ALL_WEBTOONS,
          })
        : currentUser,
    [isOtherUser, profileUser, currentUser, creators, safePosts]
  );

  const isFollowed = isOtherUser
    ? (currentUser.followingIds || []).includes(displayUser.id) || Boolean(isFollowing)
    : false;
  const isBlocked = isOtherUser && (currentUser.blockedUserIds || []).includes(displayUser.id);
  const isPrivateLocked = isOtherUser && Boolean(displayUser.isPrivate) && !isFollowed;
  const canViewProfileContent = !isOtherUser || (!isBlocked && !isPrivateLocked);
  const canMessage = !isOtherUser || (!isBlocked && displayUser.allowMessagesFrom !== 'nobody');
  const showLikesStat =
    !isOtherUser || (canViewProfileContent && displayUser.isReadingActivityPublic !== false);

  const [activeTab, setActiveTab] = useState<'posts' | 'library' | 'reposts' | 'achievements'>('posts');
  const [libraryTab, setLibraryTab] = useState<'continue' | 'saved' | 'completed' | 'likes' | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showBadgesExplanation, setShowBadgesExplanation] = useState(false);
  const [showHighlightEditor, setShowHighlightEditor] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<StoryHighlight | null>(null);
  const [preselectedArchiveStoryId, setPreselectedArchiveStoryId] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [followSheetMode, setFollowSheetMode] = useState<'followers' | 'following' | null>(
    null
  );
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [activeReadingWebtoon, setActiveReadingWebtoon] = useState<{
    webtoon: WebtoonItem;
    episode: number;
  } | null>(null);
  const [progressTick, setProgressTick] = useState(0);

  const [selectedStatusIcon, setSelectedStatusIcon] = useState<string>(() => {
    const raw = currentUser.premiumStatusIcon;
    if (raw === '⭐️') return 'star';
    if (raw) return raw;
    return currentUser.isPremium ? 'star' : currentUser.isVerified ? 'verified' : 'none';
  });

  const [pinnedAchievementIds, setPinnedAchievementIds] = useState<string[]>(() =>
    isOtherUser
      ? displayUser.showcasedAchievementIds || []
      : currentUser.showcasedAchievementIds || [
          'author',
          'midnight_reader',
          'bookworm',
          'first_chapter',
        ]
  );

  const [achievements] = useState<AchievementItem[]>(INITIAL_ACHIEVEMENTS);
  const [completedStories] = useState<ReadingStoryItem[]>(INITIAL_COMPLETED_STORIES);
  const [savedStories] = useState<ReadingStoryItem[]>(INITIAL_SAVED_STORIES);

  useEffect(() => {
    if (isActive) {
      setProgressTick((prev) => prev + 1);
    }
  }, [isActive]);

  useEffect(() => {
    setActiveTab('posts');
    setLibraryTab(null);
    setSelectedPostId(null);
    setFollowSheetMode(null);
    setPinnedAchievementIds(
      isOtherUser
        ? displayUser.showcasedAchievementIds || []
        : displayUser.showcasedAchievementIds || [
            'author',
            'midnight_reader',
            'bookworm',
            'first_chapter',
          ]
    );
  }, [displayUser.id, isOtherUser]);

  // Merge static currently-reading list with live persisted reader progress (strictly scoped to own profile)
  const currentlyReading = useMemo<ReadingStoryItem[]>(() => {
    if (isOtherUser) return [];
    const progressMap = getAllReadingProgress();
    const baseMap = new Map<string, ReadingStoryItem>();

    INITIAL_CURRENTLY_READING.forEach((item) => {
      const canonicalId = getCanonicalWebtoonId(item.webtoonId);
      const live = progressMap[canonicalId] || progressMap[item.webtoonId];
      baseMap.set(canonicalId, {
        ...item,
        webtoonId: canonicalId,
        currentEpisode: live?.episodeNumber ?? item.currentEpisode,
        lastReadDate: live?.updatedAt ? 'Recently' : item.lastReadDate,
      });
    });

    Object.entries(progressMap).forEach(([webtoonId, prog]) => {
      const canonicalId = getCanonicalWebtoonId(webtoonId);
      const w = resolveWebtoonById(canonicalId);
      if (!w) return;
      const pct = Math.min(
        100,
        Math.round((prog.episodeNumber / Math.max(1, w.totalEpisodes)) * 100)
      );
      const existing = baseMap.get(canonicalId);
      if (existing) {
        if (prog.updatedAt) {
          baseMap.set(canonicalId, {
            ...existing,
            currentEpisode: prog.episodeNumber,
            progressPercentage: pct,
            lastReadDate: 'Recently',
          });
        }
      } else {
        baseMap.set(canonicalId, {
          id: `live-${w.id}`,
          webtoonId: w.id,
          title: w.title,
          author: w.author,
          coverImage: w.coverImage,
          currentEpisode: prog.episodeNumber,
          totalEpisodes: w.totalEpisodes,
          progressPercentage: pct,
          lastReadDate: 'Recently',
          genre: w.genre,
          status: pct >= 100 ? 'completed' : 'currently_reading',
        });
      }
    });

    return Array.from(baseMap.values());
  }, [isOtherUser, progressTick]);

  const userPosts = useMemo(
    () =>
      safePosts
        .filter(
          (p) =>
            p.authorId === displayUser.id ||
            (p.authorUsername &&
              displayUser.username &&
              p.authorUsername.toLowerCase() === displayUser.username.toLowerCase())
        )
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [safePosts, displayUser.id, displayUser.username]
  );

  const repostedPosts = useMemo(
    () =>
      safePosts
        .filter((p) =>
          isOtherUser
            ? Boolean((p.repostedByIds || []).includes(displayUser.id))
            : Boolean(p.isReposted || (p.repostedByIds || []).includes(currentUser.id))
        )
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [safePosts, isOtherUser, displayUser.id, currentUser.id]
  );

  const otherAuthoredSeries = useMemo(
    () => (isOtherUser ? getAuthoredWebtoons(displayUser, ALL_WEBTOONS) : []),
    [isOtherUser, displayUser]
  );

  const isLibraryTabVisible = !isOtherUser
    ? true
    : canViewProfileContent &&
      displayUser.isReadingActivityPublic !== false &&
      otherAuthoredSeries.length > 0;

  const isAchievementsTabVisible = !isOtherUser
    ? true
    : canViewProfileContent && displayUser.isAchievementsPublic !== false;

  useEffect(() => {
    if (activeTab === 'library' && !isLibraryTabVisible) {
      setActiveTab('posts');
    } else if (activeTab === 'achievements' && !isAchievementsTabVisible) {
      setActiveTab('posts');
    }
  }, [activeTab, isLibraryTabVisible, isAchievementsTabVisible]);

  const selectedPost = useMemo(
    () => (selectedPostId ? safePosts.find((p) => p.id === selectedPostId) ?? null : null),
    [safePosts, selectedPostId]
  );

  if (showSettingsPage) {
    return (
      <SettingsView
        currentUser={currentUser}
        onBack={() => setShowSettingsPage(false)}
        onUpdateUser={(updated) => onUpdateUser?.(updated)}
        onOpenEditProfile={onOpenEditProfile}
      />
    );
  }

  const renderBadge = () => {
    if (displayUser.isVerified) {
      return <VerifiedBadge size={17} />;
    }
    if (displayUser.isPremium) {
      return <TelegramPremiumStar size={17} />;
    }
    return null;
  };

  const handleOpenReader = (webtoonId: string, episodeNumber: number = 1) => {
    const canonicalId = getCanonicalWebtoonId(webtoonId);
    if (onOpenBook) {
      onOpenBook(canonicalId, episodeNumber);
      return;
    }
    const found = resolveWebtoonById(canonicalId) || ALL_WEBTOONS[0];
    setActiveReadingWebtoon({ webtoon: found, episode: episodeNumber });
  };

  const continueReadingItems = useMemo(
    () =>
      isOtherUser
        ? []
        : currentlyReading.filter(
            (item) => item.status !== 'completed' && item.progressPercentage < 100
          ),
    [isOtherUser, currentlyReading]
  );

  const completedList = useMemo(() => {
    if (isOtherUser) return [];
    const map = new Map<string, ReadingStoryItem>();
    completedStories.forEach((item) => {
      map.set(getCanonicalWebtoonId(item.webtoonId), item);
    });
    currentlyReading.forEach((item) => {
      if (item.status === 'completed' || item.progressPercentage >= 100) {
        const cid = getCanonicalWebtoonId(item.webtoonId);
        if (!map.has(cid)) {
          map.set(cid, {
            ...item,
            progressPercentage: 100,
            status: 'completed',
          });
        }
      }
    });
    return Array.from(map.values());
  }, [isOtherUser, completedStories, currentlyReading]);

  const savedPostsList = useMemo(
    () => (isOtherUser ? [] : safePosts.filter((p) => Boolean(p.isSaved))),
    [isOtherUser, safePosts]
  );
  const scopedSavedStories = isOtherUser ? [] : savedStories;
  const totalSavedCount = scopedSavedStories.length + savedPostsList.length;

  const totalEpisodesRead = currentUser.storiesReadCount ?? 248;
  const totalSeriesCount = continueReadingItems.length + completedList.length;
  const effectiveLikedWebtoons = useMemo(
    () => (isOtherUser ? {} : likedWebtoons ?? loadLikedWebtoons()),
    [isOtherUser, likedWebtoons, progressTick]
  );
  const likedSeriesItems = useMemo(
    () => (isOtherUser ? [] : getLikedWebtoonItems(effectiveLikedWebtoons)),
    [isOtherUser, effectiveLikedWebtoons]
  );
  const likedPostsList = useMemo(
    () => (isOtherUser ? [] : safePosts.filter((p) => Boolean(p.userReaction))),
    [isOtherUser, safePosts]
  );
  const totalLikesCount = isOtherUser
    ? displayUser.likesCount ?? 0
    : likedSeriesItems.length + likedPostsList.length;

  const earnedAchievements = achievements.filter((a) => a.isUnlocked);
  const publicShowcasedBadges = useMemo(() => {
    if (!isOtherUser) return [];
    const showcasedIds = displayUser.showcasedAchievementIds || [];
    return achievements.filter((a) => showcasedIds.includes(a.id));
  }, [isOtherUser, displayUser.showcasedAchievementIds, achievements]);

  const followingIds = currentUser.followingIds || [];
  const allDirectoryPool = useMemo(
    () => [currentUser, ...creators],
    [currentUser, creators]
  );
  const followListUsers = useMemo(() => {
    if (isOtherUser) {
      if (!canViewProfileContent) return [];
      const targetIds =
        followSheetMode === 'following'
          ? displayUser.followingIds || []
          : displayUser.followersIds || [];
      return allDirectoryPool.filter(
        (c) => targetIds.includes(c.id) && c.id !== displayUser.id
      );
    }
    if (followSheetMode === 'following') {
      return creators.filter((c) => followingIds.includes(c.id));
    }
    return creators.filter((c) => (currentUser.followersIds || []).includes(c.id));
  }, [
    isOtherUser,
    canViewProfileContent,
    followSheetMode,
    displayUser.followingIds,
    displayUser.followersIds,
    displayUser.id,
    allDirectoryPool,
    creators,
    followingIds,
    currentUser.followersIds,
  ]);

  return (
    <div
      id="webtoon-profile-root"
      className="w-full min-h-full bg-white dark:bg-black text-black dark:text-white pb-12 select-none"
    >
      {/* Clean Borderless iOS Top Bar */}
      <header className="sticky top-0 z-30 bg-white/92 dark:bg-black/92 backdrop-blur-2xl pt-safe">
        <div className="h-12 px-4 flex items-center justify-between gap-2">
          {isOtherUser || showBackButton ? (
            <button
              id="profile-top-back-btn"
              type="button"
              onClick={onBack}
              aria-label={t('back', 'Back')}
              className="min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center gap-0.5 text-[#007AFF] hover:opacity-70 transition-opacity cursor-pointer ios-press"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
              <span className="text-[17px]">{t('back', 'Back')}</span>
            </button>
          ) : (
            <h1 className="text-[28px] font-bold tracking-tight leading-none">
              {t('nav_profile', 'Profile')}
            </h1>
          )}

          {isOtherUser && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[17px] font-semibold truncate">
                @{displayUser.username}
              </span>
              {renderBadge()}
            </div>
          )}

          {isOtherUser ? (
            <div className="w-[64px]" aria-hidden="true" />
          ) : (
            <button
              id="profile-top-more-button"
              type="button"
              onClick={() => {
                if (onOpenSettings) onOpenSettings();
                else setShowSettingsPage(true);
              }}
              aria-label={t('settings_title', 'Settings')}
              className="min-w-[44px] min-h-[44px] -mr-2 inline-flex items-center justify-center text-black dark:text-white hover:opacity-65 transition-opacity cursor-pointer ios-press"
            >
              <Menu className="w-[22px] h-[22px] stroke-[1.85]" />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <section className="px-4 pt-5 pb-5 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={displayUser.avatar}
              name={displayUser.name}
              size="xl"
              onClick={isOtherUser ? undefined : onOpenEditProfile}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[24px] sm:text-[26px] font-bold tracking-tight truncate">
                  {displayUser.name}
                </h2>
                {isOtherUser ? (
                  <span className="shrink-0">{renderBadge()}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPremiumModal(true)}
                    className="shrink-0 cursor-pointer"
                    aria-label="Profile badge"
                  >
                    {renderBadge()}
                  </button>
                )}
              </div>
              <p className="text-[15px] text-[#8E8E93] truncate">
                @{displayUser.username}
              </p>

              {/* Clean Tabular Stats Row (Same Layout for Own & Public Profiles) */}
              <div className="flex items-center gap-6 mt-3 tabular-nums">
                <button
                  id="profile-stat-subscribers-btn"
                  type="button"
                  onClick={() => {
                    if (!canViewProfileContent) {
                      showToast(
                        isBlocked ? 'Unblock to view account activity' : 'This account is private',
                        { type: 'info' }
                      );
                      return;
                    }
                    setFollowSheetMode('followers');
                  }}
                  className="text-left cursor-pointer ios-press"
                >
                  <span className="text-[18px] font-semibold block leading-tight">
                    {formatLocalizedNumber(displayUser.followersCount ?? 0, language)}
                  </span>
                  <span className="text-[13px] text-[#8E8E93]">
                    {t('subscribers', 'Subscribers')}
                  </span>
                </button>

                <button
                  id="profile-stat-subscriptions-btn"
                  type="button"
                  onClick={() => {
                    if (!canViewProfileContent) {
                      showToast(
                        isBlocked ? 'Unblock to view account activity' : 'This account is private',
                        { type: 'info' }
                      );
                      return;
                    }
                    setFollowSheetMode('following');
                  }}
                  className="text-left cursor-pointer ios-press"
                >
                  <span className="text-[18px] font-semibold block leading-tight">
                    {formatLocalizedNumber(
                      isOtherUser
                        ? displayUser.followingCount ?? 0
                        : followingIds.length || displayUser.followingCount || 0,
                      language
                    )}
                  </span>
                  <span className="text-[13px] text-[#8E8E93]">
                    {t('subscriptions', 'Subscriptions')}
                  </span>
                </button>

                {showLikesStat && (
                  <button
                    id="profile-stat-likes-btn"
                    type="button"
                    onClick={() => {
                      if (!isOtherUser) {
                        setActiveTab('library');
                        setLibraryTab('likes');
                      }
                    }}
                    className={`text-left ${!isOtherUser ? 'cursor-pointer ios-press' : 'cursor-default'}`}
                  >
                    <span className="text-[18px] font-semibold block leading-tight">
                      {formatLocalizedNumber(totalLikesCount, language)}
                    </span>
                    <span className="text-[13px] text-[#8E8E93]">
                      {t('profile_stat_likes', 'Likes')}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {displayUser.bio && (
            <p className="text-[15px] text-black/85 dark:text-white/85 leading-relaxed">
              <EmojiText text={displayUser.bio} />
            </p>
          )}

          {/* Clean Action Buttons (Text Only) */}
          {isOtherUser ? (
            isBlocked ? (
              <div className="pt-1">
                <Button
                  id="profile-btn-unblock"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    const nextBlocked = (currentUser.blockedUserIds || []).filter(
                      (id) => id !== displayUser.id
                    );
                    onUpdateUser?.({ blockedUserIds: nextBlocked });
                    showToast(`Unblocked ${displayUser.name}`, { type: 'success' });
                  }}
                >
                  {t('unblock', 'Unblock')} @{displayUser.username}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  id="profile-btn-follow"
                  variant={isFollowed ? 'secondary' : 'primary'}
                  size="md"
                  aria-label={
                    isFollowed
                      ? t('unsubscribe', 'Unsubscribe')
                      : t('subscribe', 'Subscribe')
                  }
                  title={
                    isFollowed
                      ? t('unsubscribe', 'Unsubscribe')
                      : t('subscribe', 'Subscribe')
                  }
                  onClick={() => onToggleFollow?.(displayUser.id)}
                >
                  {isFollowed
                    ? t('subscribed', 'Subscribed')
                    : t('subscribe', 'Subscribe')}
                </Button>
                <Button
                  id="profile-btn-message"
                  variant="secondary"
                  size="md"
                  disabled={!canMessage}
                  title={
                    !canMessage
                      ? 'This user does not accept direct messages'
                      : undefined
                  }
                  onClick={() => {
                    if (!canMessage) {
                      showToast('This user has turned off direct messages', { type: 'info' });
                      return;
                    }
                    onSendMessage?.(displayUser.id);
                  }}
                >
                  {canMessage ? t('nav_messages', 'Message') : 'Messages Off'}
                </Button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                id="profile-btn-edit-profile"
                variant="secondary"
                size="md"
                onClick={onOpenEditProfile}
              >
                {t('edit_profile', 'Edit Profile')}
              </Button>
              <Button
                id="profile-btn-premium"
                variant="primary"
                size="md"
                onClick={() => setShowPremiumModal(true)}
              >
                Premium
              </Button>
            </div>
          )}
        </section>

        {/* OTHER USER PROFILE BODY (Reuses Exact Own-Profile Borderless Tab Architecture + Privacy Gates) */}
        {isOtherUser ? (
          isBlocked ? (
            <div id="profile-blocked-notice" className="px-4 pt-6">
              <EmptyState
                icon={<ShieldBan className="w-6 h-6" />}
                title={`@${displayUser.username} is blocked`}
                description="You won't see posts or messages from this account while it's blocked."
              />
            </div>
          ) : isPrivateLocked ? (
            <div id="profile-private-notice" className="px-4 pt-6">
              <EmptyState
                icon={<Lock className="w-6 h-6" />}
                title="This Account is Private"
                description={`Subscribe to @${displayUser.username} to see their posts and public activity.`}
              />
            </div>
          ) : (
            <>
              <div className="px-4 pt-1 pb-2 sticky top-[48px] z-20 bg-white/95 dark:bg-black/95 backdrop-blur-xl">
                <div
                  role="tablist"
                  aria-label="Profile sections"
                  className="flex items-center justify-between gap-3 sm:gap-6 overflow-x-auto no-scrollbar"
                >
                  {(
                    [
                      { id: 'posts' as const, label: t('posts', 'Posts'), visible: true },
                      {
                        id: 'library' as const,
                        label: t('library', 'Library'),
                        visible: isLibraryTabVisible,
                      },
                      { id: 'reposts' as const, label: t('reposts_tab', 'Reposts'), visible: true },
                      {
                        id: 'achievements' as const,
                        label: t('achievements', 'Achievements'),
                        visible: isAchievementsTabVisible,
                      },
                    ] as const
                  )
                    .filter((tab) => tab.visible)
                    .map((tab) => {
                      const tabActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          id={`other-profile-tab-${tab.id}`}
                          type="button"
                          role="tab"
                          aria-selected={tabActive}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative px-0 pt-0 pb-2 text-[15px] sm:text-[16px] font-semibold tracking-tight whitespace-nowrap shrink-0 transition-colors cursor-pointer bg-transparent border-0 ${
                            tabActive
                              ? 'text-black dark:text-white'
                              : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tabActive && (
                            <span
                              aria-hidden="true"
                              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-black dark:bg-white"
                            />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>

              {activeTab === 'posts' ? (
                <div id="profile-posts-section" className="px-4 pt-1">
                  {userPosts.length === 0 ? (
                    <EmptyState
                      icon={<BookOpen className="w-6 h-6" />}
                      title={t('no_posts_yet', 'No posts yet')}
                      description={`Posts shared by ${displayUser.name} will appear here.`}
                    />
                  ) : (
                    <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {userPosts.map((post) => {
                        const isLiked = Boolean(post.userReaction);
                        const mediaList = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
                        return (
                          <article
                            key={post.id}
                            id={`profile-post-item-${post.id}`}
                            onClick={() => setSelectedPostId(post.id)}
                            className="py-4 space-y-2.5 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                src={post.authorAvatar || displayUser.avatar}
                                name={post.authorName || displayUser.name}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <span className="text-[14px] font-semibold text-black dark:text-white truncate">
                                  {post.authorName || displayUser.name}
                                </span>
                                {(post.authorVerified || displayUser.isVerified) && (
                                  <VerifiedBadge size={13} />
                                )}
                                <span className="text-[13px] text-[#8E8E93] truncate">
                                  @{post.authorUsername || displayUser.username}
                                </span>
                                <span className="text-[13px] text-[#8E8E93]">
                                  · {formatRelativePostTime(post.createdAt)}
                                </span>
                              </div>
                            </div>

                            {post.content && (
                              <p className="text-[15px] leading-[1.45] text-black/90 dark:text-white/90 break-words">
                                <EmojiText text={post.content} />
                              </p>
                            )}

                            {mediaList.length > 0 && (
                              <div
                                className={`grid gap-1.5 ${
                                  mediaList.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                                }`}
                              >
                                {mediaList.slice(0, 2).map((url, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                                  >
                                    <SmartImage
                                      src={url}
                                      alt={post.authorName || displayUser.name}
                                      aspectClassName={
                                        mediaList.length > 1
                                          ? 'aspect-square w-full'
                                          : 'aspect-[16/10] w-full'
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {post.linkPreview && (
                              <a
                                href={post.linkPreview.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="block rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] transition-opacity hover:opacity-90"
                              >
                                {post.linkPreview.image && (
                                  <SmartImage
                                    src={post.linkPreview.image}
                                    alt={post.linkPreview.title}
                                    aspectClassName="aspect-[16/9] w-full"
                                  />
                                )}
                                <div className="p-3 space-y-0.5">
                                  <p className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                                    <span>{post.linkPreview.siteName || 'enmmoe'}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </p>
                                  <p className="text-[15px] font-semibold text-black dark:text-white line-clamp-1">
                                    {post.linkPreview.title}
                                  </p>
                                </div>
                              </a>
                            )}

                            {post.poll && (
                              <div className="space-y-1.5 pt-0.5">
                                <p className="text-[14px] font-semibold">{post.poll.question}</p>
                                <div className="space-y-1.5">
                                  {post.poll.options.map((opt) => {
                                    const voted = post.poll?.userVotedOptionId === opt.id;
                                    const pct = post.poll?.totalVotes
                                      ? Math.round((opt.votes / post.poll.totalVotes) * 100)
                                      : 0;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onVotePoll?.(post.id, opt.id);
                                        }}
                                        className={`w-full px-3.5 py-2 rounded-xl text-[14px] font-medium flex items-center justify-between cursor-pointer ios-press ${
                                          voted
                                            ? 'bg-[#007AFF]/12 text-[#007AFF] font-semibold'
                                            : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white'
                                        }`}
                                      >
                                        <span className="truncate">{opt.text}</span>
                                        <span className="tabular-nums text-[#8E8E93] ml-2">
                                          {pct}%
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-0.5 -ml-1.5 text-[13px] text-[#8E8E93]">
                              <div className="flex items-center gap-5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReactPost?.(post.id, 'love');
                                  }}
                                  aria-label="Like post"
                                  className={`min-h-[34px] px-1.5 inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                                    isLiked ? 'text-[#007AFF] font-semibold' : ''
                                  }`}
                                >
                                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                  <span className="tabular-nums">{post.likesCount}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenComments?.(post.id);
                                  }}
                                  aria-label="Comments"
                                  className="min-h-[34px] px-1.5 inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white cursor-pointer ios-press"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span className="tabular-nums">{post.commentsCount}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleRepost?.(post.id);
                                  }}
                                  aria-label="Repost"
                                  className={`min-h-[34px] px-1.5 inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                                    post.isReposted ? 'text-[#007AFF] font-semibold' : ''
                                  }`}
                                >
                                  <Repeat2 className="w-4 h-4" />
                                  <span className="tabular-nums">{post.sharesCount}</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleSave?.(post.id);
                                }}
                                aria-label={post.isSaved ? 'Remove bookmark' : 'Save post'}
                                className={`min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ios-press ${
                                  post.isSaved ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                                }`}
                              >
                                <Bookmark
                                  className={`w-4 h-4 ${post.isSaved ? 'fill-current' : ''}`}
                                />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeTab === 'library' && isLibraryTabVisible ? (
                <div id="profile-library-section" className="px-4 pt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-semibold tracking-tight text-black dark:text-white">
                      Published Series
                    </h3>
                    <span className="text-[13px] font-medium text-[#8E8E93] tabular-nums">
                      {otherAuthoredSeries.length === 1
                        ? '1 series'
                        : `${otherAuthoredSeries.length} series`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3.5 gap-y-5">
                    {otherAuthoredSeries.map((series) => (
                      <BookCover
                        key={series.id}
                        title={series.title}
                        subtitle={`${series.genre} · ${series.totalEpisodes} Eps`}
                        coverImage={series.coverImage}
                        onClick={() => handleOpenReader(series.id, 1)}
                      />
                    ))}
                  </div>
                </div>
              ) : activeTab === 'reposts' ? (
                <div id="profile-reposts-section" className="px-4 pt-1">
                  {repostedPosts.length === 0 ? (
                    <EmptyState
                      icon={<Repeat2 className="w-6 h-6" />}
                      title="No reposts yet"
                      description={`Posts reposted by ${displayUser.name} will appear here.`}
                    />
                  ) : (
                    <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {repostedPosts.map((post) => {
                        const isLiked = Boolean(post.userReaction);
                        const mediaList = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
                        return (
                          <article
                            key={post.id}
                            id={`profile-repost-item-${post.id}`}
                            onClick={() => setSelectedPostId(post.id)}
                            className="py-4 space-y-2.5 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#8E8E93]">
                              <Repeat2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{displayUser.name} reposted</span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenUserProfile?.({
                                    id: post.authorId,
                                    name: post.authorName,
                                    username: post.authorUsername,
                                    avatar: post.authorAvatar,
                                    isVerified: post.authorVerified,
                                  });
                                }}
                                aria-label={post.authorName}
                                className="shrink-0 cursor-pointer bg-transparent border-0 p-0"
                              >
                                <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenUserProfile?.({
                                    id: post.authorId,
                                    name: post.authorName,
                                    username: post.authorUsername,
                                    avatar: post.authorAvatar,
                                    isVerified: post.authorVerified,
                                  });
                                }}
                                className="min-w-0 flex-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left cursor-pointer bg-transparent border-0 p-0"
                              >
                                <span className="text-[14px] font-semibold text-black dark:text-white truncate">
                                  {post.authorName}
                                </span>
                                {post.authorVerified && <VerifiedBadge size={13} />}
                                <span className="text-[13px] text-[#8E8E93] truncate">
                                  @{post.authorUsername}
                                </span>
                                <span className="text-[13px] text-[#8E8E93]">
                                  · {formatRelativePostTime(post.createdAt)}
                                </span>
                              </button>
                            </div>

                            {post.content && (
                              <p className="text-[15px] leading-[1.45] text-black/90 dark:text-white/90 break-words">
                                <EmojiText text={post.content} />
                              </p>
                            )}

                            {mediaList.length > 0 && (
                              <div
                                className={`grid gap-1.5 ${
                                  mediaList.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                                }`}
                              >
                                {mediaList.slice(0, 2).map((url, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                                  >
                                    <SmartImage
                                      src={url}
                                      alt={post.authorName}
                                      aspectClassName={
                                        mediaList.length > 1
                                          ? 'aspect-square w-full'
                                          : 'aspect-[16/10] w-full'
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-0.5 -ml-1.5 text-[13px] text-[#8E8E93]">
                              <div className="flex items-center gap-5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReactPost?.(post.id, 'love');
                                  }}
                                  aria-label="Like post"
                                  className={`min-h-[34px] px-1.5 inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                                    isLiked ? 'text-[#007AFF] font-semibold' : ''
                                  }`}
                                >
                                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                  <span className="tabular-nums">{post.likesCount}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenComments?.(post.id);
                                  }}
                                  aria-label="Comments"
                                  className="min-h-[34px] px-1.5 inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white cursor-pointer ios-press"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span className="tabular-nums">{post.commentsCount}</span>
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Public Achievements Tab (Scoped Strictly to Target User) */
                <div id="profile-achievements-section" className="px-4 pt-3 space-y-5">
                  {publicShowcasedBadges.length === 0 && !displayUser.achievementsCount ? (
                    <EmptyState
                      icon={<BookOpen className="w-6 h-6" />}
                      title="No public achievements yet"
                      description={`Badges showcased by ${displayUser.name} will appear here.`}
                    />
                  ) : (
                    <>
                      {typeof displayUser.achievementsCount === 'number' &&
                        displayUser.achievementsCount > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                              <h3 className="text-[18px] font-semibold">Progress</h3>
                              <span className="text-[14px] font-semibold text-[#007AFF] tabular-nums">
                                {displayUser.achievementsCount} unlocked
                              </span>
                            </div>
                            <ProgressBar
                              value={displayUser.achievementsCount}
                              max={57}
                              heightClass="h-1.5"
                            />
                          </div>
                        )}

                      {publicShowcasedBadges.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-[18px] font-semibold">Showcased Badges</h3>
                          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                            {publicShowcasedBadges.map((ach) => (
                              <div key={ach.id} className="py-3 flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] overflow-hidden shrink-0 flex items-center justify-center p-1.5">
                                  {ach.imageUrl ? (
                                    <SmartImage
                                      src={ach.imageUrl}
                                      alt={ach.name}
                                      aspectClassName="w-full h-full"
                                      className="object-contain"
                                    />
                                  ) : (
                                    <span className="text-xl">{ach.icon}</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[15px] font-semibold truncate text-black dark:text-white">
                                    {ach.name}
                                  </p>
                                  <p className="text-[13px] text-[#8E8E93] truncate">
                                    {ach.shortDescription}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {displayUser.joinDate && (
                        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-[15px]">
                          <div className="py-3 flex items-center justify-between">
                            <span className="text-[#8E8E93]">Joined</span>
                            <span className="font-medium">{displayUser.joinDate}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )
        ) : (
          /* OWN PROFILE BODY (Clean 4-Section Unboxed Navigation: Posts · Library · Reposts · Achievements) */
          <>
            <div className="px-4 pt-1 pb-2 sticky top-[48px] z-20 bg-white/95 dark:bg-black/95 backdrop-blur-xl">
              <div
                role="tablist"
                aria-label="Profile sections"
                className="flex items-center justify-between gap-3 sm:gap-6 overflow-x-auto no-scrollbar"
              >
                {(
                  [
                    { id: 'posts', label: t('posts', 'Posts') },
                    { id: 'library', label: t('library', 'Library') },
                    { id: 'reposts', label: t('reposts_tab', 'Reposts') },
                    { id: 'achievements', label: t('achievements', 'Achievements') },
                  ] as const
                ).map((tab) => {
                  const tabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`profile-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={tabActive}
                      onClick={() => {
                        if (tab.id === 'library' && activeTab === 'library') {
                          setLibraryTab(null);
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      className={`relative px-0 pt-0 pb-2 text-[15px] sm:text-[16px] font-semibold tracking-tight whitespace-nowrap shrink-0 transition-colors cursor-pointer bg-transparent border-0 ${
                        tabActive
                          ? 'text-black dark:text-white'
                          : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tabActive && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-black dark:bg-white"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === 'posts' ? (
              <div id="profile-posts-section" className="px-4 pt-1">
                {isLoadingPosts ? (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="py-4 space-y-3 animate-pulse">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                          <div className="h-3.5 w-32 rounded bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                        </div>
                        <div className="h-4 w-4/5 rounded bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                        <div className="h-4 w-2/3 rounded bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                      </div>
                    ))}
                  </div>
                ) : postsError ? (
                  <EmptyState
                    icon={<AlertCircle className="w-6 h-6" />}
                    title="Unable to load posts"
                    description={postsError}
                  />
                ) : userPosts.length === 0 ? (
                  <EmptyState
                    icon={<BookOpen className="w-6 h-6" />}
                    title={t('no_posts_yet', 'No posts yet')}
                    description="Posts you publish will appear here."
                  />
                ) : (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {userPosts.map((post) => {
                      const isLiked = Boolean(post.userReaction);
                      const mediaList = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
                      return (
                        <article
                          key={post.id}
                          id={`profile-post-item-${post.id}`}
                          onClick={() => setSelectedPostId(post.id)}
                          className="py-4 space-y-2.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={post.authorAvatar || displayUser.avatar}
                              name={post.authorName || displayUser.name}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="text-[14px] font-semibold text-black dark:text-white truncate">
                                {post.authorName || displayUser.name}
                              </span>
                              {(post.authorVerified || displayUser.isVerified) && (
                                <VerifiedBadge size={13} />
                              )}
                              <span className="text-[13px] text-[#8E8E93] truncate">
                                @{post.authorUsername || displayUser.username}
                              </span>
                              <span className="text-[13px] text-[#8E8E93]">
                                · {formatRelativePostTime(post.createdAt)}
                              </span>
                            </div>
                          </div>

                          {post.content && (
                            <p className="text-[15px] leading-[1.45] text-black/90 dark:text-white/90 break-words">
                              <EmojiText text={post.content} />
                            </p>
                          )}

                          {mediaList.length > 0 && (
                            <div
                              className={`grid gap-1.5 ${
                                mediaList.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                              }`}
                            >
                              {mediaList.slice(0, 2).map((url, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                                >
                                  <SmartImage
                                    src={url}
                                    alt={post.authorName || displayUser.name}
                                    aspectClassName={
                                      mediaList.length > 1
                                        ? 'aspect-square w-full'
                                        : 'aspect-[16/10] w-full'
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {post.linkPreview && (
                            <a
                              href={post.linkPreview.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="block rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] transition-opacity hover:opacity-90"
                            >
                              {post.linkPreview.image && (
                                <SmartImage
                                  src={post.linkPreview.image}
                                  alt={post.linkPreview.title}
                                  aspectClassName="aspect-[16/9] w-full"
                                />
                              )}
                              <div className="p-3 space-y-0.5">
                                <p className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                                  <span>{post.linkPreview.siteName || 'enmmoe'}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </p>
                                <p className="text-[15px] font-semibold text-black dark:text-white line-clamp-1">
                                  {post.linkPreview.title}
                                </p>
                              </div>
                            </a>
                          )}

                          {post.poll && (
                            <div className="space-y-1.5 pt-0.5">
                              <p className="text-[14px] font-semibold">{post.poll.question}</p>
                              <div className="space-y-1.5">
                                {post.poll.options.map((opt) => {
                                  const voted = post.poll?.userVotedOptionId === opt.id;
                                  const pct = post.poll?.totalVotes
                                    ? Math.round((opt.votes / post.poll.totalVotes) * 100)
                                    : 0;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onVotePoll?.(post.id, opt.id);
                                      }}
                                      className={`w-full px-3.5 py-2 rounded-xl text-[14px] font-medium flex items-center justify-between cursor-pointer ios-press ${
                                        voted
                                          ? 'bg-[#007AFF]/12 text-[#007AFF] font-semibold'
                                          : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white'
                                      }`}
                                    >
                                      <span className="truncate">{opt.text}</span>
                                      <span className="tabular-nums text-[#8E8E93] ml-2">
                                        {pct}%
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-0.5 -ml-1.5 text-[13px] text-[#8E8E93]">
                            <div className="flex items-center gap-5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReactPost?.(post.id, 'love');
                                }}
                                aria-label="Like post"
                                className={`min-h-[34px] px-1.5 inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                                  isLiked ? 'text-[#007AFF] font-semibold' : ''
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                <span className="tabular-nums">{post.likesCount}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenComments?.(post.id);
                                }}
                                aria-label="Comments"
                                className="min-h-[34px] px-1.5 inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white cursor-pointer ios-press"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span className="tabular-nums">{post.commentsCount}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleRepost?.(post.id);
                                }}
                                aria-label="Repost"
                                className={`min-h-[34px] px-1.5 inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                                  post.isReposted ? 'text-[#007AFF] font-semibold' : ''
                                }`}
                              >
                                <Repeat2 className="w-4 h-4" />
                                <span className="tabular-nums">{post.sharesCount}</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave?.(post.id);
                              }}
                              aria-label={post.isSaved ? 'Remove bookmark' : 'Save post'}
                              className={`min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ios-press ${
                                post.isSaved ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                              }`}
                            >
                              <Bookmark
                                className={`w-4 h-4 ${post.isSaved ? 'fill-current' : ''}`}
                              />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'library' ? (
              <div id="profile-library-section" className="px-4 pt-2">
                {libraryTab === null ? (
                  /* YouTube Library-Inspired Collections List */
                  <div id="profile-library-collections" className="space-y-4">
                    {(
                      [
                        {
                          id: 'continue' as const,
                          title: t('continue_reading', 'Continue Reading'),
                          count: continueReadingItems.length,
                          countLabel:
                            continueReadingItems.length === 1
                              ? '1 series'
                              : `${continueReadingItems.length} series`,
                          thumbnail: continueReadingItems[0]?.coverImage || '',
                          icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
                          emptyIcon: <Clock className="w-6 h-6" aria-hidden="true" />,
                        },
                        {
                          id: 'saved' as const,
                          title: 'Favourite',
                          count: totalSavedCount,
                          countLabel:
                            totalSavedCount === 1 ? '1 item' : `${totalSavedCount} items`,
                          thumbnail:
                            savedStories[0]?.coverImage ||
                            savedPostsList.find((p) => p.mediaUrls?.length)?.mediaUrls?.[0] ||
                            '',
                          icon: <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />,
                          emptyIcon: <Bookmark className="w-6 h-6" aria-hidden="true" />,
                        },
                        {
                          id: 'completed' as const,
                          title: t('completed', 'Completed'),
                          count: completedList.length,
                          countLabel:
                            completedList.length === 1
                              ? '1 series'
                              : `${completedList.length} series`,
                          thumbnail: completedList[0]?.coverImage || '',
                          icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
                          emptyIcon: <CheckCircle2 className="w-6 h-6" aria-hidden="true" />,
                        },
                        {
                          id: 'likes' as const,
                          title: 'Liked',
                          count: totalLikesCount,
                          countLabel:
                            totalLikesCount === 1 ? '1 item' : `${totalLikesCount} items`,
                          thumbnail:
                            likedSeriesItems[0]?.coverImage ||
                            likedPostsList.find((p) => p.mediaUrls?.length)?.mediaUrls?.[0] ||
                            '',
                          icon: <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />,
                          emptyIcon: <Heart className="w-6 h-6" aria-hidden="true" />,
                        },
                      ] as const
                    ).map((collection) => (
                      <button
                        key={collection.id}
                        id={`profile-library-tab-${collection.id}`}
                        type="button"
                        onClick={() => setLibraryTab(collection.id)}
                        className="w-full flex items-center gap-4 text-left cursor-pointer ios-press bg-transparent border-0 p-0 group"
                      >
                        <div className="w-[116px] sm:w-[128px] shrink-0">
                          <div
                            aria-hidden="true"
                            className="mx-3 h-[3px] rounded-t-full bg-black/[0.12] dark:bg-white/[0.18] mb-[2px]"
                          />
                          <div className="relative aspect-[16/10] w-full rounded-[12px] overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E]">
                            {collection.thumbnail ? (
                              <>
                                <SmartImage
                                  src={collection.thumbnail}
                                  alt={collection.title}
                                  aspectClassName="w-full h-full"
                                  className="object-cover object-[center_18%]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
                                <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/65 backdrop-blur-sm text-white flex items-center justify-center">
                                  {collection.icon}
                                </span>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#8E8E93]">
                                {collection.emptyIcon}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[17px] font-semibold tracking-tight text-black dark:text-white leading-snug truncate">
                            {collection.title}
                          </h3>
                          <p className="text-[13px] text-[#8E8E93] mt-0.5 truncate tabular-nums">
                            {collection.countLabel}
                          </p>
                        </div>

                        <ChevronRight
                          className="w-[18px] h-[18px] text-[#C7C7CC] dark:text-[#48484A] shrink-0"
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Selected Collection Detail View */
                  <div id={`profile-library-collection-${libraryTab}`} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        id="profile-library-back-btn"
                        type="button"
                        onClick={() => setLibraryTab(null)}
                        className="inline-flex items-center gap-0.5 -ml-1.5 text-[15px] font-medium text-[#007AFF] hover:opacity-75 transition-opacity cursor-pointer ios-press bg-transparent border-0 p-0"
                      >
                        <ChevronLeft className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
                        <span>{t('library', 'Library')}</span>
                      </button>

                      <span className="text-[13px] font-medium text-[#8E8E93] tabular-nums">
                        {libraryTab === 'continue'
                          ? continueReadingItems.length === 1
                            ? '1 series'
                            : `${continueReadingItems.length} series`
                          : libraryTab === 'saved'
                          ? totalSavedCount === 1
                            ? '1 item'
                            : `${totalSavedCount} items`
                          : libraryTab === 'completed'
                          ? completedList.length === 1
                            ? '1 series'
                            : `${completedList.length} series`
                          : totalLikesCount === 1
                          ? '1 item'
                          : `${totalLikesCount} items`}
                      </span>
                    </div>

                    <h3 className="text-[20px] font-bold tracking-tight text-black dark:text-white">
                      {libraryTab === 'continue'
                        ? t('continue_reading', 'Continue Reading')
                        : libraryTab === 'saved'
                        ? 'Favourite'
                        : libraryTab === 'completed'
                        ? t('completed', 'Completed')
                        : 'Liked'}
                    </h3>

                    {libraryTab === 'continue' ? (
                      continueReadingItems.length === 0 ? (
                        <EmptyState
                          icon={<Clock className="w-6 h-6" />}
                          title="No series in progress"
                          description="Series you start reading will appear here."
                        />
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3.5 gap-y-5">
                          {continueReadingItems.map((item) => {
                            const pct = Math.min(
                              99,
                              Math.max(
                                1,
                                Math.round(
                                  (item.currentEpisode / Math.max(1, item.totalEpisodes)) * 100
                                )
                              )
                            );
                            return (
                              <BookCover
                                key={item.id}
                                title={item.title}
                                subtitle={`Ep. ${item.currentEpisode} / ${item.totalEpisodes}`}
                                coverImage={item.coverImage}
                                progressPercent={pct}
                                onClick={() =>
                                  handleOpenReader(item.webtoonId, item.currentEpisode)
                                }
                              />
                            );
                          })}
                        </div>
                      )
                    ) : libraryTab === 'saved' ? (
                      savedStories.length === 0 && savedPostsList.length === 0 ? (
                        <EmptyState
                          icon={<Bookmark className="w-6 h-6" />}
                          title="Nothing saved yet"
                          description="Series and posts you save will appear here."
                        />
                      ) : (
                        <div id="profile-saved-list" className="space-y-6">
                          {savedStories.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3.5 gap-y-5">
                              {savedStories.map((item) => (
                                <BookCover
                                  key={item.id}
                                  title={item.title}
                                  subtitle={`${item.genre} · ${item.totalEpisodes} Eps`}
                                  coverImage={item.coverImage}
                                  onClick={() => handleOpenReader(item.webtoonId, 1)}
                                />
                              ))}
                            </div>
                          )}

                          {savedPostsList.length > 0 && (
                            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                              {savedPostsList.map((post) => (
                                <article
                                  key={post.id}
                                  onClick={() => setSelectedPostId(post.id)}
                                  className="py-3.5 space-y-2 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[14px] font-semibold text-black dark:text-white truncate">
                                      {post.authorName}
                                      <span className="text-[#8E8E93] font-normal ml-1.5">
                                        @{post.authorUsername}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleSave?.(post.id);
                                      }}
                                      aria-label="Remove bookmark"
                                      className="inline-flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold cursor-pointer ios-press bg-transparent border-0 p-0"
                                    >
                                      <Bookmark className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                  </div>
                                  {post.content && (
                                    <p className="text-[14px] leading-snug text-black/85 dark:text-white/85 line-clamp-2">
                                      <EmojiText text={post.content} />
                                    </p>
                                  )}
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    ) : libraryTab === 'completed' ? (
                      completedList.length === 0 ? (
                        <EmptyState
                          icon={<CheckCircle2 className="w-6 h-6" />}
                          title="No completed series yet"
                          description="Series you finish reading will appear here."
                        />
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3.5 gap-y-5">
                          {completedList.map((item) => (
                            <BookCover
                              key={item.id}
                              title={item.title}
                              subtitle="Completed"
                              coverImage={item.coverImage}
                              progressPercent={100}
                              onClick={() => handleOpenReader(item.webtoonId, 1)}
                            />
                          ))}
                        </div>
                      )
                    ) : likedSeriesItems.length === 0 && likedPostsList.length === 0 ? (
                      <EmptyState
                        icon={<Heart className="w-6 h-6" />}
                        title="No likes yet"
                        description="Series and posts you like will appear here."
                      />
                    ) : (
                      <div id="profile-likes-list" className="space-y-6">
                        {likedSeriesItems.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3.5 gap-y-5">
                            {likedSeriesItems.map((series) => (
                              <BookCover
                                key={series.id}
                                title={series.title}
                                subtitle={`${series.genre} · ${series.totalEpisodes} Eps`}
                                coverImage={series.coverImage}
                                onClick={() => handleOpenReader(series.id, 1)}
                              />
                            ))}
                          </div>
                        )}

                        {likedPostsList.length > 0 && (
                          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                            {likedPostsList.map((post) => (
                              <article
                                key={post.id}
                                onClick={() => setSelectedPostId(post.id)}
                                className="py-3.5 space-y-2 cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[14px] font-semibold text-black dark:text-white truncate">
                                    {post.authorName}
                                    <span className="text-[#8E8E93] font-normal ml-1.5">
                                      @{post.authorUsername}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReactPost?.(post.id, post.userReaction || 'love');
                                    }}
                                    aria-label="Remove like"
                                    className="inline-flex items-center gap-1 text-[13px] text-[#FF3B30] font-semibold cursor-pointer ios-press bg-transparent border-0 p-0"
                                  >
                                    <Heart className="w-3.5 h-3.5 fill-current" />
                                    <span className="tabular-nums">{post.likesCount}</span>
                                  </button>
                                </div>
                                {post.content && (
                                  <p className="text-[14px] leading-snug text-black/85 dark:text-white/85 line-clamp-2">
                                    <EmojiText text={post.content} />
                                  </p>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : activeTab === 'reposts' ? (
              <div id="profile-reposts-section" className="px-4 pt-1">
                {isLoadingPosts ? (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {[0, 1].map((idx) => (
                      <div key={idx} className="py-4 space-y-3 animate-pulse">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                          <div className="h-3.5 w-32 rounded bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                        </div>
                        <div className="h-4 w-4/5 rounded bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                      </div>
                    ))}
                  </div>
                ) : postsError ? (
                  <EmptyState
                    icon={<AlertCircle className="w-6 h-6" />}
                    title="Unable to load reposts"
                    description={postsError}
                  />
                ) : repostedPosts.length === 0 ? (
                  <EmptyState
                    icon={<Repeat2 className="w-6 h-6" />}
                    title="No reposts yet"
                    description="Posts you repost from the feed will appear here."
                  />
                ) : (
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {repostedPosts.map((post) => {
                      const isLiked = Boolean(post.userReaction);
                      const mediaList = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
                      return (
                        <article
                          key={post.id}
                          id={`profile-repost-item-${post.id}`}
                          onClick={() => setSelectedPostId(post.id)}
                          className="py-4 space-y-2.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#8E8E93]">
                            <Repeat2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>You reposted</span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenUserProfile?.({
                                  id: post.authorId,
                                  name: post.authorName,
                                  username: post.authorUsername,
                                  avatar: post.authorAvatar,
                                  isVerified: post.authorVerified,
                                });
                              }}
                              aria-label={post.authorName}
                              className="shrink-0 cursor-pointer bg-transparent border-0 p-0"
                            >
                              <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenUserProfile?.({
                                  id: post.authorId,
                                  name: post.authorName,
                                  username: post.authorUsername,
                                  avatar: post.authorAvatar,
                                  isVerified: post.authorVerified,
                                });
                              }}
                              className="min-w-0 flex-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left cursor-pointer bg-transparent border-0 p-0"
                            >
                              <span className="text-[14px] font-semibold text-black dark:text-white truncate">
                                {post.authorName}
                              </span>
                              {post.authorVerified && <VerifiedBadge size={13} />}
                              <span className="text-[13px] text-[#8E8E93] truncate">
                                @{post.authorUsername}
                              </span>
                              <span className="text-[13px] text-[#8E8E93]">
                                · {formatRelativePostTime(post.createdAt)}
                              </span>
                            </button>
                          </div>

                          {post.content && (
                            <p className="text-[15px] leading-[1.45] text-black/90 dark:text-white/90 break-words">
                              <EmojiText text={post.content} />
                            </p>
                          )}

                          {mediaList.length > 0 && (
                            <div
                              className={`grid gap-1.5 ${
                                mediaList.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                              }`}
                            >
                              {mediaList.slice(0, 2).map((url, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                                >
                                  <SmartImage
                                    src={url}
                                    alt={post.authorName}
                                    aspectClassName={
                                      mediaList.length > 1
                                        ? 'aspect-square w-full'
                                        : 'aspect-[16/10] w-full'
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {post.linkPreview && (
                            <a
                              href={post.linkPreview.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="block rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] transition-opacity hover:opacity-90"
                            >
                              {post.linkPreview.image && (
                                <SmartImage
                                  src={post.linkPreview.image}
                                  alt={post.linkPreview.title}
                                  aspectClassName="aspect-[16/9] w-full"
                                />
                              )}
                              <div className="p-3 space-y-0.5">
                                <p className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                                  <span>{post.linkPreview.siteName || 'enmmoe'}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </p>
                                <p className="text-[15px] font-semibold text-black dark:text-white line-clamp-1">
                                  {post.linkPreview.title}
                                </p>
                              </div>
                            </a>
                          )}

                          {post.poll && (
                            <div className="space-y-1.5 pt-0.5">
                              <p className="text-[14px] font-semibold">{post.poll.question}</p>
                              <div className="space-y-1.5">
                                {post.poll.options.map((opt) => {
                                  const voted = post.poll?.userVotedOptionId === opt.id;
                                  const pct = post.poll?.totalVotes
                                    ? Math.round((opt.votes / post.poll.totalVotes) * 100)
                                    : 0;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onVotePoll?.(post.id, opt.id);
                                      }}
                                      className={`w-full px-3.5 py-2 rounded-xl text-[14px] font-medium flex items-center justify-between cursor-pointer ios-press ${
                                        voted
                                          ? 'bg-[#007AFF]/12 text-[#007AFF] font-semibold'
                                          : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white'
                                      }`}
                                    >
                                      <span className="truncate">{opt.text}</span>
                                      <span className="tabular-nums text-[#8E8E93] ml-2">
                                        {pct}%
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-0.5 -ml-1.5 text-[13px] text-[#8E8E93]">
                            <div className="flex items-center gap-5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReactPost?.(post.id, 'love');
                                }}
                                aria-label="Like post"
                                className={`min-h-[34px] px-1.5 inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                                  isLiked ? 'text-[#007AFF] font-semibold' : ''
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                <span className="tabular-nums">{post.likesCount}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenComments?.(post.id);
                                }}
                                aria-label="Comments"
                                className="min-h-[34px] px-1.5 inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white cursor-pointer ios-press"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span className="tabular-nums">{post.commentsCount}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleRepost?.(post.id);
                                }}
                                aria-label="Remove repost"
                                className="min-h-[34px] px-1.5 inline-flex items-center gap-1.5 text-[#007AFF] font-semibold cursor-pointer ios-press"
                              >
                                <Repeat2 className="w-4 h-4" />
                                <span className="tabular-nums">{post.sharesCount}</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave?.(post.id);
                              }}
                              aria-label={post.isSaved ? 'Remove bookmark' : 'Save post'}
                              className={`min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer ios-press ${
                                post.isSaved ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                              }`}
                            >
                              <Bookmark
                                className={`w-4 h-4 ${post.isSaved ? 'fill-current' : ''}`}
                              />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Calm Achievements Redesign (No Nested Boxes) */
              <div className="px-4 pt-3 space-y-6">
                {/* Clean Overall Progress */}
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[18px] font-semibold">Progress</h3>
                    <span className="text-[14px] font-semibold text-[#007AFF] tabular-nums">
                      {earnedAchievements.length} / 57 unlocked
                    </span>
                  </div>
                  <ProgressBar value={earnedAchievements.length} max={57} heightClass="h-1.5" />

                  <div className="grid grid-cols-3 gap-4 pt-2 tabular-nums">
                    <div>
                      <p className="text-[20px] font-bold text-black dark:text-white">
                        {totalSeriesCount}
                      </p>
                      <p className="text-[12px] text-[#8E8E93]">Series</p>
                    </div>
                    <div>
                      <p className="text-[20px] font-bold text-black dark:text-white">
                        {formatLocalizedNumber(totalEpisodesRead, language)}
                      </p>
                      <p className="text-[12px] text-[#8E8E93]">{t('episodes', 'Episodes')}</p>
                    </div>
                    <div>
                      <p className="text-[20px] font-bold text-[#007AFF]">18d</p>
                      <p className="text-[12px] text-[#8E8E93]">Streak</p>
                    </div>
                  </div>
                </div>

                {/* Clean Achievements Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[18px] font-semibold">Badges</h3>
                      <p className="text-[13px] text-[#8E8E93]">
                        {pinnedAchievementIds.length} pinned to showcase
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAchievementsModal(true)}
                      className="text-[15px] font-medium text-[#007AFF] cursor-pointer ios-press"
                    >
                      See All
                    </button>
                  </div>

                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                    {achievements.slice(0, 6).map((ach) => {
                      const isPinned = pinnedAchievementIds.includes(ach.id);
                      return (
                        <button
                          key={ach.id}
                          type="button"
                          onClick={() => setShowAchievementsModal(true)}
                          className={`w-full py-3 flex items-center justify-between gap-3.5 text-left cursor-pointer ios-press ${
                            !ach.isUnlocked ? 'opacity-65' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] overflow-hidden shrink-0 flex items-center justify-center p-1.5">
                              {ach.imageUrl && (
                                <SmartImage
                                  src={ach.imageUrl}
                                  alt={ach.name}
                                  aspectClassName="w-full h-full"
                                  className={`object-contain ${
                                    !ach.isUnlocked ? 'grayscale opacity-55' : ''
                                  }`}
                                />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] font-semibold truncate text-black dark:text-white">
                                {ach.name}
                              </p>
                              <p className="text-[13px] text-[#8E8E93] truncate">
                                {ach.shortDescription}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[13px] font-medium shrink-0 ${
                              isPinned
                                ? 'text-[#007AFF]'
                                : 'text-[#8E8E93] inline-flex items-center gap-1'
                            }`}
                          >
                            {ach.isUnlocked ? (
                              isPinned ? 'Pinned' : 'Unlocked'
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Locked</span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quiet Account Summary */}
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] text-[15px]">
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#8E8E93]">Top Genres</span>
                    <span className="font-medium text-right">Fantasy · Sci-Fi · Action</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#8E8E93]">Reading Time</span>
                    <span className="font-medium tabular-nums">42h 15m</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#8E8E93]">Joined</span>
                    <span className="font-medium">{displayUser.joinDate || 'March 2024'}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals & Sheets */}
      <AchievementShowcaseModal
        isOpen={showAchievementsModal}
        achievements={achievements}
        pinnedAchievementIds={pinnedAchievementIds}
        onTogglePinAchievement={(id) => {
          setPinnedAchievementIds((prev) => {
            const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id].slice(-4);
            onUpdateUser?.({ showcasedAchievementIds: next });
            return next;
          });
        }}
        onClose={() => setShowAchievementsModal(false)}
      />

      <ProfilePrivacyModal
        isOpen={showPrivacyModal}
        currentUser={currentUser}
        onUpdatePrivacy={(settings) => onUpdateUser?.(settings)}
        onClose={() => setShowPrivacyModal(false)}
      />

      <HighlightEditorModal
        isOpen={showHighlightEditor}
        onClose={() => {
          setShowHighlightEditor(false);
          setEditingHighlight(null);
          setPreselectedArchiveStoryId(null);
        }}
        editingHighlight={editingHighlight}
        availableStories={archiveStories}
        preselectedStoryId={preselectedArchiveStoryId}
        onSave={async (payload) => {
          await onSaveHighlight?.(payload);
        }}
        onDelete={onDeleteHighlight}
      />

      <StoryArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        currentUser={currentUser}
        creators={creators}
        archiveStories={archiveStories}
        onOpenStory={(st) => {
          setShowArchiveModal(false);
          onOpenArchivedStory?.(st);
        }}
        onCreateHighlightFromStory={(st) => {
          setShowArchiveModal(false);
          setEditingHighlight(null);
          setPreselectedArchiveStoryId(st.id);
          setShowHighlightEditor(true);
        }}
        onUpdateCloseFriends={(closeFriendIds) => onUpdateUser?.({ closeFriendIds })}
      />

      <BadgesExplanationModal
        isOpen={showBadgesExplanation}
        onClose={() => setShowBadgesExplanation(false)}
      />

      {/* Subscribers / Subscriptions Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(followSheetMode)}
        onClose={() => setFollowSheetMode(null)}
        title={
          followSheetMode === 'following'
            ? t('subscriptions', 'Subscriptions')
            : t('subscribers', 'Subscribers')
        }
      >
        <div className="px-4 py-2 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {followListUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title={
                followSheetMode === 'following' ? 'No subscriptions yet' : 'No subscribers yet'
              }
              description={
                isOtherUser
                  ? followSheetMode === 'following'
                    ? `${displayUser.name} isn't subscribed to anyone publicly.`
                    : `No public subscribers listed for ${displayUser.name}.`
                  : 'Discover creators in Search to build your subscriptions.'
              }
            />
          ) : (
            followListUsers.map((creator) => {
              const followed = followingIds.includes(creator.id);
              const isSelfRow = creator.id === currentUser.id;
              return (
                <div
                  key={creator.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFollowSheetMode(null);
                      if (onOpenUserProfile) {
                        onOpenUserProfile(creator);
                      } else {
                        setInspectUser(creator);
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <Avatar src={creator.avatar} name={creator.name} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[15px] font-semibold truncate">
                          {creator.name}
                        </span>
                        {creator.isVerified && <VerifiedBadge size={14} />}
                      </div>
                      <p className="text-[13px] text-[#8E8E93] truncate">
                        @{creator.username}
                      </p>
                    </div>
                  </button>

                  {onToggleFollow && !isSelfRow && (
                    <Button
                      variant={followed ? 'secondary' : 'primary'}
                      size="sm"
                      aria-label={
                        followed
                          ? `Unsubscribe from ${creator.name}`
                          : `Subscribe to ${creator.name}`
                      }
                      title={
                        followed
                          ? t('unsubscribe', 'Unsubscribe')
                          : t('subscribe', 'Subscribe')
                      }
                      onClick={() => onToggleFollow(creator.id)}
                    >
                      {followed
                        ? t('subscribed', 'Subscribed')
                        : t('subscribe', 'Subscribe')}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </BottomSheet>

      <AnimatePresence>
        {inspectUser && (
          <UserProfileModal
            isOpen={!!inspectUser}
            user={inspectUser}
            currentUser={currentUser}
            creators={creators}
            posts={safePosts}
            isFollowing={(currentUser.followingIds || []).includes(inspectUser.id)}
            onToggleFollow={(id) => onToggleFollow?.(id)}
            onSendMessage={(targetId) => {
              setInspectUser(null);
              onSendMessage?.(targetId);
            }}
            onOpenEditProfile={onOpenEditProfile}
            onOpenBadgeInfo={() => setShowBadgesExplanation(true)}
            onOpenUserProfile={onOpenUserProfile}
            onOpenStoryReader={(bookId, ep) => {
              setInspectUser(null);
              handleOpenReader(bookId, ep);
            }}
            onClose={() => setInspectUser(null)}
          />
        )}
      </AnimatePresence>

      {activeReadingWebtoon && (
        <WebtoonReaderModal
          webtoon={activeReadingWebtoon.webtoon}
          initialEpisodeNumber={activeReadingWebtoon.episode}
          onClose={() => {
            setActiveReadingWebtoon(null);
            setProgressTick((prev) => prev + 1);
          }}
          isSubscribed={isWebtoonSubscribed(
            subscribedWebtoons,
            activeReadingWebtoon.webtoon.id,
            Boolean(activeReadingWebtoon.webtoon.isSubscribed)
          )}
          isLiked={isWebtoonLiked(
            effectiveLikedWebtoons,
            activeReadingWebtoon.webtoon.id
          )}
          onToggleSubscribe={onToggleSubscribe}
          onToggleLike={onToggleLikeWebtoon}
        />
      )}

      {/* Clean Premium & Badges BottomSheet */}
      <BottomSheet
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        title="enmmoe Premium"
      >
        <div className="px-4 py-3 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-[20px] font-bold tracking-tight truncate">
                  {currentUser.name}
                </h4>
                {selectedStatusIcon === 'verified' ? (
                  <BlueVerifiedBadge size={18} />
                ) : selectedStatusIcon !== 'none' ? (
                  <TelegramPremiumStar size={18} />
                ) : null}
              </div>
              <p className="text-[14px] text-[#8E8E93] mt-0.5">
                {selectedStatusIcon === 'none'
                  ? 'Standard account'
                  : selectedStatusIcon === 'verified'
                  ? 'Verified profile badge'
                  : 'Premium status active'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[13px] font-medium text-[#8E8E93]">
              Profile Badge
            </p>
            <div className="grid grid-cols-4 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] gap-1">
              {[
                { icon: 'verified', label: 'Verified' },
                { icon: 'star', label: 'Star' },
                { icon: 'premium', label: 'Premium' },
                { icon: 'none', label: 'None' },
              ].map((opt) => {
                const selected = selectedStatusIcon === opt.icon;
                return (
                  <button
                    key={opt.icon}
                    type="button"
                    onClick={() => setSelectedStatusIcon(opt.icon)}
                    className={`min-h-[40px] rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                      selected
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#007AFF] shadow-xs'
                        : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              onUpdateUser?.({
                isVerified: selectedStatusIcon === 'verified',
                isPremium: selectedStatusIcon !== 'none',
                premiumStatusIcon:
                  selectedStatusIcon === 'none' ? undefined : selectedStatusIcon,
              });
              showToast('Premium status updated', { type: 'success' });
              setShowPremiumModal(false);
            }}
          >
            Save Settings
          </Button>
        </div>
      </BottomSheet>

      {/* Post Detail Sheet (Opened when tapping a post in Posts or Reposts) */}
      <BottomSheet
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPostId(null)}
        title={t('posts', 'Post')}
      >
        {selectedPost && (
          <div id="profile-post-detail-sheet" className="px-4 py-3 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedPostId(null);
                  if (selectedPost.authorId !== currentUser.id) {
                    onOpenUserProfile?.({
                      id: selectedPost.authorId,
                      name: selectedPost.authorName,
                      username: selectedPost.authorUsername,
                      avatar: selectedPost.authorAvatar,
                      isVerified: selectedPost.authorVerified,
                    });
                  }
                }}
                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer bg-transparent border-0 p-0"
              >
                <Avatar src={selectedPost.authorAvatar} name={selectedPost.authorName} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[16px] font-semibold text-black dark:text-white truncate">
                      {selectedPost.authorName}
                    </span>
                    {selectedPost.authorVerified && <VerifiedBadge size={14} />}
                  </div>
                  <p className="text-[13px] text-[#8E8E93] truncate">
                    @{selectedPost.authorUsername} · {formatRelativePostTime(selectedPost.createdAt)}
                  </p>
                </div>
              </button>
            </div>

            {selectedPost.content && (
              <p className="text-[16px] leading-[1.5] text-black dark:text-white break-words">
                <EmojiText text={selectedPost.content} />
              </p>
            )}

            {Array.isArray(selectedPost.mediaUrls) && selectedPost.mediaUrls.length > 0 && (
              <div className="space-y-2">
                {selectedPost.mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E]"
                  >
                    <SmartImage
                      src={url}
                      alt={selectedPost.authorName}
                      aspectClassName="aspect-[16/10] w-full"
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedPost.linkPreview && (
              <a
                href={selectedPost.linkPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] transition-opacity hover:opacity-90"
              >
                {selectedPost.linkPreview.image && (
                  <SmartImage
                    src={selectedPost.linkPreview.image}
                    alt={selectedPost.linkPreview.title}
                    aspectClassName="aspect-[16/9] w-full"
                  />
                )}
                <div className="p-3 space-y-0.5">
                  <p className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                    <span>{selectedPost.linkPreview.siteName || 'enmmoe'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </p>
                  <p className="text-[15px] font-semibold text-black dark:text-white">
                    {selectedPost.linkPreview.title}
                  </p>
                  {selectedPost.linkPreview.description && (
                    <p className="text-[13px] text-[#8E8E93]">
                      {selectedPost.linkPreview.description}
                    </p>
                  )}
                </div>
              </a>
            )}

            {selectedPost.poll && (
              <div className="space-y-2">
                <p className="text-[15px] font-semibold">{selectedPost.poll.question}</p>
                <div className="space-y-1.5">
                  {selectedPost.poll.options.map((opt) => {
                    const voted = selectedPost.poll?.userVotedOptionId === opt.id;
                    const pct = selectedPost.poll?.totalVotes
                      ? Math.round((opt.votes / selectedPost.poll.totalVotes) * 100)
                      : 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onVotePoll?.(selectedPost.id, opt.id)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-[14px] font-medium flex items-center justify-between cursor-pointer ios-press ${
                          voted
                            ? 'bg-[#007AFF]/12 text-[#007AFF] font-semibold'
                            : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white'
                        }`}
                      >
                        <span className="truncate">{opt.text}</span>
                        <span className="tabular-nums text-[#8E8E93] ml-2">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[14px] text-[#8E8E93]">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => onReactPost?.(selectedPost.id, 'love')}
                  className={`inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                    selectedPost.userReaction ? 'text-[#007AFF] font-semibold' : ''
                  }`}
                >
                  <Heart
                    className={`w-[18px] h-[18px] ${
                      selectedPost.userReaction ? 'fill-current' : ''
                    }`}
                  />
                  <span className="tabular-nums">{selectedPost.likesCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetId = selectedPost.id;
                    setSelectedPostId(null);
                    onOpenComments?.(targetId);
                  }}
                  className="inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white cursor-pointer ios-press"
                >
                  <MessageCircle className="w-[18px] h-[18px]" />
                  <span className="tabular-nums">{selectedPost.commentsCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleRepost?.(selectedPost.id)}
                  className={`inline-flex items-center gap-1.5 cursor-pointer ios-press ${
                    selectedPost.isReposted ? 'text-[#007AFF] font-semibold' : ''
                  }`}
                >
                  <Repeat2 className="w-[18px] h-[18px]" />
                  <span className="tabular-nums">{selectedPost.sharesCount}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleSave?.(selectedPost.id)}
                aria-label={selectedPost.isSaved ? 'Remove bookmark' : 'Save post'}
                className={`inline-flex items-center justify-center cursor-pointer ios-press ${
                  selectedPost.isSaved ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                }`}
              >
                <Bookmark
                  className={`w-[18px] h-[18px] ${selectedPost.isSaved ? 'fill-current' : ''}`}
                />
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
