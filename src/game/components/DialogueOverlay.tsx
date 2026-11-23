import React, { useEffect, useState } from 'react';
import { Coffee, Gift, Heart, Sparkles, X } from 'lucide-react';
import { GIFT_CATALOG } from '../wardrobeCatalog';
import { getOutfitById } from '../saveSystem';
import {
  DialogueChoice,
  DialogueLine,
  ExpressionId,
  LocationId,
  MainCharacterProfile,
  OutfitItem,
  RelationshipState,
  TimeOfDay,
} from '../types';
import { LocationIllustrationBackdrop, WebtoonPortrait } from '../webtoonArt';

export interface DialogueOverlayProps {
  character: MainCharacterProfile;
  relationship: RelationshipState;
  lines: DialogueLine[];
  location: LocationId;
  timeOfDay: TimeOfDay;
  textSpeed: 'normal' | 'fast';
  customOutfits: OutfitItem[];
  inventoryGifts: Record<string, number>;
  onGiveGift: (giftId: string) => { affectionGain: number; reactionText: string; expression: ExpressionId };
  onChoiceSelected: (choice: DialogueChoice) => void;
  onInviteCafeDate: () => void;
  onClose: () => void;
}

export const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  character,
  relationship,
  lines,
  location,
  timeOfDay,
  textSpeed,
  customOutfits,
  inventoryGifts,
  onGiveGift,
  onChoiceSelected,
  onInviteCafeDate,
  onClose,
}) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [overrideLine, setOverrideLine] = useState<{
    text: string;
    expression: ExpressionId;
    endAfter?: boolean;
  } | null>(null);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [showGiftTray, setShowGiftTray] = useState(false);

  const activeBaseLine = lines[Math.min(lineIndex, lines.length - 1)];
  const currentText = overrideLine ? overrideLine.text : activeBaseLine?.text || '';
  const currentExpression: ExpressionId = overrideLine
    ? overrideLine.expression
    : activeBaseLine?.expression || 'smiling';
  const currentChoices = overrideLine ? undefined : activeBaseLine?.choices;

  // Typewriter reveal
  useEffect(() => {
    setDisplayedCount(0);
    const intervalMs = textSpeed === 'fast' ? 12 : 24;
    const timer = window.setInterval(() => {
      setDisplayedCount((prev) => {
        if (prev >= currentText.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [currentText, textSpeed]);

  const isTypingFinished = displayedCount >= currentText.length;
  const npcOutfit = getOutfitById(character.appearance.equippedOutfitId, customOutfits);
  const ownedGifts = GIFT_CATALOG.filter((g) => (inventoryGifts[g.id] || 0) > 0);

  const handleAdvance = () => {
    if (!isTypingFinished) {
      setDisplayedCount(currentText.length);
      return;
    }
    if (overrideLine) {
      if (overrideLine.endAfter) {
        onClose();
        return;
      }
      setOverrideLine(null);
      if (lineIndex + 1 < lines.length) {
        setLineIndex(lineIndex + 1);
      } else {
        onClose();
      }
      return;
    }
    if (currentChoices && currentChoices.length > 0) {
      return;
    }
    if (lineIndex + 1 < lines.length) {
      setLineIndex(lineIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePickChoice = (choice: DialogueChoice) => {
    onChoiceSelected(choice);
    setOverrideLine({
      text: choice.replyText,
      expression: choice.expression,
      endAfter: true,
    });
  };

  const handleSendGift = (giftId: string) => {
    const result = onGiveGift(giftId);
    setShowGiftTray(false);
    setOverrideLine({
      text: result.reactionText,
      expression: result.expression,
      endAfter: false,
    });
  };

  const heartCount = Math.min(5, Math.max(1, Math.ceil(relationship.affection / 20)));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm">
      {/* Illustrated Scene Stage + Large Character Portrait */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-end overflow-hidden">
        <LocationIllustrationBackdrop
          location={location}
          timeOfDay={timeOfDay}
          className="absolute inset-0"
        />

        {/* Top Bar with Affection Hearts & Quick Actions */}
        <div className="relative z-20 px-4 pt-safe pt-3 flex items-center justify-between gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 shadow-sm flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#3A2C36] dark:text-white">
              {character.name}
            </span>
            <div className="flex items-center gap-0.5" aria-label={`Affection ${relationship.affection}`}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-3.5 h-3.5 ${
                    idx < heartCount
                      ? 'text-[#F0688E] fill-[#F0688E]'
                      : 'text-[#C8BEC5] dark:text-white/25'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGiftTray((v) => !v)}
              className="min-h-[38px] px-3 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 text-[#2F242D] dark:text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-[#F0688E]" />
              <span>Gift</span>
            </button>
            <button
              type="button"
              onClick={onInviteCafeDate}
              className="min-h-[38px] px-3 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 text-[#2F242D] dark:text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Café Date</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialogue"
              className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 text-[#2F242D] dark:text-white flex items-center justify-center shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gift Selector Drawer */}
        {showGiftTray && (
          <div className="relative z-20 mx-4 mt-2 p-3 rounded-2xl bg-white/95 dark:bg-[#1C1C1E]/95 shadow-lg border border-black/10 dark:border-white/15">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold">Give a Gift</span>
              <span className="text-[11px] text-[#8A7D85]">Buy more at Boutique</span>
            </div>
            {ownedGifts.length === 0 ? (
              <p className="text-[12px] text-[#8A7D85] py-1">
                Your bag has no gifts yet. Visit Atelier Boutique to pick up sweets, film, or flowers!
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {ownedGifts.map((gift) => (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => handleSendGift(gift.id)}
                    className="shrink-0 px-3 py-2 rounded-xl bg-[#FFF4F8] dark:bg-[#2A2533] border border-[#F39CB2]/40 text-left cursor-pointer ios-press"
                  >
                    <p className="text-[12px] font-semibold">{gift.name}</p>
                    <p className="text-[11px] text-[#8A7D85]">x{inventoryGifts[gift.id]}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Centered Large Webtoon Bust Portrait */}
        <div className="relative z-10 flex-1 flex items-end justify-center pointer-events-none pt-2">
          <div className="w-[240px] sm:w-[270px] aspect-[240/290]">
            <WebtoonPortrait
              appearance={character.appearance}
              outfit={npcOutfit}
              expression={currentExpression}
              className="w-full h-full drop-shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Bottom Korean Webtoon Dialogue Panel */}
      <div className="relative z-30 bg-white dark:bg-[#16151D] rounded-t-3xl px-5 pt-4 pb-safe pb-5 shadow-2xl border-t border-black/8 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-2">
            <span className="text-[16px] font-bold text-[#2F242D] dark:text-white">
              {character.name}
            </span>
            <span className="text-[12px] font-medium text-[#8A7D85] capitalize">
              {currentExpression}
            </span>
          </div>
          <span className="text-[11px] text-[#8A7D85] inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#F0688E]" />
            {character.koreanName}
          </span>
        </div>

        <p
          onClick={handleAdvance}
          className="min-h-[68px] text-[15px] leading-relaxed text-[#3A2C36] dark:text-white/95 cursor-pointer select-text"
        >
          {currentText.slice(0, displayedCount)}
        </p>

        {/* Choices or Continue Button */}
        {isTypingFinished && currentChoices && currentChoices.length > 0 ? (
          <div className="mt-3 space-y-2">
            {currentChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handlePickChoice(choice)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#FFF4F8] hover:bg-[#FFE7F0] dark:bg-[#262332] dark:hover:bg-[#312D40] border border-[#F39CB2]/50 text-left text-[14px] font-medium text-[#2F242D] dark:text-white cursor-pointer ios-press"
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAdvance}
              className="min-h-[42px] px-5 rounded-full bg-[#007AFF] text-white text-[14px] font-semibold cursor-pointer ios-press"
            >
              {!isTypingFinished
                ? 'Skip'
                : overrideLine?.endAfter || lineIndex + 1 >= lines.length
                ? 'Finish'
                : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
