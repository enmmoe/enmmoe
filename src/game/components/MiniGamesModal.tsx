import React, { useEffect, useState } from 'react';
import { Camera, Coffee, ShoppingBag, Sparkles, X } from 'lucide-react';

export type MiniGameKind = 'cafe_barista' | 'boutique_stylist' | 'park_photo';

interface StylistOrder {
  cue: string;
  answer: 'Hanbok' | 'Streetwear' | 'Dresses' | 'Winter' | 'Formal';
}

const STYLIST_ORDERS: StylistOrder[] = [
  { cue: '“I need airy pastel traditional silk for Bukchon.”', answer: 'Hanbok' },
  { cue: '“Oversized hoodie energy for a Hongdae night walk!”', answer: 'Streetwear' },
  { cue: '“Warm camel wool coat for Han River breeze.”', answer: 'Winter' },
  { cue: '“Chiffon ribbons for a sunlit blossom picnic.”', answer: 'Dresses' },
  { cue: '“Clean tailored blazer for a gallery opening.”', answer: 'Formal' },
];

export interface MiniGamesModalProps {
  kind: MiniGameKind;
  onComplete: (earnedWon: number, summary: string) => void;
  onClose: () => void;
}

export const MiniGamesModal: React.FC<MiniGamesModalProps> = ({
  kind,
  onComplete,
  onClose,
}) => {
  const [round, setRound] = useState(1);
  const totalRounds = 4;
  const [score, setScore] = useState(0);
  const [cursor, setCursor] = useState(15);
  const [feedback, setFeedback] = useState<string>('Tap when the marker lands inside the pastel zone!');
  const [orderIdx, setOrderIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  // Smooth oscillating bar for timing mini-games (cafe_barista & park_photo)
  useEffect(() => {
    if (kind === 'boutique_stylist' || finished) return;
    let dir = 1;
    let pos = 18;
    const speed = kind === 'cafe_barista' ? 2.4 : 2.8;
    const timer = window.setInterval(() => {
      pos += dir * speed;
      if (pos >= 94) {
        pos = 94;
        dir = -1;
      } else if (pos <= 6) {
        pos = 6;
        dir = 1;
      }
      setCursor(pos);
    }, 28);
    return () => window.clearInterval(timer);
  }, [kind, finished, round]);

  const finishGame = (finalScore: number) => {
    setFinished(true);
    const base = kind === 'cafe_barista' ? 6000 : kind === 'boutique_stylist' ? 7000 : 8000;
    const bonus = finalScore * 2200;
    const total = base + bonus;
    const label =
      kind === 'cafe_barista'
        ? `Cafe Bomnal Barista Shift (${finalScore}/${totalRounds} perfect pours)`
        : kind === 'boutique_stylist'
        ? `Atelier Boutique Styling (${finalScore}/${totalRounds} matches)`
        : `Park Portrait Assignment (${finalScore}/${totalRounds} crisp shots)`;
    onComplete(total, label);
  };

  const handleTimingTap = () => {
    if (finished) return;
    const inSweetSpot = cursor >= 38 && cursor <= 64;
    const nextScore = inSweetSpot ? score + 1 : score;
    setScore(nextScore);
    setFeedback(
      inSweetSpot
        ? kind === 'cafe_barista'
          ? 'Velvet cream floated cleanly! +Bonus'
          : 'Golden hour shutter nailed! +Bonus'
        : 'Slightly off rhythm—steady on the next one!'
    );

    if (round >= totalRounds) {
      finishGame(nextScore);
    } else {
      setRound(round + 1);
    }
  };

  const handleStylistChoice = (choice: StylistOrder['answer']) => {
    if (finished) return;
    const currentOrder = STYLIST_ORDERS[orderIdx % STYLIST_ORDERS.length];
    const correct = choice === currentOrder.answer;
    const nextScore = correct ? score + 1 : score;
    setScore(nextScore);
    setFeedback(correct ? 'Exact aesthetic match!' : `Customer hoped for ${currentOrder.answer}.`);

    if (round >= totalRounds) {
      finishGame(nextScore);
    } else {
      setRound(round + 1);
      setOrderIdx(orderIdx + 1);
    }
  };

  const currentOrder = STYLIST_ORDERS[orderIdx % STYLIST_ORDERS.length];

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#191822] text-[#2F242D] dark:text-white p-5 shadow-2xl border border-black/10 dark:border-white/15 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {kind === 'cafe_barista' && <Coffee className="w-5 h-5 text-[#F0688E]" />}
            {kind === 'boutique_stylist' && <ShoppingBag className="w-5 h-5 text-[#8E6EB8]" />}
            {kind === 'park_photo' && <Camera className="w-5 h-5 text-[#007AFF]" />}
            <h3 className="text-[18px] font-bold">
              {kind === 'cafe_barista'
                ? 'Café Helper Shift'
                : kind === 'boutique_stylist'
                ? 'Shop Assistant Shift'
                : 'Street Photography Gig'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mini-game"
            className="w-9 h-9 rounded-full bg-[#F4EFF6] dark:bg-[#272533] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[13px] font-semibold text-[#8A7D85]">
          <span>
            Order {round} / {totalRounds}
          </span>
          <span className="text-[#007AFF]">Perfects: {score}</span>
        </div>

        {kind === 'boutique_stylist' ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#F8F3FB] dark:bg-[#242130] text-[15px] font-medium">
              {currentOrder.cue}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['Hanbok', 'Streetwear', 'Dresses', 'Winter', 'Formal'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleStylistChoice(cat)}
                  className="min-h-[46px] rounded-2xl bg-[#FFF6FA] dark:bg-[#2C293A] border border-black/8 dark:border-white/10 font-semibold text-[14px] cursor-pointer ios-press"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timing Target Track */}
            <div className="relative h-11 rounded-full bg-[#F4EFF6] dark:bg-[#242130] border border-black/10 dark:border-white/10 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-[#FAD2E0] dark:bg-[#F0688E]/40 border-x-2 border-[#F0688E]"
                style={{ left: '38%', width: '26%' }}
              />
              <div
                className="absolute top-1.5 bottom-1.5 w-3 -ml-1.5 rounded-full bg-[#007AFF] shadow"
                style={{ left: `${cursor}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleTimingTap}
              className="w-full min-h-[50px] rounded-2xl bg-[#007AFF] text-white font-bold text-[16px] cursor-pointer ios-press"
            >
              {kind === 'cafe_barista' ? 'Pour Espresso!' : 'Snap Portrait!'}
            </button>
          </div>
        )}

        <p className="text-[13px] text-center text-[#8A7D85] min-h-[20px] flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#F0688E]" />
          <span>{feedback}</span>
        </p>
      </div>
    </div>
  );
};
