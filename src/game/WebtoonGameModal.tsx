import React, { useEffect, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  Compass,
  Heart,
  ShoppingBag,
  Sliders,
  Sun,
  Moon,
  Sunrise,
  Wallet,
} from 'lucide-react';
import { SocialPost, Story } from '../types';
import { GIFT_CATALOG } from './wardrobeCatalog';
import { buildConversationLines } from './characterData';
import {
  LOCATION_META,
  advanceGameTime,
  formatTimeLabel,
  getOutfitById,
  loadGameSaveSync,
  persistGameSave,
  recoverGameSaveFromIDB,
  resetGameSave,
} from './saveSystem';
import {
  DialogueChoice,
  DialogueLine,
  ExpressionId,
  GameSaveState,
  LocationId,
  MainCharacterProfile,
  OutfitItem,
  PlayerCharacter,
  StoryEventMilestone,
} from './types';
import { CharacterCustomizerView } from './components/CharacterCustomizerView';
import { DialogueOverlay } from './components/DialogueOverlay';
import { LocationSceneView } from './components/LocationSceneView';
import { PhotoStudioView } from './components/PhotoStudioView';
import { RelationshipsAndMenuView } from './components/RelationshipsAndMenuViews';
import { WorldWalkerView } from './components/WorldWalkerView';
import { useToast } from '../components/ui';

export type WebtoonGameMode = 'explore' | 'creator' | 'studio';
type GameTab = 'world' | 'customize' | 'boutique' | 'studio' | 'bonds';

export interface WebtoonGameModalProps {
  isOpen: boolean;
  initialMode?: WebtoonGameMode;
  playerDefaultName?: string;
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
  onPublishStory?: (storyData: Partial<Story>) => void;
  onPublishPost?: (postData: Partial<SocialPost>) => void;
}

export const WebtoonGameModal: React.FC<WebtoonGameModalProps> = ({
  isOpen,
  initialMode = 'explore',
  playerDefaultName = 'Seo-yeon',
  onClose,
  onSelectAvatar,
  onPublishPost,
}) => {
  const { showToast } = useToast();

  const [saveState, setSaveState] = useState<GameSaveState>(() => {
    const loaded = loadGameSaveSync(playerDefaultName);
    return loaded.state;
  });

  const [activeTab, setActiveTab] = useState<GameTab>(() =>
    initialMode === 'creator'
      ? 'customize'
      : initialMode === 'studio'
      ? 'studio'
      : 'world'
  );

  // Sync entry mode whenever opened
  useEffect(() => {
    if (!isOpen) return;
    if (initialMode === 'creator') setActiveTab('customize');
    else if (initialMode === 'studio') setActiveTab('studio');
    else setActiveTab('world');
  }, [isOpen, initialMode]);

  // Recover from IndexedDB backup if localStorage was wiped
  useEffect(() => {
    const syncCheck = loadGameSaveSync(playerDefaultName);
    if (syncCheck.recoveredFromBackup) {
      showToast('Recovered your progress from backup save.', { type: 'info' });
    } else if (syncCheck.isNewSave) {
      void recoverGameSaveFromIDB().then((restored) => {
        if (restored) {
          setSaveState(restored);
          showToast('Restored your saved Seoul life progress!', { type: 'info' });
        }
      });
    }
  }, [playerDefaultName, showToast]);

  // Active dialogue state
  const [dialogueSession, setDialogueSession] = useState<{
    npc: MainCharacterProfile;
    lines: DialogueLine[];
    unlockEventId?: string;
  } | null>(null);

  if (!isOpen) return null;

  const commitSave = (updater: (prev: GameSaveState) => GameSaveState) => {
    setSaveState((prev) => persistGameSave(updater(prev)));
  };

  const handleEnterLocation = (locId: LocationId) => {
    if (locId === 'photo_studio') {
      commitSave((prev) => ({
        ...prev,
        currentLocation: 'photo_studio',
        playerX: LOCATION_META.photo_studio.streetX,
      }));
      setActiveTab('studio');
      return;
    }
    if (locId === 'boutique') {
      commitSave((prev) => ({
        ...prev,
        currentLocation: 'boutique',
        playerX: LOCATION_META.boutique.streetX,
      }));
      setActiveTab('boutique');
      return;
    }
    commitSave((prev) => ({
      ...prev,
      currentLocation: locId,
      playerX: LOCATION_META[locId]?.streetX ?? prev.playerX,
    }));
    setActiveTab('world');
  };

  const handleStartConversation = (npc: MainCharacterProfile) => {
    const rel = saveState.relationships[npc.id];
    const equipped = getOutfitById(saveState.player.equippedOutfitId, saveState.customOutfits);
    const pendingMilestone = npc.storyEvents.find(
      (ev) => rel.affection >= ev.requiredAffection && !rel.unlockedEventIds.includes(ev.id)
    );
    const lines = buildConversationLines(npc, rel, saveState.timeOfDay, equipped.category);
    setDialogueSession({
      npc,
      lines,
      unlockEventId: pendingMilestone?.id,
    });
  };

  const handleReplayEvent = (npc: MainCharacterProfile, ev: StoryEventMilestone) => {
    setDialogueSession({
      npc,
      lines: ev.dialogue,
    });
  };

  const handleChoiceSelected = (choice: DialogueChoice) => {
    if (!dialogueSession) return;
    const npcId = dialogueSession.npc.id;
    commitSave((prev) => {
      const prevRel = prev.relationships[npcId];
      const nextMemories = choice.rememberKey
        ? { ...prevRel.rememberedChoices, [choice.rememberKey]: choice.rememberValue || choice.label }
        : prevRel.rememberedChoices;
      const nextEvents =
        dialogueSession.unlockEventId &&
        !prevRel.unlockedEventIds.includes(dialogueSession.unlockEventId)
          ? [...prevRel.unlockedEventIds, dialogueSession.unlockEventId]
          : prevRel.unlockedEventIds;
      return {
        ...prev,
        relationships: {
          ...prev.relationships,
          [npcId]: {
            ...prevRel,
            affection: Math.max(0, prevRel.affection + choice.affectionDelta),
            conversationsHad: prevRel.conversationsHad + 1,
            unlockedEventIds: nextEvents,
            rememberedChoices: nextMemories,
            lastMetDay: prev.day,
          },
        },
        choiceLog: choice.rememberKey
          ? [
              ...prev.choiceLog,
              {
                characterId: npcId,
                key: choice.rememberKey,
                value: choice.rememberValue || choice.label,
                day: prev.day,
              },
            ]
          : prev.choiceLog,
      };
    });
  };

  const handleGiveGift = (
    giftId: string
  ): { affectionGain: number; reactionText: string; expression: ExpressionId } => {
    if (!dialogueSession) {
      return { affectionGain: 0, reactionText: '', expression: 'smiling' };
    }
    const npc = dialogueSession.npc;
    const gift = GIFT_CATALOG.find((g) => g.id === giftId);
    const isFav = npc.favoriteGifts.includes(giftId);
    const gain = isFav ? 14 : 6;

    commitSave((prev) => {
      const qty = prev.inventoryGifts[giftId] || 0;
      if (qty <= 0) return prev;
      const prevRel = prev.relationships[npc.id];
      return {
        ...prev,
        inventoryGifts: {
          ...prev.inventoryGifts,
          [giftId]: qty - 1,
        },
        relationships: {
          ...prev.relationships,
          [npc.id]: {
            ...prevRel,
            affection: prevRel.affection + gain,
            giftsGiven: prevRel.giftsGiven + 1,
          },
        },
      };
    });

    return {
      affectionGain: gain,
      expression: isFav ? 'happy' : 'smiling',
      reactionText: isFav
        ? `Wait—${gift?.name || 'this'}?! How did you know I adore these?! Thank you so much!! (+${gain} affection)`
        : `Aww, ${gift?.name || 'a gift'}? You’re genuinely thoughtful, thank you! (+${gain} affection)`,
    };
  };

  const handleBuyOutfit = (outfit: OutfitItem): boolean => {
    if (saveState.ownedOutfitIds.includes(outfit.id)) {
      commitSave((prev) => ({
        ...prev,
        player: { ...prev.player, equippedOutfitId: outfit.id, updatedAt: Date.now() },
      }));
      return true;
    }
    if (saveState.money < outfit.price) {
      showToast(`Not enough won! Need ₩${outfit.price.toLocaleString()}.`, { type: 'error' });
      return false;
    }
    commitSave((prev) => ({
      ...prev,
      money: prev.money - outfit.price,
      ownedOutfitIds: [...prev.ownedOutfitIds, outfit.id],
      player: { ...prev.player, equippedOutfitId: outfit.id, updatedAt: Date.now() },
    }));
    showToast(`Purchased & equipped "${outfit.name}"!`, { type: 'success' });
    return true;
  };

  const handleBuyGift = (giftId: string): boolean => {
    const gift = GIFT_CATALOG.find((g) => g.id === giftId);
    if (!gift) return false;
    if (saveState.money < gift.price) {
      showToast(`Need ₩${gift.price.toLocaleString()} for ${gift.name}.`, { type: 'error' });
      return false;
    }
    commitSave((prev) => ({
      ...prev,
      money: prev.money - gift.price,
      inventoryGifts: {
        ...prev.inventoryGifts,
        [gift.id]: (prev.inventoryGifts[gift.id] || 0) + 1,
      },
    }));
    showToast(`Bought ${gift.name}! Give it during conversation.`, { type: 'success' });
    return true;
  };

  const TimeIcon =
    saveState.timeOfDay === 'morning'
      ? Sunrise
      : saveState.timeOfDay === 'afternoon'
      ? Sun
      : Moon;

  return (
    <div
      id="webtoon-life-game-modal"
      className="fixed inset-0 z-[70] bg-[#FFFDFB] dark:bg-[#121216] text-[#2F242D] dark:text-white flex flex-col overflow-hidden select-none"
    >
      {/* Top Game HUD */}
      <header className="shrink-0 pt-safe bg-white/95 dark:bg-[#16151D]/95 border-b border-black/8 dark:border-white/10 px-3.5 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[38px] px-2.5 rounded-full bg-[#F4EFF6] dark:bg-[#242230] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer ios-press"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>enmmoe</span>
        </button>

        {/* Day & Time Status */}
        <div className="inline-flex items-center gap-1.5 text-[12px] font-bold">
          <TimeIcon className="w-3.5 h-3.5 text-[#F0688E]" />
          <span>Day {saveState.day}</span>
          <span className="text-[#8A7D85]">·</span>
          <span>{formatTimeLabel(saveState.timeOfDay)}</span>
        </div>

        {/* KRW Currency Wallet */}
        <div className="px-3 py-1.5 rounded-full bg-[#FFF4F8] dark:bg-[#262030] border border-[#F39CB2]/50 inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums">
          <Wallet className="w-3.5 h-3.5 text-[#F0688E]" />
          <span>₩{saveState.money.toLocaleString()}</span>
        </div>
      </header>

      {/* Active Viewport Screen */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'world' && saveState.currentLocation === 'street' && (
          <WorldWalkerView
            player={saveState.player}
            playerX={saveState.playerX}
            facing={saveState.facing}
            timeOfDay={saveState.timeOfDay}
            customOutfits={saveState.customOutfits}
            relationships={saveState.relationships}
            swipeMoveEnabled={saveState.settings.swipeMoveEnabled}
            onMove={(nextX, dir) =>
              commitSave((prev) => ({ ...prev, playerX: nextX, facing: dir }))
            }
            onEnterLocation={handleEnterLocation}
            onTalkNpc={handleStartConversation}
          />
        )}

        {activeTab === 'world' && saveState.currentLocation !== 'street' && (
          <LocationSceneView
            location={saveState.currentLocation}
            timeOfDay={saveState.timeOfDay}
            player={saveState.player}
            money={saveState.money}
            ownedOutfitIds={saveState.ownedOutfitIds}
            customOutfits={saveState.customOutfits}
            inventoryGifts={saveState.inventoryGifts}
            relationships={saveState.relationships}
            onLeaveToStreet={() =>
              commitSave((prev) => ({ ...prev, currentLocation: 'street' }))
            }
            onTalkCharacter={handleStartConversation}
            onBuyOutfit={handleBuyOutfit}
            onEquipOutfit={(id) =>
              commitSave((prev) => ({
                ...prev,
                player: { ...prev.player, equippedOutfitId: id, updatedAt: Date.now() },
              }))
            }
            onAddCustomOutfit={(item) =>
              commitSave((prev) => ({
                ...prev,
                customOutfits: [item, ...prev.customOutfits],
                ownedOutfitIds: [...prev.ownedOutfitIds, item.id],
              }))
            }
            onBuyGift={handleBuyGift}
            onCafeDateComplete={({ partner, totalPrice, affectionGain }) => {
              commitSave((prev) => {
                const rel = prev.relationships[partner.id];
                const nextTime = advanceGameTime(prev.day, prev.timeOfDay, 1);
                return {
                  ...prev,
                  money: Math.max(0, prev.money - totalPrice),
                  day: nextTime.day,
                  timeOfDay: nextTime.timeOfDay,
                  relationships: {
                    ...prev.relationships,
                    [partner.id]: {
                      ...rel,
                      affection: rel.affection + affectionGain,
                      datesHad: rel.datesHad + 1,
                      lastMetDay: prev.day,
                    },
                  },
                };
              });
              showToast(
                `Wonderful Café Date with ${partner.name.split(' ')[0]}! (+${affectionGain} affection)`,
                { type: 'success' }
              );
            }}
            onEarnMoney={(amount, summary) => {
              commitSave((prev) => ({
                ...prev,
                money: Math.max(0, prev.money + amount),
              }));
              showToast(
                amount >= 0
                  ? `${summary}: +₩${amount.toLocaleString()}`
                  : `${summary}: -₩${Math.abs(amount).toLocaleString()}`,
                { type: amount >= 0 ? 'success' : 'info' }
              );
            }}
            onAdvanceTime={(steps = 1, toMorning = false) => {
              commitSave((prev) => {
                if (toMorning) {
                  return {
                    ...prev,
                    day: prev.day + 1,
                    timeOfDay: 'morning',
                  };
                }
                const nextTime = advanceGameTime(prev.day, prev.timeOfDay, steps);
                return {
                  ...prev,
                  day: nextTime.day,
                  timeOfDay: nextTime.timeOfDay,
                };
              });
            }}
            onOpenPhotoStudio={() => setActiveTab('studio')}
            onShowToast={(msg, type = 'info') => showToast(msg, { type })}
          />
        )}

        {activeTab === 'customize' && (
          <CharacterCustomizerView
            player={saveState.player}
            ownedOutfitIds={saveState.ownedOutfitIds}
            customOutfits={saveState.customOutfits}
            onSavePlayer={(updated: PlayerCharacter) => {
              commitSave((prev) => ({ ...prev, player: updated }));
              showToast('Character appearance & reference portrait saved!', { type: 'success' });
            }}
            onBackToCity={() => {
              commitSave((prev) => ({ ...prev, currentLocation: 'street' }));
              setActiveTab('world');
            }}
          />
        )}

        {activeTab === 'boutique' && (
          <LocationSceneView
            location="boutique"
            timeOfDay={saveState.timeOfDay}
            player={saveState.player}
            money={saveState.money}
            ownedOutfitIds={saveState.ownedOutfitIds}
            customOutfits={saveState.customOutfits}
            inventoryGifts={saveState.inventoryGifts}
            relationships={saveState.relationships}
            onLeaveToStreet={() => {
              commitSave((prev) => ({ ...prev, currentLocation: 'street' }));
              setActiveTab('world');
            }}
            onTalkCharacter={handleStartConversation}
            onBuyOutfit={handleBuyOutfit}
            onEquipOutfit={(id) =>
              commitSave((prev) => ({
                ...prev,
                player: { ...prev.player, equippedOutfitId: id, updatedAt: Date.now() },
              }))
            }
            onAddCustomOutfit={(item) =>
              commitSave((prev) => ({
                ...prev,
                customOutfits: [item, ...prev.customOutfits],
                ownedOutfitIds: [...prev.ownedOutfitIds, item.id],
              }))
            }
            onBuyGift={handleBuyGift}
            onCafeDateComplete={() => {}}
            onEarnMoney={(amount, summary) => {
              commitSave((prev) => ({ ...prev, money: Math.max(0, prev.money + amount) }));
              showToast(`${summary}: +₩${amount.toLocaleString()}`, { type: 'success' });
            }}
            onAdvanceTime={(steps = 1) => {
              commitSave((prev) => {
                const nextTime = advanceGameTime(prev.day, prev.timeOfDay, steps);
                return { ...prev, ...nextTime };
              });
            }}
            onOpenPhotoStudio={() => setActiveTab('studio')}
            onShowToast={(msg, type = 'info') => showToast(msg, { type })}
          />
        )}

        {activeTab === 'studio' && (
          <PhotoStudioView
            player={saveState.player}
            timeOfDay={saveState.timeOfDay}
            ownedOutfitIds={saveState.ownedOutfitIds}
            customOutfits={saveState.customOutfits}
            studioGallery={saveState.studioGallery}
            onSavePhoto={(creation) => {
              commitSave((prev) => ({
                ...prev,
                studioGallery: [creation, ...prev.studioGallery].slice(0, 36),
              }));
              showToast('Photo saved to IndexedDB album!', { type: 'success' });
            }}
            onDeletePhoto={(creationId) => {
              commitSave((prev) => ({
                ...prev,
                studioGallery: prev.studioGallery.filter((g) => g.id !== creationId),
              }));
            }}
            onSharePhotoToFeed={
              onPublishPost
                ? (dataUrl, caption) => {
                    onPublishPost({
                      content: caption || `${saveState.player.name} in Seoul`,
                      mediaType: 'photo',
                      mediaUrls: [dataUrl],
                      location: 'Seongsu Photo Studio',
                      tags: ['enmmoe', 'webtoonlife', 'seoul'],
                    });
                    showToast('Shared portrait to enmmoe+!', { type: 'success' });
                  }
                : undefined
            }
            onSetAvatar={(dataUrl) => {
              onSelectAvatar(dataUrl);
              showToast('Updated your enmmoe profile photo!', { type: 'success' });
            }}
          />
        )}

        {activeTab === 'bonds' && (
          <RelationshipsAndMenuView
            saveState={saveState}
            onTalkCharacter={handleStartConversation}
            onReplayEvent={handleReplayEvent}
            onSelectLocation={handleEnterLocation}
            onUpdateSettings={(patch) =>
              commitSave((prev) => ({
                ...prev,
                settings: { ...prev.settings, ...patch },
              }))
            }
            onRecoverFromIDB={async () => {
              const recovered = await recoverGameSaveFromIDB();
              if (recovered) {
                setSaveState(recovered);
                showToast('Recovered latest save from IndexedDB.', { type: 'success' });
              } else {
                showToast('Current save is already up to date.', { type: 'info' });
              }
            }}
            onResetGame={() => {
              const fresh = resetGameSave(playerDefaultName);
              setSaveState(fresh);
              setActiveTab('world');
              showToast('Started fresh at Day 1 with ₩135,000.', { type: 'info' });
            }}
            onOpenCustomizer={() => setActiveTab('customize')}
          />
        )}
      </main>

      {/* Bottom Game Navigation (Clean 5-tab Korean Webtoon Mobile Bar) */}
      <nav
        aria-label="Game Navigation"
        className="shrink-0 bg-white/95 dark:bg-[#16151D]/95 border-t border-black/8 dark:border-white/10 pb-safe"
      >
        <div className="grid grid-cols-5 h-[54px] max-w-xl mx-auto px-1">
          {[
            { id: 'world', label: 'City', icon: Compass },
            { id: 'customize', label: 'Avatar', icon: Sliders },
            { id: 'boutique', label: 'Boutique', icon: ShoppingBag },
            { id: 'studio', label: 'Studio', icon: Camera },
            { id: 'bonds', label: 'Bonds', icon: Heart },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'world') {
                    commitSave((prev) => ({ ...prev, currentLocation: 'street' }));
                  }
                  setActiveTab(id as GameTab);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] cursor-pointer ${
                  isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[1.9]" />
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Dialogue & Visual Novel Overlay */}
      {dialogueSession && (
        <DialogueOverlay
          character={dialogueSession.npc}
          relationship={saveState.relationships[dialogueSession.npc.id]}
          lines={dialogueSession.lines}
          location={saveState.currentLocation}
          timeOfDay={saveState.timeOfDay}
          textSpeed={saveState.settings.textSpeed}
          customOutfits={saveState.customOutfits}
          inventoryGifts={saveState.inventoryGifts}
          onGiveGift={handleGiveGift}
          onChoiceSelected={handleChoiceSelected}
          onInviteCafeDate={() => {
            setDialogueSession(null);
            handleEnterLocation('cafe');
          }}
          onClose={() => setDialogueSession(null)}
        />
      )}
    </div>
  );
};
