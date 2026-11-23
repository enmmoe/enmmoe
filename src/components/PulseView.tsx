import React, { useState, useEffect, Suspense } from 'react';
import {
  Bookmark,
  Camera,
  ExternalLink,
  Gamepad2,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Repeat2,
  Share2,
  Sliders,
  UserCheck,
  X,
} from 'lucide-react';
import { ReactionType, SocialPost, Story, User } from '../types';
import { getAssetFromCache } from '../game/assetCache';
import { LOCATION_META, loadGameSaveSync } from '../game/saveSystem';
import { GameSaveState } from '../game/types';
import { ALL_WEBTOONS } from '../data/webtoonData';
import { useLanguage } from '../utils/i18n';
import { EmojiText } from './AppleEmoji';
import { Avatar, SmartImage, VerifiedBadge, useToast } from './ui';
import { StoriesBar } from './StoriesBar';
import { StoryAuthorGroup } from '../utils/storyMedia';

const WebtoonGameModal = React.lazy(() =>
  import('../game/WebtoonGameModal').then((m) => ({
    default: m.WebtoonGameModal,
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
  onOpenAuthorStory?: (authorId: string, group?: StoryAuthorGroup) => void;
  onOpenCreate?: () => void;
  onOpenCreateStory?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
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
  onOpenAuthorStory,
  onOpenCreate,
  onOpenCreateStory,
  onOpenNotifications,
  onReactPost,
  onOpenComments,
  onToggleSave,
  onToggleRepost,
  onVotePoll,
  onOpenUserProfile,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  // X-style inline post composer state
  const [composerText, setComposerText] = useState('');
  const [composerMediaUrl, setComposerMediaUrl] = useState('');
  const [showMediaTray, setShowMediaTray] = useState<'none' | 'artwork' | 'studio'>('none');

  // 2D Webtoon Game modal state
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioInitialMode, setStudioInitialMode] = useState<'creator' | 'explore' | 'studio'>('explore');

  const [gameSave, setGameSave] = useState<GameSaveState>(
    () => loadGameSaveSync(currentUser.name).state
  );
  const [recentPhotos, setRecentPhotos] = useState<
    Array<{ id: string; title: string; locationName: string; imageDataUrl: string }>
  >([]);

  const refreshStudioData = () => {
    const loaded = loadGameSaveSync(currentUser.name).state;
    setGameSave(loaded);
    const items = loaded.studioGallery.slice(0, 12);
    Promise.all(
      items.map(async (item) => {
        const rec = await getAssetFromCache(item.assetId);
        return {
          id: item.id,
          title: item.title,
          locationName: LOCATION_META[item.backgroundId]?.name || 'Seoul',
          imageDataUrl: rec?.dataUrl || '',
        };
      })
    ).then((rows) => {
      setRecentPhotos(rows.filter((r) => Boolean(r.imageDataUrl)));
    });
  };

  useEffect(() => {
    refreshStudioData();
  }, [currentUser.avatar, posts.length]);

  const handleLaunchStudio = (mode: 'creator' | 'explore' | 'studio') => {
    setStudioInitialMode(mode);
    setStudioOpen(true);
  };

  const handleEquipPhotoAsAvatar = (photo: { imageDataUrl: string }) => {
    onUpdateUser({ avatar: photo.imageDataUrl });
    showToast('Profile picture updated from Studio', { type: 'success' });
  };

  const handleShareStudioPhoto = (photo: { title: string; locationName: string; imageDataUrl: string }) => {
    if (!onPublishPost) return;
    onPublishPost({
      content: `${photo.title} in ${photo.locationName}`,
      mediaType: 'photo',
      mediaUrls: [photo.imageDataUrl],
      location: photo.locationName,
      tags: ['enmmoe', 'webtoonlife', 'seoul'],
    });
    showToast('Shared game photo to enmmoe+', { type: 'success' });
  };

  const handlePublishInlinePost = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = composerText.trim();
    if (!trimmed && !composerMediaUrl) return;
    onPublishPost?.({
      content: trimmed,
      mediaType: composerMediaUrl ? 'photo' : 'text',
      mediaUrls: composerMediaUrl ? [composerMediaUrl] : [],
      tags: ['enmmoe'],
    });
    setComposerText('');
    setComposerMediaUrl('');
    setShowMediaTray('none');
    showToast(t('status_updated', 'Posted to enmmoe+'), { type: 'success', durationMs: 1800 });
  };

  const formatRelativeTime = (ts: number) => {
    const mins = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const quickArtworkPool = ALL_WEBTOONS.slice(0, 6).map((w) => w.coverImage);

  return (
    <div
      id="enmmoe-pulse-view"
      className="w-full bg-white dark:bg-black text-black dark:text-white pb-12 select-none"
    >
      {/* Shared Borderless App Header (Game Entry — Centered enmmoe Wordmark — Notifications) */}
      <header
        id="enmmoe-plus-top-bar"
        className="sticky top-0 z-30 bg-white dark:bg-black pt-safe"
      >
        <div className="h-[48px] px-4 grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Far Left: iPhone-style Game Icon for Pulse 3D World / Character Experience */}
          <button
            id="enmmoe-plus-game-btn"
            type="button"
            onClick={() => handleLaunchStudio('explore')}
            aria-label="Open 3D World & Game"
            title="Seoul 3D World & Game"
            className="justify-self-start min-w-[44px] min-h-[44px] -ml-2.5 flex items-center justify-center text-black dark:text-white bg-transparent border-0 p-0 cursor-pointer active:opacity-50 transition-opacity focus-visible:outline-none"
          >
            <Gamepad2 className="w-[22px] h-[22px] stroke-[1.8]" aria-hidden="true" />
          </button>

          {/* Centered Clean Wordmark (Identical to Home) */}
          <h1
            aria-label="enmmoe"
            className="enmmoe-wordmark justify-self-center text-[25px] sm:text-[27px] font-bold leading-none lowercase text-[#000000] dark:text-[#FFFFFF] select-none pointer-events-none"
          >
            enmmoe
          </h1>

          {/* Far Right: Clean Outline Heart (Identical to Home) */}
          <button
            id="enmmoe-plus-activity-btn"
            type="button"
            onClick={onOpenNotifications}
            aria-label={t('notifications_title', 'Activity & Notifications')}
            className="justify-self-end min-w-[44px] min-h-[44px] -mr-2.5 flex items-center justify-center text-black dark:text-white bg-transparent border-0 p-0 cursor-pointer active:opacity-50 transition-opacity focus-visible:outline-none"
          >
            <Heart className="w-[22px] h-[22px] stroke-[1.8]" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* 1. Stories Row (Moved from Home, full story creation/view/privacy preserved) */}
        <StoriesBar
          currentUser={currentUser}
          stories={stories}
          onOpenAuthorStory={(authorId, group) => {
            if (onOpenAuthorStory) {
              onOpenAuthorStory(authorId, group);
            } else if (onOpenStory && group.stories[0]) {
              const idx = stories.findIndex((s) => s.id === group.stories[0].id);
              if (idx >= 0) onOpenStory(idx);
            }
          }}
          onOpenCreateStory={() => {
            if (onOpenCreateStory) onOpenCreateStory();
            else if (onOpenCreate) onOpenCreate();
          }}
          className="pt-0.5 pb-2"
        />

        {/* 2. X-Style Text & Media Post Composer */}
        <form
          id="enmmoe-plus-composer"
          onSubmit={handlePublishInlinePost}
          className="px-4 py-3.5 border-t border-b border-black/[0.06] dark:border-white/[0.08]"
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => onOpenUserProfile?.(currentUser)}
              aria-label={currentUser.name}
              className="shrink-0 cursor-pointer ios-press bg-transparent border-0 p-0"
            >
              <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
            </button>

            <div className="flex-1 min-w-0">
              <textarea
                id="enmmoe-plus-composer-input"
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder={t('whats_on_your_mind', "What's happening?")}
                rows={2}
                className="w-full bg-transparent border-0 text-[16px] leading-snug text-black dark:text-white placeholder:text-[#8E8E93] resize-none outline-none select-text"
              />

              {composerMediaUrl && (
                <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] max-h-64">
                  <img
                    src={composerMediaUrl}
                    alt="Attachment preview"
                    className="w-full max-h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setComposerMediaUrl('')}
                    aria-label="Remove image"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showMediaTray === 'artwork' && (
                <div
                  style={{ touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2"
                >
                  {quickArtworkPool.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setComposerMediaUrl(url);
                        setShowMediaTray('none');
                      }}
                      className="w-14 h-14 rounded-xl overflow-hidden shrink-0 cursor-pointer ios-press"
                    >
                      <SmartImage src={url} alt={`Media ${idx + 1}`} aspectClassName="w-full h-full" />
                    </button>
                  ))}
                </div>
              )}

              {showMediaTray === 'studio' && (
                <div className="py-2">
                  {recentPhotos.length === 0 ? (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[13px] text-[#8E8E93]">
                        No game captures saved yet.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLaunchStudio('studio')}
                        className="text-[13px] font-semibold text-[#007AFF] cursor-pointer"
                      >
                        Open Photo Studio
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{ touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
                      className="flex items-center gap-2 overflow-x-auto no-scrollbar"
                    >
                      {recentPhotos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => {
                            setComposerMediaUrl(photo.imageDataUrl);
                            if (!composerText.trim()) {
                              setComposerText(`${photo.title} in ${photo.locationName}`);
                            }
                            setShowMediaTray('none');
                          }}
                          className="w-14 h-14 rounded-xl overflow-hidden shrink-0 cursor-pointer ios-press"
                        >
                          <img
                            src={photo.imageDataUrl}
                            alt={photo.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1 -ml-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowMediaTray((prev) => (prev === 'artwork' ? 'none' : 'artwork'))
                    }
                    aria-label="Attach photo"
                    className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full cursor-pointer transition-colors ${
                      showMediaTray === 'artwork'
                        ? 'text-[#007AFF]'
                        : 'text-[#8E8E93] hover:text-[#007AFF]'
                    }`}
                  >
                    <ImageIcon className="w-[19px] h-[19px] stroke-[1.85]" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowMediaTray((prev) => (prev === 'studio' ? 'none' : 'studio'))
                    }
                    aria-label="Attach game capture"
                    title="Attach 3D Game Photo"
                    className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full cursor-pointer transition-colors ${
                      showMediaTray === 'studio'
                        ? 'text-[#007AFF]'
                        : 'text-[#8E8E93] hover:text-[#007AFF]'
                    }`}
                  >
                    <Camera className="w-[19px] h-[19px] stroke-[1.85]" />
                  </button>

                  {onOpenCreate && (
                    <button
                      id="pulse-create-btn"
                      type="button"
                      onClick={onOpenCreate}
                      aria-label="More post options"
                      title="Poll, Link or Story"
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center text-[#8E8E93] hover:text-[#007AFF] cursor-pointer"
                    >
                      <Plus className="w-[19px] h-[19px] stroke-[1.85]" />
                    </button>
                  )}
                </div>

                <button
                  id="enmmoe-plus-post-submit"
                  type="submit"
                  disabled={!composerText.trim() && !composerMediaUrl}
                  className="h-8 px-4 rounded-full bg-[#007AFF] text-white text-[14px] font-semibold cursor-pointer ios-press disabled:opacity-40"
                >
                  {t('post', 'Post')}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* 3. Shared Photos / Game Captures & Pulse Quick Launch */}
        <section
          aria-label="Game & Shared Studio Media"
          className="px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              id="pulse-enter-world-btn"
              type="button"
              onClick={() => handleLaunchStudio('explore')}
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-black dark:text-white cursor-pointer ios-press"
            >
              <Gamepad2 className="w-[18px] h-[18px] text-[#007AFF] stroke-[1.9]" />
              <span>Seoul Webtoon Life</span>
              <span className="text-[13px] font-medium text-[#8E8E93] tabular-nums">
                · ₩{gameSave.money.toLocaleString()}
              </span>
            </button>

            <div className="flex items-center gap-4 text-[14px] font-medium">
              <button
                id="pulse-open-creator-btn"
                type="button"
                onClick={() => handleLaunchStudio('creator')}
                className="inline-flex items-center gap-1 text-[#007AFF] cursor-pointer ios-press"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Character</span>
              </button>
              <button
                id="pulse-open-studio-btn"
                type="button"
                onClick={() => handleLaunchStudio('studio')}
                className="inline-flex items-center gap-1 text-[#007AFF] cursor-pointer ios-press"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Studio</span>
              </button>
            </div>
          </div>

          {recentPhotos.length > 0 && (
            <div
              style={{ touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
              className="flex items-start gap-3 overflow-x-auto no-scrollbar pt-0.5"
            >
              {recentPhotos.map((photo) => {
                const isSelected = currentUser.avatar === photo.imageDataUrl;
                return (
                  <div
                    key={photo.id}
                    className="w-[116px] shrink-0 flex flex-col gap-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => handleEquipPhotoAsAvatar(photo)}
                      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] cursor-pointer ios-press"
                    >
                      <img
                        src={photo.imageDataUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-sm">
                          <UserCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>

                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[12px] text-[#8E8E93] truncate">
                        {photo.locationName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleShareStudioPhoto(photo)}
                        aria-label="Share game photo to enmmoe+"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#007AFF] shrink-0 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4 & 5. Unified Clean Vertical Feed (Text Posts, Media Posts, Game Shares, Community Content) */}
        <section aria-label="enmmoe+ Feed" className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {posts.map((post) => {
            const isLiked = Boolean(post.userReaction);
            const mediaList = post.mediaUrls || [];
            return (
              <article
                key={post.id}
                className="px-4 py-4 flex items-start gap-3"
              >
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
                  aria-label={post.authorName}
                  className="shrink-0 cursor-pointer ios-press"
                >
                  <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
                </button>

                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Author Header Line */}
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
                    className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left cursor-pointer"
                  >
                    <span className="text-[15px] font-semibold text-black dark:text-white truncate">
                      {post.authorName}
                    </span>
                    {post.authorVerified && <VerifiedBadge size={14} />}
                    <span className="text-[14px] text-[#8E8E93] truncate">
                      @{post.authorUsername}
                    </span>
                    <span className="text-[14px] text-[#8E8E93]">
                      · {formatRelativeTime(post.createdAt)}
                    </span>
                    {post.location && (
                      <span className="text-[13px] text-[#8E8E93] truncate">
                        · {post.location}
                      </span>
                    )}
                  </button>

                  {/* Text Content */}
                  {post.content && (
                    <p className="text-[15px] leading-[1.45] text-black dark:text-white break-words">
                      <EmojiText text={post.content} />
                    </p>
                  )}

                  {/* Photo / Game Capture Media */}
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
                              mediaList.length > 1 ? 'aspect-square w-full' : 'aspect-[16/10] w-full'
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link Preview */}
                  {post.linkPreview && (
                    <a
                      href={post.linkPreview.url}
                      target="_blank"
                      rel="noopener noreferrer"
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
                        {post.linkPreview.description && (
                          <p className="text-[13px] text-[#8E8E93] line-clamp-2">
                            {post.linkPreview.description}
                          </p>
                        )}
                      </div>
                    </a>
                  )}

                  {/* Poll */}
                  {post.poll && (
                    <div className="space-y-2 pt-0.5">
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

                  {/* Post Action Row */}
                  <div className="flex items-center justify-between pt-1 -ml-1.5">
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        onClick={() => onReactPost?.(post.id, 'love')}
                        className={`min-h-[36px] px-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer ios-press ${
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
                        className="min-h-[36px] px-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer ios-press"
                      >
                        <MessageCircle className="w-[18px] h-[18px] stroke-[1.85]" />
                        <span className="tabular-nums">{post.commentsCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleRepost?.(post.id)}
                        className={`min-h-[36px] px-1.5 inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer ios-press ${
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
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {/* Lazy-Loaded 2D Korean Webtoon Life Sim Game */}
      {studioOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] bg-[#FFFDFB] dark:bg-[#121216] flex flex-col items-center justify-center gap-3 text-black dark:text-white">
              <div className="w-8 h-8 rounded-full border-[3px] border-[#F0688E] border-t-transparent animate-spin" />
              <p className="text-[15px] font-medium text-[#8E8E93]">
                Loading enmmoe Webtoon Life...
              </p>
            </div>
          }
        >
          <WebtoonGameModal
            isOpen={studioOpen}
            initialMode={studioInitialMode}
            playerDefaultName={currentUser.name}
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
