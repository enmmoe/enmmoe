import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  User,
  SocialPost,
  Story,
  StoryHighlight,
  StoryAudience,
  StoryReplyPermission,
  ShortVideo,
  SocialConversation,
  SocialMessage,
  NotificationItem,
  ReactionType,
} from './types';
import {
  CURRENT_USER,
  INITIAL_CREATORS,
  INITIAL_STORIES,
  INITIAL_HIGHLIGHTS,
  INITIAL_SOCIAL_POSTS,
  INITIAL_REELS,
  INITIAL_SOCIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
} from './data/socialMockData';
import { useLanguage } from './utils/i18n';

// Views
import { BottomNav } from './components/BottomNav';
import { HomeFeedView } from './components/HomeFeedView';
import { MessagesHubView } from './components/MessagesHubView';
import { DiscoverView } from './components/DiscoverView';
import { PulseView } from './components/PulseView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';

// Modals & Overlays
import { StoryViewerModal } from './components/StoryViewerModal';
import { StoryCreatorModal } from './components/StoryCreatorModal';
import { CreateModal } from './components/CreateModal';
import { CommentDrawer } from './components/CommentDrawer';
import { NotificationsModal } from './components/NotificationsModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ReportModal } from './components/ReportModal';
import { AuthModal } from './components/AuthModal';
import { ForwardModal } from './components/ForwardModal';
import { WebtoonReaderModal } from './components/WebtoonReaderModal';
import { EnmmoeIntro } from './components/EnmmoeIntro';
import { OfflineBanner, ToastProvider, useToast } from './components/ui';
import { socialApi } from './utils/socialSync';
import { resolvePublicUser } from './utils/profileResolver';
import {
  StoryAuthorGroup,
  groupStoriesByAuthor,
  pruneExpiredStoryCaches,
} from './utils/storyMedia';

import { ENMMOE_AVATARS } from './data/enmmoeAvatars';
import {
  ALL_WEBTOONS,
  getCanonicalWebtoonId,
  resolveWebtoonById,
} from './data/webtoonData';
import { NavigationProvider, useNavigation } from './navigation/NavigationContext';
import { AnimatePresence, motion } from 'motion/react';
import { safeStorage } from './utils/storage';
import {
  isWebtoonLiked,
  isWebtoonSubscribed,
  loadLikedEpisodes,
  loadLikedWebtoons,
  loadSubscribedWebtoons,
  saveLikedEpisodes,
  saveLikedWebtoons,
  saveSubscribedWebtoons,
  toggleEpisodeLike,
  toggleWebtoonLike,
  toggleWebtoonSubscription,
} from './utils/webtoonInteractions';

const USER_STORAGE_KEY = 'enmmoe_social_user_v1';
const LEGACY_USER_STORAGE_KEY = 'flirthubx_social_user_v3';
const LIGHT_MIGRATION_KEY = 'enmmoe_ios_light_default_v1';
const AVATAR_MIGRATION_KEY = 'enmmoe_avatar_v1';
const POSTS_STORAGE_KEY = 'enmmoe_social_posts_v1';
const LEGACY_POSTS_STORAGE_KEY = 'flirthubx_social_posts_v3';
const STORIES_STORAGE_KEY = 'enmmoe_social_stories_v1';
const LEGACY_STORIES_STORAGE_KEY = 'flirthubx_social_stories_v3';
const REELS_STORAGE_KEY = 'enmmoe_social_reels_v1';
const LEGACY_REELS_STORAGE_KEY = 'flirthubx_social_reels_v3';
const CONVS_STORAGE_KEY = 'enmmoe_social_convs_v1';
const LEGACY_CONVS_STORAGE_KEY = 'flirthubx_social_convs_v3';
const NOTIFS_STORAGE_KEY = 'enmmoe_social_notifs_v1';
const LEGACY_NOTIFS_STORAGE_KEY = 'flirthubx_social_notifs_v3';

function loadWithLegacy<T>(primaryKey: string, legacyKey: string, fallback: T): T {
  const existing = safeStorage.getJSON<T | null>(primaryKey, null);
  if (existing !== null) return existing;
  return safeStorage.getJSON<T>(legacyKey, fallback);
}

function AppContent() {
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();
  const {
    currentRoute,
    canGoBack,
    activeTab: navActiveTab,
    openHome,
    openDiscover,
    openPulse,
    openMessages,
    openProfile,
    openBook,
    openChapter,
    openSettings,
    goBack,
  } = useNavigation();

  // Online / Offline Connectivity State
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast(t('back_online', 'Back online'), { type: 'success', durationMs: 2000 });
    };
    const handleOffline = () => {
      setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast, t]);

  // Webtoon Subscriptions (persisted independently, keyed by canonical series ID)
  const [subscribedWebtoons, setSubscribedWebtoons] = useState<Record<string, boolean>>(
    loadSubscribedWebtoons
  );

  // Webtoon & Episode Likes (persisted independently, never coupled to subscriptions)
  const [likedWebtoons, setLikedWebtoons] = useState<Record<string, boolean>>(
    loadLikedWebtoons
  );
  const [likedEpisodes, setLikedEpisodes] = useState<Record<string, boolean>>(
    loadLikedEpisodes
  );

  const [discoverSearchTagTrigger, setDiscoverSearchTagTrigger] = useState<{
    query: string;
    nonce: number;
  } | null>(null);

  const handleToggleSubscribeWebtoon = (webtoonId: string) => {
    setSubscribedWebtoons((prev) => toggleWebtoonSubscription(prev, webtoonId).nextMap);
  };

  const handleToggleLikeWebtoon = (webtoonId: string) => {
    setLikedWebtoons((prev) => toggleWebtoonLike(prev, webtoonId).nextMap);
  };

  const handleToggleEpisodeLike = (episodeId: string) => {
    setLikedEpisodes((prev) => toggleEpisodeLike(prev, episodeId).nextMap);
  };

  const handleSelectSeriesTag = (tag: string) => {
    setDiscoverSearchTagTrigger({ query: tag, nonce: Date.now() });
    openDiscover();
  };

  // User State (with one-time migration to crisp white iOS default theme & enmmoe default avatar)
  const [user, setUser] = useState<User>(() => {
    let loaded = loadWithLegacy<User>(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY, CURRENT_USER);
    if (!safeStorage.getItem(LIGHT_MIGRATION_KEY)) {
      safeStorage.setItem(LIGHT_MIGRATION_KEY, '1');
      loaded = { ...loaded, theme: 'light' };
    }
    if (!safeStorage.getItem(AVATAR_MIGRATION_KEY)) {
      safeStorage.setItem(AVATAR_MIGRATION_KEY, '1');
      const isLegacyUnsplash =
        !loaded.avatar || loaded.avatar.includes('images.unsplash.com/photo-1534528741775');
      if (isLegacyUnsplash) {
        loaded = { ...loaded, avatar: ENMMOE_AVATARS[0].src };
      }
    }
    return loaded;
  });

  // Social Data States
  const [posts, setPosts] = useState<SocialPost[]>(() =>
    loadWithLegacy<SocialPost[]>(POSTS_STORAGE_KEY, LEGACY_POSTS_STORAGE_KEY, INITIAL_SOCIAL_POSTS)
  );
  const [stories, setStories] = useState<Story[]>(() =>
    loadWithLegacy<Story[]>(STORIES_STORAGE_KEY, LEGACY_STORIES_STORAGE_KEY, INITIAL_STORIES)
  );
  const [reels, setReels] = useState<ShortVideo[]>(() =>
    loadWithLegacy<ShortVideo[]>(REELS_STORAGE_KEY, LEGACY_REELS_STORAGE_KEY, INITIAL_REELS)
  );
  const [conversations, setConversations] = useState<SocialConversation[]>(() => {
    const loaded = loadWithLegacy<SocialConversation[]>(
      CONVS_STORAGE_KEY,
      LEGACY_CONVS_STORAGE_KEY,
      INITIAL_SOCIAL_CONVERSATIONS
    );
    if (Array.isArray(loaded)) {
      return loaded.map((c) => ({
        ...c,
        messages: Array.isArray(c.messages) ? c.messages : [],
        participants: Array.isArray(c.participants) ? c.participants : [],
      }));
    }
    return INITIAL_SOCIAL_CONVERSATIONS;
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const loaded = loadWithLegacy<NotificationItem[]>(
      NOTIFS_STORAGE_KEY,
      LEGACY_NOTIFS_STORAGE_KEY,
      INITIAL_NOTIFICATIONS
    );
    const list = Array.isArray(loaded) ? loaded : INITIAL_NOTIFICATIONS;
    const deduped = Array.from(new Map(list.map((n) => [n.id, n])).values());
    return deduped.map((n) =>
      n.text === 'started following you.' ? { ...n, text: 'subscribed to you.' } : n
    );
  });

  const [isNotifsMuted, setIsNotifsMuted] = useState<boolean>(
    () => safeStorage.getItem('enmmoe_mute_notifs') === 'true'
  );

  useEffect(() => {
    const syncMuteFlag = () => {
      setIsNotifsMuted(safeStorage.getItem('enmmoe_mute_notifs') === 'true');
    };
    window.addEventListener('enmmoe:notif-prefs-changed', syncMuteFlag);
    window.addEventListener('storage', syncMuteFlag);
    return () => {
      window.removeEventListener('enmmoe:notif-prefs-changed', syncMuteFlag);
      window.removeEventListener('storage', syncMuteFlag);
    };
  }, []);

  // Keep user's preferredLanguage silently synced with LanguageProvider (no notification on switch)
  const restoredPrefLangRef = useRef(false);
  useEffect(() => {
    if (!restoredPrefLangRef.current) {
      restoredPrefLangRef.current = true;
      const storedLang = safeStorage.getItem('enmmoe_language');
      if (!storedLang && user.preferredLanguage && user.preferredLanguage !== language) {
        setLanguage(user.preferredLanguage as any);
        return;
      }
    }
    setUser((prev) =>
      prev.preferredLanguage === language ? prev : { ...prev, preferredLanguage: language }
    );
  }, [language]);

  const [creators, setCreators] = useState<User[]>(INITIAL_CREATORS);
  const [activeConversationId, setActiveConversationId] = useState<string>('');

  // Keep activeConversationId synchronized with route changes (fixes browser/in-app back from chat)
  useEffect(() => {
    if (currentRoute.type === 'messages') {
      setActiveConversationId(currentRoute.conversationId || '');
    }
  }, [currentRoute]);

  // Preserve scroll positions across tab switches (prevent display:none scroll reset)
  const homeScrollRef = React.useRef<HTMLDivElement>(null);
  const discoverScrollRef = React.useRef<HTMLDivElement>(null);
  const pulseScrollRef = React.useRef<HTMLDivElement>(null);
  const profileScrollRef = React.useRef<HTMLDivElement>(null);
  const tabScrollTopRef = React.useRef<{ home: number; discover: number; pulse: number; profile: number }>({
    home: 0,
    discover: 0,
    pulse: 0,
    profile: 0,
  });

  // Modals, Stories, Highlights & Real-Time State
  const [archiveStories, setArchiveStories] = useState<Story[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>(INITIAL_HIGHLIGHTS);
  const [activeStoryAuthorId, setActiveStoryAuthorId] = useState<string | null>(null);
  const [activeStoryInitialSlide, setActiveStoryInitialSlide] = useState<number>(0);
  const [activeHighlightPlayback, setActiveHighlightPlayback] = useState<{
    highlight: StoryHighlight;
    stories: Story[];
  } | null>(null);
  const [showStoryCreatorModal, setShowStoryCreatorModal] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [reportingTargetId, setReportingTargetId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<SocialMessage | null>(null);
  const [storyToShare, setStoryToShare] = useState<Story | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const activeConvIdRef = useRef<string>('');
  const userRef = useRef<User>(user);
  const typingClearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const hydrateFromServer = useCallback(async (targetUserId: string) => {
    try {
      const data = await socialApi.bootstrap(targetUserId);
      if (!data.success) return;

      const onlineSet = new Set(data.onlineUserIds || []);
      const currentAvatar = userRef.current.avatar;

      setCreators((prev) =>
        prev.map((c) => ({
          ...c,
          isOnline: onlineSet.has(c.id),
        }))
      );

      if (Array.isArray(data.conversations)) {
        setConversations(
          data.conversations.map((conv) => ({
            ...conv,
            messages: (conv.messages || []).map((m) =>
              m.senderId === targetUserId && !m.senderAvatar && currentAvatar
                ? { ...m, senderAvatar: currentAvatar }
                : m
            ),
          }))
        );
      }

      if (Array.isArray(data.stories)) {
        setStories(
          data.stories.map((st) =>
            st.authorId === targetUserId && !st.authorAvatar && currentAvatar
              ? { ...st, authorAvatar: currentAvatar }
              : st
          )
        );
      }

      if (Array.isArray(data.archiveStories)) {
        setArchiveStories(
          data.archiveStories.map((st) =>
            st.authorId === targetUserId && !st.authorAvatar && currentAvatar
              ? { ...st, authorAvatar: currentAvatar }
              : st
          )
        );
      }

      if (Array.isArray(data.highlights)) {
        setHighlights(data.highlights);
      }
    } catch {
      // Offline or cold start: keep cached storage state seamlessly
    }
  }, []);

  // Bootstrap social & real-time state on mount / user change
  useEffect(() => {
    pruneExpiredStoryCaches(stories.map((s) => s.id));
    let cancelled = false;

    (async () => {
      try {
        await socialApi.updatePrivacy(user.id, {
          showActivityStatus: user.showActivityStatus !== false,
          readReceiptsEnabled: user.readReceiptsEnabled !== false,
          typingIndicatorsEnabled: user.typingIndicatorsEnabled !== false,
          allowMessagesFrom: user.allowMessagesFrom || 'everyone',
          storyDefaultAudience: user.storyDefaultAudience || 'everyone',
          storyReplyPermission: user.storyReplyPermission || 'everyone',
          saveStoriesToArchive: user.saveStoriesToArchive !== false,
          closeFriendIds: user.closeFriendIds || [],
          mutedStoryAuthorIds: user.mutedStoryAuthorIds || [],
          blockedUserIds: user.blockedUserIds || [],
          followingIds: user.followingIds || [],
        });
      } catch {}
      if (!cancelled) {
        await hydrateFromServer(user.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id, hydrateFromServer]);

  // Persistent WebSocket Connection for Presence, Typing, Messages, Read Receipts & Live Stories
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let unmounted = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const sendIdentify = (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const u = userRef.current;
      ws.send(
        JSON.stringify({
          type: 'social:identify',
          userId: u.id,
          showActivityStatus: u.showActivityStatus !== false,
          readReceiptsEnabled: u.readReceiptsEnabled !== false,
          typingIndicatorsEnabled: u.typingIndicatorsEnabled !== false,
        })
      );
    };

    const connect = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);
      wsRef.current = ws;

      ws.onopen = () => {
        sendIdentify(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data || '{}'));
          const me = userRef.current;

          if (data.type === 'dm:presence' && Array.isArray(data.onlineUserIds)) {
            const onlineSet = new Set<string>(data.onlineUserIds);
            const blocked = new Set<string>(me.blockedUserIds || []);
            setCreators((prev) =>
              prev.map((c) => ({
                ...c,
                isOnline: !blocked.has(c.id) && onlineSet.has(c.id),
              }))
            );
            setConversations((prev) =>
              prev.map((c) => ({
                ...c,
                participants: (c.participants || []).map((p) => ({
                  ...p,
                  isOnline: !blocked.has(p.id) && onlineSet.has(p.id),
                })),
              }))
            );
            return;
          }

          if (data.type === 'dm:typing' && data.conversationId) {
            if (data.userId === me.id) return;
            if ((me.blockedUserIds || []).includes(data.userId)) return;
            const convId = String(data.conversationId);
            if (typingClearTimersRef.current[convId]) {
              clearTimeout(typingClearTimersRef.current[convId]);
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      isTyping: Boolean(data.isTyping),
                      typingUserId: data.isTyping ? data.userId : undefined,
                      typingUserName: data.isTyping ? data.userName : undefined,
                    }
                  : c
              )
            );
            if (data.isTyping) {
              typingClearTimersRef.current[convId] = setTimeout(() => {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId && c.typingUserId === data.userId
                      ? { ...c, isTyping: false, typingUserId: undefined, typingUserName: undefined }
                      : c
                  )
                );
              }, 5000);
            }
            return;
          }

          if (data.type === 'dm:message' && data.conversationId && data.message) {
            const incomingMsg = data.message as SocialMessage;
            const convId = String(data.conversationId);
            const isViewingNow = activeConvIdRef.current === convId;
            let foundConv = false;

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== convId) return c;
                foundConv = true;
                const existing = c.messages || [];
                if (existing.some((m) => m.id === incomingMsg.id)) return c;
                return {
                  ...c,
                  isTyping: false,
                  typingUserId: undefined,
                  typingUserName: undefined,
                  unreadCount:
                    incomingMsg.senderId !== me.id && !isViewingNow
                      ? (c.unreadCount || 0) + 1
                      : c.unreadCount || 0,
                  lastMessage: incomingMsg,
                  messages: [...existing, incomingMsg],
                };
              })
            );

            if (!foundConv) {
              hydrateFromServer(me.id);
            } else if (incomingMsg.senderId !== me.id && isViewingNow) {
              socialApi.markConversationRead(convId, me.id).catch(() => {});
            }
            return;
          }

          if (data.type === 'dm:read' && data.conversationId) {
            if (data.receiptVisible === false || me.readReceiptsEnabled === false) return;
            const convId = String(data.conversationId);
            const seenAt = Number(data.seenAt) || Date.now();
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== convId) return c;
                return {
                  ...c,
                  messages: (c.messages || []).map((m) =>
                    m.senderId === me.id && m.senderId !== data.readerId
                      ? { ...m, status: 'read' as const, seenAt }
                      : m
                  ),
                  lastMessage:
                    c.lastMessage &&
                    c.lastMessage.senderId === me.id &&
                    c.lastMessage.senderId !== data.readerId
                      ? { ...c.lastMessage, status: 'read' as const, seenAt }
                      : c.lastMessage,
                };
              })
            );
            return;
          }

          if (data.type === 'dm:reaction' && data.conversationId && data.messageId) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === data.conversationId
                  ? {
                      ...c,
                      messages: (c.messages || []).map((m) =>
                        m.id === data.messageId ? { ...m, reactions: data.reactions || {} } : m
                      ),
                    }
                  : c
              )
            );
            return;
          }

          if (data.type === 'dm:delete' && data.conversationId && data.messageId) {
            const shouldRemoveForMe =
              data.mode === 'unsend' ||
              !data.deletedByUserId ||
              data.deletedByUserId === me.id;
            if (!shouldRemoveForMe) return;
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== data.conversationId) return c;
                const filtered = (c.messages || []).filter((m) => m.id !== data.messageId);
                return {
                  ...c,
                  messages: filtered,
                  lastMessage: filtered[filtered.length - 1],
                };
              })
            );
            return;
          }

          if (
            data.type === 'story:created' ||
            data.type === 'story:updated' ||
            data.type === 'story:deleted'
          ) {
            hydrateFromServer(me.id);
          }
        } catch {
          // ignore malformed WS packet
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          reconnectTimer = setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      Object.values(typingClearTimersRef.current).forEach(clearTimeout);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
  }, [user.id, hydrateFromServer]);

  // Re-identify WS when privacy flags toggle
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'social:identify',
          userId: user.id,
          showActivityStatus: user.showActivityStatus !== false,
          readReceiptsEnabled: user.readReceiptsEnabled !== false,
          typingIndicatorsEnabled: user.typingIndicatorsEnabled !== false,
        })
      );
    }
  }, [user.id, user.showActivityStatus, user.readReceiptsEnabled, user.typingIndicatorsEnabled]);

  // Synchronize light / dark mode cleanly via Tailwind `.dark` class
  useEffect(() => {
    const isLight = user.theme === 'light';
    if (isLight) {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
    } else {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isLight ? '#FFFFFF' : '#000000');
    }
  }, [user.theme]);

  // Persist State Changes
  useEffect(() => safeStorage.setJSON(USER_STORAGE_KEY, user), [user]);
  useEffect(() => safeStorage.setJSON(POSTS_STORAGE_KEY, posts), [posts]);
  useEffect(() => safeStorage.setJSON(STORIES_STORAGE_KEY, stories), [stories]);
  useEffect(() => safeStorage.setJSON(REELS_STORAGE_KEY, reels), [reels]);
  useEffect(() => safeStorage.setJSON(CONVS_STORAGE_KEY, conversations), [conversations]);
  useEffect(() => safeStorage.setJSON(NOTIFS_STORAGE_KEY, notifications), [notifications]);
  useEffect(
    () => saveSubscribedWebtoons(subscribedWebtoons),
    [subscribedWebtoons]
  );
  useEffect(() => saveLikedWebtoons(likedWebtoons), [likedWebtoons]);
  useEffect(() => saveLikedEpisodes(likedEpisodes), [likedEpisodes]);

  const handleUpdateUserAndSync = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      const next = { ...prev, ...updated };
      socialApi
        .updatePrivacy(next.id, {
          showActivityStatus: next.showActivityStatus !== false,
          readReceiptsEnabled: next.readReceiptsEnabled !== false,
          typingIndicatorsEnabled: next.typingIndicatorsEnabled !== false,
          allowMessagesFrom: next.allowMessagesFrom || 'everyone',
          storyDefaultAudience: next.storyDefaultAudience || 'everyone',
          storyReplyPermission: next.storyReplyPermission || 'everyone',
          saveStoriesToArchive: next.saveStoriesToArchive !== false,
          closeFriendIds: next.closeFriendIds || [],
          mutedStoryAuthorIds: next.mutedStoryAuthorIds || [],
          blockedUserIds: next.blockedUserIds || [],
          followingIds: next.followingIds || [],
        })
        .catch(() => {});
      return next;
    });
  }, []);

  // Optimistic Subscribe / Unsubscribe Creator with Offline Rollback
  const handleToggleFollow = (targetUserId: string) => {
    const previousFollowing = user.followingIds || [];
    const wasFollowing = previousFollowing.includes(targetUserId);
    const optimisticFollowing = wasFollowing
      ? previousFollowing.filter((id) => id !== targetUserId)
      : [...previousFollowing, targetUserId];
    const existingCreator = creators.find((c) => c.id === targetUserId);
    const resolvedTarget =
      existingCreator ||
      resolvePublicUser({
        userId: targetUserId,
        currentUser: user,
        creators,
        posts,
        stories,
        conversations,
        webtoons: ALL_WEBTOONS,
      });

    // 1. Immediate optimistic UI update
    setUser((prev) => ({
      ...prev,
      followingIds: optimisticFollowing,
      followingCount: optimisticFollowing.length,
    }));

    setCreators((prev) => {
      const exists = prev.some((c) => c.id === targetUserId);
      if (!exists) {
        if (wasFollowing) return prev;
        return [
          ...prev,
          {
            ...resolvedTarget,
            followersIds: Array.from(new Set([...(resolvedTarget.followersIds || []), user.id])),
            followersCount: Math.max(1, (resolvedTarget.followersCount || 0) + 1),
          },
        ];
      }
      return prev.map((c) => {
        if (c.id !== targetUserId) return c;
        const currentIds = c.followersIds || [];
        const nextIds = wasFollowing
          ? currentIds.filter((id) => id !== user.id)
          : Array.from(new Set([...currentIds, user.id]));
        return {
          ...c,
          followersIds: nextIds,
          followersCount: Math.max(0, c.followersCount + (wasFollowing ? -1 : 1)),
        };
      });
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.authorId === targetUserId ? { ...p, isAuthorFollowed: !wasFollowing } : p
      )
    );
    setReels((prev) =>
      prev.map((r) =>
        r.authorId === targetUserId ? { ...r, isAuthorFollowed: !wasFollowing } : r
      )
    );

    if (typeof navigator === 'undefined' || navigator.onLine) {
      socialApi.updatePrivacy(user.id, { followingIds: optimisticFollowing }).catch(() => {});
      showToast(
        wasFollowing
          ? `Unsubscribed from ${resolvedTarget.name || 'creator'}`
          : `Subscribed to ${resolvedTarget.name || 'creator'}`,
        { type: 'success', durationMs: 1800 }
      );
    }

    // 2. Rollback gracefully if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setTimeout(() => {
        setUser((prev) => ({
          ...prev,
          followingIds: previousFollowing,
          followingCount: previousFollowing.length,
        }));
        setCreators((prev) =>
          prev.map((c) => {
            if (c.id !== targetUserId) return c;
            const currentIds = c.followersIds || [];
            const revertedIds = wasFollowing
              ? Array.from(new Set([...currentIds, user.id]))
              : currentIds.filter((id) => id !== user.id);
            return {
              ...c,
              followersIds: revertedIds,
              followersCount: Math.max(0, c.followersCount + (wasFollowing ? 1 : -1)),
            };
          })
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.authorId === targetUserId ? { ...p, isAuthorFollowed: wasFollowing } : p
          )
        );
        setReels((prev) =>
          prev.map((r) =>
            r.authorId === targetUserId ? { ...r, isAuthorFollowed: wasFollowing } : r
          )
        );
        showToast('Could not update subscription while offline', { type: 'error' });
      }, 300);
    }
  };

  // Post Reactions
  const handleReactPost = (postId: string, reaction: ReactionType) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const isUnreact = p.userReaction === reaction;
        const newUserReaction = isUnreact ? null : reaction;
        const diff = isUnreact ? -1 : p.userReaction ? 0 : 1;
        return {
          ...p,
          userReaction: newUserReaction,
          likesCount: Math.max(0, p.likesCount + diff),
        };
      })
    );
  };

  // Save / Bookmark Post
  const handleToggleSavePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
    );
    setUser((prev) => {
      const saved = prev.savedPostIds || [];
      const nextSaved = saved.includes(postId)
        ? saved.filter((id) => id !== postId)
        : [...saved, postId];
      return { ...prev, savedPostIds: nextSaved };
    });
  };

  // Repost
  const handleToggleRepost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const isReposted = !p.isReposted;
        const existingReposters = p.repostedByIds || [];
        const nextReposters = isReposted
          ? Array.from(new Set([...existingReposters, user.id]))
          : existingReposters.filter((id) => id !== user.id);
        return {
          ...p,
          isReposted,
          repostedByIds: nextReposters,
          repostsCount: isReposted
            ? (p.repostsCount ?? 0) + 1
            : Math.max(0, (p.repostsCount ?? 0) - 1),
          sharesCount: isReposted ? p.sharesCount + 1 : Math.max(0, p.sharesCount - 1),
        };
      })
    );
  };

  // Poll Voting
  const handleVotePoll = (postId: string, optionId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId || !p.poll) return p;
        const currentPoll = p.poll;
        const prevVoteId = currentPoll.userVotedOptionId;
        if (prevVoteId === optionId) return p;

        const nextOptions = currentPoll.options.map((opt) => {
          if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
          if (opt.id === prevVoteId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
          return opt;
        });

        return {
          ...p,
          poll: {
            ...currentPoll,
            options: nextOptions,
            totalVotes: prevVoteId ? currentPoll.totalVotes : currentPoll.totalVotes + 1,
            userVotedOptionId: optionId,
          },
        };
      })
    );
  };

  // Comments (supports top-level + nested threaded replies)
  const handleAddComment = (postId: string, text: string, replyToCommentId?: string) => {
    const newComment = {
      id: `comm-${Date.now()}`,
      postId,
      authorId: user.id,
      authorName: user.name,
      authorUsername: user.username,
      authorAvatar: user.avatar,
      authorVerified: user.isVerified,
      text,
      createdAt: Date.now(),
      likesCount: 0,
      isLiked: false,
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const existingComments = p.comments || [];

        if (replyToCommentId) {
          let inserted = false;
          const updatedComments = existingComments.map((c) => {
            if (c.id === replyToCommentId) {
              inserted = true;
              return {
                ...c,
                replies: [
                  ...(c.replies || []),
                  {
                    ...newComment,
                    replyToCommentId: c.id,
                    replyToUsername: c.authorUsername,
                  },
                ],
              };
            }
            const nestedMatch = (c.replies || []).find((r) => r.id === replyToCommentId);
            if (nestedMatch) {
              inserted = true;
              return {
                ...c,
                replies: [
                  ...(c.replies || []),
                  {
                    ...newComment,
                    replyToCommentId: c.id,
                    replyToUsername: nestedMatch.authorUsername,
                  },
                ],
              };
            }
            return c;
          });

          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: inserted ? updatedComments : [newComment, ...existingComments],
          };
        }

        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [newComment, ...existingComments],
        };
      })
    );
  };

  const handleLikeComment = (commentId: string) => {
    setPosts((prev) =>
      prev.map((p) => ({
        ...p,
        comments: (p.comments || []).map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              isLiked: !c.isLiked,
              likesCount: c.isLiked ? Math.max(0, c.likesCount - 1) : c.likesCount + 1,
            };
          }
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      isLiked: !r.isLiked,
                      likesCount: r.isLiked ? Math.max(0, r.likesCount - 1) : r.likesCount + 1,
                    }
                  : r
              ),
            };
          }
          return c;
        }),
      }))
    );
  };

  // Publish New Content
  const handlePublishPost = (newPostData: Partial<SocialPost>) => {
    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorUsername: user.username,
      authorAvatar: user.avatar,
      authorVerified: user.isVerified,
      authorBadge: 'creator',
      isAuthorFollowed: true,
      createdAt: Date.now(),
      content: newPostData.content || '',
      mediaType: newPostData.mediaType || 'text',
      mediaUrls: newPostData.mediaUrls || [],
      location: newPostData.location,
      tags: newPostData.tags || ['enmmoe'],
      likesCount: 1,
      commentsCount: 0,
      repostsCount: 0,
      sharesCount: 0,
      viewsCount: 1,
      userReaction: 'love',
      isSaved: false,
      isReposted: false,
      poll: newPostData.poll,
      linkPreview: newPostData.linkPreview,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    setUser((prev) => ({ ...prev, postsCount: prev.postsCount + 1 }));
    openPulse();
  };

  const storyGroups = useMemo(() => groupStoriesByAuthor(stories, user), [stories, user]);

  const handleOpenStoryAtIndex = (flatIdx: number) => {
    const targetStory = stories[flatIdx];
    if (!targetStory) return;
    const grp = storyGroups.find((g) => g.authorId === targetStory.authorId);
    const slideIdx = grp ? Math.max(0, grp.stories.findIndex((s) => s.id === targetStory.id)) : 0;
    setActiveHighlightPlayback(null);
    setActiveStoryAuthorId(targetStory.authorId);
    setActiveStoryInitialSlide(slideIdx);
  };

  const handleOpenAuthorStory = (authorId: string, _group?: StoryAuthorGroup) => {
    setActiveHighlightPlayback(null);
    setActiveStoryAuthorId(authorId);
    setActiveStoryInitialSlide(0);
  };

  const handlePublishStory = async (newStoryData: Partial<Story> & { saveToArchive?: boolean }) => {
    try {
      const res = await socialApi.createStory({
        ...newStoryData,
        authorId: user.id,
        authorName: user.name,
        authorUsername: user.username,
        authorAvatar: user.avatar,
        authorVerified: user.isVerified,
        saveToArchive: newStoryData.saveToArchive ?? (user.saveStoriesToArchive !== false),
      });
      if (res.story) {
        const created = {
          ...res.story,
          authorAvatar: res.story.authorAvatar || user.avatar,
        };
        setStories((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
        if (created.isArchived !== false) {
          setArchiveStories((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
        }
      }
    } catch {
      const now = Date.now();
      const fallbackStory: Story = {
        id: `story-${now}`,
        authorId: user.id,
        authorName: user.name,
        authorUsername: user.username,
        authorAvatar: user.avatar,
        authorVerified: user.isVerified,
        mediaUrl: newStoryData.mediaUrl || ALL_WEBTOONS[0].coverImage,
        thumbnailUrl: newStoryData.thumbnailUrl,
        mediaType: newStoryData.mediaType || 'photo',
        backgroundGradient: newStoryData.backgroundGradient,
        cropTransform: newStoryData.cropTransform,
        drawingDataUrl: newStoryData.drawingDataUrl,
        textOverlays: newStoryData.textOverlays,
        stickers: newStoryData.stickers,
        caption: newStoryData.caption,
        location: newStoryData.location,
        poll: newStoryData.poll,
        createdAt: now,
        expiresAt: now + 24 * 3600 * 1000,
        canEditUntil: now + 15 * 60 * 1000,
        audience: newStoryData.audience || user.storyDefaultAudience || 'everyone',
        hiddenFromIds: newStoryData.hiddenFromIds || [],
        replyPermission: newStoryData.replyPermission || user.storyReplyPermission || 'everyone',
        viewers: [],
        viewsCount: 0,
        likesCount: 0,
        likedByIds: [],
        reactions: [],
        isArchived: newStoryData.saveToArchive ?? (user.saveStoriesToArchive !== false),
        isSeen: false,
      };
      setStories((prev) => [fallbackStory, ...prev]);
      if (fallbackStory.isArchived !== false) {
        setArchiveStories((prev) => [fallbackStory, ...prev]);
      }
    }
  };

  const handleViewStory = (storyId: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, isSeen: true } : s))
    );
    socialApi
      .viewStory(storyId, {
        userId: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      })
      .then((res) => {
        if (res.story) {
          setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, ...res.story, isSeen: true } : s)));
        }
      })
      .catch(() => {});
  };

  const handleLikeStory = (storyId: string) => {
    const toggle = (list: Story[]) =>
      list.map((s) => {
        if (s.id !== storyId) return s;
        const likedBy = s.likedByIds || [];
        const hasLiked = likedBy.includes(user.id);
        const nextLikedBy = hasLiked ? likedBy.filter((id) => id !== user.id) : [...likedBy, user.id];
        return {
          ...s,
          likedByIds: nextLikedBy,
          likesCount: Math.max(0, (s.likesCount ?? likedBy.length) + (hasLiked ? -1 : 1)),
        };
      });
    setStories(toggle);
    setArchiveStories(toggle);
    socialApi
      .likeStory(storyId, {
        userId: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      })
      .catch(() => {});
  };

  const handleReactStory = (storyId: string, emoji: string) => {
    const apply = (list: Story[]) =>
      list.map((s) => {
        if (s.id !== storyId) return s;
        const filtered = (s.reactions || []).filter((r) => r.userId !== user.id);
        return {
          ...s,
          reactions: [...filtered, { userId: user.id, emoji }],
          isSeen: true,
        };
      });
    setStories(apply);
    setArchiveStories(apply);
    socialApi
      .reactStory(storyId, {
        userId: user.id,
        emoji,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      })
      .catch(() => {});
  };

  const handleVoteStoryPoll = (storyId: string, option: 'A' | 'B') => {
    const applyVote = (list: Story[]) =>
      list.map((s) => {
        if (s.id !== storyId || !s.poll) return s;
        const prevVote = s.poll.userVote ?? s.poll.voterVotes?.[user.id];
        let votesA = s.poll.votesA ?? 0;
        let votesB = s.poll.votesB ?? 0;
        if (prevVote === 'A') votesA = Math.max(0, votesA - 1);
        if (prevVote === 'B') votesB = Math.max(0, votesB - 1);
        if (option === 'A') votesA += 1;
        else votesB += 1;
        return {
          ...s,
          poll: {
            ...s.poll,
            votesA,
            votesB,
            userVote: option,
            voterVotes: { ...(s.poll.voterVotes || {}), [user.id]: option },
          },
        };
      });
    setStories(applyVote);
    setArchiveStories(applyVote);
    socialApi.voteStoryPoll(storyId, user.id, option).catch(() => {});
  };

  const handleAnswerStoryQuestion = (storyId: string, stickerId: string, answer: string) => {
    const entry = {
      id: `q-${Date.now()}`,
      userId: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      answer,
      createdAt: Date.now(),
    };
    const apply = (list: Story[]) =>
      list.map((s) =>
        s.id === storyId
          ? {
              ...s,
              stickers: (s.stickers || []).map((st) =>
                st.id === stickerId
                  ? { ...st, responses: [entry, ...(st.responses || [])] }
                  : st
              ),
            }
          : s
      );
    setStories(apply);
    setArchiveStories(apply);
    socialApi
      .answerStoryQuestion(storyId, {
        stickerId,
        userId: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        answer,
      })
      .catch(() => {});
  };

  const handleInteractStorySticker = (
    storyId: string,
    payload: { stickerId: string; sliderValue?: number; toggleReminder?: boolean }
  ) => {
    const apply = (list: Story[]) =>
      list.map((s) =>
        s.id === storyId
          ? {
              ...s,
              stickers: (s.stickers || []).map((st) => {
                if (st.id !== payload.stickerId) return st;
                const next = { ...st };
                if (typeof payload.sliderValue === 'number') {
                  next.sliderValues = { ...(st.sliderValues || {}), [user.id]: payload.sliderValue };
                }
                if (payload.toggleReminder) {
                  const cur = st.reminderUserIds || [];
                  next.reminderUserIds = cur.includes(user.id)
                    ? cur.filter((id) => id !== user.id)
                    : [...cur, user.id];
                }
                return next;
              }),
            }
          : s
      );
    setStories(apply);
    setArchiveStories(apply);
    socialApi
      .interactStorySticker(storyId, { userId: user.id, ...payload })
      .catch(() => {});
  };

  const handleUpdateStoryMetadata = async (
    storyId: string,
    updates: {
      caption?: string;
      location?: string;
      audience?: StoryAudience;
      hiddenFromIds?: string[];
      replyPermission?: StoryReplyPermission;
    }
  ) => {
    const apply = (list: Story[]) =>
      list.map((s) => (s.id === storyId ? { ...s, ...updates } : s));
    setStories(apply);
    setArchiveStories(apply);
    try {
      await socialApi.updateStory(storyId, { userId: user.id, ...updates });
    } catch {}
  };

  const handleDeleteStory = async (storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
    setArchiveStories((prev) => prev.filter((s) => s.id !== storyId));
    try {
      await socialApi.deleteStory(storyId, user.id);
    } catch {}
  };

  const handleMuteStoryAuthor = (authorId: string) => {
    const current = user.mutedStoryAuthorIds || [];
    const next = current.includes(authorId)
      ? current.filter((id) => id !== authorId)
      : [...current, authorId];
    handleUpdateUserAndSync({ mutedStoryAuthorIds: next });
  };

  const handleReportStory = async (storyId: string, reason: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
    try {
      await socialApi.submitReport({
        reporterId: user.id,
        targetType: 'story',
        targetId: storyId,
        reason,
      });
    } catch {}
  };

  const handleSaveHighlight = async (payload: {
    id?: string;
    title: string;
    coverImage: string;
    storyIds: string[];
  }) => {
    if (payload.id) {
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === payload.id
            ? { ...h, title: payload.title, coverImage: payload.coverImage, storyIds: payload.storyIds }
            : h
        )
      );
      try {
        await socialApi.updateHighlight(payload.id, {
          ownerId: user.id,
          title: payload.title,
          coverImage: payload.coverImage,
          storyIds: payload.storyIds,
        });
      } catch {}
      showToast('Highlight updated', { type: 'success' });
      return;
    }

    try {
      const res = await socialApi.createHighlight({
        ownerId: user.id,
        title: payload.title,
        coverImage: payload.coverImage,
        storyIds: payload.storyIds,
      });
      if (res.highlight) {
        setHighlights((prev) => [res.highlight, ...prev]);
      }
    } catch {
      const localHl: StoryHighlight = {
        id: `hl-${Date.now()}`,
        ownerId: user.id,
        title: payload.title,
        coverImage: payload.coverImage,
        storyIds: payload.storyIds,
        createdAt: Date.now(),
      };
      setHighlights((prev) => [localHl, ...prev]);
    }
    showToast('Highlight created', { type: 'success' });
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    try {
      await socialApi.deleteHighlight(highlightId, user.id);
    } catch {}
    showToast('Highlight deleted', { type: 'info' });
  };

  // Real Server-Backed Direct Messaging (Zero Fake Timeouts)
  const handleSendMessage = async (
    convId: string,
    text: string,
    replyTo?: any,
    storyReply?: SocialMessage['storyReply']
  ) => {
    const currentBubbleStyle =
      safeStorage.getItem('enmmoe_bubble_style') ||
      safeStorage.getItem('tiktok_bubble_style') ||
      'default';

    const tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMessage: SocialMessage = {
      id: tempId,
      conversationId: convId,
      senderId: user.id,
      senderName: user.name,
      senderUsername: user.username,
      senderAvatar: user.avatar,
      text,
      timestamp: Date.now(),
      status: 'sent',
      replyTo,
      storyReply,
      bubbleStyle: currentBubbleStyle,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, lastMessage: optimisticMessage, messages: [...(c.messages || []), optimisticMessage] }
          : c
      )
    );

    try {
      const res = await socialApi.sendMessage({
        conversationId: convId,
        senderId: user.id,
        senderName: user.name,
        senderUsername: user.username,
        senderAvatar: user.avatar,
        text,
        replyTo,
        storyReply,
        bubbleStyle: currentBubbleStyle,
      });
      if (res.message) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const list = c.messages || [];
            // Avoid duplicate if WS dm:message arrived before HTTP response
            const alreadyHasServer = list.some((m) => m.id === res.message.id);
            const nextList = alreadyHasServer
              ? list.filter((m) => m.id !== tempId)
              : list.map((m) => (m.id === tempId ? res.message : m));
            return {
              ...c,
              messages: nextList,
              lastMessage: nextList[nextList.length - 1],
            };
          })
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not send message', { type: 'error' });
    }
  };

  const handleUserTyping = (convId: string, isTyping: boolean) => {
    if (user.typingIndicatorsEnabled === false) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'dm:typing',
          conversationId: convId,
          userId: user.id,
          userName: user.name,
          isTyping,
        })
      );
    }
  };

  // Mark active conversation read & broadcast real receipt via backend
  useEffect(() => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversationId) return c;
        const msgList = c.messages || [];
        const hasUnread =
          c.unreadCount > 0 || msgList.some((m) => m.senderId !== user.id && m.status !== 'read');
        if (!hasUnread) return c;
        return {
          ...c,
          unreadCount: 0,
          messages: msgList.map((m) =>
            m.senderId !== user.id ? { ...m, status: 'read' as const } : m
          ),
          lastMessage:
            c.lastMessage && c.lastMessage.senderId !== user.id
              ? { ...c.lastMessage, status: 'read' as const }
              : c.lastMessage,
        };
      })
    );
    socialApi.markConversationRead(activeConversationId, user.id).catch(() => {});
  }, [activeConversationId, user.id]);

  const handleReactMessage = (convId: string, messageId: string, emoji: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: (c.messages || []).map((m) => {
                if (m.id !== messageId) return m;
                const currentReactions = { ...(m.reactions || {}) };
                if (currentReactions[user.id] === emoji) {
                  delete currentReactions[user.id];
                } else {
                  currentReactions[user.id] = emoji;
                }
                return { ...m, reactions: currentReactions };
              }),
            }
          : c
      )
    );
    socialApi.reactMessage(convId, messageId, user.id, emoji).catch(() => {});
  };

  const handleDeleteMessage = async (
    convId: string,
    messageId: string,
    mode: 'unsend' | 'delete_for_me' = 'delete_for_me'
  ): Promise<{ ok: boolean; deletedForEveryone: boolean; error?: string }> => {
    const removeFromLocalState = () => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const remaining = (c.messages || []).filter((m) => m.id !== messageId);
          return { ...c, messages: remaining, lastMessage: remaining[remaining.length - 1] };
        })
      );
    };

    try {
      const res = await socialApi.deleteMessage(convId, messageId, user.id, mode);
      const deletedForEveryone = mode === 'unsend' && res.deletedForEveryone === true;
      if (mode === 'unsend' && !deletedForEveryone) {
        return {
          ok: false,
          deletedForEveryone: false,
          error: 'Could not delete this message for the other participant.',
        };
      }
      removeFromLocalState();
      return { ok: true, deletedForEveryone };
    } catch (err: any) {
      if (mode === 'delete_for_me') {
        removeFromLocalState();
        return { ok: true, deletedForEveryone: false };
      }
      return {
        ok: false,
        deletedForEveryone: false,
        error: err?.message || 'Unable to delete this message for everyone.',
      };
    }
  };

  const handleRequestAction = async (
    convId: string,
    action: 'accept' | 'decline' | 'block' | 'spam'
  ) => {
    const targetConv = conversations.find((c) => c.id === convId);
    const partnerId = targetConv?.participants?.[0]?.id;

    if (action === 'accept') {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, isRequest: false, requestStatus: 'accepted', unreadCount: 0 } : c
        )
      );
      showToast('Message request accepted', { type: 'success' });
    } else if (action === 'decline') {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) setActiveConversationId('');
      showToast('Request deleted', { type: 'info' });
    } else if (action === 'spam') {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, requestStatus: 'spam' } : c))
      );
      if (activeConversationId === convId) setActiveConversationId('');
      showToast('Moved to filtered requests', { type: 'info' });
    } else if (action === 'block') {
      if (partnerId) {
        handleToggleBlockUser(partnerId, true);
      }
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) setActiveConversationId('');
    }

    socialApi.handleRequestAction(convId, user.id, action).catch(() => {});
  };

  const handleToggleBlockUser = (targetUserId: string, block: boolean) => {
    const currentBlocked = user.blockedUserIds || [];
    const nextBlocked = block
      ? Array.from(new Set([...currentBlocked, targetUserId]))
      : currentBlocked.filter((id) => id !== targetUserId);
    handleUpdateUserAndSync({ blockedUserIds: nextBlocked });
    socialApi.toggleBlockUser(user.id, targetUserId, block).catch(() => {});
    if (block) {
      setStories((prev) => prev.filter((s) => s.authorId !== targetUserId));
    } else {
      hydrateFromServer(user.id);
    }
  };

  const handleReportTarget = (
    targetType: 'conversation' | 'message' | 'account',
    targetId: string,
    reason: string
  ) => {
    socialApi
      .submitReport({
        reporterId: user.id,
        targetType,
        targetId,
        reason,
      })
      .catch(() => {});
  };

  const handleSendStoryReply = async (story: Story, replyText: string) => {
    const storyReplyPayload: SocialMessage['storyReply'] = {
      storyId: story.id,
      authorId: story.authorId,
      authorName: story.authorName,
      thumbnailUrl: story.thumbnailUrl || story.mediaUrl,
      storyCaption: story.caption,
    };

    try {
      const res = await socialApi.replyToStory(story.id, {
        senderId: user.id,
        senderName: user.name,
        senderUsername: user.username,
        senderAvatar: user.avatar,
        replyText,
      });
      if (res.conversationId && res.message) {
        const exists = conversations.some((c) => c.id === res.conversationId);
        if (exists) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== res.conversationId) return c;
              const list = c.messages || [];
              if (list.some((m) => m.id === res.message.id)) return c;
              return { ...c, lastMessage: res.message, messages: [...list, res.message] };
            })
          );
        } else {
          hydrateFromServer(user.id);
        }
        return;
      }
    } catch {}

    const targetConv = conversations.find((c) =>
      (c.participants || []).some((p) => p.id === story.authorId)
    );
    if (targetConv) {
      handleSendMessage(targetConv.id, replyText, undefined, storyReplyPayload);
      return;
    }
    const creator = creators.find((c) => c.id === story.authorId);
    const newConv: SocialConversation = {
      id: `conv-${Date.now()}`,
      type: 'direct',
      participants: [
        {
          id: story.authorId,
          name: story.authorName || creator?.name || 'Creator',
          username: story.authorUsername || creator?.username || 'creator',
          avatar: story.authorAvatar || creator?.avatar || '',
          isVerified: story.authorVerified ?? creator?.isVerified,
          isOnline: creator?.isOnline || false,
        },
      ],
      unreadCount: 0,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    handleSendMessage(newConv.id, replyText, undefined, storyReplyPayload);
  };

  const handleCreateGroupConversation = async (title: string, memberIds: string[]) => {
    try {
      const res = await socialApi.createOrGetConversation({
        userId: user.id,
        title,
        participantIds: memberIds,
      });
      if (res.conversation) {
        setConversations((prev) => [res.conversation, ...prev]);
        setActiveConversationId(res.conversation.id);
        openMessages(res.conversation.id);
        showToast(`Created "${title}"`, { type: 'success' });
        return;
      }
    } catch {}
    const members = creators.filter((c) => memberIds.includes(c.id));
    const newGroup: SocialConversation = {
      id: `group-${Date.now()}`,
      type: 'group',
      title,
      participants: members.map((m) => ({
        id: m.id,
        name: m.name,
        username: m.username,
        avatar: m.avatar,
        isOnline: m.isOnline,
      })),
      unreadCount: 0,
      messages: [],
    };
    setConversations((prev) => [newGroup, ...prev]);
    setActiveConversationId(newGroup.id);
    openMessages(newGroup.id);
    showToast(`Created "${title}"`, { type: 'success' });
  };

  const handleStartConversationWithUser = async (
    targetUserId: string,
    targetUserData?: (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) | null
  ) => {
    if (!targetUserId || targetUserId === 'me' || targetUserId === user.id) {
      return;
    }

    const resolvedTarget = resolvePublicUser({
      userId: targetUserId,
      partialUser: targetUserData,
      currentUser: user,
      creators,
      posts,
      stories,
      conversations,
      webtoons: ALL_WEBTOONS,
    });

    if ((user.blockedUserIds || []).includes(resolvedTarget.id)) {
      showToast(`Unblock ${resolvedTarget.name} before sending a message`, { type: 'info' });
      return;
    }

    if (resolvedTarget.allowMessagesFrom === 'nobody') {
      showToast(`${resolvedTarget.name} does not accept direct messages`, { type: 'info' });
      return;
    }

    let conv = conversations.find((c) =>
      c.type === 'direct' &&
      (c.participants || []).some(
        (p) =>
          p.id === resolvedTarget.id ||
          (resolvedTarget.username && p.username === resolvedTarget.username)
      )
    );

    if (!conv) {
      const userData = {
        id: resolvedTarget.id,
        name: resolvedTarget.name,
        username: resolvedTarget.username,
        avatar: resolvedTarget.avatar,
        isVerified: resolvedTarget.isVerified,
      };
      try {
        const res = await socialApi.createOrGetConversation({
          userId: user.id,
          targetUserId: resolvedTarget.id,
          targetUserData: userData,
        });
        if (res.conversation) {
          conv = res.conversation;
          setConversations((prev) =>
            prev.some((c) => c.id === conv!.id) ? prev : [conv!, ...prev]
          );
        }
      } catch (err: any) {
        if (err?.message) {
          showToast(err.message, { type: 'error' });
          return;
        }
      }

      if (!conv) {
        const fallbackConv: SocialConversation = {
          id: `conv-${Date.now()}`,
          type: 'direct',
          participants: [
            {
              ...userData,
              isOnline: resolvedTarget.isOnline || false,
            },
          ],
          unreadCount: 0,
          messages: [],
        };
        setConversations((prev) => [fallbackConv, ...prev]);
        conv = fallbackConv;
      }
    }

    setActiveConversationId(conv.id);
    openMessages(conv.id);
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setShowNotificationsModal(false);

    if (notif.type === 'message') {
      setActiveConversationId(notif.actorId || '');
      openMessages(notif.actorId || undefined);
    } else if (notif.targetType === 'post') {
      openPulse();
    } else if (notif.actorId && notif.actorId !== 'system' && notif.type !== 'system') {
      const actor = creators.find((c) => c.id === notif.actorId);
      openProfile(
        notif.actorId === user.id ? 'me' : notif.actorId,
        actor || {
          id: notif.actorId,
          name: notif.actorName,
          username:
            notif.actorUsername || notif.actorName.toLowerCase().replace(/\s+/g, '_'),
          avatar: notif.actorAvatar,
          isVerified: notif.actorVerified,
        }
      );
    }
  };

  const unreadNotifsCount = isNotifsMuted ? 0 : notifications.filter((n) => !n.isRead).length;
  const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const activeCommentPost = posts.find((p) => p.id === activeCommentPostId);

  const isMyProfileRoute =
    currentRoute.type === 'profile' &&
    (currentRoute.userId === 'me' || currentRoute.userId === user.id);

  const isDeepScreen =
    currentRoute.type === 'book' ||
    currentRoute.type === 'chapter' ||
    currentRoute.type === 'settings' ||
    (currentRoute.type === 'profile' && !isMyProfileRoute) ||
    (currentRoute.type === 'messages' && !!(currentRoute.conversationId || activeConversationId));

  const showHomeTab = currentRoute.type === 'home';
  const showMessagesTab = currentRoute.type === 'messages';
  const showDiscoverTab = currentRoute.type === 'discover';
  const showPulseTab = currentRoute.type === 'pulse';
  const showMyProfileTab = isMyProfileRoute;

  const isHomeVisible = showHomeTab && !isDeepScreen;
  const isDiscoverVisible = showDiscoverTab && !isDeepScreen;
  const isPulseVisible = showPulseTab && !isDeepScreen;
  const isProfileVisible = showMyProfileTab && !isDeepScreen;

  // Restore saved tab scrollTop whenever switching back to a tab
  React.useLayoutEffect(() => {
    if (isHomeVisible && homeScrollRef.current) {
      homeScrollRef.current.scrollTop = tabScrollTopRef.current.home;
    }
  }, [isHomeVisible]);

  React.useLayoutEffect(() => {
    if (isDiscoverVisible && discoverScrollRef.current) {
      discoverScrollRef.current.scrollTop = tabScrollTopRef.current.discover;
    }
  }, [isDiscoverVisible]);

  React.useLayoutEffect(() => {
    if (isPulseVisible && pulseScrollRef.current) {
      pulseScrollRef.current.scrollTop = tabScrollTopRef.current.pulse;
    }
  }, [isPulseVisible]);

  React.useLayoutEffect(() => {
    if (isProfileVisible && profileScrollRef.current) {
      profileScrollRef.current.scrollTop = tabScrollTopRef.current.profile;
    }
  }, [isProfileVisible]);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F2F2F7] dark:bg-black flex justify-center">
      <EnmmoeIntro />

      <div
        id="enmmoe-app-root"
        className="h-[100dvh] max-h-[100dvh] w-full max-w-4xl flex flex-col overflow-hidden relative font-sans select-none bg-white dark:bg-black text-black dark:text-white"
      >
        {isOffline && <OfflineBanner onRetry={() => window.location.reload()} />}

        {/* Persistent Tab Panels + Overlay Stack */}
        <main className="flex-1 min-h-0 w-full relative flex flex-col overflow-hidden">
          {/* TAB 1: HOME (Kept mounted to preserve scroll position & state) */}
          <div
            ref={homeScrollRef}
            onScroll={(e) => {
              if (isHomeVisible) {
                tabScrollTopRef.current.home = e.currentTarget.scrollTop;
              }
            }}
            style={isHomeVisible ? { touchAction: 'pan-y' } : undefined}
            className={
              isHomeVisible
                ? 'flex-1 h-full min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]'
                : 'hidden'
            }
            aria-hidden={!showHomeTab}
          >
            <HomeFeedView
              currentUser={user}
              onToggleTheme={() =>
                setUser((prev) => ({
                  ...prev,
                  theme: prev.theme === 'light' ? 'dark' : 'light',
                }))
              }
              onOpenBook={(bookId, ep) => openBook(getCanonicalWebtoonId(bookId), ep)}
              onOpenChapter={(chId, bookId, ep) =>
                openChapter(chId, bookId ? getCanonicalWebtoonId(bookId) : undefined, ep)
              }
              onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
              onOpenNotifications={() => setShowNotificationsModal(true)}
              unreadNotificationsCount={unreadNotifsCount}
              subscribedWebtoons={subscribedWebtoons}
              onToggleSubscribe={handleToggleSubscribeWebtoon}
              likedWebtoons={likedWebtoons}
              onToggleLike={handleToggleLikeWebtoon}
              isActive={isHomeVisible}
            />
          </div>

          {/* TAB 2: MESSAGES (Kept mounted to preserve scroll & draft state) */}
          <div
            className={
              showMessagesTab
                ? 'flex-1 min-h-0 w-full flex flex-col overflow-hidden'
                : 'hidden'
            }
            aria-hidden={!showMessagesTab}
          >
            <MessagesHubView
              currentUser={user}
              conversations={conversations}
              creators={creators}
              stories={stories}
              activeConversationId={
                currentRoute.type === 'messages'
                  ? currentRoute.conversationId || ''
                  : activeConversationId
              }
              onSelectConversation={(cId) => {
                setActiveConversationId(cId);
                openMessages(cId);
              }}
              onStartNewConversation={handleStartConversationWithUser}
              onOpenStory={handleOpenStoryAtIndex}
              onOpenAuthorStory={handleOpenAuthorStory}
              onOpenCreateStory={() => setShowStoryCreatorModal(true)}
              onSendMessage={handleSendMessage}
              onReactMessage={handleReactMessage}
              onDeleteMessage={handleDeleteMessage}
              onForwardMessage={(msg) => setMessageToForward(msg)}
              onBackToList={() => {
                setActiveConversationId('');
                if (canGoBack) {
                  goBack();
                } else {
                  openMessages();
                }
              }}
              onUserTyping={handleUserTyping}
              onToggleFollow={handleToggleFollow}
              onRequestAction={handleRequestAction}
              onToggleBlockUser={handleToggleBlockUser}
              onReportTarget={handleReportTarget}
              onUpdatePrivacy={handleUpdateUserAndSync}
              onCreateGroupConversation={handleCreateGroupConversation}
              onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
              isTabActive={showMessagesTab && !isDeepScreen}
            />
          </div>

          {/* TAB 3: SEARCH / DISCOVER (Kept mounted to preserve filters & query) */}
          <div
            ref={discoverScrollRef}
            onScroll={(e) => {
              if (isDiscoverVisible) {
                tabScrollTopRef.current.discover = e.currentTarget.scrollTop;
              }
            }}
            className={
              isDiscoverVisible
                ? 'flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden'
                : 'hidden'
            }
            aria-hidden={!showDiscoverTab}
          >
            <DiscoverView
              currentUser={user}
              creators={creators}
              posts={posts}
              reels={reels}
              subscribedWebtoons={subscribedWebtoons}
              onToggleSubscribe={handleToggleSubscribeWebtoon}
              likedWebtoons={likedWebtoons}
              onToggleLike={handleToggleLikeWebtoon}
              externalSearchTrigger={discoverSearchTagTrigger}
              onToggleFollow={handleToggleFollow}
              onOpenReel={() => openHome()}
              onOpenWebtoon={(w) => openBook(getCanonicalWebtoonId(w.id))}
              onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
            />
          </div>

          {/* TAB 4: ENMMOE+ (Stories, X-style Posts, Shared Media & 3D Game World) */}
          <div
            ref={pulseScrollRef}
            onScroll={(e) => {
              if (isPulseVisible) {
                tabScrollTopRef.current.pulse = e.currentTarget.scrollTop;
              }
            }}
            style={isPulseVisible ? { touchAction: 'pan-y' } : undefined}
            className={
              isPulseVisible
                ? 'flex-1 h-full min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]'
                : 'hidden'
            }
            aria-hidden={!showPulseTab}
          >
            <PulseView
              currentUser={user}
              stories={stories}
              posts={posts}
              onUpdateUser={handleUpdateUserAndSync}
              onPublishStory={handlePublishStory}
              onPublishPost={handlePublishPost}
              onOpenStory={handleOpenStoryAtIndex}
              onOpenAuthorStory={handleOpenAuthorStory}
              onOpenCreate={() => setShowCreateModal(true)}
              onOpenCreateStory={() => setShowStoryCreatorModal(true)}
              onOpenNotifications={() => setShowNotificationsModal(true)}
              unreadNotificationsCount={unreadNotifsCount}
              onReactPost={handleReactPost}
              onOpenComments={(pId) => setActiveCommentPostId(pId)}
              onToggleSave={handleToggleSavePost}
              onToggleRepost={handleToggleRepost}
              onVotePoll={handleVotePoll}
              onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
            />
          </div>

          {/* TAB 4: OWN PROFILE (Kept mounted to preserve segment tab & scroll) */}
          <div
            ref={profileScrollRef}
            onScroll={(e) => {
              if (isProfileVisible) {
                tabScrollTopRef.current.profile = e.currentTarget.scrollTop;
              }
            }}
            className={
              isProfileVisible
                ? 'flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden'
                : 'hidden'
            }
            aria-hidden={!showMyProfileTab}
          >
            <ProfileView
              currentUser={user}
              creators={creators}
              profileUser={null}
              posts={posts}
              reels={reels}
              subscribedWebtoons={subscribedWebtoons}
              onToggleSubscribe={handleToggleSubscribeWebtoon}
              likedWebtoons={likedWebtoons}
              onToggleLikeWebtoon={handleToggleLikeWebtoon}
              highlights={highlights}
              archiveStories={archiveStories.length > 0 ? archiveStories : stories.filter((s) => s.authorId === user.id)}
              onOpenHighlight={(hl) => {
                const pool = [...stories, ...archiveStories];
                const hlStories = (hl.storyIds || [])
                  .map((id) => pool.find((s) => s.id === id))
                  .filter(Boolean) as Story[];
                if (hlStories.length > 0) {
                  setActiveStoryAuthorId(null);
                  setActiveHighlightPlayback({ highlight: hl, stories: hlStories });
                } else {
                  showToast('No stories in this highlight yet', { type: 'info' });
                }
              }}
              onSaveHighlight={handleSaveHighlight}
              onDeleteHighlight={handleDeleteHighlight}
              onOpenArchivedStory={(st) => {
                setActiveStoryAuthorId(null);
                setActiveHighlightPlayback({
                  highlight: {
                    id: `arch-${st.id}`,
                    ownerId: user.id,
                    title: 'Story Archive',
                    coverImage: st.thumbnailUrl || st.mediaUrl,
                    storyIds: [st.id],
                    createdAt: st.createdAt,
                  },
                  stories: [st],
                });
              }}
              isActive={isProfileVisible}
              showBackButton={false}
              onBack={goBack}
              onOpenSettings={openSettings}
              onOpenEditProfile={() => setShowEditProfileModal(true)}
              onReactPost={handleReactPost}
              onOpenComments={(pId) => setActiveCommentPostId(pId)}
              onToggleSave={handleToggleSavePost}
              onToggleRepost={handleToggleRepost}
              onToggleFollow={handleToggleFollow}
              onSendMessage={(targetUserId) => {
                handleStartConversationWithUser(targetUserId, null);
              }}
              onVotePoll={handleVotePoll}
              onOpenReportModal={(targetId) => setReportingTargetId(targetId)}
              onUpdateUser={handleUpdateUserAndSync}
              onOpenBook={(bookId, ep) => openBook(getCanonicalWebtoonId(bookId), ep)}
              onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
            />
          </div>

          {/* PUSHED SCREENS WITH SMOOTH FORWARD/BACK TRANSITIONS */}
          <AnimatePresence>
            {currentRoute.type === 'settings' && (
              <motion.div
                key="route-settings"
                initial={{ x: '100%', opacity: 0.9 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.9 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 z-20 overflow-y-auto bg-[#F2F2F7] dark:bg-black"
              >
                <SettingsView
                  currentUser={user}
                  onBack={goBack}
                  onUpdateUser={handleUpdateUserAndSync}
                  onOpenAuthModal={() => setShowAuthModal(true)}
                  onOpenEditProfile={() => setShowEditProfileModal(true)}
                />
              </motion.div>
            )}

            {currentRoute.type === 'profile' && !isMyProfileRoute && (() => {
              const profileTargetUser = resolvePublicUser({
                userId: currentRoute.userId,
                partialUser: currentRoute.user,
                currentUser: user,
                creators,
                posts,
                stories,
                conversations,
                webtoons: ALL_WEBTOONS,
              });
              return (
                <motion.div
                  key={`route-profile-${currentRoute.userId}`}
                  initial={{ x: '100%', opacity: 0.9 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0.9 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 z-20 overflow-y-auto bg-white dark:bg-black"
                >
                  <ProfileView
                    currentUser={user}
                    creators={creators}
                    profileUser={profileTargetUser}
                    posts={posts}
                    reels={reels}
                    subscribedWebtoons={subscribedWebtoons}
                    onToggleSubscribe={handleToggleSubscribeWebtoon}
                    likedWebtoons={likedWebtoons}
                    onToggleLikeWebtoon={handleToggleLikeWebtoon}
                    highlights={highlights}
                    onOpenHighlight={(hl) => {
                      const pool = [...stories, ...archiveStories];
                      const hlStories = (hl.storyIds || [])
                        .map((id) => pool.find((s) => s.id === id))
                        .filter(Boolean) as Story[];
                      if (hlStories.length > 0) {
                        setActiveStoryAuthorId(null);
                        setActiveHighlightPlayback({ highlight: hl, stories: hlStories });
                      }
                    }}
                    showBackButton={true}
                    onBack={goBack}
                    onOpenSettings={openSettings}
                    onOpenEditProfile={() => setShowEditProfileModal(true)}
                    onReactPost={handleReactPost}
                    onOpenComments={(pId) => setActiveCommentPostId(pId)}
                    onToggleSave={handleToggleSavePost}
                    onToggleRepost={handleToggleRepost}
                    onToggleFollow={handleToggleFollow}
                    onSendMessage={(targetUserId) => {
                      handleStartConversationWithUser(targetUserId, profileTargetUser);
                    }}
                    onVotePoll={handleVotePoll}
                    onOpenReportModal={(targetId) => setReportingTargetId(targetId)}
                    onUpdateUser={handleUpdateUserAndSync}
                    onOpenBook={(bookId, ep) => openBook(getCanonicalWebtoonId(bookId), ep)}
                    onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
                  />
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Book Details (/book/:bookId) */}
          {currentRoute.type === 'book' && (() => {
            const canonicalId = getCanonicalWebtoonId(currentRoute.bookId);
            const book = resolveWebtoonById(canonicalId) || ALL_WEBTOONS[0];
            const bookIsSubscribed = isWebtoonSubscribed(
              subscribedWebtoons,
              book.id,
              Boolean(book.isSubscribed)
            );
            const bookIsLiked = isWebtoonLiked(likedWebtoons, book.id);
            return (
              <WebtoonReaderModal
                key={`book-${book.id}`}
                webtoon={book}
                isOpen={true}
                initialTab="episodes"
                onClose={goBack}
                onBack={goBack}
                initialEpisodeNumber={currentRoute.initialEpisodeNumber}
                onSelectChapter={(chId, epNum) => openChapter(chId, book.id, epNum)}
                isSubscribed={bookIsSubscribed}
                isLiked={bookIsLiked}
                likedEpisodes={likedEpisodes}
                onToggleSubscribe={handleToggleSubscribeWebtoon}
                onToggleLike={handleToggleLikeWebtoon}
                onToggleEpisodeLike={handleToggleEpisodeLike}
                onSelectTag={handleSelectSeriesTag}
                creators={creators}
                currentUser={user}
                onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
                theme={user.theme === 'light' ? 'light' : 'dark'}
              />
            );
          })()}

          {/* Full-Screen Reader (/chapter/:chapterId) */}
          {currentRoute.type === 'chapter' && (() => {
            const chapterWebtoon =
              (currentRoute.bookId ? resolveWebtoonById(currentRoute.bookId) : undefined) ||
              ALL_WEBTOONS.find((w) =>
                w.episodes.some((e) => e.id === currentRoute.chapterId)
              ) ||
              ALL_WEBTOONS[0];
            const canonicalBook = resolveWebtoonById(chapterWebtoon.id) || chapterWebtoon;
            const chapterIsSubscribed = isWebtoonSubscribed(
              subscribedWebtoons,
              canonicalBook.id,
              Boolean(canonicalBook.isSubscribed)
            );
            const chapterIsLiked = isWebtoonLiked(likedWebtoons, canonicalBook.id);
            return (
              <WebtoonReaderModal
                key={`chapter-${canonicalBook.id}-${currentRoute.chapterId}`}
                webtoon={canonicalBook}
                isOpen={true}
                initialTab="reader"
                initialEpisodeId={currentRoute.chapterId}
                initialEpisodeNumber={currentRoute.episodeNumber}
                onClose={goBack}
                onBack={goBack}
                onBackToBook={() =>
                  currentRoute.bookId
                    ? openBook(getCanonicalWebtoonId(currentRoute.bookId))
                    : goBack()
                }
                onSelectChapter={(chId, epNum) =>
                  openChapter(chId, canonicalBook.id, epNum)
                }
                isSubscribed={chapterIsSubscribed}
                isLiked={chapterIsLiked}
                likedEpisodes={likedEpisodes}
                onToggleSubscribe={handleToggleSubscribeWebtoon}
                onToggleLike={handleToggleLikeWebtoon}
                onToggleEpisodeLike={handleToggleEpisodeLike}
                onSelectTag={handleSelectSeriesTag}
                creators={creators}
                currentUser={user}
                onOpenUserProfile={(u) => openProfile(u.id === user.id ? 'me' : u.id, u)}
                theme={user.theme === 'light' ? 'light' : 'dark'}
              />
            );
          })()}
        </main>

        {/* Compact iOS Docked Bottom Navigation */}
        {!isDeepScreen && (
          <BottomNav
            activeTab={isMyProfileRoute ? 'profile' : navActiveTab}
            onTabChange={(tab) => {
              if (tab === navActiveTab && !isDeepScreen) {
                return;
              }
              if (tab === 'home') {
                openHome();
              } else if (tab === 'discover') {
                openDiscover();
              } else if (tab === 'messages') {
                setActiveConversationId('');
                openMessages();
              } else if (tab === 'pulse') {
                openPulse();
              } else if (tab === 'profile') {
                openProfile('me');
              }
            }}
            unreadMessagesCount={unreadMessagesCount}
            userAvatar={user.avatar}
            userName={user.name}
            theme={user.theme === 'light' ? 'light' : 'dark'}
          />
        )}

        {/* Global Modals & Sheets */}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={(newUser) => {
              setUser(newUser);
              setShowAuthModal(false);
            }}
          />
        )}

        {(messageToForward || storyToShare) && (
          <ForwardModal
            isOpen={Boolean(messageToForward || storyToShare)}
            onClose={() => {
              setMessageToForward(null);
              setStoryToShare(null);
            }}
            messageToForward={messageToForward}
            storyToShare={storyToShare}
            conversations={conversations}
            onForward={(targetConvId, text, storyReply) =>
              handleSendMessage(targetConvId, text, undefined, storyReply)
            }
          />
        )}

        {(activeStoryAuthorId !== null || activeHighlightPlayback !== null) && (
          <StoryViewerModal
            isOpen={true}
            onClose={() => {
              setActiveStoryAuthorId(null);
              setActiveHighlightPlayback(null);
            }}
            currentUser={user}
            creators={creators}
            groups={storyGroups}
            initialAuthorId={activeStoryAuthorId || undefined}
            initialSlideIndex={activeStoryInitialSlide}
            highlightMode={activeHighlightPlayback}
            onViewStory={handleViewStory}
            onLikeStory={handleLikeStory}
            onReactStory={handleReactStory}
            onVotePoll={handleVoteStoryPoll}
            onAnswerQuestion={handleAnswerStoryQuestion}
            onInteractSticker={handleInteractStorySticker}
            onSendStoryReply={handleSendStoryReply}
            onUpdateStory={handleUpdateStoryMetadata}
            onDeleteStory={handleDeleteStory}
            onMuteAuthor={handleMuteStoryAuthor}
            onReportStory={handleReportStory}
            onShareStory={(story) => {
              setActiveStoryAuthorId(null);
              setActiveHighlightPlayback(null);
              setStoryToShare(story);
            }}
            onOpenUserProfile={(u) => {
              setActiveStoryAuthorId(null);
              setActiveHighlightPlayback(null);
              openProfile(u.id === user.id ? 'me' : u.id, u);
            }}
          />
        )}

        <StoryCreatorModal
          isOpen={showStoryCreatorModal}
          onClose={() => setShowStoryCreatorModal(false)}
          currentUser={user}
          creators={creators}
          onPublishStory={handlePublishStory}
          onUpdatePrivacy={handleUpdateUserAndSync}
        />

        <CreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          currentUser={user}
          onPublishPost={handlePublishPost}
          onPublishStory={handlePublishStory}
          onOpenStoryCreator={() => setShowStoryCreatorModal(true)}
        />

        {activeCommentPost && (
          <CommentDrawer
            isOpen={Boolean(activeCommentPostId)}
            onClose={() => setActiveCommentPostId(null)}
            postId={activeCommentPost.id}
            comments={activeCommentPost.comments || []}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onReportComment={(commentId) => setReportingTargetId(commentId)}
            onOpenUserProfile={(u) => {
              setActiveCommentPostId(null);
              openProfile(u.id === user.id ? 'me' : u.id, u);
            }}
          />
        )}

        <NotificationsModal
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllNotifsRead}
          onNotificationClick={handleNotificationClick}
          onOpenUserProfile={(u) => {
            setShowNotificationsModal(false);
            const matched = creators.find((c) => c.id === u.id);
            openProfile(u.id === user.id ? 'me' : u.id, matched || u);
          }}
        />

        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          currentUser={user}
          onSave={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
        />

        <ReportModal
          isOpen={Boolean(reportingTargetId)}
          onClose={() => setReportingTargetId(null)}
          targetId={reportingTargetId || ''}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </ToastProvider>
  );
}
