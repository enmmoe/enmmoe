import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUpToLine,
  Ban,
  BellOff,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  EyeOff,
  Flag,
  Languages,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Palette,
  PenLine,
  Pin,
  Plus,
  Reply,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  SquarePen,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { SocialConversation, SocialMessage, Story, User } from '../types';
import { INITIAL_CREATORS } from '../data/socialMockData';
import { useLanguage } from '../utils/i18n';
import { translateMessageText } from '../utils/translator';
import { soundFX } from '../utils/audio';
import { triggerHaptic } from '../utils/telegram';
import { safeStorage } from '../utils/storage';
import {
  Avatar,
  BottomSheet,
  Button,
  ConversationRowSkeleton,
  Dialog,
  EmptyState,
  SearchBar,
  TextField,
  Toggle,
  VerifiedBadge,
  useToast,
} from './ui';
import { UserProfileModal } from './UserProfileModal';
import {
  InstagramEmojiPickerModal,
  getStoredQuickReactions,
} from './InstagramEmojiPickerModal';
import {
  TikTokBubbleStyleModal,
  getBubbleStyle,
} from './TikTokBubbleStyleModal';

interface MessagesHubViewProps {
  currentUser: User;
  conversations: SocialConversation[];
  creators?: User[];
  stories?: Story[];
  activeConversationId?: string;
  onSelectConversation: (convId: string) => void;
  onStartNewConversation?: (
    targetUserId: string,
    targetUserData?: Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }
  ) => void;
  onOpenStory?: (storyIndex: number) => void;
  onOpenCreateStory?: () => void;
  onSendMessage: (convId: string, text: string, replyTo?: any) => void;
  onReactMessage: (convId: string, messageId: string, emoji: string) => void;
  onDeleteMessage: (convId: string, messageId: string) => void;
  onForwardMessage?: (message: SocialMessage) => void;
  onBackToList?: () => void;
  onUserTyping?: (convId: string, isTyping: boolean) => void;
  isTabActive?: boolean;
}

export function formatClockTime(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return '';
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatChatTimestamp(timestamp: number): string {
  return formatClockTime(timestamp);
}

const CHAT_THEMES = [
  {
    id: 'default',
    name: 'iOS Blue',
    gradient: 'bg-[#007AFF]',
    preview: 'bg-[#007AFF]',
  },
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    gradient: 'bg-[#0051B3]',
    preview: 'bg-[#0051B3]',
  },
  {
    id: 'slate',
    name: 'Slate Ink',
    gradient: 'bg-[#1C1C1E]',
    preview: 'bg-[#1C1C1E]',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    gradient: 'bg-[#3A3A3C]',
    preview: 'bg-[#3A3A3C]',
  },
];

export const MessagesHubView: React.FC<MessagesHubViewProps> = ({
  currentUser,
  conversations,
  creators = INITIAL_CREATORS,
  stories = [],
  activeConversationId,
  onSelectConversation,
  onStartNewConversation,
  onOpenStory,
  onOpenCreateStory,
  onSendMessage,
  onReactMessage,
  onDeleteMessage,
  onForwardMessage,
  onBackToList,
  onUserTyping,
  isTabActive = true,
}) => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  // Inbox list controls
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [inboxTab, setInboxTab] = useState<'primary' | 'requests'>('primary');
  const [isSpamOpen, setIsSpamOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeSearch, setComposeSearch] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [isTabLoading, setIsTabLoading] = useState(false);

  // Local created conversations fallback if onStartNewConversation is not supplied
  const [extraConvs, setExtraConvs] = useState<SocialConversation[]>([]);
  const allConversations = useMemo(
    () => [...extraConvs, ...conversations],
    [extraConvs, conversations]
  );

  // Active chat composer & scroll state
  const [inputText, setInputText] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<SocialMessage | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Message context menu & translation
  const [selectedMenuMessage, setSelectedMenuMessage] = useState<SocialMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<'reaction' | 'composer'>('reaction');
  const [quickReactions, setQuickReactions] = useState<string[]>(() => getStoredQuickReactions());
  const [translationMap, setTranslationMap] = useState<
    Record<string, { translatedText: string; isTranslated: boolean }>
  >({});

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  // Persistent chat settings
  const [mutedConvs, setMutedConvs] = useState<Record<string, boolean>>(() =>
    safeStorage.getJSON('social_conv_muted', {})
  );
  const [blockedConvs, setBlockedConvs] = useState<Record<string, boolean>>(() =>
    safeStorage.getJSON('social_conv_blocked', {})
  );
  const [pinnedConvs, setPinnedConvs] = useState<Record<string, boolean>>(() =>
    safeStorage.getJSON('social_conv_pinned', {})
  );
  const [nicknames, setNicknames] = useState<Record<string, string>>(() =>
    safeStorage.getJSON('social_conv_nicknames', {})
  );
  const [chatThemes, setChatThemes] = useState<Record<string, string>>(() =>
    safeStorage.getJSON('social_conv_chat_themes', {})
  );
  const [disappearingByConv, setDisappearingByConv] = useState<
    Record<string, 'off' | '24h' | '7d' | '90d'>
  >(() => safeStorage.getJSON('social_conv_disappearing', {}));

  const [globalBubbleStyle, setGlobalBubbleStyle] = useState<string>(
    () => safeStorage.getItem('enmmoe_bubble_style') || safeStorage.getItem('tiktok_bubble_style') || 'default'
  );

  // Details & sub-modals
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false);
  const [isBubbleStyleModalOpen, setIsBubbleStyleModalOpen] = useState(false);
  const [isChatControlsOpen, setIsChatControlsOpen] = useState(false);
  const [isPrivacySheetOpen, setIsPrivacySheetOpen] = useState(false);
  const [isNicknameSheetOpen, setIsNicknameSheetOpen] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Harassment or bullying');

  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicatorsEnabled, setTypingIndicatorsEnabled] = useState(true);

  // Inspected profile modal
  const [isProfileOverviewOpen, setIsProfileOverviewOpen] = useState(false);
  const [inspectedUser, setInspectedUser] = useState<
    (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean; isOnline?: boolean }) | null
  >(null);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);

  const inboxListScrollRef = useRef<HTMLDivElement>(null);
  const savedInboxScrollTopRef = useRef<number>(0);
  const messagesStreamRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (isTabActive && !activeConversationId && inboxListScrollRef.current) {
      inboxListScrollRef.current.scrollTop = savedInboxScrollTopRef.current;
    }
  }, [isTabActive, activeConversationId]);

  // Persist maps
  useEffect(() => safeStorage.setJSON('social_conv_muted', mutedConvs), [mutedConvs]);
  useEffect(() => safeStorage.setJSON('social_conv_blocked', blockedConvs), [blockedConvs]);
  useEffect(() => safeStorage.setJSON('social_conv_pinned', pinnedConvs), [pinnedConvs]);
  useEffect(() => safeStorage.setJSON('social_conv_nicknames', nicknames), [nicknames]);
  useEffect(() => safeStorage.setJSON('social_conv_chat_themes', chatThemes), [chatThemes]);
  useEffect(() => safeStorage.setJSON('social_conv_disappearing', disappearingByConv), [disappearingByConv]);

  const activeConversation = allConversations.find((c) => c.id === activeConversationId);
  const activeConvId = activeConversation?.id || '';
  const partner = activeConversation?.participants[0];
  const customNickname = activeConvId ? nicknames[activeConvId] : null;
  const displayName =
    customNickname ||
    (activeConversation?.type === 'group' ? activeConversation.title : partner?.name || 'Chat');

  const isCurrentMuted = Boolean(activeConvId && mutedConvs[activeConvId]);
  const isCurrentBlocked = Boolean(activeConvId && blockedConvs[activeConvId]);
  const isCurrentPinned = Boolean(activeConvId && pinnedConvs[activeConvId]);
  const currentThemeName = activeConvId ? chatThemes[activeConvId] || 'iOS Blue' : 'iOS Blue';
  const activeThemeConfig =
    CHAT_THEMES.find((th) => th.name === currentThemeName || th.id === currentThemeName) ||
    CHAT_THEMES[0];
  const currentDisappearing = activeConvId ? disappearingByConv[activeConvId] || 'off' : 'off';

  const isOtherUserTyping = Boolean(
    activeConversation?.isTyping &&
      activeConversation?.typingUserId !== currentUser.id &&
      (!activeConversation?.typingUserName || activeConversation.typingUserName !== currentUser.name)
  );

  // Reset sub-panels on conversation switch
  useEffect(() => {
    setIsDetailsOpen(false);
    setShowScrollBottomBtn(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (activeConversationId && onUserTyping) {
      onUserTyping(activeConversationId, false);
    }
  }, [activeConversationId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    try {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    } catch {}
  }, [activeConversation?.messages?.length, isOtherUserTyping]);

  const handleOpenUserProfile = (
    targetUser?: (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) | null
  ) => {
    if (!targetUser) return;
    soundFX.playClick();
    triggerHaptic('light');
    setInspectedUser(targetUser);
    setIsProfileOverviewOpen(true);
  };

  // Start or switch to direct conversation
  const handleComposeSelectUser = (
    target: Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }
  ) => {
    soundFX.playClick();
    setIsComposeOpen(false);
    setComposeSearch('');
    setCustomUsername('');

    const existing = allConversations.find((c) =>
      c.participants.some((p) => p.id === target.id || p.username === target.username)
    );
    if (existing) {
      onSelectConversation(existing.id);
      return;
    }

    if (onStartNewConversation) {
      onStartNewConversation(target.id, target);
      return;
    }

    // Local fallback
    const created: SocialConversation = {
      id: `conv-${Date.now()}`,
      type: 'direct',
      participants: [
        {
          id: target.id,
          name: target.name,
          username: target.username,
          avatar: target.avatar,
          isVerified: target.isVerified,
          isOnline: true,
        },
      ],
      unreadCount: 0,
      messages: [],
    };
    setExtraConvs((prev) => [created, ...prev]);
    onSelectConversation(created.id);
  };

  // Message Long-Press & Menu
  const startLongPress = (msg: SocialMessage) => {
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      soundFX.playClick();
      triggerHaptic('medium');
      setSelectedMenuMessage(msg);
    }, 380);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Composer Input
  const handleInputChange = (val: string) => {
    setInputText(val);
    if (!typingIndicatorsEnabled) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (val.trim().length > 0) {
      if (activeConversationId && onUserTyping) {
        onUserTyping(activeConversationId, true);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (activeConversationId && onUserTyping) {
          onUserTyping(activeConversationId, false);
        }
      }, 1400);
    } else if (activeConversationId && onUserTyping) {
      onUserTyping(activeConversationId, false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onUserTyping) onUserTyping(activeConversationId, false);

    soundFX.playClick();
    triggerHaptic('light');
    onSendMessage(
      activeConversationId,
      inputText.trim(),
      replyingMessage
        ? {
            id: replyingMessage.id,
            text: replyingMessage.text,
            senderName: replyingMessage.senderName,
          }
        : undefined
    );

    setInputText('');
    setReplyingMessage(null);
  };

  const handleTranslate = async (msg: SocialMessage) => {
    const existing = translationMap[msg.id];
    if (existing?.isTranslated) {
      setTranslationMap((prev) => ({
        ...prev,
        [msg.id]: { ...prev[msg.id], isTranslated: false },
      }));
      setSelectedMenuMessage(null);
      return;
    }
    if (existing?.translatedText) {
      setTranslationMap((prev) => ({
        ...prev,
        [msg.id]: { ...prev[msg.id], isTranslated: true },
      }));
      setSelectedMenuMessage(null);
      return;
    }

    try {
      const result = await translateMessageText({ text: msg.text, targetLanguage: language });
      setTranslationMap((prev) => ({
        ...prev,
        [msg.id]: { translatedText: result.translatedText, isTranslated: true },
      }));
    } catch {
      showToast('Translation unavailable right now', { type: 'error' });
    }
    setSelectedMenuMessage(null);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText?.(text);
      showToast('Copied to clipboard', { type: 'success', durationMs: 1800 });
    } catch {
      showToast('Unable to copy text', { type: 'error' });
    }
    setSelectedMenuMessage(null);
  };

  // Filtered + Pinned-first conversation sorting
  const displayedConversations = useMemo(() => {
    const q = listSearchQuery.toLowerCase().trim();
    const list = allConversations.filter((conv) => {
      if (!q) return true;
      const p = conv.participants[0];
      const title = conv.type === 'group' ? conv.title : p?.name;
      const lastText = conv.lastMessage?.text || '';
      return (
        title?.toLowerCase().includes(q) ||
        p?.name?.toLowerCase().includes(q) ||
        p?.username?.toLowerCase().includes(q) ||
        lastText.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      const ap = pinnedConvs[a.id] ? 1 : 0;
      const bp = pinnedConvs[b.id] ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
    });
  }, [allConversations, listSearchQuery, pinnedConvs]);

  const handleSwitchInboxTab = (next: 'primary' | 'requests') => {
    if (next === inboxTab) return;
    setInboxTab(next);
    setIsSpamOpen(false);
    setIsTabLoading(true);
    setTimeout(() => setIsTabLoading(false), 180);
  };

  // Suggested recipients for Compose Sheet
  const composeCandidates = useMemo(() => {
    const q = composeSearch.toLowerCase().trim();
    const pool: Array<Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean; isOnline?: boolean }> = [];
    const seen = new Set<string>();
    [...creators, ...allConversations.flatMap((c) => c.participants)].forEach((u) => {
      if (u && !seen.has(u.id) && u.id !== currentUser.id) {
        seen.add(u.id);
        pool.push(u);
      }
    });
    if (!q) return pool;
    return pool.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  }, [creators, allConversations, composeSearch, currentUser.id]);

  return (
    <div
      id="messages-hub-container"
      className="w-full h-full flex-1 min-h-0 flex flex-col select-none relative overflow-hidden bg-white dark:bg-black text-black dark:text-white"
    >
      {/* ==================== VIEW 1: INBOX CONVERSATION LIST ==================== */}
      {!activeConversation && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Header: Large iOS Title + Compose Action */}
          <header className="px-4 pt-safe pt-3 pb-2 flex items-center justify-between bg-white/90 dark:bg-black/90 backdrop-blur-2xl shrink-0">
            <h1 className="text-[34px] font-bold tracking-tight leading-tight">
              {t('messages_title', 'Messages')}
            </h1>

            <button
              id="messages-compose-btn"
              type="button"
              onClick={() => {
                soundFX.playClick();
                setIsComposeOpen(true);
              }}
              aria-label="New message"
              title="New message"
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF] hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] transition-colors ios-press cursor-pointer"
            >
              <SquarePen className="w-5 h-5 stroke-[2]" />
            </button>
          </header>

          {/* Search Bar */}
          <div className="px-4 pb-2.5 shrink-0">
            <SearchBar
              value={listSearchQuery}
              onChange={setListSearchQuery}
              placeholder={t('search_messages', 'Search messages or creators')}
            />
          </div>

          {/* Active Stories Strip */}
          {stories.length > 0 && !listSearchQuery && inboxTab === 'primary' && (
            <div className="px-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
              <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
                {onOpenCreateStory && (
                  <button
                    type="button"
                    onClick={onOpenCreateStory}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-16 ios-press cursor-pointer"
                  >
                    <div className="relative">
                      <Avatar src={currentUser.avatar} name={currentUser.name} size="md" className="w-14 h-14" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center border-2 border-white dark:border-black">
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </span>
                    </div>
                    <span className="text-[12px] text-[#8E8E93] truncate w-full text-center">
                      Your Note
                    </span>
                  </button>
                )}

                {stories.map((story, sIdx) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => onOpenStory?.(sIdx)}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-16 ios-press cursor-pointer"
                  >
                    <div
                      className={`p-[2px] rounded-full ${
                        story.isSeen
                          ? 'bg-[#C7C7CC] dark:bg-[#3A3A3C]'
                          : 'bg-[#007AFF] dark:bg-[#0A84FF]'
                      }`}
                    >
                      <div className="p-[2px] rounded-full bg-white dark:bg-black">
                        <Avatar src={story.authorAvatar} name={story.authorName} size="md" className="w-[52px] h-[52px]" />
                      </div>
                    </div>
                    <span className="text-[12px] text-black/80 dark:text-white/80 truncate w-full text-center">
                      {story.authorName.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Segmented Control: Primary | Requests */}
          <div className="px-4 py-2.5 shrink-0 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="grid grid-cols-2 p-1 rounded-[12px] bg-[#F2F2F7] dark:bg-[#1C1C1E]">
              <button
                type="button"
                onClick={() => handleSwitchInboxTab('primary')}
                className={`py-1.5 rounded-[9px] text-[14px] font-medium transition-all cursor-pointer ${
                  inboxTab === 'primary'
                    ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
                    : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                }`}
              >
                Messages ({displayedConversations.length})
              </button>
              <button
                id="messages-requests-header-btn"
                type="button"
                onClick={() => handleSwitchInboxTab('requests')}
                className={`py-1.5 rounded-[9px] text-[14px] font-medium transition-all cursor-pointer ${
                  inboxTab === 'requests'
                    ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
                    : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                }`}
              >
                Requests
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div
            ref={inboxListScrollRef}
            onScroll={(e) => {
              if (isTabActive && !activeConversationId) {
                savedInboxScrollTopRef.current = e.currentTarget.scrollTop;
              }
            }}
            className="flex-1 overflow-y-auto pb-28"
          >
            {inboxTab === 'requests' ? (
              isSpamOpen ? (
                <div className="p-4">
                  <button
                    type="button"
                    onClick={() => setIsSpamOpen(false)}
                    className="inline-flex items-center gap-1 text-[15px] font-medium text-[#007AFF] dark:text-[#0A84FF] mb-6 cursor-pointer ios-press"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back to Requests</span>
                  </button>
                  <EmptyState
                    icon={<ShieldCheck className="w-7 h-7 text-[#007AFF] dark:text-[#0A84FF]" />}
                    title="No Spam Messages"
                    description="Filtered or suspicious message requests will appear here safely."
                  />
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  <button
                    id="message-requests-spam-row"
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setIsSpamOpen(true);
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#F2F2F7]/60 dark:hover:bg-[#1C1C1E]/60 transition-colors cursor-pointer ios-press"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-center">
                        <EyeOff className="w-5 h-5 text-[#8E8E93]" />
                      </div>
                      <div className="text-left">
                        <p className="text-[16px] font-semibold">Filtered Spam</p>
                        <p className="text-[14px] text-[#8E8E93]">0 filtered messages</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#C7C7CC] dark:text-[#636366]" />
                  </button>

                  <div className="pt-8">
                    <EmptyState
                      icon={<MessageCircle className="w-7 h-7" />}
                      title="No Message Requests"
                      description="Messages from creators outside your contacts will appear here."
                    />
                  </div>
                </div>
              )
            ) : isTabLoading ? (
              <div className="px-4 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ConversationRowSkeleton key={i} />
                ))}
              </div>
            ) : displayedConversations.length === 0 ? (
              <div className="pt-10">
                <EmptyState
                  icon={<MessageCircle className="w-7 h-7" />}
                  title={listSearchQuery ? 'No Conversations Found' : 'No Messages Yet'}
                  description={
                    listSearchQuery
                      ? `No chats matched "${listSearchQuery}".`
                      : 'Start a conversation with a creator or friend.'
                  }
                  actionLabel={listSearchQuery ? 'Clear Search' : 'New Message'}
                  onAction={() => {
                    if (listSearchQuery) setListSearchQuery('');
                    else setIsComposeOpen(true);
                  }}
                />
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {displayedConversations.map((conv) => {
                  const p = conv.participants[0];
                  const title = nicknames[conv.id] || (conv.type === 'group' ? conv.title : p?.name || 'Creator');
                  const avatar = p?.avatar;
                  const isOnline = p?.isOnline;
                  const isPinned = pinnedConvs[conv.id];
                  const isMuted = mutedConvs[conv.id];
                  const isLastMsgMine =
                    conv.lastMessage?.senderId === currentUser.id ||
                    conv.lastMessage?.senderId === 'user-me' ||
                    conv.lastMessage?.senderId === 'user';
                  const isSeen = conv.lastMessage?.status === 'read';
                  const statusTime =
                    conv.lastMessage?.seenAt && isSeen
                      ? formatClockTime(conv.lastMessage.seenAt)
                      : conv.lastMessage?.timestamp
                      ? formatClockTime(conv.lastMessage.timestamp)
                      : '';
                  const hasUnread = conv.unreadCount > 0;
                  const isPartnerTyping =
                    conv.isTyping && conv.typingUserId !== currentUser.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className="px-4 py-3 flex items-center gap-3.5 cursor-pointer hover:bg-[#F2F2F7]/70 dark:hover:bg-[#1C1C1E]/70 active:bg-[#F2F2F7] dark:active:bg-[#1C1C1E] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p) handleOpenUserProfile(p);
                        }}
                        aria-label={`View ${title} profile`}
                        className="shrink-0 ios-press cursor-pointer"
                      >
                        <Avatar src={avatar} name={title} size="md" className="w-[54px] h-[54px]" isOnline={isOnline} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-[17px] truncate ${
                                hasUnread ? 'font-bold' : 'font-semibold'
                              }`}
                            >
                              {title}
                            </span>
                            {p?.isVerified && <VerifiedBadge size={14} />}
                            {isPinned && <Pin className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />}
                            {isMuted && <BellOff className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />}
                          </div>

                          {statusTime && (
                            <span
                              className={`text-[13px] tabular-nums shrink-0 ${
                                hasUnread
                                  ? 'text-[#007AFF] dark:text-[#0A84FF] font-semibold'
                                  : 'text-[#8E8E93]'
                              }`}
                            >
                              {statusTime}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            {!isPartnerTyping && isLastMsgMine && conv.lastMessage && (
                              isSeen ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                              )
                            )}
                            <p
                              className={`text-[15px] truncate ${
                                isPartnerTyping
                                  ? 'text-[#007AFF] dark:text-[#0A84FF] font-medium'
                                  : hasUnread
                                  ? 'text-black dark:text-white font-medium'
                                  : 'text-[#8E8E93]'
                              }`}
                            >
                              {isPartnerTyping
                                ? 'Typing...'
                                : conv.lastMessage?.text || 'Start a conversation'}
                            </p>
                          </div>

                          {hasUnread && (
                            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#007AFF] text-white text-[12px] font-semibold flex items-center justify-center tabular-nums shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: ACTIVE CHAT CONVERSATION ==================== */}
      {activeConversation && (
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-white dark:bg-black">
          {isDetailsOpen ? (
            /* -------------------- CONVERSATION DETAILS SUBSCREEN -------------------- */
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-[#F2F2F7] dark:bg-black pb-10">
              <header className="sticky top-0 z-20 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] pt-safe">
                <div className="h-12 px-2 flex items-center justify-between">
                  <button
                    id="tiktok-details-back-btn"
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center gap-0.5 px-2 text-[#007AFF] dark:text-[#0A84FF] cursor-pointer ios-press"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                    <span className="text-[17px]">Chat</span>
                  </button>
                  <span className="text-[17px] font-semibold">Details</span>
                  <div className="w-16" />
                </div>
              </header>

              {/* Contact Summary */}
              <div className="px-4 pt-6 pb-5 flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => handleOpenUserProfile(partner)}
                  className="ios-press cursor-pointer"
                >
                  <Avatar
                    src={partner?.avatar}
                    name={displayName}
                    size="xl"
                    isOnline={partner?.isOnline}
                  />
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <h2 className="text-[22px] font-bold tracking-tight">{displayName}</h2>
                  {partner?.isVerified && <VerifiedBadge size={16} />}
                </div>
                <p className="text-[15px] text-[#8E8E93] mt-0.5">
                  @{partner?.username || 'creator'}
                </p>

                {/* Primary Profile Actions */}
                <div className="flex items-center justify-center gap-6 mt-5">
                  <button
                    id="tiktok-action-create-group"
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedGroupUsers([partner?.id || '']);
                      setNewGroupName('');
                      setIsGroupCreateOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer ios-press"
                  >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center border border-black/[0.06] dark:border-white/[0.08]">
                      <Users className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]" />
                    </div>
                    <span className="text-[12px] font-medium text-[#8E8E93]">Create Group</span>
                  </button>

                  <button
                    id="tiktok-action-view-profile"
                    type="button"
                    onClick={() => handleOpenUserProfile(partner)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer ios-press"
                  >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center border border-black/[0.06] dark:border-white/[0.08]">
                      <UserIcon className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]" />
                    </div>
                    <span className="text-[12px] font-medium text-[#8E8E93]">Profile</span>
                  </button>
                </div>
              </div>

              {/* Grouped iOS Settings Cards */}
              <div className="px-4 space-y-5">
                <section>
                  <p className="px-3 pb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider">
                    Appearance & Naming
                  </p>
                  <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden border border-black/[0.05] dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setIsThemeSheetOpen(true)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">Chat Theme</span>
                      </div>
                      <div className="flex items-center gap-2 text-[15px] text-[#8E8E93]">
                        <span>{currentThemeName}</span>
                        <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                      </div>
                    </button>

                    <button
                      id="tiktok-opt-chat-bubble"
                      type="button"
                      onClick={() => setIsBubbleStyleModalOpen(true)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]" />
                        <span className="text-[16px]">Bubble Style</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTempNickname(customNickname || '');
                        setIsNicknameSheetOpen(true);
                      }}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <PenLine className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]" />
                        <span className="text-[16px]">Nickname</span>
                      </div>
                      <div className="flex items-center gap-2 text-[15px] text-[#8E8E93]">
                        <span className="truncate max-w-[120px]">
                          {customNickname || 'Set name'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                      </div>
                    </button>
                  </div>
                </section>

                <section>
                  <p className="px-3 pb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider">
                    Notifications & Chat Controls
                  </p>
                  <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden border border-black/[0.05] dark:border-white/[0.06]">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BellOff className="w-5 h-5 text-[#8E8E93]" />
                        <span className="text-[16px]">Mute Messages</span>
                      </div>
                      <Toggle
                        checked={isCurrentMuted}
                        onChange={(next) => {
                          setMutedConvs((prev) => ({ ...prev, [activeConvId]: next }));
                          showToast(next ? 'Messages muted' : 'Messages unmuted', {
                            type: 'info',
                            durationMs: 1800,
                          });
                        }}
                        ariaLabel="Mute messages"
                      />
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ArrowUpToLine className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">Pin to Top</span>
                      </div>
                      <Toggle
                        checked={isCurrentPinned}
                        onChange={(next) => {
                          setPinnedConvs((prev) => ({ ...prev, [activeConvId]: next }));
                          showToast(next ? 'Pinned conversation' : 'Unpinned conversation', {
                            type: 'info',
                            durationMs: 1800,
                          });
                        }}
                        ariaLabel="Pin conversation"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsChatControlsOpen(true)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]" />
                        <span className="text-[16px]">Disappearing Messages</span>
                      </div>
                      <div className="flex items-center gap-2 text-[15px] text-[#8E8E93]">
                        <span>
                          {currentDisappearing === 'off'
                            ? 'Off'
                            : currentDisappearing === '24h'
                            ? '24 hours'
                            : currentDisappearing === '7d'
                            ? '7 days'
                            : '90 days'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPrivacySheetOpen(true)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF]" />
                        <span className="text-[16px]">Privacy & Safety</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                    </button>
                  </div>
                </section>

                <section>
                  <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden border border-black/[0.05] dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCurrentBlocked) {
                          setBlockedConvs((prev) => ({ ...prev, [activeConvId]: false }));
                          showToast('Account unblocked', { type: 'success' });
                        } else {
                          setIsBlockDialogOpen(true);
                        }
                      }}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left text-black dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Ban className="w-5 h-5" />
                      <span className="text-[16px] font-semibold">
                        {isCurrentBlocked ? `Unblock ${displayName}` : `Block ${displayName}`}
                      </span>
                    </button>

                    <button
                      id="tiktok-opt-report"
                      type="button"
                      onClick={() => setIsReportSheetOpen(true)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left text-black dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Flag className="w-5 h-5" />
                      <span className="text-[16px] font-semibold">Report Conversation</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            /* -------------------- CHAT THREAD SCREEN -------------------- */
            <>
              {/* Sticky iOS Chat Top Navigation Bar */}
              <header className="shrink-0 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] pt-safe">
                <div className="h-14 px-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <button
                      id="chat-screen-back-btn"
                      type="button"
                      onClick={onBackToList}
                      aria-label="Back to messages"
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF] cursor-pointer ios-press"
                    >
                      <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                    </button>

                    <button
                      id="chat-topbar-profile-btn"
                      type="button"
                      onClick={() => setIsDetailsOpen(true)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer ios-press"
                    >
                      <Avatar
                        src={partner?.avatar}
                        name={displayName}
                        size="sm"
                        isOnline={partner?.isOnline}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[16px] font-semibold truncate">{displayName}</span>
                          {partner?.isVerified && <VerifiedBadge size={14} />}
                        </div>
                        <p
                          className={`text-[12px] truncate ${
                            isCurrentBlocked
                              ? 'text-black dark:text-white font-semibold'
                              : isOtherUserTyping
                              ? 'text-[#007AFF] dark:text-[#0A84FF] font-medium'
                              : 'text-[#8E8E93]'
                          }`}
                        >
                          {isCurrentBlocked
                            ? 'Blocked'
                            : isOtherUserTyping
                            ? 'Typing...'
                            : isCurrentMuted
                            ? 'Muted'
                            : partner?.isOnline
                            ? 'Online'
                            : 'Active recently'}
                          {currentDisappearing !== 'off' ? ` · Disappearing ${currentDisappearing}` : ''}
                        </p>
                      </div>
                    </button>
                  </div>

                  <button
                    id="chat-topbar-tiktok-menu-btn"
                    type="button"
                    onClick={() => setIsDetailsOpen(true)}
                    aria-label="Conversation details"
                    className="w-11 h-11 rounded-full flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF] hover:bg-[#F2F2F7] dark:hover:bg-[#1C1C1E] cursor-pointer ios-press"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* Messages Stream */}
              <div
                ref={messagesStreamRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                  setShowScrollBottomBtn(distFromBottom > 180);
                }}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2.5 relative"
              >
                {(activeConversation.messages || []).length === 0 ? (
                  <div className="pt-14">
                    <EmptyState
                      icon={<MessageCircle className="w-7 h-7" />}
                      title={`Say hello to ${displayName}`}
                      description="Send a message to start the conversation."
                    />
                  </div>
                ) : (
                  (activeConversation.messages || []).map((msg, idx, arr) => {
                    const isMine = msg.senderId === currentUser.id;
                    const translationState = translationMap[msg.id];
                    const isTranslated = Boolean(translationState?.isTranslated);
                    const displayText = isTranslated ? translationState?.translatedText : msg.text;
                    const isLastMessage = idx === arr.length - 1;

                    const selectedStyle = msg.bubbleStyle || 'default';
                    const msgBubbleDef = getBubbleStyle(selectedStyle);
                    const isCustomBubble = selectedStyle !== 'default';
                    const outgoingBubbleClass = isCustomBubble
                      ? `${msgBubbleDef.bubbleClass} rounded-br-[6px]`
                      : `${activeThemeConfig.gradient} text-white rounded-[20px] rounded-br-[6px]`;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        {msg.replyTo && (
                          <div
                            className={`flex flex-col mb-1 max-w-[76%] ${
                              isMine ? 'items-end' : 'items-start'
                            }`}
                          >
                            <span className="text-[11px] text-[#8E8E93] px-1 mb-0.5">
                              {isMine ? 'You replied' : `${msg.senderName} replied`}
                            </span>
                            <div className="px-3.5 py-2 rounded-[16px] bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] text-[13px] border border-black/[0.05] dark:border-white/[0.06]">
                              <p className="line-clamp-2">{msg.replyTo.text}</p>
                            </div>
                          </div>
                        )}

                        <div className="max-w-[78%] flex flex-col">
                          <div
                            onTouchStart={() => startLongPress(msg)}
                            onTouchMove={cancelLongPress}
                            onTouchEnd={cancelLongPress}
                            onMouseDown={() => startLongPress(msg)}
                            onMouseMove={cancelLongPress}
                            onMouseUp={cancelLongPress}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelectedMenuMessage(msg);
                            }}
                            onClick={() => {
                              if (!isLongPressTriggeredRef.current) {
                                setSelectedMenuMessage(msg);
                              }
                              isLongPressTriggeredRef.current = false;
                            }}
                            className={`px-4 py-2.5 text-[16px] leading-[1.4] break-words cursor-pointer select-none ios-press relative ${
                              isMine
                                ? outgoingBubbleClass
                                : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white rounded-[20px] rounded-bl-[6px]'
                            }`}
                          >
                            {isMine && isCustomBubble && msgBubbleDef.renderCharacter('chat')}
                            <p className={isMine && isCustomBubble ? msgBubbleDef.textClass : ''}>
                              {displayText}
                            </p>
                          </div>

                          {/* Reactions */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div
                              className={`flex items-center gap-1 -mt-1.5 z-10 ${
                                isMine ? 'justify-end pr-2' : 'justify-start pl-2'
                              }`}
                            >
                              <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs text-[13px]">
                                {Object.entries(msg.reactions).map(([uId, emoji]) => (
                                  <span key={uId}>{emoji}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sent / Seen + Time on latest outgoing message */}
                          {isMine && (readReceipts || isLastMessage) && (
                            <div className="flex items-center justify-end gap-1 mt-1 px-1 text-[11px] text-[#8E8E93] tabular-nums">
                              <span>{formatClockTime(msg.timestamp)}</span>
                              {msg.status === 'read' ? (
                                <span className="inline-flex items-center gap-0.5 text-[#007AFF] dark:text-[#0A84FF] font-medium">
                                  · Seen <CheckCheck className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5">
                                  · Sent <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Animated 3-Dot Typing Bubble */}
                <AnimatePresence>
                  {isOtherUserTyping && (
                    <motion.div
                      id="instagram-typing-indicator"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.16 }}
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-[20px] rounded-bl-[6px] bg-[#F2F2F7] dark:bg-[#1C1C1E] self-start"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce [animation-delay:-0.32s]" />
                      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce [animation-delay:-0.16s]" />
                      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Floating Scroll-to-Bottom Button */}
              <AnimatePresence>
                {showScrollBottomBtn && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    onClick={() =>
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }
                    aria-label="Scroll to latest message"
                    className="absolute right-4 bottom-24 z-20 w-10 h-10 rounded-full bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] shadow-md flex items-center justify-center text-[#007AFF] cursor-pointer ios-press"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Reply Context Strip */}
              {replyingMessage && (
                <div className="px-4 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-[3px] h-7 rounded-full bg-[#007AFF] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[#007AFF] dark:text-[#0A84FF] truncate">
                        Replying to {replyingMessage.senderName}
                      </p>
                      <p className="text-[13px] text-[#8E8E93] truncate">
                        {replyingMessage.text}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingMessage(null)}
                    aria-label="Cancel reply"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer ios-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Keyboard-Safe Sticky Composer Bar */}
              <div
                id="chat-input-bar-container"
                className="px-3 py-2.5 pb-safe bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.08] shrink-0"
              >
                {isCurrentBlocked ? (
                  <div className="px-4 py-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Ban className="w-4 h-4 text-black dark:text-white shrink-0" />
                      <span className="text-[14px] font-medium text-black dark:text-white truncate">
                        You blocked {displayName}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setBlockedConvs((prev) => ({ ...prev, [activeConvId]: false }));
                        showToast('Account unblocked', { type: 'success' });
                      }}
                    >
                      Unblock
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmojiPickerTarget('composer');
                        setShowEmojiPicker(true);
                      }}
                      aria-label="Insert emoji"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#007AFF] cursor-pointer ios-press shrink-0"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <div
                      id="chat-input-pill"
                      className="flex-1 flex items-center min-h-[42px] rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] pl-4 pr-1.5 border border-black/[0.04] dark:border-white/[0.06] focus-within:ring-2 focus-within:ring-[#007AFF]/25 transition-all"
                    >
                      <input
                        id="chat-message-input"
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder="Message..."
                        className="flex-1 bg-transparent border-0 outline-none text-[16px] text-black dark:text-white placeholder:text-[#8E8E93] py-2 pr-2"
                      />

                      <button
                        type="submit"
                        disabled={!inputText.trim()}
                        aria-label="Send message"
                        className={`w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 text-white transition-opacity cursor-pointer ios-press disabled:opacity-35 ${activeThemeConfig.gradient}`}
                      >
                        <Send className="w-4 h-4 translate-x-px" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== COMPOSE NEW MESSAGE SHEET ==================== */}
      <BottomSheet
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="New Message"
      >
        <div className="px-4 py-3 space-y-4">
          <SearchBar
            value={composeSearch}
            onChange={setComposeSearch}
            placeholder="Search people by name or @username"
            autoFocus
          />

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label="Or message by username"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                placeholder="e.g. ariana_studio"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              disabled={!customUsername.trim()}
              onClick={() => {
                const clean = customUsername.trim().replace(/^@/, '');
                handleComposeSelectUser({
                  id: `custom-${clean.toLowerCase()}`,
                  name: clean,
                  username: clean.toLowerCase(),
                  avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(clean)}`,
                });
              }}
            >
              Chat
            </Button>
          </div>

          <div>
            <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider mb-2">
              Suggested Creators
            </p>
            {composeCandidates.length === 0 ? (
              <EmptyState
                icon={<UserPlus className="w-6 h-6" />}
                title="No Matching People"
                description="Try another name or enter any @username above."
              />
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {composeCandidates.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleComposeSelectUser(person)}
                    className="w-full py-2.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/60 dark:hover:bg-[#2C2C2E]/40 rounded-xl px-1.5 cursor-pointer ios-press"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={person.avatar}
                        name={person.name}
                        size="md"
                        isOnline={person.isOnline}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[16px] font-semibold truncate">{person.name}</span>
                          {person.isVerified && <VerifiedBadge size={14} />}
                        </div>
                        <p className="text-[13px] text-[#8E8E93] truncate">@{person.username}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* ==================== MESSAGE CONTEXT MENU SHEET ==================== */}
      <BottomSheet
        isOpen={Boolean(selectedMenuMessage && !showEmojiPicker)}
        onClose={() => setSelectedMenuMessage(null)}
        title={selectedMenuMessage ? formatChatTimestamp(selectedMenuMessage.timestamp) : undefined}
      >
        {selectedMenuMessage && activeConversation && (
          <div className="px-4 py-3 space-y-4">
            {/* Quick Emoji Reaction Bar */}
            <div className="flex items-center justify-between px-2 py-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
              {quickReactions.slice(0, 6).map((emoji) => {
                const isSelected = selectedMenuMessage.reactions?.[currentUser.id] === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      triggerHaptic('medium');
                      onReactMessage(activeConversation.id, selectedMenuMessage.id, emoji);
                      setSelectedMenuMessage(null);
                    }}
                    className={`w-10 h-10 rounded-full text-[22px] flex items-center justify-center transition-transform hover:scale-115 active:scale-95 cursor-pointer ${
                      isSelected ? 'bg-[#007AFF]/15 ring-2 ring-[#007AFF]' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setEmojiPickerTarget('reaction');
                  setShowEmojiPicker(true);
                }}
                aria-label="More reactions"
                className="w-10 h-10 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer ios-press"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Action List */}
            <div className="rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setReplyingMessage(selectedMenuMessage);
                  setSelectedMenuMessage(null);
                  inputRef.current?.focus();
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between text-[16px] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <span>Reply</span>
                <Reply className="w-5 h-5 text-[#8E8E93]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onForwardMessage) onForwardMessage(selectedMenuMessage);
                  setSelectedMenuMessage(null);
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between text-[16px] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <span>Forward</span>
                <Send className="w-5 h-5 text-[#8E8E93]" />
              </button>

              <button
                type="button"
                onClick={() => handleCopy(selectedMenuMessage.text)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-[16px] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <span>Copy</span>
                <Copy className="w-5 h-5 text-[#8E8E93]" />
              </button>

              <button
                type="button"
                onClick={() => handleTranslate(selectedMenuMessage)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-[16px] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <span>
                  {translationMap[selectedMenuMessage.id]?.isTranslated
                    ? 'Show Original'
                    : 'Translate'}
                </span>
                <Languages className="w-5 h-5 text-[#007AFF]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteMessage(activeConversation.id, selectedMenuMessage.id);
                  setSelectedMenuMessage(null);
                  showToast('Message deleted', { type: 'info', durationMs: 1800 });
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between text-[16px] font-semibold text-black dark:text-white cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <span>Delete</span>
                <Trash2 className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMenuMessage(null);
                  setIsReportSheetOpen(true);
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between text-[16px] font-semibold text-black dark:text-white cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <span>Report</span>
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ==================== EMOJI PICKER MODAL ==================== */}
      <InstagramEmojiPickerModal
        isOpen={showEmojiPicker}
        theme={currentUser.theme === 'light' ? 'light' : 'dark'}
        onClose={() => {
          setShowEmojiPicker(false);
          if (emojiPickerTarget === 'reaction') setSelectedMenuMessage(null);
        }}
        onSelectReaction={(emoji) => {
          if (emojiPickerTarget === 'reaction' && selectedMenuMessage && activeConversation) {
            soundFX.playClick();
            triggerHaptic('medium');
            onReactMessage(activeConversation.id, selectedMenuMessage.id, emoji);
          } else {
            setInputText((prev) => prev + emoji);
          }
          setShowEmojiPicker(false);
          setSelectedMenuMessage(null);
        }}
        onQuickReactionsChange={(next) => setQuickReactions(next)}
      />

      {/* ==================== THEME PICKER SHEET ==================== */}
      <BottomSheet
        isOpen={isThemeSheetOpen}
        onClose={() => setIsThemeSheetOpen(false)}
        title="Chat Theme"
      >
        <div className="px-4 py-3 space-y-2">
          {CHAT_THEMES.map((cfg) => {
            const isSelected = currentThemeName === cfg.name;
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => {
                  setChatThemes((prev) => ({ ...prev, [activeConvId]: cfg.name }));
                  setIsThemeSheetOpen(false);
                  showToast(`Theme set to ${cfg.name}`, { type: 'success', durationMs: 1800 });
                }}
                className="w-full p-3 rounded-2xl flex items-center justify-between bg-[#F2F2F7] dark:bg-[#2C2C2E] cursor-pointer ios-press"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${cfg.preview}`} />
                  <span className="text-[16px] font-medium">{cfg.name}</span>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[#007AFF] stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* ==================== BUBBLE STYLE MODAL ==================== */}
      <TikTokBubbleStyleModal
        isOpen={isBubbleStyleModalOpen}
        onClose={() => setIsBubbleStyleModalOpen(false)}
        currentStyleId={globalBubbleStyle}
        isLight={currentUser.theme === 'light'}
        onSave={(newStyleId) => {
          setGlobalBubbleStyle(newStyleId);
          safeStorage.setItem('enmmoe_bubble_style', newStyleId);
          showToast('Bubble style updated', { type: 'success', durationMs: 1800 });
        }}
      />

      {/* ==================== CHAT CONTROLS & DISAPPEARING MESSAGES ==================== */}
      <BottomSheet
        isOpen={isChatControlsOpen}
        onClose={() => setIsChatControlsOpen(false)}
        title="Chat Controls"
      >
        <div className="px-4 py-3 space-y-5">
          <div className="rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-[16px] font-medium">Read Receipts</p>
                <p className="text-[13px] text-[#8E8E93]">
                  Show people when you have seen their messages.
                </p>
              </div>
              <Toggle checked={readReceipts} onChange={setReadReceipts} ariaLabel="Read receipts" />
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-[16px] font-medium">Typing Indicators</p>
                <p className="text-[13px] text-[#8E8E93]">
                  Show when you are actively typing.
                </p>
              </div>
              <Toggle
                checked={typingIndicatorsEnabled}
                onChange={setTypingIndicatorsEnabled}
                ariaLabel="Typing indicators"
              />
            </div>
          </div>

          <div>
            <p className="text-[15px] font-semibold mb-1">Disappearing Messages</p>
            <p className="text-[13px] text-[#8E8E93] mb-3">
              New messages in this chat clear automatically after the selected timer.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['off', '24h', '7d', '90d'] as const).map((opt) => {
                const selected = currentDisappearing === opt;
                const label =
                  opt === 'off'
                    ? 'Off'
                    : opt === '24h'
                    ? '24h'
                    : opt === '7d'
                    ? '7 days'
                    : '90 days';
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (!activeConvId) return;
                      setDisappearingByConv((prev) => ({ ...prev, [activeConvId]: opt }));
                      showToast(`Disappearing messages: ${label}`, {
                        type: 'success',
                        durationMs: 1800,
                      });
                    }}
                    className={`py-2.5 rounded-xl text-[14px] font-medium transition-colors cursor-pointer ios-press ${
                      selected
                        ? 'bg-[#007AFF] text-white font-semibold'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* ==================== PRIVACY & ENCRYPTION SHEET ==================== */}
      <BottomSheet
        isOpen={isPrivacySheetOpen}
        onClose={() => setIsPrivacySheetOpen(false)}
        title="Privacy & Safety"
      >
        <div className="px-4 py-3 space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#007AFF] dark:text-[#0A84FF] shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] font-semibold text-[#007AFF] dark:text-[#0A84FF]">Privacy & Moderation</p>
              <p className="text-[13px] text-[#8E8E93] mt-0.5 leading-relaxed">
                Manage blocking, reporting, and disappearing message controls for this conversation.
              </p>
            </div>
          </div>

          <div className="rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setIsPrivacySheetOpen(false);
                setIsBlockDialogOpen(true);
              }}
              className="w-full px-4 py-3.5 text-left text-[16px] text-black dark:text-white font-semibold cursor-pointer"
            >
              {isCurrentBlocked ? `Unblock ${displayName}` : `Block ${displayName}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPrivacySheetOpen(false);
                setIsReportSheetOpen(true);
              }}
              className="w-full px-4 py-3.5 text-left text-[16px] text-black dark:text-white font-semibold cursor-pointer"
            >
              Report Conversation
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ==================== NICKNAME SHEET ==================== */}
      <BottomSheet
        isOpen={isNicknameSheetOpen}
        onClose={() => setIsNicknameSheetOpen(false)}
        title="Edit Nickname"
      >
        <div className="px-4 py-3 space-y-4">
          <TextField
            label={`Nickname for ${partner?.name || 'Contact'}`}
            value={tempNickname}
            onChange={(e) => setTempNickname(e.target.value)}
            placeholder={partner?.name || 'Enter nickname'}
          />
          <div className="flex items-center gap-2.5">
            {customNickname && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setNicknames((prev) => {
                    const next = { ...prev };
                    delete next[activeConvId];
                    return next;
                  });
                  setIsNicknameSheetOpen(false);
                  showToast('Nickname cleared', { type: 'info' });
                }}
              >
                Reset
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => {
                if (tempNickname.trim()) {
                  setNicknames((prev) => ({
                    ...prev,
                    [activeConvId]: tempNickname.trim(),
                  }));
                  showToast(`Nickname saved`, { type: 'success' });
                } else {
                  setNicknames((prev) => {
                    const next = { ...prev };
                    delete next[activeConvId];
                    return next;
                  });
                }
                setIsNicknameSheetOpen(false);
              }}
            >
              Save Nickname
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ==================== CREATE GROUP SHEET ==================== */}
      <BottomSheet
        isOpen={isGroupCreateOpen}
        onClose={() => setIsGroupCreateOpen(false)}
        title="New Group Chat"
      >
        <div className="px-4 py-3 space-y-4">
          <TextField
            label="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g. Weekend Readers"
          />

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {allConversations
              .map((c) => c.participants[0])
              .filter((p, idx, self) => p && self.findIndex((s) => s?.id === p?.id) === idx)
              .map((contact) => {
                if (!contact) return null;
                const isSelected = selectedGroupUsers.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() =>
                      setSelectedGroupUsers((prev) =>
                        prev.includes(contact.id)
                          ? prev.filter((id) => id !== contact.id)
                          : [...prev, contact.id]
                      )
                    }
                    className="w-full p-2.5 rounded-2xl flex items-center justify-between hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={contact.avatar} name={contact.name} size="sm" />
                      <div className="text-left">
                        <p className="text-[15px] font-semibold">{contact.name}</p>
                        <p className="text-[13px] text-[#8E8E93]">@{contact.username}</p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#007AFF] border-[#007AFF] text-white'
                          : 'border-[#C7C7CC] dark:border-[#48484A]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={selectedGroupUsers.length === 0}
            className="w-full"
            onClick={() => {
              const members = allConversations
                .map((c) => c.participants[0])
                .filter((p) => p && selectedGroupUsers.includes(p.id));
              const newGroup: SocialConversation = {
                id: `group-${Date.now()}`,
                type: 'group',
                title: newGroupName.trim() || 'Group Chat',
                participants: members.map((m) => ({
                  id: m!.id,
                  name: m!.name,
                  username: m!.username,
                  avatar: m!.avatar,
                  isOnline: m!.isOnline,
                })),
                unreadCount: 0,
                messages: [],
              };
              setExtraConvs((prev) => [newGroup, ...prev]);
              setIsGroupCreateOpen(false);
              setIsDetailsOpen(false);
              onSelectConversation(newGroup.id);
              showToast(`Created "${newGroup.title}"`, { type: 'success' });
            }}
          >
            Create Group ({selectedGroupUsers.length})
          </Button>
        </div>
      </BottomSheet>

      {/* ==================== REPORT CONVERSATION SHEET ==================== */}
      <BottomSheet
        isOpen={isReportSheetOpen}
        onClose={() => setIsReportSheetOpen(false)}
        title="Report Conversation"
      >
        <div className="px-4 py-3 space-y-4">
          <p className="text-[15px] text-[#8E8E93]">
            Select a reason for reporting this conversation.
          </p>
          <div className="space-y-1.5">
            {[
              'Harassment or bullying',
              'Spam or scam',
              'Inappropriate or explicit content',
              'Impersonation',
            ].map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setReportReason(reason)}
                className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between text-[15px] cursor-pointer ${
                  reportReason === reason
                    ? 'bg-[#007AFF]/10 text-[#007AFF] font-semibold'
                    : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white'
                }`}
              >
                <span>{reason}</span>
                {reportReason === reason && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
          <Button
            variant="destructive"
            size="md"
            className="w-full"
            onClick={() => {
              setIsReportSheetOpen(false);
              showToast('Report submitted', { type: 'success' });
            }}
          >
            Submit Report
          </Button>
        </div>
      </BottomSheet>

      {/* ==================== BLOCK CONFIRMATION DIALOG ==================== */}
      <Dialog
        isOpen={isBlockDialogOpen}
        onClose={() => setIsBlockDialogOpen(false)}
        title={`Block ${displayName}?`}
        description="They will no longer be able to send you messages. You can unblock them anytime in conversation details."
        confirmLabel="Block"
        destructive
        onConfirm={() => {
          if (activeConvId) {
            setBlockedConvs((prev) => ({ ...prev, [activeConvId]: true }));
            showToast(`${displayName} blocked`, { type: 'info' });
          }
          setIsBlockDialogOpen(false);
        }}
      />

      {/* ==================== PARTNER PROFILE MODAL ==================== */}
      <AnimatePresence>
        {isProfileOverviewOpen && (inspectedUser || activeConversation?.participants[0]) && (
          <UserProfileModal
            isOpen={isProfileOverviewOpen}
            onClose={() => {
              setIsProfileOverviewOpen(false);
              setInspectedUser(null);
            }}
            currentUser={currentUser}
            user={(() => {
              const target = inspectedUser || activeConversation!.participants[0];
              return {
                id: target.id,
                name: target.name || displayName,
                username: target.username || 'creator',
                avatar: target.avatar,
                isVerified: target.isVerified,
                isPremium: Boolean(target.isVerified),
                bio: (target as any).bio || 'Webtoon creator and avid story reader.',
                followersCount: (target as any).followersCount || 14200,
                followingCount: (target as any).followingCount || 395,
                postsCount: (target as any).postsCount || 6,
                likesCount: (target as any).likesCount || 89400,
                storiesReadCount: (target as any).storiesReadCount || 184,
                achievementsCount: (target as any).achievementsCount || 24,
              };
            })()}
            isFollowing={followedUserIds.includes(
              (inspectedUser || activeConversation!.participants[0]).id
            )}
            onToggleFollow={(id) =>
              setFollowedUserIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onSendMessage={() => {
              setIsProfileOverviewOpen(false);
              setIsDetailsOpen(false);
              setInspectedUser(null);
            }}
            isLight={currentUser.theme === 'light'}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
