import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  Flame,
  Lock,
  MessageCircle,
  Pencil,
  Settings,
  Share2,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  AchievementItem,
  ReadingStoryItem,
  ShortVideo,
  SocialPost,
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
import { useLanguage } from '../utils/i18n';
import { SettingsView } from './SettingsView';
import {
  BadgesExplanationModal,
  BlueVerifiedBadge,
  TelegramPremiumStar,
} from './Badges';
import { AchievementShowcaseModal } from './AchievementShowcaseModal';
import { ProfilePrivacyModal } from './ProfilePrivacyModal';
import { UserProfileModal } from './UserProfileModal';
import { WebtoonReaderModal, getAllReadingProgress } from './WebtoonReaderModal';
import {
  Avatar,
  BookCover,
  BottomSheet,
  Button,
  EmptyState,
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
  isActive?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  creators = INITIAL_CREATORS,
  profileUser,
  onOpenSettings,
  onOpenEditProfile,
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
  isActive,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const isOtherUser = Boolean(
    profileUser && profileUser.id && profileUser.id !== currentUser.id
  );

  const displayUser: User = isOtherUser
    ? {
        ...currentUser,
        ...profileUser,
        id: profileUser!.id,
        name: profileUser!.name || 'Creator',
        username: profileUser!.username || 'creator',
        avatar: profileUser!.avatar || currentUser.avatar,
        bio:
          profileUser!.bio ||
          'Webtoon Author & Comic Enthusiast. Sharing original stories and artwork every week.',
        isVerified: Boolean(profileUser!.isVerified),
        followersCount: profileUser!.followersCount ?? 428,
        followingCount: profileUser!.followingCount ?? 115,
        postsCount: profileUser!.postsCount ?? 18,
        likesCount: profileUser!.likesCount ?? 1420,
        storiesReadCount: profileUser!.storiesReadCount ?? 92,
      }
    : currentUser;

  const isFollowed = isOtherUser
    ? (currentUser.followingIds || []).includes(displayUser.id) || Boolean(isFollowing)
    : false;

  const [activeTab, setActiveTab] = useState<'library' | 'achievements'>('library');
  const [libraryTab, setLibraryTab] = useState<'continue' | 'saved' | 'completed'>('continue');

  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showBadgesExplanation, setShowBadgesExplanation] = useState(false);
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

  const [pinnedAchievementIds, setPinnedAchievementIds] = useState<string[]>(
    displayUser.showcasedAchievementIds || [
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

  // Merge static currently-reading list with live persisted reader progress
  const currentlyReading = useMemo<ReadingStoryItem[]>(() => {
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
  }, [progressTick]);

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

  const handleShareProfile = async () => {
    try {
      await navigator.clipboard?.writeText?.(
        `${window.location.origin}/profile/${displayUser.username}`
      );
      showToast('Profile link copied', { type: 'success' });
    } catch {
      showToast('Could not copy link', { type: 'error' });
    }
  };

  const totalEpisodesRead = displayUser.storiesReadCount ?? 248;
  const totalSeriesCount = currentlyReading.length;
  const totalLibraryCount =
    currentlyReading.length + savedStories.length + completedStories.length;

  const activeLibraryList =
    libraryTab === 'continue'
      ? currentlyReading
      : libraryTab === 'saved'
      ? savedStories
      : completedStories;

  const followingIds = currentUser.followingIds || [];
  const followListUsers =
    followSheetMode === 'following'
      ? isOtherUser
        ? displayUser.followingIds
          ? creators.filter((c) => displayUser.followingIds!.includes(c.id))
          : creators.filter((c) => c.id !== displayUser.id)
        : creators.filter((c) => followingIds.includes(c.id))
      : creators.filter((c) => c.id !== displayUser.id);

  return (
    <div
      id="webtoon-profile-root"
      className="w-full min-h-full bg-white dark:bg-black text-black dark:text-white pb-10 select-none"
    >
      {/* iOS Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] pt-safe">
        <div className="h-12 px-4 flex items-center justify-between gap-2">
          {isOtherUser || showBackButton ? (
            <button
              id="profile-top-back-btn"
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center gap-0.5 text-[#007AFF] cursor-pointer ios-press"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
              <span className="text-[17px]">Back</span>
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

          <div className="flex items-center -mr-2">
            {!isOtherUser && (
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                aria-label="Privacy settings"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer ios-press"
              >
                <Shield className="w-[21px] h-[21px] stroke-[1.85]" />
              </button>
            )}

            <button
              type="button"
              onClick={handleShareProfile}
              aria-label="Share profile"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer ios-press"
            >
              <Share2 className="w-[21px] h-[21px] stroke-[1.85]" />
            </button>

            {!isOtherUser && (
              <button
                id="profile-top-more-button"
                type="button"
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  else setShowSettingsPage(true);
                }}
                aria-label={t('settings_title', 'Settings')}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-black dark:text-white cursor-pointer ios-press"
              >
                <Settings className="w-[21px] h-[21px] stroke-[1.85]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <section className="px-4 pt-6 pb-5 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              src={displayUser.avatar}
              name={displayUser.name}
              size="xl"
              onClick={isOtherUser ? undefined : onOpenEditProfile}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight truncate">
                  {displayUser.name}
                </h2>
                <button
                  type="button"
                  onClick={() => !isOtherUser && setShowPremiumModal(true)}
                  className="shrink-0 cursor-pointer"
                  aria-label="Profile badge"
                >
                  {renderBadge()}
                </button>
              </div>
              <p className="text-[15px] text-[#8E8E93] truncate">
                @{displayUser.username}
              </p>

              {/* Interactive Tabular Stats Row */}
              <div className="flex items-center gap-5 mt-3 tabular-nums">
                <button
                  type="button"
                  onClick={() => setFollowSheetMode('followers')}
                  className="text-left cursor-pointer ios-press"
                >
                  <span className="text-[18px] font-semibold block leading-tight">
                    {displayUser.followersCount ?? 1240}
                  </span>
                  <span className="text-[13px] text-[#8E8E93]">{t('subscribers', 'Subscribers')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowSheetMode('following')}
                  className="text-left cursor-pointer ios-press"
                >
                  <span className="text-[18px] font-semibold block leading-tight">
                    {isOtherUser
                      ? displayUser.followingCount ?? 115
                      : followingIds.length || displayUser.followingCount || 0}
                  </span>
                  <span className="text-[13px] text-[#8E8E93]">{t('subscriptions', 'Subscriptions')}</span>
                </button>
                <div>
                  <span className="text-[18px] font-semibold block leading-tight">
                    {totalEpisodesRead}
                  </span>
                  <span className="text-[13px] text-[#8E8E93]">Read</span>
                </div>
                <div>
                  <span className="text-[18px] font-semibold block leading-tight">
                    {totalLibraryCount}
                  </span>
                  <span className="text-[13px] text-[#8E8E93]">Library</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {displayUser.bio && (
            <p className="text-[15px] text-black/85 dark:text-white/85 leading-relaxed">
              {displayUser.bio}
            </p>
          )}

          {/* Action Buttons */}
          {isOtherUser ? (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                id="profile-btn-follow"
                variant={isFollowed ? 'secondary' : 'primary'}
                size="md"
                aria-label={isFollowed ? t('unsubscribe', 'Unsubscribe') : t('subscribe', 'Subscribe')}
                title={isFollowed ? t('unsubscribe', 'Unsubscribe') : t('subscribe', 'Subscribe')}
                leftIcon={
                  isFollowed ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
                }
                onClick={() => onToggleFollow?.(displayUser.id)}
              >
                {isFollowed ? t('subscribed', 'Subscribed') : t('subscribe', 'Subscribe')}
              </Button>
              <Button
                id="profile-btn-message"
                variant="secondary"
                size="md"
                leftIcon={<MessageCircle className="w-4 h-4" />}
                onClick={() => onSendMessage?.(displayUser.id)}
              >
                Message
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                id="profile-btn-edit-profile"
                variant="secondary"
                size="md"
                leftIcon={<Pencil className="w-4 h-4" />}
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

        {/* iOS Segmented Tab Switch: Library | Achievements */}
        <div className="px-4 pb-3 sticky top-[52px] z-20 bg-white/95 dark:bg-black/95 backdrop-blur-xl">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E]">
            {(
              [
                { id: 'library', label: 'Library' },
                { id: 'achievements', label: 'Achievements' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`profile-tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-2 text-[14px] font-semibold rounded-lg transition-colors cursor-pointer z-10 ${
                    isActive
                      ? 'text-black dark:text-white'
                      : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="profile-main-tab"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] -z-10"
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body */}
        {activeTab === 'library' ? (
          <div className="px-4 pt-2 space-y-4">
            {/* Sub-filter Pills */}
            <div className="flex items-center gap-2">
              {(
                [
                  { id: 'continue', label: `Continue (${currentlyReading.length})` },
                  { id: 'saved', label: `Saved (${savedStories.length})` },
                  { id: 'completed', label: `Completed (${completedStories.length})` },
                ] as const
              ).map((sub) => {
                const active = libraryTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setLibraryTab(sub.id)}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ios-press ${
                      active
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>

            {activeLibraryList.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" />}
                title="Nothing here yet"
                description="Series you read or save will appear here."
              />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5">
                {activeLibraryList.map((item) => {
                  const pct =
                    libraryTab === 'continue'
                      ? Math.round((item.currentEpisode / item.totalEpisodes) * 100)
                      : libraryTab === 'completed'
                      ? 100
                      : undefined;
                  return (
                    <BookCover
                      key={item.id}
                      title={item.title}
                      subtitle={
                        libraryTab === 'continue'
                          ? `Ep. ${item.currentEpisode} / ${item.totalEpisodes}`
                          : libraryTab === 'completed'
                          ? 'Completed'
                          : `${item.totalEpisodes} Eps`
                      }
                      coverImage={item.coverImage}
                      progressPercent={pct}
                      onClick={() =>
                        handleOpenReader(
                          item.webtoonId,
                          libraryTab === 'continue' ? item.currentEpisode : 1
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 pt-2 space-y-5">
            {/* Reader Stats Card */}
            <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">Reader Statistics</h3>
                <span className="text-[13px] font-medium text-[#8E8E93]">Level 14</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center tabular-nums">
                <div className="p-3 rounded-xl bg-white dark:bg-[#2C2C2E]">
                  <p className="text-[20px] font-bold text-[#007AFF]">
                    {totalSeriesCount}
                  </p>
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">Series</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#2C2C2E]">
                  <p className="text-[20px] font-bold text-black dark:text-white">
                    {totalEpisodesRead}
                  </p>
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">Episodes</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#2C2C2E]">
                  <p className="text-[20px] font-bold text-black dark:text-white">146.9K</p>
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">Views</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#2C2C2E]">
                  <p className="text-[20px] font-bold text-[#007AFF] inline-flex items-center gap-1">
                    <Flame className="w-4 h-4 fill-current" />
                    18d
                  </p>
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">Streak</p>
                </div>
              </div>
            </div>

            {/* Achievements Showcase Row */}
            <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-semibold">Badges &amp; Achievements</h3>
                  <p className="text-[13px] text-[#8E8E93]">
                    {achievements.filter((a) => a.isUnlocked).length} unlocked ·{' '}
                    {pinnedAchievementIds.length} pinned
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAchievementsModal(true)}
                >
                  See All
                </Button>
              </div>

              <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1">
                {achievements.map((ach) => {
                  const isPinned = pinnedAchievementIds.includes(ach.id);
                  return (
                    <button
                      key={ach.id}
                      type="button"
                      onClick={() => setShowAchievementsModal(true)}
                      className={`w-28 shrink-0 rounded-2xl bg-white dark:bg-[#2C2C2E] p-2.5 text-center border cursor-pointer ios-press ${
                        isPinned
                          ? 'border-[#007AFF]/40'
                          : 'border-black/[0.04] dark:border-white/[0.08]'
                      }`}
                    >
                      <div className="h-14 w-full relative flex items-center justify-center mb-1.5">
                        {ach.imageUrl ? (
                          <SmartImage
                            src={ach.imageUrl}
                            alt={ach.name}
                            aspectClassName="w-12 h-12 rounded-xl"
                            className={`object-contain ${
                              !ach.isUnlocked ? 'grayscale opacity-50' : ''
                            }`}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E]" />
                        )}
                        {!ach.isUnlocked && (
                          <span className="absolute bottom-0 right-2 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold truncate text-black dark:text-white">
                        {ach.name}
                      </p>
                      <p
                        className={`text-[11px] ${
                          isPinned
                            ? 'text-[#007AFF] font-medium'
                            : 'text-[#8E8E93]'
                        }`}
                      >
                        {ach.isUnlocked ? (isPinned ? 'Pinned' : 'Earned') : 'Locked'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Favorite Genres & Account Summary */}
            <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] text-[15px]">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#8E8E93]">Top Genres</span>
                <span className="font-medium text-right">Fantasy · Sci-Fi · Action</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#8E8E93]">Reading Time</span>
                <span className="font-medium tabular-nums">42h 15m</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#8E8E93]">Joined</span>
                <span className="font-medium">{displayUser.joinDate || 'March 2024'}</span>
              </div>
            </div>
          </div>
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
        <div className="p-4 space-y-2.5">
          {followListUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title={
                followSheetMode === 'following' ? 'No subscriptions yet' : 'No subscribers yet'
              }
              description="Discover creators in Search to build your subscriptions."
            />
          ) : (
            followListUsers.map((creator) => {
              const followed = followingIds.includes(creator.id);
              return (
                <div
                  key={creator.id}
                  className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between gap-3"
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

                  {onToggleFollow && (
                    <Button
                      variant={followed ? 'secondary' : 'primary'}
                      size="sm"
                      aria-label={followed ? `Unsubscribe from ${creator.name}` : `Subscribe to ${creator.name}`}
                      title={followed ? t('unsubscribe', 'Unsubscribe') : t('subscribe', 'Subscribe')}
                      onClick={() => onToggleFollow(creator.id)}
                    >
                      {followed ? t('subscribed', 'Subscribed') : t('subscribe', 'Subscribe')}
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
            isFollowing={(currentUser.followingIds || []).includes(inspectUser.id)}
            onToggleFollow={(id) => onToggleFollow?.(id)}
            onSendMessage={() => setInspectUser(null)}
            onOpenEditProfile={onOpenEditProfile}
            onOpenBadgeInfo={() => setShowBadgesExplanation(true)}
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
          isSubscribed={
            subscribedWebtoons?.[getCanonicalWebtoonId(activeReadingWebtoon.webtoon.id)] ??
            Boolean(activeReadingWebtoon.webtoon.isSubscribed)
          }
          onToggleSubscribe={onToggleSubscribe}
        />
      )}

      {/* Premium & Badges BottomSheet */}
      <BottomSheet
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        title="enmmoe Premium"
      >
        <div className="p-4 space-y-5">
          <div className="p-5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#007AFF] text-white mx-auto flex items-center justify-center">
              {selectedStatusIcon === 'verified' ? (
                <BlueVerifiedBadge size={22} />
              ) : (
                <TelegramPremiumStar size={22} />
              )}
            </div>
            <h4 className="text-[18px] font-semibold">enmmoe Premium Membership</h4>
            <p className="text-[14px] text-[#8E8E93]">
              {currentUser.name} ·{' '}
              {selectedStatusIcon === 'none'
                ? 'Standard'
                : selectedStatusIcon === 'verified'
                ? 'Verified'
                : 'Premium Active'}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-[#8E8E93] px-1">
              Profile Badge &amp; Status
            </p>
            <div className="grid grid-cols-4 gap-2">
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
                    className={`p-3 rounded-xl text-[13px] font-semibold border transition-all cursor-pointer ${
                      selected
                        ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                        : 'border-black/[0.08] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E]'
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
            Save Premium Settings
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
