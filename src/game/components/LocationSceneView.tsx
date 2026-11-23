import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BedDouble,
  Briefcase,
  Camera,
  Check,
  Coffee,
  Gift,
  Heart,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Train,
} from 'lucide-react';
import {
  buildOutfitPrompt,
  cacheSvgElementAsAsset,
  getPlayerRefAssetId,
  requestArtworkGeneration,
} from '../artworkGenerator';
import { getCharactersAtLocation, MAIN_CHARACTERS } from '../characterData';
import { LOCATION_META, getAllCatalogOutfits, getOutfitById } from '../saveSystem';
import {
  ArtworkGenerationState,
  LocationId,
  MainCharacterProfile,
  OutfitCategory,
  OutfitItem,
  PlayerCharacter,
  RelationshipState,
  TimeOfDay,
} from '../types';
import {
  CAFE_MENU_ITEMS,
  GIFT_CATALOG,
  OUTFIT_CATEGORY_LABELS,
  getAllOutfitCategories,
} from '../wardrobeCatalog';
import { LocationIllustrationBackdrop, WebtoonPortrait } from '../webtoonArt';
import { MiniGameKind, MiniGamesModal } from './MiniGamesModal';

export interface LocationSceneViewProps {
  location: LocationId;
  timeOfDay: TimeOfDay;
  player: PlayerCharacter;
  money: number;
  ownedOutfitIds: string[];
  customOutfits: OutfitItem[];
  inventoryGifts: Record<string, number>;
  relationships: Record<string, RelationshipState>;
  onLeaveToStreet: () => void;
  onTalkCharacter: (npc: MainCharacterProfile) => void;
  onBuyOutfit: (outfit: OutfitItem) => boolean;
  onEquipOutfit: (outfitId: string) => void;
  onAddCustomOutfit: (outfit: OutfitItem) => void;
  onBuyGift: (giftId: string) => boolean;
  onCafeDateComplete: (params: {
    partner: MainCharacterProfile;
    drinkId: string;
    dessertId: string;
    totalPrice: number;
    affectionGain: number;
    reactionLine: string;
  }) => void;
  onEarnMoney: (amount: number, label: string) => void;
  onAdvanceTime: (steps?: number, toMorning?: boolean) => void;
  onOpenPhotoStudio: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const CUSTOM_OUTFIT_PALETTES = [
  { name: 'Sakura Silk', primary: '#F6BACB', secondary: '#FFF8FA', accent: '#D86C8E' },
  { name: 'Celadon Jade', primary: '#A7D7C5', secondary: '#FFFDF8', accent: '#558B78' },
  { name: 'Midnight Berry', primary: '#564E7A', secondary: '#F8F4FF', accent: '#E092B3' },
  { name: 'Honey Latte', primary: '#DEC09D', secondary: '#FFFBF5', accent: '#8F6445' },
];

export const LocationSceneView: React.FC<LocationSceneViewProps> = ({
  location,
  timeOfDay,
  player,
  money,
  ownedOutfitIds,
  customOutfits,
  inventoryGifts,
  relationships,
  onLeaveToStreet,
  onTalkCharacter,
  onBuyOutfit,
  onEquipOutfit,
  onAddCustomOutfit,
  onBuyGift,
  onCafeDateComplete,
  onEarnMoney,
  onAdvanceTime,
  onOpenPhotoStudio,
  onShowToast,
}) => {
  const [boutiqueTab, setBoutiqueTab] = useState<'outfits' | 'gifts' | 'generate'>('outfits');
  const [categoryFilter, setCategoryFilter] = useState<'all' | OutfitCategory>('all');
  const [previewOutfitId, setPreviewOutfitId] = useState<string>(player.equippedOutfitId);

  // Café Date state
  const [selectedDatePartnerId, setSelectedDatePartnerId] = useState<string>(MAIN_CHARACTERS[0].id);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string>('cafe_einspanner');
  const [selectedDessertId, setSelectedDessertId] = useState<string>('cafe_strawberry_bingsu');
  const [dateReaction, setDateReaction] = useState<string | null>(null);

  // Mini-game modal state
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameKind | null>(null);

  // Boutique "Generate New Outfit" state
  const [customOutfitName, setCustomOutfitName] = useState('Seongsu Cloud Ribbon');
  const [customOutfitCategory, setCustomOutfitCategory] = useState<OutfitCategory>('dresses');
  const [customPaletteIdx, setCustomPaletteIdx] = useState(0);
  const [genPrompt, setGenPrompt] = useState(
    'Soft pastel Korean cardigan layered over pleated ivory dress with silk ribbon'
  );
  const [genState, setGenState] = useState<ArtworkGenerationState>({ status: 'idle' });
  const previewSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setPreviewOutfitId(player.equippedOutfitId);
    setDateReaction(null);
  }, [location, player.equippedOutfitId]);

  const meta = LOCATION_META[location];
  const scheduledNpcs = getCharactersAtLocation(location, timeOfDay);
  const allOutfits = getAllCatalogOutfits(customOutfits);

  const drinks = CAFE_MENU_ITEMS.filter((i) => i.kind === 'drink');
  const desserts = CAFE_MENU_ITEMS.filter((i) => i.kind === 'dessert');
  const selectedDrink = drinks.find((d) => d.id === selectedDrinkId) || drinks[0];
  const selectedDessert = desserts.find((d) => d.id === selectedDessertId) || desserts[0];
  const dateCost = selectedDrink.price + selectedDessert.price;
  const datePartner =
    MAIN_CHARACTERS.find((c) => c.id === selectedDatePartnerId) || MAIN_CHARACTERS[0];

  const handleTriggerCafeDate = () => {
    if (money < dateCost) {
      onShowToast(`Need ₩${dateCost.toLocaleString()} for drinks & dessert.`, 'error');
      return;
    }
    const isFavDrink = datePartner.cafePreferences.favoriteDrinkId === selectedDrink.id;
    const isFavDessert = datePartner.cafePreferences.favoriteDessertId === selectedDessert.id;
    const gain = 6 + (isFavDrink ? 4 : 0) + (isFavDessert ? 4 : 0);
    const reply =
      isFavDrink || isFavDessert
        ? datePartner.cafePreferences.favoriteReply
        : datePartner.cafePreferences.otherReply;

    setDateReaction(reply);
    onCafeDateComplete({
      partner: datePartner,
      drinkId: selectedDrink.id,
      dessertId: selectedDessert.id,
      totalPrice: dateCost,
      affectionGain: gain,
      reactionLine: reply,
    });
  };

  const handleRequestGeminiOutfit = async () => {
    const assetId = `gemini:outfit:${player.id}:${Date.now()}`;
    const refId = getPlayerRefAssetId(player);
    if (previewSvgRef.current) {
      await cacheSvgElementAsAsset({
        assetId: refId,
        kind: 'character_reference',
        characterId: player.id,
        svgElement: previewSvgRef.current,
      });
    }
    setGenState({ status: 'loading', message: 'Requesting Gemini outfit illustration...' });
    const result = await requestArtworkGeneration({
      assetId,
      kind: 'outfit_illustration',
      characterId: player.id,
      prompt: buildOutfitPrompt(player.name, genPrompt),
      aspectRatio: '3:4',
      referenceAssetId: refId,
      forceRegenerate: true,
    });
    setGenState(result);
  };

  const handleSaveGeneratedOutfitToWardrobe = async () => {
    const chosenPalette = CUSTOM_OUTFIT_PALETTES[customPaletteIdx];
    const id = `custom_outfit_${Date.now()}`;
    const silhouetteMap: Record<OutfitCategory, OutfitItem['silhouette']> = {
      streetwear: 'hoodie',
      casual: 'knit',
      dresses: 'dress',
      school: 'blazer',
      hanbok: 'hanbok',
      winter: 'coat',
      formal: 'suit',
      special: 'stage',
    };
    const newItem: OutfitItem = {
      id,
      name: customOutfitName.trim() || 'Atelier Custom Look',
      category: customOutfitCategory,
      price: 0,
      description: genPrompt.trim() || 'Tailored atelier webtoon piece.',
      fabricNote: 'Custom Seongsu atelier edition',
      palette: {
        primary: chosenPalette.primary,
        secondary: chosenPalette.secondary,
        accent: chosenPalette.accent,
      },
      silhouette: silhouetteMap[customOutfitCategory],
      reactionMood: 'bespoke',
      isGenerated: true,
      customAssetId: genState.status === 'cached' ? `gemini:outfit:${id}` : undefined,
    };

    onAddCustomOutfit(newItem);
    onEquipOutfit(id);
    setPreviewOutfitId(id);
    onShowToast(`Saved "${newItem.name}" to your wardrobe & equipped!`, 'success');
  };

  const filteredOutfits =
    categoryFilter === 'all'
      ? allOutfits
      : allOutfits.filter((o) => o.category === categoryFilter);

  const previewOutfit = getOutfitById(previewOutfitId, customOutfits);

  return (
    <div className="flex flex-col h-full bg-[#FFFDFB] dark:bg-[#121216] text-[#2F242D] dark:text-white overflow-y-auto pb-20">
      {/* Illustrated Scene Banner */}
      <div className="relative h-44 sm:h-52 w-full shrink-0">
        <LocationIllustrationBackdrop
          location={location}
          timeOfDay={timeOfDay}
          className="w-full h-full"
        />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onLeaveToStreet}
            className="min-h-[40px] px-3.5 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 text-[#2F242D] dark:text-white text-[13px] font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer ios-press"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Street</span>
          </button>

          <div className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 text-[12px] font-semibold shadow-sm">
            {meta.name} · {meta.koreanName}
          </div>
        </div>

        {/* Characters Currently Visiting This Location */}
        {scheduledNpcs.length > 0 && (
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {scheduledNpcs.map((npc) => (
              <button
                key={npc.id}
                type="button"
                onClick={() => onTalkCharacter(npc)}
                className="shrink-0 pl-1.5 pr-3 py-1 rounded-full bg-white/95 dark:bg-[#1C1C1E]/95 shadow-md inline-flex items-center gap-2 cursor-pointer ios-press"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FFF2F6]">
                  <WebtoonPortrait
                    appearance={npc.appearance}
                    outfit={getOutfitById(npc.appearance.equippedOutfitId, customOutfits)}
                    expression="smiling"
                    className="w-full h-full"
                  />
                </div>
                <span className="text-[12px] font-semibold">
                  Talk to {npc.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LOCATION SPECIFIC INTERACTIVE CONTENT */}
      <div className="px-4 py-4 space-y-5">
        {location === 'cafe' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[19px] font-bold">Cafe Bomnal Date & Counter</h2>
                <p className="text-[12px] text-[#8A7D85]">
                  Treat an adult friend or crush to coffee & Korean pastries
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMiniGame('cafe_barista')}
                className="min-h-[40px] px-3.5 rounded-full bg-[#FFF0F5] dark:bg-[#2A2433] border border-[#F39CB2] text-[13px] font-semibold text-[#D84A76] dark:text-[#FF9EBB] inline-flex items-center gap-1.5 cursor-pointer ios-press"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Barista Job</span>
              </button>
            </div>

            {/* Invite Character Picker */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">Invite to Your Table</h3>
              <div className="grid grid-cols-3 gap-2">
                {MAIN_CHARACTERS.map((npc) => {
                  const selected = npc.id === selectedDatePartnerId;
                  const rel = relationships[npc.id];
                  return (
                    <button
                      key={npc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDatePartnerId(npc.id);
                        setDateReaction(null);
                      }}
                      className={`p-2 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#FFF0F5] dark:bg-[#292234] border-[#F0688E]'
                          : 'bg-white dark:bg-[#1A1922] border-black/8 dark:border-white/10'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FFF6FA]">
                        <WebtoonPortrait
                          appearance={npc.appearance}
                          outfit={getOutfitById(npc.appearance.equippedOutfitId, customOutfits)}
                          expression={selected ? 'happy' : 'smiling'}
                          className="w-full h-full"
                        />
                      </div>
                      <span className="text-[12px] font-semibold truncate max-w-full">
                        {npc.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-[#F0688E] inline-flex items-center gap-0.5">
                        <Heart className="w-2.5 h-2.5 fill-current" />
                        {rel?.affection ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drinks */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">1. Choose a Drink</h3>
              <div className="grid grid-cols-2 gap-2">
                {drinks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedDrinkId(item.id)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer ${
                      selectedDrinkId === item.id
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1A1922]'
                    }`}
                  >
                    <p className="text-[13px] font-semibold">{item.name}</p>
                    <p className="text-[11px] text-[#8A7D85]">
                      {item.koreanName} · ₩{item.price.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Desserts */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">2. Choose a Dessert</h3>
              <div className="grid grid-cols-2 gap-2">
                {desserts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedDessertId(item.id)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer ${
                      selectedDessertId === item.id
                        ? 'border-[#007AFF] bg-[#007AFF]/10'
                        : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1A1922]'
                    }`}
                  >
                    <p className="text-[13px] font-semibold">{item.name}</p>
                    <p className="text-[11px] text-[#8A7D85]">
                      {item.koreanName} · ₩{item.price.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {dateReaction && (
              <div className="p-4 rounded-2xl bg-[#FFF4F8] dark:bg-[#262030] border border-[#F39CB2]/50 space-y-1.5">
                <p className="text-[12px] font-bold text-[#D84A76] dark:text-[#FF9EBB]">
                  {datePartner.name} smiles across the table:
                </p>
                <p className="text-[14px] leading-relaxed">“{dateReaction}”</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleTriggerCafeDate}
              disabled={money < dateCost}
              className="w-full min-h-[48px] rounded-2xl bg-[#F4A6B8] text-[#2F242D] font-bold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer ios-press disabled:opacity-45"
            >
              <Coffee className="w-4 h-4" />
              <span>
                Order & Enjoy Date (₩{dateCost.toLocaleString()})
              </span>
            </button>
          </>
        )}

        {location === 'boutique' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[19px] font-bold">Atelier Boutique</h2>
                <p className="text-[12px] text-[#8A7D85]">
                  {allOutfits.length} outfits across 8 Korean fashion categories
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMiniGame('boutique_stylist')}
                className="min-h-[40px] px-3.5 rounded-full bg-[#F2ECFF] dark:bg-[#272338] border border-[#B59DF0] text-[13px] font-semibold text-[#6F52B8] dark:text-[#CFC2F9] inline-flex items-center gap-1.5 cursor-pointer ios-press"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Stylist Job</span>
              </button>
            </div>

            {/* Store Subtabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#F3EFF5] dark:bg-[#1E1C26]">
              {[
                { id: 'outfits', label: 'Outfits' },
                { id: 'gifts', label: 'Gifts' },
                { id: 'generate', label: 'New Outfit' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBoutiqueTab(t.id as typeof boutiqueTab)}
                  className={`h-9 rounded-xl text-[13px] font-semibold cursor-pointer ${
                    boutiqueTab === t.id
                      ? 'bg-white dark:bg-[#2E2B3A] shadow-sm'
                      : 'text-[#8A7D85]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {boutiqueTab === 'outfits' && (
              <>
                {/* Live Try-on Strip */}
                <div className="p-3 rounded-2xl bg-[#FAF6FC] dark:bg-[#1A1824] border border-black/8 dark:border-white/10 flex items-center gap-3.5">
                  <div className="w-[74px] h-[90px] rounded-2xl overflow-hidden bg-white dark:bg-[#242130] shrink-0">
                    <WebtoonPortrait
                      appearance={player}
                      outfit={previewOutfit}
                      expression="smiling"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#8A7D85] uppercase">
                      Trying On
                    </p>
                    <p className="text-[15px] font-bold truncate">{previewOutfit.name}</p>
                    <p className="text-[12px] text-[#8A7D85] line-clamp-2">
                      {previewOutfit.description}
                    </p>
                  </div>
                </div>

                {/* 8 Category Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                      categoryFilter === 'all'
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F3EFF5] dark:bg-[#242130]'
                    }`}
                  >
                    All ({allOutfits.length})
                  </button>
                  {getAllOutfitCategories().map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#F3EFF5] dark:bg-[#242130]'
                      }`}
                    >
                      {OUTFIT_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                {/* Outfits Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredOutfits.map((outfit) => {
                    const isOwned = ownedOutfitIds.includes(outfit.id);
                    const isEquipped = player.equippedOutfitId === outfit.id;
                    const affordable = money >= outfit.price;
                    return (
                      <div
                        key={outfit.id}
                        className={`p-3 rounded-2xl border flex flex-col justify-between gap-2.5 ${
                          isEquipped
                            ? 'border-[#007AFF] bg-[#007AFF]/8'
                            : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1A1922]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewOutfitId(outfit.id)}
                          className="text-left cursor-pointer space-y-2"
                        >
                          <div className="w-full h-24 rounded-xl overflow-hidden bg-[#FFF7FA] dark:bg-[#23212D] flex items-center justify-center">
                            <WebtoonPortrait
                              appearance={player}
                              outfit={outfit}
                              expression="smiling"
                              className="h-full w-auto"
                            />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold leading-tight truncate">
                              {outfit.name}
                            </p>
                            <p className="text-[11px] text-[#8A7D85] capitalize">
                              {OUTFIT_CATEGORY_LABELS[outfit.category]}
                            </p>
                          </div>
                        </button>

                        {isEquipped ? (
                          <div className="h-9 rounded-xl bg-[#007AFF]/15 text-[#007AFF] text-[12px] font-semibold flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Equipped</span>
                          </div>
                        ) : isOwned ? (
                          <button
                            type="button"
                            onClick={() => {
                              onEquipOutfit(outfit.id);
                              setPreviewOutfitId(outfit.id);
                            }}
                            className="h-9 rounded-xl bg-[#F3EFF5] dark:bg-[#292636] text-[12px] font-semibold cursor-pointer ios-press"
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!affordable}
                            onClick={() => {
                              const ok = onBuyOutfit(outfit);
                              if (ok) setPreviewOutfitId(outfit.id);
                            }}
                            className="h-9 rounded-xl bg-[#007AFF] text-white text-[12px] font-semibold cursor-pointer ios-press disabled:opacity-40"
                          >
                            Buy ₩{outfit.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {boutiqueTab === 'gifts' && (
              <div className="space-y-2.5">
                {GIFT_CATALOG.map((gift) => {
                  const qty = inventoryGifts[gift.id] || 0;
                  return (
                    <div
                      key={gift.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#1A1922] border border-black/8 dark:border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: gift.accentColor }}
                        >
                          <Gift className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold truncate">
                            {gift.name} {qty > 0 ? `(Owned: ${qty})` : ''}
                          </p>
                          <p className="text-[12px] text-[#8A7D85] line-clamp-1">
                            {gift.description}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={money < gift.price}
                        onClick={() => onBuyGift(gift.id)}
                        className="shrink-0 min-h-[38px] px-3.5 rounded-xl bg-[#007AFF] text-white text-[12px] font-semibold cursor-pointer disabled:opacity-40"
                      >
                        ₩{gift.price.toLocaleString()}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {boutiqueTab === 'generate' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#FAF6FC] dark:bg-[#1B1925] border border-black/8 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 aspect-[240/290] rounded-2xl overflow-hidden bg-white dark:bg-[#242130] shrink-0">
                      {genState.status === 'cached' && genState.dataUrl ? (
                        <img
                          src={genState.dataUrl}
                          alt="Generated outfit preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <WebtoonPortrait
                          svgRef={previewSvgRef}
                          appearance={player}
                          outfit={{
                            id: 'draft_preview',
                            name: customOutfitName,
                            category: customOutfitCategory,
                            price: 0,
                            description: genPrompt,
                            fabricNote: 'Custom look',
                            palette: CUSTOM_OUTFIT_PALETTES[customPaletteIdx],
                            silhouette:
                              customOutfitCategory === 'hanbok'
                                ? 'hanbok'
                                : customOutfitCategory === 'dresses'
                                ? 'dress'
                                : customOutfitCategory === 'winter'
                                ? 'coat'
                                : 'knit',
                            reactionMood: 'bespoke',
                          }}
                          expression="smiling"
                          showBackdrop
                          className="w-full h-full"
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={customOutfitName}
                        onChange={(e) => setCustomOutfitName(e.target.value)}
                        placeholder="Outfit name"
                        className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#262332] border border-black/8 dark:border-white/10 text-[13px] font-semibold"
                      />
                      <select
                        value={customOutfitCategory}
                        onChange={(e) => setCustomOutfitCategory(e.target.value as OutfitCategory)}
                        className="w-full h-9 px-3 rounded-xl bg-white dark:bg-[#262332] border border-black/8 dark:border-white/10 text-[13px]"
                      >
                        {getAllOutfitCategories().map((c) => (
                          <option key={c} value={c}>
                            {OUTFIT_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Pastel Colorway Selector */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {CUSTOM_OUTFIT_PALETTES.map((pal, idx) => (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => setCustomPaletteIdx(idx)}
                        className={`p-2 rounded-xl border text-[11px] font-medium cursor-pointer flex items-center gap-1.5 ${
                          customPaletteIdx === idx
                            ? 'border-[#007AFF] bg-[#007AFF]/10'
                            : 'border-black/8 dark:border-white/10'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: pal.primary }}
                        />
                        <span className="truncate">{pal.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    rows={2}
                    placeholder="Describe fabric, silhouette, and Korean webtoon styling..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-[#262332] border border-black/8 dark:border-white/10 text-[13px] resize-none"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={genState.status === 'loading'}
                      onClick={handleRequestGeminiOutfit}
                      className="min-h-[42px] px-3 rounded-xl bg-[#F3EFF5] dark:bg-[#2B2838] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {genState.status === 'error' || genState.status === 'unavailable' ? (
                        <RefreshCw className="w-3.5 h-3.5 text-[#007AFF]" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[#F0688E]" />
                      )}
                      <span>
                        {genState.status === 'loading'
                          ? 'Requesting...'
                          : genState.status === 'error' || genState.status === 'unavailable'
                          ? 'Retry AI Art'
                          : 'Request AI Art'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveGeneratedOutfitToWardrobe}
                      className="min-h-[42px] px-3 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ios-press"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Save & Equip</span>
                    </button>
                  </div>

                  {genState.message && (
                    <p className="text-[12px] text-[#8A7D85] leading-snug">
                      {genState.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {location === 'photo_studio' && (
          <div className="space-y-4">
            <h2 className="text-[19px] font-bold">Starlight Photo Studio</h2>
            <p className="text-[14px] text-[#6F646B] dark:text-[#A89CA5]">
              Compose Solo, Couple, Character, or Outfit portraits with pastel frames, stickers, captions, and PNG export.
            </p>
            <button
              type="button"
              onClick={onOpenPhotoStudio}
              className="w-full min-h-[48px] rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer ios-press"
            >
              <Camera className="w-4 h-4" />
              <span>Open Photo Studio Booth</span>
            </button>
          </div>
        )}

        {location === 'park' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[19px] font-bold">Cherry Fountain Park</h2>
                <p className="text-[12px] text-[#8A7D85]">
                  Walk beneath pastel blossoms or earn won taking outdoor portraits
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMiniGame('park_photo')}
                className="min-h-[42px] px-4 rounded-full bg-[#007AFF] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ios-press"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photo Gig</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onAdvanceTime(1, false);
                onShowToast('Strolled through the cherry blossoms. Time advanced!', 'info');
              }}
              className="w-full min-h-[46px] rounded-2xl bg-[#F4EFF6] dark:bg-[#23212D] font-semibold text-[14px] cursor-pointer"
            >
              Take an Unhurried Fountain Stroll (Advance Time)
            </button>
          </div>
        )}

        {(location === 'metro' || location === 'taxi') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Train className="w-5 h-5 text-[#007AFF]" />
              <h2 className="text-[19px] font-bold">
                {location === 'metro' ? 'Seoul Metro Station' : 'Orange Taxi Stand'}
              </h2>
            </div>
            <p className="text-[14px] text-[#6F646B] dark:text-[#A89CA5]">
              {location === 'metro'
                ? 'Hop on Line 2 (₩1,400) to jump straight into a new part of the day across Seongsu.'
                : 'Take a comfy evening cab (₩4,800) to reach another schedule window right away.'}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  const fare = location === 'metro' ? 1400 : 4800;
                  if (money < fare) {
                    onShowToast(`Need ₩${fare.toLocaleString()} for fare.`, 'error');
                    return;
                  }
                  onEarnMoney(-fare, `${location === 'metro' ? 'Metro' : 'Taxi'} Fare`);
                  onAdvanceTime(1, false);
                  onLeaveToStreet();
                }}
                className="w-full min-h-[46px] rounded-2xl bg-[#007AFF] text-white font-semibold text-[14px] inline-flex items-center justify-center gap-2 cursor-pointer ios-press"
              >
                <MapPin className="w-4 h-4" />
                <span>
                  Ride & Advance Time (₩{location === 'metro' ? '1,400' : '4,800'})
                </span>
              </button>
            </div>
          </div>
        )}

        {location === 'home' && (
          <div className="space-y-4">
            <h2 className="text-[19px] font-bold">Your Seongsu Loft</h2>
            <p className="text-[14px] text-[#6F646B] dark:text-[#A89CA5]">
              Catch your breath, switch outfits in your closet, or sleep to start a fresh morning with updated character schedules.
            </p>
            <button
              type="button"
              onClick={() => {
                onAdvanceTime(1, true);
                onShowToast('Good morning! A new Seoul day has begun.', 'success');
              }}
              className="w-full min-h-[48px] rounded-2xl bg-[#A8C9F0] text-[#2F242D] font-bold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer ios-press"
            >
              <BedDouble className="w-4 h-4" />
              <span>Rest Until Tomorrow Morning</span>
            </button>

            <div className="space-y-2 pt-2">
              <h3 className="text-[13px] font-semibold text-[#8A7D85]">
                Home Closet ({ownedOutfitIds.length} Owned)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {allOutfits
                  .filter((o) => ownedOutfitIds.includes(o.id))
                  .map((outfit) => (
                    <button
                      key={outfit.id}
                      type="button"
                      onClick={() => onEquipOutfit(outfit.id)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer ${
                        player.equippedOutfitId === outfit.id
                          ? 'border-[#007AFF] bg-[#007AFF]/10'
                          : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1A1922]'
                      }`}
                    >
                      <p className="text-[13px] font-semibold truncate">{outfit.name}</p>
                      <p className="text-[11px] text-[#8A7D85] capitalize">
                        {player.equippedOutfitId === outfit.id ? 'Wearing now' : outfit.category}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {activeMiniGame && (
        <MiniGamesModal
          kind={activeMiniGame}
          onClose={() => setActiveMiniGame(null)}
          onComplete={(earned, summary) => {
            setActiveMiniGame(null);
            onEarnMoney(earned, summary);
          }}
        />
      )}
    </div>
  );
};
