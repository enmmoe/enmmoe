import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Download,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { getAssetFromCache, deleteAssetFromCache } from '../assetCache';
import {
  getPlayerRefAssetId,
  requestArtworkGeneration,
} from '../artworkGenerator';
import { MAIN_CHARACTERS } from '../characterData';
import { renderStudioCompositionToPng } from '../photoStudioExport';
import { getAllCatalogOutfits, getOutfitById } from '../saveSystem';
import {
  ArtworkGenerationState,
  ExpressionId,
  LocationId,
  OutfitItem,
  PlayerCharacter,
  SavedStudioCreation,
  StudioFrameId,
  StudioPhotoMode,
  StudioPoseId,
  TimeOfDay,
} from '../types';
import { LocationIllustrationBackdrop, WebtoonPortrait } from '../webtoonArt';

const EXPRESSIONS: Array<{ id: ExpressionId; label: string }> = [
  { id: 'smiling', label: 'Smiling' },
  { id: 'happy', label: 'Happy' },
  { id: 'shy', label: 'Shy' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'sad', label: 'Sad' },
  { id: 'angry', label: 'Angry' },
];

const POSES: Array<{ id: StudioPoseId; label: string }> = [
  { id: 'wave', label: 'Natural' },
  { id: 'heart', label: 'Hand Heart' },
  { id: 'peace', label: 'Peace Sign' },
  { id: 'cafe_pose', label: 'Café Candid' },
  { id: 'editorial', label: 'Editorial' },
];

const FRAMES: Array<{ id: StudioFrameId; label: string }> = [
  { id: 'pastel_ribbon', label: 'Pastel Ribbon' },
  { id: 'polaroid_seoul', label: 'Polaroid Seoul' },
  { id: 'webtoon_panel', label: 'Webtoon Ink' },
  { id: 'floral_diary', label: 'Diary Border' },
  { id: 'minimal_white', label: 'Clean White' },
];

const BACKGROUNDS: Array<{ id: LocationId; label: string }> = [
  { id: 'photo_studio', label: 'Studio Backdrop' },
  { id: 'cafe', label: 'Cafe Bomnal' },
  { id: 'park', label: 'Blossom Park' },
  { id: 'boutique', label: 'Atelier' },
  { id: 'street', label: 'Seongsu Street' },
];

const STICKERS = ['Seoul Day', 'OOTD ✨', 'Bomnal Date', 'Chapter 1'];

export interface PhotoStudioViewProps {
  player: PlayerCharacter;
  timeOfDay: TimeOfDay;
  ownedOutfitIds: string[];
  customOutfits: OutfitItem[];
  studioGallery: SavedStudioCreation[];
  onSavePhoto: (creation: SavedStudioCreation, dataUrl: string) => void;
  onDeletePhoto: (creationId: string, assetId: string) => void;
  onSharePhotoToFeed?: (dataUrl: string, caption: string) => void;
  onSetAvatar?: (dataUrl: string) => void;
}

export const PhotoStudioView: React.FC<PhotoStudioViewProps> = ({
  player,
  timeOfDay,
  ownedOutfitIds,
  customOutfits,
  studioGallery,
  onSavePhoto,
  onDeletePhoto,
  onSharePhotoToFeed,
  onSetAvatar,
}) => {
  const [mode, setMode] = useState<StudioPhotoMode>('solo');
  const [backgroundId, setBackgroundId] = useState<LocationId>('photo_studio');
  const [partnerId, setPartnerId] = useState<string>(MAIN_CHARACTERS[0].id);
  const [expression, setExpression] = useState<ExpressionId>('smiling');
  const [pose, setPose] = useState<StudioPoseId>('heart');
  const [frame, setFrame] = useState<StudioFrameId>('pastel_ribbon');
  const [selectedStickers, setSelectedStickers] = useState<string[]>(['Seoul Day']);
  const [caption, setCaption] = useState('');
  const [outfitId, setOutfitId] = useState(player.equippedOutfitId);
  const [exportedPng, setExportedPng] = useState<string | null>(null);
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiSceneState, setAiSceneState] = useState<ArtworkGenerationState>({ status: 'idle' });

  const primarySvgRef = useRef<SVGSVGElement | null>(null);
  const partnerSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setOutfitId(player.equippedOutfitId);
  }, [player.equippedOutfitId]);

  useEffect(() => {
    let active = true;
    Promise.all(
      studioGallery.map(async (item) => {
        const rec = await getAssetFromCache(item.assetId);
        return [item.id, rec?.dataUrl || ''] as const;
      })
    ).then((pairs) => {
      if (!active) return;
      const next: Record<string, string> = {};
      for (const [id, url] of pairs) {
        if (url) next[id] = url;
      }
      setCachedUrls(next);
    });
    return () => {
      active = false;
    };
  }, [studioGallery]);

  const partner = MAIN_CHARACTERS.find((c) => c.id === partnerId) || MAIN_CHARACTERS[0];
  const allOwnedOutfits = getAllCatalogOutfits(customOutfits).filter((o) =>
    ownedOutfitIds.includes(o.id)
  );
  const chosenOutfit = getOutfitById(outfitId, customOutfits);
  const partnerOutfit = getOutfitById(partner.appearance.equippedOutfitId, customOutfits);

  const primarySubjectAppearance =
    mode === 'character' ? partner.appearance : player;
  const primarySubjectOutfit =
    mode === 'character' ? partnerOutfit : chosenOutfit;

  const toggleSticker = (st: string) => {
    setSelectedStickers((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st].slice(-2)
    );
  };

  const handleCapture = async () => {
    setSaving(true);
    try {
      const id = `studio_${Date.now()}`;
      const assetId = `photo:${id}`;
      const { pngDataUrl, compressedDataUrl } = await renderStudioCompositionToPng({
        assetId,
        mode,
        backgroundId,
        timeOfDay,
        frame,
        stickers: selectedStickers,
        caption,
        primarySvg: primarySvgRef.current,
        partnerSvg: mode === 'couple' ? partnerSvgRef.current : null,
      });

      const creation: SavedStudioCreation = {
        id,
        title:
          mode === 'couple'
            ? `${player.name} & ${partner.name.split(' ')[0]}`
            : mode === 'character'
            ? partner.name
            : `${player.name} Studio Cut`,
        mode,
        backgroundId,
        partnerId: mode === 'couple' || mode === 'character' ? partner.id : undefined,
        pose,
        expression,
        frame,
        stickers: selectedStickers,
        caption: caption.trim(),
        outfitId: chosenOutfit.id,
        assetId,
        createdAt: Date.now(),
      };

      setExportedPng(pngDataUrl);
      setCachedUrls((prev) => ({ ...prev, [creation.id]: compressedDataUrl }));
      onSavePhoto(creation, compressedDataUrl);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPng = () => {
    if (!exportedPng) return;
    const link = document.createElement('a');
    link.href = exportedPng;
    link.download = `enmmoe-studio-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRequestGeminiPhotoScene = async () => {
    setAiSceneState({ status: 'loading', message: 'Requesting Gemini photo scene...' });
    const res = await requestArtworkGeneration({
      assetId: `gemini:scene:${Date.now()}`,
      kind: 'story_scene',
      characterId: player.id,
      prompt: `Korean webtoon photo booth portrait of ${
        mode === 'couple' ? `${player.name} together with ${partner.name}` : player.name
      } at ${backgroundId.replace('_', ' ')}, ${expression} expression, wearing ${
        chosenOutfit.name
      }, caption "${caption || 'Seoul memories'}".`,
      aspectRatio: '3:4',
      referenceAssetId: getPlayerRefAssetId(player),
      forceRegenerate: true,
    });
    setAiSceneState(res);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFDFB] dark:bg-[#121216] text-[#2F242D] dark:text-white overflow-y-auto pb-20">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight">Photo Studio</h2>
          <p className="text-[12px] text-[#8A7D85]">
            Compose, save to IndexedDB, download PNG, or share to enmmoe+
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleCapture}
          className="min-h-[40px] px-4 rounded-full bg-[#007AFF] text-white text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ios-press disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Snap & Save'}</span>
        </button>
      </div>

      {/* Live Frame Composition Stage */}
      <div className="px-4 py-2">
        <div
          className={`mx-auto max-w-[300px] aspect-[4/5] rounded-3xl p-3 flex flex-col shadow-md border ${
            frame === 'webtoon_panel'
              ? 'bg-white border-2 border-[#3A2C36] rounded-xl'
              : frame === 'pastel_ribbon'
              ? 'bg-[#FFF2F6] border-[#F39CB2]'
              : frame === 'floral_diary'
              ? 'bg-[#F7F3FF] border-[#B59DF0]'
              : 'bg-white border-black/10 dark:bg-[#1C1B24] dark:border-white/15'
          }`}
        >
          <div className="relative flex-1 rounded-2xl overflow-hidden flex items-end justify-center">
            <LocationIllustrationBackdrop
              location={backgroundId}
              timeOfDay={timeOfDay}
              className="absolute inset-0"
            />

            {/* Stickers Preview */}
            {selectedStickers.length > 0 && (
              <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap gap-1.5">
                {selectedStickers.map((st) => (
                  <span
                    key={st}
                    className="px-2.5 py-0.5 rounded-full bg-white/90 text-[#3A2C36] text-[11px] font-semibold shadow-sm"
                  >
                    {st}
                  </span>
                ))}
              </div>
            )}

            {/* Character(s) Preview */}
            {mode === 'couple' ? (
              <div className="relative z-10 w-full flex items-end justify-center px-1">
                <div className="w-[54%] aspect-[240/290] -mr-4">
                  <WebtoonPortrait
                    svgRef={primarySvgRef}
                    appearance={player}
                    outfit={chosenOutfit}
                    expression={expression}
                    pose={pose}
                    className="w-full h-full"
                  />
                </div>
                <div className="w-[54%] aspect-[240/290] -ml-4">
                  <WebtoonPortrait
                    svgRef={partnerSvgRef}
                    appearance={partner.appearance}
                    outfit={partnerOutfit}
                    expression={expression === 'angry' ? 'surprised' : expression}
                    pose={pose === 'heart' ? 'heart' : 'wave'}
                    className="w-full h-full"
                  />
                </div>
              </div>
            ) : (
              <div className="relative z-10 w-[82%] aspect-[240/290]">
                <WebtoonPortrait
                  svgRef={primarySvgRef}
                  appearance={primarySubjectAppearance}
                  outfit={primarySubjectOutfit}
                  expression={expression}
                  pose={pose}
                  className="w-full h-full"
                />
              </div>
            )}
          </div>

          <div className="pt-2 text-center min-h-[26px]">
            <p className="text-[13px] font-semibold text-[#3A2C36] truncate">
              {caption.trim() || (frame === 'polaroid_seoul' ? 'enmmoe Seoul Diary' : '')}
            </p>
          </div>
        </div>
      </div>

      {/* Latest Exported PNG Action Bar */}
      {exportedPng && (
        <div className="mx-4 mt-2 p-3 rounded-2xl bg-[#F2F7FF] dark:bg-[#1A2130] border border-[#007AFF]/25 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-semibold inline-flex items-center gap-1.5 text-[#007AFF]">
            <Check className="w-4 h-4" />
            Photo rendered & cached!
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="h-8 px-3 rounded-full bg-white dark:bg-[#252D3F] text-[12px] font-semibold inline-flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
            {onSharePhotoToFeed && (
              <button
                type="button"
                onClick={() => onSharePhotoToFeed(exportedPng, caption || 'Captured at Starlight Photo Studio')}
                className="h-8 px-3 rounded-full bg-[#007AFF] text-white text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            )}
            {onSetAvatar && (
              <button
                type="button"
                onClick={() => onSetAvatar(exportedPng)}
                className="h-8 px-3 rounded-full bg-[#F4A6B8] text-[#2F242D] text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Avatar</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Studio Controls */}
      <div className="px-4 py-4 space-y-4">
        {/* Shot Mode */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#F3EFF5] dark:bg-[#1E1C26]">
          {(
            [
              { id: 'solo', label: 'Solo' },
              { id: 'couple', label: 'Couple' },
              { id: 'character', label: 'Friend' },
              { id: 'outfit', label: 'Outfit' },
            ] as Array<{ id: StudioPhotoMode; label: string }>
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`h-9 rounded-xl text-[13px] font-semibold cursor-pointer ${
                mode === m.id ? 'bg-white dark:bg-[#2E2B3A] shadow-sm' : 'text-[#8A7D85]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {(mode === 'couple' || mode === 'character') && (
          <div className="grid grid-cols-3 gap-2">
            {MAIN_CHARACTERS.map((npc) => (
              <button
                key={npc.id}
                type="button"
                onClick={() => setPartnerId(npc.id)}
                className={`h-10 rounded-xl border text-[13px] font-semibold cursor-pointer ${
                  partnerId === npc.id
                    ? 'border-[#F0688E] bg-[#FFF0F5] dark:bg-[#2B2232] text-[#D84A76] dark:text-white'
                    : 'border-black/8 dark:border-white/10'
                }`}
              >
                {npc.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {mode === 'outfit' && (
          <select
            value={outfitId}
            onChange={(e) => setOutfitId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#F5F2F6] dark:bg-[#1E1C26] text-[13px] font-semibold border border-black/8 dark:border-white/10"
          >
            {allOwnedOutfits.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.category})
              </option>
            ))}
          </select>
        )}

        {/* Background & Frame */}
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold text-[#8A7D85]">Background</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBackgroundId(b.id)}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                  backgroundId === b.id
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F3EFF5] dark:bg-[#23212D]'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[12px] font-semibold text-[#8A7D85] mb-1">Expression</p>
            <select
              value={expression}
              onChange={(e) => setExpression(e.target.value as ExpressionId)}
              className="w-full h-10 px-3 rounded-xl bg-[#F5F2F6] dark:bg-[#1E1C26] text-[13px] font-medium border border-black/8 dark:border-white/10"
            >
              {EXPRESSIONS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#8A7D85] mb-1">Pose</p>
            <select
              value={pose}
              onChange={(e) => setPose(e.target.value as StudioPoseId)}
              className="w-full h-10 px-3 rounded-xl bg-[#F5F2F6] dark:bg-[#1E1C26] text-[13px] font-medium border border-black/8 dark:border-white/10"
            >
              {POSES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-[#8A7D85] mb-1.5">Frame & Stickers</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-2">
            {FRAMES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrame(f.id)}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                  frame === f.id
                    ? 'bg-[#2F242D] text-white dark:bg-white dark:text-black'
                    : 'bg-[#F3EFF5] dark:bg-[#23212D]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {STICKERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSticker(s)}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                  selectedStickers.includes(s)
                    ? 'bg-[#F4A6B8] text-[#2F242D]'
                    : 'bg-[#F3EFF5] dark:bg-[#23212D]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          maxLength={40}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add handwritten caption (optional)..."
          className="w-full h-10 px-3.5 rounded-xl bg-[#F5F2F6] dark:bg-[#1E1C26] text-[14px] border border-black/8 dark:border-white/10"
        />

        {/* Optional Gemini Photo Scene Card */}
        <div className="p-3 rounded-2xl bg-[#F9F5FA] dark:bg-[#1A1822] border border-black/6 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#F0688E]" />
              Gemini Photo Scene
            </p>
            <p className="text-[11px] text-[#8A7D85] line-clamp-2">
              {aiSceneState.message || 'Optional illustrated scene generation using your saved character reference.'}
            </p>
          </div>
          <button
            type="button"
            disabled={aiSceneState.status === 'loading'}
            onClick={handleRequestGeminiPhotoScene}
            className="shrink-0 h-8 px-3 rounded-full bg-white dark:bg-[#272433] border border-black/10 dark:border-white/15 text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>
              {aiSceneState.status === 'loading'
                ? 'Wait...'
                : aiSceneState.status === 'error' || aiSceneState.status === 'unavailable'
                ? 'Retry'
                : 'Generate'}
            </span>
          </button>
        </div>

        {/* Saved IndexedDB Studio Gallery */}
        {studioGallery.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-[14px] font-bold">Saved Photo Album ({studioGallery.length})</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {studioGallery.map((item) => {
                const url = cachedUrls[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl overflow-hidden bg-white dark:bg-[#1A1922] border border-black/8 dark:border-white/10 flex flex-col"
                  >
                    {url ? (
                      <img src={url} alt={item.title} className="w-full aspect-[4/5] object-cover" />
                    ) : (
                      <div className="w-full aspect-[4/5] bg-[#F4EFF6] dark:bg-[#242130] flex items-center justify-center text-[12px] text-[#8A7D85]">
                        Cached Photo
                      </div>
                    )}
                    <div className="p-2 flex items-center justify-between gap-1">
                      <span className="text-[12px] font-semibold truncate">{item.title}</span>
                      <div className="flex items-center gap-1">
                        {url && onSharePhotoToFeed && (
                          <button
                            type="button"
                            onClick={() => onSharePhotoToFeed(url, item.caption || item.title)}
                            aria-label="Share saved photo"
                            className="p-1.5 text-[#007AFF] cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAssetFromCache(item.assetId);
                            onDeletePhoto(item.id, item.assetId);
                          }}
                          aria-label="Delete saved photo"
                          className="p-1.5 text-[#8A7D85] hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
