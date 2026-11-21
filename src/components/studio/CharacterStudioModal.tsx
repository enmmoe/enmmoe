import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  Cloud,
  CloudRain,
  Coffee,
  Compass,
  Eye,
  EyeOff,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  MapPin,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Send,
  Share2,
  ShoppingBag,
  Sliders,
  Sparkles,
  Sun,
  Sunrise,
  Trash2,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { Story, SocialPost } from '../../types';
import {
  BagStyleId,
  BangsStyle,
  BottomStyleId,
  CharacterConfig,
  CharacterFrame,
  DEFAULT_STUDIO_SCENE,
  EYE_COLORS,
  FABRIC_MATERIALS,
  FASHION_COLORS,
  FASHION_STORE_CATALOG,
  FaceShape,
  FootwearStyleId,
  GlassesStyleId,
  GraphicsQuality,
  HAIR_COLORS,
  HAIR_STYLES,
  JewelryStyleId,
  LIP_COLORS,
  OUTFIT_PRESETS,
  OuterwearStyleId,
  SKIN_TONES,
  STUDIO_CAMERA_PRESETS,
  STUDIO_EXPRESSIONS,
  STUDIO_PHOTO_FILTERS,
  STUDIO_POSES,
  STUDIO_PROPS,
  SavedOutfitLook,
  SavedStudioPhoto,
  StoreFashionItem,
  StudioPhotoFilterId,
  StudioPropId,
  StudioSceneConfig,
  TimeOfDayId,
  TopStyleId,
  WORLD_DISTRICTS,
  WalletState,
  WeatherId,
  WorldDistrictInfo,
  createDefaultCharacter,
} from '../../types/characterStudio';
import {
  claimDailyAllowance,
  composeStudioPhotoExport,
  deleteCharacterSlot,
  deleteStudioPhoto,
  getActiveCharacterId,
  getGraphicsQuality,
  getSavedCharacters,
  getSavedOutfitLooks,
  getSavedStudioPhotos,
  getWalletState,
  grantActivityReward,
  payTravelFare,
  purchaseStoreItem,
  saveCharacterSlot,
  saveOutfitLook,
  saveStudioPhoto,
  setActiveCharacterId,
  setGraphicsQuality,
} from '../../utils/characterStudioStorage';
import { WorldAmbientAudio } from '../../studio/ambientAudio';
import { DistrictHotspot } from '../../studio/worldBuilder';
import { useToast } from '../ui';
import { StudioViewport3D, StudioViewportHandle, StudioViewportMode } from './StudioViewport3D';

export interface CharacterStudioModalProps {
  isOpen: boolean;
  initialMode?: StudioViewportMode;
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
  onPublishStory?: (storyData: Partial<Story>) => void;
  onPublishPost?: (postData: Partial<SocialPost>) => void;
}

type CreatorTab = 'face' | 'skin' | 'hair' | 'outfits' | 'details' | 'pose';
type StudioTab = 'scene' | 'camera' | 'props' | 'pose' | 'gallery';
type ExploreSheet = null | 'map' | 'store' | 'cafe' | 'atmosphere';

const STORY_STICKER_OPTIONS = ['None', 'Seongsu OOTD', 'Seoul Life', 'Studio Look', 'enmmoe'];

const FACE_SHAPES: Array<{ id: FaceShape; label: string }> = [
  { id: 'oval', label: 'Oval' },
  { id: 'heart', label: 'Heart' },
  { id: 'round', label: 'Soft Round' },
  { id: 'square', label: 'Defined' },
  { id: 'sculpted', label: 'Sculpted' },
];

const BANGS_OPTIONS: Array<{ id: BangsStyle; label: string }> = [
  { id: 'none', label: 'Clean Forehead' },
  { id: 'wispy', label: 'Wispy Bangs' },
  { id: 'side_part', label: 'Side Part' },
];

const TOP_OPTIONS: Array<{ id: TopStyleId; label: string }> = [
  { id: 'silk_blouse', label: 'Silk Blouse' },
  { id: 'turtleneck', label: 'Knit Turtleneck' },
  { id: 'knit_sweater', label: 'Crew Sweater' },
  { id: 'hoodie', label: 'Street Hoodie' },
  { id: 'crop_top', label: 'Cropped Top' },
  { id: 'fitted_tee', label: 'Minimal Tee' },
  { id: 'blazer_top', label: 'Tailored Top' },
];

const BOTTOM_OPTIONS: Array<{ id: BottomStyleId; label: string }> = [
  { id: 'pleated_skirt', label: 'Pleated Skirt' },
  { id: 'midi_skirt', label: 'Midi Skirt' },
  { id: 'tailored_trousers', label: 'Slacks' },
  { id: 'denim_jeans', label: 'Selvedge Jeans' },
  { id: 'cargo_pants', label: 'Cargo Pants' },
  { id: 'tailored_shorts', label: 'Shorts' },
];

const OUTERWEAR_OPTIONS: Array<{ id: OuterwearStyleId; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'cropped_jacket', label: 'Wool Blazer' },
  { id: 'leather_jacket', label: 'Leather Jacket' },
  { id: 'trench_coat', label: 'Trench Coat' },
  { id: 'cardigan', label: 'Cardigan' },
];

const FOOTWEAR_OPTIONS: Array<{ id: FootwearStyleId; label: string }> = [
  { id: 'ankle_boots', label: 'Chelsea Boots' },
  { id: 'minimal_sneakers', label: 'Minimal Sneakers' },
  { id: 'loafers', label: 'Leather Loafers' },
  { id: 'classic_heels', label: 'Studio Heels' },
];

const GLASSES_OPTIONS: Array<{ id: GlassesStyleId; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'cat_eye', label: 'Cat Eye' },
  { id: 'round_wire', label: 'Wire Frames' },
  { id: 'sunglasses', label: 'Tinted Shades' },
];

const JEWELRY_OPTIONS: Array<{ id: JewelryStyleId; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'pearl_earrings', label: 'Pearl Drops' },
  { id: 'gold_hoops', label: 'Gold Hoops' },
  { id: 'layered_necklace', label: 'Necklace Set' },
];

const BAG_OPTIONS: Array<{ id: BagStyleId; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'crossbody', label: 'Crossbody' },
  { id: 'mini_tote', label: 'Leather Tote' },
];

const CAFE_MENU = [
  { id: 'americano', name: 'Seongsu Iced Americano', price: 4500, pose: 'studio_sit' as const, tip: 'Refreshing caffeine boost (+₩1,200 street inspo)' },
  { id: 'einspanner', name: 'Vienna Einspänner', price: 6200, pose: 'natural_stand' as const, tip: 'Cream latte photo mood unlocked' },
  { id: 'croissant', name: 'Warm Butter Croissant', price: 4800, pose: 'warm_smile' as const, tip: 'Cozy café pause (+₩1,200 inspiration)' },
];

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('en-US')}`;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, onChange }) => {
  const pct = Math.round(((value - min) / Math.max(0.0001, max - min)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-black dark:text-white">{label}</span>
        <span className="text-[#8E8E93] tabular-nums">{pct}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-[#E5E5EA] dark:bg-[#3A3A3C] accent-[#007AFF] cursor-pointer"
      />
    </div>
  );
};

interface SwatchRowProps {
  label: string;
  colors: Array<{ id: string; label: string; hex: string }>;
  selectedHex: string;
  onSelect: (hex: string) => void;
}

const SwatchRow: React.FC<SwatchRowProps> = ({ label, colors, selectedHex, onSelect }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-medium text-black dark:text-white">{label}</span>
      <span className="text-[12px] text-[#8E8E93]">
        {colors.find((c) => c.hex.toLowerCase() === selectedHex.toLowerCase())?.label || 'Custom'}
      </span>
    </div>
    <div className="flex flex-wrap gap-2">
      {colors.map((swatch) => {
        const active = swatch.hex.toLowerCase() === selectedHex.toLowerCase();
        return (
          <button
            key={swatch.id}
            type="button"
            title={swatch.label}
            aria-label={`${label}: ${swatch.label}`}
            onClick={() => onSelect(swatch.hex)}
            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
              active
                ? 'ring-2 ring-offset-2 ring-[#007AFF] dark:ring-offset-[#1C1C1E] scale-110'
                : 'ring-1 ring-black/15 dark:ring-white/20 hover:scale-105'
            }`}
            style={{ backgroundColor: swatch.hex }}
          >
            {active && (
              <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] stroke-[3]" />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

interface VirtualThumbstickProps {
  sprint: boolean;
  onSprintToggle: () => void;
  onInput: (x: number, y: number) => void;
}

const VirtualThumbstick: React.FC<VirtualThumbstickProps> = ({
  sprint,
  onSprintToggle,
  onInput,
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const maxRadius = 32;

  const updateFromClient = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    onInput(dx / maxRadius, dy / maxRadius);
  };

  const resetStick = () => {
    draggingRef.current = false;
    setKnobOffset({ x: 0, y: 0 });
    onInput(0, 0);
  };

  return (
    <div className="flex items-end gap-2.5 select-none">
      <div
        ref={padRef}
        role="application"
        aria-label="Character movement joystick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          draggingRef.current = true;
          updateFromClient(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          updateFromClient(e.clientX, e.clientY);
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="relative w-24 h-24 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/15 dark:border-white/20 shadow-lg touch-none flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <div className="w-10 h-10 rounded-full border border-black/[0.08] dark:border-white/[0.12] pointer-events-none" />
        <div
          className="absolute w-10 h-10 rounded-full bg-[#007AFF] shadow-md pointer-events-none flex items-center justify-center"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white/85" />
        </div>
      </div>

      <button
        type="button"
        onClick={onSprintToggle}
        className={`h-10 px-3 rounded-xl border text-[12px] font-semibold shadow-md cursor-pointer transition-colors ${
          sprint
            ? 'bg-[#007AFF] border-[#007AFF] text-white'
            : 'bg-white dark:bg-[#1C1C1E] border-black/12 dark:border-white/15 text-black dark:text-white'
        }`}
      >
        {sprint ? 'Running' : 'Walk'}
      </button>
    </div>
  );
};

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  isOpen,
  initialMode = 'creator',
  onClose,
  onSelectAvatar,
  onPublishStory,
  onPublishPost,
}) => {
  const { showToast } = useToast();
  const viewportRef = useRef<StudioViewportHandle>(null);
  const ambientAudioRef = useRef<WorldAmbientAudio | null>(null);

  const [savedCharacters, setSavedCharacters] = useState<CharacterConfig[]>(() => getSavedCharacters());
  const [character, setCharacter] = useState<CharacterConfig>(() => {
    const list = getSavedCharacters();
    const activeId = getActiveCharacterId();
    return list.find((c) => c.id === activeId) || list[0];
  });
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfitLook[]>(() => getSavedOutfitLooks());
  const [savedPhotos, setSavedPhotos] = useState<SavedStudioPhoto[]>(() => getSavedStudioPhotos());
  const [wallet, setWallet] = useState<WalletState>(() => getWalletState());
  const [quality, setQualityState] = useState<GraphicsQuality>(() => getGraphicsQuality());

  const [mode, setMode] = useState<StudioViewportMode>(initialMode);
  const [creatorTab, setCreatorTab] = useState<CreatorTab>('face');
  const [studioTab, setStudioTab] = useState<StudioTab>('scene');
  const [sceneConfig, setSceneConfig] = useState<StudioSceneConfig>(DEFAULT_STUDIO_SCENE);
  const [hudHidden, setHudHidden] = useState(false);
  const [showNewCharSheet, setShowNewCharSheet] = useState(false);
  const [exploreSheet, setExploreSheet] = useState<ExploreSheet>(null);
  const [nearbyHotspot, setNearbyHotspot] = useState<DistrictHotspot | null>(null);
  const [sprintEnabled, setSprintEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Outfit look saver state
  const [lookNameInput, setLookNameInput] = useState('');

  // Photo review & Story composer state
  const [capturedRawUrl, setCapturedRawUrl] = useState<string | null>(null);
  const [composedPreviewUrl, setComposedPreviewUrl] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [storySticker, setStorySticker] = useState<string>('None');
  const [reviewFilter, setReviewFilter] = useState<StudioPhotoFilterId>('natural');
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);

  const currentDistrictInfo = useMemo(
    () => WORLD_DISTRICTS.find((d) => d.id === sceneConfig.district) || WORLD_DISTRICTS[0],
    [sceneConfig.district]
  );

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      const list = getSavedCharacters();
      const activeId = getActiveCharacterId();
      setSavedCharacters(list);
      setCharacter(list.find((c) => c.id === activeId) || list[0]);
      setSavedOutfits(getSavedOutfitLooks());
      setSavedPhotos(getSavedStudioPhotos());
      setWallet(getWalletState());
      setQualityState(getGraphicsQuality());
      setCapturedRawUrl(null);
      setComposedPreviewUrl(null);
      setHudHidden(false);
      setExploreSheet(null);
      setNearbyHotspot(null);
    } else {
      ambientAudioRef.current?.setEnabled(false, sceneConfig.district, sceneConfig.weather);
      setAudioEnabled(false);
    }
  }, [isOpen, initialMode]);

  // Ambient audio lifecycle cleanup
  useEffect(() => {
    return () => {
      ambientAudioRef.current?.dispose();
      ambientAudioRef.current = null;
    };
  }, []);

  // Update ambient audio sound profile when district/weather changes
  useEffect(() => {
    if (audioEnabled && ambientAudioRef.current) {
      ambientAudioRef.current.updateProfile(sceneConfig.district, sceneConfig.weather);
    }
  }, [audioEnabled, sceneConfig.district, sceneConfig.weather]);

  // Re-render composed review image whenever filter, caption, or sticker changes
  useEffect(() => {
    if (!capturedRawUrl) {
      setComposedPreviewUrl(null);
      return;
    }
    let cancelled = false;
    composeStudioPhotoExport({
      rawCanvasDataUrl: capturedRawUrl,
      filterId: reviewFilter,
      caption: storyCaption,
      stickerLabel: storySticker === 'None' ? undefined : storySticker,
      squareAvatarCrop: false,
    }).then((url) => {
      if (!cancelled) setComposedPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [capturedRawUrl, reviewFilter, storyCaption, storySticker]);

  const handleToggleAudio = () => {
    if (!ambientAudioRef.current) {
      ambientAudioRef.current = new WorldAmbientAudio();
    }
    const next = !audioEnabled;
    ambientAudioRef.current.setEnabled(next, sceneConfig.district, sceneConfig.weather);
    setAudioEnabled(next);
  };

  const handleChangeQuality = (q: GraphicsQuality) => {
    setGraphicsQuality(q);
    setQualityState(q);
    showToast(`Graphics quality: ${q.toUpperCase()}`, { type: 'info' });
  };

  const updateChar = <K extends keyof CharacterConfig>(key: K, value: CharacterConfig[K]) => {
    setCharacter((prev) => ({ ...prev, [key]: value, updatedAt: Date.now() }));
  };

  const handleApplyPresetOutfit = (presetId: CharacterConfig['outfitPreset']) => {
    const preset = OUTFIT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCharacter((prev) => ({
      ...prev,
      outfitPreset: preset.id,
      primaryOutfitColor: preset.primary,
      secondaryOutfitColor: preset.secondary,
      footwearStyle: preset.footwear,
      outerwearStyle: preset.outerwear,
      primaryFabric: preset.primaryFabric,
      secondaryFabric: preset.secondaryFabric,
      updatedAt: Date.now(),
    }));
  };

  const handleSaveCharacter = (silent = false) => {
    const updated = saveCharacterSlot(character);
    setSavedCharacters(updated);
    if (!silent) {
      showToast(`${character.name} saved`, { type: 'success' });
    }
  };

  const handleSelectCharacterSlot = (slot: CharacterConfig) => {
    setCharacter(slot);
    setActiveCharacterId(slot.id);
    showToast(`Loaded ${slot.name}`, { type: 'info' });
  };

  const handleCreateCharacterFromFrame = (frame: CharacterFrame) => {
    const countForLabel = savedCharacters.length + 1;
    const defaultName =
      frame === 'female'
        ? countForLabel === 1
          ? 'Seo-yeon'
          : `Seo-yeon ${countForLabel}`
        : `Min-jun ${countForLabel}`;
    const fresh = createDefaultCharacter(frame, `char-${Date.now()}`, defaultName);
    const updated = saveCharacterSlot(fresh);
    setSavedCharacters(updated);
    setCharacter(fresh);
    setShowNewCharSheet(false);
    showToast(`Created ${fresh.name}`, { type: 'success' });
  };

  const handleDeleteSlot = (id: string) => {
    if (savedCharacters.length <= 1) return;
    const next = deleteCharacterSlot(id);
    setSavedCharacters(next);
    if (character.id === id) {
      setCharacter(next[0]);
    }
    showToast('Character removed', { type: 'info' });
  };

  const handleSaveLook = () => {
    const label = lookNameInput.trim() || `Look ${savedOutfits.length + 1}`;
    const next = saveOutfitLook(character, label);
    setSavedOutfits(next);
    setLookNameInput('');
    showToast(`Saved outfit "${label}"`, { type: 'success' });
  };

  const handleApplySavedLook = (look: SavedOutfitLook) => {
    setCharacter((prev) => ({
      ...prev,
      outfitPreset: look.outfitPreset,
      topStyle: look.topStyle,
      bottomStyle: look.bottomStyle,
      outerwearStyle: look.outerwearStyle,
      footwearStyle: look.footwearStyle,
      primaryOutfitColor: look.primaryOutfitColor,
      secondaryOutfitColor: look.secondaryOutfitColor,
      footwearColor: look.footwearColor,
      primaryFabric: look.primaryFabric,
      secondaryFabric: look.secondaryFabric,
      glassesStyle: look.glassesStyle,
      jewelryStyle: look.jewelryStyle,
      bagStyle: look.bagStyle,
      updatedAt: Date.now(),
    }));
    showToast(`Applied ${look.name}`, { type: 'success' });
  };

  const handleTravelToDistrict = (district: WorldDistrictInfo) => {
    if (district.id === sceneConfig.district) {
      setExploreSheet(null);
      return;
    }
    const res = payTravelFare(district.id, district.travelCost);
    if (!res.success) {
      showToast(`Need ${formatWon(district.travelCost)} for transit ticket`, { type: 'info' });
      return;
    }
    setWallet(res.wallet);
    setSceneConfig((prev) => ({
      ...prev,
      district: district.id,
      timeOfDay: district.defaultTime,
      weather: district.defaultWeather,
      lighting:
        district.defaultTime === 'night'
          ? 'nighttime'
          : district.defaultTime === 'sunset'
          ? 'sunset'
          : 'daylight',
    }));
    setExploreSheet(null);
    if (mode === 'creator') setMode('explore');
    showToast(
      res.newlyDiscovered && district.travelCost > 0
        ? `Arrived at ${district.name} (+₩4,000 discovery bonus!)`
        : `Arrived at ${district.name}`,
      { type: 'success' }
    );
  };

  const handleBuyOrWearStoreItem = (item: StoreFashionItem) => {
    const owned = wallet.ownedItemIds.includes(item.id);
    if (!owned) {
      const res = purchaseStoreItem(item);
      if (!res.success) {
        showToast(`Need ${formatWon(item.price)} to buy ${item.name}`, { type: 'info' });
        return;
      }
      setWallet(res.wallet);
      showToast(`Purchased ${item.name}! Equipped now.`, { type: 'success' });
    } else {
      showToast(`Equipped ${item.name}`, { type: 'info' });
    }
    const nextChar: CharacterConfig = {
      ...character,
      ...item.applyPatch,
      updatedAt: Date.now(),
    };
    setCharacter(nextChar);
    setSavedCharacters(saveCharacterSlot(nextChar));
  };

  const handleOrderCafeItem = (order: (typeof CAFE_MENU)[number]) => {
    if (wallet.balance < order.price) {
      showToast(`Need ${formatWon(order.price)} for ${order.name}`, { type: 'info' });
      return;
    }
    const spent = grantActivityReward(-order.price + 1200, false);
    setWallet(spent);
    setExploreSheet(null);
    setMode('studio');
    if (order.pose === 'studio_sit') {
      updateChar('pose', 'studio_sit');
    } else if (order.pose === 'warm_smile') {
      updateChar('expression', 'warm_smile');
    }
    showToast(`Enjoyed ${order.name}! ${order.tip}`, { type: 'success' });
  };

  const handleClaimAllowance = () => {
    const res = claimDailyAllowance();
    setWallet(res.wallet);
    if (res.claimed) {
      showToast('Claimed +₩15,000 Daily Seoul Allowance!', { type: 'success' });
    } else {
      showToast('Daily allowance already claimed today. Take photos or explore districts to earn ₩!', {
        type: 'info',
      });
    }
  };

  const handleHotspotAction = (hotspot: DistrictHotspot) => {
    if (hotspot.type === 'shop') {
      setExploreSheet('store');
    } else if (hotspot.type === 'cafe') {
      setExploreSheet('cafe');
    } else if (hotspot.type === 'transit') {
      setExploreSheet('map');
    } else {
      setMode('studio');
    }
  };

  const handleCapturePhoto = () => {
    const raw = viewportRef.current?.captureRawFrame();
    if (!raw) {
      showToast('Renderer is warming up, try again', { type: 'info' });
      return;
    }
    setReviewFilter(sceneConfig.photoFilter);
    setStoryCaption('');
    setStorySticker('None');
    setCapturedRawUrl(raw);
  };

  const handleSetCurrentPortraitAsAvatar = async () => {
    handleSaveCharacter(true);
    setIsProcessingCapture(true);
    const raw = viewportRef.current?.captureRawFrame();
    if (!raw) {
      setIsProcessingCapture(false);
      showToast('Could not capture avatar frame', { type: 'info' });
      return;
    }
    const avatarDataUrl = await composeStudioPhotoExport({
      rawCanvasDataUrl: raw,
      filterId: sceneConfig.photoFilter,
      squareAvatarCrop: true,
    });
    const photoEntry: SavedStudioPhoto = {
      id: `studio-avatar-${Date.now()}`,
      characterId: character.id,
      characterName: character.name,
      imageDataUrl: avatarDataUrl,
      caption: `${character.name} · ${currentDistrictInfo.name}`,
      createdAt: Date.now(),
      environment: sceneConfig.environment,
      lighting: sceneConfig.lighting,
      district: sceneConfig.district,
    };
    const nextPhotos = saveStudioPhoto(photoEntry);
    setSavedPhotos(nextPhotos);
    setWallet(grantActivityReward(1500, true));
    onSelectAvatar(avatarDataUrl);
    setIsProcessingCapture(false);
    showToast('3D character set as profile avatar (+₩1,500)', { type: 'success' });
  };

  const handleUseReviewAsAvatar = async () => {
    if (!capturedRawUrl) return;
    setIsProcessingCapture(true);
    handleSaveCharacter(true);
    const avatarUrl = await composeStudioPhotoExport({
      rawCanvasDataUrl: capturedRawUrl,
      filterId: reviewFilter,
      squareAvatarCrop: true,
    });
    onSelectAvatar(avatarUrl);
    setIsProcessingCapture(false);
    showToast('Profile avatar updated from Studio photo', { type: 'success' });
  };

  const handleSaveCreationPhoto = async (silent = false): Promise<SavedStudioPhoto | null> => {
    if (!capturedRawUrl) return null;
    handleSaveCharacter(true);
    const finalUrl =
      composedPreviewUrl ||
      (await composeStudioPhotoExport({
        rawCanvasDataUrl: capturedRawUrl,
        filterId: reviewFilter,
        caption: storyCaption,
        stickerLabel: storySticker === 'None' ? undefined : storySticker,
      }));
    const photo: SavedStudioPhoto = {
      id: `photo-${Date.now()}`,
      characterId: character.id,
      characterName: character.name,
      imageDataUrl: finalUrl,
      caption: storyCaption.trim() || undefined,
      stickerLabel: storySticker !== 'None' ? storySticker : undefined,
      createdAt: Date.now(),
      environment: sceneConfig.environment,
      lighting: sceneConfig.lighting,
      district: sceneConfig.district,
    };
    const next = saveStudioPhoto(photo);
    setSavedPhotos(next);
    setWallet(grantActivityReward(2000, true));
    if (!silent) {
      showToast('Saved to Creations (+₩2,000 photo reward)', { type: 'success' });
    }
    return photo;
  };

  const handleShareToStory = async () => {
    const saved = await handleSaveCreationPhoto(true);
    if (!saved || !onPublishStory) return;
    setWallet(grantActivityReward(3500, false));
    onPublishStory({
      mediaUrl: saved.imageDataUrl,
      mediaType: 'photo',
      caption: storyCaption.trim() || `${character.name} in ${currentDistrictInfo.name}`,
      location: `${currentDistrictInfo.name} · ${currentDistrictInfo.koreanName}`,
    });
    showToast('Shared to enmmoe Story (+₩3,500 creator reward!)', { type: 'success' });
    setCapturedRawUrl(null);
    onClose();
  };

  const handleShareAsPost = async () => {
    const saved = await handleSaveCreationPhoto(true);
    if (!saved || !onPublishPost) return;
    setWallet(grantActivityReward(3500, false));
    onPublishPost({
      content:
        storyCaption.trim() ||
        `${character.name} exploring ${currentDistrictInfo.name} (${currentDistrictInfo.koreanName}).`,
      mediaType: 'photo',
      mediaUrls: [saved.imageDataUrl],
      location: currentDistrictInfo.name,
      tags: ['enmmoe', 'seoulworld', '3dcharacter'],
    });
    showToast('Shared to enmmoe feed (+₩3,500 creator reward!)', { type: 'success' });
    setCapturedRawUrl(null);
    onClose();
  };

  const toggleProp = (propId: StudioPropId) => {
    setSceneConfig((prev) => {
      const exists = prev.props.includes(propId);
      const nextProps = exists
        ? prev.props.filter((p) => p !== propId)
        : [...prev.props, propId];
      return { ...prev, props: nextProps };
    });
    if (propId === 'velvet_chair' && !sceneConfig.props.includes('velvet_chair')) {
      if (character.pose !== 'studio_sit') {
        updateChar('pose', 'studio_sit');
        showToast('Switched to sitting pose for chair', { type: 'info' });
      }
    }
  };

  const handleSelectStudioPose = (poseId: CharacterConfig['pose']) => {
    updateChar('pose', poseId);
    if (poseId === 'studio_sit' && !sceneConfig.props.includes('velvet_chair')) {
      setSceneConfig((prev) => ({
        ...prev,
        props: [...prev.props, 'velvet_chair'],
      }));
    }
  };

  const filteredHairStyles = useMemo(
    () =>
      HAIR_STYLES.filter(
        (h) => h.category === 'all' || h.category === character.frame
      ),
    [character.frame]
  );

  if (!isOpen) return null;

  return (
    <div
      id="enmmoe-3d-studio-modal"
      className="fixed inset-0 z-[70] bg-white dark:bg-[#0D1017] text-black dark:text-white flex flex-col select-none overflow-hidden"
    >
      {/* Top Bar — strictly opaque surfaces, NO backdrop-blur over WebGL */}
      <header className="relative z-20 shrink-0 bg-white dark:bg-[#1C1C1E] border-b border-black/[0.08] dark:border-white/[0.1] px-3 pt-safe">
        <div className="h-12 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] h-10 px-1.5 flex items-center gap-0.5 text-[15px] font-medium text-[#007AFF] cursor-pointer ios-press"
            aria-label="Close Studio"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Done</span>
          </button>

          {/* 3-Mode Segmented Control: Creator | Explore | Photo Studio */}
          <div className="flex items-center p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.06]">
            {(
              [
                { id: 'creator', label: 'Creator' },
                { id: 'explore', label: 'Seoul World' },
                { id: 'studio', label: 'Photo' },
              ] as Array<{ id: StudioViewportMode; label: string }>
            ).map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id !== 'creator') handleSaveCharacter(true);
                    setMode(tab.id);
                    setHudHidden(false);
                    setExploreSheet(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-white dark:bg-[#1C1C1E] text-[#007AFF] shadow-sm'
                      : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {tab.id === 'explore' && <Compass className="w-3.5 h-3.5" />}
                  {tab.id === 'studio' && <Camera className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Quick Actions: Currency + Audio + Reset/Hide */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClaimAllowance}
              title="Wallet balance · Tap for daily Seoul allowance"
              className="h-8 px-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-1 text-[12px] font-semibold text-black dark:text-white cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="tabular-nums">{formatWon(wallet.balance)}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleAudio}
              title={audioEnabled ? 'Mute ambient world audio' : 'Play subtle ambient audio'}
              aria-label={audioEnabled ? 'Mute world audio' : 'Enable world audio'}
              className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer ${
                audioEnabled ? 'text-[#007AFF] bg-[#007AFF]/10' : 'text-[#8E8E93]'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            {mode !== 'explore' && (
              <button
                type="button"
                onClick={() => setHudHidden((prev) => !prev)}
                title={hudHidden ? 'Show controls' : 'Clean preview'}
                aria-label={hudHidden ? 'Show controls' : 'Hide controls'}
                className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer ${
                  hudHidden ? 'bg-[#007AFF] text-white' : 'text-[#8E8E93] hover:text-[#007AFF]'
                }`}
              >
                {hudHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Character Slots Strip in Creator Mode */}
        {mode === 'creator' && !hudHidden && (
          <div className="pb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {savedCharacters.map((slot) => {
              const active = slot.id === character.id;
              return (
                <div
                  key={slot.id}
                  className={`shrink-0 flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl border text-[12px] font-medium transition-all ${
                    active
                      ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                      : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectCharacterSlot(slot)}
                    className="cursor-pointer flex items-center gap-1.5 py-0.5"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/15"
                      style={{ backgroundColor: slot.skinTone }}
                    />
                    <span className="max-w-[90px] truncate">{slot.name}</span>
                  </button>
                  {savedCharacters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      aria-label={`Delete ${slot.name}`}
                      className="p-1 text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {savedCharacters.length < 4 && (
              <button
                type="button"
                onClick={() => setShowNewCharSheet((prev) => !prev)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#007AFF] text-[12px] font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Character
              </button>
            )}
          </div>
        )}

        {/* New Character Template Selector (Male / Female) */}
        {mode === 'creator' && showNewCharSheet && !hudHidden && (
          <div className="mb-2.5 p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-[#8E8E93] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#007AFF]" />
              Create new main character:
            </span>
            <div className="flex items-center gap-1.5">
              {(['female', 'male'] as CharacterFrame[]).map((fr) => (
                <button
                  key={fr}
                  type="button"
                  onClick={() => handleCreateCharacterFromFrame(fr)}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.12] text-[12px] font-semibold text-black dark:text-white hover:border-[#007AFF] hover:text-[#007AFF] cursor-pointer capitalize"
                >
                  {fr}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowNewCharSheet(false)}
                className="p-1.5 text-[#8E8E93] cursor-pointer"
                aria-label="Cancel new character"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Explore Mode Sub-Strip: District + Quick Map / Fashion Store / Weather / Quality */}
        {mode === 'explore' && (
          <div className="pb-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setExploreSheet(exploreSheet === 'map' ? null : 'map')}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[12px] font-semibold cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>{currentDistrictInfo.name}</span>
              <span className="text-[#8E8E93]">· {currentDistrictInfo.koreanName}</span>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setExploreSheet(exploreSheet === 'store' ? null : 'store')}
                className={`px-2.5 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1 cursor-pointer ${
                  exploreSheet === 'store'
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Boutique
              </button>

              <button
                type="button"
                onClick={() => setExploreSheet(exploreSheet === 'cafe' ? null : 'cafe')}
                className={`px-2.5 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1 cursor-pointer ${
                  exploreSheet === 'cafe'
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                Café
              </button>

              <button
                type="button"
                onClick={() =>
                  setExploreSheet(exploreSheet === 'atmosphere' ? null : 'atmosphere')
                }
                className={`px-2.5 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-1 cursor-pointer ${
                  exploreSheet === 'atmosphere'
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white'
                }`}
              >
                {sceneConfig.weather === 'rain' ? (
                  <CloudRain className="w-3.5 h-3.5 text-[#007AFF]" />
                ) : sceneConfig.timeOfDay === 'night' ? (
                  <Moon className="w-3.5 h-3.5 text-[#007AFF]" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-[#007AFF]" />
                )}
                <span>Time & Weather</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main 3D Viewport Area */}
      <div className="relative flex-1 min-h-0">
        <StudioViewport3D
          ref={viewportRef}
          character={character}
          sceneConfig={sceneConfig}
          mode={mode}
          quality={quality}
          onNearbyHotspotChange={setNearbyHotspot}
        />

        {/* Explore Mode Controls Overlay — Edge-anchored, opaque, NEVER covering center character */}
        {mode === 'explore' && !capturedRawUrl && (
          <>
            {/* Bottom-Left: Virtual Thumbstick + Sprint Toggle */}
            <div className="absolute bottom-5 left-4 z-20 flex flex-col gap-1.5">
              <VirtualThumbstick
                sprint={sprintEnabled}
                onSprintToggle={() => setSprintEnabled((prev) => !prev)}
                onInput={(x, y) => viewportRef.current?.setMoveInput(x, y, sprintEnabled)}
              />
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-lg bg-white/95 dark:bg-[#1C1C1E]/95 text-[#8E8E93] border border-black/10 dark:border-white/10 self-start">
                WASD / Arrows to walk · Shift to run · Drag to look
              </span>
            </div>

            {/* Bottom-Center: Contextual World Hotspot Prompt */}
            {nearbyHotspot && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <button
                  type="button"
                  onClick={() => handleHotspotAction(nearbyHotspot)}
                  className="h-11 px-4 rounded-2xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-lg flex items-center gap-2 cursor-pointer ios-press whitespace-nowrap"
                >
                  {nearbyHotspot.type === 'shop' && <ShoppingBag className="w-4 h-4" />}
                  {nearbyHotspot.type === 'cafe' && <Coffee className="w-4 h-4" />}
                  {nearbyHotspot.type === 'transit' && <MapPin className="w-4 h-4" />}
                  {nearbyHotspot.type === 'photo' && <Camera className="w-4 h-4" />}
                  <span>
                    {nearbyHotspot.label} ({nearbyHotspot.koreanLabel})
                  </span>
                </button>
              </div>
            )}

            {/* Bottom-Right: Quick Snap & Enter Photo Studio */}
            <div className="absolute bottom-5 right-4 z-20 flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => viewportRef.current?.resetCamera()}
                title="Center camera"
                aria-label="Center camera"
                className="w-10 h-10 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/15 dark:border-white/20 text-black dark:text-white shadow-md flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode('studio')}
                className="h-12 px-4 rounded-full bg-[#007AFF] text-white text-[14px] font-semibold shadow-lg flex items-center gap-2 cursor-pointer ios-press"
              >
                <Camera className="w-4 h-4" />
                <span>Photo Studio</span>
              </button>
            </div>
          </>
        )}

        {/* Clean Preview Floating Actions when HUD Hidden */}
        {hudHidden && mode !== 'explore' && !capturedRawUrl && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="h-12 px-5 rounded-full bg-[#007AFF] text-white text-[15px] font-semibold shadow-lg flex items-center gap-2 cursor-pointer ios-press"
            >
              <Camera className="w-4 h-4" />
              Capture Photo
            </button>
            <button
              type="button"
              onClick={() => setHudHidden(false)}
              className="h-12 px-4 rounded-full bg-white dark:bg-[#1C1C1E] text-black dark:text-white border border-black/15 dark:border-white/15 text-[14px] font-semibold shadow-lg cursor-pointer"
            >
              Controls
            </button>
          </div>
        )}
      </div>

      {/* Explore Mode Modal Sheets (Opaque iOS cards — NO backdrop-blur) */}
      {mode === 'explore' && exploreSheet && !capturedRawUrl && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-white dark:bg-[#1C1C1E] border-t border-black/10 dark:border-white/15 rounded-t-[24px] shadow-2xl max-h-[68vh] flex flex-col">
          <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <h3 className="text-[17px] font-semibold">
              {exploreSheet === 'map' && 'Seoul & Korea Transit Map'}
              {exploreSheet === 'store' && 'Seongsu Fashion Boutique'}
              {exploreSheet === 'cafe' && 'Korean Café & Roastery'}
              {exploreSheet === 'atmosphere' && 'Atmosphere, Weather & Graphics'}
            </h3>
            <button
              type="button"
              onClick={() => setExploreSheet(null)}
              className="w-9 h-9 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center cursor-pointer"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-3 pb-safe">
            {exploreSheet === 'map' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WORLD_DISTRICTS.map((dist) => {
                  const isCurrent = dist.id === sceneConfig.district;
                  const discovered = wallet.discoveredDistricts.includes(dist.id);
                  return (
                    <div
                      key={dist.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 ${
                        isCurrent
                          ? 'bg-[#007AFF]/8 border-[#007AFF]'
                          : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[15px] font-semibold">{dist.name}</span>
                          <span className="text-[12px] font-medium text-[#007AFF]">
                            {dist.koreanName}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#8E8E93] mt-1">{dist.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dist.highlights.map((hl) => (
                            <span
                              key={hl}
                              className="px-2 py-0.5 rounded-md bg-white dark:bg-[#1C1C1E] text-[11px] font-medium text-[#8E8E93]"
                            >
                              {hl}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[12px] font-semibold text-[#8E8E93]">
                          {dist.travelCost === 0 ? 'Free Transit' : `Fare: ${formatWon(dist.travelCost)}`}
                          {!discovered && dist.travelCost > 0 ? ' · +₩4,000 First Visit' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTravelToDistrict(dist)}
                          className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold cursor-pointer ${
                            isCurrent
                              ? 'bg-[#007AFF]/15 text-[#007AFF]'
                              : 'bg-[#007AFF] text-white'
                          }`}
                        >
                          {isCurrent ? 'Here Now' : 'Travel'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {exploreSheet === 'store' && (
              <>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                  <span className="text-[13px] text-[#8E8E93]">Your Balance</span>
                  <span className="text-[15px] font-semibold text-[#007AFF] tabular-nums">
                    {formatWon(wallet.balance)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FASHION_STORE_CATALOG.map((item) => {
                    const owned = wallet.ownedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className="w-9 h-9 rounded-xl shrink-0 border border-black/15"
                            style={{ backgroundColor: item.previewColor }}
                          />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold truncate">{item.name}</p>
                            <p className="text-[11px] uppercase tracking-wide text-[#007AFF] font-semibold">
                              {item.fabric} · {item.category}
                            </p>
                            <p className="text-[12px] text-[#8E8E93] mt-0.5">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold tabular-nums">
                            {owned ? 'In Wardrobe' : formatWon(item.price)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBuyOrWearStoreItem(item)}
                            className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold cursor-pointer ${
                              owned
                                ? 'bg-white dark:bg-[#1C1C1E] text-[#007AFF] border border-[#007AFF]'
                                : 'bg-[#007AFF] text-white'
                            }`}
                          >
                            {owned ? 'Equip Look' : 'Buy & Wear'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {exploreSheet === 'cafe' && (
              <div className="space-y-2.5">
                <p className="text-[13px] text-[#8E8E93]">
                  Take a break at the Seongsu patio café. Ordering sets up a cozy Photo Studio moment.
                </p>
                {CAFE_MENU.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[14px] font-semibold">{item.name}</p>
                      <p className="text-[12px] text-[#8E8E93]">{item.tip}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOrderCafeItem(item)}
                      className="px-3.5 py-2 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shrink-0 cursor-pointer tabular-nums"
                    >
                      {formatWon(item.price)}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {exploreSheet === 'atmosphere' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[13px] font-medium">Time of Day</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'daytime', label: 'Daylight', icon: Sun },
                        { id: 'sunset', label: 'Golden Sunset', icon: Sunrise },
                        { id: 'night', label: 'Seoul Night', icon: Moon },
                      ] as Array<{ id: TimeOfDayId; label: string; icon: React.ComponentType<{ className?: string }> }>
                    ).map((t) => {
                      const Icon = t.icon;
                      const active = sceneConfig.timeOfDay === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setSceneConfig((prev) => ({
                              ...prev,
                              timeOfDay: t.id,
                              lighting:
                                t.id === 'night' ? 'nighttime' : t.id === 'sunset' ? 'sunset' : 'daylight',
                            }))
                          }
                          className={`py-2.5 px-3 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                            active
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[13px] font-medium">Weather</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'clear', label: 'Clear Sky', icon: Sun },
                        { id: 'cloudy', label: 'Overcast', icon: Cloud },
                        { id: 'rain', label: 'Seoul Rain', icon: CloudRain },
                      ] as Array<{ id: WeatherId; label: string; icon: React.ComponentType<{ className?: string }> }>
                    ).map((w) => {
                      const Icon = w.icon;
                      const active = sceneConfig.weather === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSceneConfig((prev) => ({ ...prev, weather: w.id }))}
                          className={`py-2.5 px-3 rounded-xl border text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                            active
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{w.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[13px] font-medium">Graphics Quality</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['high', 'medium', 'low'] as GraphicsQuality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleChangeQuality(q)}
                        className={`py-2.5 px-3 rounded-xl border text-[13px] font-semibold capitalize cursor-pointer ${
                          quality === q
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Interactive Dock for Creator & Photo Studio Modes */}
      {!hudHidden && mode !== 'explore' && !capturedRawUrl && (
        <section className="relative z-20 shrink-0 bg-white dark:bg-[#1C1C1E] border-t border-black/[0.08] dark:border-white/[0.1] flex flex-col max-h-[46vh] sm:max-h-[43vh]">
          {mode === 'creator' ? (
            <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-black/[0.06] dark:border-white/[0.06]">
              {(
                [
                  { id: 'face', label: 'Face & Body' },
                  { id: 'skin', label: 'Skin & Eyes' },
                  { id: 'hair', label: 'Hair' },
                  { id: 'outfits', label: 'Wardrobe & Fabric' },
                  { id: 'details', label: 'Accessories' },
                  { id: 'pose', label: 'Pose & Mood' },
                ] as Array<{ id: CreatorTab; label: string }>
              ).map((tab) => {
                const active = creatorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCreatorTab(tab.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black/80 dark:text-white/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-black/[0.06] dark:border-white/[0.06]">
              {(
                [
                  { id: 'scene', label: 'District & Grade' },
                  { id: 'camera', label: 'Camera' },
                  { id: 'props', label: 'Pets & Props' },
                  { id: 'pose', label: 'Pose & Look' },
                  { id: 'gallery', label: `Creations (${savedPhotos.length})` },
                ] as Array<{ id: StudioTab; label: string }>
              ).map((tab) => {
                const active = studioTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStudioTab(tab.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black/80 dark:text-white/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Scrollable Control Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {mode === 'creator' && creatorTab === 'face' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[12px] font-medium text-[#8E8E93]">Character Name</label>
                    <input
                      type="text"
                      value={character.name}
                      maxLength={24}
                      onChange={(e) => updateChar('name', e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white border border-black/[0.06] dark:border-white/[0.08] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[12px] font-medium text-[#8E8E93]">Character Type</span>
                    <div className="flex gap-1.5">
                      {(['female', 'male'] as CharacterFrame[]).map((fr) => (
                        <button
                          key={fr}
                          type="button"
                          onClick={() => {
                            if (fr !== character.frame) {
                              setCharacter((prev) => ({
                                ...prev,
                                frame: fr,
                                hairStyle: fr === 'female' ? 'long_waves' : 'comma_hair',
                                shoulderScale: fr === 'female' ? 0.94 : 1.06,
                                hipScale: fr === 'female' ? 1.02 : 0.96,
                                waistScale: fr === 'female' ? 0.9 : 1.0,
                                updatedAt: Date.now(),
                              }));
                            }
                          }}
                          className={`px-4 h-10 rounded-xl text-[13px] font-semibold capitalize cursor-pointer border ${
                            character.frame === fr
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                          }`}
                        >
                          {fr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Face Structure
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {FACE_SHAPES.map((fs) => (
                      <button
                        key={fs.id}
                        type="button"
                        onClick={() => updateChar('faceShape', fs.id)}
                        className={`py-2 px-2 rounded-xl text-[12px] font-semibold border cursor-pointer ${
                          character.faceShape === fs.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {fs.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SliderRow
                    label="Jaw Definition"
                    value={character.jawWidth}
                    min={0.82}
                    max={1.18}
                    step={0.01}
                    onChange={(v) => updateChar('jawWidth', v)}
                  />
                  <SliderRow
                    label="Cheekbone Softness"
                    value={character.cheekFullness}
                    min={0.86}
                    max={1.14}
                    step={0.01}
                    onChange={(v) => updateChar('cheekFullness', v)}
                  />
                  <SliderRow
                    label="Nose Bridge"
                    value={character.noseBridgeWidth}
                    min={0.82}
                    max={1.22}
                    step={0.01}
                    onChange={(v) => updateChar('noseBridgeWidth', v)}
                  />
                  <SliderRow
                    label="Nose Length"
                    value={character.noseTipLength}
                    min={0.86}
                    max={1.18}
                    step={0.01}
                    onChange={(v) => updateChar('noseTipLength', v)}
                  />
                  <SliderRow
                    label="Lip Fullness"
                    value={character.lipFullness}
                    min={0.82}
                    max={1.3}
                    step={0.01}
                    onChange={(v) => updateChar('lipFullness', v)}
                  />
                  <SliderRow
                    label="Height"
                    value={character.heightScale}
                    min={0.92}
                    max={1.1}
                    step={0.01}
                    onChange={(v) => updateChar('heightScale', v)}
                  />
                  <SliderRow
                    label="Shoulders"
                    value={character.shoulderScale}
                    min={0.88}
                    max={1.14}
                    step={0.01}
                    onChange={(v) => updateChar('shoulderScale', v)}
                  />
                  <SliderRow
                    label="Waistline"
                    value={character.waistScale}
                    min={0.84}
                    max={1.14}
                    step={0.01}
                    onChange={(v) => updateChar('waistScale', v)}
                  />
                  <SliderRow
                    label="Hip Proportion"
                    value={character.hipScale}
                    min={0.88}
                    max={1.18}
                    step={0.01}
                    onChange={(v) => updateChar('hipScale', v)}
                  />
                </div>

                {/* Quality Preset inside Creator */}
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium">Graphics Quality</p>
                    <p className="text-[11px] text-[#8E8E93]">Balances bloom, shadows & NPC crowd density</p>
                  </div>
                  <div className="flex gap-1.5">
                    {(['high', 'medium', 'low'] as GraphicsQuality[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleChangeQuality(q)}
                        className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold capitalize border cursor-pointer ${
                          quality === q
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-[#8E8E93]'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === 'creator' && creatorTab === 'skin' && (
              <>
                <SwatchRow
                  label="Skin Complexion"
                  colors={SKIN_TONES}
                  selectedHex={character.skinTone}
                  onSelect={(hex) => updateChar('skinTone', hex)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SliderRow
                    label="Natural Cheek Warmth"
                    value={character.blushIntensity}
                    min={0}
                    max={0.85}
                    step={0.02}
                    onChange={(v) => updateChar('blushIntensity', v)}
                  />
                  <SliderRow
                    label="Dermal Freckles"
                    value={character.frecklesIntensity}
                    min={0}
                    max={1}
                    step={0.02}
                    onChange={(v) => updateChar('frecklesIntensity', v)}
                  />
                </div>

                <SwatchRow
                  label="Iris Color"
                  colors={EYE_COLORS}
                  selectedHex={character.eyeColor}
                  onSelect={(hex) => updateChar('eyeColor', hex)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <SliderRow
                    label="Eye Scale"
                    value={character.eyeSize}
                    min={0.88}
                    max={1.16}
                    step={0.01}
                    onChange={(v) => updateChar('eyeSize', v)}
                  />
                  <SliderRow
                    label="Brow Arch"
                    value={character.eyebrowArch}
                    min={-0.4}
                    max={0.45}
                    step={0.02}
                    onChange={(v) => updateChar('eyebrowArch', v)}
                  />
                  <SliderRow
                    label="Brow Density"
                    value={character.eyebrowThickness}
                    min={0.75}
                    max={1.32}
                    step={0.02}
                    onChange={(v) => updateChar('eyebrowThickness', v)}
                  />
                </div>

                <SwatchRow
                  label="Lip Tone"
                  colors={LIP_COLORS}
                  selectedHex={character.lipColor}
                  onSelect={(hex) => updateChar('lipColor', hex)}
                />
              </>
            )}

            {mode === 'creator' && creatorTab === 'hair' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-black dark:text-white">
                      Strand Hairstyles
                    </span>
                    <span className="text-[12px] text-[#8E8E93] capitalize">
                      {character.frame} & Unisex Cuts
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {filteredHairStyles.map((hs) => (
                      <button
                        key={hs.id}
                        type="button"
                        onClick={() => updateChar('hairStyle', hs.id)}
                        className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer text-left ${
                          character.hairStyle === hs.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {hs.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Forehead Framing
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {BANGS_OPTIONS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => updateChar('bangsStyle', b.id)}
                        className={`py-2 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer ${
                          character.bangsStyle === b.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <SwatchRow
                  label="Hair Color"
                  colors={HAIR_COLORS}
                  selectedHex={character.hairColor}
                  onSelect={(hex) => updateChar('hairColor', hex)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <SliderRow
                    label="Hair Length"
                    value={character.hairLength}
                    min={0.68}
                    max={1.25}
                    step={0.02}
                    onChange={(v) => updateChar('hairLength', v)}
                  />
                  <SliderRow
                    label="Natural Sheen"
                    value={character.hairGloss}
                    min={0.22}
                    max={0.85}
                    step={0.02}
                    onChange={(v) => updateChar('hairGloss', v)}
                  />
                </div>
              </>
            )}

            {mode === 'creator' && creatorTab === 'outfits' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-black dark:text-white">
                      Korean Editorial Silhouettes
                    </span>
                    <span className="text-[12px] text-[#8E8E93]">
                      {character.outfitPreset === 'custom' ? 'Custom Tailored' : 'Curated Set'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {OUTFIT_PRESETS.filter(
                      (p) => p.frameHint === 'all' || p.frameHint === character.frame
                    ).map((preset) => {
                      const active = character.outfitPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPresetOutfit(preset.id)}
                          className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer text-left flex items-center justify-between gap-1.5 ${
                            active
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                          }`}
                        >
                          <span className="truncate">{preset.label}</span>
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-black/15"
                            style={{ backgroundColor: preset.primary }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real Fabric Materials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#007AFF]" />
                      Top / Outerwear Fabric
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FABRIC_MATERIALS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateChar('primaryFabric', f.id)}
                          className={`px-2.5 py-1 rounded-lg text-[12px] font-medium border cursor-pointer ${
                            character.primaryFabric === f.id
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#8E8E93] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#007AFF]" />
                      Bottom Fabric
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FABRIC_MATERIALS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateChar('secondaryFabric', f.id)}
                          className={`px-2.5 py-1 rounded-lg text-[12px] font-medium border cursor-pointer ${
                            character.secondaryFabric === f.id
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mix & Match Piece Customization */}
                <div className="space-y-2.5 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Mix & Match Separates
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[12px] text-[#8E8E93]">Top</span>
                      <div className="flex flex-wrap gap-1.5">
                        {TOP_OPTIONS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              setCharacter((prev) => ({
                                ...prev,
                                outfitPreset: 'custom',
                                topStyle: t.id,
                                updatedAt: Date.now(),
                              }))
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer ${
                              character.outfitPreset === 'custom' && character.topStyle === t.id
                                ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                                : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[12px] text-[#8E8E93]">Bottom</span>
                      <div className="flex flex-wrap gap-1.5">
                        {BOTTOM_OPTIONS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() =>
                              setCharacter((prev) => ({
                                ...prev,
                                outfitPreset: 'custom',
                                bottomStyle: b.id,
                                updatedAt: Date.now(),
                              }))
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer ${
                              character.outfitPreset === 'custom' && character.bottomStyle === b.id
                                ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                                : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[12px] text-[#8E8E93]">Outerwear Coat / Jacket</span>
                      <div className="flex flex-wrap gap-1.5">
                        {OUTERWEAR_OPTIONS.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => updateChar('outerwearStyle', o.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer ${
                              character.outerwearStyle === o.id
                                ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                                : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[12px] text-[#8E8E93]">Footwear</span>
                      <div className="flex flex-wrap gap-1.5">
                        {FOOTWEAR_OPTIONS.map((fw) => (
                          <button
                            key={fw.id}
                            type="button"
                            onClick={() => updateChar('footwearStyle', fw.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer ${
                              character.footwearStyle === fw.id
                                ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                                : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                            }`}
                          >
                            {fw.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <SwatchRow
                  label="Main Garment Color"
                  colors={FASHION_COLORS}
                  selectedHex={character.primaryOutfitColor}
                  onSelect={(hex) => updateChar('primaryOutfitColor', hex)}
                />
                <SwatchRow
                  label="Bottom / Layer Color"
                  colors={FASHION_COLORS}
                  selectedHex={character.secondaryOutfitColor}
                  onSelect={(hex) => updateChar('secondaryOutfitColor', hex)}
                />
                <SwatchRow
                  label="Shoe Color"
                  colors={FASHION_COLORS}
                  selectedHex={character.footwearColor}
                  onSelect={(hex) => updateChar('footwearColor', hex)}
                />

                {/* Save Outfit Look */}
                <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Saved Wardrobe Looks
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lookNameInput}
                      maxLength={24}
                      onChange={(e) => setLookNameInput(e.target.value)}
                      placeholder="Name this outfit..."
                      className="flex-1 h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[14px] text-black dark:text-white placeholder-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveLook}
                      className="px-3.5 h-10 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold cursor-pointer"
                    >
                      Save Look
                    </button>
                  </div>
                  {savedOutfits.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {savedOutfits.map((look) => (
                        <button
                          key={look.id}
                          type="button"
                          onClick={() => handleApplySavedLook(look)}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer hover:border-[#007AFF]"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: look.primaryOutfitColor }}
                          />
                          <span>{look.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === 'creator' && creatorTab === 'details' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Eyewear
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GLASSES_OPTIONS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => updateChar('glassesStyle', g.id)}
                        className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer ${
                          character.glassesStyle === g.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Jewelry
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {JEWELRY_OPTIONS.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => updateChar('jewelryStyle', j.id)}
                        className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer ${
                          character.jewelryStyle === j.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {j.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Bags
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {BAG_OPTIONS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => updateChar('bagStyle', bg.id)}
                        className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer ${
                          character.bagStyle === bg.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {((mode === 'creator' && creatorTab === 'pose') ||
              (mode === 'studio' && studioTab === 'pose')) && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Character Pose
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STUDIO_POSES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectStudioPose(p.id)}
                        className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer ${
                          character.pose === p.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Facial Expression
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STUDIO_EXPRESSIONS.map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => updateChar('expression', exp.id)}
                        className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer ${
                          character.expression === exp.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {exp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mode === 'studio' && studioTab === 'scene' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Korean Shooting Location
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {WORLD_DISTRICTS.map((dist) => (
                      <button
                        key={dist.id}
                        type="button"
                        onClick={() =>
                          setSceneConfig((prev) => ({
                            ...prev,
                            district: dist.id,
                            timeOfDay: dist.defaultTime,
                            weather: dist.defaultWeather,
                          }))
                        }
                        className={`p-3 rounded-xl border text-left cursor-pointer ${
                          sceneConfig.district === dist.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent'
                        }`}
                      >
                        <p
                          className={`text-[13px] font-semibold ${
                            sceneConfig.district === dist.id
                              ? 'text-[#007AFF]'
                              : 'text-black dark:text-white'
                          }`}
                        >
                          {dist.name}
                        </p>
                        <p className="text-[11px] text-[#8E8E93] mt-0.5">{dist.koreanName}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#8E8E93]">Time of Day</span>
                    <div className="flex gap-1.5">
                      {(['daytime', 'sunset', 'night'] as TimeOfDayId[]).map((tod) => (
                        <button
                          key={tod}
                          type="button"
                          onClick={() => setSceneConfig((prev) => ({ ...prev, timeOfDay: tod }))}
                          className={`flex-1 py-2 rounded-xl text-[12px] font-semibold capitalize border cursor-pointer ${
                            sceneConfig.timeOfDay === tod
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                          }`}
                        >
                          {tod}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[12px] text-[#8E8E93]">Weather</span>
                    <div className="flex gap-1.5">
                      {(['clear', 'cloudy', 'rain'] as WeatherId[]).map((wt) => (
                        <button
                          key={wt}
                          type="button"
                          onClick={() => setSceneConfig((prev) => ({ ...prev, weather: wt }))}
                          className={`flex-1 py-2 rounded-xl text-[12px] font-semibold capitalize border cursor-pointer ${
                            sceneConfig.weather === wt
                              ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                              : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                          }`}
                        >
                          {wt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-[13px] font-medium text-black dark:text-white">
                    Film Color Grade
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {STUDIO_PHOTO_FILTERS.map((flt) => (
                      <button
                        key={flt.id}
                        type="button"
                        onClick={() =>
                          setSceneConfig((prev) => ({ ...prev, photoFilter: flt.id }))
                        }
                        className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border cursor-pointer ${
                          sceneConfig.photoFilter === flt.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {flt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mode === 'studio' && studioTab === 'camera' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-black dark:text-white">
                      Camera Angles
                    </span>
                    <button
                      type="button"
                      onClick={() => viewportRef.current?.resetCamera()}
                      className="text-[12px] font-semibold text-[#007AFF] cursor-pointer"
                    >
                      Reset Framing
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {STUDIO_CAMERA_PRESETS.map((cam) => (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() =>
                          setSceneConfig((prev) => ({ ...prev, cameraPreset: cam.id }))
                        }
                        className={`py-2 px-2.5 rounded-xl text-[12px] font-semibold border cursor-pointer ${
                          sceneConfig.cameraPreset === cam.id
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        {cam.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <SliderRow
                    label="Lens Distance"
                    value={sceneConfig.zoomDistance}
                    min={1.4}
                    max={5.0}
                    step={0.05}
                    onChange={(v) => setSceneConfig((prev) => ({ ...prev, zoomDistance: v }))}
                  />
                  <SliderRow
                    label="Elevation"
                    value={sceneConfig.cameraHeightOffset}
                    min={-0.35}
                    max={0.45}
                    step={0.02}
                    onChange={(v) =>
                      setSceneConfig((prev) => ({ ...prev, cameraHeightOffset: v }))
                    }
                  />
                  <SliderRow
                    label="Turn Subject"
                    value={sceneConfig.characterRotationY}
                    min={-Math.PI}
                    max={Math.PI}
                    step={0.05}
                    onChange={(v) =>
                      setSceneConfig((prev) => ({ ...prev, characterRotationY: v }))
                    }
                  />
                </div>
              </div>
            )}

            {mode === 'studio' && studioTab === 'props' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-black dark:text-white">
                    Pets, Vehicles & Scene Props
                  </span>
                  {sceneConfig.props.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSceneConfig((prev) => ({ ...prev, props: [] }))}
                      className="text-[12px] font-semibold text-[#007AFF] cursor-pointer"
                    >
                      Clear Props
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STUDIO_PROPS.map((prop) => {
                    const active = sceneConfig.props.includes(prop.id);
                    return (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => toggleProp(prop.id)}
                        className={`py-2.5 px-3 rounded-xl text-[13px] font-semibold border cursor-pointer flex items-center justify-between ${
                          active
                            ? 'bg-[#007AFF]/10 border-[#007AFF] text-[#007AFF]'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] border-transparent text-black dark:text-white'
                        }`}
                      >
                        <span>{prop.label}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === 'studio' && studioTab === 'gallery' && (
              <div className="space-y-2.5">
                {savedPhotos.length === 0 ? (
                  <div className="py-6 text-center text-[14px] text-[#8E8E93]">
                    No photos saved yet. Capture a photo in any Seoul district to earn ₩ rewards or share to Stories!
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {savedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1]"
                      >
                        <img
                          src={photo.imageDataUrl}
                          alt={photo.characterName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-1 bottom-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectAvatar(photo.imageDataUrl);
                              showToast('Updated profile avatar', { type: 'success' });
                            }}
                            className="flex-1 py-1 rounded-lg bg-[#007AFF] text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Avatar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSavedPhotos(deleteStudioPhoto(photo.id));
                              showToast('Creation removed', { type: 'info' });
                            }}
                            aria-label="Delete photo"
                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#1C1C1E] text-black dark:text-white cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Persistent Bottom Action Bar */}
          <footer className="px-4 py-2.5 pb-safe bg-white dark:bg-[#1C1C1E] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 shrink-0">
            {mode === 'creator' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveCharacter(false)}
                  className="h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white text-[14px] font-semibold flex items-center gap-1.5 cursor-pointer ios-press"
                >
                  <Save className="w-4 h-4 text-[#007AFF]" />
                  Save
                </button>
                <button
                  type="button"
                  disabled={isProcessingCapture}
                  onClick={handleSetCurrentPortraitAsAvatar}
                  className="h-11 px-3 rounded-xl bg-[#007AFF]/10 text-[#007AFF] text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ios-press disabled:opacity-60"
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Use as Avatar</span>
                  <span className="sm:hidden">Avatar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCharacter(true);
                    setMode('explore');
                  }}
                  className="flex-1 h-11 px-4 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ios-press"
                >
                  <Compass className="w-4 h-4" />
                  <span>Enter Seoul World</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isProcessingCapture}
                  onClick={handleSetCurrentPortraitAsAvatar}
                  className="h-11 px-3.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white text-[14px] font-semibold flex items-center gap-1.5 cursor-pointer ios-press disabled:opacity-60"
                >
                  <UserCheck className="w-4 h-4 text-[#007AFF]" />
                  <span className="hidden sm:inline">Set Avatar</span>
                  <span className="sm:hidden">Avatar</span>
                </button>
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="flex-1 h-11 px-5 rounded-xl bg-[#007AFF] text-white text-[15px] font-semibold flex items-center justify-center gap-2 cursor-pointer ios-press"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              </>
            )}
          </footer>
        </section>
      )}

      {/* Photo Review & Story Composer Overlay */}
      {capturedRawUrl && (
        <div className="fixed inset-0 z-30 bg-white dark:bg-[#0D1017] flex flex-col">
          <header className="h-13 px-4 pt-safe bg-white dark:bg-[#1C1C1E] border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => setCapturedRawUrl(null)}
              className="text-[16px] font-medium text-[#007AFF] py-2 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-5 h-5" />
              Retake
            </button>
            <h3 className="text-[17px] font-semibold">Seoul Capture</h3>
            <button
              type="button"
              onClick={() => handleSaveCreationPhoto(false)}
              className="text-[16px] font-semibold text-[#007AFF] py-2 cursor-pointer flex items-center gap-1"
            >
              <FolderOpen className="w-4 h-4" />
              Save
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4">
            <div className="w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-lg">
              <img
                src={composedPreviewUrl || capturedRawUrl}
                alt="Studio capture preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full max-w-md space-y-3.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] p-4 rounded-2xl border border-black/[0.05] dark:border-white/[0.08]">
              {/* Filter Grade */}
              <div className="space-y-1.5">
                <span className="text-[12px] font-medium text-[#8E8E93] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#007AFF]" />
                  Color Grade
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STUDIO_PHOTO_FILTERS.map((flt) => (
                    <button
                      key={flt.id}
                      type="button"
                      onClick={() => setReviewFilter(flt.id)}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border cursor-pointer ${
                        reviewFilter === flt.id
                          ? 'bg-[#007AFF] text-white border-[#007AFF]'
                          : 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white border-black/[0.06] dark:border-white/[0.08]'
                      }`}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Story Sticker Pill */}
              <div className="space-y-1.5">
                <span className="text-[12px] font-medium text-[#8E8E93]">Story Location Tag</span>
                <div className="flex flex-wrap gap-1.5">
                  {STORY_STICKER_OPTIONS.map((stk) => (
                    <button
                      key={stk}
                      type="button"
                      onClick={() => setStorySticker(stk)}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border cursor-pointer ${
                        storySticker === stk
                          ? 'bg-[#007AFF] text-white border-[#007AFF]'
                          : 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white border-black/[0.06] dark:border-white/[0.08]'
                      }`}
                    >
                      {stk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Story Caption */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#8E8E93]">
                  Story / Post Caption
                </label>
                <input
                  type="text"
                  value={storyCaption}
                  maxLength={120}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  placeholder={`Capturing ${currentDistrictInfo.name}...`}
                  className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white placeholder-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]"
                />
              </div>
            </div>
          </div>

          <footer className="p-4 pb-safe bg-white dark:bg-[#1C1C1E] border-t border-black/[0.08] dark:border-white/[0.1] grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl w-full mx-auto">
            <button
              type="button"
              disabled={isProcessingCapture}
              onClick={handleUseReviewAsAvatar}
              className="h-11 px-4 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer ios-press"
            >
              <UserCheck className="w-4 h-4 text-[#007AFF]" />
              Use as Avatar
            </button>

            {onPublishPost && (
              <button
                type="button"
                onClick={handleShareAsPost}
                className="h-11 px-4 rounded-xl bg-[#007AFF]/12 text-[#007AFF] text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer ios-press"
              >
                <Share2 className="w-4 h-4" />
                Share as Post
              </button>
            )}

            {onPublishStory ? (
              <button
                type="button"
                onClick={handleShareToStory}
                className="h-11 px-4 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer ios-press"
              >
                <Send className="w-4 h-4" />
                Share to enmmoe Story
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveCreationPhoto(false)}
                className="h-11 px-4 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer ios-press"
              >
                <ImageIcon className="w-4 h-4" />
                Save Creation
              </button>
            )}
          </footer>
        </div>
      )}
    </div>
  );
};
