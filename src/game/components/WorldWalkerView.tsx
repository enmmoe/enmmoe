import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, DoorOpen, Heart, MessageCircle } from 'lucide-react';
import { getCharactersAtLocation } from '../characterData';
import { getOutfitById } from '../saveSystem';
import {
  LocationId,
  MainCharacterProfile,
  OutfitItem,
  PlayerCharacter,
  RelationshipState,
  TimeOfDay,
} from '../types';
import {
  ParallaxCityBackdrop,
  STREET_ENTRANCES,
  WebtoonWalkingSprite,
} from '../webtoonArt';

export interface WorldWalkerViewProps {
  player: PlayerCharacter;
  playerX: number;
  facing: 'left' | 'right';
  timeOfDay: TimeOfDay;
  customOutfits: OutfitItem[];
  relationships: Record<string, RelationshipState>;
  swipeMoveEnabled: boolean;
  onMove: (nextX: number, facing: 'left' | 'right') => void;
  onEnterLocation: (locationId: LocationId) => void;
  onTalkNpc: (npc: MainCharacterProfile) => void;
}

export const WorldWalkerView: React.FC<WorldWalkerViewProps> = ({
  player,
  playerX,
  facing,
  timeOfDay,
  customOutfits,
  relationships,
  swipeMoveEnabled,
  onMove,
  onEnterLocation,
  onTalkNpc,
}) => {
  const [isWalking, setIsWalking] = useState(false);
  const walkDirRef = useRef<'left' | 'right' | null>(null);
  const swipeStartRef = useRef<{ x: number; playerX: number } | null>(null);
  const posRef = useRef(playerX);
  posRef.current = playerX;

  const playerOutfit = getOutfitById(player.equippedOutfitId, customOutfits);

  // Smooth rAF walk loop when Left / Right control is held
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const dir = walkDirRef.current;
      if (dir) {
        const delta = (dir === 'right' ? 1 : -1) * dt * 24;
        const next = Math.min(95, Math.max(6, posRef.current + delta));
        if (Math.abs(next - posRef.current) > 0.01) {
          posRef.current = next;
          onMove(next, dir);
        }
      }
      if (walkDirRef.current) {
        rafId = requestAnimationFrame(step);
      }
    };

    if (isWalking && walkDirRef.current) {
      rafId = requestAnimationFrame(step);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isWalking, onMove]);

  const startWalk = (dir: 'left' | 'right') => {
    walkDirRef.current = dir;
    setIsWalking(true);
    onMove(posRef.current, dir);
  };

  const stopWalk = () => {
    walkDirRef.current = null;
    setIsWalking(false);
  };

  // Detect nearest interactive storefront within 8%
  const nearbyEntrance =
    STREET_ENTRANCES.find((e) => Math.abs(e.xPercent - playerX) <= 7.5) || null;

  // Scheduled characters currently out on the street + showcase NPCs near their buildings
  const streetNpcs = getCharactersAtLocation('street', timeOfDay);
  const cafeNpcs = getCharactersAtLocation('cafe', timeOfDay);
  const parkNpcs = getCharactersAtLocation('park', timeOfDay);

  const worldVisibleNpcs: Array<{ npc: MainCharacterProfile; xPercent: number }> = [
    ...streetNpcs.map((npc, i) => ({ npc, xPercent: 52 + i * 10 })),
    ...parkNpcs.map((npc, i) => ({ npc, xPercent: 70 + i * 4 })),
    ...cafeNpcs.slice(0, 1).map((npc) => ({ npc, xPercent: 27 })),
  ];

  // Filter duplicates by npc id
  const uniqueWorldNpcs = worldVisibleNpcs.filter(
    (entry, index, self) => self.findIndex((x) => x.npc.id === entry.npc.id) === index
  );

  return (
    <div className="flex flex-col h-full bg-[#FFFDFB] dark:bg-[#121216] select-none overflow-hidden">
      {/* Main 2D Side-Scrolling Street Canvas */}
      <div
        className="relative flex-1 min-h-[290px] w-full overflow-hidden touch-pan-y"
        onPointerDown={(e) => {
          if (!swipeMoveEnabled) return;
          if ((e.target as HTMLElement).closest('button')) return;
          swipeStartRef.current = { x: e.clientX, playerX: posRef.current };
        }}
        onPointerMove={(e) => {
          if (!swipeMoveEnabled || !swipeStartRef.current) return;
          const dx = e.clientX - swipeStartRef.current.x;
          if (Math.abs(dx) > 6) {
            setIsWalking(true);
            const next = Math.min(95, Math.max(6, swipeStartRef.current.playerX - dx * 0.085));
            const dir = dx < 0 ? 'right' : 'left';
            posRef.current = next;
            onMove(next, dir);
          }
        }}
        onPointerUp={() => {
          swipeStartRef.current = null;
          if (!walkDirRef.current) setIsWalking(false);
        }}
        onPointerCancel={() => {
          swipeStartRef.current = null;
          if (!walkDirRef.current) setIsWalking(false);
        }}
      >
        <ParallaxCityBackdrop
          cameraX={playerX}
          timeOfDay={timeOfDay}
          activeEntranceId={nearbyEntrance?.id}
          onSelectEntrance={onEnterLocation}
        />

        {/* NPC Characters Standing Along the Avenue */}
        {uniqueWorldNpcs.map(({ npc, xPercent }) => {
          const offsetFromPlayer = (xPercent - playerX) * 4.2;
          const rel = relationships[npc.id];
          return (
            <button
              key={npc.id}
              type="button"
              onClick={() => onTalkNpc(npc)}
              style={{
                left: `calc(50% + ${offsetFromPlayer}px)`,
                transform: 'translateX(-50%)',
              }}
              className="absolute bottom-[54px] z-10 flex flex-col items-center cursor-pointer focus-visible:outline-none group"
              aria-label={`Talk to ${npc.name}`}
            >
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-[#1C1C1E]/95 text-[11px] font-semibold text-[#3A2C36] dark:text-white shadow-sm inline-flex items-center gap-1 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-3 h-3 text-[#F0688E]" />
                <span>{npc.name.split(' ')[0]}</span>
                {rel && rel.affection >= 20 && (
                  <Heart className="w-2.5 h-2.5 text-[#F0688E] fill-current" />
                )}
              </div>
              <WebtoonWalkingSprite
                appearance={npc.appearance}
                outfit={getOutfitById(npc.appearance.equippedOutfitId, customOutfits)}
                isWalking={false}
                facing={xPercent >= playerX ? 'left' : 'right'}
                size={88}
              />
            </button>
          );
        })}

        {/* Player Character Centered on Avenue Floor */}
        <div
          className="absolute bottom-[46px] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <WebtoonWalkingSprite
            appearance={player}
            outfit={playerOutfit}
            isWalking={isWalking}
            facing={facing}
            size={96}
            label={player.name}
          />
        </div>

        {/* Floating Enter Location Banner when near a Shop / Station */}
        {nearbyEntrance && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onClick={() => onEnterLocation(nearbyEntrance.id)}
              className="min-h-[42px] px-4 rounded-full bg-white/95 dark:bg-[#1C1C1E]/95 text-[#2F242D] dark:text-white shadow-md border border-black/8 dark:border-white/15 inline-flex items-center gap-2 text-[14px] font-semibold cursor-pointer ios-press"
            >
              <DoorOpen className="w-4 h-4 text-[#007AFF]" />
              <span>Enter {nearbyEntrance.label}</span>
              <span className="text-[12px] text-[#8A7D85]">{nearbyEntrance.koreanLabel}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Interactive Street Control Bar (Thumb-Ergonomic) */}
      <div className="shrink-0 bg-white/95 dark:bg-[#16151D] border-t border-black/8 dark:border-white/10 px-4 py-3 space-y-2.5">
        {/* Quick Location Pills Bar (Interactive Buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STREET_ENTRANCES.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => onEnterLocation(loc.id)}
              className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                nearbyEntrance?.id === loc.id
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#F4EFF6] dark:bg-[#23212D] text-[#3A2C36] dark:text-white/90'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>

        {/* Left / Position Status / Right Walk Controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onPointerDown={() => startWalk('left')}
            onPointerUp={stopWalk}
            onPointerLeave={stopWalk}
            onPointerCancel={stopWalk}
            aria-label="Walk left"
            className="flex-1 min-h-[48px] rounded-2xl bg-[#F4EFF6] dark:bg-[#23212D] active:bg-[#007AFF] active:text-white text-[#2F242D] dark:text-white font-semibold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer touch-none"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Walk Left</span>
          </button>

          <button
            type="button"
            onPointerDown={() => startWalk('right')}
            onPointerUp={stopWalk}
            onPointerLeave={stopWalk}
            onPointerCancel={stopWalk}
            aria-label="Walk right"
            className="flex-1 min-h-[48px] rounded-2xl bg-[#F4EFF6] dark:bg-[#23212D] active:bg-[#007AFF] active:text-white text-[#2F242D] dark:text-white font-semibold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer touch-none"
          >
            <span>Walk Right</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
