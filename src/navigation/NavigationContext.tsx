import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppRoute, parsePathToRoute } from './types';
import { User } from '../types';

interface NavigationContextValue {
  currentRoute: AppRoute;
  historyStack: AppRoute[];
  canGoBack: boolean;
  activeTab: 'home' | 'discover' | 'pulse' | 'messages' | 'profile';
  navigate: (route: AppRoute, options?: { replace?: boolean; skipBrowserPush?: boolean }) => void;
  openHome: () => void;
  openDiscover: () => void;
  openPulse: () => void;
  openMessages: (conversationId?: string) => void;
  openProfile: (
    userId: string,
    userData?: Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }
  ) => void;
  openBook: (bookId: string, initialEpisodeNumber?: number) => void;
  openChapter: (chapterId: string, bookId?: string, episodeNumber?: number) => void;
  openSettings: () => void;
  goBack: () => void;
  setScrollContainerRef: (el: HTMLElement | null) => void;
  saveCurrentScroll: () => void;
  restoreScroll: (routeKey?: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track scroll container and saved scroll positions
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const pushedCountRef = useRef(0);

  // Initialize route from current browser window.location.pathname
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return parsePathToRoute(window.location.pathname);
    }
    return { key: 'home', type: 'home', path: '/', title: 'enmmoe' };
  });

  const currentRouteRef = useRef(currentRoute);
  currentRouteRef.current = currentRoute;

  // History stack for in-app navigation
  const [historyStack, setHistoryStack] = useState<AppRoute[]>(() => {
    if (typeof window !== 'undefined') {
      const initial = parsePathToRoute(window.location.pathname);
      if (initial.type !== 'home') {
        // If loaded directly at /book/:id or /profile/:id, provide home as root of stack
        return [{ key: 'home', type: 'home', path: '/', title: 'enmmoe' }, initial];
      }
      return [initial];
    }
    return [{ key: 'home', type: 'home', path: '/', title: 'enmmoe' }];
  });

  const setScrollContainerRef = useCallback((el: HTMLElement | null) => {
    scrollContainerRef.current = el;
  }, []);

  const saveCurrentScroll = useCallback(() => {
    if (scrollContainerRef.current && currentRouteRef.current) {
      scrollPositionsRef.current[currentRouteRef.current.key] = scrollContainerRef.current.scrollTop;
    }
  }, []);

  const restoreScroll = useCallback((routeKey?: string) => {
    const key = routeKey || currentRouteRef.current.key;
    const targetScroll = scrollPositionsRef.current[key] ?? 0;
    // Restore on next animation frame to ensure DOM is painted
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = targetScroll;
      }
    });
  }, []);

  // Navigate to a new route
  const navigate = useCallback(
    (newRoute: AppRoute, options?: { replace?: boolean; skipBrowserPush?: boolean }) => {
      const active = currentRouteRef.current;
      // Do not trigger unnecessary navigation, history pushes, or re-renders on identical active route
      if (
        !options?.replace &&
        active.key === newRoute.key &&
        active.path === newRoute.path
      ) {
        return;
      }

      // 1. Save scroll position of outgoing screen
      if (scrollContainerRef.current) {
        scrollPositionsRef.current[active.key] = scrollContainerRef.current.scrollTop;
      }

      // 2. Update browser history API
      if (typeof window !== 'undefined' && !options?.skipBrowserPush) {
        if (options?.replace) {
          window.history.replaceState({ route: newRoute }, '', newRoute.path);
        } else {
          window.history.pushState({ route: newRoute }, '', newRoute.path);
          pushedCountRef.current += 1;
        }
      }

      // 3. Update internal screen state and stack
      currentRouteRef.current = newRoute;
      setCurrentRoute(newRoute);
      setHistoryStack((prev) => {
        if (options?.replace) {
          const next = [...prev];
          if (next.length > 0) {
            next[next.length - 1] = newRoute;
            return next;
          }
          return [newRoute];
        }
        // Don't push duplicate identical routes sequentially
        const last = prev[prev.length - 1];
        if (last && last.key === newRoute.key && last.path === newRoute.path) {
          return prev;
        }
        return [...prev, newRoute];
      });

      // 4. Restore scroll for the destination screen (or 0 if new)
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPositionsRef.current[newRoute.key] ?? 0;
        }
      });
    },
    []
  );

  // In-App and Hardware Back handler
  const goBack = useCallback(() => {
    // Save current scroll
    if (scrollContainerRef.current) {
      scrollPositionsRef.current[currentRouteRef.current.key] = scrollContainerRef.current.scrollTop;
    }

    if (pushedCountRef.current > 0 && historyStack.length > 1 && typeof window !== 'undefined') {
      pushedCountRef.current = Math.max(0, pushedCountRef.current - 1);
      window.history.back();
      return;
    }

    if (historyStack.length > 1) {
      const target = historyStack[historyStack.length - 2];
      setHistoryStack((prev) => prev.slice(0, Math.max(1, prev.length - 1)));
      if (typeof window !== 'undefined') {
        window.history.replaceState({ route: target }, '', target.path);
      }
      currentRouteRef.current = target;
      setCurrentRoute(target);
      return;
    }

    // Fallback to Home if at the root of the stack
    const homeRoute: AppRoute = { key: 'home', type: 'home', path: '/', title: 'enmmoe' };
    navigate(homeRoute, { replace: true });
  }, [historyStack, navigate]);

  // Handle browser / Android back and forward events (`popstate`)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Save scroll of screen being exited
      if (scrollContainerRef.current) {
        scrollPositionsRef.current[currentRouteRef.current.key] = scrollContainerRef.current.scrollTop;
      }

      let targetRoute: AppRoute;
      if (event.state && event.state.route) {
        targetRoute = event.state.route;
      } else {
        targetRoute = parsePathToRoute(window.location.pathname);
      }

      currentRouteRef.current = targetRoute;
      setCurrentRoute(targetRoute);

      setHistoryStack((prev) => {
        if (prev.length > 1) {
          // Check if targetRoute is earlier in the stack
          const existingIdx = prev.findIndex((r) => r.key === targetRoute.key);
          if (existingIdx >= 0) {
            return prev.slice(0, existingIdx + 1);
          }
          return prev.slice(0, prev.length - 1);
        }
        return [targetRoute];
      });

      // Restore scroll position
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPositionsRef.current[targetRoute.key] ?? 0;
        }
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Convenience navigation shortcuts
  const openHome = useCallback(() => {
    navigate({ key: 'home', type: 'home', path: '/', title: 'enmmoe' });
  }, [navigate]);

  const openDiscover = useCallback(() => {
    navigate({ key: 'discover', type: 'discover', path: '/discover', title: 'Discover' });
  }, [navigate]);

  const openPulse = useCallback(() => {
    navigate({ key: 'pulse', type: 'pulse', path: '/pulse', title: 'enmmoe+' });
  }, [navigate]);

  const openMessages = useCallback((conversationId?: string) => {
    const path = conversationId ? `/messages/${conversationId}` : '/messages';
    navigate({
      key: conversationId ? `messages-${conversationId}` : 'messages',
      type: 'messages',
      path,
      conversationId,
      title: conversationId ? 'Chat' : 'Messages',
    });
  }, [navigate]);

  const openProfile = useCallback(
    (
      userId: string,
      userData?: Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }
    ) => {
      navigate({
        key: `profile-${userId}`,
        type: 'profile',
        userId,
        user: userData,
        path: `/profile/${userId}`,
        title: userData?.name || 'Profile',
      });
    },
    [navigate]
  );

  const openBook = useCallback((bookId: string, initialEpisodeNumber?: number) => {
    navigate({
      key: `book-${bookId}`,
      type: 'book',
      bookId,
      initialEpisodeNumber,
      path: `/book/${bookId}`,
      title: 'Book',
    });
  }, [navigate]);

  const openChapter = useCallback((chapterId: string, bookId?: string, episodeNumber?: number) => {
    navigate({
      key: `chapter-${chapterId}`,
      type: 'chapter',
      chapterId,
      bookId,
      episodeNumber,
      path: `/chapter/${chapterId}`,
      title: 'Chapter',
    });
  }, [navigate]);

  const openSettings = useCallback(() => {
    navigate({ key: 'settings', type: 'settings', path: '/settings', title: 'Settings' });
  }, [navigate]);

  // Compute active bottom navigation tab based on current screen
  let activeTab: 'home' | 'discover' | 'pulse' | 'messages' | 'profile' = 'home';
  if (currentRoute.type === 'messages') {
    activeTab = 'messages';
  } else if (currentRoute.type === 'discover') {
    activeTab = 'discover';
  } else if (currentRoute.type === 'pulse') {
    activeTab = 'pulse';
  } else if (
    currentRoute.type === 'profile' &&
    (currentRoute.userId === 'me' || currentRoute.userId === 'user-me')
  ) {
    activeTab = 'profile';
  } else if (currentRoute.type === 'home' || currentRoute.type === 'book' || currentRoute.type === 'chapter') {
    activeTab = 'home';
  }

  const canGoBack = historyStack.length > 1;

  return (
    <NavigationContext.Provider
      value={{
        currentRoute,
        historyStack,
        canGoBack,
        activeTab,
        navigate,
        openHome,
        openDiscover,
        openPulse,
        openMessages,
        openProfile,
        openBook,
        openChapter,
        openSettings,
        goBack,
        setScrollContainerRef,
        saveCurrentScroll,
        restoreScroll,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return ctx;
};
