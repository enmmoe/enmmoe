import { User } from '../types';

export type RouteType = 'home' | 'discover' | 'pulse' | 'messages' | 'profile' | 'book' | 'chapter' | 'settings';

export interface BaseRoute {
  key: string;
  type: RouteType;
  path: string;
  title?: string;
}

export interface HomeRoute extends BaseRoute {
  type: 'home';
}

export interface DiscoverRoute extends BaseRoute {
  type: 'discover';
}

export interface PulseRoute extends BaseRoute {
  type: 'pulse';
}

export interface MessagesRoute extends BaseRoute {
  type: 'messages';
  conversationId?: string;
}

export interface ProfileRoute extends BaseRoute {
  type: 'profile';
  userId: string;
  user?: Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean };
}

export interface BookRoute extends BaseRoute {
  type: 'book';
  bookId: string;
  initialEpisodeNumber?: number;
}

export interface ChapterRoute extends BaseRoute {
  type: 'chapter';
  chapterId: string;
  bookId?: string;
  episodeNumber?: number;
}

export interface SettingsRoute extends BaseRoute {
  type: 'settings';
}

export type AppRoute =
  | HomeRoute
  | DiscoverRoute
  | PulseRoute
  | MessagesRoute
  | ProfileRoute
  | BookRoute
  | ChapterRoute
  | SettingsRoute;

/**
 * Parses any browser pathname into a typed AppRoute
 * Supports:
 * - /
 * - /home
 * - /discover
 * - /messages
 * - /messages/:convId
 * - /profile/:userId
 * - /book/:bookId
 * - /chapter/:chapterId
 * - /settings
 */
export function parsePathToRoute(pathname: string): AppRoute {
  const cleanPath = pathname.split('?')[0].split('#')[0];
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0 || segments[0] === 'home') {
    return {
      key: 'home',
      type: 'home',
      path: '/',
      title: 'enmmoe',
    };
  }

  const [first, second, third, fourth] = segments;

  if (first === 'discover' || first === 'search') {
    return {
      key: 'discover',
      type: 'discover',
      path: '/discover',
      title: 'Discover',
    };
  }

  if (first === 'pulse' || first === 'enmmoe-plus' || first === 'world' || first === 'studio') {
    return {
      key: 'pulse',
      type: 'pulse',
      path: '/pulse',
      title: 'enmmoe+',
    };
  }

  if (first === 'messages' || first === 'chat') {
    return {
      key: second ? `messages-${second}` : 'messages',
      type: 'messages',
      path: second ? `/messages/${second}` : '/messages',
      conversationId: second,
      title: second ? 'Chat' : 'Messages',
    };
  }

  if (first === 'profile' || first === 'user' || first === '@') {
    const userId = second || 'me';
    return {
      key: `profile-${userId}`,
      type: 'profile',
      userId,
      path: `/profile/${userId}`,
      title: 'Profile',
    };
  }

  if (first === 'book' || first === 'webtoon' || first === 'series') {
    const bookId = second || 'otherworldly-family-man';
    // If route is /book/:bookId/chapter/:chapterId
    if (third === 'chapter' || third === 'episode') {
      const chapterId = fourth || 'ep-1';
      return {
        key: `chapter-${chapterId}`,
        type: 'chapter',
        chapterId,
        bookId,
        path: `/chapter/${chapterId}`,
        title: 'Chapter',
      };
    }
    return {
      key: `book-${bookId}`,
      type: 'book',
      bookId,
      path: `/book/${bookId}`,
      title: 'Book',
    };
  }

  if (first === 'chapter' || first === 'episode') {
    const chapterId = second || 'ep-1';
    return {
      key: `chapter-${chapterId}`,
      type: 'chapter',
      chapterId,
      path: `/chapter/${chapterId}`,
      title: 'Chapter',
    };
  }

  if (first === 'settings') {
    return {
      key: 'settings',
      type: 'settings',
      path: '/settings',
      title: 'Settings',
    };
  }

  // Fallback to home
  return {
    key: 'home',
    type: 'home',
    path: '/',
    title: 'enmmoe',
  };
}
