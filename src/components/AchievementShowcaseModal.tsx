import React from 'react';
import { Check, Lock, Pin, Trophy } from 'lucide-react';
import { AchievementItem } from '../types';
import { BottomSheet, ProgressBar, SmartImage } from './ui';

interface AchievementShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AchievementItem[];
  pinnedAchievementIds?: string[];
  onTogglePinAchievement?: (achievementId: string) => void;
  theme?: 'light' | 'dark';
}

export const AchievementShowcaseModal: React.FC<AchievementShowcaseModalProps> = ({
  isOpen,
  onClose,
  achievements,
  pinnedAchievementIds = [],
  onTogglePinAchievement,
}) => {
  const totalMax = 57;
  const earnedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Achievements"
      maxHeightClass="max-h-[90vh]"
    >
      <div className="p-4 space-y-4">
        {/* Progress Summary */}
        <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold">Overall Progress</span>
            <span className="text-[15px] font-semibold text-[#007AFF] dark:text-[#0A84FF] tabular-nums">
              {earnedCount} / {totalMax}
            </span>
          </div>
          <ProgressBar value={earnedCount} max={totalMax} heightClass="h-2" />
        </div>

        {/* Achievements List */}
        <div className="space-y-2.5">
          {achievements.map((ach) => {
            const isPinned = pinnedAchievementIds.includes(ach.id);
            return (
              <div
                key={ach.id}
                className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between gap-3.5"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center p-1.5">
                    {ach.imageUrl ? (
                      <SmartImage
                        src={ach.imageUrl}
                        alt={ach.name}
                        aspectClassName="w-full h-full"
                        className={`object-contain ${
                          !ach.isUnlocked ? 'grayscale opacity-50' : ''
                        }`}
                      />
                    ) : (
                      <Trophy className="w-6 h-6 text-[#007AFF] dark:text-[#0A84FF]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-semibold truncate text-black dark:text-white">
                      {ach.name}
                    </h3>
                    <p className="text-[13px] text-[#8E8E93] mt-0.5 line-clamp-2 leading-snug">
                      {ach.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {ach.isUnlocked && onTogglePinAchievement && (
                    <button
                      type="button"
                      onClick={() => onTogglePinAchievement(ach.id)}
                      aria-label={isPinned ? 'Unpin achievement' : 'Pin achievement'}
                      className={`h-8 px-2.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ios-press ${
                        isPinned
                          ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white'
                          : 'bg-white dark:bg-[#1C1C1E] text-[#8E8E93] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                      <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                    </button>
                  )}

                  {ach.isUnlocked ? (
                    <div className="w-8 h-8 rounded-full bg-[#007AFF] dark:bg-[#0A84FF] flex items-center justify-center text-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#8E8E93]">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
};
