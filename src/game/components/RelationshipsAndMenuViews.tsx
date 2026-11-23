import React, { useState } from 'react';
import {
  Clock,
  Download,
  Heart,
  MapPin,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Settings,
  Sparkles,
  Upload,
} from 'lucide-react';
import { getRelationshipStatusLabel, MAIN_CHARACTERS } from '../characterData';
import { LOCATION_META, formatTimeLabel, getOutfitById } from '../saveSystem';
import {
  ExpressionId,
  GameSaveState,
  GameSettings,
  LocationId,
  MainCharacterProfile,
  StoryEventMilestone,
} from '../types';
import { GIFT_CATALOG } from '../wardrobeCatalog';
import { WebtoonPortrait } from '../webtoonArt';

const EXPRESSION_PREVIEW_SET: ExpressionId[] = [
  'smiling',
  'happy',
  'shy',
  'surprised',
  'sad',
  'angry',
];

export interface RelationshipsAndMenuViewProps {
  saveState: GameSaveState;
  onTalkCharacter: (npc: MainCharacterProfile) => void;
  onReplayEvent: (npc: MainCharacterProfile, event: StoryEventMilestone) => void;
  onSelectLocation: (loc: LocationId) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onRecoverFromIDB: () => void;
  onResetGame: () => void;
  onOpenCustomizer: () => void;
}

export const RelationshipsAndMenuView: React.FC<RelationshipsAndMenuViewProps> = ({
  saveState,
  onTalkCharacter,
  onReplayEvent,
  onSelectLocation,
  onUpdateSettings,
  onRecoverFromIDB,
  onResetGame,
  onOpenCustomizer,
}) => {
  const [subTab, setSubTab] = useState<'bonds' | 'map' | 'profile'>('bonds');
  const [selectedNpcId, setSelectedNpcId] = useState<string>(MAIN_CHARACTERS[0].id);
  const [previewExpr, setPreviewExpr] = useState<ExpressionId>('smiling');
  const [confirmReset, setConfirmReset] = useState(false);

  const selectedNpc = MAIN_CHARACTERS.find((c) => c.id === selectedNpcId) || MAIN_CHARACTERS[0];
  const selectedRel = saveState.relationships[selectedNpc.id];

  const handleDownloadBackupJson = () => {
    const blob = new Blob([JSON.stringify(saveState, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enmmoe-webtoon-save-day${saveState.day}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFDFB] dark:bg-[#121216] text-[#2F242D] dark:text-white overflow-y-auto pb-20">
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#F3EFF5] dark:bg-[#1E1C26]">
          {[
            { id: 'bonds', label: 'Characters' },
            { id: 'map', label: 'City Map' },
            { id: 'profile', label: 'Profile & Save' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as typeof subTab)}
              className={`h-9 rounded-xl text-[13px] font-semibold cursor-pointer ${
                subTab === tab.id ? 'bg-white dark:bg-[#2E2B3A] shadow-sm' : 'text-[#8A7D85]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {subTab === 'bonds' && (
          <>
            {/* Character Switcher */}
            <div className="grid grid-cols-3 gap-2">
              {MAIN_CHARACTERS.map((npc) => {
                const rel = saveState.relationships[npc.id];
                const active = npc.id === selectedNpcId;
                return (
                  <button
                    key={npc.id}
                    type="button"
                    onClick={() => {
                      setSelectedNpcId(npc.id);
                      setPreviewExpr('smiling');
                    }}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer ${
                      active
                        ? 'border-[#F0688E] bg-[#FFF0F5] dark:bg-[#292234]'
                        : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1A1922]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FFF6FA]">
                      <WebtoonPortrait
                        appearance={npc.appearance}
                        outfit={getOutfitById(npc.appearance.equippedOutfitId, saveState.customOutfits)}
                        expression="smiling"
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[12px] font-bold truncate max-w-full">
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

            {/* Selected Adult Character Profile Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1A1922] border border-black/8 dark:border-white/10 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-24 aspect-[240/290] rounded-2xl overflow-hidden bg-[#FFF6FA] dark:bg-[#242130] shrink-0">
                  <WebtoonPortrait
                    appearance={selectedNpc.appearance}
                    outfit={getOutfitById(
                      selectedNpc.appearance.equippedOutfitId,
                      saveState.customOutfits
                    )}
                    expression={previewExpr}
                    showBackdrop
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[17px] font-bold truncate">
                      {selectedNpc.name} ({selectedNpc.age})
                    </h3>
                  </div>
                  <p className="text-[12px] font-medium text-[#007AFF]">{selectedNpc.role}</p>
                  <p className="text-[12px] text-[#8A7D85]">
                    Status:{' '}
                    <span className="font-semibold text-[#F0688E]">
                      {getRelationshipStatusLabel(selectedRel?.affection ?? 0)}
                    </span>{' '}
                    · {selectedRel?.affection ?? 0} pts
                  </p>
                  <p className="text-[12px] text-[#6F646B] dark:text-[#B4A8B0] leading-snug pt-0.5">
                    {selectedNpc.personality}
                  </p>
                </div>
              </div>

              {/* 6-Expression Interactive Preview Strip */}
              <div>
                <p className="text-[11px] font-semibold text-[#8A7D85] mb-1.5">
                  Expressions (6 consistent states)
                </p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {EXPRESSION_PREVIEW_SET.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPreviewExpr(ex)}
                      className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold capitalize cursor-pointer ${
                        previewExpr === ex
                          ? 'bg-[#2F242D] text-white dark:bg-white dark:text-black'
                          : 'bg-[#F3EFF5] dark:bg-[#252230]'
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[13px] space-y-2 border-t border-black/6 dark:border-white/10 pt-3">
                <p>
                  <span className="font-semibold">Backstory:</span> {selectedNpc.backstory}
                </p>
                <p>
                  <span className="font-semibold">Likes:</span> {selectedNpc.likes.join(' · ')}
                </p>
                <p>
                  <span className="font-semibold">Dislikes:</span> {selectedNpc.dislikes.join(' · ')}
                </p>
                <p className="flex items-center gap-1.5 text-[12px] text-[#8A7D85]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Morning: {LOCATION_META[selectedNpc.schedule.morning].name} · Afternoon:{' '}
                    {LOCATION_META[selectedNpc.schedule.afternoon].name} · Evening:{' '}
                    {LOCATION_META[selectedNpc.schedule.evening].name}
                  </span>
                </p>
              </div>

              {/* Story Events Progress */}
              <div className="space-y-2 pt-1">
                <p className="text-[12px] font-bold text-[#8A7D85] inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#F0688E]" />
                  Story Events
                </p>
                {selectedNpc.storyEvents.map((ev) => {
                  const unlocked =
                    (selectedRel?.affection ?? 0) >= ev.requiredAffection ||
                    selectedRel?.unlockedEventIds.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-2xl bg-[#FAF6FC] dark:bg-[#23202D] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{ev.title}</p>
                        <p className="text-[11px] text-[#8A7D85] truncate">
                          {unlocked ? ev.teaser : `Unlocks at ${ev.requiredAffection} affection`}
                        </p>
                      </div>
                      {unlocked && (
                        <button
                          type="button"
                          onClick={() => onReplayEvent(selectedNpc, ev)}
                          className="shrink-0 h-8 px-3 rounded-full bg-[#007AFF] text-white text-[12px] font-semibold cursor-pointer"
                        >
                          View
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onTalkCharacter(selectedNpc)}
                className="w-full min-h-[44px] rounded-2xl bg-[#F4A6B8] text-[#2F242D] font-bold text-[14px] inline-flex items-center justify-center gap-2 cursor-pointer ios-press"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Start Conversation with {selectedNpc.name.split(' ')[0]}</span>
              </button>
            </div>
          </>
        )}

        {subTab === 'map' && (
          <div className="space-y-2.5">
            <h2 className="text-[18px] font-bold">Seoul District Map</h2>
            <p className="text-[12px] text-[#8A7D85]">
              Current time: Day {saveState.day} · {formatTimeLabel(saveState.timeOfDay)}
            </p>
            {(Object.keys(LOCATION_META) as LocationId[]).map((locId) => {
              const info = LOCATION_META[locId];
              const here = MAIN_CHARACTERS.filter((c) => c.schedule[saveState.timeOfDay] === locId);
              return (
                <button
                  key={locId}
                  type="button"
                  onClick={() => onSelectLocation(locId)}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer ${
                    saveState.currentLocation === locId
                      ? 'border-[#007AFF] bg-[#007AFF]/8'
                      : 'border-black/8 dark:border-white/10 bg-white dark:bg-[#1A1922]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#007AFF] shrink-0" />
                      <span className="text-[14px] font-bold">{info.name}</span>
                      <span className="text-[12px] text-[#8A7D85]">{info.koreanName}</span>
                    </div>
                    <p className="text-[12px] text-[#8A7D85] mt-0.5">{info.subtitle}</p>
                    {here.length > 0 && (
                      <p className="text-[11px] font-semibold text-[#F0688E] mt-1">
                        Here now: {here.map((h) => h.name.split(' ')[0]).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-[12px] font-semibold text-[#007AFF] shrink-0">Go</span>
                </button>
              );
            })}
          </div>
        )}

        {subTab === 'profile' && (
          <div className="space-y-4">
            {/* Player Summary Card */}
            <div className="p-4 rounded-3xl bg-white dark:bg-[#1A1922] border border-black/8 dark:border-white/10 flex items-center gap-3.5">
              <div className="w-16 h-20 rounded-2xl overflow-hidden bg-[#FFF6FA] shrink-0">
                <WebtoonPortrait
                  appearance={saveState.player}
                  outfit={getOutfitById(saveState.player.equippedOutfitId, saveState.customOutfits)}
                  expression="smiling"
                  showBackdrop
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-bold truncate">{saveState.player.name}</p>
                <p className="text-[13px] font-semibold text-[#007AFF] tabular-nums">
                  ₩{saveState.money.toLocaleString()}
                </p>
                <p className="text-[12px] text-[#8A7D85]">
                  Day {saveState.day} ({formatTimeLabel(saveState.timeOfDay)}) ·{' '}
                  {saveState.ownedOutfitIds.length} Outfits · {saveState.studioGallery.length} Photos
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCustomizer}
                className="h-9 px-3 rounded-full bg-[#F3EFF5] dark:bg-[#272433] text-[12px] font-semibold cursor-pointer"
              >
                Edit
              </button>
            </div>

            {/* Inventory Gifts */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1922] border border-black/8 dark:border-white/10 space-y-2">
              <h3 className="text-[14px] font-bold">Gift Inventory</h3>
              {Object.entries(saveState.inventoryGifts).filter(([, qty]) => qty > 0).length === 0 ? (
                <p className="text-[12px] text-[#8A7D85]">No gifts in bag yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(saveState.inventoryGifts)
                    .filter(([, qty]) => qty > 0)
                    .map(([giftId, qty]) => {
                      const g = GIFT_CATALOG.find((x) => x.id === giftId);
                      if (!g) return null;
                      return (
                        <span
                          key={giftId}
                          className="px-3 py-1 rounded-full bg-[#FFF4F8] dark:bg-[#292334] text-[12px] font-medium"
                        >
                          {g.name} ×{qty}
                        </span>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Game Settings & Save Recovery */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1922] border border-black/8 dark:border-white/10 space-y-3">
              <h3 className="text-[14px] font-bold inline-flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#007AFF]" />
                <span>Settings & Save Recovery</span>
              </h3>

              <div className="flex items-center justify-between">
                <span className="text-[13px]">Dialogue Typing Speed</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      textSpeed: saveState.settings.textSpeed === 'normal' ? 'fast' : 'normal',
                    })
                  }
                  className="h-8 px-3 rounded-full bg-[#F3EFF5] dark:bg-[#272433] text-[12px] font-semibold capitalize cursor-pointer"
                >
                  {saveState.settings.textSpeed}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[13px]">Swipe Street Movement</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      swipeMoveEnabled: !saveState.settings.swipeMoveEnabled,
                    })
                  }
                  className="h-8 px-3 rounded-full bg-[#F3EFF5] dark:bg-[#272433] text-[12px] font-semibold cursor-pointer"
                >
                  {saveState.settings.swipeMoveEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onRecoverFromIDB}
                  className="min-h-[40px] px-3 rounded-xl bg-[#F3EFF5] dark:bg-[#272433] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Recover Save</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBackupJson}
                  className="min-h-[40px] px-3 rounded-xl bg-[#F3EFF5] dark:bg-[#272433] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Backup JSON</span>
                </button>
              </div>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full min-h-[38px] rounded-xl text-[12px] font-semibold text-red-500 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Story Progress</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReset(false);
                      onResetGame();
                    }}
                    className="flex-1 h-9 rounded-xl bg-red-500 text-white text-[12px] font-semibold cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 h-9 rounded-xl bg-[#F3EFF5] dark:bg-[#272433] text-[12px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <p className="text-[11px] text-[#8A7D85] inline-flex items-center gap-1">
                <Upload className="w-3 h-3" />
                Auto-saved locally & mirrored to IndexedDB ({new Date(saveState.lastSavedAt).toLocaleTimeString()})
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
