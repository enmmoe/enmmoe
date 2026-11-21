export type Gender = 'Boy' | 'Girl' | 'Non-binary';

export type ReactionType = 'like' | 'love' | 'funny' | 'fire' | 'wow' | 'sad';

export interface User {
  id: string;
  name: string;
  surname?: string;
  username: string; // Unique handle e.g. "alex_creator"
  age?: number;
  gender: Gender;
  avatar: string;
  coverImage?: string;
  bio?: string;
  website?: string;
  location?: string;
  pronouns?: string;
  joinDate?: string;
  isVerified?: boolean; // Authentic / Official verified badge
  isPulsPlus?: boolean; // Premium PULS+ subscriber badge
  isPremium?: boolean; // Telegram-style Premium status
  hasDonatedVIP?: boolean; // VIP status unlocked
  premiumStatusIcon?: string; // Telegram status emoji/icon e.g. ⭐️, 👑, 💎, ⚡️, 🔥, 🚀
  premiumTier?: 'standard' | 'premium' | 'vip';
  voiceToTextEnabled?: boolean;
  fastDownloadsEnabled?: boolean;
  isAuthor?: boolean; // Story author / creator badge
  isPublisher?: boolean; // Approved publishing house badge
  verificationBadge?: 'creator' | 'official' | 'partner';
  
  // Social metrics
  followersCount: number;
  followingCount: number;
  postsCount: number;
  likesCount: number;
  storiesReadCount?: number;
  achievementsCount?: number;
  
  // Social graph
  followingIds?: string[];
  followersIds?: string[];
  blockedUserIds?: string[];
  mutedUserIds?: string[];
  restrictedUserIds?: string[];
  savedPostIds?: string[];
  showcasedAchievementIds?: string[];
  
  // Account & Privacy settings
  email?: string;
  isEmailVerified?: boolean;
  isPrivate?: boolean;
  allowFollowFrom?: 'everyone' | 'request_only';
  allowCommentsFrom?: 'everyone' | 'following' | 'nobody';
  allowMessagesFrom?: 'everyone' | 'following' | 'nobody';
  allowMentionsFrom?: 'everyone' | 'following' | 'nobody';
  isReadingActivityPublic?: boolean;
  isCurrentlyReadingVisible?: boolean;
  isAchievementsPublic?: boolean;
  showActivityStatus?: boolean;
  readReceiptsEnabled?: boolean;
  twoFactorEnabled?: boolean;
  birthdayVisibility?: 'public' | 'followers' | 'only_me';
  
  // Wallet / Coins
  walletBalance?: number; // In-app credits / tips
  hearts: number; // Spendable for badges/rewards
  moneyPoints: number; // Spendable for tips/creator coins
  level: number;
  xp: number;
  maxXp: number;
  kissPoints: number;
  emotionPoints: number;
  admire: number;
  league: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'VIP';
  rank: number;
  
  telegramId?: string;
  telegramUsername?: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  lastClaimTimestamp: number;
  storeHeartClaimTimestamp?: number;
  
  isChannelJoined: boolean;
  inventory: string[];
  relationships: string[];
  guests: { userId: string; name: string; avatar: string; timestamp: number }[];
  preferredLanguage?: string;
  theme?: 'dark' | 'light' | 'system';
  fontSize?: 'standard' | 'large' | 'compact';
  isHost?: boolean;
  equippedFrame?: string;
  unlockedFrames?: string[];
  readStatusEnabled?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voterIds: string[];
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
  expiresAt: string;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName?: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  authorBadge?: 'creator' | 'official' | 'partner';
  isAuthorFollowed?: boolean;
  
  createdAt: number; // Timestamp
  content: string;
  mediaType: 'photo' | 'video' | 'multiple' | 'poll' | 'link' | 'text';
  mediaUrls: string[];
  aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16';
  
  location?: string;
  tags?: string[];
  taggedUsers?: { userId: string; username: string }[];
  poll?: PollData;
  linkPreview?: LinkPreview;
  
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  sharesCount: number;
  viewsCount: number;
  
  userReaction?: ReactionType | null;
  isSaved?: boolean;
  isReposted?: boolean;
  isPinned?: boolean;
  comments?: PostComment[];
  reactionsBreakdown?: {
    like: number;
    love: number;
    funny: number;
    fire: number;
    wow: number;
    sad: number;
  };
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  text: string;
  createdAt: number;
  likesCount: number;
  isLiked?: boolean;
  replyToCommentId?: string;
  replyToUsername?: string;
  replies?: PostComment[];
}

export interface StoryHighlight {
  id: string;
  title: string;
  coverImage: string;
  storyIds: string[];
  createdAt: number;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  caption?: string;
  musicTitle?: string;
  musicArtist?: string;
  location?: string;
  createdAt: number;
  expiresAt: number;
  isSeen?: boolean;
  viewsCount?: number;
  reactions?: { userId: string; emoji: string }[];
  poll?: {
    question: string;
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
    userVote?: 'A' | 'B';
  };
}

export interface ShortVideo {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  isAuthorFollowed?: boolean;
  videoUrl: string;
  coverUrl: string;
  caption: string;
  musicTitle: string;
  musicArtist: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  userReaction?: ReactionType | null;
  isSaved?: boolean;
}

export interface SocialMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  text: string;
  mediaType?: 'text' | 'image' | 'video' | 'voice' | 'file' | 'gif' | 'sticker';
  mediaUrl?: string;
  voiceDuration?: number; // seconds
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  seenAt?: number;
  reactions?: Record<string, string>; // userId -> emoji
  translations?: Record<string, string>; // languageCode -> translatedText
  activeTranslationLang?: string;
  showTranslated?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  isPinned?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  bubbleStyle?: string;
}

export interface SocialConversation {
  id: string;
  type: 'direct' | 'group';
  title?: string;
  participants: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
    isOnline: boolean;
    lastSeen?: string;
  }[];
  lastMessage?: SocialMessage;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isBlockedByMe?: boolean;
  isBlockedByThem?: boolean;
  messages: SocialMessage[];
  isTyping?: boolean;
  typingUserName?: string;
  typingUserId?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string;
  actorVerified?: boolean;
  type:
    | 'like'
    | 'reaction'
    | 'comment'
    | 'reply'
    | 'follow'
    | 'follow_request'
    | 'mention'
    | 'tag'
    | 'message'
    | 'story_reply'
    | 'story_view'
    | 'system';
  targetId?: string;
  targetType?: 'post' | 'comment' | 'story' | 'profile' | 'message';
  text: string;
  createdAt: number;
  isRead: boolean;
  thumbnailUrl?: string;
}

export type SocialNotification = NotificationItem;

export interface ReportItem {
  id: string;
  reporterId: string;
  targetType: 'post' | 'account' | 'message' | 'comment';
  targetId: string;
  reason:
    | 'spam'
    | 'harassment'
    | 'hate'
    | 'violence'
    | 'sexual'
    | 'scam'
    | 'impersonation'
    | 'copyright'
    | 'dangerous'
    | 'other';
  notes?: string;
  createdAt: number;
}

// Navigation Tab enum
export type NavDestination = 'home' | 'messages' | 'pulse' | 'discover' | 'profile';

// Backward compatibility types for legacy components
export interface RoomPlayer {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  avatar: string;
  level: number;
  league: string;
  kissPoints: number;
  emotionPoints: number;
  admire: number;
  seatIndex: number;
  isOnline: boolean;
  currentEmotion?: string;
  emotionExpiry?: number;
  isHost?: boolean;
  equippedFrame?: string;
  badgeNumber?: number;
  frameStyle?: string;
  decorationSticker?: string;
  customLabel?: string;
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  heartCost: number;
  minLevel: number;
  is18Plus?: boolean;
  animationType: 'rose' | 'coffee' | 'cake' | 'teddy' | 'diamond' | 'headphones' | 'kiss' | 'phone' | 'lingerie' | 'champagne';
  description: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderGender: Gender;
  senderAvatar: string;
  text: string;
  originalText?: string;
  originalLanguage?: string;
  translations?: Record<string, string>;
  reactions?: Record<string, string>;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  timestamp: number;
  type: 'chat' | 'gift' | 'kiss' | 'kick' | 'emotion' | 'system';
  giftInfo?: {
    giftName: string;
    giftIcon: string;
    recipientName: string;
  };
}

export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  players: RoomPlayer[];
  chatMessages: ChatMessage[];
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  seenAt?: number;
  reactions?: Record<string, string>;
  translation?: string;
  translatedToLang?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  isSaved?: boolean;
  bubbleStyle?: string;
}

export interface PrivateConversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  partnerAge: number;
  partnerGender: Gender;
  partnerLevel: number;
  statusText?: string;
  lastActive: string;
  isOnline: boolean;
  unreadCount: number;
  messages: PrivateMessage[];
  partnerReadStatusEnabled?: boolean;
  isBlockedByMe?: boolean;
  isBlockedByPartner?: boolean;
  isTyping?: boolean;
  typingUserName?: string;
  typingUserId?: string;
}

export interface StorePackage {
  id: string;
  type: 'hearts' | 'money';
  starsCost: number;
  amount: number;
  bonusText?: string;
  popular?: boolean;
}

export interface KissRequest {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderGender: Gender;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  recipientGender: Gender;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export type ActiveTab = 'home' | 'messages' | 'create' | 'discover' | 'profile' | 'game' | 'story' | 'account';

export interface StoryChoice {
  id: string;
  text: string;
  nextSceneId: string;
  requiredLevel?: number;
  statBoost?: {
    affection?: number;
    boldness?: number;
    charm?: number;
  };
  statLabel?: string;
  flagSet?: string;
  rewards?: {
    hearts?: number;
    xp?: number;
  };
}

export interface StoryDialogue {
  id: string;
  speaker: string;
  speakerAvatar?: string;
  speakerRole?: string;
  side?: 'left' | 'right' | 'center';
  expression?: 'happy' | 'flirty' | 'blush' | 'surprised' | 'dramatic' | 'cool' | 'wink' | 'angry';
  text: string;
  audioCue?: 'kiss' | 'cheer' | 'jackpot' | 'gift' | 'message';
}

export interface StoryEndingRewards {
  xp: number;
  hearts: number;
  moneyPoints: number;
  badgeId?: string;
  badgeName?: string;
  frameId?: string;
  frameName?: string;
  emotionReward?: string;
}

export interface StoryScene {
  id: string;
  bgImage: string;
  bgTitle?: string;
  dialogues: StoryDialogue[];
  choices?: StoryChoice[];
  isEnding?: boolean;
  endingTitle?: string;
  endingGrade?: 'S' | 'A' | 'B' | 'Special' | 'Secret';
  endingBadge?: string;
  endingDescription?: string;
  endingRewards?: StoryEndingRewards;
}

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  summary: string;
  requiredLevel: number;
  initialSceneId: string;
  scenes: Record<string, StoryScene>;
  rewards: {
    xp: number;
    hearts: number;
    moneyPoints: number;
    exclusiveReward?: string;
  };
}

export interface VisualNovelStory {
  id: string;
  title: string;
  tagline: string;
  coverImage: string;
  genre: 'Romance' | 'Tokyo Neon' | 'Rooftop Flirt' | 'Subway Mystery' | 'VIP Party' | 'Summer Crush';
  genreColor: string;
  difficulty: 'Casual' | 'Steamy' | 'Adventurous' | 'Dramatic';
  rating: string;
  description: string;
  requiredLevel: number;
  chapters: StoryChapter[];
  totalEndings: number;
  featuredBadge?: string;
}

export interface StoryProgress {
  storyId: string;
  completedChapters: string[];
  currentChapterId: string;
  currentSceneId?: string;
  unlockedEndings: string[];
  relationshipStats: {
    affection: number;
    boldness: number;
    charm: number;
  };
  flags: string[];
  lastPlayedTimestamp: number;
}

export type AchievementCategory = 'reading' | 'community' | 'collector' | 'mastery' | 'milestone' | 'social' | 'creation';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementItem {
  id: string;
  name: string;
  shortDescription: string;
  icon: string;
  imageUrl?: string;
  category: AchievementCategory;
  isUnlocked: boolean;
  unlockedDate?: string;
  rarityPercentage?: number;
  rarityTier?: AchievementRarity;
  progress?: {
    current: number;
    max: number;
    unit?: string;
  };
  isFeatured?: boolean; // Displayed in profile pinned showcase
}

export interface ReadingStoryItem {
  id: string;
  webtoonId: string;
  title: string;
  author: string;
  coverImage: string;
  currentEpisode: number;
  totalEpisodes: number;
  progressPercentage: number;
  lastReadDate: string;
  genre: string;
  status: 'currently_reading' | 'completed' | 'saved';
  rating?: number;
}

