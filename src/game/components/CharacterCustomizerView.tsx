import React, { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import {
  buildCharacterMasterPrompt,
  cacheSvgElementAsAsset,
  getPlayerRefAssetId,
  requestArtworkGeneration,
} from '../artworkGenerator';
import { getAssetFromCache } from '../assetCache';
import { getAllCatalogOutfits, getOutfitById } from '../saveSystem';
import {
  ArtworkGenerationState,
  FaceShape,
  GenderPresentation,
  HairStyleId,
  OutfitItem,
  PlayerCharacter,
} from '../types';
import { WebtoonPortrait } from '../webtoonArt';

const PRESENTATION_OPTIONS: Array<{ id: GenderPresentation; label: string }> = [
  { id: 'feminine', label: 'Feminine' },
  { id: 'masculine', label: 'Masculine' },
  { id: 'neutral', label: 'Neutral' },
];

const FACE_SHAPES: Array<{ id: FaceShape; label: string }> = [
  { id: 'oval', label: 'Oval' },
  { id: 'heart', label: 'Heart' },
  { id: 'round', label: 'Soft Round' },
  { id: 'sculpted', label: 'Sculpted' },
  { id: 'defined', label: 'Defined' },
];

const HAIRSTYLES: Array<{ id: HairStyleId; label: string }> = [
  { id: 'silky_waves', label: 'Silky Waves' },
  { id: 'airy_bob', label: 'Airy Bob' },
  { id: 'wispy_long', label: 'Long Wispy' },
  { id: 'side_ponytail', label: 'Side Ponytail' },
  { id: 'hime_cut', label: 'Hime Cut' },
  { id: 'comma_hair', label: 'Comma Hair' },
  { id: 'two_block', label: 'Two-Block' },
  { id: 'wolf_layers', label: 'Wolf Layers' },
  { id: 'soft_curls', label: 'Soft Curls' },
  { id: 'sleek_part', label: 'Sleek Part' },
];

const HAIR_COLORS = [
  { label: 'Espresso', value: '#2B2228' },
  { label: 'Chestnut', value: '#5E3D31' },
  { label: 'Honey', value: '#B8895C' },
  { label: 'Wisteria', value: '#725C9C' },
  { label: 'Sakura', value: '#D689A2' },
  { label: 'Silver Mist', value: '#A5B2C6' },
];

const SKIN_TONES = [
  { label: 'Porcelain', value: '#FFF0E6' },
  { label: 'Peach', value: '#FCE3D4' },
  { label: 'Warm Apricot', value: '#F5CFB9' },
  { label: 'Honey', value: '#E4B597' },
  { label: 'Caramel', value: '#C78E6B' },
  { label: 'Deep Espresso', value: '#9C6B4E' },
];

const EYE_COLORS = [
  { label: 'Ink Brown', value: '#4A3642' },
  { label: 'Amber', value: '#8E6239' },
  { label: 'Slate Blue', value: '#4D6D9A' },
  { label: 'Violet', value: '#6E559E' },
  { label: 'Sage Green', value: '#4E7D67' },
];

const ACCESSORIES: Array<{ id: PlayerCharacter['accessory']; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'earrings', label: 'Earrings' },
  { id: 'beret', label: 'Beret' },
  { id: 'headphones', label: 'Headphones' },
];

export interface CharacterCustomizerViewProps {
  player: PlayerCharacter;
  ownedOutfitIds: string[];
  customOutfits: OutfitItem[];
  onSavePlayer: (updated: PlayerCharacter) => void;
  onBackToCity?: () => void;
}

export const CharacterCustomizerView: React.FC<CharacterCustomizerViewProps> = ({
  player,
  ownedOutfitIds,
  customOutfits,
  onSavePlayer,
  onBackToCity,
}) => {
  const [draft, setDraft] = useState<PlayerCharacter>(player);
  const [activeTab, setActiveTab] = useState<'face' | 'hair' | 'palette' | 'outfit'>('face');
  const [savedNotice, setSavedNotice] = useState(false);
  const [geminiRefState, setGeminiRefState] = useState<ArtworkGenerationState>({ status: 'idle' });
  const portraitSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setDraft(player);
  }, [player]);

  // Check if a Gemini reference image already exists in IndexedDB
  useEffect(() => {
    let active = true;
    getAssetFromCache(`gemini:ref:${player.id}`).then((asset) => {
      if (active && asset?.dataUrl) {
        setGeminiRefState({
          status: 'cached',
          dataUrl: asset.dataUrl,
          source: asset.source,
          message: 'Saved Gemini reference loaded from IndexedDB.',
        });
      }
    });
    return () => {
      active = false;
    };
  }, [player.id]);

  const allOutfits = getAllCatalogOutfits(customOutfits);
  const ownedOutfits = allOutfits.filter((o) => ownedOutfitIds.includes(o.id));
  const currentOutfit = getOutfitById(draft.equippedOutfitId, customOutfits);

  const handleSaveCharacter = async () => {
    const updated: PlayerCharacter = {
      ...draft,
      name: draft.name.trim() || 'Seo-yeon',
      masterReferenceAssetId: getPlayerRefAssetId(draft),
      updatedAt: Date.now(),
    };

    if (portraitSvgRef.current) {
      await cacheSvgElementAsAsset({
        assetId: updated.masterReferenceAssetId!,
        kind: 'character_reference',
        characterId: updated.id,
        svgElement: portraitSvgRef.current,
      });
    }

    onSavePlayer(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleRequestGeminiMaster = async (force = false) => {
    const refId = getPlayerRefAssetId(draft);
    if (portraitSvgRef.current) {
      await cacheSvgElementAsAsset({
        assetId: refId,
        kind: 'character_reference',
        characterId: draft.id,
        svgElement: portraitSvgRef.current,
      });
    }

    setGeminiRefState({ status: 'loading', message: 'Requesting master portrait...' });
    const res = await requestArtworkGeneration({
      assetId: `gemini:ref:${draft.id}`,
      kind: 'character_reference',
      characterId: draft.id,
      prompt: buildCharacterMasterPrompt(draft.name || 'Seo-yeon', draft, currentOutfit),
      aspectRatio: '3:4',
      referenceAssetId: refId,
      forceRegenerate: force,
    });
    setGeminiRefState(res);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFDFB] dark:bg-[#121216] text-[#2F242D] dark:text-white overflow-y-auto pb-20">
      {/* Compact Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight">Character Studio</h2>
          <p className="text-[12px] text-[#8A7D85] dark:text-[#A89CA5]">
            Master portrait saves directly to IndexedDB for scene consistency
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveCharacter}
          className="min-h-[40px] px-4 rounded-full bg-[#007AFF] text-white text-[14px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ios-press"
        >
          {savedNotice ? <Check className="w-4 h-4" /> : null}
          <span>{savedNotice ? 'Saved' : 'Save Look'}</span>
        </button>
      </div>

      {/* Live Webtoon Portrait Preview Card */}
      <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
        <div className="mx-auto w-[184px] sm:w-[200px] aspect-[240/290] rounded-3xl overflow-hidden bg-[#FFF6FA] dark:bg-[#1D1B24] border border-black/10 dark:border-white/10 shadow-sm">
          {geminiRefState.status === 'cached' && geminiRefState.dataUrl ? (
            <img
              src={geminiRefState.dataUrl}
              alt={draft.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <WebtoonPortrait
              svgRef={portraitSvgRef}
              appearance={draft}
              outfit={currentOutfit}
              expression="smiling"
              showBackdrop
              className="w-full h-full"
            />
          )}
        </div>

        <div className="space-y-3">
          {/* Name Input */}
          <div>
            <label className="block text-[12px] font-semibold text-[#8A7D85] mb-1">
              Character Name
            </label>
            <input
              type="text"
              maxLength={24}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Enter character name"
              className="w-full h-10 px-3.5 rounded-xl bg-[#F5F2F6] dark:bg-[#1E1C26] text-[15px] font-medium border border-black/8 dark:border-white/10"
            />
          </div>

          {/* Honest Optional Gemini Master Portrait Box */}
          <div className="p-3 rounded-2xl bg-[#F9F5FA] dark:bg-[#1A1822] border border-black/6 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F0688E]" />
                Gemini Master Portrait (Optional)
              </span>
              {geminiRefState.status === 'loading' ? (
                <span className="text-[11px] text-[#007AFF] font-medium">Generating...</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestGeminiMaster(geminiRefState.status === 'cached')}
                  className="text-[12px] font-semibold text-[#007AFF] inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {geminiRefState.status === 'error' || geminiRefState.status === 'unavailable'
                      ? 'Retry'
                      : geminiRefState.status === 'cached'
                      ? 'Regenerate'
                      : 'Generate'}
                  </span>
                </button>
              )}
            </div>
            <p className="text-[12px] leading-snug text-[#6F646B] dark:text-[#A89CA5]">
              {geminiRefState.message ||
                'Local 2D Korean webtoon reference portrait is active & cached. Connect a paid image key in Settings > Secrets if you want AI generation.'}
            </p>
          </div>
        </div>
      </div>

      {/* Category Switcher Tabs */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#F3EFF5] dark:bg-[#1E1C26]">
          {[
            { id: 'face', label: 'Face' },
            { id: 'hair', label: 'Hair' },
            { id: 'palette', label: 'Colors' },
            { id: 'outfit', label: 'Outfits' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`h-9 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#2C2938] text-[#2F242D] dark:text-white shadow-sm'
                  : 'text-[#8A7D85]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Option Pickers */}
      <div className="px-4 py-4 space-y-5">
        {activeTab === 'face' && (
          <>
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">Gender Presentation</h3>
              <div className="grid grid-cols-3 gap-2">
                {PRESENTATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, presentation: opt.id })}
                    className={`min-h-[44px] rounded-2xl text-[14px] font-medium border cursor-pointer ${
                      draft.presentation === opt.id
                        ? 'bg-[#FFF0F5] dark:bg-[#007AFF]/20 border-[#F0688E] text-[#D84A76] dark:text-white'
                        : 'bg-white dark:bg-[#1C1A24] border-black/8 dark:border-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">Face Shape</h3>
              <div className="grid grid-cols-3 gap-2">
                {FACE_SHAPES.map((fs) => (
                  <button
                    key={fs.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, faceShape: fs.id })}
                    className={`min-h-[44px] rounded-2xl text-[13px] font-medium border cursor-pointer ${
                      draft.faceShape === fs.id
                        ? 'bg-[#FFF0F5] dark:bg-[#007AFF]/20 border-[#F0688E] text-[#D84A76] dark:text-white'
                        : 'bg-white dark:bg-[#1C1A24] border-black/8 dark:border-white/10'
                    }`}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">Accessory</h3>
              <div className="flex flex-wrap gap-2">
                {ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, accessory: acc.id })}
                    className={`px-3.5 min-h-[40px] rounded-2xl text-[13px] font-medium border cursor-pointer ${
                      (draft.accessory || 'none') === acc.id
                        ? 'bg-[#FFF0F5] dark:bg-[#007AFF]/20 border-[#F0688E] text-[#D84A76] dark:text-white'
                        : 'bg-white dark:bg-[#1C1A24] border-black/8 dark:border-white/10'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'hair' && (
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-[#8A7D85]">Hairstyle</h3>
            <div className="grid grid-cols-2 gap-2">
              {HAIRSTYLES.map((hs) => (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, hairStyle: hs.id })}
                  className={`min-h-[44px] px-3 rounded-2xl text-[14px] font-medium border text-left cursor-pointer ${
                    draft.hairStyle === hs.id
                      ? 'bg-[#FFF0F5] dark:bg-[#007AFF]/20 border-[#F0688E] text-[#D84A76] dark:text-white'
                      : 'bg-white dark:bg-[#1C1A24] border-black/8 dark:border-white/10'
                  }`}
                >
                  {hs.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'palette' && (
          <>
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">Hair Color</h3>
              <div className="grid grid-cols-3 gap-2">
                {HAIR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, hairColor: c.value })}
                    className={`min-h-[44px] px-3 rounded-2xl border flex items-center gap-2 text-[13px] font-medium cursor-pointer ${
                      draft.hairColor === c.value
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1C1A24]'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">Skin Tone</h3>
              <div className="grid grid-cols-3 gap-2">
                {SKIN_TONES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, skinTone: c.value })}
                    className={`min-h-[44px] px-3 rounded-2xl border flex items-center gap-2 text-[13px] font-medium cursor-pointer ${
                      draft.skinTone === c.value
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1C1A24]'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">Eye Color</h3>
              <div className="grid grid-cols-3 gap-2">
                {EYE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, eyeColor: c.value })}
                    className={`min-h-[44px] px-3 rounded-2xl border flex items-center gap-2 text-[13px] font-medium cursor-pointer ${
                      draft.eyeColor === c.value
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1C1A24]'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'outfit' && (
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-[#8A7D85]">
              Owned Wardrobe ({ownedOutfits.length})
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {ownedOutfits.map((outfit) => {
                const isEquipped = draft.equippedOutfitId === outfit.id;
                return (
                  <button
                    key={outfit.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, equippedOutfitId: outfit.id })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      isEquipped
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1C1A24]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-4 h-4 rounded-full border border-black/15"
                        style={{ backgroundColor: outfit.palette.primary }}
                      />
                      <span className="text-[13px] font-semibold truncate">{outfit.name}</span>
                    </div>
                    <p className="text-[11px] text-[#8A7D85] capitalize">{outfit.category}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {onBackToCity && (
          <button
            type="button"
            onClick={async () => {
              await handleSaveCharacter();
              onBackToCity();
            }}
            className="w-full h-12 rounded-2xl bg-[#F4A6B8] text-[#2F242D] font-semibold text-[15px] cursor-pointer ios-press"
          >
            Save & Step Out into Seoul
          </button>
        )}
      </div>
    </div>
  );
};
