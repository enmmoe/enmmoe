import { WebtoonItem } from '../data/webtoonData';
import { SocialConversation, SocialPost, Story, User } from '../types';

export type PublicProfileSeed = Partial<User> & {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified?: boolean;
};

export function authorNameToProfileId(authorName: string): string {
  const slug = authorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `author-${slug || 'creator'}`;
}

export function authorNameToUsername(authorName: string): string {
  const handle = authorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return handle || 'creator';
}

export function buildSeriesAuthorProfileSeed(
  authorName: string,
  creators: User[] = [],
  currentUser?: User
): PublicProfileSeed {
  const normalized = authorName.trim().toLowerCase();

  if (
    currentUser &&
    (currentUser.name.trim().toLowerCase() === normalized ||
      currentUser.username.trim().toLowerCase() === normalized)
  ) {
    return {
      ...currentUser,
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      avatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
    };
  }

  const matched = creators.find(
    (c) =>
      c.name.trim().toLowerCase() === normalized ||
      c.username.trim().toLowerCase() === normalized
  );

  if (matched) {
    return matched;
  }

  return {
    id: authorNameToProfileId(authorName),
    name: authorName,
    username: authorNameToUsername(authorName),
    avatar: '',
    isAuthor: true,
    isVerified: false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    likesCount: 0,
  };
}

export function getAuthoredWebtoons(
  user: Pick<User, 'id' | 'name' | 'username'>,
  webtoons: WebtoonItem[] = []
): WebtoonItem[] {
  const normalizedName = (user.name || '').trim().toLowerCase();
  const normalizedUsername = (user.username || '').trim().toLowerCase();

  return webtoons.filter((w) => {
    const authorLower = (w.author || '').trim().toLowerCase();
    if (!authorLower) return false;
    return (
      authorLower === normalizedName ||
      authorNameToProfileId(w.author) === user.id ||
      (normalizedUsername && authorNameToUsername(w.author) === normalizedUsername)
    );
  });
}

export function resolvePublicUser({
  userId,
  partialUser,
  currentUser,
  creators = [],
  posts = [],
  stories = [],
  conversations = [],
  webtoons = [],
}: {
  userId: string;
  partialUser?: Partial<User> | null;
  currentUser: User;
  creators?: User[];
  posts?: SocialPost[];
  stories?: Story[];
  conversations?: SocialConversation[];
  webtoons?: WebtoonItem[];
}): User {
  if (userId === 'me' || userId === currentUser.id) {
    return currentUser;
  }

  const partialUsername = (partialUser?.username || '').trim().toLowerCase();
  const partialName = (partialUser?.name || '').trim().toLowerCase();

  // 1. Direct match in creators directory (by id or username)
  const matchedCreator =
    creators.find((c) => c.id === userId) ||
    (partialUsername
      ? creators.find((c) => c.username.trim().toLowerCase() === partialUsername)
      : undefined) ||
    (partialName
      ? creators.find((c) => c.name.trim().toLowerCase() === partialName)
      : undefined);

  // 2. Gather extra metadata from posts, comments, stories, and conversations if not a directory creator
  let derivedName = partialUser?.name || matchedCreator?.name || '';
  let derivedUsername = partialUser?.username || matchedCreator?.username || '';
  let derivedAvatar = partialUser?.avatar ?? matchedCreator?.avatar ?? '';
  let derivedVerified = partialUser?.isVerified ?? matchedCreator?.isVerified;

  if (!derivedName || !derivedAvatar) {
    const authoredPost = posts.find(
      (p) =>
        p.authorId === userId ||
        (partialUsername && p.authorUsername.toLowerCase() === partialUsername)
    );
    if (authoredPost) {
      derivedName = derivedName || authoredPost.authorName;
      derivedUsername = derivedUsername || authoredPost.authorUsername;
      derivedAvatar = derivedAvatar || authoredPost.authorAvatar;
      derivedVerified = derivedVerified ?? authoredPost.authorVerified;
    }
  }

  if (!derivedName || !derivedAvatar) {
    for (const post of posts) {
      const topComment = (post.comments || []).find((c) => c.authorId === userId);
      if (topComment) {
        derivedName = derivedName || topComment.authorName;
        derivedUsername = derivedUsername || topComment.authorUsername;
        derivedAvatar = derivedAvatar || topComment.authorAvatar;
        derivedVerified = derivedVerified ?? topComment.authorVerified;
        break;
      }
      for (const comment of post.comments || []) {
        const reply = (comment.replies || []).find((r) => r.authorId === userId);
        if (reply) {
          derivedName = derivedName || reply.authorName;
          derivedUsername = derivedUsername || reply.authorUsername;
          derivedAvatar = derivedAvatar || reply.authorAvatar;
          derivedVerified = derivedVerified ?? reply.authorVerified;
          break;
        }
      }
      if (derivedName && derivedAvatar) break;
    }
  }

  if (!derivedName || !derivedAvatar) {
    const story = stories.find(
      (s) =>
        s.authorId === userId ||
        (partialUsername && s.authorUsername.toLowerCase() === partialUsername)
    );
    if (story) {
      derivedName = derivedName || story.authorName;
      derivedUsername = derivedUsername || story.authorUsername;
      derivedAvatar = derivedAvatar || story.authorAvatar;
      derivedVerified = derivedVerified ?? story.authorVerified;
    } else {
      for (const s of stories) {
        const viewer = (s.viewers || []).find((v) => v.userId === userId);
        if (viewer) {
          derivedName = derivedName || viewer.name;
          derivedUsername = derivedUsername || viewer.username;
          derivedAvatar = derivedAvatar || viewer.avatar;
          break;
        }
      }
    }
  }

  if (!derivedName || !derivedAvatar) {
    for (const conv of conversations) {
      const participant = (conv.participants || []).find(
        (p) =>
          p.id === userId ||
          (partialUsername && p.username.toLowerCase() === partialUsername)
      );
      if (participant) {
        derivedName = derivedName || participant.name;
        derivedUsername = derivedUsername || participant.username;
        derivedAvatar = derivedAvatar || participant.avatar;
        derivedVerified = derivedVerified ?? participant.isVerified;
        break;
      }
      const msg = (conv.messages || []).find((m) => m.senderId === userId);
      if (msg) {
        derivedName = derivedName || msg.senderName;
        derivedUsername = derivedUsername || msg.senderUsername;
        derivedAvatar = derivedAvatar || msg.senderAvatar;
        break;
      }
    }
  }

  // 3. Series author match
  const matchedSeries = webtoons.find(
    (w) =>
      authorNameToProfileId(w.author) === userId ||
      (derivedName && w.author.trim().toLowerCase() === derivedName.trim().toLowerCase())
  );
  if (matchedSeries && !derivedName) {
    derivedName = matchedSeries.author;
    derivedUsername = derivedUsername || authorNameToUsername(matchedSeries.author);
  }

  const finalName = derivedName || 'Creator';
  const finalUsername = derivedUsername || authorNameToUsername(finalName);

  const authoredPostsCount = posts.filter(
    (p) =>
      p.authorId === (matchedCreator?.id || userId) ||
      (finalUsername &&
        p.authorUsername &&
        p.authorUsername.toLowerCase() === finalUsername.toLowerCase())
  ).length;

  const isAuthor = Boolean(
    partialUser?.isAuthor ?? matchedCreator?.isAuthor ?? Boolean(matchedSeries)
  );

  const merged: User = {
    gender: 'Non-binary',
    hearts: 0,
    moneyPoints: 0,
    level: 1,
    xp: 0,
    maxXp: 100,
    kissPoints: 0,
    emotionPoints: 0,
    admire: 0,
    league: 'Bronze',
    rank: 0,
    referralCode: '',
    referralCount: 0,
    lastClaimTimestamp: 0,
    isChannelJoined: false,
    inventory: [],
    relationships: [],
    guests: [],
    isPrivate: false,
    allowFollowFrom: 'everyone',
    allowMessagesFrom: 'everyone',
    isReadingActivityPublic: true,
    isCurrentlyReadingVisible: true,
    isAchievementsPublic: true,
    ...(matchedCreator || {}),
    ...(partialUser || {}),
    id: matchedCreator?.id || userId,
    name: finalName,
    username: finalUsername,
    avatar: derivedAvatar,
    bio: partialUser?.bio ?? matchedCreator?.bio,
    joinDate: partialUser?.joinDate ?? matchedCreator?.joinDate,
    isVerified: Boolean(derivedVerified),
    isPremium: Boolean(partialUser?.isPremium ?? matchedCreator?.isPremium),
    isAuthor,
    followersCount:
      matchedCreator?.followersCount ?? partialUser?.followersCount ?? 0,
    followingCount:
      matchedCreator?.followingCount ?? partialUser?.followingCount ?? 0,
    postsCount: Math.max(
      authoredPostsCount,
      matchedCreator?.postsCount ?? partialUser?.postsCount ?? 0
    ),
    likesCount: matchedCreator?.likesCount ?? partialUser?.likesCount ?? 0,
    showcasedAchievementIds:
      partialUser?.showcasedAchievementIds ?? matchedCreator?.showcasedAchievementIds,
    followersIds: partialUser?.followersIds ?? matchedCreator?.followersIds,
    followingIds: partialUser?.followingIds ?? matchedCreator?.followingIds,
  };

  return merged;
}
