import React, { useState, useEffect } from 'react';
import { BookOpen, Eye, Trophy, UserCheck, MessageCircle } from 'lucide-react';
import { User } from '../types';
import { BottomSheet, Button, Toggle, useToast } from './ui';

interface ProfilePrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdatePrivacy: (settings: Partial<User>) => void;
}

export const ProfilePrivacyModal: React.FC<ProfilePrivacyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdatePrivacy,
}) => {
  const { showToast } = useToast();

  const [allowFollow, setAllowFollow] = useState<'everyone' | 'request_only'>(
    currentUser.allowFollowFrom || 'everyone'
  );
  const [allowMessages, setAllowMessages] = useState<'everyone' | 'following' | 'nobody'>(
    currentUser.allowMessagesFrom || 'everyone'
  );
  const [publicReading, setPublicReading] = useState<boolean>(
    currentUser.isReadingActivityPublic !== false
  );
  const [showCurrentlyReading, setShowCurrentlyReading] = useState<boolean>(
    currentUser.isCurrentlyReadingVisible !== false
  );
  const [showAchievements, setShowAchievements] = useState<boolean>(
    currentUser.isAchievementsPublic !== false
  );

  useEffect(() => {
    if (isOpen) {
      setAllowFollow(currentUser.allowFollowFrom || 'everyone');
      setAllowMessages(currentUser.allowMessagesFrom || 'everyone');
      setPublicReading(currentUser.isReadingActivityPublic !== false);
      setShowCurrentlyReading(currentUser.isCurrentlyReadingVisible !== false);
      setShowAchievements(currentUser.isAchievementsPublic !== false);
    }
  }, [isOpen, currentUser]);

  const handleSave = () => {
    onUpdatePrivacy({
      allowFollowFrom: allowFollow,
      allowMessagesFrom: allowMessages,
      isReadingActivityPublic: publicReading,
      isCurrentlyReadingVisible: showCurrentlyReading,
      isAchievementsPublic: showAchievements,
    });
    showToast('Privacy preferences saved', { type: 'success' });
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Privacy Settings">
      <div className="p-4 space-y-5">
        {/* Who can follow */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-1">
            <UserCheck className="w-4 h-4 text-[#007AFF]" />
            <span>Who Can Follow You</span>
          </div>
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] gap-1">
            {[
              { id: 'everyone', label: 'Everyone' },
              { id: 'request_only', label: 'Approval Only' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAllowFollow(opt.id as 'everyone' | 'request_only')}
                className={`py-2 rounded-lg text-[14px] font-semibold transition-all cursor-pointer ${
                  allowFollow === opt.id
                    ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                    : 'text-[#8E8E93]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Who can message */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-1">
            <MessageCircle className="w-4 h-4 text-[#007AFF]" />
            <span>Who Can Message You</span>
          </div>
          <div className="grid grid-cols-3 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] gap-1">
            {[
              { id: 'everyone', label: 'Everyone' },
              { id: 'following', label: 'Followers' },
              { id: 'nobody', label: 'Nobody' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAllowMessages(opt.id as 'everyone' | 'following' | 'nobody')}
                className={`py-2 rounded-lg text-[14px] font-semibold transition-all cursor-pointer ${
                  allowMessages === opt.id
                    ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                    : 'text-[#8E8E93]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reading Visibility Toggles */}
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-1">
            Reading Visibility
          </p>

          <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-[#007AFF] mt-1 shrink-0" />
                <div>
                  <p className="text-[15px] font-semibold">Public Reading Activity</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    Show stories read & completed series.
                  </p>
                </div>
              </div>
              <Toggle checked={publicReading} onChange={setPublicReading} ariaLabel="Public reading activity" />
            </div>

            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Eye className="w-4 h-4 text-[#007AFF] mt-1 shrink-0" />
                <div>
                  <p className="text-[15px] font-semibold">Currently Reading</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    Display series currently in progress.
                  </p>
                </div>
              </div>
              <Toggle checked={showCurrentlyReading} onChange={setShowCurrentlyReading} ariaLabel="Show currently reading" />
            </div>

            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Trophy className="w-4 h-4 text-[#007AFF] mt-1 shrink-0" />
                <div>
                  <p className="text-[15px] font-semibold">Showcase Achievements</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    Show unlocked badges on your profile.
                  </p>
                </div>
              </div>
              <Toggle checked={showAchievements} onChange={setShowAchievements} ariaLabel="Showcase achievements" />
            </div>
          </div>
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </BottomSheet>
  );
};
