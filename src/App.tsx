import React, { useState, useEffect } from 'react';
import {
  User,
  SocialPost,
  Story,
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
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';

// Modals & Overlays
import { StoryViewerModal } from './components/StoryViewerModal';
import { CreateModal } from './components/CreateModal';
import { CommentDrawer } from './components/CommentDrawer';
import { NotificationsModal } from './components/NotificationsModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ReportModal } from './components/ReportModal';
import { AuthModal } from './components/AuthModal';
import { ForwardModal } from './components/ForwardModal';
import { UserProfileScreen } from './components/UserProfileModal';
import { WebtoonReaderModal } from './components/WebtoonReaderModal';
import { EnmmoeIntro } from './components/EnmmoeIntro';
import { OfflineBanner, ToastProvider, useToast } from './components/ui';

import { ENMMOE_AVATARS } from './data/enmmoeAvatars';
import { ALL_WEBTOONS } from './data/webtoonData';
import { NavigationProvider, useNavigation } from './navigation/NavigationContext';
import { AnimatePresence, motion } from 'motion/react';
import { safeStorage } from './utils/storage';

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
  useLanguage();
  const { showToast } = useToast();
  const {
    currentRoute,
    canGoBack,
    activeTab: navActiveTab,
    openHome,
    openDiscover,
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
      showToast('Back online', { type: 'success', durationMs: 2000 });
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
  }, [showToast]);

  // Webtoon Subscriptions
  const [subscribedWebtoons, setSubscribedWebtoons] = useState<Record<string, boolean>>({
    'otherworldly-family-man': true,
    'down-to-earth': true,
    'father-i-dont-want-marriage': true,
  });

  const handleToggleSubscribeWebtoon = (webtoonId: string) => {
    setSubscribedWebtoons((prev) => ({
      ...prev,
      [webtoonId]: !prev[webtoonId],
    }));
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
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadWithLegacy<NotificationItem[]>(
      NOTIFS_STORAGE_KEY,
      LEGACY_NOTIFS_STORAGE_KEY,
      INITIAL_NOTIFICATIONS
    )
  );

  const [creators] = useState<User[]>(INITIAL_CREATORS);
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
  const profileScrollRef = React.useRef<HTMLDivElement>(null);
  const tabScrollTopRef = React.useRef<{ home: number; discover: number; profile: number }>({
    home: 0,
    discover: 0,
    profile: 0,
  });

  // Modals & Drawers States
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [reportingTargetId, setReportingTargetId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<SocialMessage | null>(null);
  const [viewingProfileUser, setViewingProfileUser] = useState<
    (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) | null
  >(null);

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

  // Optimistic Follow / Unfollow Creator with Offline Rollback
  const handleToggleFollow = (targetUserId: string) => {
    const previousFollowing = user.followingIds || [];
    const wasFollowing = previousFollowing.includes(targetUserId);
    const optimisticFollowing = wasFollowing
      ? previousFollowing.filter((id) => id !== targetUserId)
      : [...previousFollowing, targetUserId];

    // 1. Immediate optimistic UI update
    setUser((prev) => ({
      ...prev,
      followingIds: optimisticFollowing,
      followingCount: optimisticFollowing.length,
    }));

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

    // 2. Rollback gracefully if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setTimeout(() => {
        setUser((prev) => ({
          ...prev,
          followingIds: previousFollowing,
          followingCount: previousFollowing.length,
        }));
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
        showToast('Could not update follow status while offline', { type: 'error' });
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
        return {
          ...p,
          isReposted,
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
    openHome();
  };

  const handlePublishStory = (newStoryData: Partial<Story>) => {
    const newStory: Story = {
      id: `story-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorUsername: user.username,
      authorAvatar: user.avatar,
      authorVerified: user.isVerified,
      mediaUrl: newStoryData.mediaUrl || ALL_WEBTOONS[0].coverImage,
      mediaType: newStoryData.mediaType || 'photo',
      caption: newStoryData.caption,
      location: newStoryData.location,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 3600 * 1000,
      isSeen: false,
    };
    setStories((prev) => [newStory, ...prev]);
    openHome();
  };

  // Send Direct Social Message
  const handleSendMessage = (convId: string, text: string, replyTo?: any) => {
    const currentBubbleStyle =
      safeStorage.getItem('enmmoe_bubble_style') ||
      safeStorage.getItem('tiktok_bubble_style') ||
      'default';

    const newMessage: SocialMessage = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderId: user.id,
      senderName: user.name,
      senderUsername: user.username,
      senderAvatar: user.avatar,
      text,
      timestamp: Date.now(),
      status: 'sent',
      replyTo,
      bubbleStyle: currentBubbleStyle,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, lastMessage: newMessage, messages: [...(c.messages || []), newMessage] }
          : c
      )
    );

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const readTime = Date.now();
          return {
            ...c,
            messages: (c.messages || []).map((m) =>
              m.id === newMessage.id ? { ...m, status: 'read' as const, seenAt: readTime } : m
            ),
            lastMessage:
              c.lastMessage?.id === newMessage.id
                ? { ...c.lastMessage, status: 'read' as const, seenAt: readTime }
                : c.lastMessage,
          };
        })
      );
    }, 1800);

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const partner = c.participants?.[0];
          return {
            ...c,
            isTyping: true,
            typingUserId: partner?.id || 'partner-default',
            typingUserName: partner?.name || 'Contact',
          };
        })
      );
    }, 2600);

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const partner = c.participants?.[0] || INITIAL_CREATORS[0];
          const possibleReplies = [
            'Sounds great, thanks for letting me know!',
            'Totally agree with you on that.',
            'Just saw the latest episode — loved the art!',
            'Got it, talk soon!',
          ];
          const partnerReply: SocialMessage = {
            id: `msg-${Date.now()}`,
            conversationId: convId,
            senderId: partner.id,
            senderName: partner.name,
            senderUsername: partner.username,
            senderAvatar: partner.avatar,
            text: possibleReplies[Math.floor(Math.random() * possibleReplies.length)],
            timestamp: Date.now(),
            status: 'read',
          };
          return {
            ...c,
            isTyping: false,
            typingUserId: undefined,
            typingUserName: undefined,
            lastMessage: partnerReply,
            messages: [...(c.messages || []), partnerReply],
          };
        })
      );
    }, 5200);
  };

  const handleUserTyping = (convId: string, isTyping: boolean) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        if (isTyping) {
          return { ...c, isTyping: true, typingUserId: user.id, typingUserName: user.name };
        }
        if (c.typingUserId === user.id) {
          return {
            ...c,
            isTyping: false,
            typingUserId: undefined,
            typingUserName: undefined,
          };
        }
        return c;
      })
    );
  };

  // Mark active conversation read
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
  }, [activeConversationId, user.id]);

  const handleReactMessage = (convId: string, messageId: string, emoji: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: (c.messages || []).map((m) =>
                m.id === messageId
                  ? { ...m, reactions: { ...(m.reactions || {}), [user.id]: emoji } }
                  : m
              ),
            }
          : c
      )
    );
  };

  const handleDeleteMessage = (convId: string, messageId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: (c.messages || []).filter((m) => m.id !== messageId) }
          : c
      )
    );
  };

  const handleSendStoryReply = (authorId: string, replyText: string) => {
    const targetConv = conversations.find((c) =>
      (c.participants || []).some((p) => p.id === authorId)
    );
    if (targetConv) {
      handleSendMessage(targetConv.id, replyText);
      return;
    }
    const creator = creators.find((c) => c.id === authorId);
    const newConv: SocialConversation = {
      id: `conv-${Date.now()}`,
      type: 'direct',
      participants: [
        {
          id: authorId,
          name: creator?.name || 'Creator',
          username: creator?.username || 'creator',
          avatar: creator?.avatar || '',
          isVerified: creator?.isVerified,
          isOnline: true,
        },
      ],
      unreadCount: 0,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    handleSendMessage(newConv.id, replyText);
  };

  const handleStartConversationWithUser = (
    targetUserId: string,
    targetUserData?: (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) | null
  ) => {
    let conv = conversations.find((c) =>
      (c.participants || []).some((p) => p.id === targetUserId || p.username === targetUserData?.username)
    );

    if (!conv) {
      const creator = creators.find((c) => c.id === targetUserId);
      const newConv: SocialConversation = {
        id: `conv-${Date.now()}`,
        type: 'direct',
        participants: [
          {
            id: targetUserId,
            name: targetUserData?.name || creator?.name || 'Creator',
            username: targetUserData?.username || creator?.username || 'creator',
            avatar: targetUserData?.avatar || creator?.avatar || '',
            isVerified: targetUserData?.isVerified ?? creator?.isVerified,
            isOnline: true,
          },
        ],
        unreadCount: 0,
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      conv = newConv;
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
      openHome();
    } else if (notif.actorId) {
      openProfile(notif.actorId);
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;
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
  const showMyProfileTab = isMyProfileRoute;

  const isHomeVisible = showHomeTab && !isDeepScreen;
  const isDiscoverVisible = showDiscoverTab && !isDeepScreen;
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
    if (isProfileVisible && profileScrollRef.current) {
      profileScrollRef.current.scrollTop = tabScrollTopRef.current.profile;
    }
  }, [isProfileVisible]);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F2F2F7] dark:bg-black flex justify-center">
      <EnmmoeIntro />

      <div
        id="enmmoe-app-root"
        className="h-screen h-[100dvh] max-h-screen w-full max-w-4xl flex flex-col overflow-hidden relative font-sans select-none bg-white dark:bg-black text-black dark:text-white lg:border-x border-black/[0.06] dark:border-white/[0.08]"
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
            className={
              isHomeVisible
                ? 'flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden'
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
              onOpenBook={openBook}
              onOpenChapter={openChapter}
              onOpenUserProfile={(u) => openProfile(u.id, u)}
              onOpenNotifications={() => setShowNotificationsModal(true)}
              unreadNotificationsCount={unreadNotifsCount}
              subscribedWebtoons={subscribedWebtoons}
              onToggleSubscribe={handleToggleSubscribeWebtoon}
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
              onOpenStory={(idx) => setActiveStoryIndex(idx)}
              onOpenCreateStory={() => setShowCreateModal(true)}
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
              creators={creators}
              posts={posts}
              reels={reels}
              onToggleFollow={handleToggleFollow}
              onOpenReel={() => openHome()}
              onOpenWebtoon={(w) => openBook(w.id)}
              onOpenUserProfile={(u) => openProfile(u.id, u)}
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
              profileUser={null}
              posts={posts}
              reels={reels}
              showBackButton={canGoBack}
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
              onUpdateUser={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
              onOpenBook={openBook}
              onOpenUserProfile={(u) => openProfile(u.id, u)}
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
                  onUpdateUser={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
                  onOpenAuthModal={() => setShowAuthModal(true)}
                  onOpenEditProfile={() => setShowEditProfileModal(true)}
                />
              </motion.div>
            )}

            {currentRoute.type === 'profile' && !isMyProfileRoute && (() => {
              const profileTargetUser =
                currentRoute.user ||
                creators.find((c) => c.id === currentRoute.userId) || {
                  id: currentRoute.userId,
                  name: 'Creator',
                  username: 'creator',
                  avatar: creators[0]?.avatar || '',
                  bio: 'Webtoon Author & Storyteller.',
                  isVerified: false,
                };
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
                    profileUser={profileTargetUser}
                    posts={posts}
                    reels={reels}
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
                    onUpdateUser={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
                    onOpenBook={openBook}
                    onOpenUserProfile={(u) => openProfile(u.id, u)}
                  />
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Book Details (/book/:bookId) */}
          {currentRoute.type === 'book' && (
            <WebtoonReaderModal
              webtoon={ALL_WEBTOONS.find((w) => w.id === currentRoute.bookId) || ALL_WEBTOONS[0]}
              isOpen={true}
              initialTab="episodes"
              onClose={goBack}
              onBack={goBack}
              initialEpisodeNumber={currentRoute.initialEpisodeNumber}
              onSelectChapter={(chId, epNum) => openChapter(chId, currentRoute.bookId, epNum)}
              isSubscribed={subscribedWebtoons[currentRoute.bookId] ?? true}
              onToggleSubscribe={handleToggleSubscribeWebtoon}
              theme={user.theme === 'light' ? 'light' : 'dark'}
            />
          )}

          {/* Full-Screen Reader (/chapter/:chapterId) */}
          {currentRoute.type === 'chapter' && (() => {
            const chapterWebtoon =
              ALL_WEBTOONS.find(
                (w) =>
                  w.id === currentRoute.bookId ||
                  w.episodes.some((e) => e.id === currentRoute.chapterId)
              ) || ALL_WEBTOONS[0];
            return (
              <WebtoonReaderModal
                webtoon={chapterWebtoon}
                isOpen={true}
                initialTab="reader"
                initialEpisodeId={currentRoute.chapterId}
                initialEpisodeNumber={currentRoute.episodeNumber}
                onClose={goBack}
                onBack={goBack}
                onBackToBook={() =>
                  currentRoute.bookId ? openBook(currentRoute.bookId) : goBack()
                }
                onSelectChapter={(chId, epNum) =>
                  openChapter(chId, currentRoute.bookId || chapterWebtoon.id, epNum)
                }
                isSubscribed={subscribedWebtoons[chapterWebtoon.id] ?? true}
                onToggleSubscribe={handleToggleSubscribeWebtoon}
                theme={user.theme === 'light' ? 'light' : 'dark'}
              />
            );
          })()}
        </main>

        {/* Compact iOS Docked Bottom Navigation */}
        {!isDeepScreen && (
          <BottomNav
            activeTab={navActiveTab}
            onTabChange={(tab) => {
              if (tab === navActiveTab && !isDeepScreen) {
                return;
              }
              if (tab === 'home') {
                openHome();
              } else if (tab === 'messages') {
                setActiveConversationId('');
                openMessages();
              } else if (tab === 'profile') {
                openProfile('me');
              } else if (tab === 'discover') {
                openDiscover();
              }
            }}
            unreadMessagesCount={unreadMessagesCount}
            userAvatar={user.avatar}
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

        {messageToForward && (
          <ForwardModal
            isOpen={Boolean(messageToForward)}
            onClose={() => setMessageToForward(null)}
            messageToForward={messageToForward}
            conversations={conversations}
            onForward={(targetConvId, text) => handleSendMessage(targetConvId, text)}
          />
        )}

        {activeStoryIndex !== null && (
          <StoryViewerModal
            stories={stories}
            initialIndex={activeStoryIndex}
            isOpen={activeStoryIndex !== null}
            onClose={() => setActiveStoryIndex(null)}
            onSendStoryReply={handleSendStoryReply}
            onReactStory={(storyId) =>
              setStories((prev) =>
                prev.map((s) => (s.id === storyId ? { ...s, isSeen: true } : s))
              )
            }
            onOpenUserProfile={(u) => {
              setActiveStoryIndex(null);
              openProfile(u.id, u);
            }}
          />
        )}

        <CreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          currentUser={user}
          onPublishPost={handlePublishPost}
          onPublishStory={handlePublishStory}
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
              openProfile(u.id, u);
            }}
          />
        )}

        <NotificationsModal
          isOpen={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllNotifsRead}
          onNotificationClick={handleNotificationClick}
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

        <AnimatePresence>
          {viewingProfileUser && (
            <UserProfileScreen
              isOpen={Boolean(viewingProfileUser)}
              user={viewingProfileUser}
              currentUser={user}
              isFollowing={(user.followingIds || []).includes(viewingProfileUser.id)}
              onToggleFollow={handleToggleFollow}
              onSendMessage={(targetUserId) => {
                const u = viewingProfileUser;
                setViewingProfileUser(null);
                handleStartConversationWithUser(targetUserId, u);
              }}
              onOpenEditProfile={() => {
                setViewingProfileUser(null);
                setShowEditProfileModal(true);
              }}
              onClose={() => setViewingProfileUser(null)}
              isLight={user.theme === 'light'}
            />
          )}
        </AnimatePresence>
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
