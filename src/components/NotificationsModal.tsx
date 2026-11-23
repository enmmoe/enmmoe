import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { SocialNotification } from '../types';
import { formatLocalizedTime, useLanguage } from '../utils/i18n';
import { EmojiText } from './AppleEmoji';
import { Avatar, BottomSheet, EmptyState } from './ui';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SocialNotification[];
  onMarkAllAsRead: () => void;
  onNotificationClick: (notif: SocialNotification) => void;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  }) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
  onOpenUserProfile,
}) => {
  const { t, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mentions'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (activeFilter === 'mentions') {
      return (
        n.type === 'comment' ||
        n.type === 'reply' ||
        n.type === 'mention' ||
        n.type === 'tag'
      );
    }
    return true;
  });

  const getNotifIcon = (type: SocialNotification['type']) => {
    switch (type) {
      case 'like':
      case 'reaction':
        return <Heart className="w-3 h-3 text-[#007AFF] fill-current" />;
      case 'comment':
      case 'reply':
        return <MessageCircle className="w-3 h-3 text-[#007AFF]" />;
      case 'follow':
        return <UserPlus className="w-3 h-3 text-black dark:text-white" />;
      default:
        return <Sparkles className="w-3 h-3 text-[#007AFF]" />;
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('activity', 'Activity')}
      headerRight={
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="text-[14px] font-medium text-[#007AFF] inline-flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer ios-press"
        >
          <CheckCheck className="w-4 h-4" />
          <span>{t('read_all', 'Read all')}</span>
        </button>
      }
    >
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 p-1 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          {(['all', 'mentions'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`py-1.5 rounded-[9px] text-[14px] font-medium transition-all cursor-pointer ${
                activeFilter === filter
                  ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs font-semibold'
                  : 'text-[#8E8E93]'
              }`}
            >
              {filter === 'all' ? t('all_notifs', 'All') : t('mentions_notifs', 'Mentions')}
            </button>
          ))}
        </div>

        {filteredNotifs.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-7 h-7" />}
            title={t('no_notifications', 'No Notifications')}
            description={t(
              'no_notifications_desc',
              'Likes, comments, and new subscribers will appear here.'
            )}
          />
        ) : (
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => onNotificationClick(notif)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNotificationClick(notif);
                  }
                }}
                className="w-full py-3 flex items-center justify-between gap-3 text-left cursor-pointer ios-press"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      if (
                        onOpenUserProfile &&
                        notif.actorId &&
                        notif.actorId !== 'system' &&
                        notif.type !== 'system'
                      ) {
                        e.stopPropagation();
                        onOpenUserProfile({
                          id: notif.actorId,
                          name: notif.actorName,
                          username:
                            notif.actorUsername ||
                            notif.actorName.toLowerCase().replace(/\s+/g, '_'),
                          avatar: notif.actorAvatar,
                        });
                      }
                    }}
                    aria-label={notif.actorName}
                    className="relative shrink-0 cursor-pointer"
                  >
                    <Avatar src={notif.actorAvatar} name={notif.actorName} size="md" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-xs">
                      {getNotifIcon(notif.type)}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-snug">
                      {notif.actorId &&
                      notif.actorId !== 'system' &&
                      notif.type !== 'system' &&
                      onOpenUserProfile ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenUserProfile({
                              id: notif.actorId,
                              name: notif.actorName,
                              username:
                                notif.actorUsername ||
                                notif.actorName.toLowerCase().replace(/\s+/g, '_'),
                              avatar: notif.actorAvatar,
                            });
                          }}
                          className="font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0 text-left inline"
                        >
                          {notif.actorName}
                        </button>
                      ) : (
                        <span className="font-semibold">{notif.actorName}</span>
                      )}{' '}
                      <span className="text-[#8E8E93]">
                        <EmojiText text={notif.text} emojiSize={14} />
                      </span>
                    </p>
                    <p className="text-[12px] text-[#8E8E93] mt-0.5 tabular-nums">
                      {formatLocalizedTime(notif.createdAt, language)}
                    </p>
                  </div>
                </div>

                {!notif.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
