import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AtSign,
  BarChart2,
  Check,
  Clock,
  Eye,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  Move,
  Palette,
  Pen,
  RotateCcw,
  Save,
  Send,
  Shield,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  Story,
  StoryAudience,
  StoryDraft,
  StoryReplyPermission,
  StorySticker,
  StoryTextOverlay,
  User,
} from '../types';
import { ALL_WEBTOONS } from '../data/webtoonData';
import {
  getStoryDraft,
  processStoryImageFile,
  processStoryVideoFile,
  sanitizeExternalUrl,
  saveStoryDraft,
} from '../utils/storyMedia';
import { Avatar, BottomSheet, Button, Dialog, Toggle, VerifiedBadge, useToast } from './ui';
import { AppleEmoji, EmojiText } from './AppleEmoji';
import { useLanguage } from '../utils/i18n';

export interface StoryCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  creators: User[];
  onPublishStory: (storyPayload: Partial<Story> & { saveToArchive?: boolean }) => Promise<void> | void;
  onUpdatePrivacy?: (updates: Partial<User>) => void;
}

const TEXT_BACKGROUNDS = [
  { id: 'bg-ink', label: 'Midnight', css: 'linear-gradient(155deg, #111827 0%, #09090B 100%)' },
  { id: 'bg-ocean', label: 'Ocean', css: 'linear-gradient(155deg, #007AFF 0%, #003A8C 100%)' },
  { id: 'bg-slate', label: 'Slate', css: 'linear-gradient(155deg, #334155 0%, #0F172A 100%)' },
  { id: 'bg-sunset', label: 'Warm', css: 'linear-gradient(155deg, #7C2D12 0%, #1C1917 100%)' },
  { id: 'bg-plum', label: 'Plum', css: 'linear-gradient(155deg, #4C1D95 0%, #1E1B4B 100%)' },
];

const COLOR_SWATCHES = ['#FFFFFF', '#000000', '#007AFF', '#FFD60A', '#FF3B30', '#C7C7CC'];
const EMOJI_STICKER_CHOICES = ['🔥', '✨', '❤️', '😂', '🎧', '🎨', '👀', '💯', '☕', '🚀'];

export const StoryCreatorModal: React.FC<StoryCreatorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  creators,
  onPublishStory,
  onUpdatePrivacy,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const sampleCovers = ALL_WEBTOONS.slice(0, 4).map((w) => w.coverImage);

  // Media & Canvas State
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'text'>('photo');
  const [mediaUrl, setMediaUrl] = useState<string>(sampleCovers[0] || '');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [mediaHash, setMediaHash] = useState<string>('');
  const [backgroundGradient, setBackgroundGradient] = useState<string>(TEXT_BACKGROUNDS[0].css);
  const [cropTransform, setCropTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);

  // Creative Tools State
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [textOverlays, setTextOverlays] = useState<StoryTextOverlay[]>([]);
  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [poll, setPoll] = useState<{ question: string; optionA: string; optionB: string } | null>(null);

  // Freehand Drawing State
  const [activeTool, setActiveTool] = useState<
    null | 'text' | 'draw' | 'sticker' | 'crop' | 'caption' | 'audience'
  >(null);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(5);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string>('');
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawHistoryRef = useRef<string[]>([]);
  const isDrawingStrokeRef = useRef(false);

  // Text Overlay Editor Temp State
  const [draftOverlayText, setDraftOverlayText] = useState('');
  const [draftOverlayColor, setDraftOverlayColor] = useState('#FFFFFF');
  const [draftOverlaySize, setDraftOverlaySize] = useState<'sm' | 'md' | 'lg'>('md');
  const [draftOverlayAlign, setDraftOverlayAlign] = useState<'left' | 'center' | 'right'>('center');
  const [draftOverlayBg, setDraftOverlayBg] = useState<'none' | 'pill' | 'outline'>('pill');

  // Interactive Sticker Builder Temp State
  const [stickerFormMode, setStickerFormMode] = useState<
    null | 'poll' | 'question' | 'mention' | 'location' | 'link' | 'countdown' | 'slider'
  >(null);
  const [pollQ, setPollQ] = useState('Which vibe do you like better?');
  const [pollA, setPollA] = useState('Option A');
  const [pollB, setPollB] = useState('Option B');
  const [questionPrompt, setQuestionPrompt] = useState('Ask me anything...');
  const [locationText, setLocationText] = useState('');
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkLabelInput, setLinkLabelInput] = useState('Open Link');
  const [countdownTitle, setCountdownTitle] = useState('New Chapter Drop');
  const [countdownHours, setCountdownHours] = useState(24);
  const [sliderQuestion, setSliderQuestion] = useState('How much do you love this?');
  const [sliderEmoji, setSliderEmoji] = useState('🔥');

  // Privacy & Audience State
  const [audience, setAudience] = useState<StoryAudience>(
    currentUser.storyDefaultAudience || 'everyone'
  );
  const [replyPermission, setReplyPermission] = useState<StoryReplyPermission>(
    currentUser.storyReplyPermission || 'everyone'
  );
  const [hiddenFromIds, setHiddenFromIds] = useState<string[]>(
    currentUser.hiddenStoryUserIds || []
  );
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>(
    currentUser.closeFriendIds || []
  );
  const [saveToArchive, setSaveToArchive] = useState<boolean>(
    currentUser.saveStoriesToArchive !== false
  );
  const [isEditingCloseFriends, setIsEditingCloseFriends] = useState(false);

  // Preview, Drafts & Publish
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [savedDraftPrompt, setSavedDraftPrompt] = useState<StoryDraft | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Drag state for overlays/stickers
  const draggingItemRef = useRef<{ kind: 'text' | 'sticker'; id: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const existingDraft = getStoryDraft();
    setSavedDraftPrompt(existingDraft);
    setAudience(currentUser.storyDefaultAudience || 'everyone');
    setReplyPermission(currentUser.storyReplyPermission || 'everyone');
    setHiddenFromIds(currentUser.hiddenStoryUserIds || []);
    setCloseFriendIds(currentUser.closeFriendIds || []);
    setSaveToArchive(currentUser.saveStoriesToArchive !== false);
  }, [isOpen, currentUser]);

  const resetCreator = () => {
    setMediaType('photo');
    setMediaUrl(sampleCovers[0] || '');
    setThumbnailUrl('');
    setMediaHash('');
    setCropTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    setCaption('');
    setLocation('');
    setTextOverlays([]);
    setStickers([]);
    setPoll(null);
    setDrawingDataUrl('');
    drawHistoryRef.current = [];
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx && drawCanvasRef.current) {
      ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    }
    setActiveTool(null);
    setIsPreviewMode(false);
  };

  const applyDraft = (draft: StoryDraft) => {
    setMediaType(draft.mediaType);
    setMediaUrl(draft.mediaUrl);
    setThumbnailUrl(draft.thumbnailUrl || '');
    setBackgroundGradient(draft.backgroundGradient || TEXT_BACKGROUNDS[0].css);
    setCropTransform(draft.cropTransform || { scale: 1, offsetX: 0, offsetY: 0 });
    setCaption(draft.caption || '');
    setLocation(draft.location || '');
    setTextOverlays(draft.textOverlays || []);
    setStickers(draft.stickers || []);
    setPoll(draft.poll || null);
    setDrawingDataUrl(draft.drawingDataUrl || '');
    setAudience(draft.audience || 'everyone');
    setHiddenFromIds(draft.hiddenFromIds || []);
    setReplyPermission(draft.replyPermission || 'everyone');
    setSaveToArchive(draft.saveToArchive !== false);
    setSavedDraftPrompt(null);
    showToast('Draft restored', { type: 'success', durationMs: 1600 });
  };

  const handleSaveDraft = () => {
    const draft: StoryDraft = {
      id: `draft-${Date.now()}`,
      mediaType,
      mediaUrl,
      thumbnailUrl: thumbnailUrl || undefined,
      backgroundGradient: mediaType === 'text' ? backgroundGradient : undefined,
      cropTransform,
      drawingDataUrl: drawingDataUrl || undefined,
      caption: caption.trim() || undefined,
      location: location.trim() || undefined,
      textOverlays,
      stickers,
      poll: poll || undefined,
      audience,
      hiddenFromIds,
      replyPermission,
      saveToArchive,
      savedAt: Date.now(),
    };
    saveStoryDraft(draft);
    showToast('Draft saved', { type: 'success', durationMs: 1800 });
    onClose();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessingMedia(true);
    try {
      if (file.type.startsWith('video/')) {
        const processed = await processStoryVideoFile(file);
        setMediaType('video');
        setMediaUrl(processed.mediaUrl);
        setThumbnailUrl(processed.thumbnailUrl);
        setMediaHash(processed.mediaHash);
        setCropTransform({ scale: 1, offsetX: 0, offsetY: 0 });
        showToast('Video optimized and ready', { type: 'success', durationMs: 1600 });
      } else {
        const processed = await processStoryImageFile(file);
        setMediaType('photo');
        setMediaUrl(processed.mediaUrl);
        setThumbnailUrl(processed.thumbnailUrl);
        setMediaHash(processed.mediaHash);
        setCropTransform({ scale: 1, offsetX: 0, offsetY: 0 });
        showToast('Photo ready', { type: 'success', durationMs: 1600 });
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not process media file.', { type: 'error' });
    } finally {
      setIsProcessingMedia(false);
    }
  };

  // Freehand canvas drawing handlers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleDrawPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'draw') return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    drawHistoryRef.current.push(canvas.toDataURL('image/png'));
    if (drawHistoryRef.current.length > 15) drawHistoryRef.current.shift();

    isDrawingStrokeRef.current = true;
    const pt = getCanvasPoint(e);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handleDrawPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingStrokeRef.current || activeTool !== 'draw') return;
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handleDrawPointerUp = () => {
    if (!isDrawingStrokeRef.current) return;
    isDrawingStrokeRef.current = false;
    const canvas = drawCanvasRef.current;
    if (canvas) {
      setDrawingDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const handleUndoDraw = () => {
    const prev = drawHistoryRef.current.pop();
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!prev) {
      setDrawingDataUrl('');
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setDrawingDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = prev;
  };

  const handleClearDraw = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    drawHistoryRef.current = [];
    setDrawingDataUrl('');
  };

  // Dragging stickers & text overlays inside 9:16 stage
  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingItemRef.current || !stageRef.current || isPreviewMode) return;
    const rect = stageRef.current.getBoundingClientRect();
    const xPct = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(12, Math.min(84, ((e.clientY - rect.top) / rect.height) * 100));
    const { kind, id } = draggingItemRef.current;

    if (kind === 'text') {
      setTextOverlays((prev) =>
        prev.map((ov) => (ov.id === id ? { ...ov, x: xPct, y: yPct } : ov))
      );
    } else {
      setStickers((prev) =>
        prev.map((st) => (st.id === id ? { ...st, x: xPct, y: yPct } : st))
      );
    }
  };

  const handleAddTextOverlay = () => {
    const clean = draftOverlayText.trim();
    if (!clean) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: `txt-${Date.now()}`,
        text: clean,
        color: draftOverlayColor,
        size: draftOverlaySize,
        align: draftOverlayAlign,
        bgStyle: draftOverlayBg,
        x: 50,
        y: 35 + ((prev.length * 10) % 30),
      },
    ]);
    setDraftOverlayText('');
    setActiveTool(null);
  };

  const handleSaveCloseFriends = (nextIds: string[]) => {
    setCloseFriendIds(nextIds);
    onUpdatePrivacy?.({ closeFriendIds: nextIds });
  };

  const handlePublish = async () => {
    if (mediaType !== 'text' && !mediaUrl) {
      showToast('Select photo, video, or switch to Text Story.', { type: 'error' });
      return;
    }
    if (mediaType === 'text' && !caption.trim() && textOverlays.length === 0) {
      showToast('Write text for your text story.', { type: 'error' });
      return;
    }
    setIsPublishing(true);
    try {
      await onPublishStory({
        mediaType,
        mediaUrl: mediaType === 'text' ? '' : mediaUrl,
        thumbnailUrl: thumbnailUrl || (mediaType === 'photo' ? mediaUrl : undefined),
        backgroundGradient: mediaType === 'text' ? backgroundGradient : undefined,
        cropTransform,
        drawingDataUrl: drawingDataUrl || undefined,
        textOverlays,
        stickers,
        poll: poll
          ? {
              question: poll.question,
              optionA: poll.optionA,
              optionB: poll.optionB,
              votesA: 0,
              votesB: 0,
            }
          : undefined,
        caption: caption.trim() || undefined,
        location: location.trim() || undefined,
        audience,
        hiddenFromIds,
        replyPermission,
        saveToArchive,
        mediaHash: mediaHash || undefined,
      });

      saveStoryDraft(null);
      resetCreator();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish story.', { type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  const hasUnsavedWork =
    Boolean(caption.trim()) ||
    textOverlays.length > 0 ||
    stickers.length > 0 ||
    Boolean(poll) ||
    Boolean(drawingDataUrl);

  return (
    <div
      id="story-creator-modal"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center select-none"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Resume Draft Banner */}
      {savedDraftPrompt && (
        <div className="w-full max-w-md px-4 pt-safe pt-2 pb-1 z-30">
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#1C1C1E] border border-white/10 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">{t('saved_draft_available', 'Saved Draft Available')}</p>
              <p className="text-[11px] text-[#8E8E93] truncate">
                {savedDraftPrompt.caption || t('resume_unfinished_story', 'Resume your unfinished story')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  saveStoryDraft(null);
                  setSavedDraftPrompt(null);
                }}
                className="px-2.5 py-1 rounded-lg text-[12px] text-[#8E8E93] hover:text-white cursor-pointer"
              >
                {t('discard', 'Discard')}
              </button>
              <button
                type="button"
                onClick={() => applyDraft(savedDraftPrompt)}
                className="px-3 py-1 rounded-lg bg-[#007AFF] text-white text-[12px] font-semibold cursor-pointer"
              >
                {t('resume', 'Resume')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Portrait 9:16 Studio Frame */}
      <div className="relative w-full max-w-md flex-1 min-h-0 flex flex-col justify-between bg-[#0B0B0F] sm:my-3 sm:rounded-[28px] overflow-hidden">
        {/* Top Controls Bar */}
        <div className="relative z-30 pt-safe px-3 pt-3 pb-2 flex items-center justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent">
          <button
            type="button"
            aria-label="Close Story Studio"
            onClick={() => {
              if (hasUnsavedWork) setShowDiscardConfirm(true);
              else onClose();
            }}
            className="min-w-[44px] min-h-[44px] rounded-full bg-black/45 flex items-center justify-center text-white cursor-pointer ios-press"
          >
            <X className="w-5 h-5" />
          </button>

          {!isPreviewMode ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload photo or video"
                className="h-9 px-3 rounded-full bg-black/50 backdrop-blur-md text-[13px] font-medium flex items-center gap-1.5 cursor-pointer ios-press"
              >
                <Upload className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{t('media_tab', 'Media')}</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType((prev) => (prev === 'text' ? 'photo' : 'text'))}
                aria-label="Text story mode"
                className={`h-9 px-3 rounded-full backdrop-blur-md text-[13px] font-medium cursor-pointer ios-press ${
                  mediaType === 'text' ? 'bg-[#007AFF] text-white' : 'bg-black/50 text-white'
                }`}
              >
                Aa
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewMode(true)}
                aria-label="Preview story"
                className="min-w-[40px] h-9 px-2.5 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center gap-1 text-[13px] cursor-pointer ios-press"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPreviewMode(false)}
              className="h-9 px-4 rounded-full bg-white/15 backdrop-blur-md text-[13px] font-semibold cursor-pointer ios-press"
            >
              {t('exit_preview', 'Exit Preview')}
            </button>
          )}
        </div>

        {/* Interactive Canvas Stage */}
        <div
          ref={stageRef}
          onPointerMove={handleStagePointerMove}
          onPointerUp={() => {
            draggingItemRef.current = null;
          }}
          className="absolute inset-0 z-10 overflow-hidden flex items-center justify-center"
          style={mediaType === 'text' ? { background: backgroundGradient } : undefined}
        >
          {mediaType === 'photo' && mediaUrl && (
            <img
              src={mediaUrl}
              alt="Story canvas"
              className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-100"
              style={{
                transform: `scale(${cropTransform.scale}) translate(${cropTransform.offsetX}px, ${cropTransform.offsetY}px)`,
              }}
            />
          )}

          {mediaType === 'video' && mediaUrl && (
            <video
              src={mediaUrl}
              playsInline
              autoPlay
              loop
              muted
              className="w-full h-full object-cover pointer-events-none"
              style={{
                transform: `scale(${cropTransform.scale}) translate(${cropTransform.offsetX}px, ${cropTransform.offsetY}px)`,
              }}
            />
          )}

          {isProcessingMedia && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-40">
              <div className="w-8 h-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
              <p className="text-[13px] text-white/85">Optimizing media...</p>
            </div>
          )}

          {/* Freehand Draw Layer */}
          <canvas
            ref={drawCanvasRef}
            width={540}
            height={960}
            onPointerDown={handleDrawPointerDown}
            onPointerMove={handleDrawPointerMove}
            onPointerUp={handleDrawPointerUp}
            onPointerLeave={handleDrawPointerUp}
            className={`absolute inset-0 w-full h-full ${
              activeTool === 'draw' ? 'z-20 cursor-crosshair touch-none' : 'z-10 pointer-events-none'
            }`}
          />

          {/* Rendered Text Overlays */}
          {textOverlays.map((ov) => (
            <div
              key={ov.id}
              onPointerDown={(e) => {
                if (isPreviewMode) return;
                e.stopPropagation();
                draggingItemRef.current = { kind: 'text', id: ov.id };
              }}
              style={{
                left: `${ov.x}%`,
                top: `${ov.y}%`,
                transform: 'translate(-50%, -50%)',
                color: ov.color,
                textAlign: ov.align,
              }}
              className={`absolute z-20 max-w-[82%] px-3 py-1.5 rounded-xl font-bold leading-snug cursor-move touch-none ${
                ov.size === 'sm' ? 'text-[15px]' : ov.size === 'lg' ? 'text-[26px]' : 'text-[20px]'
              } ${
                ov.bgStyle === 'pill'
                  ? 'bg-black/65 backdrop-blur-md'
                  : ov.bgStyle === 'outline'
                  ? 'border border-white/50 bg-black/25'
                  : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]'
              }`}
            >
              <span><EmojiText text={ov.text} /></span>
              {!isPreviewMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTextOverlays((prev) => prev.filter((item) => item.id !== ov.id));
                  }}
                  aria-label="Remove text"
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] align-middle"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {/* Rendered Interactive Stickers */}
          {stickers.map((st) => (
            <div
              key={st.id}
              onPointerDown={(e) => {
                if (isPreviewMode) return;
                e.stopPropagation();
                draggingItemRef.current = { kind: 'sticker', id: st.id };
              }}
              style={{
                left: `${st.x}%`,
                top: `${st.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-20 cursor-move touch-none"
            >
              <div className="relative group">
                {st.type === 'emoji' && (
                  <span className="inline-flex items-center justify-center drop-shadow-md">
                    <AppleEmoji char={st.emoji || '✨'} size={44} />
                  </span>
                )}
                {st.type === 'mention' && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-[14px] shadow-lg">
                    @{st.username}
                  </div>
                )}
                {st.type === 'location' && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-lg">
                    <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>{st.label}</span>
                  </div>
                )}
                {st.type === 'link' && (
                  <div className="px-3.5 py-2 rounded-xl bg-white text-black text-[13px] font-semibold flex items-center gap-1.5 shadow-lg">
                    <LinkIcon className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>{st.label || 'Open Link'}</span>
                  </div>
                )}
                {st.type === 'countdown' && (
                  <div className="px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 text-center shadow-xl min-w-[170px]">
                    <p className="text-[11px] font-semibold text-[#007AFF] uppercase tracking-wider">
                      {st.title}
                    </p>
                    <p className="text-[18px] font-bold tabular-nums mt-0.5">23:59:59</p>
                  </div>
                )}
                {st.type === 'question' && (
                  <div className="px-4 py-3 rounded-2xl bg-white text-black text-center shadow-xl min-w-[200px]">
                    <p className="text-[13px] font-bold">{st.question}</p>
                    <div className="mt-2 py-1.5 px-3 rounded-lg bg-[#F2F2F7] text-[#8E8E93] text-[12px]">
                      {t('type_a_message', 'Type something...')}
                    </div>
                  </div>
                )}
                {st.type === 'slider' && (
                  <div className="px-4 py-3 rounded-2xl bg-white text-black text-center shadow-xl min-w-[200px]">
                    <p className="text-[13px] font-bold mb-2">{st.question}</p>
                    <div className="h-2 rounded-full bg-[#F2F2F7] relative flex items-center">
                      <div className="w-1/2 h-full rounded-full bg-[#007AFF]" />
                      <span className="-ml-2 inline-flex items-center">
                        <AppleEmoji char={st.sliderEmoji || '🔥'} size={20} />
                      </span>
                    </div>
                  </div>
                )}

                {!isPreviewMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStickers((prev) => prev.filter((item) => item.id !== st.id));
                    }}
                    aria-label="Remove sticker"
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 border border-white/25 text-white text-[11px] flex items-center justify-center"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Attached Poll Preview */}
          {poll && (
            <div className="relative z-20 w-[240px] p-3.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/15 text-white shadow-2xl">
              <p className="text-[13px] font-semibold text-center mb-2">{poll.question}</p>
              <div className="space-y-1.5">
                <div className="px-3 py-2 rounded-xl bg-white/15 text-[12px] font-medium">
                  {poll.optionA}
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/15 text-[12px] font-medium">
                  {poll.optionB}
                </div>
              </div>
              {!isPreviewMode && (
                <button
                  type="button"
                  onClick={() => setPoll(null)}
                  aria-label="Remove poll"
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black border border-white/25 text-white text-[11px] flex items-center justify-center cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Text Story Quick Caption Centered */}
          {mediaType === 'text' && caption && (
            <div className="relative z-20 px-8 text-center pointer-events-none">
              <p className="text-[24px] font-bold leading-snug text-white drop-shadow-md">
                <EmojiText text={caption} />
              </p>
            </div>
          )}
        </div>

        {/* Right Side Creative Tool Strip */}
        {!isPreviewMode && (
          <div className="relative z-30 self-end px-3 flex flex-col gap-2 my-auto">
            {[
              { id: 'text' as const, icon: Type, label: 'Add text' },
              { id: 'draw' as const, icon: Pen, label: 'Draw' },
              { id: 'sticker' as const, icon: Smile, label: 'Stickers & Tools' },
              ...(mediaType !== 'text'
                ? [{ id: 'crop' as const, icon: Move, label: 'Crop & Zoom' }]
                : []),
              { id: 'caption' as const, icon: Sparkles, label: 'Caption' },
              { id: 'audience' as const, icon: Shield, label: 'Audience & Privacy' },
            ].map((tool) => {
              const Icon = tool.icon;
              const active = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(active ? null : tool.id)}
                  aria-label={tool.label}
                  className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer ios-press ${
                    active
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </button>
              );
            })}
          </div>
        )}

        {/* Active Inline Tool Drawers (Draw bar, Text backdrop picker, Crop sliders) */}
        {!isPreviewMode && activeTool === 'draw' && (
          <div className="relative z-30 mx-3 mb-2 p-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {COLOR_SWATCHES.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setDrawColor(col)}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                    drawColor === col ? 'border-[#007AFF] scale-110' : 'border-white/40'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUndoDraw}
                aria-label="Undo brush stroke"
                className="px-2.5 py-1 rounded-lg bg-white/15 text-[12px] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleClearDraw}
                className="px-2.5 py-1 rounded-lg bg-white/15 text-[12px] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {!isPreviewMode && activeTool === 'crop' && mediaType !== 'text' && (
          <div className="relative z-30 mx-3 mb-2 p-3 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-white/80">Zoom &amp; Reposition</span>
              <button
                type="button"
                onClick={() => setCropTransform({ scale: 1, offsetX: 0, offsetY: 0 })}
                className="text-[#007AFF] font-semibold cursor-pointer"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-white/70">
              <label className="space-y-1">
                <span>Zoom ({cropTransform.scale.toFixed(1)}×)</span>
                <input
                  type="range"
                  min={1}
                  max={2.4}
                  step={0.1}
                  value={cropTransform.scale}
                  onChange={(e) =>
                    setCropTransform((p) => ({ ...p, scale: Number(e.target.value) }))
                  }
                  className="w-full accent-[#007AFF]"
                />
              </label>
              <label className="space-y-1">
                <span>Pan X</span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={2}
                  value={cropTransform.offsetX}
                  onChange={(e) =>
                    setCropTransform((p) => ({ ...p, offsetX: Number(e.target.value) }))
                  }
                  className="w-full accent-[#007AFF]"
                />
              </label>
              <label className="space-y-1">
                <span>Pan Y</span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={2}
                  value={cropTransform.offsetY}
                  onChange={(e) =>
                    setCropTransform((p) => ({ ...p, offsetY: Number(e.target.value) }))
                  }
                  className="w-full accent-[#007AFF]"
                />
              </label>
            </div>
          </div>
        )}

        {/* Quick Preset Strip (Artworks / Text Backdrops) */}
        {!isPreviewMode && !activeTool && (
          <div className="relative z-30 px-3 pb-2">
            {mediaType === 'text' ? (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {TEXT_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBackgroundGradient(bg.css)}
                    className={`w-9 h-9 rounded-full shrink-0 border-2 cursor-pointer ${
                      backgroundGradient === bg.css ? 'border-[#007AFF]' : 'border-white/30'
                    }`}
                    style={{ background: bg.css }}
                    aria-label={bg.label}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {sampleCovers.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMediaType('photo');
                      setMediaUrl(img);
                      setThumbnailUrl(img);
                    }}
                    className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer ${
                      mediaUrl === img ? 'border-[#007AFF]' : 'border-white/25'
                    }`}
                  >
                    <img src={img} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Publish Bar */}
        <div className="relative z-30 px-3 pb-safe pb-3 pt-2 bg-gradient-to-t from-black via-black/85 to-transparent flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActiveTool('audience')}
            className="h-11 px-3.5 rounded-full bg-white/12 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer ios-press"
          >
            <Shield className="w-4 h-4 text-[#007AFF]" />
              <span>
                {audience === 'close_friends'
                  ? t('close_friends', 'Close Friends')
                  : audience === 'subscribers'
                  ? t('subscribers', 'Subscribers')
                  : t('everyone', 'Everyone')}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                aria-label="Save draft"
                className="h-11 px-3.5 rounded-full bg-white/12 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer ios-press"
              >
                <Save className="w-4 h-4" />
                <span>{t('create_draft', 'Draft')}</span>
              </button>

              <button
                id="story-creator-publish-btn"
                type="button"
                disabled={isPublishing || isProcessingMedia}
                onClick={handlePublish}
                className="h-11 px-5 rounded-full bg-[#007AFF] hover:bg-[#0066D6] text-white text-[14px] font-semibold flex items-center gap-1.5 cursor-pointer ios-press disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isPublishing ? t('sharing', 'Sharing...') : t('share_story', 'Share Story')}</span>
              </button>
            </div>
        </div>
      </div>

      {/* Sub-Sheet: Text Overlay Builder */}
      <BottomSheet
        isOpen={activeTool === 'text'}
        onClose={() => setActiveTool(null)}
        title="Add Text Overlay"
      >
        <div className="p-4 space-y-4">
          <textarea
            rows={2}
            value={draftOverlayText}
            onChange={(e) => setDraftOverlayText(e.target.value)}
            placeholder="Write something to place on your story..."
            className="w-full p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[16px] text-black dark:text-white outline-none resize-none"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setDraftOverlaySize(sz)}
                  className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold cursor-pointer ${
                    draftOverlaySize === sz
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]'
                  }`}
                >
                  {sz.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: 'left' as const, icon: AlignLeft },
                { id: 'center' as const, icon: AlignCenter },
                { id: 'right' as const, icon: AlignRight },
              ].map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setDraftOverlayAlign(a.id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer ${
                      draftOverlayAlign === a.id
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {COLOR_SWATCHES.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setDraftOverlayColor(col)}
                  className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                    draftOverlayColor === col ? 'border-[#007AFF] scale-110' : 'border-black/15'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              {(['pill', 'outline', 'none'] as const).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setDraftOverlayBg(bg)}
                  className={`px-2.5 py-1.5 rounded-xl text-[12px] font-medium capitalize cursor-pointer ${
                    draftOverlayBg === bg
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" size="md" fullWidth onClick={handleAddTextOverlay} disabled={!draftOverlayText.trim()}>
            Place on Story
          </Button>
        </div>
      </BottomSheet>

      {/* Sub-Sheet: Stickers & Interactive Story Tools */}
      <BottomSheet
        isOpen={activeTool === 'sticker'}
        onClose={() => {
          setActiveTool(null);
          setStickerFormMode(null);
        }}
        title="Stickers & Interactive Tools"
      >
        <div className="p-4 space-y-4">
          {!stickerFormMode ? (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'poll' as const, label: 'Poll', icon: BarChart2 },
                  { id: 'question' as const, label: 'Questions', icon: HelpCircle },
                  { id: 'mention' as const, label: '@Mention', icon: AtSign },
                  { id: 'location' as const, label: 'Location', icon: MapPin },
                  { id: 'link' as const, label: 'Link', icon: LinkIcon },
                  { id: 'countdown' as const, label: 'Countdown', icon: Clock },
                  { id: 'slider' as const, label: 'Slider', icon: SlidersHorizontal },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStickerFormMode(item.id)}
                      className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex flex-col items-center gap-1.5 cursor-pointer ios-press"
                    >
                      <Icon className="w-5 h-5 text-[#007AFF]" />
                      <span className="text-[13px] font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <p className="text-[12px] font-medium text-[#8E8E93] uppercase mb-2">
                  Emoji Stickers
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {EMOJI_STICKER_CHOICES.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setStickers((prev) => [
                          ...prev,
                          { id: `em-${Date.now()}`, type: 'emoji', emoji: em, x: 50, y: 45 },
                        ]);
                        setActiveTool(null);
                      }}
                      className="h-12 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center cursor-pointer ios-press"
                    >
                      <AppleEmoji char={em} size={26} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : stickerFormMode === 'poll' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={pollQ}
                onChange={(e) => setPollQ(e.target.value)}
                placeholder="Ask a question..."
                className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={pollA}
                  onChange={(e) => setPollA(e.target.value)}
                  placeholder="Option A"
                  className="h-11 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] outline-none"
                />
                <input
                  type="text"
                  value={pollB}
                  onChange={(e) => setPollB(e.target.value)}
                  placeholder="Option B"
                  className="h-11 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStickerFormMode(null)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    setPoll({
                      question: pollQ.trim() || 'Vote below',
                      optionA: pollA.trim() || 'Yes',
                      optionB: pollB.trim() || 'No',
                    });
                    setStickerFormMode(null);
                    setActiveTool(null);
                  }}
                >
                  Add Poll
                </Button>
              </div>
            </div>
          ) : stickerFormMode === 'question' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={questionPrompt}
                onChange={(e) => setQuestionPrompt(e.target.value)}
                placeholder="Prompt for viewers..."
                className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] outline-none"
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStickerFormMode(null)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    setStickers((prev) => [
                      ...prev,
                      {
                        id: `q-${Date.now()}`,
                        type: 'question',
                        question: questionPrompt.trim() || 'Ask me anything',
                        responses: [],
                        x: 50,
                        y: 52,
                      },
                    ]);
                    setStickerFormMode(null);
                    setActiveTool(null);
                  }}
                >
                  Add Question Box
                </Button>
              </div>
            </div>
          ) : stickerFormMode === 'mention' ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {creators.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setStickers((prev) => [
                      ...prev,
                      {
                        id: `men-${Date.now()}`,
                        type: 'mention',
                        userId: c.id,
                        username: c.username,
                        displayName: c.name,
                        x: 50,
                        y: 44,
                      },
                    ]);
                    setStickerFormMode(null);
                    setActiveTool(null);
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center gap-3 text-left cursor-pointer"
                >
                  <Avatar src={c.avatar} name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[14px] font-semibold truncate">{c.name}</span>
                      {c.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <p className="text-[12px] text-[#8E8E93] truncate">@{c.username}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : stickerFormMode === 'location' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="City, neighborhood, or spot"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] outline-none"
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStickerFormMode(null)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  disabled={!locationText.trim()}
                  onClick={() => {
                    setLocation(locationText.trim());
                    setStickers((prev) => [
                      ...prev,
                      { id: `loc-${Date.now()}`, type: 'location', label: locationText.trim(), x: 50, y: 38 },
                    ]);
                    setStickerFormMode(null);
                    setActiveTool(null);
                  }}
                >
                  Add Location
                </Button>
              </div>
            </div>
          ) : stickerFormMode === 'link' ? (
            <div className="space-y-3">
              <input
                type="url"
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] outline-none"
              />
              <input
                type="text"
                value={linkLabelInput}
                onChange={(e) => setLinkLabelInput(e.target.value)}
                placeholder="Button label (e.g. Read Episode)"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] outline-none"
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStickerFormMode(null)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    const safeUrl = sanitizeExternalUrl(linkUrlInput);
                    if (!safeUrl) {
                      showToast('Enter a valid https:// link URL', { type: 'error' });
                      return;
                    }
                    setStickers((prev) => [
                      ...prev,
                      {
                        id: `lnk-${Date.now()}`,
                        type: 'link',
                        url: safeUrl,
                        label: linkLabelInput.trim() || 'Open Link',
                        x: 50,
                        y: 62,
                      },
                    ]);
                    setLinkUrlInput('');
                    setStickerFormMode(null);
                    setActiveTool(null);
                  }}
                >
                  Add Link Sticker
                </Button>
              </div>
            </div>
          ) : stickerFormMode === 'countdown' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={countdownTitle}
                onChange={(e) => setCountdownTitle(e.target.value)}
                placeholder="Countdown event title"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                {[1, 12, 24].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setCountdownHours(hrs)}
                    className={`py-2 rounded-xl text-[13px] font-semibold cursor-pointer ${
                      countdownHours === hrs
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E]'
                    }`}
                  >
                    In {hrs}h
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStickerFormMode(null)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    setStickers((prev) => [
                      ...prev,
                      {
                        id: `cd-${Date.now()}`,
                        type: 'countdown',
                        title: countdownTitle.trim() || 'Premiere',
                        targetTimestamp: Date.now() + countdownHours * 3600 * 1000,
                        reminderUserIds: [],
                        x: 50,
                        y: 48,
                      },
                    ]);
                    setStickerFormMode(null);
                    setActiveTool(null);
                  }}
                >
                  Add Countdown
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={sliderQuestion}
                onChange={(e) => setSliderQuestion(e.target.value)}
                placeholder="Slider prompt"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] outline-none"
              />
              <div className="flex items-center gap-2">
                {['🔥', '❤️', '😍', '⚡', '🎉'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSliderEmoji(em)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ${
                      sliderEmoji === em
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E]'
                    }`}
                  >
                    <AppleEmoji char={em} size={22} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStickerFormMode(null)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    setStickers((prev) => [
                      ...prev,
                      {
                        id: `sl-${Date.now()}`,
                        type: 'slider',
                        question: sliderQuestion.trim() || 'Rate this',
                        sliderEmoji,
                        sliderValues: {},
                        x: 50,
                        y: 58,
                      },
                    ]);
                    setStickerFormMode(null);
                    setActiveTool(null);
                  }}
                >
                  Add Emoji Slider
                </Button>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Sub-Sheet: Caption & Location */}
      <BottomSheet
        isOpen={activeTool === 'caption'}
        onClose={() => setActiveTool(null)}
        title="Caption & Location"
      >
        <div className="p-4 space-y-3">
          <textarea
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption for your story..."
            className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white outline-none resize-none"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location (optional)"
            className="w-full h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white outline-none"
          />
          <Button variant="primary" size="md" fullWidth onClick={() => setActiveTool(null)}>
            Done
          </Button>
        </div>
      </BottomSheet>

      {/* Sub-Sheet: Audience, Close Friends & Story Privacy */}
      <BottomSheet
        isOpen={activeTool === 'audience'}
        onClose={() => {
          setActiveTool(null);
          setIsEditingCloseFriends(false);
        }}
        title={isEditingCloseFriends ? 'Close Friends' : 'Story Audience & Privacy'}
      >
        {isEditingCloseFriends ? (
          <div className="p-4 space-y-3">
            <p className="text-[13px] text-[#8E8E93]">
              Only people selected here can view stories shared to Close Friends.
            </p>
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] max-h-64 overflow-y-auto">
              {creators.map((c) => {
                const isCf = closeFriendIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const next = isCf
                        ? closeFriendIds.filter((id) => id !== c.id)
                        : [...closeFriendIds, c.id];
                      handleSaveCloseFriends(next);
                    }}
                    className="w-full py-2.5 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={c.avatar} name={c.name} size="sm" />
                      <div>
                        <p className="text-[15px] font-semibold">{c.name}</p>
                        <p className="text-[12px] text-[#8E8E93]">@{c.username}</p>
                      </div>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                        isCf
                          ? 'bg-[#007AFF] border-[#007AFF] text-white'
                          : 'border-[#C7C7CC] dark:border-[#3A3A3C]'
                      }`}
                    >
                      {isCf && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button variant="primary" size="md" fullWidth onClick={() => setIsEditingCloseFriends(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">Who Can See</p>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                {[
                  { id: 'everyone' as const, label: 'Everyone' },
                  { id: 'subscribers' as const, label: 'Subscribers' },
                  { id: 'close_friends' as const, label: 'Close Friends' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAudience(opt.id)}
                    className={`py-2 rounded-lg text-[13px] font-semibold cursor-pointer ${
                      audience === opt.id
                        ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCloseFriends(true)}
                className="text-[13px] font-medium text-[#007AFF] cursor-pointer pt-0.5"
              >
                Manage Close Friends ({closeFriendIds.length})
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">Allow Replies</p>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                {[
                  { id: 'everyone' as const, label: 'Everyone' },
                  { id: 'subscribers' as const, label: 'Subscribers' },
                  { id: 'off' as const, label: 'Off' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReplyPermission(opt.id)}
                    className={`py-2 rounded-lg text-[13px] font-semibold cursor-pointer ${
                      replyPermission === opt.id
                        ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">
                Hide Story From ({hiddenFromIds.length})
              </p>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {creators.map((c) => {
                  const hidden = hiddenFromIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setHiddenFromIds((prev) =>
                          hidden ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium shrink-0 cursor-pointer ${
                        hidden
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white'
                      }`}
                    >
                      {c.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold">Save to Archive</p>
                <p className="text-[12px] text-[#8E8E93]">Keep in private archive for Highlights</p>
              </div>
              <Toggle checked={saveToArchive} onChange={setSaveToArchive} ariaLabel="Save to archive" />
            </div>

            <Button variant="primary" size="md" fullWidth onClick={() => setActiveTool(null)}>
              Apply Settings
            </Button>
          </div>
        )}
      </BottomSheet>

      {/* Discard / Save Draft Confirmation */}
      <Dialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        title="Discard Story?"
        description="You can save your work as a draft to finish later, or discard it now."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setShowDiscardConfirm(false);
          resetCreator();
          onClose();
        }}
      />
    </div>
  );
};
