import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Flag,
  Heart,
  Link as LinkIcon,
  MapPin,
  MoreHorizontal,
  Music2,
  Pencil,
  Send,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  Story,
  StoryAudience,
  StoryHighlight,
  StoryReplyPermission,
  User,
} from '../types';
import {
  StoryAuthorGroup,
  formatRelativeStoryTime,
  sanitizeExternalUrl,
} from '../utils/storyMedia';
import { useLanguage } from '../utils/i18n';
import { AppleEmoji, EmojiText } from './AppleEmoji';
import { Avatar, BottomSheet, Button, Dialog, VerifiedBadge, useToast } from './ui';

export interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  creators: User[];
  groups: StoryAuthorGroup[];
  initialAuthorId?: string;
  initialSlideIndex?: number;
  highlightMode?: { highlight: StoryHighlight; stories: Story[] } | null;
  onViewStory?: (storyId: string) => void;
  onLikeStory?: (storyId: string) => void;
  onReactStory?: (storyId: string, emoji: string) => void;
  onVotePoll?: (storyId: string, option: 'A' | 'B') => void;
  onAnswerQuestion?: (storyId: string, stickerId: string, answer: string) => void;
  onInteractSticker?: (
    storyId: string,
    payload: { stickerId: string; sliderValue?: number; toggleReminder?: boolean }
  ) => void;
  onSendStoryReply: (story: Story, replyText: string) => void;
  onUpdateStory?: (
    storyId: string,
    updates: {
      caption?: string;
      location?: string;
      audience?: StoryAudience;
      hiddenFromIds?: string[];
      replyPermission?: StoryReplyPermission;
    }
  ) => Promise<void> | void;
  onDeleteStory?: (storyId: string) => Promise<void> | void;
  onMuteAuthor?: (authorId: string) => void;
  onReportStory?: (storyId: string, reason: string) => Promise<void> | void;
  onShareStory?: (story: Story) => void;
  onAddToHighlight?: (story: Story) => void;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  }) => void;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'sexual', label: 'Inappropriate content' },
  { id: 'scam', label: 'Scam or fraud' },
];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  creators,
  groups,
  initialAuthorId,
  initialSlideIndex = 0,
  highlightMode,
  onViewStory,
  onLikeStory,
  onReactStory,
  onVotePoll,
  onAnswerQuestion,
  onInteractSticker,
  onSendStoryReply,
  onUpdateStory,
  onDeleteStory,
  onMuteAuthor,
  onReportStory,
  onShareStory,
  onAddToHighlight,
  onOpenUserProfile,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  // Flatten highlight into a single group when highlightMode is active
  const effectiveGroups = useMemo<StoryAuthorGroup[]>(() => {
    if (highlightMode && highlightMode.stories.length > 0) {
      const first = highlightMode.stories[0];
      return [
        {
          authorId: first.authorId,
          authorName: highlightMode.highlight.title,
          authorUsername: first.authorUsername,
          authorAvatar: highlightMode.highlight.coverImage || first.authorAvatar,
          authorVerified: first.authorVerified,
          stories: highlightMode.stories,
          hasUnseen: false,
          hasCloseFriends: false,
          isMuted: false,
          isOwn: first.authorId === currentUser.id,
          latestCreatedAt: highlightMode.highlight.createdAt,
        },
      ];
    }
    return groups;
  }, [highlightMode, groups, currentUser.id]);

  const [groupIndex, setGroupIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMutedVideo, setIsMutedVideo] = useState(true);
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Swipe-down-to-close gesture state
  const [dragY, setDragY] = useState(0);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Interactive UI sheets
  const [replyText, setReplyText] = useState('');
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({});
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);

  // Edit story metadata temp state
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAudience, setEditAudience] = useState<StoryAudience>('everyone');
  const [editHiddenIds, setEditHiddenIds] = useState<string[]>([]);
  const [editReplyPerm, setEditReplyPerm] = useState<StoryReplyPermission>('everyone');

  // Live countdown ticker
  const [nowTick, setNowTick] = useState(() => Date.now());

  const videoRef = useRef<HTMLVideoElement>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  // Sync initial indices when opening
  useEffect(() => {
    if (!isOpen) {
      setShowViewersSheet(false);
      setShowMenuSheet(false);
      setShowEditSheet(false);
      setShowReportSheet(false);
      setShowDeleteConfirm(false);
      setDragY(0);
      return;
    }
    let startGrp = 0;
    if (initialAuthorId) {
      const idx = effectiveGroups.findIndex((g) => g.authorId === initialAuthorId);
      if (idx >= 0) startGrp = idx;
    }
    const targetGrp = effectiveGroups[startGrp];
    let startSlide = initialSlideIndex;
    if (targetGrp && initialSlideIndex === 0) {
      const firstUnseenIdx = targetGrp.stories.findIndex((s) => !s.isSeen);
      startSlide = firstUnseenIdx >= 0 ? firstUnseenIdx : 0;
    }
    setGroupIndex(startGrp);
    setSlideIndex(startSlide);
    setProgress(0);
    setMediaStatus('loading');
  }, [isOpen, initialAuthorId, initialSlideIndex, effectiveGroups.length]);

  const currentGroup = effectiveGroups[groupIndex];
  const currentStory = currentGroup?.stories[slideIndex] || currentGroup?.stories[0];

  const isSheetOpen =
    showViewersSheet || showMenuSheet || showEditSheet || showReportSheet || showDeleteConfirm;

  // Record view when active slide changes
  useEffect(() => {
    if (!isOpen || !currentStory) return;
    setMediaStatus(currentStory.mediaType === 'text' ? 'ready' : 'loading');
    if (!viewedIdsRef.current.has(currentStory.id)) {
      viewedIdsRef.current.add(currentStory.id);
      onViewStory?.(currentStory.id);
    }
  }, [isOpen, currentStory?.id]);

  // Lazy preload strictly next story slide only (photo)
  useEffect(() => {
    if (!isOpen || !currentGroup) return;
    const nextSlide =
      currentGroup.stories[slideIndex + 1] || effectiveGroups[groupIndex + 1]?.stories[0];
    if (nextSlide && nextSlide.mediaType === 'photo' && nextSlide.mediaUrl) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = nextSlide.mediaUrl;
    }
  }, [isOpen, groupIndex, slideIndex, currentGroup, effectiveGroups]);

  // Countdown tick
  useEffect(() => {
    if (!isOpen) return;
    const hasCountdown = currentStory?.stickers?.some((s) => s.type === 'countdown');
    if (!hasCountdown) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isOpen, currentStory?.id]);

  const handleNext = () => {
    if (!currentGroup) {
      onClose();
      return;
    }
    if (slideIndex < currentGroup.stories.length - 1) {
      setSlideIndex((s) => s + 1);
      setProgress(0);
    } else if (groupIndex < effectiveGroups.length - 1) {
      setGroupIndex((g) => g + 1);
      setSlideIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (slideIndex > 0) {
      setSlideIndex((s) => s - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGrp = effectiveGroups[groupIndex - 1];
      setGroupIndex((g) => g - 1);
      setSlideIndex(Math.max(0, prevGrp.stories.length - 1));
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  // Auto-advance progress timer
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused || isSheetOpen) return;

    if (currentStory.mediaType === 'video') {
      const vid = videoRef.current;
      if (vid && vid.paused) {
        vid.play().catch(() => {});
      }
      const interval = setInterval(() => {
        const el = videoRef.current;
        if (el && el.duration && Number.isFinite(el.duration)) {
          const pct = (el.currentTime / el.duration) * 100;
          setProgress(Math.min(100, pct));
          if (el.ended || pct >= 99.5) {
            handleNext();
          }
        }
      }, 80);
      return () => clearInterval(interval);
    }

    const durationMs = 5500;
    const stepMs = 50;
    const increment = (stepMs / durationMs) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          return 100;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [isOpen, currentStory?.id, currentStory?.mediaType, isPaused, isSheetOpen, groupIndex, slideIndex]);

  useEffect(() => {
    if (progress >= 100 && currentStory?.mediaType !== 'video') {
      handleNext();
    }
  }, [progress]);

  // Pause video when held or sheet opens
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPaused || isSheetOpen) vid.pause();
    else vid.play().catch(() => {});
  }, [isPaused, isSheetOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, groupIndex, slideIndex]);

  if (!isOpen || !currentStory || !currentGroup) return null;

  const isOwnStory = currentStory.authorId === currentUser.id;
  const isLiked = (currentStory.likedByIds || []).includes(currentUser.id);
  const likesCount = currentStory.likesCount ?? currentStory.likedByIds?.length ?? 0;
  const canEditMetadata =
    isOwnStory && (!currentStory.canEditUntil || Date.now() <= currentStory.canEditUntil);

  const canCurrentUserReply = (() => {
    if (isOwnStory) return false;
    const perm = currentStory.replyPermission || 'everyone';
    if (perm === 'off') return false;
    if (perm === 'subscribers') {
      return (currentUser.followingIds || []).includes(currentStory.authorId);
    }
    return true;
  })();

  const handleOpenEdit = () => {
    setEditCaption(currentStory.caption || '');
    setEditLocation(currentStory.location || '');
    setEditAudience(currentStory.audience || 'everyone');
    setEditHiddenIds(currentStory.hiddenFromIds || []);
    setEditReplyPerm(currentStory.replyPermission || 'everyone');
    setShowMenuSheet(false);
    setShowEditSheet(true);
  };

  const handleSaveEdit = async () => {
    if (!onUpdateStory) return;
    await onUpdateStory(currentStory.id, {
      caption: editCaption,
      location: editLocation,
      audience: editAudience,
      hiddenFromIds: editHiddenIds,
      replyPermission: editReplyPerm,
    });
    setShowEditSheet(false);
    showToast(t('story_updated', 'Story details updated'), { type: 'success' });
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = replyText.trim();
    if (!clean) return;
    onSendStoryReply(currentStory, clean);
    setReplyText('');
    showToast(t('reply_sent', 'Reply sent to Messages'), { type: 'success', durationMs: 1800 });
  };

  const formatCountdown = (targetMs?: number) => {
    if (!targetMs) return '00:00:00';
    const rem = Math.max(0, targetMs - nowTick);
    if (rem <= 0) return t('live_now', 'Live Now');
    const hrs = Math.floor(rem / 3600000);
    const mins = Math.floor((rem % 3600000) / 60000);
    const secs = Math.floor((rem % 60000) / 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Real Poll percentage math
  const pollTotal = currentStory.poll
    ? (currentStory.poll.votesA || 0) + (currentStory.poll.votesB || 0)
    : 0;
  const pollPctA =
    pollTotal > 0 ? Math.round(((currentStory.poll?.votesA || 0) / pollTotal) * 100) : 0;
  const pollPctB = pollTotal > 0 ? 100 - pollPctA : 0;

  return (
    <div
      id="story-viewer-modal"
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
    >
      <div
        onTouchStart={(e) => {
          touchStartYRef.current = e.touches[0].clientY;
          touchStartXRef.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          if (touchStartYRef.current === null || isSheetOpen) return;
          const dy = e.touches[0].clientY - touchStartYRef.current;
          const dx = Math.abs(e.touches[0].clientX - (touchStartXRef.current ?? 0));
          if (dy > 10 && dy > dx) {
            setDragY(dy);
            setIsPaused(true);
          }
        }}
        onTouchEnd={() => {
          if (dragY > 100) {
            onClose();
          } else {
            setDragY(0);
            setIsPaused(false);
          }
          touchStartYRef.current = null;
          touchStartXRef.current = null;
        }}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px) scale(${Math.max(0.9, 1 - dragY / 1200)})` : undefined,
        }}
        className="relative w-full h-full max-w-md bg-[#0B0B0F] sm:max-h-[92dvh] sm:rounded-[28px] overflow-hidden flex flex-col justify-between transition-transform duration-150"
      >
        {/* Background Media Layer */}
        <div
          className="absolute inset-0 z-0 flex items-center justify-center bg-black"
          style={
            currentStory.mediaType === 'text'
              ? { background: currentStory.backgroundGradient || 'linear-gradient(155deg, #111827, #09090B)' }
              : undefined
          }
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {currentStory.mediaType === 'photo' && (
            <img
              src={currentStory.mediaUrl}
              alt={currentStory.caption || 'Story'}
              referrerPolicy="no-referrer"
              onLoad={() => setMediaStatus('ready')}
              onError={() => setMediaStatus('error')}
              className="w-full h-full object-cover transition-opacity duration-200"
              style={{
                opacity: mediaStatus === 'ready' ? 1 : 0,
                transform: currentStory.cropTransform
                  ? `scale(${currentStory.cropTransform.scale}) translate(${currentStory.cropTransform.offsetX}px, ${currentStory.cropTransform.offsetY}px)`
                  : undefined,
              }}
            />
          )}

          {currentStory.mediaType === 'video' && (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              poster={currentStory.thumbnailUrl}
              playsInline
              autoPlay
              muted={isMutedVideo}
              onLoadedData={() => setMediaStatus('ready')}
              onError={() => setMediaStatus('error')}
              className="w-full h-full object-cover"
              style={{
                transform: currentStory.cropTransform
                  ? `scale(${currentStory.cropTransform.scale}) translate(${currentStory.cropTransform.offsetX}px, ${currentStory.cropTransform.offsetY}px)`
                  : undefined,
              }}
            />
          )}

          {currentStory.drawingDataUrl && (
            <img
              src={currentStory.drawingDataUrl}
              alt="Story drawing"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}

          {mediaStatus === 'loading' && currentStory.mediaType !== 'text' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-8 h-8 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
            </div>
          )}

          {mediaStatus === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white/75 gap-2">
              <AlertCircle className="w-8 h-8 text-[#8E8E93]" />
              <p className="text-[14px]">Could not load this story media</p>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* Rendered Text Overlays */}
        {(currentStory.textOverlays || []).map((ov) => (
          <div
            key={ov.id}
            style={{
              left: `${ov.x}%`,
              top: `${ov.y}%`,
              transform: 'translate(-50%, -50%)',
              color: ov.color,
              textAlign: ov.align,
            }}
            className={`absolute z-20 max-w-[82%] px-3 py-1.5 rounded-xl font-bold leading-snug pointer-events-none ${
              ov.size === 'sm' ? 'text-[15px]' : ov.size === 'lg' ? 'text-[26px]' : 'text-[20px]'
            } ${
              ov.bgStyle === 'pill'
                ? 'bg-black/65 backdrop-blur-md'
                : ov.bgStyle === 'outline'
                ? 'border border-white/50 bg-black/25'
                : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]'
            }`}
          >
            <EmojiText text={ov.text} emojiSize={ov.size === 'sm' ? 16 : ov.size === 'lg' ? 26 : 20} />
          </div>
        ))}

        {/* Rendered Interactive Stickers */}
        {(currentStory.stickers || []).map((st) => {
          const safeLink = st.type === 'link' && st.url ? sanitizeExternalUrl(st.url) : null;
          const sliderAvg = (() => {
            const vals = Object.values(st.sliderValues || {});
            if (vals.length === 0) return 50;
            return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          })();
          const mySliderVal = st.sliderValues?.[currentUser.id];
          const isReminded = (st.reminderUserIds || []).includes(currentUser.id);

          return (
            <div
              key={st.id}
              style={{
                left: `${st.x}%`,
                top: `${st.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={(e) => e.stopPropagation()}
              className="absolute z-25"
            >
              {st.type === 'emoji' && st.emoji && <AppleEmoji char={st.emoji} size={44} />}

              {st.type === 'mention' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!onOpenUserProfile || !st.userId) return;
                    const found = creators.find((c) => c.id === st.userId);
                    onClose();
                    onOpenUserProfile({
                      id: st.userId,
                      name: st.displayName || found?.name || st.username || 'Creator',
                      username: st.username || found?.username || 'creator',
                      avatar: found?.avatar || '',
                      isVerified: found?.isVerified,
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-[14px] shadow-lg cursor-pointer ios-press"
                >
                  @{st.username}
                </button>
              )}

              {st.type === 'location' && (
                <div className="px-3.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-lg">
                  <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>{st.label}</span>
                </div>
              )}

              {st.type === 'link' && safeLink && (
                <a
                  href={safeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white text-black text-[13px] font-semibold flex items-center gap-1.5 shadow-lg ios-press"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>{st.label || 'Open Link'}</span>
                </a>
              )}

              {st.type === 'countdown' && (
                <div className="px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 text-center shadow-xl min-w-[180px] text-white">
                  <p className="text-[11px] font-semibold text-[#007AFF] uppercase tracking-wider">
                    {st.title}
                  </p>
                  <p className="text-[18px] font-bold tabular-nums mt-0.5">
                    {formatCountdown(st.targetTimestamp)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onInteractSticker?.(currentStory.id, {
                        stickerId: st.id,
                        toggleReminder: true,
                      });
                      showToast(isReminded ? 'Reminder removed' : 'Reminder set', {
                        type: 'success',
                        durationMs: 1600,
                      });
                    }}
                    className={`mt-2 w-full py-1.5 rounded-lg text-[12px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer ${
                      isReminded ? 'bg-[#007AFF] text-white' : 'bg-white/15 text-white'
                    }`}
                  >
                    <Bell className="w-3 h-3" />
                    <span>{isReminded ? t('reminded', 'Reminded') : t('remind_me', 'Remind Me')}</span>
                  </button>
                </div>
              )}

              {st.type === 'question' && (
                <div className="w-[240px] p-3.5 rounded-2xl bg-white text-black shadow-2xl">
                  <p className="text-[13px] font-bold text-center">{st.question}</p>
                  {isOwnStory ? (
                    <p className="text-[12px] text-[#8E8E93] text-center mt-2">
                      {(st.responses || []).length}
                    </p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = (questionDrafts[st.id] || '').trim();
                        if (!val) return;
                        onAnswerQuestion?.(currentStory.id, st.id, val);
                        setQuestionDrafts((prev) => ({ ...prev, [st.id]: '' }));
                        showToast(t('sent', 'Sent'), { type: 'success', durationMs: 1600 });
                      }}
                      className="mt-2.5 flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={questionDrafts[st.id] || ''}
                        onChange={(e) =>
                          setQuestionDrafts((prev) => ({ ...prev, [st.id]: e.target.value }))
                        }
                        placeholder={t('reply', 'Reply')}
                        className="flex-1 h-9 px-2.5 rounded-xl bg-[#F2F2F7] text-[13px] text-black outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!(questionDrafts[st.id] || '').trim()}
                        className="w-9 h-9 rounded-xl bg-[#007AFF] text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                </div>
              )}

              {st.type === 'slider' && (
                <div className="w-[230px] p-3.5 rounded-2xl bg-white text-black shadow-2xl">
                  <p className="text-[13px] font-bold text-center mb-2.5">{st.question}</p>
                  <div className="flex items-center gap-2">
                    <AppleEmoji char={st.sliderEmoji || '🔥'} size={20} />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={mySliderVal ?? sliderAvg}
                      onChange={(e) =>
                        onInteractSticker?.(currentStory.id, {
                          stickerId: st.id,
                          sliderValue: Number(e.target.value),
                        })
                      }
                      className="flex-1 accent-[#007AFF]"
                    />
                  </div>
                  <p className="text-[11px] text-[#8E8E93] text-center mt-1 tabular-nums">
                    Avg {sliderAvg}%
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Tap Zones (Prev / Next Story) */}
        <div
          className="absolute top-20 bottom-28 left-0 w-1/3 z-15 cursor-pointer"
          onClick={handlePrev}
          aria-label="Previous story"
        />
        <div
          className="absolute top-20 bottom-28 right-0 w-2/3 z-15 cursor-pointer"
          onClick={handleNext}
          aria-label="Next story"
        />

        {/* Desktop Subtle Group Switcher Chevrons */}
        {groupIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const prevGrp = effectiveGroups[groupIndex - 1];
              setGroupIndex(groupIndex - 1);
              setSlideIndex(Math.max(0, prevGrp.stories.length - 1));
              setProgress(0);
            }}
            aria-label="Previous author story"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/50 text-white items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {groupIndex < effectiveGroups.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setGroupIndex(groupIndex + 1);
              setSlideIndex(0);
              setProgress(0);
            }}
            aria-label="Next author story"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/50 text-white items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Top Header & Grouped Progress Bars */}
        <div className="relative z-30 pt-safe pt-3 px-4">
          <div className="flex items-center gap-1 mb-3">
            {currentGroup.stories.map((st, idx) => (
              <div
                key={st.id}
                className="h-[2.5px] flex-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < slideIndex
                        ? '100%'
                        : idx === slideIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!onOpenUserProfile) return;
                onClose();
                onOpenUserProfile({
                  id: currentStory.authorId,
                  name: currentStory.authorName,
                  username: currentStory.authorUsername,
                  avatar: currentStory.authorAvatar,
                  isVerified: currentStory.authorVerified,
                });
              }}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer ios-press"
            >
              <Avatar
                src={currentGroup.authorAvatar}
                name={currentGroup.authorName}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-semibold text-white truncate">
                    {currentGroup.authorName}
                  </span>
                  {currentStory.authorVerified && <VerifiedBadge size={13} />}
                  <span className="text-[12px] text-white/70 shrink-0">
                    · {formatRelativeStoryTime(currentStory.createdAt)}
                  </span>
                </div>
                {currentStory.location && (
                  <p className="text-[11px] text-white/80 flex items-center gap-0.5 truncate">
                    <MapPin className="w-3 h-3 text-[#007AFF] shrink-0" />
                    <span className="truncate">{currentStory.location}</span>
                  </p>
                )}
              </div>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              {currentStory.mediaType === 'video' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMutedVideo((m) => !m);
                  }}
                  aria-label={isMutedVideo ? 'Unmute video' : 'Mute video'}
                  className="w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center cursor-pointer"
                >
                  {isMutedVideo ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                id="story-more-options-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenuSheet(true);
                }}
                aria-label={t('story_options', 'Story Options')}
                className="w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center cursor-pointer"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <button
                id="close-story-btn"
                type="button"
                onClick={onClose}
                aria-label={t('close_story', 'Close story')}
                className="w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center/Lower Overlays: Music, Poll, Caption */}
        <div className="relative z-25 px-4 pb-2 pointer-events-none">
          {currentStory.musicTitle && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/55 backdrop-blur-md rounded-full text-white text-[12px] font-medium mb-2.5">
              <Music2 className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>
                {currentStory.musicArtist} — {currentStory.musicTitle}
              </span>
            </div>
          )}

          {currentStory.poll && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mb-3 bg-black/65 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 text-white max-w-xs mx-auto shadow-2xl pointer-events-auto"
            >
              <p className="text-[14px] font-semibold text-center mb-2.5">
                {currentStory.poll.question}
              </p>
              <div className="flex flex-col gap-2">
                {(['A', 'B'] as const).map((opt) => {
                  const isSelected = currentStory.poll?.userVote === opt;
                  const label =
                    opt === 'A' ? currentStory.poll!.optionA : currentStory.poll!.optionB;
                  const pct = opt === 'A' ? pollPctA : pollPctB;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onVotePoll?.(currentStory.id, opt)}
                      className={`w-full py-2.5 px-3 rounded-xl font-medium text-[13px] flex items-center justify-between border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#007AFF] border-[#007AFF] text-white font-semibold'
                          : 'bg-white/12 hover:bg-white/20 border-white/10 text-white'
                      }`}
                    >
                      <span>{label}</span>
                      {currentStory.poll?.userVote && (
                        <span className="text-[12px] font-bold tabular-nums">{pct}%</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStory.caption && (
            <div className="bg-black/45 backdrop-blur-md rounded-xl px-3 py-2 mb-2 text-white text-[14px] max-w-sm">
              <p className="leading-snug">
                <EmojiText text={currentStory.caption} emojiSize={15} />
              </p>
            </div>
          )}
        </div>

        {/* Bottom Interaction Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-30 px-4 pt-2 pb-safe pb-4 bg-gradient-to-t from-black via-black/85 to-transparent"
        >
          {isOwnStory ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                id="story-viewers-btn"
                onClick={() => setShowViewersSheet(true)}
                className="h-11 px-4 rounded-full bg-white/15 backdrop-blur-md text-white text-[14px] font-semibold flex items-center gap-2 cursor-pointer ios-press"
              >
                <Eye className="w-4 h-4 text-[#007AFF]" />
                <span>
                  {currentStory.viewsCount ?? currentStory.viewers?.length ?? 0} {t('views', 'views')}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {onAddToHighlight && (
                  <button
                    type="button"
                    onClick={() => onAddToHighlight(currentStory)}
                    className="h-11 px-3.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[13px] font-medium flex items-center gap-1.5 cursor-pointer ios-press"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{t('highlight', 'Highlight')}</span>
                  </button>
                )}

                {onShareStory && (
                  <button
                    type="button"
                    onClick={() => onShareStory(currentStory)}
                    aria-label={t('share_story', 'Share Story')}
                    className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center cursor-pointer ios-press"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Quick Emoji Bar */}
              <div className="flex items-center justify-around">
                {['🔥', '❤️', '😂', '😍', '👏', '😮'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReactStory?.(currentStory.id, emoji);
                      showToast(`${t('reacted', 'Reacted')} ${emoji}`, { type: 'success', durationMs: 1400 });
                    }}
                    aria-label={emoji}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer ios-press"
                  >
                    <AppleEmoji char={emoji} size={20} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {canCurrentUserReply ? (
                  <form onSubmit={handleSendReply} className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`${t('reply', 'Reply')} ${currentStory.authorName.split(' ')[0]}...`}
                      className="flex-1 h-10 bg-white/15 border border-white/20 rounded-full px-4 text-[14px] text-white placeholder-white/60 focus:outline-none focus:border-[#007AFF] backdrop-blur-md"
                    />
                    {replyText.trim() && (
                      <button
                        type="submit"
                        aria-label={t('send_message', 'Send message')}
                        className="w-10 h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center cursor-pointer ios-press shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="flex-1 h-10 px-4 rounded-full bg-white/10 text-white/60 text-[13px] flex items-center">
                    {currentStory.replyPermission === 'subscribers'
                      ? t('subscribers_only_reply', 'Only subscribers can reply')
                      : t('replies_off', 'Replies are turned off')}
                  </div>
                )}

                <button
                  type="button"
                  id="story-like-btn"
                  onClick={() => onLikeStory?.(currentStory.id)}
                  aria-label={isLiked ? 'Unlike story' : 'Like story'}
                  className="h-10 px-3 rounded-full bg-white/15 text-white flex items-center gap-1.5 cursor-pointer ios-press shrink-0"
                >
                  <Heart
                    className={`w-[18px] h-[18px] ${
                      isLiked ? 'text-[#FF3B30] fill-[#FF3B30]' : 'text-white'
                    }`}
                  />
                  {likesCount > 0 && (
                    <span className="text-[12px] font-medium tabular-nums">{likesCount}</span>
                  )}
                </button>

                {onShareStory && (
                  <button
                    type="button"
                    onClick={() => onShareStory(currentStory)}
                    aria-label="Share story to chat"
                    className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer ios-press shrink-0"
                  >
                    <Share2 className="w-[18px] h-[18px]" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Owner Story Viewers & Responses Sheet */}
      <BottomSheet
        isOpen={showViewersSheet}
        onClose={() => setShowViewersSheet(false)}
        title={`Story Activity (${currentStory.viewsCount ?? currentStory.viewers?.length ?? 0} views)`}
      >
        <div className="p-4 space-y-4">
          {currentStory.poll && (
            <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-1.5">
              <p className="text-[13px] font-semibold">{currentStory.poll.question}</p>
              <div className="flex justify-between text-[13px] text-[#8E8E93]">
                <span>{currentStory.poll.optionA}</span>
                <span className="font-semibold text-black dark:text-white tabular-nums">
                  {currentStory.poll.votesA} votes ({pollPctA}%)
                </span>
              </div>
              <div className="flex justify-between text-[13px] text-[#8E8E93]">
                <span>{currentStory.poll.optionB}</span>
                <span className="font-semibold text-black dark:text-white tabular-nums">
                  {currentStory.poll.votesB} votes ({pollPctB}%)
                </span>
              </div>
            </div>
          )}

          {(currentStory.stickers || [])
            .filter((s) => s.type === 'question' && (s.responses || []).length > 0)
            .map((q) => (
              <div key={q.id} className="space-y-2">
                <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">
                  Answers · {q.question}
                </p>
                {(q.responses || []).map((ans) => (
                  <button
                    key={ans.id}
                    type="button"
                    onClick={() => {
                      setShowViewersSheet(false);
                      onOpenUserProfile?.({
                        id: ans.userId,
                        name: ans.name,
                        username: ans.username,
                        avatar: ans.avatar,
                      });
                    }}
                    className="w-full p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-1 text-left cursor-pointer ios-press"
                  >
                    <p className="text-[13px] font-semibold hover:underline">{ans.name}</p>
                    <p className="text-[14px] text-black/85 dark:text-white/85">{ans.answer}</p>
                  </button>
                ))}
              </div>
            ))}

          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">
              Viewers ({(currentStory.viewers || []).length})
            </p>
            {(currentStory.viewers || []).length === 0 ? (
              <p className="text-[14px] text-[#8E8E93] py-4 text-center">
                No individual viewers recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {(currentStory.viewers || []).map((v) => (
                  <button
                    key={v.userId}
                    type="button"
                    onClick={() => {
                      setShowViewersSheet(false);
                      onOpenUserProfile?.({
                        id: v.userId,
                        name: v.name,
                        username: v.username,
                        avatar: v.avatar,
                      });
                    }}
                    className="w-full py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer ios-press"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={v.avatar} name={v.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold truncate">{v.name}</p>
                        <p className="text-[12px] text-[#8E8E93] truncate">
                          @{v.username} · {formatRelativeStoryTime(v.viewedAt)} ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[16px]">
                      {v.liked && <Heart className="w-4 h-4 text-[#FF3B30] fill-[#FF3B30]" />}
                      {v.reactedEmoji && <AppleEmoji char={v.reactedEmoji} size={18} />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Story Options Menu */}
      <BottomSheet
        isOpen={showMenuSheet}
        onClose={() => setShowMenuSheet(false)}
        title={t('story_options', 'Story Options')}
      >
        <div className="p-4 space-y-2">
          {isOwnStory ? (
            <>
              <button
                type="button"
                disabled={!canEditMetadata}
                onClick={handleOpenEdit}
                className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between text-[16px] cursor-pointer disabled:opacity-45"
              >
                <div className="text-left">
                  <span className="font-medium block">{t('edit_story_details', 'Edit Story Details')}</span>
                  <span className="text-[12px] text-[#8E8E93]">
                    {canEditMetadata
                      ? 'Update caption, location, or audience (preserves views)'
                      : '15-minute post-publish edit window expired'}
                  </span>
                </div>
                <Pencil className="w-5 h-5 text-[#007AFF] shrink-0" />
              </button>

              {onAddToHighlight && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuSheet(false);
                    onAddToHighlight(currentStory);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between text-[16px] cursor-pointer"
                >
                  <span className="font-medium">{t('add_to_highlight', 'Add to Profile Highlight')}</span>
                  <Bookmark className="w-5 h-5 text-[#007AFF]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMenuSheet(false);
                  setShowDeleteConfirm(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between text-[16px] font-semibold text-[#FF3B30] cursor-pointer"
              >
                <span>{t('delete_story', 'Delete Story')}</span>
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowMenuSheet(false);
                  onMuteAuthor?.(currentStory.authorId);
                  showToast(`${t('muted', 'Muted')} · ${currentStory.authorName}`, { type: 'info' });
                  onClose();
                }}
                className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between text-[16px] cursor-pointer"
              >
                <span>{t('settings_mute', 'Mute')} · {currentStory.authorName.split(' ')[0]}</span>
                <EyeOff className="w-5 h-5 text-[#8E8E93]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenuSheet(false);
                  setShowReportSheet(true);
                }}
                className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between text-[16px] font-semibold text-[#FF3B30] cursor-pointer"
              >
                <span>{t('report_story', 'Report Story')}</span>
                <Flag className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* Owner Post-Publish Metadata Edit Sheet */}
      <BottomSheet
        isOpen={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        title={t('edit_story_details', 'Edit Story Details')}
      >
        <div className="p-4 space-y-4">
          <p className="text-[12px] text-[#8E8E93]">
            Caption, location, and audience can be edited within 15 minutes without resetting views
            or reactions. Media pixels cannot be re-cropped after posting.
          </p>

          <textarea
            rows={2}
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            placeholder="Story caption..."
            className="w-full p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white outline-none resize-none"
          />

          <input
            type="text"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white outline-none"
          />

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            {(
              [
                { id: 'everyone', label: 'Everyone' },
                { id: 'subscribers', label: t('subscribers', 'Subscribers') },
                { id: 'close_friends', label: 'Close Friends' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEditAudience(opt.id)}
                className={`py-2 rounded-lg text-[13px] font-semibold cursor-pointer ${
                  editAudience === opt.id
                    ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                    : 'text-[#8E8E93]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button variant="primary" size="md" fullWidth onClick={handleSaveEdit}>
            {t('save_details', 'Save Details')}
          </Button>
        </div>
      </BottomSheet>

      {/* Report Story Sheet */}
      <BottomSheet
        isOpen={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        title={t('report_story', 'Report Story')}
      >
        <div className="p-4 space-y-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={async () => {
                await onReportStory?.(currentStory.id, r.id);
                setShowReportSheet(false);
                showToast(t('report_submitted', 'Report submitted'), { type: 'success' });
                onClose();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-left text-[15px] font-medium cursor-pointer"
            >
              {r.label}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Delete Confirmation */}
      <Dialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('delete_story', 'Delete Story')}
        description="This removes the story from your subscribers' feeds immediately."
        confirmLabel={t('delete', 'Delete')}
        destructive
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await onDeleteStory?.(currentStory.id);
          showToast(t('story_deleted', 'Story deleted'), { type: 'info' });
          onClose();
        }}
      />
    </div>
  );
};
