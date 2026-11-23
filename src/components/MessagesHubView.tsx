import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUpToLine,
  Ban,
  BellOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  EyeOff,
  Flag,
  Languages,
  Loader2,
  Lock,
  Menu,
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
  SmilePlus,
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
import { formatLocalizedTime, useLanguage } from '../utils/i18n';
import { translateMessageText } from '../utils/translator';
import { triggerHaptic } from '../utils/telegram';
import { safeStorage } from '../utils/storage';
import { AppleEmoji, EmojiText } from './AppleEmoji';
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
import { StoriesBar } from './StoriesBar';
import { StoryAuthorGroup } from '../utils/storyMedia';

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
  onOpenAuthorStory?: (authorId: string, group?: StoryAuthorGroup) => void;
  onOpenCreateStory?: () => void;
  onSendMessage: (convId: string, text: string, replyTo?: any) => void;
  onReactMessage: (convId: string, messageId: string, emoji: string) => void;
  onDeleteMessage: (
    convId: string,
    messageId: string,
    mode?: 'unsend' | 'delete_for_me'
  ) =>
    | void
    | boolean
    | { ok: boolean; deletedForEveryone: boolean; error?: string }
    | Promise<void | boolean | { ok: boolean; deletedForEveryone: boolean; error?: string }>;
  onForwardMessage?: (message: SocialMessage) => void;
  onBackToList?: () => void;
  onUserTyping?: (convId: string, isTyping: boolean) => void;
  onToggleFollow?: (userId: string) => void;
  onRequestAction?: (convId: string, action: 'accept' | 'decline' | 'block' | 'spam') => void;
  onToggleBlockUser?: (targetUserId: string, block: boolean) => void;
  onReportTarget?: (targetType: 'conversation' | 'message' | 'account', targetId: string, reason: string) => void;
  onUpdatePrivacy?: (updates: Partial<User>) => void;
  onCreateGroupConversation?: (title: string, memberIds: string[]) => void;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  }) => void;
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

export interface DeleteMessageDialogConfig {
  canDeleteForEveryone: boolean;
  isGroup: boolean;
  recipientName: string;
  alsoDeleteLabel: string | null;
}

export function getDeleteMessageDialogConfig(
  conversation: SocialConversation | undefined,
  message: SocialMessage | null,
  currentUserId: string,
  nicknameOverride?: string
): DeleteMessageDialogConfig {
  if (!conversation || !message) {
    return {
      canDeleteForEveryone: false,
      isGroup: false,
      recipientName: '',
      alsoDeleteLabel: null,
    };
  }
  const isGroup = conversation.type === 'group';
  const otherMembers = (conversation.participants || []).filter((p) => p.id !== currentUserId);
  const recipientName = isGroup
    ? otherMembers.length === 1
      ? otherMembers[0].name
      : conversation.title || 'everyone'
    : nicknameOverride || otherMembers[0]?.name || 'this user';

  const isOwnMsg = message.senderId === currentUserId;
  const canDeleteForEveryone = isOwnMsg && otherMembers.length > 0;

  let alsoDeleteLabel: string | null = null;
  if (canDeleteForEveryone) {
    if (isGroup) {
      alsoDeleteLabel =
        otherMembers.length === 1
          ? `Also delete for ${otherMembers[0].name}`
          : 'Also delete for everyone';
    } else {
      alsoDeleteLabel = `Also delete for ${recipientName}`;
    }
  }

  return {
    canDeleteForEveryone,
    isGroup,
    recipientName,
    alsoDeleteLabel,
  };
}

export interface MessageMenuAnchor {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  isMine: boolean;
}

export function computeFloatingMessageMenuLayout(
  anchor: MessageMenuAnchor,
  viewportW: number,
  viewportH: number,
  isMoreView = false
) {
  const EDGE_MARGIN = 12;
  const TOP_SAFE = 16;
  const BOTTOM_SAFE = 16;
  const BAR_HEIGHT = 46;
  const GAP = 8;
  const MENU_EST_HEIGHT = isMoreView ? 104 : 304;

  const vw = Math.max(320, viewportW || 390);
  const vh = Math.max(420, viewportH || 844);

  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), Math.max(min, max));

  // Compact Instagram width: ~48-52% of typical phone screen width, capped cleanly
  const menuWidth = Math.round(
    Math.min(238, Math.max(188, vw * 0.5), vw - EDGE_MARGIN * 2)
  );
  const reactionBarWidth = Math.round(Math.min(312, vw - EDGE_MARGIN * 2));

  const rawMenuLeft = anchor.isMine ? anchor.right - menuWidth : anchor.left;
  const rawBarLeft = anchor.isMine ? anchor.right - reactionBarWidth : anchor.left;

  const menuLeft = Math.round(
    clamp(rawMenuLeft, EDGE_MARGIN, vw - menuWidth - EDGE_MARGIN)
  );
  const reactionBarLeft = Math.round(
    clamp(rawBarLeft, EDGE_MARGIN, vw - reactionBarWidth - EDGE_MARGIN)
  );

  const barAboveBubbleTop = anchor.top - BAR_HEIGHT - GAP;
  const menuBelowBubbleTop = anchor.bottom + GAP;
  const stackAboveMenuTop = anchor.top - GAP - MENU_EST_HEIGHT;
  const stackAboveBarTop = stackAboveMenuTop - GAP - BAR_HEIGHT;

  let reactionBarTop: number;
  let menuTop: number;

  if (
    barAboveBubbleTop >= TOP_SAFE &&
    menuBelowBubbleTop + MENU_EST_HEIGHT <= vh - BOTTOM_SAFE
  ) {
    // Default Instagram-like placement: reaction bar right above bubble, menu right below bubble
    reactionBarTop = barAboveBubbleTop;
    menuTop = menuBelowBubbleTop;
  } else if (stackAboveBarTop >= TOP_SAFE) {
    // Bubble is low on screen: place [reaction bar] + [menu] neatly above bubble
    menuTop = Math.min(stackAboveMenuTop, vh - BOTTOM_SAFE - MENU_EST_HEIGHT);
    reactionBarTop = menuTop - GAP - BAR_HEIGHT;
  } else if (menuBelowBubbleTop + MENU_EST_HEIGHT <= vh - BOTTOM_SAFE) {
    // Bubble is near very top: clamp reaction bar safely inside top & push menu below bar/bubble
    reactionBarTop = TOP_SAFE;
    menuTop = Math.min(
      Math.max(menuBelowBubbleTop, reactionBarTop + BAR_HEIGHT + GAP),
      vh - BOTTOM_SAFE - MENU_EST_HEIGHT
    );
  } else {
    // Tight viewport fallback: keep bar strictly above menu and clamp within safe vertical bounds
    const minMenuTop = TOP_SAFE + BAR_HEIGHT + GAP;
    const maxMenuTop = Math.max(minMenuTop, vh - BOTTOM_SAFE - MENU_EST_HEIGHT);
    menuTop = clamp(
      anchor.top > vh * 0.5 ? stackAboveMenuTop : menuBelowBubbleTop,
      minMenuTop,
      maxMenuTop
    );
    reactionBarTop = Math.max(TOP_SAFE, menuTop - GAP - BAR_HEIGHT);
  }

  return {
    menuWidth,
    reactionBarWidth,
    menuLeft,
    reactionBarLeft,
    reactionBarTop: Math.round(reactionBarTop),
    menuTop: Math.round(menuTop),
  };
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
  onOpenAuthorStory,
  onOpenCreateStory,
  onSendMessage,
  onReactMessage,
  onDeleteMessage,
  onForwardMessage,
  onBackToList,
  onUserTyping,
  onToggleFollow,
  onRequestAction,
  onToggleBlockUser,
  onReportTarget,
  onUpdatePrivacy,
  onCreateGroupConversation,
  onOpenUserProfile,
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

  // Message context menu, deletion dialog & translation
  const [selectedMenuMessage, setSelectedMenuMessage] = useState<SocialMessage | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MessageMenuAnchor | null>(null);
  const [showMoreMenuActions, setShowMoreMenuActions] = useState(false);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<SocialMessage | null>(null);
  const [deleteForEveryoneChecked, setDeleteForEveryoneChecked] = useState(false);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<'reaction' | 'composer'>('reaction');
  const [quickReactions, setQuickReactions] = useState<string[]>(() => getStoredQuickReactions());
  const [translationMap, setTranslationMap] = useState<
    Record<string, { translatedText: string; isVisible: boolean }>
  >({});
  const [translatingIds, setTranslatingIds] = useState<Record<string, boolean>>({});

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
  const [reportTargetId, setReportTargetId] = useState<string>('');
  const [reportTargetType, setReportTargetType] = useState<'conversation' | 'message'>('conversation');
  const [viewportBottomInset, setViewportBottomInset] = useState(0);

  const readReceipts = currentUser.readReceiptsEnabled !== false;
  const typingIndicatorsEnabled = currentUser.typingIndicatorsEnabled !== false;

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
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (isTabActive && !activeConversationId && inboxListScrollRef.current) {
      inboxListScrollRef.current.scrollTop = savedInboxScrollTopRef.current;
    }
  }, [isTabActive, activeConversationId]);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const handleViewportResize = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setViewportBottomInset(keyboardHeight > 80 ? keyboardHeight : 0);
    };
    handleViewportResize();
    vv.addEventListener('resize', handleViewportResize);
    vv.addEventListener('scroll', handleViewportResize);
    return () => {
      vv.removeEventListener('resize', handleViewportResize);
      vv.removeEventListener('scroll', handleViewportResize);
    };
  }, []);

  // Persist maps
  useEffect(() => safeStorage.setJSON('social_conv_muted', mutedConvs), [mutedConvs]);
  useEffect(() => safeStorage.setJSON('social_conv_blocked', blockedConvs), [blockedConvs]);
  useEffect(() => safeStorage.setJSON('social_conv_pinned', pinnedConvs), [pinnedConvs]);
  useEffect(() => safeStorage.setJSON('social_conv_nicknames', nicknames), [nicknames]);
  useEffect(() => safeStorage.setJSON('social_conv_chat_themes', chatThemes), [chatThemes]);
  useEffect(() => safeStorage.setJSON('social_conv_disappearing', disappearingByConv), [disappearingByConv]);

  const activeConversation = allConversations.find((c) => c.id === activeConversationId);
  const activeConvId = activeConversation?.id || '';
  const isGroup = activeConversation?.type === 'group';
  const partner = activeConversation?.participants[0];
  const customNickname = activeConvId ? nicknames[activeConvId] : null;
  const displayName =
    customNickname ||
    (isGroup ? activeConversation.title : partner?.name || 'Chat');

  const isCurrentMuted = Boolean(activeConvId && mutedConvs[activeConvId]);
  const isCurrentBlocked = Boolean(
    (partner?.id && (currentUser.blockedUserIds || []).includes(partner.id)) ||
      (activeConvId && blockedConvs[activeConvId])
  );
  const isCurrentPinned = Boolean(
    activeConvId && (pinnedConvs[activeConvId] ?? activeConversation?.isPinned)
  );
  const currentThemeName = activeConvId ? chatThemes[activeConvId] || 'iOS Blue' : 'iOS Blue';
  const activeThemeConfig =
    CHAT_THEMES.find((th) => th.name === currentThemeName || th.id === currentThemeName) ||
    CHAT_THEMES[0];
  const currentDisappearing = activeConvId ? disappearingByConv[activeConvId] || 'off' : 'off';

  const isOtherUserTyping = Boolean(
    !isCurrentBlocked &&
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

  // Auto-scroll to bottom on new message, typing, or keyboard open
  useEffect(() => {
    try {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    } catch {}
  }, [activeConversationId, activeConversation?.messages?.length, isOtherUserTyping, viewportBottomInset]);

  const handleOpenUserProfile = (
    targetUser?: (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) | null
  ) => {
    if (!targetUser) return;
    triggerHaptic('light');
    if (onOpenUserProfile) {
      const fullCreator = creators.find((c) => c.id === targetUser.id);
      onOpenUserProfile({
        ...fullCreator,
        ...targetUser,
        id: targetUser.id,
        name: targetUser.name || fullCreator?.name || displayName,
        username: targetUser.username || fullCreator?.username || 'creator',
        avatar: targetUser.avatar || fullCreator?.avatar || '',
        isVerified: targetUser.isVerified ?? fullCreator?.isVerified,
      });
      return;
    }
    setInspectedUser(targetUser);
    setIsProfileOverviewOpen(true);
  };

  // Start or switch to direct conversation
  const handleComposeSelectUser = (
    target: Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }
  ) => {
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

  const closeMessageMenu = () => {
    setSelectedMenuMessage(null);
    setMenuAnchor(null);
    setShowMoreMenuActions(false);
  };

  const openMessageMenu = (
    msg: SocialMessage,
    isMine: boolean,
    targetEl?: HTMLElement | null
  ) => {
    const rect = targetEl?.getBoundingClientRect();
    const fallbackW = typeof window !== 'undefined' ? window.innerWidth : 390;
    const fallbackH = typeof window !== 'undefined' ? window.innerHeight : 844;
    setMenuAnchor(
      rect && rect.width > 0
        ? {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            isMine,
          }
        : {
            top: fallbackH * 0.42,
            left: isMine ? fallbackW * 0.45 : 16,
            right: isMine ? fallbackW - 16 : fallbackW * 0.58,
            bottom: fallbackH * 0.48,
            width: fallbackW * 0.4,
            height: 44,
            isMine,
          }
    );
    setShowMoreMenuActions(false);
    setSelectedMenuMessage(msg);
  };

  useEffect(() => {
    if (!selectedMenuMessage || showEmojiPicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMessageMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMenuMessage, showEmojiPicker]);

  const closeDeleteDialog = () => {
    if (isDeletingMessage) return;
    setPendingDeleteMessage(null);
    setDeleteForEveryoneChecked(false);
  };

  useEffect(() => {
    if (!pendingDeleteMessage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeletingMessage) {
        setPendingDeleteMessage(null);
        setDeleteForEveryoneChecked(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDeleteMessage, isDeletingMessage]);

  const deleteDialogConfig = useMemo(
    () =>
      getDeleteMessageDialogConfig(
        activeConversation,
        pendingDeleteMessage,
        currentUser.id,
        !isGroup && activeConvId ? nicknames[activeConvId] : undefined
      ),
    [activeConversation, pendingDeleteMessage, currentUser.id, isGroup, activeConvId, nicknames]
  );

  const handleConfirmDeleteMessage = async () => {
    if (!pendingDeleteMessage || !activeConversation || isDeletingMessage) return;
    const targetMsg = pendingDeleteMessage;
    const requestEveryone =
      deleteDialogConfig.canDeleteForEveryone && deleteForEveryoneChecked;
    const mode: 'unsend' | 'delete_for_me' = requestEveryone ? 'unsend' : 'delete_for_me';

    setIsDeletingMessage(true);
    try {
      const rawResult = await Promise.resolve(
        onDeleteMessage(activeConversation.id, targetMsg.id, mode)
      );

      let succeeded = true;
      let deletedForEveryone = mode === 'unsend';
      let errorMsg: string | undefined;

      if (typeof rawResult === 'boolean') {
        succeeded = rawResult;
        deletedForEveryone = rawResult && mode === 'unsend';
      } else if (rawResult && typeof rawResult === 'object') {
        succeeded = rawResult.ok !== false;
        deletedForEveryone = rawResult.deletedForEveryone === true;
        errorMsg = rawResult.error;
      }

      if (!succeeded || (mode === 'unsend' && !deletedForEveryone)) {
        showToast(
          errorMsg ||
            t(
              'delete_everyone_failed',
              'Could not delete this message for the other participant.'
            ),
          { type: 'error', durationMs: 2400 }
        );
        return;
      }

      setExtraConvs((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversation.id) return c;
          const remaining = (c.messages || []).filter((m) => m.id !== targetMsg.id);
          return { ...c, messages: remaining, lastMessage: remaining[remaining.length - 1] };
        })
      );

      setPendingDeleteMessage(null);
      setDeleteForEveryoneChecked(false);

      if (deletedForEveryone) {
        showToast(
          deleteDialogConfig.isGroup
            ? t('deleted_for_everyone', 'Deleted for everyone')
            : `${t('deleted_for_you_and', 'Deleted for you and')} ${deleteDialogConfig.recipientName}`,
          { type: 'info', durationMs: 2000 }
        );
      } else {
        showToast(t('deleted_for_you', 'Deleted for you'), {
          type: 'info',
          durationMs: 1800,
        });
      }
    } finally {
      setIsDeletingMessage(false);
    }
  };

  // Message Long-Press & Menu (never triggers on normal tap or scroll drag)
  const startLongPress = (
    msg: SocialMessage,
    clientX?: number,
    clientY?: number,
    targetEl?: HTMLElement | null,
    isMine = false
  ) => {
    isLongPressTriggeredRef.current = false;
    pressOriginRef.current =
      typeof clientX === 'number' && typeof clientY === 'number'
        ? { x: clientX, y: clientY }
        : null;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      triggerHaptic('medium');
      openMessageMenu(msg, isMine, targetEl);
    }, 380);
  };

  const handleLongPressMove = (clientX?: number, clientY?: number) => {
    if (pressOriginRef.current && typeof clientX === 'number' && typeof clientY === 'number') {
      const dx = Math.abs(clientX - pressOriginRef.current.x);
      const dy = Math.abs(clientY - pressOriginRef.current.y);
      if (dx > 8 || dy > 8) {
        cancelLongPress();
      }
    }
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressOriginRef.current = null;
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
    const cacheKey = `${msg.id}:${language}`;
    const existing = translationMap[cacheKey];
    if (existing?.translatedText) {
      setTranslationMap((prev) => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isVisible: !prev[cacheKey].isVisible },
      }));
      closeMessageMenu();
      return;
    }
    if (translatingIds[cacheKey]) return;

    closeMessageMenu();
    setTranslatingIds((prev) => ({ ...prev, [cacheKey]: true }));
    try {
      const result = await translateMessageText({
        messageId: msg.id,
        text: msg.text,
        targetLanguage: language,
      });
      setTranslationMap((prev) => ({
        ...prev,
        [cacheKey]: { translatedText: result.translatedText, isVisible: true },
      }));
    } catch (err: any) {
      showToast(
        err?.message || t('translation_unavailable', 'Translation failed. Please try again.'),
        { type: 'error' }
      );
    } finally {
      setTranslatingIds((prev) => {
        const next = { ...prev };
        delete next[cacheKey];
        return next;
      });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard?.writeText?.(text);
      showToast(t('copied_to_clipboard', 'Copied to clipboard'), { type: 'success', durationMs: 1800 });
    } catch {
      showToast(t('unable_to_copy', 'Unable to copy text'), { type: 'error' });
    }
    closeMessageMenu();
  };

  // Split conversations cleanly: Primary vs Pending Requests vs Filtered Spam
  const { primaryConversations, requestConversations, spamConversations } = useMemo(() => {
    const q = listSearchQuery.toLowerCase().trim();
    const matches = (conv: SocialConversation) => {
      if (!q) return true;
      const p = conv.participants[0];
      const title = conv.type === 'group' ? conv.title : p?.name;
      const lastText = conv.lastMessage?.text || '';
      return Boolean(
        title?.toLowerCase().includes(q) ||
          p?.name?.toLowerCase().includes(q) ||
          p?.username?.toLowerCase().includes(q) ||
          lastText.toLowerCase().includes(q)
      );
    };
    const sorted = [...allConversations].filter(matches).sort((a, b) => {
      const ap = (pinnedConvs[a.id] ?? Boolean(a.isPinned)) ? 1 : 0;
      const bp = (pinnedConvs[b.id] ?? Boolean(b.isPinned)) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
    });

    const primary: SocialConversation[] = [];
    const requests: SocialConversation[] = [];
    const spam: SocialConversation[] = [];
    sorted.forEach((c) => {
      if (c.requestStatus === 'spam') {
        spam.push(c);
      } else if (c.isRequest && c.requestStatus !== 'accepted') {
        requests.push(c);
      } else {
        primary.push(c);
      }
    });
    return {
      primaryConversations: primary,
      requestConversations: requests,
      spamConversations: spam,
    };
  }, [allConversations, listSearchQuery, pinnedConvs]);

  const displayedConversations = primaryConversations;

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
          {/* Header: Clean Inbox Title + Compose Action */}
          <header className="px-4 pt-safe pt-2.5 pb-1.5 flex items-center justify-between bg-white/95 dark:bg-black/95 backdrop-blur-2xl shrink-0">
            <h1 className="text-[28px] font-bold tracking-tight leading-tight">
              {t('messages_title', 'Messages')}
            </h1>

            <div className="flex items-center gap-1">
              <button
                id="messages-compose-btn"
                type="button"
                onClick={() => {
                  setIsComposeOpen(true);
                }}
                aria-label={t('new_message', 'New Message')}
                title={t('new_message', 'New Message')}
                className="min-w-[44px] min-h-[44px] -mr-2 inline-flex items-center justify-center text-black dark:text-white transition-opacity hover:opacity-70 ios-press cursor-pointer"
              >
                <SquarePen className="w-[22px] h-[22px] stroke-[1.85]" />
              </button>
            </div>
          </header>

          {/* Search Bar */}
          <div className="px-4 pb-2 shrink-0">
            <SearchBar
              value={listSearchQuery}
              onChange={setListSearchQuery}
              placeholder={t('search_messages', 'Search messages or creators')}
            />
          </div>

          {/* Grouped Active Stories Bar */}
          {!listSearchQuery && inboxTab === 'primary' && (
            <StoriesBar
              currentUser={currentUser}
              stories={stories}
              onOpenAuthorStory={(authorId, group) => {
                if (onOpenAuthorStory) {
                  onOpenAuthorStory(authorId, group);
                } else if (onOpenStory && group.stories[0]) {
                  const idx = stories.findIndex((s) => s.id === group.stories[0].id);
                  if (idx >= 0) onOpenStory(idx);
                }
              }}
              onOpenCreateStory={() => onOpenCreateStory?.()}
              className="shrink-0"
            />
          )}

          {/* Clean Borderless Tabs: Messages | Requests */}
          <div className="px-4 pt-1 pb-1 shrink-0">
            <div
              role="tablist"
              aria-label="Inbox sections"
              className="flex items-center gap-7"
            >
              <button
                id="messages-primary-tab-btn"
                type="button"
                role="tab"
                aria-selected={inboxTab === 'primary'}
                onClick={() => handleSwitchInboxTab('primary')}
                className={`relative py-2.5 text-[15px] transition-colors cursor-pointer whitespace-nowrap ${
                  inboxTab === 'primary'
                    ? 'font-semibold text-black dark:text-white'
                    : 'font-medium text-[#8E8E93] hover:text-black dark:hover:text-white'
                }`}
              >
                <span>
                  {t('messages_title', 'Messages')}
                  {displayedConversations.length > 0 ? ` (${displayedConversations.length})` : ''}
                </span>
                {inboxTab === 'primary' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-black dark:bg-white" />
                )}
              </button>

              <button
                id="messages-requests-header-btn"
                type="button"
                role="tab"
                aria-selected={inboxTab === 'requests'}
                onClick={() => handleSwitchInboxTab('requests')}
                className={`relative py-2.5 text-[15px] transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                  inboxTab === 'requests'
                    ? 'font-semibold text-black dark:text-white'
                    : 'font-medium text-[#8E8E93] hover:text-black dark:hover:text-white'
                }`}
              >
                <span>{t('requests', 'Requests')}</span>
                {requestConversations.length > 0 && (
                  <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#007AFF] text-white text-[11px] font-semibold inline-flex items-center justify-center tabular-nums leading-none">
                    {requestConversations.length}
                  </span>
                )}
                {inboxTab === 'requests' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-black dark:bg-white" />
                )}
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
                <div className="p-4 space-y-4">
                  <button
                    type="button"
                    onClick={() => setIsSpamOpen(false)}
                    className="inline-flex items-center gap-1 text-[15px] font-medium text-[#007AFF] cursor-pointer ios-press"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>{t('back', 'Back')}</span>
                  </button>
                  {spamConversations.length === 0 ? (
                    <EmptyState
                      icon={<ShieldCheck className="w-7 h-7 text-[#007AFF]" />}
                      title={t('no_filtered_messages', 'No Filtered Messages')}
                      description={t('no_filtered_desc', 'Filtered message requests will appear here safely.')}
                    />
                  ) : (
                    <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {spamConversations.map((conv) => {
                        const rp = conv.participants[0];
                        return (
                          <div key={conv.id} className="py-3 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => rp && handleOpenUserProfile(rp)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <Avatar src={rp?.avatar} name={rp?.name || 'User'} size="md" className="w-11 h-11" />
                              <div className="min-w-0">
                                <p className="text-[15px] font-semibold truncate">{rp?.name}</p>
                                <p className="text-[13px] text-[#8E8E93] truncate">
                                  {conv.lastMessage?.text ? (
                                    <EmojiText text={conv.lastMessage.text} emojiSize={14} />
                                  ) : (
                                    t('filtered_requests', 'Filtered Requests')
                                  )}
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestAction?.(conv.id, 'decline')}
                              className="text-[13px] font-medium text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                            >
                              {t('delete', 'Delete')}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  <button
                    id="message-requests-spam-row"
                    type="button"
                    onClick={() => {
                      setIsSpamOpen(true);
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#F2F2F7]/60 dark:hover:bg-[#1C1C1E]/60 transition-colors cursor-pointer ios-press"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-center">
                        <EyeOff className="w-5 h-5 text-[#8E8E93]" />
                      </div>
                      <div className="text-left">
                        <p className="text-[16px] font-semibold">{t('filtered_requests', 'Filtered Requests')}</p>
                        <p className="text-[14px] text-[#8E8E93]">{spamConversations.length}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#C7C7CC] dark:text-[#636366]" />
                  </button>

                  {requestConversations.length === 0 ? (
                    <div className="pt-8">
                      <EmptyState
                        icon={<MessageCircle className="w-7 h-7" />}
                        title={t('no_message_requests', 'No Message Requests')}
                        description={t('no_requests_desc', "Messages from people you don't subscribe to will appear here.")}
                      />
                    </div>
                  ) : (
                    requestConversations.map((reqConv) => {
                      const rp = reqConv.participants[0];
                      const rName = rp?.name || reqConv.title || 'Creator';
                      return (
                        <div
                          key={reqConv.id}
                          onClick={() => onSelectConversation(reqConv.id)}
                          className="px-4 py-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-[#F2F2F7]/60 dark:hover:bg-[#1C1C1E]/60 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (rp) handleOpenUserProfile(rp);
                            }}
                            aria-label={rName}
                            className="shrink-0 ios-press cursor-pointer"
                          >
                            <Avatar src={rp?.avatar} name={rName} size="md" className="w-[52px] h-[52px]" />
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-[16px] font-semibold truncate">{rName}</span>
                                {rp?.isVerified && <VerifiedBadge size={14} />}
                              </div>
                              {reqConv.lastMessage?.timestamp && (
                                <span className="text-[12px] text-[#8E8E93] tabular-nums">
                                  {formatLocalizedTime(reqConv.lastMessage.timestamp, language)}
                                </span>
                              )}
                            </div>
                            <p className="text-[14px] text-[#8E8E93] truncate mt-0.5">
                              {reqConv.lastMessage?.text ? (
                                <EmojiText text={reqConv.lastMessage.text} emojiSize={14} />
                              ) : (
                                t('message_request_from', 'Message request from')
                              )}
                            </p>
                            <div
                              className="flex items-center gap-2 mt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => onRequestAction?.(reqConv.id, 'accept')}
                                className="h-8 px-3.5 rounded-lg bg-[#007AFF] text-white text-[13px] font-semibold cursor-pointer ios-press"
                              >
                                {t('accept', 'Accept')}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRequestAction?.(reqConv.id, 'decline')}
                                className="h-8 px-3 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white text-[13px] font-medium cursor-pointer ios-press"
                              >
                                {t('delete', 'Delete')}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRequestAction?.(reqConv.id, 'block')}
                                className="h-8 px-3 rounded-lg text-[#8E8E93] hover:text-black dark:hover:text-white text-[13px] font-medium cursor-pointer"
                              >
                                {t('block', 'Block')}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                  title={
                    listSearchQuery
                      ? t('no_conversations_found', 'No Conversations Found')
                      : t('no_messages_yet', 'No Messages Yet')
                  }
                  description={
                    listSearchQuery
                      ? `"${listSearchQuery}"`
                      : t('start_conversation_desc', 'Start a conversation with a creator or friend.')
                  }
                  actionLabel={
                    listSearchQuery
                      ? t('clear_search', 'Clear Search')
                      : t('new_message', 'New Message')
                  }
                  onAction={() => {
                    if (listSearchQuery) setListSearchQuery('');
                    else setIsComposeOpen(true);
                  }}
                />
              </div>
            ) : (
              <div>
                {displayedConversations.map((conv) => {
                  const p = conv.participants[0];
                  const title = nicknames[conv.id] || (conv.type === 'group' ? conv.title : p?.name || 'Creator');
                  const avatar = p?.avatar;
                  const isPartnerBlocked = Boolean(
                    (p?.id && (currentUser.blockedUserIds || []).includes(p.id)) || blockedConvs[conv.id]
                  );
                  const isOnline = Boolean(p?.isOnline && !isPartnerBlocked);
                  const isPinned = pinnedConvs[conv.id] ?? Boolean(conv.isPinned);
                  const isMuted = mutedConvs[conv.id];
                  const isLastMsgMine =
                    conv.lastMessage?.senderId === currentUser.id ||
                    conv.lastMessage?.senderId === 'user-me' ||
                    conv.lastMessage?.senderId === 'user';
                  const isSeen =
                    Boolean(isLastMsgMine) &&
                    !conv.isRequest &&
                    conv.lastMessage?.status === 'read' &&
                    readReceipts;
                  const statusTime =
                    isLastMsgMine && isSeen && conv.lastMessage?.seenAt
                      ? formatLocalizedTime(conv.lastMessage.seenAt, language)
                      : conv.lastMessage?.timestamp
                      ? formatLocalizedTime(conv.lastMessage.timestamp, language)
                      : '';
                  const hasUnread = conv.unreadCount > 0;
                  const isPartnerTyping =
                    !isPartnerBlocked && conv.isTyping && conv.typingUserId !== currentUser.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className="px-4 py-2.5 flex items-center gap-3.5 cursor-pointer hover:bg-[#F2F2F7]/50 dark:hover:bg-[#1C1C1E]/50 active:bg-[#F2F2F7] dark:active:bg-[#1C1C1E] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (conv.type === 'group') {
                            onSelectConversation(conv.id);
                          } else if (p) {
                            handleOpenUserProfile(p);
                          }
                        }}
                        aria-label={title}
                        className="shrink-0 ios-press cursor-pointer"
                      >
                        <Avatar src={avatar} name={title} size="md" className="w-[52px] h-[52px]" isOnline={isOnline} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={`text-[15px] leading-snug truncate ${
                                hasUnread ? 'font-bold text-black dark:text-white' : 'font-semibold text-black dark:text-white'
                              }`}
                            >
                              {title}
                            </span>
                            {conv.type !== 'group' && p?.isVerified && (
                              <VerifiedBadge size={14} className="shrink-0" />
                            )}
                            {isPinned && (
                              <Pin
                                aria-label="Pinned"
                                className="w-3 h-3 text-[#8E8E93] shrink-0 rotate-45"
                              />
                            )}
                            {isMuted && (
                              <BellOff
                                aria-label="Muted"
                                className="w-3 h-3 text-[#8E8E93] shrink-0"
                              />
                            )}
                          </div>

                          {statusTime && (
                            <span
                              className={`text-[12px] tabular-nums shrink-0 ${
                                hasUnread
                                  ? 'text-black dark:text-white font-semibold'
                                  : 'text-[#8E8E93]'
                              }`}
                            >
                              {statusTime}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2.5 mt-0.5">
                          <p
                            className={`text-[14px] leading-snug truncate min-w-0 flex-1 ${
                              isPartnerTyping
                                ? 'text-[#007AFF] font-medium'
                                : hasUnread
                                ? 'text-black dark:text-white font-semibold'
                                : 'text-[#8E8E93]'
                            }`}
                          >
                            {isPartnerTyping ? (
                              t('typing', 'Typing...')
                            ) : isLastMsgMine && conv.lastMessage ? (
                              <>
                                <span className="text-[#8E8E93] font-normal">
                                  {isSeen ? t('seen', 'Seen') : t('sent', 'Sent')} ·{' '}
                                </span>
                                <EmojiText text={conv.lastMessage.text} emojiSize={14} />
                              </>
                            ) : conv.lastMessage?.text ? (
                              <EmojiText text={conv.lastMessage.text} emojiSize={14} />
                            ) : (
                              t('start_conversation_prompt', 'Send a message to start the conversation.')
                            )}
                          </p>

                          {hasUnread && (
                            <span
                              aria-label={`${conv.unreadCount} unread`}
                              className="w-2.5 h-2.5 rounded-full bg-[#007AFF] shrink-0"
                            />
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
              <header className="sticky top-0 z-20 bg-white/92 dark:bg-black/92 backdrop-blur-2xl pt-safe">
                <div className="h-12 px-2 flex items-center justify-between">
                  <button
                    id="tiktok-details-back-btn"
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="min-w-[44px] min-h-[44px] inline-flex items-center gap-0.5 px-2 text-[#007AFF] hover:opacity-70 transition-opacity cursor-pointer ios-press"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                    <span className="text-[17px]">{t('back', 'Back')}</span>
                  </button>
                  <span className="text-[17px] font-semibold">{t('details', 'Details')}</span>
                  <div className="w-16" />
                </div>
              </header>

              {/* Contact Summary */}
              <div className="px-4 pt-6 pb-5 flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => !isGroup && handleOpenUserProfile(partner)}
                  className={isGroup ? 'cursor-default' : 'ios-press cursor-pointer'}
                >
                  <Avatar
                    src={partner?.avatar}
                    name={displayName}
                    size="xl"
                    isOnline={!isGroup && partner?.isOnline}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => !isGroup && handleOpenUserProfile(partner)}
                  className={`mt-3 text-center ${isGroup ? 'cursor-default' : 'cursor-pointer ios-press'}`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <h2 className="text-[22px] font-bold tracking-tight">{displayName}</h2>
                    {!isGroup && partner?.isVerified && <VerifiedBadge size={16} />}
                  </div>
                  <p className="text-[15px] text-[#8E8E93] mt-0.5">
                    {isGroup
                      ? `${activeConversation.participants.length} members`
                      : `@${partner?.username || 'creator'}`}
                  </p>
                </button>

                {/* Primary Profile Actions */}
                {!isGroup && (
                  <div className="flex items-center justify-center gap-6 mt-5">
                    <button
                      id="tiktok-action-create-group"
                      type="button"
                      onClick={() => {
                        setSelectedGroupUsers([partner?.id || '']);
                        setNewGroupName('');
                        setIsGroupCreateOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 cursor-pointer ios-press"
                    >
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#007AFF]" />
                      </div>
                      <span className="text-[12px] font-medium text-[#8E8E93]">{t('create_group', 'Create Group')}</span>
                    </button>

                    <button
                      id="tiktok-action-view-profile"
                      type="button"
                      onClick={() => handleOpenUserProfile(partner)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer ios-press"
                    >
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1C1C1E] flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-[#007AFF]" />
                      </div>
                      <span className="text-[12px] font-medium text-[#8E8E93]">{t('nav_profile', 'Profile')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Grouped iOS Settings Cards */}
              <div className="px-4 space-y-5">
                {isGroup && activeConversation.participants.length > 0 && (
                  <section>
                    <p className="px-3 pb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider">
                      Members ({activeConversation.participants.length})
                    </p>
                    <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                      {activeConversation.participants.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setIsDetailsOpen(false);
                            handleOpenUserProfile(member);
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar src={member.avatar} name={member.name} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[15px] font-semibold truncate">{member.name}</span>
                                {member.isVerified && <VerifiedBadge size={14} />}
                              </div>
                              <p className="text-[13px] text-[#8E8E93] truncate">@{member.username}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <p className="px-3 pb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider">
                    {t('appear_naming', 'Appearance & Naming')}
                  </p>
                  <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsThemeSheetOpen(true)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">{t('chat_theme', 'Chat Theme')}</span>
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
                        <Sparkles className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">{t('bubble_style', 'Bubble Style')}</span>
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
                        <PenLine className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">{t('nickname', 'Nickname')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[15px] text-[#8E8E93]">
                        <span className="truncate max-w-[120px]">
                          {customNickname || t('set_name', 'Set name')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                      </div>
                    </button>
                  </div>
                </section>

                <section>
                  <p className="px-3 pb-1.5 text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider">
                    {t('notifs_controls', 'Notifications & Chat Controls')}
                  </p>
                  <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BellOff className="w-5 h-5 text-[#8E8E93]" />
                        <span className="text-[16px]">{t('mute_messages', 'Mute Messages')}</span>
                      </div>
                      <Toggle
                        checked={isCurrentMuted}
                        onChange={(next) => {
                          setMutedConvs((prev) => ({ ...prev, [activeConvId]: next }));
                          showToast(next ? t('muted', 'Muted') : t('mute_messages', 'Mute Messages'), {
                            type: 'info',
                            durationMs: 1800,
                          });
                        }}
                        ariaLabel={t('mute_messages', 'Mute Messages')}
                      />
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ArrowUpToLine className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">{t('pin_to_top', 'Pin to Top')}</span>
                      </div>
                      <Toggle
                        checked={isCurrentPinned}
                        onChange={(next) => {
                          setPinnedConvs((prev) => ({ ...prev, [activeConvId]: next }));
                          showToast(t('pin_to_top', 'Pin to Top'), {
                            type: 'info',
                            durationMs: 1800,
                          });
                        }}
                        ariaLabel={t('pin_to_top', 'Pin to Top')}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsChatControlsOpen(true)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">{t('disappearing_messages', 'Disappearing Messages')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[15px] text-[#8E8E93]">
                        <span>
                          {currentDisappearing === 'off'
                            ? t('off', 'Off')
                            : currentDisappearing === '24h'
                            ? t('hours_24', '24 hours')
                            : currentDisappearing === '7d'
                            ? t('days_7', '7 days')
                            : t('days_90', '90 days')}
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
                        <Lock className="w-5 h-5 text-[#007AFF]" />
                        <span className="text-[16px]">{t('privacy_safety', 'Privacy & Safety')}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                    </button>
                  </div>
                </section>

                <section>
                  <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCurrentBlocked) {
                          setBlockedConvs((prev) => ({ ...prev, [activeConvId]: false }));
                          if (partner?.id) onToggleBlockUser?.(partner.id, false);
                          showToast(t('account_unblocked', 'Account unblocked'), { type: 'success' });
                        } else {
                          setIsBlockDialogOpen(true);
                        }
                      }}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left text-black dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Ban className="w-5 h-5" />
                      <span className="text-[16px] font-semibold">
                        {isCurrentBlocked ? `${t('unblock', 'Unblock')} ${displayName}` : `${t('block', 'Block')} ${displayName}`}
                      </span>
                    </button>

                    <button
                      id="tiktok-opt-report"
                      type="button"
                      onClick={() => {
                        setReportTargetType('conversation');
                        setReportTargetId(activeConvId);
                        setIsReportSheetOpen(true);
                      }}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left text-black dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Flag className="w-5 h-5" />
                      <span className="text-[16px] font-semibold">{t('report_conversation', 'Report Conversation')}</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            /* -------------------- CHAT THREAD SCREEN -------------------- */
            <>
              {/* Borderless Sticky Chat Header with Screen-Centered Recipient Identity */}
              <header className="shrink-0 bg-white/95 dark:bg-black/95 backdrop-blur-2xl pt-safe">
                <div className="relative h-14 px-2 flex items-center justify-between">
                  {/* Far Left: Arrow + Back Text */}
                  <button
                    id="chat-screen-back-btn"
                    type="button"
                    onClick={onBackToList}
                    aria-label={t('back', 'Back')}
                    className="relative z-10 min-w-[44px] min-h-[44px] inline-flex items-center gap-0.5 pr-1 text-[#007AFF] hover:opacity-70 transition-opacity cursor-pointer ios-press shrink-0"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                    <span className="text-[17px] leading-none">{t('back', 'Back')}</span>
                  </button>

                  {/* Visually Screen-Centered Recipient Group */}
                  <div
                    id="chat-header-centered-identity"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[calc(100%-164px)] flex items-center justify-center gap-2.5 pointer-events-auto"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isGroup) {
                          setIsDetailsOpen(true);
                        } else if (partner) {
                          handleOpenUserProfile(partner);
                        }
                      }}
                      aria-label={isGroup ? `Open ${displayName} details` : `Open ${displayName} profile`}
                      className="shrink-0 cursor-pointer ios-press"
                    >
                      <Avatar
                        src={partner?.avatar}
                        name={displayName}
                        size="sm"
                        className="w-8 h-8"
                        isOnline={Boolean(!isGroup && partner?.isOnline && !isCurrentBlocked)}
                      />
                    </button>

                    <button
                      id="chat-topbar-profile-btn"
                      type="button"
                      onClick={() => {
                        if (isGroup) {
                          setIsDetailsOpen(true);
                        } else if (partner) {
                          handleOpenUserProfile(partner);
                        } else {
                          setIsDetailsOpen(true);
                        }
                      }}
                      className="flex flex-col items-start min-w-0 text-left cursor-pointer ios-press"
                    >
                      <div className="flex items-center gap-1 min-w-0 max-w-full">
                        <span className="text-[15px] font-semibold leading-tight truncate">
                          {displayName}
                        </span>
                        {!isGroup && partner?.isVerified && (
                          <VerifiedBadge size={14} className="shrink-0" />
                        )}
                      </div>
                      <p
                        className={`text-[12px] leading-tight truncate max-w-full flex items-center gap-1 ${
                          isCurrentBlocked
                            ? 'text-black dark:text-white font-medium'
                            : isOtherUserTyping
                            ? 'text-[#007AFF] font-medium'
                            : 'text-[#8E8E93]'
                        }`}
                      >
                        {isCurrentBlocked ? (
                          <span>{t('blocked', 'Blocked')}</span>
                        ) : isOtherUserTyping ? (
                          <span>{t('typing', 'Typing...')}</span>
                        ) : isCurrentMuted ? (
                          <span>{t('muted', 'Muted')}</span>
                        ) : isGroup ? (
                          <span>{activeConversation.participants.length} members</span>
                        ) : (
                          <span>@{partner?.username || 'creator'}</span>
                        )}
                        {currentDisappearing !== 'off' ? ` · ${currentDisappearing}` : ''}
                      </p>
                    </button>
                  </div>

                  {/* Far Right: Hamburger Menu */}
                  <button
                    id="chat-topbar-tiktok-menu-btn"
                    type="button"
                    onClick={() => setIsDetailsOpen(true)}
                    aria-label={t('details', 'Details')}
                    className="relative z-10 min-w-[44px] min-h-[44px] -mr-1 inline-flex items-center justify-center text-[#007AFF] hover:opacity-70 transition-opacity cursor-pointer ios-press shrink-0"
                  >
                    <Menu className="w-[22px] h-[22px] stroke-[1.85]" />
                  </button>
                </div>

                {/* Pending Message Request Action Banner */}
                {activeConversation.isRequest && activeConversation.requestStatus !== 'accepted' && (
                  <div className="px-4 py-2.5 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[#8E8E93] truncate">
                      {t('message_request_from', 'Message request from')} {displayName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRequestAction?.(activeConversation.id, 'accept')}
                        className="px-3 py-1 rounded-lg bg-[#007AFF] text-white text-[12px] font-semibold cursor-pointer ios-press"
                      >
                        {t('accept', 'Accept')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestAction?.(activeConversation.id, 'decline')}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#2C2C2E] text-black dark:text-white text-[12px] font-medium cursor-pointer ios-press"
                      >
                        {t('delete', 'Delete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestAction?.(activeConversation.id, 'block')}
                        className="px-2 py-1 text-[12px] font-medium text-[#8E8E93] cursor-pointer"
                      >
                        {t('block', 'Block')}
                      </button>
                    </div>
                  </div>
                )}
              </header>

              {/* Messages Stream */}
              <div
                ref={messagesStreamRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                  setShowScrollBottomBtn(distFromBottom > 180);
                }}
                className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] px-3.5 py-3 relative"
              >
                <div className="min-h-full flex flex-col justify-end space-y-2">
                {(activeConversation.messages || []).length === 0 ? (
                  <div className="my-auto py-8">
                    <EmptyState
                      icon={<MessageCircle className="w-7 h-7" />}
                      title={`${t('say_hello', 'Say hello')} · ${displayName}`}
                      description={t('start_conversation_prompt', 'Send a message to start the conversation.')}
                    />
                  </div>
                ) : (
                  (() => {
                    const msgs = activeConversation.messages || [];
                    let lastOutgoingIndex = -1;
                    for (let i = msgs.length - 1; i >= 0; i--) {
                      if (msgs[i].senderId === currentUser.id) {
                        lastOutgoingIndex = i;
                        break;
                      }
                    }

                    return msgs.map((msg, idx) => {
                      const isMine = msg.senderId === currentUser.id;
                      const transKey = `${msg.id}:${language}`;
                      const translationState = translationMap[transKey];
                      const isTranslating = Boolean(translatingIds[transKey]);
                      const hasTranslation = Boolean(translationState?.translatedText);
                      const isTranslationVisible = Boolean(translationState?.isVisible && hasTranslation);
                      const isLastOutgoing = isMine && idx === lastOutgoingIndex;

                      const selectedStyle = msg.bubbleStyle || 'default';
                      const msgBubbleDef = getBubbleStyle(selectedStyle);
                      const isCustomBubble = selectedStyle !== 'default';
                      const outgoingBubbleClass = isCustomBubble
                        ? `${msgBubbleDef.bubbleClass} rounded-br-[5px]`
                        : `${activeThemeConfig.gradient} text-white rounded-[18px] rounded-br-[5px]`;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          {msg.storyReply && (
                            <div
                              className={`mb-1 max-w-[72%] flex items-center gap-2 p-2 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] ${
                                isMine ? 'self-end' : 'self-start'
                              }`}
                            >
                              {msg.storyReply.thumbnailUrl ? (
                                <img
                                  src={msg.storyReply.thumbnailUrl}
                                  alt="Story"
                                  className="w-9 h-12 rounded-lg object-cover shrink-0 bg-black/10"
                                />
                              ) : null}
                              <div className="min-w-0 pr-1">
                                <p className="text-[11px] font-medium text-[#8E8E93] truncate">
                                  {msg.storyReply.authorName}
                                </p>
                                {msg.storyReply.storyCaption && (
                                  <p className="text-[12px] text-black/80 dark:text-white/80 truncate mt-0.5">
                                    <EmojiText text={msg.storyReply.storyCaption} emojiSize={13} />
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {msg.replyTo && (
                            <div
                              className={`flex flex-col mb-1 max-w-[74%] ${
                                isMine ? 'items-end' : 'items-start'
                              }`}
                            >
                              <span className="text-[11px] text-[#8E8E93] px-1 mb-0.5">
                                {isMine ? t('you_replied', 'You replied') : `${msg.senderName} ${t('replied', 'replied')}`}
                              </span>
                              <div className="px-3 py-1.5 rounded-[14px] bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] text-[12.5px]">
                                <p className="line-clamp-2">
                                  <EmojiText text={msg.replyTo.text} emojiSize={13} />
                                </p>
                              </div>
                            </div>
                          )}

                          {!isMine && isGroup && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenUserProfile({
                                  id: msg.senderId,
                                  name: msg.senderName,
                                  username: msg.senderUsername,
                                  avatar: msg.senderAvatar,
                                })
                              }
                              className="inline-flex items-center gap-1.5 mb-1 px-1 cursor-pointer bg-transparent border-0 text-left"
                            >
                              <Avatar src={msg.senderAvatar} name={msg.senderName} size="xs" />
                              <span className="text-[12px] font-semibold text-[#8E8E93] hover:underline">
                                {msg.senderName}
                              </span>
                            </button>
                          )}

                          <div className="max-w-[74%] flex flex-col">
                            <div
                              onTouchStart={(e) => {
                                const touch = e.touches[0];
                                startLongPress(msg, touch?.clientX, touch?.clientY, e.currentTarget, isMine);
                              }}
                              onTouchMove={(e) => {
                                const touch = e.touches[0];
                                handleLongPressMove(touch?.clientX, touch?.clientY);
                              }}
                              onTouchEnd={cancelLongPress}
                              onTouchCancel={cancelLongPress}
                              onMouseDown={(e) => startLongPress(msg, e.clientX, e.clientY, e.currentTarget, isMine)}
                              onMouseMove={(e) => handleLongPressMove(e.clientX, e.clientY)}
                              onMouseUp={cancelLongPress}
                              onMouseLeave={cancelLongPress}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                openMessageMenu(msg, isMine, e.currentTarget);
                              }}
                              className={`px-3.5 py-2 text-[15px] leading-[1.38] break-words select-none relative transition-transform duration-150 ${
                                selectedMenuMessage?.id === msg.id ? 'scale-[0.98]' : ''
                              } ${
                                isMine
                                  ? outgoingBubbleClass
                                  : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white rounded-[18px] rounded-bl-[5px]'
                              }`}
                            >
                              {isMine && isCustomBubble && msgBubbleDef.renderCharacter('chat')}
                              <p className={isMine && isCustomBubble ? msgBubbleDef.textClass : ''}>
                                <EmojiText text={msg.text} emojiSize={17} />
                              </p>

                              {isTranslating && (
                                <div
                                  className={`mt-1.5 pt-1.5 border-t flex items-center gap-1.5 text-[12px] opacity-80 ${
                                    isMine
                                      ? 'border-white/20'
                                      : 'border-black/10 dark:border-white/10'
                                  }`}
                                >
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>{t('translating', 'Translating...')}</span>
                                </div>
                              )}

                              {!isTranslating && isTranslationVisible && translationState?.translatedText && (
                                <div
                                  className={`mt-1.5 pt-1.5 border-t text-[13.5px] leading-[1.38] opacity-95 ${
                                    isMine
                                      ? 'border-white/20'
                                      : 'border-black/10 dark:border-white/10'
                                  } ${isMine && isCustomBubble ? msgBubbleDef.textClass : ''}`}
                                >
                                  <EmojiText text={translationState.translatedText} emojiSize={16} />
                                </div>
                              )}
                            </div>

                            {hasTranslation && !isTranslating && (
                              <button
                                type="button"
                                onClick={() =>
                                  setTranslationMap((prev) => ({
                                    ...prev,
                                    [transKey]: {
                                      ...prev[transKey],
                                      isVisible: !prev[transKey]?.isVisible,
                                    },
                                  }))
                                }
                                className={`mt-1 px-1 text-[11px] font-medium text-[#8E8E93] hover:text-[#007AFF] cursor-pointer ${
                                  isMine ? 'self-end' : 'self-start'
                                }`}
                              >
                                {isTranslationVisible
                                  ? t('hide_translation', 'Hide translation')
                                  : t('show_translation', 'Show translation')}
                              </button>
                            )}

                            {/* Reactions */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div
                                className={`flex items-center gap-1 -mt-1.5 z-10 ${
                                  isMine ? 'justify-end pr-2' : 'justify-start pl-2'
                                }`}
                              >
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-[#2C2C2E] shadow-sm">
                                  {Object.entries(msg.reactions).map(([uId, emoji]) => (
                                    <AppleEmoji key={uId} char={emoji} size={14} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Minimal Neutral Grey Sent / Seen Label on Latest Outgoing Message Only */}
                            {isLastOutgoing && (
                              <div className="flex items-center justify-end mt-1 px-1 text-[11px] text-[#8E8E93]">
                                <span>
                                  {!activeConversation.isRequest && msg.status === 'read' && readReceipts
                                    ? t('seen', 'Seen')
                                    : t('sent', 'Sent')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[18px] rounded-bl-[5px] bg-[#F2F2F7] dark:bg-[#1C1C1E] self-start"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce [animation-delay:-0.32s]" />
                      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce [animation-delay:-0.16s]" />
                      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
                </div>
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
                    aria-label={t('scroll_to_latest', 'Scroll to latest message')}
                    className="absolute right-4 bottom-24 z-20 w-10 h-10 rounded-full bg-white dark:bg-[#2C2C2E] shadow-md flex items-center justify-center text-[#007AFF] cursor-pointer ios-press"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Reply Context Strip */}
              {replyingMessage && (
                <div className="px-4 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-[3px] h-7 rounded-full bg-[#007AFF] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[#007AFF] truncate">
                        {t('replying_to', 'Replying to')} {replyingMessage.senderName}
                      </p>
                      <p className="text-[13px] text-[#8E8E93] truncate">
                        <EmojiText text={replyingMessage.text} emojiSize={14} />
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingMessage(null)}
                    aria-label={t('cancel', 'Cancel')}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer ios-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Keyboard-Safe Sticky Composer Bar */}
              <div
                id="chat-input-bar-container"
                style={{ paddingBottom: viewportBottomInset > 0 ? `${viewportBottomInset + 8}px` : undefined }}
                className="px-3 py-2 pb-safe bg-white/95 dark:bg-black/95 backdrop-blur-xl shrink-0"
              >
                {isCurrentBlocked ? (
                  <div className="px-4 py-2 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Ban className="w-4 h-4 text-black dark:text-white shrink-0" />
                      <span className="text-[14px] font-medium text-black dark:text-white truncate">
                        {t('you_blocked', 'You blocked')} {displayName}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setBlockedConvs((prev) => ({ ...prev, [activeConvId]: false }));
                        if (partner?.id) onToggleBlockUser?.(partner.id, false);
                        showToast(t('account_unblocked', 'Account unblocked'), { type: 'success' });
                      }}
                    >
                      {t('unblock', 'Unblock')}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEmojiPickerTarget('composer');
                        setShowEmojiPicker(true);
                      }}
                      aria-label={t('insert_emoji', 'Insert emoji')}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#007AFF] cursor-pointer ios-press shrink-0"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <div
                      id="chat-input-pill"
                      className="flex-1 flex items-center min-h-[40px] rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-[#007AFF]/25 transition-all"
                    >
                      <input
                        id="chat-message-input"
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onFocus={() => {
                          setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
                          }, 120);
                        }}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={t('message_placeholder', 'Message...')}
                        className="flex-1 bg-transparent border-0 outline-none text-[16px] text-black dark:text-white placeholder:text-[#8E8E93] py-1.5 pr-2"
                      />

                      <button
                        type="submit"
                        disabled={!inputText.trim()}
                        aria-label={t('send_message', 'Send message')}
                        className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 text-white transition-opacity cursor-pointer ios-press disabled:opacity-35 ${activeThemeConfig.gradient}`}
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
        title={t('new_message', 'New Message')}
      >
        <div className="px-4 py-3 space-y-4">
          <SearchBar
            value={composeSearch}
            onChange={setComposeSearch}
            placeholder={t('search_people_hint', 'Search people by name or @username')}
            autoFocus
          />

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label={t('or_message_by_username', 'Or message by username')}
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
                  avatar: '',
                });
              }}
            >
              {t('chat', 'Chat')}
            </Button>
          </div>

          <div>
            <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider mb-2">
              {t('suggested_creators', 'Suggested Creators')}
            </p>
            {composeCandidates.length === 0 ? (
              <EmptyState
                icon={<UserPlus className="w-6 h-6" />}
                title={t('no_matching_people', 'No Matching People')}
                description=""
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

      {/* ==================== INSTAGRAM-STYLE FLOATING MESSAGE CONTEXT MENU ==================== */}
      <AnimatePresence>
        {selectedMenuMessage && activeConversation && !showEmojiPicker && (() => {
          const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
          const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
          const fallbackAnchor: MessageMenuAnchor = menuAnchor || {
            top: vh * 0.42,
            left: selectedMenuMessage.senderId === currentUser.id ? vw * 0.45 : 16,
            right: selectedMenuMessage.senderId === currentUser.id ? vw - 16 : vw * 0.58,
            bottom: vh * 0.48,
            width: vw * 0.4,
            height: 44,
            isMine: selectedMenuMessage.senderId === currentUser.id,
          };
          const layout = computeFloatingMessageMenuLayout(
            fallbackAnchor,
            vw,
            vh,
            showMoreMenuActions
          );
          const isOwnMsg = selectedMenuMessage.senderId === currentUser.id;
          const translationState = translationMap[`${selectedMenuMessage.id}:${language}`];
          const translateLabel = translationState?.translatedText
            ? translationState.isVisible
              ? t('hide_translation', 'Hide translation')
              : t('show_translation', 'Show translation')
            : t('translate', 'Translate');

          return (
            <motion.div
              key="instagram-message-context-overlay"
              data-testid="message-context-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              onClick={closeMessageMenu}
              className="fixed inset-0 z-50 bg-black/20 dark:bg-black/45 backdrop-blur-[2px]"
            >
              {/* Floating Reaction Bar Pill (above contextual menu) */}
              <motion.div
                data-testid="message-reaction-bar"
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 4 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: layout.reactionBarTop,
                  left: layout.reactionBarLeft,
                  width: layout.reactionBarWidth,
                }}
                className="rounded-full bg-white dark:bg-[#262628] shadow-[0_8px_28px_rgba(0,0,0,0.14)] px-2.5 py-1.5 flex items-center justify-between"
              >
                {quickReactions.slice(0, 6).map((emoji) => {
                  const isSelected = selectedMenuMessage.reactions?.[currentUser.id] === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        onReactMessage(activeConversation.id, selectedMenuMessage.id, emoji);
                        closeMessageMenu();
                      }}
                      aria-label={emoji}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-115 active:scale-95 cursor-pointer ${
                        isSelected ? 'bg-[#007AFF]/12 dark:bg-[#007AFF]/25' : ''
                      }`}
                    >
                      <AppleEmoji char={emoji} size={22} />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setEmojiPickerTarget('reaction');
                    setShowEmojiPicker(true);
                  }}
                  aria-label={t('choose_emoji', 'Choose Emoji')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer active:scale-95 transition-colors"
                >
                  <Plus className="w-[18px] h-[18px]" strokeWidth={2.2} />
                </button>
              </motion.div>

              {/* Floating Compact Contextual Action Menu */}
              <motion.div
                data-testid="message-action-menu"
                initial={{ opacity: 0, scale: 0.94, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: layout.menuTop,
                  left: layout.menuLeft,
                  width: layout.menuWidth,
                }}
                className="rounded-[24px] bg-white dark:bg-[#262628] shadow-[0_12px_36px_rgba(0,0,0,0.16)] overflow-hidden text-black dark:text-white"
              >
                {!showMoreMenuActions ? (
                  <div className="py-1.5">
                    {selectedMenuMessage.timestamp > 0 && (
                      <div className="px-4 pt-1.5 pb-1 text-[11px] font-medium text-[#8E8E93] tracking-tight">
                        {formatLocalizedTime(selectedMenuMessage.timestamp, language)}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReplyingMessage(selectedMenuMessage);
                        closeMessageMenu();
                        inputRef.current?.focus();
                      }}
                      className="w-full px-4 py-[9px] flex items-center gap-3 text-[15px] leading-tight text-left cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <Reply className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="truncate">{t('reply', 'Reply')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmojiPickerTarget('reaction');
                        setShowEmojiPicker(true);
                      }}
                      className="w-full px-4 py-[9px] flex items-center gap-3 text-[15px] leading-tight text-left cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <SmilePlus className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="truncate">{t('add_sticker', 'Add sticker')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onForwardMessage) onForwardMessage(selectedMenuMessage);
                        closeMessageMenu();
                      }}
                      className="w-full px-4 py-[9px] flex items-center gap-3 text-[15px] leading-tight text-left cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <Send className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="truncate">{t('forward', 'Forward')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(selectedMenuMessage.text)}
                      className="w-full px-4 py-[9px] flex items-center gap-3 text-[15px] leading-tight text-left cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <Copy className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="truncate">{t('copy', 'Copy')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTranslate(selectedMenuMessage)}
                      className="w-full px-4 py-[9px] flex items-center gap-3 text-[15px] leading-tight text-left cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <Languages className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="truncate">{translateLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReportTargetType('message');
                        setReportTargetId(selectedMenuMessage.id);
                        closeMessageMenu();
                        setIsReportSheetOpen(true);
                      }}
                      className="w-full px-4 py-[9px] flex items-center gap-3 text-[15px] leading-tight text-left text-[#FF3B30] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <AlertCircle className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="truncate">{t('report', 'Report')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMoreMenuActions(true)}
                      className="w-full px-4 py-[9px] flex items-center justify-between text-[15px] leading-tight text-left cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <MoreHorizontal className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                        <span className="truncate">{t('more', 'More')}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#8E8E93] shrink-0" />
                    </button>
                  </div>
                ) : (
                  <div className="py-1.5">
                    <button
                      type="button"
                      onClick={() => setShowMoreMenuActions(false)}
                      className="w-full px-3.5 py-2 flex items-center gap-2 text-[14px] font-medium text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer border-b border-black/[0.06] dark:border-white/[0.08]"
                    >
                      <ChevronLeft className="w-4 h-4 shrink-0" />
                      <span>{t('back', 'Back')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingDeleteMessage(selectedMenuMessage);
                        setDeleteForEveryoneChecked(false);
                        closeMessageMenu();
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-[15px] leading-tight text-left text-[#FF3B30] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07] dark:active:bg-white/[0.09] transition-colors"
                    >
                      <Trash2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="truncate">{t('delete', 'Delete')}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ==================== EMOJI PICKER MODAL ==================== */}
      <InstagramEmojiPickerModal
        isOpen={showEmojiPicker}
        theme={currentUser.theme === 'light' ? 'light' : 'dark'}
        onClose={() => {
          setShowEmojiPicker(false);
          if (emojiPickerTarget === 'reaction') closeMessageMenu();
        }}
        onSelectReaction={(emoji) => {
          if (emojiPickerTarget === 'reaction' && selectedMenuMessage && activeConversation) {
            triggerHaptic('medium');
            onReactMessage(activeConversation.id, selectedMenuMessage.id, emoji);
          } else {
            setInputText((prev) => prev + emoji);
          }
          setShowEmojiPicker(false);
          closeMessageMenu();
        }}
        onQuickReactionsChange={(next) => setQuickReactions(next)}
      />

      {/* ==================== THEME PICKER SHEET ==================== */}
      <BottomSheet
        isOpen={isThemeSheetOpen}
        onClose={() => setIsThemeSheetOpen(false)}
        title={t('chat_theme', 'Chat Theme')}
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
                  showToast(`${t('chat_theme', 'Chat Theme')}: ${cfg.name}`, { type: 'success', durationMs: 1800 });
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
          showToast(t('status_updated', 'Saved successfully'), { type: 'success', durationMs: 1800 });
        }}
      />

      {/* ==================== CHAT CONTROLS & DISAPPEARING MESSAGES ==================== */}
      <BottomSheet
        isOpen={isChatControlsOpen}
        onClose={() => setIsChatControlsOpen(false)}
        title={t('chat_controls', 'Chat Controls')}
      >
        <div className="px-4 py-3 space-y-5">
          <div className="rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-[16px] font-medium">{t('read_receipts', 'Read Receipts')}</p>
                <p className="text-[13px] text-[#8E8E93]">
                  Show people when you have seen their messages.
                </p>
              </div>
              <Toggle
                checked={readReceipts}
                onChange={(val) => onUpdatePrivacy?.({ readReceiptsEnabled: val })}
                ariaLabel={t('read_receipts', 'Read Receipts')}
              />
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <div className="pr-3">
                <p className="text-[16px] font-medium">{t('typing_indicators', 'Typing Indicators')}</p>
                <p className="text-[13px] text-[#8E8E93]">
                  Show when you are actively typing.
                </p>
              </div>
              <Toggle
                checked={typingIndicatorsEnabled}
                onChange={(val) => onUpdatePrivacy?.({ typingIndicatorsEnabled: val })}
                ariaLabel={t('typing_indicators', 'Typing Indicators')}
              />
            </div>
          </div>

          <div>
            <p className="text-[15px] font-semibold mb-1">{t('disappearing_messages', 'Disappearing Messages')}</p>
            <p className="text-[13px] text-[#8E8E93] mb-3">
              New messages in this chat clear automatically after the selected timer.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['off', '24h', '7d', '90d'] as const).map((opt) => {
                const selected = currentDisappearing === opt;
                const label =
                  opt === 'off'
                    ? t('off', 'Off')
                    : opt === '24h'
                    ? t('hours_24', '24 hours')
                    : opt === '7d'
                    ? t('days_7', '7 days')
                    : t('days_90', '90 days');
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (!activeConvId) return;
                      setDisappearingByConv((prev) => ({ ...prev, [activeConvId]: opt }));
                      showToast(`${t('disappearing_messages', 'Disappearing Messages')}: ${label}`, {
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
        title={t('privacy_safety', 'Privacy & Safety')}
      >
        <div className="px-4 py-3 space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#007AFF]/12 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#007AFF] shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] font-semibold text-[#007AFF]">{t('privacy_moderation', 'Privacy & Moderation')}</p>
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
                if (isCurrentBlocked) {
                  setBlockedConvs((prev) => ({ ...prev, [activeConvId]: false }));
                  if (partner?.id) onToggleBlockUser?.(partner.id, false);
                  showToast(t('account_unblocked', 'Account unblocked'), { type: 'success' });
                } else {
                  setIsBlockDialogOpen(true);
                }
              }}
              className="w-full px-4 py-3.5 text-left text-[16px] text-black dark:text-white font-semibold cursor-pointer"
            >
              {isCurrentBlocked ? `${t('unblock', 'Unblock')} ${displayName}` : `${t('block', 'Block')} ${displayName}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setReportTargetType('conversation');
                setReportTargetId(activeConvId);
                setIsPrivacySheetOpen(false);
                setIsReportSheetOpen(true);
              }}
              className="w-full px-4 py-3.5 text-left text-[16px] text-black dark:text-white font-semibold cursor-pointer"
            >
              {t('report_conversation', 'Report Conversation')}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ==================== NICKNAME SHEET ==================== */}
      <BottomSheet
        isOpen={isNicknameSheetOpen}
        onClose={() => setIsNicknameSheetOpen(false)}
        title={t('nickname', 'Nickname')}
      >
        <div className="px-4 py-3 space-y-4">
          <TextField
            label={`${t('nickname', 'Nickname')} · ${partner?.name || ''}`}
            value={tempNickname}
            onChange={(e) => setTempNickname(e.target.value)}
            placeholder={partner?.name || t('set_name', 'Set name')}
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
                  showToast(t('nickname_cleared', 'Nickname cleared'), { type: 'info' });
                }}
              >
                {t('reset', 'Reset')}
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
                  showToast(t('nickname_saved', 'Nickname saved'), { type: 'success' });
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
              {t('save_nickname', 'Save Nickname')}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* ==================== CREATE GROUP SHEET ==================== */}
      <BottomSheet
        isOpen={isGroupCreateOpen}
        onClose={() => setIsGroupCreateOpen(false)}
        title={t('new_group_chat', 'New Group Chat')}
      >
        <div className="px-4 py-3 space-y-4">
          <TextField
            label={t('group_name', 'Group Name')}
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
              const title = newGroupName.trim() || 'Group Chat';
              if (onCreateGroupConversation) {
                onCreateGroupConversation(title, selectedGroupUsers);
                setIsGroupCreateOpen(false);
                setIsDetailsOpen(false);
                return;
              }
              const members = allConversations
                .map((c) => c.participants[0])
                .filter((p) => p && selectedGroupUsers.includes(p.id));
              const newGroup: SocialConversation = {
                id: `group-${Date.now()}`,
                type: 'group',
                title,
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
              showToast(`${title}`, { type: 'success' });
            }}
          >
            {t('create_group', 'Create Group')} ({selectedGroupUsers.length})
          </Button>
        </div>
      </BottomSheet>

      {/* ==================== REPORT CONVERSATION / MESSAGE SHEET ==================== */}
      <BottomSheet
        isOpen={isReportSheetOpen}
        onClose={() => setIsReportSheetOpen(false)}
        title={
          reportTargetType === 'message'
            ? t('report_message', 'Report Message')
            : t('report_conversation', 'Report Conversation')
        }
      >
        <div className="px-4 py-3 space-y-4">
          <p className="text-[15px] text-[#8E8E93]">
            Select a reason for submitting this report.
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
              onReportTarget?.(
                reportTargetType,
                reportTargetId || activeConvId,
                reportReason
              );
              setIsReportSheetOpen(false);
              showToast(t('report_submitted', 'Report submitted'), { type: 'success' });
            }}
          >
            {t('submit_report', 'Submit Report')}
          </Button>
        </div>
      </BottomSheet>

      {/* ==================== BLOCK CONFIRMATION DIALOG ==================== */}
      <Dialog
        isOpen={isBlockDialogOpen}
        onClose={() => setIsBlockDialogOpen(false)}
        title={`${t('block', 'Block')} ${displayName}?`}
        description="They will no longer be able to send you messages. You can unblock them anytime in conversation details."
        confirmLabel={t('block', 'Block')}
        destructive
        onConfirm={() => {
          if (activeConvId) {
            setBlockedConvs((prev) => ({ ...prev, [activeConvId]: true }));
            if (partner?.id) onToggleBlockUser?.(partner.id, true);
            showToast(`${displayName} · ${t('blocked', 'Blocked')}`, { type: 'info' });
          }
          setIsBlockDialogOpen(false);
        }}
      />

      {/* ==================== DELETE MESSAGE CONFIRMATION DIALOG ==================== */}
      <AnimatePresence>
        {pendingDeleteMessage && activeConversation && (
          <div
            data-testid="delete-message-dialog-backdrop"
            className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              onClick={closeDeleteDialog}
              className="absolute inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-[2px]"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-message-dialog-title"
              data-testid="delete-message-dialog"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-[328px] rounded-[22px] bg-white dark:bg-[#1C1C1E] shadow-[0_16px_48px_rgba(0,0,0,0.22)] p-5 text-left"
            >
              <h3
                id="delete-message-dialog-title"
                className="text-[18px] font-semibold text-black dark:text-white tracking-tight"
              >
                {t('delete_message', 'Delete message')}
              </h3>
              <p className="text-[14px] text-[#8E8E93] mt-1.5 leading-snug">
                {t(
                  'delete_message_confirm_text',
                  'Are you sure you want to delete this message?'
                )}
              </p>

              {deleteDialogConfig.canDeleteForEveryone && deleteDialogConfig.alsoDeleteLabel && (
                <label
                  htmlFor="delete-for-everyone-checkbox"
                  className="mt-4 flex items-center gap-3 py-1 cursor-pointer select-none"
                >
                  <input
                    id="delete-for-everyone-checkbox"
                    type="checkbox"
                    checked={deleteForEveryoneChecked}
                    onChange={(e) => setDeleteForEveryoneChecked(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0 transition-colors ${
                      deleteForEveryoneChecked
                        ? 'bg-[#007AFF] text-white'
                        : 'border-[1.75px] border-[#C7C7CC] dark:border-[#48484A] bg-transparent'
                    }`}
                  >
                    {deleteForEveryoneChecked && <Check className="w-3.5 h-3.5 stroke-[2.8]" />}
                  </span>
                  <span className="text-[14px] font-medium text-black dark:text-white leading-snug">
                    {deleteDialogConfig.alsoDeleteLabel}
                  </span>
                </label>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={isDeletingMessage}
                  className="px-3.5 py-2 rounded-xl text-[15px] font-medium text-[#007AFF] hover:bg-[#007AFF]/8 active:bg-[#007AFF]/12 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMessage}
                  disabled={isDeletingMessage}
                  className="px-3.5 py-2 rounded-xl text-[15px] font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 active:bg-[#FF3B30]/15 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeletingMessage ? t('deleting', 'Deleting...') : t('delete', 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              const fullCreator = creators.find((c) => c.id === target.id);
              return {
                ...fullCreator,
                ...target,
                id: target.id,
                name: target.name || fullCreator?.name || displayName,
                username: target.username || fullCreator?.username || 'creator',
                avatar: target.avatar || fullCreator?.avatar || '',
                isVerified: target.isVerified ?? fullCreator?.isVerified,
                isPremium: Boolean(target.isVerified ?? fullCreator?.isVerified),
                bio: (target as any).bio ?? fullCreator?.bio,
                followersCount: (target as any).followersCount ?? fullCreator?.followersCount ?? 0,
                followingCount: (target as any).followingCount ?? fullCreator?.followingCount ?? 0,
                postsCount: (target as any).postsCount ?? fullCreator?.postsCount ?? 0,
                likesCount: (target as any).likesCount ?? fullCreator?.likesCount ?? 0,
                storiesReadCount: (target as any).storiesReadCount ?? fullCreator?.storiesReadCount,
                achievementsCount: (target as any).achievementsCount ?? fullCreator?.achievementsCount,
              };
            })()}
            creators={creators}
            onOpenUserProfile={onOpenUserProfile}
            isFollowing={
              onToggleFollow
                ? (currentUser.followingIds || []).includes(
                    (inspectedUser || activeConversation!.participants[0]).id
                  )
                : followedUserIds.includes(
                    (inspectedUser || activeConversation!.participants[0]).id
                  )
            }
            onToggleFollow={(id) => {
              if (onToggleFollow) {
                onToggleFollow(id);
              } else {
                setFollowedUserIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                );
              }
            }}
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
