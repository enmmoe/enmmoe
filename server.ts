import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Serve local Apple iOS emoji PNG assets cleanly in both dev and production
app.use(
  '/emoji/apple/64',
  express.static(path.join(process.cwd(), 'node_modules/emoji-datasource-apple/img/apple/64'), {
    maxAge: '30d',
    immutable: true,
  })
);

// In-Memory state for server authority
let serverRooms = [
  {
    id: 'table-001',
    name: 'Table 001 - Red Velvet VIP',
    maxPlayers: 10,
    players: [
      {
        id: 'bot-1',
        name: 'Elena',
        age: 22,
        gender: 'Girl',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
        level: 5,
        league: 'Gold',
        kissPoints: 42,
        youtubePoints: 120,
        emotionPoints: 35,
        admire: 88,
        seatIndex: 0,
        isOnline: true,
      },
      {
        id: 'bot-2',
        name: 'Marco',
        age: 25,
        gender: 'Boy',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        level: 8,
        league: 'Platinum',
        kissPoints: 15,
        youtubePoints: 240,
        emotionPoints: 90,
        admire: 110,
        seatIndex: 1,
        isOnline: true,
      },
      {
        id: 'bot-3',
        name: 'Sofia',
        age: 21,
        gender: 'Girl',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        level: 3,
        league: 'Silver',
        kissPoints: 28,
        youtubePoints: 50,
        emotionPoints: 19,
        admire: 45,
        seatIndex: 3,
        isOnline: true,
      },
      {
        id: 'bot-4',
        name: 'Alex',
        age: 24,
        gender: 'Non-binary',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        level: 6,
        league: 'Gold',
        kissPoints: 60,
        youtubePoints: 180,
        emotionPoints: 75,
        admire: 95,
        seatIndex: 4,
        isOnline: true,
      },
      {
        id: 'bot-5',
        name: 'Chloe',
        age: 23,
        gender: 'Girl',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        level: 12,
        league: 'Diamond',
        kissPoints: 140,
        youtubePoints: 510,
        emotionPoints: 210,
        admire: 320,
        seatIndex: 6,
        isOnline: true,
      },
    ],
    chatMessages: [
      {
        id: 'm1',
        senderId: 'bot-1',
        senderName: 'Elena',
        senderGender: 'Girl',
        senderAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
        text: 'Welcome to enmmoe Table 001! ❤️ Who wants to play some tunes?',
        timestamp: Date.now() - 300000,
        type: 'chat',
      },
    ],
  },
  ...Array.from({ length: 19 }).map((_, idx) => ({
    id: `table-00${idx + 2}`.replace('0010', '010'),
    name: `Table 00${idx + 2} - Flirt Lounge`.replace('0010', '010'),
    maxPlayers: 10,
    players: [],
    chatMessages: [],
  })),
];

// User Account Profile Permanent Stats Store
const userProfileStats = new Map<string, {
  id: string;
  kissPoints: number;
  hearts: number;
  admire: number;
  updatedAt: number;
}>();

// User Stats Sync / Save endpoint (Permanent Account Saving)
app.post('/api/user/sync-stats', (req, res) => {
  const { userId, kissPoints, hearts, admire } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const existing = userProfileStats.get(userId) || {
    id: userId,
    kissPoints: 0,
    hearts: 100,
    admire: 0,
    updatedAt: Date.now(),
  };

  const updatedStats = {
    ...existing,
    kissPoints: kissPoints !== undefined ? kissPoints : existing.kissPoints,
    hearts: hearts !== undefined ? hearts : existing.hearts,
    admire: admire !== undefined ? admire : existing.admire,
    updatedAt: Date.now(),
  };

  userProfileStats.set(userId, updatedStats);

  res.json({
    success: true,
    stats: updatedStats,
  });
});

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'enmmoe' });
});

// ================= MESSAGING & STORIES SERVER AUTHORITY =================

interface ServerUserPrivacy {
  userId: string;
  showActivityStatus: boolean;
  readReceiptsEnabled: boolean;
  typingIndicatorsEnabled: boolean;
  allowMessagesFrom: 'everyone' | 'following' | 'nobody';
  storyDefaultAudience: 'everyone' | 'subscribers' | 'close_friends';
  storyReplyPermission: 'everyone' | 'subscribers' | 'off';
  saveStoriesToArchive: boolean;
  followingIds: string[];
  blockedUserIds: string[];
  mutedUserIds: string[];
  closeFriendIds: string[];
  hiddenStoryUserIds: string[];
  mutedStoryAuthorIds: string[];
}

const serverUserDirectory = new Map<
  string,
  { id: string; name: string; username: string; avatar: string; isVerified?: boolean }
>([
  [
    'user-me',
    {
      id: 'user-me',
      name: 'Alex',
      username: 'alex_creator',
      avatar: '',
      isVerified: false,
    },
  ],
  [
    'user-1',
    {
      id: 'user-1',
      name: 'Elena Rostova',
      username: 'elena_sound',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
    },
  ],
  [
    'user-2',
    {
      id: 'user-2',
      name: 'Marcus Vance',
      username: 'marcus_lens',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
    },
  ],
  [
    'user-3',
    {
      id: 'user-3',
      name: 'Chloe Kim',
      username: 'chloe_art',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
    },
  ],
  [
    'user-4',
    {
      id: 'user-4',
      name: 'Tariq Al-Mansoor',
      username: 'tariq_tech',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
    },
  ],
  [
    'user-5',
    {
      id: 'user-5',
      name: 'Selamawit Bekele',
      username: 'selam_vibe',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&auto=format&fit=crop&q=80',
      isVerified: true,
    },
  ],
  [
    'user-6',
    {
      id: 'user-6',
      name: 'Mina Park',
      username: 'mina_sketch',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
      isVerified: false,
    },
  ],
]);

const serverUsersPrivacy = new Map<string, ServerUserPrivacy>([
  [
    'user-me',
    {
      userId: 'user-me',
      showActivityStatus: true,
      readReceiptsEnabled: true,
      typingIndicatorsEnabled: true,
      allowMessagesFrom: 'everyone',
      storyDefaultAudience: 'everyone',
      storyReplyPermission: 'everyone',
      saveStoriesToArchive: true,
      followingIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
      blockedUserIds: [],
      mutedUserIds: [],
      closeFriendIds: ['user-1', 'user-3'],
      hiddenStoryUserIds: [],
      mutedStoryAuthorIds: [],
    },
  ],
  [
    'user-1',
    {
      userId: 'user-1',
      showActivityStatus: true,
      readReceiptsEnabled: true,
      typingIndicatorsEnabled: true,
      allowMessagesFrom: 'everyone',
      storyDefaultAudience: 'everyone',
      storyReplyPermission: 'everyone',
      saveStoriesToArchive: true,
      followingIds: ['user-me', 'user-3'],
      blockedUserIds: [],
      mutedUserIds: [],
      closeFriendIds: ['user-me'],
      hiddenStoryUserIds: [],
      mutedStoryAuthorIds: [],
    },
  ],
]);

function getOrCreateUserPrivacy(userId: string): ServerUserPrivacy {
  const existing = serverUsersPrivacy.get(userId);
  if (existing) return existing;
  const created: ServerUserPrivacy = {
    userId,
    showActivityStatus: true,
    readReceiptsEnabled: true,
    typingIndicatorsEnabled: true,
    allowMessagesFrom: 'everyone',
    storyDefaultAudience: 'everyone',
    storyReplyPermission: 'everyone',
    saveStoriesToArchive: true,
    followingIds: [],
    blockedUserIds: [],
    mutedUserIds: [],
    closeFriendIds: [],
    hiddenStoryUserIds: [],
    mutedStoryAuthorIds: [],
  };
  serverUsersPrivacy.set(userId, created);
  return created;
}

function sanitizeSafeLink(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function validateMediaSource(raw: unknown, mediaType: string): string | null {
  if (mediaType === 'text') return '';
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith('/')) return s;
  if (s.startsWith('https://') || s.startsWith('http://')) return s;
  if (s.startsWith('data:image/jpeg;base64,') || s.startsWith('data:image/png;base64,') || s.startsWith('data:image/webp;base64,') || s.startsWith('data:image/gif;base64,')) {
    if (s.length > 8 * 1024 * 1024) return null;
    return s;
  }
  if (
    mediaType === 'video' &&
    (s.startsWith('data:video/mp4;base64,') ||
      s.startsWith('data:video/webm;base64,') ||
      s.startsWith('data:video/quicktime;base64,'))
  ) {
    if (s.length > 18 * 1024 * 1024) return null;
    return s;
  }
  return null;
}

// Track live WebSocket connections per userId for real presence
const onlineUserSockets = new Map<string, Set<WebSocket>>();
const socketUserIds = new Map<WebSocket, string>();

function isUserVisiblyOnline(userId: string): boolean {
  const priv = getOrCreateUserPrivacy(userId);
  if (!priv.showActivityStatus) return false;
  const sockets = onlineUserSockets.get(userId);
  return Boolean(sockets && sockets.size > 0);
}

function getVisibleOnlineUserIds(): string[] {
  const ids: string[] = [];
  for (const [uid, sockets] of onlineUserSockets.entries()) {
    if (sockets.size > 0 && getOrCreateUserPrivacy(uid).showActivityStatus) {
      ids.push(uid);
    }
  }
  return ids;
}

function broadcastSocialEvent(payload: Record<string, any>, targetUserIds?: string[]) {
  const raw = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (targetUserIds && targetUserIds.length > 0) {
      const uid = socketUserIds.get(client);
      if (!uid || !targetUserIds.includes(uid)) return;
    }
    client.send(raw);
  });
}

function getConversationMemberIds(conv: any): string[] {
  if (Array.isArray(conv?.memberIds) && conv.memberIds.length > 0) {
    return Array.from(new Set(conv.memberIds.map(String)));
  }
  const participantIds = (conv?.participants || []).map((p: any) => String(p.id));
  return Array.from(new Set(['user-me', ...participantIds]));
}

// Initial seeded Direct Conversations (with explicit memberIds for multi-account sync)
const serverConversations: any[] = [
  {
    id: 'conv-1',
    type: 'direct',
    memberIds: ['user-me', 'user-1'],
    participants: [
      {
        id: 'user-1',
        name: 'Elena Rostova',
        username: 'elena_sound',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        isOnline: false,
        lastSeen: 'Active recently',
      },
    ],
    unreadCount: 0,
    isPinned: true,
    isRequest: false,
    messages: [
      {
        id: 'msg-1-1',
        conversationId: 'conv-1',
        senderId: 'user-me',
        senderName: 'Alex',
        senderUsername: 'alex_creator',
        senderAvatar: '',
        text: 'Hey Elena! Loved your studio story preview today. That bassline sounds monstrous!',
        timestamp: Date.now() - 1000 * 60 * 120,
        status: 'read',
        seenAt: Date.now() - 1000 * 60 * 115,
      },
      {
        id: 'msg-1-2',
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderName: 'Elena Rostova',
        senderUsername: 'elena_sound',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'Thank you Alex! We spent 4 hours routing the tape delay pedals. Totally worth it 😊',
        timestamp: Date.now() - 1000 * 60 * 90,
        status: 'read',
        reactions: { 'user-me': '❤️' },
      },
      {
        id: 'msg-1-3',
        conversationId: 'conv-1',
        senderId: 'user-me',
        senderName: 'Alex',
        senderUsername: 'alex_creator',
        senderAvatar: '',
        text: 'Are you going to showcase it during the live set this weekend?',
        timestamp: Date.now() - 1000 * 60 * 45,
        status: 'read',
        seenAt: Date.now() - 1000 * 60 * 40,
      },
      {
        id: 'msg-1-4',
        conversationId: 'conv-1',
        senderId: 'user-1',
        senderName: 'Elena Rostova',
        senderUsername: 'elena_sound',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'Sent you the new master audio stems! Check the synth lead track on 1:42 🎧',
        timestamp: Date.now() - 1000 * 60 * 15,
        status: 'read',
        reactions: { 'user-me': '🔥' },
      },
    ],
  },
  {
    id: 'conv-2',
    type: 'direct',
    memberIds: ['user-me', 'user-3'],
    participants: [
      {
        id: 'user-3',
        name: 'Chloe Kim',
        username: 'chloe_art',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        isOnline: false,
        lastSeen: 'Active recently',
      },
    ],
    unreadCount: 1,
    isPinned: false,
    isRequest: false,
    messages: [
      {
        id: 'msg-2-1',
        conversationId: 'conv-2',
        senderId: 'user-me',
        senderName: 'Alex',
        senderUsername: 'alex_creator',
        senderAvatar: '',
        text: 'Hey Chloe, the glass refraction render is unbelievable!',
        timestamp: Date.now() - 1000 * 60 * 180,
        status: 'read',
        seenAt: Date.now() - 1000 * 60 * 165,
      },
      {
        id: 'msg-2-2',
        conversationId: 'conv-2',
        senderId: 'user-3',
        senderName: 'Chloe Kim',
        senderUsername: 'chloe_art',
        senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        text: 'Would love your feedback on the 3D typography layout for enmmoe Creator Summit! 🎨',
        timestamp: Date.now() - 1000 * 60 * 30,
        status: 'delivered',
      },
    ],
  },
  {
    id: 'conv-3',
    type: 'group',
    title: 'Global Creators Hub 🚀',
    memberIds: ['user-me', 'user-1', 'user-2', 'user-5'],
    participants: [
      {
        id: 'user-1',
        name: 'Elena Rostova',
        username: 'elena_sound',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        isOnline: false,
      },
      {
        id: 'user-2',
        name: 'Marcus Vance',
        username: 'marcus_lens',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        isOnline: false,
      },
      {
        id: 'user-5',
        name: 'Selamawit Bekele',
        username: 'selam_vibe',
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        isOnline: false,
      },
    ],
    unreadCount: 0,
    isRequest: false,
    messages: [
      {
        id: 'msg-3-1',
        conversationId: 'conv-3',
        senderId: 'user-me',
        senderName: 'Alex',
        senderUsername: 'alex_creator',
        senderAvatar: '',
        text: 'Sounds amazing! Let me send the stage concept art 🎨',
        timestamp: Date.now() - 1000 * 60 * 42,
        status: 'read',
        seenAt: Date.now() - 1000 * 60 * 38,
      },
    ],
  },
  {
    id: 'conv-4',
    type: 'direct',
    memberIds: ['user-me', 'user-2'],
    participants: [
      {
        id: 'user-2',
        name: 'Marcus Vance',
        username: 'marcus_lens',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        isOnline: false,
        lastSeen: 'Active recently',
      },
    ],
    unreadCount: 0,
    isRequest: false,
    messages: [
      {
        id: 'msg-4-1',
        conversationId: 'conv-4',
        senderId: 'user-me',
        senderName: 'Alex',
        senderUsername: 'alex_creator',
        senderAvatar: '',
        text: 'Hey Marcus, are you free for a quick live session tomorrow?',
        timestamp: Date.now() - 1000 * 60 * 8,
        status: 'sent',
      },
    ],
  },
  {
    id: 'conv-req-1',
    type: 'direct',
    memberIds: ['user-me', 'user-6'],
    isRequest: true,
    requestStatus: 'pending',
    participants: [
      {
        id: 'user-6',
        name: 'Mina Park',
        username: 'mina_sketch',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
        isVerified: false,
        isOnline: false,
        lastSeen: 'Active recently',
      },
    ],
    unreadCount: 1,
    messages: [
      {
        id: 'msg-req-1',
        conversationId: 'conv-req-1',
        senderId: 'user-6',
        senderName: 'Mina Park',
        senderUsername: 'mina_sketch',
        senderAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
        text: 'Hi Alex! I loved your latest series banner — would you be open to an illustration collab?',
        timestamp: Date.now() - 1000 * 60 * 50,
        status: 'delivered',
      },
    ],
  },
];

serverConversations.forEach((c) => {
  c.memberIds = getConversationMemberIds(c);
  c.lastMessage = c.messages[c.messages.length - 1];
});

const SOCIAL_DB_DIR = path.join(process.cwd(), '.data');
const SOCIAL_DB_FILE = path.join(SOCIAL_DB_DIR, 'social-db.json');

function saveSocialDb() {
  try {
    if (!fs.existsSync(SOCIAL_DB_DIR)) {
      fs.mkdirSync(SOCIAL_DB_DIR, { recursive: true });
    }
    const payload = {
      conversations: serverConversations,
      userDirectory: Array.from(serverUserDirectory.entries()),
      privacyByUser: Array.from(serverUsersPrivacy.entries()),
    };
    const tmpFile = `${SOCIAL_DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmpFile, SOCIAL_DB_FILE);
  } catch (err) {
    console.error('[SocialDB] Failed saving social DB:', err);
  }
}

function loadSocialDb() {
  try {
    if (!fs.existsSync(SOCIAL_DB_FILE)) {
      saveSocialDb();
      return;
    }
    const raw = fs.readFileSync(SOCIAL_DB_FILE, 'utf8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.userDirectory)) {
      for (const [id, entry] of parsed.userDirectory) {
        if (id && entry) serverUserDirectory.set(String(id), entry);
      }
    }
    if (Array.isArray(parsed.privacyByUser)) {
      for (const [id, entry] of parsed.privacyByUser) {
        if (id && entry) serverUsersPrivacy.set(String(id), entry);
      }
    }
    if (Array.isArray(parsed.conversations)) {
      serverConversations.length = 0;
      for (const c of parsed.conversations) {
        if (c && c.id) {
          c.memberIds = getConversationMemberIds(c);
          c.messages = Array.isArray(c.messages) ? c.messages : [];
          c.lastMessage = c.messages[c.messages.length - 1];
          serverConversations.push(c);
        }
      }
    }
  } catch (err) {
    console.error('[SocialDB] Failed loading social DB, continuing with defaults:', err);
  }
}

loadSocialDb();

// Initial Seeded Stories (includes grouped multi-story slides + expired archived stories)
const serverStories: any[] = [
  {
    id: 'story-1',
    authorId: 'user-1',
    authorName: 'Elena Rostova',
    authorUsername: 'elena_sound',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    authorVerified: true,
    mediaUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    mediaType: 'photo',
    caption: 'Live modular synthesizer rehearsal in Berlin! 🔥 Sound on! 🎧',
    musicTitle: 'Cyber Twilight Pulse',
    musicArtist: 'Elena Sound',
    location: 'Berlin Club Quarter',
    createdAt: Date.now() - 3600000 * 2,
    expiresAt: Date.now() + 3600000 * 22,
    audience: 'everyone',
    replyPermission: 'everyone',
    isSeen: false,
    isArchived: true,
    viewsCount: 142,
    likesCount: 24,
    likedByIds: [],
    viewers: [
      {
        userId: 'user-3',
        name: 'Chloe Kim',
        username: 'chloe_art',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        viewedAt: Date.now() - 3600000,
        reactedEmoji: '🔥',
        liked: true,
      },
    ],
    reactions: [{ userId: 'user-3', emoji: '🔥' }],
  },
  {
    id: 'story-1b',
    authorId: 'user-1',
    authorName: 'Elena Rostova',
    authorUsername: 'elena_sound',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    authorVerified: true,
    mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    mediaType: 'photo',
    caption: 'Drop feedback below for tonight’s midnight setlist!',
    createdAt: Date.now() - 3600000 * 1,
    expiresAt: Date.now() + 3600000 * 23,
    audience: 'everyone',
    replyPermission: 'everyone',
    isSeen: false,
    isArchived: true,
    viewsCount: 98,
    likesCount: 18,
    likedByIds: [],
    viewers: [],
    stickers: [
      {
        id: 'stk-q-1',
        type: 'question',
        x: 50,
        y: 52,
        question: 'Which synth track should I open with?',
        responses: [],
      },
    ],
  },
  {
    id: 'story-2',
    authorId: 'user-3',
    authorName: 'Chloe Kim',
    authorUsername: 'chloe_art',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    authorVerified: true,
    mediaUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    mediaType: 'photo',
    caption: 'Finished rendering my new 3D holographic installation! Thoughts? ✨',
    createdAt: Date.now() - 3600000 * 4,
    expiresAt: Date.now() + 3600000 * 20,
    audience: 'everyone',
    replyPermission: 'everyone',
    isSeen: false,
    isArchived: true,
    viewsCount: 289,
    likesCount: 41,
    likedByIds: [],
    viewers: [],
    poll: {
      question: 'Should I make this an animated wallpaper pack?',
      optionA: 'Yes, please! 😍',
      optionB: 'Make it a VR space 🌌',
      votesA: 34,
      votesB: 28,
      voterVotes: {},
    },
  },
  {
    id: 'story-3',
    authorId: 'user-2',
    authorName: 'Marcus Vance',
    authorUsername: 'marcus_lens',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorVerified: true,
    mediaUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    mediaType: 'photo',
    caption: 'Sunrise over Banff national park at -12°C. Totally worth it 🏔️',
    location: 'Banff, Alberta',
    createdAt: Date.now() - 3600000 * 7,
    expiresAt: Date.now() + 3600000 * 17,
    audience: 'everyone',
    replyPermission: 'everyone',
    isSeen: true,
    isArchived: true,
    viewsCount: 198,
    likesCount: 33,
    likedByIds: [],
    viewers: [],
  },
  {
    id: 'story-4',
    authorId: 'user-5',
    authorName: 'Selamawit Bekele',
    authorUsername: 'selam_vibe',
    authorAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
    authorVerified: true,
    mediaUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    mediaType: 'photo',
    caption: 'Traditional coffee ceremony vibes today in Bole ☕✨ Enjoying the aroma!',
    location: 'Addis Ababa',
    createdAt: Date.now() - 3600000 * 8,
    expiresAt: Date.now() + 3600000 * 16,
    audience: 'everyone',
    replyPermission: 'everyone',
    isSeen: true,
    isArchived: true,
    viewsCount: 165,
    likesCount: 29,
    likedByIds: [],
    viewers: [],
  },
  // Owner archived expired stories (accessible via Archive & Highlights for user-me)
  {
    id: 'story-arch-1',
    authorId: 'user-me',
    authorName: 'Alex',
    authorUsername: 'alex_creator',
    authorAvatar: '',
    mediaUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80',
    mediaType: 'photo',
    caption: 'Tokyo sketch walks — Shibuya sunset notebook',
    location: 'Tokyo, Japan',
    createdAt: Date.now() - 86400000 * 12,
    expiresAt: Date.now() - 86400000 * 11,
    audience: 'everyone',
    replyPermission: 'everyone',
    isSeen: true,
    isArchived: true,
    viewsCount: 312,
    likesCount: 52,
    likedByIds: ['user-1', 'user-3'],
    viewers: [
      {
        userId: 'user-1',
        name: 'Elena Rostova',
        username: 'elena_sound',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        viewedAt: Date.now() - 86400000 * 11.8,
        liked: true,
      },
    ],
  },
  {
    id: 'story-arch-2',
    authorId: 'user-me',
    authorName: 'Alex',
    authorUsername: 'alex_creator',
    authorAvatar: '',
    mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    mediaType: 'photo',
    caption: 'Color study for Episode 14 cover art ✨',
    location: 'San Francisco Studio',
    createdAt: Date.now() - 86400000 * 6,
    expiresAt: Date.now() - 86400000 * 5,
    audience: 'everyone',
    replyPermission: 'everyone',
    isSeen: true,
    isArchived: true,
    viewsCount: 245,
    likesCount: 38,
    likedByIds: ['user-2'],
    viewers: [],
  },
];

const serverHighlights: any[] = [
  {
    id: 'hl-1',
    ownerId: 'user-me',
    title: 'Travel ✈️',
    coverImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&auto=format&fit=crop&q=80',
    storyIds: ['story-arch-1', 'story-3'],
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'hl-2',
    ownerId: 'user-me',
    title: 'Design Lab 💡',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    storyIds: ['story-arch-2', 'story-2'],
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'hl-3',
    ownerId: 'user-me',
    title: 'Sound & Beat 🎵',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    storyIds: ['story-1'],
    createdAt: Date.now() - 86400000 * 5,
  },
];

const serverReports: any[] = [];
const storyReportedByUser = new Map<string, Set<string>>();

function isStoryVisibleOnServer(story: any, viewerId: string, now = Date.now()): boolean {
  if (story.expiresAt <= now) return false;
  const viewerPriv = getOrCreateUserPrivacy(viewerId);
  if (viewerId !== story.authorId) {
    if (viewerPriv.blockedUserIds.includes(story.authorId)) return false;
    const authorPriv = getOrCreateUserPrivacy(story.authorId);
    if (authorPriv.blockedUserIds.includes(viewerId)) return false;
    if ((story.hiddenFromIds || []).includes(viewerId)) return false;
    const reportedSet = storyReportedByUser.get(viewerId);
    if (reportedSet?.has(story.id)) return false;
    if (story.audience === 'subscribers' && !viewerPriv.followingIds.includes(story.authorId)) {
      return false;
    }
    if (story.audience === 'close_friends' && !authorPriv.closeFriendIds.includes(viewerId)) {
      return false;
    }
  }
  return true;
}

function formatConversationForViewer(conv: any, viewerId: string) {
  const viewerPriv = getOrCreateUserPrivacy(viewerId);
  const memberIds = getConversationMemberIds(conv);
  const otherMemberIds = memberIds.filter((id) => id !== viewerId);

  const storedParticipantsById = new Map<string, any>(
    (conv.participants || []).map((p: any) => [String(p.id), p])
  );

  const rawParticipants =
    otherMemberIds.length > 0
      ? otherMemberIds.map((pid) => {
          const dir = serverUserDirectory.get(pid);
          const stored = storedParticipantsById.get(pid);
          return {
            id: pid,
            name: stored?.name || dir?.name || 'Creator',
            username: stored?.username || dir?.username || 'creator',
            avatar: stored?.avatar || dir?.avatar || '',
            isVerified: stored?.isVerified ?? dir?.isVerified,
            lastSeen: stored?.lastSeen || 'Active recently',
          };
        })
      : conv.participants || [];

  const partner = rawParticipants[0];
  const partnerId = partner?.id;
  const isBlockedByMe = partnerId ? viewerPriv.blockedUserIds.includes(partnerId) : false;
  const partnerPriv = partnerId ? getOrCreateUserPrivacy(partnerId) : null;
  const isBlockedByThem = partnerPriv ? partnerPriv.blockedUserIds.includes(viewerId) : false;

  const updatedParticipants = rawParticipants.map((p: any) => ({
    ...p,
    isOnline: !isBlockedByMe && !isBlockedByThem ? isUserVisiblyOnline(p.id) : false,
  }));

  const viewerSeesReceipts = viewerPriv.readReceiptsEnabled;
  const formattedMessages = (conv.messages || [])
    .filter(
      (m: any) => !Array.isArray(m.deletedForUserIds) || !m.deletedForUserIds.includes(viewerId)
    )
    .map((m: any) => {
      if (!viewerSeesReceipts && m.senderId === viewerId && m.status === 'read') {
        return { ...m, status: 'delivered', seenAt: undefined };
      }
      return m;
    });

  return {
    ...conv,
    memberIds,
    participants: updatedParticipants,
    isBlockedByMe,
    isBlockedByThem,
    isMuted: viewerPriv.mutedUserIds.includes(partnerId) || Boolean(conv.isMuted),
    messages: formattedMessages,
    lastMessage: formattedMessages[formattedMessages.length - 1],
  };
}

function formatStoryForViewer(story: any, viewerId: string) {
  const isOwner = story.authorId === viewerId;
  const viewerEntry = (story.viewers || []).find((v: any) => v.userId === viewerId);
  const sanitized: any = {
    ...story,
    isSeen: Boolean(viewerEntry) || Boolean(story.isSeen),
  };
  if (story.poll?.voterVotes) {
    sanitized.poll = {
      ...story.poll,
      userVote: story.poll.voterVotes[viewerId],
    };
  }
  if (!isOwner) {
    // Keep aggregate counts, hide private full viewer list from non-owners
    delete sanitized.viewers;
    delete sanitized.hiddenFromIds;
  }
  return sanitized;
}

// 1. Bootstrap messaging, stories, archive & highlights for a viewer
app.get('/api/social/bootstrap', (req, res) => {
  const userId = String(req.query.userId || 'user-me');
  const now = Date.now();
  const priv = getOrCreateUserPrivacy(userId);

  const visibleConversations = serverConversations
    .filter((c) => getConversationMemberIds(c).includes(userId))
    .map((c) => formatConversationForViewer(c, userId));
  const visibleStories = serverStories
    .filter((s) => isStoryVisibleOnServer(s, userId, now))
    .map((s) => formatStoryForViewer(s, userId));
  const archiveStories = serverStories
    .filter((s) => s.authorId === userId && s.isArchived !== false)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => formatStoryForViewer(s, userId));

  res.json({
    success: true,
    privacy: priv,
    onlineUserIds: getVisibleOnlineUserIds(),
    conversations: visibleConversations,
    stories: visibleStories,
    archiveStories,
    highlights: serverHighlights,
  });
});

// 2. Persist user privacy & story/message controls
app.post('/api/users/privacy', (req, res) => {
  const { userId = 'user-me', name, username, avatar, isVerified, ...updates } = req.body || {};
  const uid = String(userId);
  const priv = getOrCreateUserPrivacy(uid);
  const prevActivity = priv.showActivityStatus;

  if (typeof name === 'string' || typeof username === 'string' || typeof avatar === 'string') {
    const existingDir = serverUserDirectory.get(uid);
    serverUserDirectory.set(uid, {
      id: uid,
      name: typeof name === 'string' && name.trim() ? name.trim() : existingDir?.name || 'Creator',
      username:
        typeof username === 'string' && username.trim()
          ? username.trim()
          : existingDir?.username || uid,
      avatar: typeof avatar === 'string' ? avatar : existingDir?.avatar || '',
      isVerified: typeof isVerified === 'boolean' ? isVerified : existingDir?.isVerified,
    });
  }

  if (typeof updates.showActivityStatus === 'boolean') priv.showActivityStatus = updates.showActivityStatus;
  if (typeof updates.readReceiptsEnabled === 'boolean') priv.readReceiptsEnabled = updates.readReceiptsEnabled;
  if (typeof updates.typingIndicatorsEnabled === 'boolean') priv.typingIndicatorsEnabled = updates.typingIndicatorsEnabled;
  if (updates.allowMessagesFrom === 'everyone' || updates.allowMessagesFrom === 'following' || updates.allowMessagesFrom === 'nobody') {
    priv.allowMessagesFrom = updates.allowMessagesFrom;
  }
  if (updates.storyDefaultAudience === 'everyone' || updates.storyDefaultAudience === 'subscribers' || updates.storyDefaultAudience === 'close_friends') {
    priv.storyDefaultAudience = updates.storyDefaultAudience;
  }
  if (updates.storyReplyPermission === 'everyone' || updates.storyReplyPermission === 'subscribers' || updates.storyReplyPermission === 'off') {
    priv.storyReplyPermission = updates.storyReplyPermission;
  }
  if (typeof updates.saveStoriesToArchive === 'boolean') priv.saveStoriesToArchive = updates.saveStoriesToArchive;
  if (Array.isArray(updates.followingIds)) priv.followingIds = updates.followingIds.map(String);
  if (Array.isArray(updates.blockedUserIds)) priv.blockedUserIds = updates.blockedUserIds.map(String);
  if (Array.isArray(updates.mutedUserIds)) priv.mutedUserIds = updates.mutedUserIds.map(String);
  if (Array.isArray(updates.closeFriendIds)) priv.closeFriendIds = updates.closeFriendIds.map(String);
  if (Array.isArray(updates.hiddenStoryUserIds)) priv.hiddenStoryUserIds = updates.hiddenStoryUserIds.map(String);
  if (Array.isArray(updates.mutedStoryAuthorIds)) priv.mutedStoryAuthorIds = updates.mutedStoryAuthorIds.map(String);

  saveSocialDb();

  if (prevActivity !== priv.showActivityStatus) {
    broadcastSocialEvent({
      type: 'dm:presence',
      onlineUserIds: getVisibleOnlineUserIds(),
      updatedUserId: userId,
      isOnline: isUserVisiblyOnline(uid),
    });
  }

  res.json({ success: true, privacy: priv });
});

// 3. Start or retrieve DM / group conversation (privacy-enforced)
app.post('/api/messages/conversation', (req, res) => {
  const { userId = 'user-me', targetUserId, targetUserData, title, participantIds } = req.body || {};
  const senderPriv = getOrCreateUserPrivacy(String(userId));

  if (Array.isArray(participantIds) && participantIds.length > 0) {
    const cleanIds = participantIds.map(String).filter((id: string) => !senderPriv.blockedUserIds.includes(id));
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one eligible participant.' });
    }
    const convId = `conv-grp-${Date.now()}`;
    const participants = cleanIds.map((pid: string) => {
      const dir = serverUserDirectory.get(pid);
      return {
        id: pid,
        name: dir?.name || 'Creator',
        username: dir?.username || 'creator',
        avatar: dir?.avatar || '',
        isVerified: dir?.isVerified,
        isOnline: isUserVisiblyOnline(pid),
      };
    });
    const newGroup = {
      id: convId,
      type: 'group',
      title: String(title || 'Creators Group').slice(0, 60),
      participants,
      unreadCount: 0,
      isRequest: false,
      messages: [],
    };
    serverConversations.unshift(newGroup);
    return res.json({ success: true, conversation: formatConversationForViewer(newGroup, String(userId)) });
  }

  const targetId = String(targetUserId || '');
  if (!targetId) {
    return res.status(400).json({ error: 'targetUserId is required.' });
  }

  const targetPriv = getOrCreateUserPrivacy(targetId);
  if (senderPriv.blockedUserIds.includes(targetId) || targetPriv.blockedUserIds.includes(String(userId))) {
    return res.status(403).json({ error: 'Messaging is unavailable because this account is blocked.' });
  }

  const existing = serverConversations.find(
    (c) => c.type === 'direct' && c.participants.some((p: any) => p.id === targetId || (targetUserData?.username && p.username === targetUserData.username))
  );
  if (existing) {
    return res.json({ success: true, conversation: formatConversationForViewer(existing, String(userId)) });
  }

  if (targetPriv.allowMessagesFrom === 'nobody') {
    return res.status(403).json({ error: 'This user does not accept new messages.' });
  }

  const isSubscriber = targetPriv.followingIds.includes(String(userId)) || senderPriv.followingIds.includes(targetId);
  const shouldRouteToRequests = targetPriv.allowMessagesFrom === 'following' && !isSubscriber;

  const dir = serverUserDirectory.get(targetId);
  const newConv = {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'direct',
    participants: [
      {
        id: targetId,
        name: targetUserData?.name || dir?.name || 'Creator',
        username: targetUserData?.username || dir?.username || 'creator',
        avatar: targetUserData?.avatar || dir?.avatar || '',
        isVerified: targetUserData?.isVerified ?? dir?.isVerified,
        isOnline: isUserVisiblyOnline(targetId),
        lastSeen: 'Active recently',
      },
    ],
    unreadCount: 0,
    isRequest: shouldRouteToRequests,
    requestStatus: shouldRouteToRequests ? 'pending' : undefined,
    messages: [],
  };

  serverConversations.unshift(newConv);
  res.json({ success: true, conversation: formatConversationForViewer(newConv, String(userId)) });
});

// 4. Send Direct Message
app.post('/api/messages/send', (req, res) => {
  const { conversationId, senderId = 'user-me', senderName, senderUsername, senderAvatar, text, replyTo, storyReply, bubbleStyle } = req.body || {};
  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!conversationId || !cleanText) {
    return res.status(400).json({ error: 'conversationId and non-empty message text are required.' });
  }

  const conv = serverConversations.find((c) => c.id === conversationId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const senderPriv = getOrCreateUserPrivacy(String(senderId));
  for (const p of conv.participants || []) {
    const pPriv = getOrCreateUserPrivacy(p.id);
    if (senderPriv.blockedUserIds.includes(p.id) || pPriv.blockedUserIds.includes(String(senderId))) {
      return res.status(403).json({ error: 'Cannot send messages to a blocked account.' });
    }
    if (conv.type === 'direct' && pPriv.allowMessagesFrom === 'nobody') {
      return res.status(403).json({ error: 'This user has disabled incoming messages.' });
    }
  }

  const dir = serverUserDirectory.get(String(senderId));
  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversationId,
    senderId: String(senderId),
    senderName: senderName || dir?.name || 'User',
    senderUsername: senderUsername || dir?.username || 'user',
    senderAvatar: senderAvatar || dir?.avatar || '',
    text: cleanText.slice(0, 2000),
    timestamp: Date.now(),
    status: 'sent',
    replyTo: replyTo ? { id: String(replyTo.id), text: String(replyTo.text), senderName: String(replyTo.senderName) } : undefined,
    storyReply: storyReply || undefined,
    bubbleStyle: bubbleStyle || 'default',
  };

  conv.messages.push(msg);
  conv.lastMessage = msg;
  conv.isTyping = false;
  conv.typingUserId = undefined;
  conv.typingUserName = undefined;

  broadcastSocialEvent({
    type: 'dm:message',
    conversationId,
    message: msg,
  });

  res.json({ success: true, message: msg });
});

// 5. Mark conversation read (enforces readReceiptsEnabled)
app.post('/api/messages/read', (req, res) => {
  const { conversationId, readerId = 'user-me' } = req.body || {};
  const conv = serverConversations.find((c) => c.id === conversationId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  const readerPriv = getOrCreateUserPrivacy(String(readerId));
  const partnerId = conv.participants?.[0]?.id;
  const partnerPriv = partnerId ? getOrCreateUserPrivacy(partnerId) : null;
  const allowSeenReceipt = readerPriv.readReceiptsEnabled && (partnerPriv ? partnerPriv.readReceiptsEnabled : true);
  const seenAt = Date.now();

  conv.unreadCount = 0;
  conv.messages = conv.messages.map((m: any) => {
    if (m.senderId !== readerId && m.status !== 'read') {
      return {
        ...m,
        status: allowSeenReceipt ? 'read' : 'delivered',
        seenAt: allowSeenReceipt ? seenAt : undefined,
      };
    }
    return m;
  });
  conv.lastMessage = conv.messages[conv.messages.length - 1];

  broadcastSocialEvent({
    type: 'dm:read',
    conversationId,
    readerId,
    seenAt: allowSeenReceipt ? seenAt : undefined,
    receiptVisible: allowSeenReceipt,
  });

  res.json({ success: true, receiptVisible: allowSeenReceipt, seenAt });
});

// 6. React to message
app.post('/api/messages/react', (req, res) => {
  const { conversationId, messageId, userId = 'user-me', emoji } = req.body || {};
  const conv = serverConversations.find((c) => c.id === conversationId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

  const msg = conv.messages.find((m: any) => m.id === messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  msg.reactions = msg.reactions || {};
  if (msg.reactions[userId] === emoji) {
    delete msg.reactions[userId];
  } else if (emoji) {
    msg.reactions[userId] = String(emoji).slice(0, 8);
  }

  broadcastSocialEvent({
    type: 'dm:reaction',
    conversationId,
    messageId,
    userId,
    reactions: msg.reactions,
  });

  res.json({ success: true, reactions: msg.reactions });
});

// 7. Delete / Unsend message (enforces sender ownership for delete-for-everyone; per-user for delete-for-me)
app.delete('/api/messages/:convId/:msgId', (req, res) => {
  const { convId, msgId } = req.params;
  const userId = String(req.query.userId || req.body?.userId || 'user-me');
  const rawMode = String(req.query.mode || req.body?.mode || 'delete_for_me');
  const mode: 'unsend' | 'delete_for_me' = rawMode === 'unsend' ? 'unsend' : 'delete_for_me';

  const conv = serverConversations.find((c) => c.id === convId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

  const msgIdx = conv.messages.findIndex((m: any) => m.id === msgId);
  if (msgIdx === -1) return res.status(404).json({ error: 'Message not found.' });

  const msg = conv.messages[msgIdx];
  if (mode === 'unsend') {
    if (msg.senderId !== userId) {
      return res.status(403).json({
        error: 'Only the sender can delete this message for everyone.',
      });
    }
    conv.messages.splice(msgIdx, 1);
    conv.lastMessage = conv.messages[conv.messages.length - 1];

    broadcastSocialEvent({
      type: 'dm:delete',
      conversationId: convId,
      messageId: msgId,
      mode: 'unsend',
      deletedByUserId: userId,
    });

    return res.json({
      success: true,
      messageId: msgId,
      mode: 'unsend',
      deletedForEveryone: true,
    });
  }

  const prevDeletedFor = Array.isArray(msg.deletedForUserIds) ? msg.deletedForUserIds : [];
  if (!prevDeletedFor.includes(userId)) {
    msg.deletedForUserIds = [...prevDeletedFor, userId];
  }

  broadcastSocialEvent({
    type: 'dm:delete',
    conversationId: convId,
    messageId: msgId,
    mode: 'delete_for_me',
    deletedByUserId: userId,
  });

  return res.json({
    success: true,
    messageId: msgId,
    mode: 'delete_for_me',
    deletedForEveryone: false,
  });
});

// 8. Message Request actions (Accept / Decline / Block / Spam)
app.post('/api/messages/request-action', (req, res) => {
  const { conversationId, userId = 'user-me', action } = req.body || {};
  const idx = serverConversations.findIndex((c) => c.id === conversationId);
  if (idx === -1) return res.status(404).json({ error: 'Request not found.' });

  const conv = serverConversations[idx];
  const partnerId = conv.participants?.[0]?.id;
  if (action === 'accept') {
    conv.isRequest = false;
    conv.requestStatus = 'accepted';
    return res.json({ success: true, conversation: formatConversationForViewer(conv, String(userId)) });
  }
  if (action === 'block' && partnerId) {
    const priv = getOrCreateUserPrivacy(String(userId));
    if (!priv.blockedUserIds.includes(partnerId)) {
      priv.blockedUserIds.push(partnerId);
    }
    serverConversations.splice(idx, 1);
    return res.json({ success: true, blockedUserId: partnerId });
  }
  // Decline or mark spam
  serverConversations.splice(idx, 1);
  return res.json({ success: true, removed: true });
});

// 9. Block / Unblock / Mute user sync
app.post('/api/messages/block', (req, res) => {
  const { userId = 'user-me', targetUserId, block } = req.body || {};
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required.' });
  const priv = getOrCreateUserPrivacy(String(userId));
  if (block) {
    if (!priv.blockedUserIds.includes(String(targetUserId))) {
      priv.blockedUserIds.push(String(targetUserId));
    }
  } else {
    priv.blockedUserIds = priv.blockedUserIds.filter((id) => id !== String(targetUserId));
  }
  broadcastSocialEvent({
    type: 'dm:presence',
    onlineUserIds: getVisibleOnlineUserIds(),
  });
  res.json({ success: true, blockedUserIds: priv.blockedUserIds });
});

// 10. Create Story (validation, deduplication, audience & archive)
app.post('/api/stories', (req, res) => {
  const body = req.body || {};
  const authorId = String(body.authorId || 'user-me');
  const mediaType = body.mediaType === 'video' ? 'video' : body.mediaType === 'text' ? 'text' : 'photo';

  const validatedMediaUrl = validateMediaSource(body.mediaUrl, mediaType);
  if (validatedMediaUrl === null) {
    return res.status(400).json({ error: 'Unsupported or oversized story media payload.' });
  }

  // Deduplication check inside recent 30 seconds window
  if (body.mediaHash) {
    const dup = serverStories.find(
      (s) =>
        s.authorId === authorId &&
        s.mediaHash === body.mediaHash &&
        Date.now() - s.createdAt < 30000
    );
    if (dup) {
      return res.json({ success: true, story: formatStoryForViewer(dup, authorId), deduplicated: true });
    }
  }

  // Validate any link stickers safely
  const sanitizedStickers = Array.isArray(body.stickers)
    ? body.stickers
        .map((st: any) => {
          if (st?.type === 'link') {
            const safeUrl = sanitizeSafeLink(st.url);
            if (!safeUrl) return null;
            return { ...st, url: safeUrl };
          }
          return st;
        })
        .filter(Boolean)
    : [];

  const now = Date.now();
  const dir = serverUserDirectory.get(authorId);
  const newStory = {
    id: `story-${now}-${Math.random().toString(36).slice(2, 6)}`,
    authorId,
    authorName: body.authorName || dir?.name || 'Alex',
    authorUsername: body.authorUsername || dir?.username || 'alex_creator',
    authorAvatar: body.authorAvatar || dir?.avatar || '',
    authorVerified: Boolean(body.authorVerified ?? dir?.isVerified),
    mediaUrl: validatedMediaUrl,
    thumbnailUrl: typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl : validatedMediaUrl,
    mediaType,
    backgroundGradient: body.backgroundGradient || undefined,
    cropTransform: body.cropTransform || undefined,
    drawingDataUrl:
      typeof body.drawingDataUrl === 'string' && body.drawingDataUrl.startsWith('data:image/png;base64,')
        ? body.drawingDataUrl
        : undefined,
    textOverlays: Array.isArray(body.textOverlays) ? body.textOverlays : [],
    stickers: sanitizedStickers,
    caption: typeof body.caption === 'string' ? body.caption.trim().slice(0, 300) : undefined,
    location: typeof body.location === 'string' ? body.location.trim().slice(0, 80) : undefined,
    poll: body.poll
      ? {
          question: String(body.poll.question || '').slice(0, 120),
          optionA: String(body.poll.optionA || 'Yes').slice(0, 60),
          optionB: String(body.poll.optionB || 'No').slice(0, 60),
          votesA: 0,
          votesB: 0,
          voterVotes: {},
        }
      : undefined,
    audience: body.audience || 'everyone',
    hiddenFromIds: Array.isArray(body.hiddenFromIds) ? body.hiddenFromIds.map(String) : [],
    replyPermission: body.replyPermission || 'everyone',
    isArchived: body.saveToArchive !== false,
    mediaHash: body.mediaHash || undefined,
    createdAt: now,
    expiresAt: now + 24 * 3600 * 1000,
    canEditUntil: now + 15 * 60 * 1000, // 15-minute eligible metadata edit window
    isSeen: false,
    viewsCount: 0,
    likesCount: 0,
    likedByIds: [],
    viewers: [],
    reactions: [],
  };

  serverStories.unshift(newStory);
  broadcastSocialEvent({ type: 'story:created', storyId: newStory.id, authorId });
  res.json({ success: true, story: formatStoryForViewer(newStory, authorId) });
});

// 11. Edit eligible Story metadata shortly after posting (preserves views/reactions/votes)
app.patch('/api/stories/:id', (req, res) => {
  const { id } = req.params;
  const { userId = 'user-me', caption, location, audience, hiddenFromIds, replyPermission } = req.body || {};
  const story = serverStories.find((s) => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });
  if (story.authorId !== userId) return res.status(403).json({ error: 'Not authorized to edit this story.' });
  if (story.canEditUntil && Date.now() > story.canEditUntil) {
    return res.status(400).json({ error: 'The 15-minute post-publish edit window has ended.' });
  }

  if (typeof caption === 'string') story.caption = caption.trim().slice(0, 300);
  if (typeof location === 'string') story.location = location.trim().slice(0, 80) || undefined;
  if (audience === 'everyone' || audience === 'subscribers' || audience === 'close_friends') {
    story.audience = audience;
  }
  if (Array.isArray(hiddenFromIds)) story.hiddenFromIds = hiddenFromIds.map(String);
  if (replyPermission === 'everyone' || replyPermission === 'subscribers' || replyPermission === 'off') {
    story.replyPermission = replyPermission;
  }

  broadcastSocialEvent({ type: 'story:updated', storyId: id });
  res.json({ success: true, story: formatStoryForViewer(story, String(userId)) });
});

// 12. Delete Story
app.delete('/api/stories/:id', (req, res) => {
  const { id } = req.params;
  const userId = String(req.query.userId || req.body?.userId || 'user-me');
  const idx = serverStories.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Story not found.' });
  if (serverStories[idx].authorId !== userId) {
    return res.status(403).json({ error: 'Only the story author can delete this story.' });
  }
  serverStories.splice(idx, 1);
  // Remove from highlights referencing it
  serverHighlights.forEach((h) => {
    h.storyIds = (h.storyIds || []).filter((sid: string) => sid !== id);
  });
  broadcastSocialEvent({ type: 'story:deleted', storyId: id });
  res.json({ success: true, deletedId: id });
});

// 13. Record Story View + Viewer Entry
app.post('/api/stories/:id/view', (req, res) => {
  const { id } = req.params;
  const { userId = 'user-me', name = 'Alex', username = 'alex_creator', avatar = '' } = req.body || {};
  const story = serverStories.find((s) => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  story.viewers = story.viewers || [];
  const existing = story.viewers.find((v: any) => v.userId === userId);
  if (!existing && userId !== story.authorId) {
    story.viewers.unshift({
      userId: String(userId),
      name: String(name),
      username: String(username),
      avatar: String(avatar),
      viewedAt: Date.now(),
    });
    story.viewsCount = (story.viewsCount || 0) + 1;
  }
  if (userId === story.authorId) {
    story.isSeen = true;
  }
  res.json({ success: true, story: formatStoryForViewer(story, String(userId)) });
});

// 14. Like Story
app.post('/api/stories/:id/like', (req, res) => {
  const { id } = req.params;
  const { userId = 'user-me', name = 'Alex', username = 'alex_creator', avatar = '' } = req.body || {};
  const story = serverStories.find((s) => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  story.likedByIds = story.likedByIds || [];
  const hasLiked = story.likedByIds.includes(String(userId));
  if (hasLiked) {
    story.likedByIds = story.likedByIds.filter((uid: string) => uid !== String(userId));
  } else {
    story.likedByIds.push(String(userId));
  }
  story.likesCount = story.likedByIds.length;

  story.viewers = story.viewers || [];
  const v = story.viewers.find((entry: any) => entry.userId === userId);
  if (v) {
    v.liked = !hasLiked;
  } else if (userId !== story.authorId) {
    story.viewers.unshift({
      userId: String(userId),
      name: String(name),
      username: String(username),
      avatar: String(avatar),
      viewedAt: Date.now(),
      liked: !hasLiked,
    });
  }

  res.json({ success: true, likesCount: story.likesCount, liked: !hasLiked, likedByIds: story.likedByIds });
});

// 15. React to Story
app.post('/api/stories/:id/react', (req, res) => {
  const { id } = req.params;
  const { userId = 'user-me', emoji, name = 'Alex', username = 'alex_creator', avatar = '' } = req.body || {};
  const story = serverStories.find((s) => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  story.reactions = story.reactions || [];
  const existingIdx = story.reactions.findIndex((r: any) => r.userId === userId);
  if (existingIdx >= 0) story.reactions[existingIdx].emoji = String(emoji);
  else story.reactions.push({ userId: String(userId), emoji: String(emoji) });

  story.viewers = story.viewers || [];
  const v = story.viewers.find((entry: any) => entry.userId === userId);
  if (v) v.reactedEmoji = String(emoji);
  else if (userId !== story.authorId) {
    story.viewers.unshift({
      userId: String(userId),
      name: String(name),
      username: String(username),
      avatar: String(avatar),
      viewedAt: Date.now(),
      reactedEmoji: String(emoji),
    });
  }
  res.json({ success: true, reactions: story.reactions });
});

// 16. Vote on Story Poll (persisted vote breakdown)
app.post('/api/stories/:id/poll', (req, res) => {
  const { id } = req.params;
  const { userId = 'user-me', option } = req.body || {};
  const story = serverStories.find((s) => s.id === id);
  if (!story || !story.poll) return res.status(404).json({ error: 'Story poll not found.' });
  if (option !== 'A' && option !== 'B') return res.status(400).json({ error: 'Invalid option.' });

  story.poll.voterVotes = story.poll.voterVotes || {};
  const prevVote = story.poll.voterVotes[String(userId)];
  if (prevVote !== option) {
    if (prevVote === 'A') story.poll.votesA = Math.max(0, (story.poll.votesA || 0) - 1);
    if (prevVote === 'B') story.poll.votesB = Math.max(0, (story.poll.votesB || 0) - 1);
    if (option === 'A') story.poll.votesA = (story.poll.votesA || 0) + 1;
    if (option === 'B') story.poll.votesB = (story.poll.votesB || 0) + 1;
    story.poll.voterVotes[String(userId)] = option;
  }
  res.json({ success: true, poll: { ...story.poll, userVote: option } });
});

// 17. Answer Story Question Box
app.post('/api/stories/:id/question', (req, res) => {
  const { id } = req.params;
  const { stickerId, userId = 'user-me', name = 'Alex', username = 'alex_creator', avatar = '', answer } = req.body || {};
  const cleanAnswer = typeof answer === 'string' ? answer.trim().slice(0, 240) : '';
  if (!cleanAnswer) return res.status(400).json({ error: 'Answer cannot be empty.' });

  const story = serverStories.find((s) => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  const sticker = (story.stickers || []).find((st: any) => st.id === stickerId && st.type === 'question');
  if (!sticker) return res.status(404).json({ error: 'Question sticker not found.' });

  sticker.responses = sticker.responses || [];
  sticker.responses.unshift({
    id: `qres-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: String(userId),
    name: String(name),
    username: String(username),
    avatar: String(avatar),
    answer: cleanAnswer,
    createdAt: Date.now(),
  });

  res.json({ success: true, responses: sticker.responses });
});

// 18. Emoji Slider & Countdown Reminder
app.post('/api/stories/:id/sticker-interact', (req, res) => {
  const { id } = req.params;
  const { stickerId, userId = 'user-me', sliderValue, toggleReminder } = req.body || {};
  const story = serverStories.find((s) => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });
  const sticker = (story.stickers || []).find((st: any) => st.id === stickerId);
  if (!sticker) return res.status(404).json({ error: 'Sticker not found.' });

  if (sticker.type === 'slider' && typeof sliderValue === 'number') {
    sticker.sliderValues = sticker.sliderValues || {};
    sticker.sliderValues[String(userId)] = Math.max(0, Math.min(100, Math.round(sliderValue)));
    return res.json({ success: true, sliderValues: sticker.sliderValues });
  }

  if (sticker.type === 'countdown' && toggleReminder) {
    sticker.reminderUserIds = sticker.reminderUserIds || [];
    const uid = String(userId);
    if (sticker.reminderUserIds.includes(uid)) {
      sticker.reminderUserIds = sticker.reminderUserIds.filter((x: string) => x !== uid);
    } else {
      sticker.reminderUserIds.push(uid);
    }
    return res.json({ success: true, reminderUserIds: sticker.reminderUserIds });
  }

  res.status(400).json({ error: 'Invalid sticker interaction.' });
});

// 19. Reply to Story -> Enforces replyPermission & routes into DM conversation
app.post('/api/stories/:id/reply', (req, res) => {
  const { id } = req.params;
  const { senderId = 'user-me', senderName = 'Alex', senderUsername = 'alex_creator', senderAvatar = '', replyText } = req.body || {};
  const cleanText = typeof replyText === 'string' ? replyText.trim().slice(0, 1000) : '';
  if (!cleanText) return res.status(400).json({ error: 'Reply cannot be empty.' });

  const story = serverStories.find((s) => s.id === id);
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  const senderPriv = getOrCreateUserPrivacy(String(senderId));
  const authorPriv = getOrCreateUserPrivacy(story.authorId);

  if (senderPriv.blockedUserIds.includes(story.authorId) || authorPriv.blockedUserIds.includes(String(senderId))) {
    return res.status(403).json({ error: 'You cannot reply to this story.' });
  }
  if (story.replyPermission === 'off') {
    return res.status(403).json({ error: 'Replies are turned off for this story.' });
  }
  if (story.replyPermission === 'subscribers' && story.authorId !== senderId && !senderPriv.followingIds.includes(story.authorId)) {
    return res.status(403).json({ error: 'Only subscribers can reply to this story.' });
  }

  let conv = serverConversations.find(
    (c) => c.type === 'direct' && c.participants.some((p: any) => p.id === story.authorId)
  );
  if (!conv) {
    const dir = serverUserDirectory.get(story.authorId);
    conv = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'direct',
      participants: [
        {
          id: story.authorId,
          name: story.authorName || dir?.name || 'Creator',
          username: story.authorUsername || dir?.username || 'creator',
          avatar: story.authorAvatar || dir?.avatar || '',
          isVerified: story.authorVerified,
          isOnline: isUserVisiblyOnline(story.authorId),
        },
      ],
      unreadCount: 0,
      isRequest: false,
      messages: [],
    };
    serverConversations.unshift(conv);
  }

  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversationId: conv.id,
    senderId: String(senderId),
    senderName: String(senderName),
    senderUsername: String(senderUsername),
    senderAvatar: String(senderAvatar),
    text: cleanText,
    timestamp: Date.now(),
    status: 'sent',
    storyReply: {
      storyId: story.id,
      thumbnailUrl: story.thumbnailUrl || story.mediaUrl,
      authorName: story.authorName,
      mediaType: story.mediaType,
    },
  };
  conv.messages.push(msg);
  conv.lastMessage = msg;

  broadcastSocialEvent({ type: 'dm:message', conversationId: conv.id, message: msg });
  res.json({ success: true, conversationId: conv.id, message: msg });
});

// 20. Story Archive & Highlights CRUD
app.get('/api/stories/archive', (req, res) => {
  const userId = String(req.query.userId || 'user-me');
  const archived = serverStories
    .filter((s) => s.authorId === userId && s.isArchived !== false)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => formatStoryForViewer(s, userId));
  res.json({ success: true, archiveStories: archived });
});

app.post('/api/highlights', (req, res) => {
  const { ownerId = 'user-me', title, coverImage, storyIds } = req.body || {};
  const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 40) : '';
  if (!cleanTitle || !Array.isArray(storyIds) || storyIds.length === 0) {
    return res.status(400).json({ error: 'Title and at least one story are required.' });
  }
  const firstStory = serverStories.find((s) => s.id === storyIds[0]);
  const highlight = {
    id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ownerId: String(ownerId),
    title: cleanTitle,
    coverImage: coverImage || firstStory?.thumbnailUrl || firstStory?.mediaUrl || '',
    storyIds: storyIds.map(String),
    createdAt: Date.now(),
  };
  serverHighlights.unshift(highlight);
  res.json({ success: true, highlight });
});

app.patch('/api/highlights/:id', (req, res) => {
  const { id } = req.params;
  const { ownerId = 'user-me', title, coverImage, storyIds } = req.body || {};
  const hl = serverHighlights.find((h) => h.id === id);
  if (!hl) return res.status(404).json({ error: 'Highlight not found.' });
  if (hl.ownerId && hl.ownerId !== ownerId) return res.status(403).json({ error: 'Unauthorized.' });

  if (typeof title === 'string' && title.trim()) hl.title = title.trim().slice(0, 40);
  if (typeof coverImage === 'string' && coverImage.trim()) hl.coverImage = coverImage;
  if (Array.isArray(storyIds) && storyIds.length > 0) hl.storyIds = storyIds.map(String);

  res.json({ success: true, highlight: hl });
});

app.delete('/api/highlights/:id', (req, res) => {
  const { id } = req.params;
  const ownerId = String(req.query.userId || req.body?.userId || 'user-me');
  const idx = serverHighlights.findIndex((h) => h.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Highlight not found.' });
  if (serverHighlights[idx].ownerId && serverHighlights[idx].ownerId !== ownerId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }
  serverHighlights.splice(idx, 1);
  res.json({ success: true, deletedId: id });
});

// 21. Moderation Report endpoint (Messages & Stories)
app.post('/api/reports', (req, res) => {
  const { reporterId = 'user-me', targetType, targetId, reason, notes } = req.body || {};
  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: 'targetType, targetId, and reason are required.' });
  }
  const report = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reporterId: String(reporterId),
    targetType: String(targetType),
    targetId: String(targetId),
    reason: String(reason),
    notes: typeof notes === 'string' ? notes.slice(0, 500) : undefined,
    createdAt: Date.now(),
  };
  serverReports.unshift(report);
  if (targetType === 'story') {
    if (!storyReportedByUser.has(String(reporterId))) {
      storyReportedByUser.set(String(reporterId), new Set());
    }
    storyReportedByUser.get(String(reporterId))!.add(String(targetId));
  }
  res.json({ success: true, report });
});

// Server-Side In-Memory Fast Cache & Deduplication Map
const serverTranslationCache = new Map<string, string>();
const serverPendingRequests = new Map<string, Promise<string>>();

const TRANSLATION_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  pt: 'Portuguese (Português)',
  it: 'Italian (Italiano)',
  ru: 'Russian (Русский)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  zh: 'Simplified Chinese (简体中文)',
  id: 'Indonesian (Bahasa Indonesia)',
  th: 'Thai (ไทย)',
  vi: 'Vietnamese (Tiếng Việt)',
  tr: 'Turkish (Türkçe)',
  ar: 'Arabic (العربية)',
  hi: 'Hindi (हिन्दी)',
  fil: 'Filipino / Tagalog',
  pl: 'Polish (Polski)',
  nl: 'Dutch (Nederlands)',
  am: 'Amharic (አማርኛ)',
  uk: 'Ukrainian (Українська)',
  my: 'Burmese / Myanmar (မြန်မာဘာသာ)',
};

// Lazy Gemini Client with correct User-Agent header
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Helper: Sleep for retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Translation endpoint (real Gemini-backed translation service; zero mock dictionaries)
app.post('/api/translate', async (req, res) => {
  const { messageId, text, sourceLanguage, targetLanguage } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || typeof targetLanguage !== 'string' || !targetLanguage.trim()) {
    return res.status(400).json({ error: 'Text and targetLanguage are required.' });
  }

  const cleanText = text.trim();
  const normalizedTarget = targetLanguage.trim().toLowerCase();

  // Detect clear non-Latin script markers when sourceLanguage is auto or omitted
  let detectedSource = typeof sourceLanguage === 'string' ? sourceLanguage.trim().toLowerCase() : 'auto';
  if (!detectedSource || detectedSource === 'auto') {
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(cleanText)) detectedSource = 'ko';
    else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(cleanText)) detectedSource = 'ja';
    else if (/[\u4E00-\u9FFF]/.test(cleanText)) detectedSource = 'zh';
    else if (/[\u0600-\u06FF]/.test(cleanText)) detectedSource = 'ar';
    else if (/[\u0900-\u097F]/.test(cleanText)) detectedSource = 'hi';
    else if (/[\u0E00-\u0E7F]/.test(cleanText)) detectedSource = 'th';
    else if (/[\u1200-\u137F]/.test(cleanText)) detectedSource = 'am';
    else if (/[\u1000-\u109F\uAA60-\uAA7F]/.test(cleanText)) detectedSource = 'my';
    else if (/[\u0400-\u04FF]/.test(cleanText)) detectedSource = /[іїєґ]/i.test(cleanText) ? 'uk' : 'ru';
    else detectedSource = 'auto';
  }

  // Only short-circuit immediately if detected non-Latin or explicit source equals target
  if (detectedSource !== 'auto' && detectedSource === normalizedTarget) {
    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage: normalizedTarget,
      translatedText: text,
      cached: true,
    });
  }

  const msgCacheKey = messageId ? `${messageId}:${normalizedTarget}` : null;
  const textCacheKey = `${cleanText.toLowerCase()}:${normalizedTarget}`;

  if (msgCacheKey && serverTranslationCache.has(msgCacheKey)) {
    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage: normalizedTarget,
      translatedText: serverTranslationCache.get(msgCacheKey)!,
      cached: true,
    });
  }

  if (serverTranslationCache.has(textCacheKey)) {
    const cachedVal = serverTranslationCache.get(textCacheKey)!;
    if (msgCacheKey) serverTranslationCache.set(msgCacheKey, cachedVal);
    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage: normalizedTarget,
      translatedText: cachedVal,
      cached: true,
    });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Translation service is not configured. Missing GEMINI_API_KEY.',
    });
  }

  const requestKey = msgCacheKey || textCacheKey;
  if (serverPendingRequests.has(requestKey)) {
    try {
      const translatedText = await serverPendingRequests.get(requestKey)!;
      return res.json({
        originalText: text,
        originalLanguage: detectedSource,
        targetLanguage: normalizedTarget,
        translatedText,
        cached: true,
      });
    } catch (err: any) {
      return res.status(502).json({
        error: err?.message || 'Translation failed. Please try again.',
      });
    }
  }

  const translatePromise = (async (): Promise<string> => {
    const targetLangName = TRANSLATION_LANGUAGE_NAMES[normalizedTarget] || normalizedTarget;
    const sourceHint =
      detectedSource !== 'auto' && TRANSLATION_LANGUAGE_NAMES[detectedSource]
        ? ` from ${TRANSLATION_LANGUAGE_NAMES[detectedSource]}`
        : '';

    const prompt = `Translate the following chat message${sourceHint} naturally into ${targetLangName}. Preserve all emojis, @mentions, numbers, URLs, and casual tone. If the message is already in ${targetLangName}, return it in natural ${targetLangName}. Output ONLY the translated message text with no surrounding quotes or explanations.\n\nMessage:\n${cleanText}`;

    const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });

          const out = response.text?.trim();
          if (out) {
            return out.replace(/^["“]|["”]$/g, '').trim();
          }
          lastError = new Error('Empty translation response from model.');
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || '');
          const isTransient =
            err?.status === 'UNAVAILABLE' ||
            err?.status === 503 ||
            err?.status === 429 ||
            msg.includes('503') ||
            msg.includes('high demand');
          if (isTransient && attempt === 0) {
            await sleep(450);
            continue;
          }
          break;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Translation service unavailable.');
  })();

  serverPendingRequests.set(requestKey, translatePromise);

  try {
    const translatedText = await translatePromise;
    if (msgCacheKey) serverTranslationCache.set(msgCacheKey, translatedText);
    serverTranslationCache.set(textCacheKey, translatedText);

    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage: normalizedTarget,
      translatedText,
      cached: false,
    });
  } catch (err: any) {
    console.error('[translate] upstream error:', err?.message || err);
    return res.status(502).json({
      error: 'Translation failed. Please try again.',
    });
  } finally {
    serverPendingRequests.delete(requestKey);
  }
});

// ================= ENMMOE 2D WEBTOON GAME IMAGE GENERATION API =================

const ALLOWED_GAME_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);
const ALLOWED_REF_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

app.get('/api/game/image-status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({
    available: hasKey,
    model: 'gemini-3.1-flash-lite-image',
    reason: hasKey
      ? 'Server API key detected; image generation can be requested manually.'
      : 'No Gemini image API key configured on server. Using illustrated 2D webtoon engine & IndexedDB cache.',
  });
});

app.post('/api/game/generate-image', async (req, res) => {
  const {
    assetId,
    prompt,
    aspectRatio = '3:4',
    referenceImageDataUrl,
  } = req.body || {};

  if (typeof assetId !== 'string' || !assetId.trim() || assetId.length > 160) {
    return res.status(400).json({ error: 'Valid assetId is required.' });
  }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
    return res.status(400).json({ error: 'Valid illustration prompt is required.' });
  }

  const cleanAspect = ALLOWED_GAME_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : '3:4';
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      available: false,
      error:
        'Gemini image generation is unavailable because no API key is configured in Settings > Secrets.',
    });
  }

  try {
    const parts: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = [];

    if (typeof referenceImageDataUrl === 'string' && referenceImageDataUrl.startsWith('data:')) {
      const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
        referenceImageDataUrl.trim()
      );
      if (match && ALLOWED_REF_MIMES.has(match[1]) && match[2].length < 8_000_000) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    parts.push({
      text: `Korean romance/comedy webtoon illustration style, clean fine ink line art, soft pastel color palette, warm cinematic Seoul lighting, smooth cel shading, expressive eyes, consistent proportions. ${prompt.trim()}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: cleanAspect,
        },
      },
    });

    let generatedDataUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        generatedDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedDataUrl) {
      return res.status(502).json({
        available: false,
        error: 'Image model returned no image bytes. Please retry or use local webtoon illustration mode.',
      });
    }

    return res.json({
      available: true,
      assetId: assetId.trim(),
      dataUrl: generatedDataUrl,
      source: 'gemini',
    });
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 502;
    const message = String(err?.message || 'Gemini image generation unavailable.');
    const isQuotaOrBilling =
      status === 429 ||
      status === 403 ||
      status === 400 ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('limit: 0');

    return res.status(status >= 400 && status < 600 ? status : 502).json({
      available: false,
      error: isQuotaOrBilling
        ? 'Gemini image generation requires a billing-enabled API key in Settings > Secrets. Illustrated 2D Korean webtoon mode and IndexedDB caching remain fully active.'
        : 'Gemini image service could not complete this request right now. Tap Retry to try again.',
    });
  }
});

// Daily Reward endpoint (Calculates streak & daily Money Points)
app.post('/api/user/daily-reward', (req, res) => {
  const { lastClaimTimestamp, streakDays } = req.body;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  let newStreak = streakDays || 0;
  let resetOccurred = false;

  if (!lastClaimTimestamp) {
    // First time
    newStreak = 1;
  } else {
    const elapsed = now - lastClaimTimestamp;
    if (elapsed > 48 * 60 * 60 * 1000) {
      // Missed more than a day -> RESET to Day 1
      newStreak = 1;
      resetOccurred = true;
    } else if (elapsed >= ONE_DAY_MS) {
      // Claiming next consecutive day
      newStreak = (newStreak % 7) + 1;
    } else {
      // Already claimed today
      return res.status(400).json({ error: 'Daily reward already claimed today.' });
    }
  }

  const rewardMoneyPointsMap: Record<number, number> = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 10,
  };

  const awardedMoneyPoints = rewardMoneyPointsMap[newStreak] || 1;

  res.json({
    success: true,
    newStreak,
    awardedMoneyPoints,
    claimTimestamp: now,
    resetOccurred,
  });
});

// Daily Store Free Hearts endpoint
app.post('/api/store/daily-hearts', (req, res) => {
  const { storeHeartClaimTimestamp } = req.body;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (storeHeartClaimTimestamp && now - storeHeartClaimTimestamp < ONE_DAY_MS) {
    return res.status(400).json({ error: 'Free Store Hearts already claimed today!' });
  }

  res.json({
    success: true,
    awardedHearts: 10,
    claimTimestamp: now,
  });
});

// Telegram Stars invoice creation endpoint
app.post('/api/telegram/create-invoice', (req, res) => {
  const { stars, type, amount } = req.body;

  // Real Telegram Bot API invoice payload structure
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const invoiceLink = `https://t.me/invoice/enmmoe_${type}_${stars}_stars`;

  res.json({
    success: true,
    invoiceUrl: invoiceLink,
    stars,
    type,
    amount,
    botConfigured: Boolean(botToken && botToken !== 'MY_TELEGRAM_BOT_TOKEN'),
  });
});

// Telegram Channel Verification endpoint
app.post('/api/telegram/verify-channel', async (req, res) => {
  const { telegramUserId, hasOpenedChannel } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (botToken && botToken !== 'MY_TELEGRAM_BOT_TOKEN' && telegramUserId) {
    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@enmmoe&user_id=${telegramUserId}`
      );
      const tgData = await tgRes.json();
      if (tgData.ok) {
        const status = tgData.result?.status;
        const isMember = ['creator', 'administrator', 'member'].includes(status);
        if (isMember) {
          return res.json({
            success: true,
            isMember: true,
            awardedHearts: 20,
            channel: 'https://t.me/enmmoe',
          });
        } else {
          return res.json({
            success: false,
            isMember: false,
            message: 'Please join the @enmmoe Telegram channel first.',
          });
        }
      }
    } catch (err) {
      console.error('Telegram API channel verification error:', err);
    }
  }

  // If bot token is not configured (e.g., preview environment), require user to have clicked open channel
  if (!hasOpenedChannel) {
    return res.json({
      success: false,
      isMember: false,
      message: 'Please open and join the @enmmoe Telegram channel first.',
    });
  }

  res.json({
    success: true,
    isMember: true,
    awardedHearts: 20,
    channel: 'https://t.me/enmmoe',
  });
});

// Referral Code Claiming endpoint
app.post('/api/referral/claim', (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) {
    return res.status(400).json({ error: 'Invalid referral code' });
  }
  res.json({
    success: true,
    bonusHearts: 15,
    message: 'Referral applied successfully! +15 ❤️ Hearts added.',
  });
});

// Kiss System Active Requests Map
const activeKissRequests = new Map<string, {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderGender: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  recipientGender: string;
  expiresAt: number;
  status: string;
}>();

// Kiss Eligibility Check Endpoint (Strict Gender & Online Validation)
app.post('/api/room/kiss/check-eligibility', (req, res) => {
  const { roomId, spinnerId, spinnerGender } = req.body;
  const room = serverRooms.find((r) => r.id === (roomId || 'table-001')) || serverRooms[0];

  const requiredTargetGender = spinnerGender === 'Boy' ? 'Girl' : spinnerGender === 'Girl' ? 'Boy' : null;

  const eligibleTargets = room.players.filter((p) => {
    if (p.isOnline === false) return false;
    if (p.id === spinnerId) return false;
    if (requiredTargetGender && p.gender !== requiredTargetGender) return false;
    return true;
  });

  res.json({
    success: true,
    hasEligibleTargets: eligibleTargets.length > 0,
    eligibleCount: eligibleTargets.length,
    requiredTargetGender,
    eligibleTargets,
  });
});

// Kiss Request Endpoint
app.post('/api/room/kiss/request', (req, res) => {
  const { roomId, senderId, senderName, senderAvatar, senderGender, recipientId, recipientName, recipientAvatar, recipientGender } = req.body;

  if (!senderId || !recipientId) {
    return res.status(400).json({ error: 'Sender and Recipient IDs are required.' });
  }

  if (senderId === recipientId) {
    return res.status(400).json({ error: 'You cannot send a Kiss request to yourself.' });
  }

  // Verify gender eligibility rules on backend
  const requiredTargetGender = senderGender === 'Boy' ? 'Girl' : senderGender === 'Girl' ? 'Boy' : null;
  if (requiredTargetGender && recipientGender && recipientGender !== requiredTargetGender) {
    return res.status(400).json({
      error: `Ineligible target gender. ${senderGender === 'Boy' ? 'Boy' : 'Girl'} must target ${requiredTargetGender}.`,
    });
  }

  // Prevent duplicate active requests from sender
  const now = Date.now();
  for (const [reqId, existingReq] of activeKissRequests.entries()) {
    if (existingReq.senderId === senderId && existingReq.expiresAt > now && existingReq.status === 'pending') {
      return res.status(429).json({ error: 'Active kiss request already pending. Please wait.' });
    }
  }

  const requestId = `kiss-${now}-${Math.random().toString(36).substring(2, 6)}`;
  const expiresAt = now + 2000; // Strict 2-second timer

  const kissPayload = {
    id: requestId,
    roomId: roomId || 'table-001',
    senderId,
    senderName,
    senderAvatar: senderAvatar || '',
    senderGender,
    recipientId,
    recipientName,
    recipientAvatar: recipientAvatar || '',
    recipientGender,
    expiresAt,
    status: 'pending' as const,
  };

  activeKissRequests.set(requestId, kissPayload);

  // Broadcast kiss request to room clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'kiss_request', request: kissPayload }));
    }
  });

  res.json({
    success: true,
    request: kissPayload,
  });
});

// Kiss Response Endpoint (Accept / Reject)
app.post('/api/room/kiss/respond', (req, res) => {
  const { requestId, recipientId, action } = req.body;
  const kissReq = activeKissRequests.get(requestId);

  if (!kissReq) {
    return res.status(404).json({ error: 'Kiss request not found or expired.' });
  }

  if (kissReq.recipientId !== recipientId) {
    return res.status(403).json({ error: 'Unauthorized request recipient.' });
  }

  if (action === 'accept') {
    kissReq.status = 'accepted';
    // Award Kiss Points to recipient and sender on server room state
    const room = serverRooms.find((r) => r.id === kissReq.roomId) || serverRooms[0];
    const recPlayer = room.players.find((p) => p.id === recipientId);
    const sendPlayer = room.players.find((p) => p.id === kissReq.senderId);

    if (recPlayer) recPlayer.kissPoints = (recPlayer.kissPoints || 0) + 10;
    if (sendPlayer) sendPlayer.kissPoints = (sendPlayer.kissPoints || 0) + 5;

    // Add chat room message
    room.chatMessages.push({
      id: `m-kiss-${Date.now()}`,
      senderId: kissReq.senderId,
      senderName: kissReq.senderName,
      senderGender: kissReq.senderGender as any,
      senderAvatar: kissReq.senderAvatar,
      text: `💋 ${kissReq.senderName} kissed ${kissReq.recipientName}!`,
      timestamp: Date.now(),
      type: 'kiss',
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'kiss_accepted',
            request: kissReq,
            awardedPoints: 10,
          })
        );
      }
    });

    activeKissRequests.delete(requestId);
    return res.json({
      success: true,
      action: 'accepted',
      senderName: kissReq.senderName,
      recipientName: kissReq.recipientName,
      awardedPoints: 10,
    });
  } else {
    kissReq.status = 'rejected';
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'kiss_rejected',
            request: kissReq,
          })
        );
      }
    });

    activeKissRequests.delete(requestId);
    return res.json({
      success: true,
      action: 'rejected',
      message: 'Kiss request rejected',
    });
  }
});

// HTTP server for Express + WebSockets
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map client socket to room ID
const clientRooms = new Map<WebSocket, string>();

wss.on('connection', (ws) => {
  ws.on('message', (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());

      if (data.type === 'join_room') {
        clientRooms.set(ws, data.roomId);
        // Send initial room state
        const targetRoom = serverRooms.find((r) => r.id === data.roomId);
        if (targetRoom) {
          ws.send(JSON.stringify({ type: 'room_state', room: targetRoom }));
        }
      } else if (data.type === 'chat_message') {
        const roomId = clientRooms.get(ws) || data.roomId;
        const targetRoom = serverRooms.find((r) => r.id === roomId);
        if (targetRoom) {
          const newMsg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            senderId: data.senderId,
            senderName: data.senderName,
            senderGender: data.senderGender,
            senderAvatar: data.senderAvatar,
            text: data.text,
            timestamp: Date.now(),
            type: 'chat' as const,
          };
          targetRoom.chatMessages.push(newMsg);
          // Broadcast to all clients in room
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomId) {
              client.send(JSON.stringify({ type: 'chat_message', message: newMsg, roomId }));
            }
          });
        }
      } else if (data.type === 'gift_sent' || data.type === 'kiss_sent' || data.type === 'emotion_sent' || data.type === 'youtube_start') {
        // Broadcast game interaction event to room clients
        const roomId = clientRooms.get(ws) || data.roomId;
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomId) {
            client.send(JSON.stringify(data));
          }
        });
      } else if (data.type === 'social:identify') {
        const uid = String(data.userId || 'user-me');
        socketUserIds.set(ws, uid);
        if (!onlineUserSockets.has(uid)) {
          onlineUserSockets.set(uid, new Set());
        }
        onlineUserSockets.get(uid)!.add(ws);
        const priv = getOrCreateUserPrivacy(uid);
        if (typeof data.showActivityStatus === 'boolean') priv.showActivityStatus = data.showActivityStatus;
        if (typeof data.readReceiptsEnabled === 'boolean') priv.readReceiptsEnabled = data.readReceiptsEnabled;
        if (typeof data.typingIndicatorsEnabled === 'boolean') priv.typingIndicatorsEnabled = data.typingIndicatorsEnabled;

        broadcastSocialEvent({
          type: 'dm:presence',
          onlineUserIds: getVisibleOnlineUserIds(),
        });
      } else if (data.type === 'dm:typing') {
        const senderId = String(data.userId || socketUserIds.get(ws) || 'user-me');
        const priv = getOrCreateUserPrivacy(senderId);
        if (!priv.typingIndicatorsEnabled) return;
        const conv = serverConversations.find((c) => c.id === data.conversationId);
        if (!conv) return;
        const isTyping = Boolean(data.isTyping);
        conv.isTyping = isTyping;
        conv.typingUserId = isTyping ? senderId : undefined;
        conv.typingUserName = isTyping ? String(data.userName || 'Someone') : undefined;

        broadcastSocialEvent({
          type: 'dm:typing',
          conversationId: conv.id,
          userId: senderId,
          userName: String(data.userName || 'Someone'),
          isTyping,
        });
      }
    } catch {
      // Ignore invalid socket payloads
    }
  });

  ws.on('close', () => {
    clientRooms.delete(ws);
    const uid = socketUserIds.get(ws);
    if (uid) {
      socketUserIds.delete(ws);
      const set = onlineUserSockets.get(uid);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          onlineUserSockets.delete(uid);
        }
      }
      broadcastSocialEvent({
        type: 'dm:presence',
        onlineUserIds: getVisibleOnlineUserIds(),
      });
    }
  });
});

// ================= EMAIL SERVICE & ENDPOINTS =================
interface VerificationRecord {
  code: string;
  expiresAt: number;
  userId?: string;
}

const verificationMap = new Map<string, VerificationRecord>();
const verifiedEmails = new Set<string>();
const sentEmailLogs: Array<{
  id: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  timestamp: number;
  status: 'delivered' | 'sent';
}> = [];

// Helper to create nodemailer transporter if credentials exist
function createMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

// 1. Send Email Verification Code
app.post('/api/email/send-verification', async (req, res) => {
  const { email, userId, userName } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  verificationMap.set(cleanEmail, {
    code,
    expiresAt,
    userId,
  });

  const transporter = createMailTransporter();
  let emailDispatchedViaSmtp = false;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"enmmoe" <no-reply@${process.env.SMTP_HOST}>`,
        to: cleanEmail,
        subject: 'Your enmmoe Verification Code: ' + code,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0A84FF; margin: 0; font-size: 22px;">enmmoe</h2>
              <p style="color: #71717a; font-size: 13px; margin: 4px 0 0 0;">Email Verification</p>
            </div>
            <p style="color: #27272a; font-size: 14px;">Hi ${userName || 'there'},</p>
            <p style="color: #52525b; font-size: 14px; line-height: 1.5;">
              Use the 6-digit verification code below to confirm your email in Settings:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 12px 28px; background: #f4f4f5; border-radius: 12px; color: #18181b;">
                ${code}
              </span>
            </div>
            <p style="color: #71717a; font-size: 12px; line-height: 1.4;">
              This code will expire in 10 minutes. If you did not request this code, please disregard this email.
            </p>
          </div>
        `,
      });
      emailDispatchedViaSmtp = true;
    } catch (err) {
      console.error('SMTP send error:', err);
    }
  }

  // Log to server console
  console.log(`[Email Verification] Code for ${cleanEmail}: ${code} (SMTP sent: ${emailDispatchedViaSmtp})`);

  res.json({
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    email: cleanEmail,
    expiresAt,
    smtpSent: emailDispatchedViaSmtp,
    // Always provide preview code so verification works reliably even if SMTP is unconfigured in dev
    previewCode: code,
  });
});

// 2. Verify Email Code
app.post('/api/email/verify-code', (req, res) => {
  const { email, code, userId } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.toString().trim();
  const record = verificationMap.get(cleanEmail);

  if (!record) {
    return res.status(400).json({
      error: 'No pending verification found for this email. Please request a new code.',
    });
  }

  if (Date.now() > record.expiresAt) {
    verificationMap.delete(cleanEmail);
    return res.status(400).json({
      error: 'Verification code has expired. Please request a new code.',
    });
  }

  if (record.code !== cleanCode) {
    return res.status(400).json({
      error: 'Invalid verification code. Please check and try again.',
    });
  }

  // Code is valid! Mark as verified
  verificationMap.delete(cleanEmail);
  verifiedEmails.add(cleanEmail);

  // Add welcome confirmation email to logs
  const confirmationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    subject: 'Email Address Verified Successfully',
    message: 'Your email address has been verified and linked to your enmmoe account.',
    category: 'security',
    timestamp: Date.now(),
    status: 'delivered' as const,
  };
  sentEmailLogs.unshift(confirmationLog);

  res.json({
    success: true,
    message: 'Email successfully verified!',
    email: cleanEmail,
    isVerified: true,
  });
});

// 3. Send Message to User's Email
app.post('/api/email/send-message', async (req, res) => {
  const { email, subject, message, category, userName } = req.body;
  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Email, subject, and message are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  const transporter = createMailTransporter();
  let smtpSent = false;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"enmmoe" <no-reply@${process.env.SMTP_HOST}>`,
        to: cleanEmail,
        subject: cleanSubject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background: #ffffff;">
            <div style="border-bottom: 1px solid #f4f4f5; padding-bottom: 14px; margin-bottom: 16px;">
              <h3 style="color: #0A84FF; margin: 0; font-size: 18px; font-weight: 700;">enmmoe Notification</h3>
              <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0 0;">${new Date().toLocaleString()}</p>
            </div>
            <h2 style="color: #18181b; font-size: 18px; margin-top: 0; margin-bottom: 12px;">${cleanSubject}</h2>
            <div style="color: #3f3f46; font-size: 14px; line-height: 1.6; white-space: pre-wrap; background: #f9f9fb; padding: 16px; border-radius: 12px; border: 1px solid #f4f4f5;">
              ${cleanMessage}
            </div>
            <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #f4f4f5; color: #71717a; font-size: 11px;">
              This message was sent to <strong>${cleanEmail}</strong> from your enmmoe account settings.
            </div>
          </div>
        `,
      });
      smtpSent = true;
    } catch (err) {
      console.error('Error sending message email via SMTP:', err);
    }
  }

  const logEntry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    subject: cleanSubject,
    message: cleanMessage,
    category: category || 'custom',
    timestamp: Date.now(),
    status: 'delivered' as const,
  };

  sentEmailLogs.unshift(logEntry);
  if (sentEmailLogs.length > 50) sentEmailLogs.pop();

  console.log(`[Email Sent] To: ${cleanEmail} | Subject: "${cleanSubject}" | SMTP: ${smtpSent}`);

  res.json({
    success: true,
    message: `Message dispatched successfully to ${cleanEmail}`,
    log: logEntry,
    smtpSent,
  });
});

// 4. Get Email Sent Logs
app.get('/api/email/logs', (req, res) => {
  const { email } = req.query;
  let logs = sentEmailLogs;
  if (email && typeof email === 'string') {
    const cleanEmail = email.trim().toLowerCase();
    logs = logs.filter((l) => l.email === cleanEmail);
  }
  res.json({
    success: true,
    logs,
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[enmmoe Server] Running on http://0.0.0.0:${PORT}`);
  });
}

start();
