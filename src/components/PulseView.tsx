import React, { useState, useEffect, Suspense } from 'react';
import {
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Repeat2,
  Sliders,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { ReactionType, SocialPost, Story, User } from '../types';
import {
  CharacterConfig,
  SavedStudioPhoto,
  WORLD_DISTRICTS,
  WalletState,
} from '../types/characterStudio';
import {
  getActiveCharacterId,
  getSavedCharacters,
  getSavedStudioPhotos,
  getWalletState,
  setActiveCharacterId,
} from '../utils/characterStudioStorage';
import { Avatar, Button, SmartImage, VerifiedBadge, useToast } from './ui';

const CharacterStudioModal = React.lazy(() =>
  import('./studio/CharacterStudioModal').then((m) => ({
    default: m.CharacterStudioModal,
  }))
);

export interface PulseViewProps {
  currentUser: User;
  stories: Story[];
  posts: SocialPost[];
  onUpdateUser: (updatedFields: Partial<User>) => void;
  onPublishStory?: (storyData: Partial<Story>) => void;
  onPublishPost?: (postData: Partial<SocialPost>) => void;
  onOpenStory?: (storyIndex: number) => void;
  onOpenCreate?: () => void;
  onReactPost?: (postId: string, reaction: ReactionType) => void;
  onOpenComments?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
  onToggleRepost?: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  }) => void;
}

export const PulseView: React.FC<PulseViewProps> = ({
  currentUser,
  stories,
  posts,
  onUpdateUser,
  onPublishStory,
  onPublishPost,
  onOpenStory,
  onOpenCreate,
  onReactPost,
  onOpenComments,
  onToggleSave,
  onToggleRepost,
  onVotePoll,
  onOpenUserProfile,
}) => {
  const { showToast } = useToast();

  const [studioOpen, setStudioOpen] = useState(false);
  const [studioInitialMode, setStudioInitialMode] = useState<'creator' | 'explore' | 'studio'>('explore');

  const [savedCharacters, setSavedCharacters] = useState<CharacterConfig[]>(() =>
    getSavedCharacters()
  );
  const [activeCharId, setActiveCharId] = useState<string>(() => getActiveCharacterId());
  const [recentPhotos, setRecentPhotos] = useState<SavedStudioPhoto[]>(() =>
    getSavedStudioPhotos().slice(0, 10)
  );
  const [wallet, setWallet] = useState<WalletState>(() => getWalletState());

  const refreshStudioData = () => {
    setSavedCharacters(getSavedCharacters());
    setActiveCharId(getActiveCharacterId());
    setRecentPhotos(getSavedStudioPhotos().slice(0, 10));
    setWallet(getWalletState());
  };

  useEffect(() => {
    refreshStudioData();
  }, [currentUser.avatar]);

  const activeCharacter =
    savedCharacters.find((c) => c.id === activeCharId) || savedCharacters[0];
  const latestPhoto = recentPhotos.find((p) => p.characterId === activeCharacter?.id) || recentPhotos[0];

  const handleLaunchStudio = (
    mode: 'creator' | 'explore' | 'studio',
    charId?: string
  ) => {
    if (charId) {
      setActiveCharacterId(charId);
      setActiveCharId(charId);
    }
    setStudioInitialMode(mode);
    setStudioOpen(true);
  };

  const handleEquipPhotoAsAvatar = (photo: SavedStudioPhoto) => {
    onUpdateUser({ avatar: photo.imageDataUrl });
    showToast('Profile icon updated from Studio', { type: 'success' });
  };

  const formatRelativeTime = (ts: number) => {
    const mins = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div
      id="enmmoe-pulse-view"
      className="w-full min-h-full bg-white dark:bg-black text-black dark:text-white pb-10 select-none"
    >
      {/* iOS Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/92 dark:bg-black/92 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] pt-safe">
        <div className="h-[52px] px-4 flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold tracking-tight leading-none text-black dark:text-white">
            Pulse
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLaunchStudio('explore')}
              className="min-h-[36px] px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[13px] font-semibold text-black dark:text-white inline-flex items-center gap-1.5 tabular-nums cursor-pointer ios-press"
              aria-label="Seoul World balance"
            >
              <Wallet className="w-4 h-4 text-[#007AFF] stroke-[1.9]" />
              <span>₩{wallet.balance.toLocaleString()}</span>
            </button>

            {onOpenCreate && (
              <button
                id="pulse-create-btn"
                type="button"
                onClick={onOpenCreate}
                aria-label="Create post or story"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-black dark:text-white cursor-pointer active:opacity-55 transition-opacity"
              >
                <Plus className="w-[22px] h-[22px] stroke-[1.85]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-7">
        {/* Primary 3D Character & Seoul World Destination Card */}
        <section aria-label="Character & Seoul World">
          <div
            id="pulse-character-hero"
            className="rounded-[24px] bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.08] p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center gap-4">
              {/* Character Portrait / Avatar Frame */}
              <button
                type="button"
                onClick={() => handleLaunchStudio('creator')}
                aria-label="Open Character Creator"
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[20px] overflow-hidden bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.1] shrink-0 flex items-center justify-center cursor-pointer ios-press"
              >
                {latestPhoto ? (
                  <img
                    src={latestPhoto.imageDataUrl}
                    alt={activeCharacter?.name || 'Character portrait'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-full border border-black/15"
                      style={{ backgroundColor: activeCharacter?.skinTone || '#E9C3AC' }}
                    />
                    <div className="flex items-center gap-1">
                      <span
                        className="w-3.5 h-2 rounded-sm"
                        style={{ backgroundColor: activeCharacter?.primaryOutfitColor || '#495867' }}
                      />
                      <span
                        className="w-3.5 h-2 rounded-sm"
                        style={{ backgroundColor: activeCharacter?.secondaryOutfitColor || '#1B1C20' }}
                      />
                    </div>
                  </div>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#007AFF] uppercase tracking-wider">
                  Seoul 3D Experience
                </p>
                <h2 className="text-[22px] font-bold tracking-tight text-black dark:text-white truncate mt-0.5">
                  {activeCharacter?.name || 'Seo-yeon'}
                </h2>
                <p className="text-[14px] text-[#8E8E93] mt-0.5 leading-snug">
                  {activeCharacter?.frame === 'male' ? 'Male' : 'Female'} ·{' '}
                  {wallet.discoveredDistricts.length}/{WORLD_DISTRICTS.length} districts ·{' '}
                  {wallet.photosTaken} photos
                </p>
              </div>
            </div>

            {/* Primary CTA: Enter Seoul World */}
            <Button
              id="pulse-enter-world-btn"
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Compass className="w-[18px] h-[18px] stroke-[2]" />}
              onClick={() => handleLaunchStudio('explore')}
            >
              Enter Seoul 3D World
            </Button>

            {/* Secondary Character & Studio Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="pulse-open-creator-btn"
                type="button"
                onClick={() => handleLaunchStudio('creator')}
                className="min-h-[44px] px-3.5 rounded-2xl bg-white dark:bg-[#2C2C2E] text-black dark:text-white text-[15px] font-semibold flex items-center justify-center gap-2 border border-black/[0.05] dark:border-white/[0.08] cursor-pointer ios-press"
              >
                <Sliders className="w-4 h-4 text-[#007AFF] stroke-[2]" />
                <span>Customize</span>
              </button>

              <button
                id="pulse-open-studio-btn"
                type="button"
                onClick={() => handleLaunchStudio('studio')}
                className="min-h-[44px] px-3.5 rounded-2xl bg-white dark:bg-[#2C2C2E] text-black dark:text-white text-[15px] font-semibold flex items-center justify-center gap-2 border border-black/[0.05] dark:border-white/[0.08] cursor-pointer ios-press"
              >
                <Camera className="w-4 h-4 text-[#007AFF] stroke-[2]" />
                <span>Photo Studio</span>
              </button>
            </div>

            {/* Saved Character Quick Switcher */}
            {savedCharacters.length > 0 && (
              <div className="pt-1 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#8E8E93]">
                    Your Characters
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLaunchStudio('creator')}
                    className="text-[13px] font-semibold text-[#007AFF] cursor-pointer"
                  >
                    Manage
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {savedCharacters.map((char) => {
                    const isCurrent = char.id === activeCharacter?.id;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => handleLaunchStudio('creator', char.id)}
                        className={`min-h-[38px] px-3 rounded-xl text-[13px] font-semibold border flex items-center gap-2 shrink-0 cursor-pointer ios-press ${
                          isCurrent
                            ? 'bg-[#007AFF]/12 border-[#007AFF] text-[#007AFF]'
                            : 'bg-white dark:bg-[#2C2C2E] border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: char.skinTone }}
                        />
                        <span>{char.name}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Seoul World Districts */}
        <section aria-label="Seoul World Districts">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
              Seoul Districts
            </h2>
            <button
              type="button"
              onClick={() => handleLaunchStudio('explore')}
              className="inline-flex items-center gap-0.5 text-[15px] font-medium text-[#007AFF] cursor-pointer"
            >
              <span>Explore Map</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1">
            {WORLD_DISTRICTS.map((district) => {
              const isDiscovered = wallet.discoveredDistricts.includes(district.id);
              const isPhotoDistrict = district.id === 'photo_studio';
              return (
                <button
                  key={district.id}
                  type="button"
                  onClick={() => handleLaunchStudio(isPhotoDistrict ? 'studio' : 'explore')}
                  className="w-[210px] shrink-0 p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.08] text-left flex flex-col justify-between gap-2.5 cursor-pointer ios-press"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-[#8E8E93] truncate">
                        {district.koreanName}
                      </span>
                      <MapPin className="w-4 h-4 text-[#007AFF] shrink-0 stroke-[1.9]" />
                    </div>
                    <p className="text-[16px] font-semibold text-black dark:text-white leading-snug mt-1">
                      {district.name}
                    </p>
                    <p className="text-[13px] text-[#8E8E93] line-clamp-2 mt-1 leading-snug">
                      {district.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[12px] font-semibold pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <span className={isDiscovered ? 'text-[#007AFF]' : 'text-[#8E8E93]'}>
                      {isDiscovered ? 'Unlocked' : 'Discover'}
                    </span>
                    <span className="text-[#8E8E93] tabular-nums">
                      {district.travelCost === 0 ? 'Free' : `₩${district.travelCost.toLocaleString()}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Studio Captures Gallery */}
        {recentPhotos.length > 0 && (
          <section aria-label="Studio Captures">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                  Studio Captures
                </h2>
                <p className="text-[13px] text-[#8E8E93]">
                  Tap any shot to set as your enmmoe avatar
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchStudio('studio')}
                className="text-[15px] font-medium text-[#007AFF] cursor-pointer"
              >
                Open Studio
              </button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
              {recentPhotos.map((photo) => {
                const isSelected = currentUser.avatar === photo.imageDataUrl;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleEquipPhotoAsAvatar(photo)}
                    className={`relative w-24 h-28 rounded-2xl overflow-hidden shrink-0 cursor-pointer transition-all ios-press ${
                      isSelected
                        ? 'ring-2 ring-[#007AFF]'
                        : 'ring-1 ring-black/[0.08] dark:ring-white/[0.1]'
                    }`}
                  >
                    <img
                      src={photo.imageDataUrl}
                      alt={photo.characterName}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-sm">
                        <UserCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Active Stories Strip */}
        {stories.length > 0 && (
          <section aria-label="Community Stories">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                Stories
              </h2>
              <button
                type="button"
                onClick={() => handleLaunchStudio('studio')}
                className="text-[14px] font-medium text-[#007AFF] cursor-pointer"
              >
                Shoot 3D Story
              </button>
            </div>

            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              {onOpenCreate && (
                <button
                  type="button"
                  onClick={onOpenCreate}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 cursor-pointer ios-press"
                >
                  <div className="relative">
                    <Avatar src={currentUser.avatar} name={currentUser.name} size="md" className="w-14 h-14" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center border-2 border-white dark:border-black">
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </span>
                  </div>
                  <span className="text-[12px] text-[#8E8E93] truncate w-full text-center">
                    Your Story
                  </span>
                </button>
              )}

              {stories.map((story, idx) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => onOpenStory?.(idx)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-16 cursor-pointer ios-press"
                >
                  <div
                    className={`p-[2px] rounded-full ${
                      story.isSeen
                        ? 'bg-[#C7C7CC] dark:bg-[#3A3A3C]'
                        : 'bg-[#007AFF]'
                    }`}
                  >
                    <div className="p-[2px] rounded-full bg-white dark:bg-black">
                      <Avatar
                        src={story.authorAvatar}
                        name={story.authorName}
                        size="md"
                        className="w-[52px] h-[52px]"
                      />
                    </div>
                  </div>
                  <span className="text-[12px] text-black/85 dark:text-white/85 truncate w-full text-center">
                    {story.authorName.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Community Pulse Feed */}
        {posts.length > 0 && (
          <section aria-label="Community Pulse" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white">
                Community Pulse
              </h2>
              <span className="text-[13px] text-[#8E8E93] tabular-nums">
                {posts.length} updates
              </span>
            </div>

            <div className="space-y-3.5">
              {posts.slice(0, 6).map((post) => {
                const isLiked = Boolean(post.userReaction);
                return (
                  <article
                    key={post.id}
                    className="rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/[0.05] dark:border-white/[0.08] p-4 space-y-3"
                  >
                    {/* Author Row */}
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenUserProfile?.({
                            id: post.authorId,
                            name: post.authorName,
                            username: post.authorUsername,
                            avatar: post.authorAvatar,
                            isVerified: post.authorVerified,
                          })
                        }
                        className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                      >
                        <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[15px] font-semibold truncate">
                              {post.authorName}
                            </span>
                            {post.authorVerified && <VerifiedBadge size={14} />}
                          </div>
                          <p className="text-[12px] text-[#8E8E93] truncate">
                            @{post.authorUsername} · {formatRelativeTime(post.createdAt)}
                            {post.location ? ` · ${post.location}` : ''}
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* Content */}
                    {post.content && (
                      <p className="text-[15px] leading-relaxed text-black/90 dark:text-white/90">
                        {post.content}
                      </p>
                    )}

                    {/* Media */}
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <div className="rounded-xl overflow-hidden border border-black/[0.05] dark:border-white/[0.08]">
                        <SmartImage
                          src={post.mediaUrls[0]}
                          alt={post.authorName}
                          aspectClassName="aspect-[16/10] w-full"
                        />
                      </div>
                    )}

                    {/* Poll */}
                    {post.poll && (
                      <div className="space-y-2 pt-1">
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
                                onClick={() => onVotePoll?.(post.id, opt.id)}
                                className={`w-full px-3 py-2 rounded-xl text-[13px] font-medium flex items-center justify-between border cursor-pointer ios-press ${
                                  voted
                                    ? 'bg-[#007AFF]/12 border-[#007AFF] text-[#007AFF]'
                                    : 'bg-white dark:bg-[#2C2C2E] border-black/[0.05] dark:border-white/[0.08]'
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

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => onReactPost?.(post.id, 'love')}
                          className={`min-h-[36px] inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer ios-press ${
                            isLiked ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                          }`}
                        >
                          <Heart
                            className={`w-[18px] h-[18px] stroke-[1.85] ${
                              isLiked ? 'fill-current' : ''
                            }`}
                          />
                          <span className="tabular-nums">{post.likesCount}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenComments?.(post.id)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 text-[13px] font-medium text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer ios-press"
                        >
                          <MessageCircle className="w-[18px] h-[18px] stroke-[1.85]" />
                          <span className="tabular-nums">{post.commentsCount}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleRepost?.(post.id)}
                          className={`min-h-[36px] inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer ios-press ${
                            post.isReposted ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                          }`}
                        >
                          <Repeat2 className="w-[18px] h-[18px] stroke-[1.85]" />
                          <span className="tabular-nums">{post.sharesCount}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleSave?.(post.id)}
                        aria-label={post.isSaved ? 'Remove bookmark' : 'Save post'}
                        className={`min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ios-press ${
                          post.isSaved ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                        }`}
                      >
                        <Bookmark
                          className={`w-[18px] h-[18px] stroke-[1.85] ${
                            post.isSaved ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Lazy-Loaded 3D Character Creator, Seoul World & Photo Studio */}
      {studioOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] bg-white dark:bg-black flex flex-col items-center justify-center gap-3 text-black dark:text-white">
              <div className="w-8 h-8 rounded-full border-[3px] border-[#007AFF] border-t-transparent animate-spin" />
              <p className="text-[15px] font-medium text-[#8E8E93]">
                Loading enmmoe 3D World...
              </p>
            </div>
          }
        >
          <CharacterStudioModal
            isOpen={studioOpen}
            initialMode={studioInitialMode}
            onClose={() => {
              setStudioOpen(false);
              refreshStudioData();
            }}
            onSelectAvatar={(avatarUrl) => {
              onUpdateUser({ avatar: avatarUrl });
              refreshStudioData();
            }}
            onPublishStory={
              onPublishStory
                ? (storyData) => {
                    onPublishStory(storyData);
                    setStudioOpen(false);
                  }
                : undefined
            }
            onPublishPost={
              onPublishPost
                ? (postData) => {
                    onPublishPost(postData);
                    setStudioOpen(false);
                  }
                : undefined
            }
          />
        </Suspense>
      )}
    </div>
  );
};
