import React, { useState, useEffect } from 'react';
import {
  Archive,
  BookOpen,
  CheckCheck,
  Eye,
  MessageCircle,
  Radio,
  Sparkles,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { StoryAudience, StoryReplyPermission, User } from '../types';
import { BottomSheet, Button, Toggle, useToast } from './ui';
import { useLanguage } from '../utils/i18n';

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
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [allowFollow, setAllowFollow] = useState<'everyone' | 'request_only'>(
    currentUser.allowFollowFrom || 'everyone'
  );
  const [allowMessages, setAllowMessages] = useState<'everyone' | 'following' | 'nobody'>(
    currentUser.allowMessagesFrom || 'everyone'
  );
  const [showActivityStatus, setShowActivityStatus] = useState<boolean>(
    currentUser.showActivityStatus !== false
  );
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(
    currentUser.readReceiptsEnabled !== false
  );
  const [typingIndicatorsEnabled, setTypingIndicatorsEnabled] = useState<boolean>(
    currentUser.typingIndicatorsEnabled !== false
  );
  const [storyDefaultAudience, setStoryDefaultAudience] = useState<StoryAudience>(
    currentUser.storyDefaultAudience || 'everyone'
  );
  const [storyReplyPermission, setStoryReplyPermission] = useState<StoryReplyPermission>(
    currentUser.storyReplyPermission || 'everyone'
  );
  const [saveStoriesToArchive, setSaveStoriesToArchive] = useState<boolean>(
    currentUser.saveStoriesToArchive !== false
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
      setShowActivityStatus(currentUser.showActivityStatus !== false);
      setReadReceiptsEnabled(currentUser.readReceiptsEnabled !== false);
      setTypingIndicatorsEnabled(currentUser.typingIndicatorsEnabled !== false);
      setStoryDefaultAudience(currentUser.storyDefaultAudience || 'everyone');
      setStoryReplyPermission(currentUser.storyReplyPermission || 'everyone');
      setSaveStoriesToArchive(currentUser.saveStoriesToArchive !== false);
      setPublicReading(currentUser.isReadingActivityPublic !== false);
      setShowCurrentlyReading(currentUser.isCurrentlyReadingVisible !== false);
      setShowAchievements(currentUser.isAchievementsPublic !== false);
    }
  }, [isOpen, currentUser]);

  const handleSave = () => {
    onUpdatePrivacy({
      allowFollowFrom: allowFollow,
      allowMessagesFrom: allowMessages,
      showActivityStatus,
      readReceiptsEnabled,
      typingIndicatorsEnabled,
      storyDefaultAudience,
      storyReplyPermission,
      saveStoriesToArchive,
      isReadingActivityPublic: publicReading,
      isCurrentlyReadingVisible: showCurrentlyReading,
      isAchievementsPublic: showAchievements,
    });
    showToast(t('status_updated', 'Privacy preferences saved'), { type: 'success' });
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('privacy_safety', 'Privacy & Controls')}>
      <div className="p-4 space-y-5">
        {/* Who can subscribe */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-1">
            <UserCheck className="w-4 h-4 text-[#007AFF]" />
            <span>Who Can Subscribe to You</span>
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
              { id: 'following', label: 'Subscribers' },
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

        {/* Messaging Presence & Receipts */}
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-1">
            Messaging Controls
          </p>
          <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-[#007AFF] mt-1 shrink-0" />
                <div>
                  <p className="text-[15px] font-semibold">Show Activity Status</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    Let people see when you&apos;re online in Messages.
                  </p>
                </div>
              </div>
              <Toggle checked={showActivityStatus} onChange={setShowActivityStatus} ariaLabel="Show activity status" />
            </div>

            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCheck className="w-4 h-4 text-[#007AFF] mt-1 shrink-0" />
                <div>
                  <p className="text-[15px] font-semibold">{t('read_receipts', 'Read Receipts')}</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    Show Seen status when messages are read.
                  </p>
                </div>
              </div>
              <Toggle checked={readReceiptsEnabled} onChange={setReadReceiptsEnabled} ariaLabel={t('read_receipts', 'Read receipts')} />
            </div>

            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <MessageCircle className="w-4 h-4 text-[#007AFF] mt-1 shrink-0" />
                <div>
                  <p className="text-[15px] font-semibold">{t('typing_indicators', 'Typing Indicators')}</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    Show when you&apos;re actively typing in a chat.
                  </p>
                </div>
              </div>
              <Toggle checked={typingIndicatorsEnabled} onChange={setTypingIndicatorsEnabled} ariaLabel={t('typing_indicators', 'Typing indicators')} />
            </div>
          </div>
        </div>

        {/* Stories Controls */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-1">
            <Sparkles className="w-4 h-4 text-[#007AFF]" />
            <span>Stories Controls</span>
          </div>

          <div className="grid grid-cols-3 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] gap-1">
            {[
              { id: 'everyone', label: 'Everyone' },
              { id: 'subscribers', label: 'Subscribers' },
              { id: 'close_friends', label: 'Close Friends' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStoryDefaultAudience(opt.id as StoryAudience)}
                className={`py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                  storyDefaultAudience === opt.id
                    ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                    : 'text-[#8E8E93]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] gap-1">
            {[
              { id: 'everyone', label: 'Replies: All' },
              { id: 'subscribers', label: 'Replies: Subs' },
              { id: 'off', label: 'Replies: Off' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStoryReplyPermission(opt.id as StoryReplyPermission)}
                className={`py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                  storyReplyPermission === opt.id
                    ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                    : 'text-[#8E8E93]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Archive className="w-4 h-4 text-[#007AFF] mt-1 shrink-0" />
              <div>
                <p className="text-[15px] font-semibold">Save Stories to Archive</p>
                <p className="text-[13px] text-[#8E8E93]">
                  Keep expired stories privately for Highlights.
                </p>
              </div>
            </div>
            <Toggle checked={saveStoriesToArchive} onChange={setSaveStoriesToArchive} ariaLabel="Save stories to archive" />
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
          {t('save_changes', 'Save Preferences')}
        </Button>
      </div>
    </BottomSheet>
  );
};
