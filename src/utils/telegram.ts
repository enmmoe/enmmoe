/**
 * Telegram WebApp Integration Helper
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        viewportHeight?: number;
        expand: () => void;
        ready: () => void;
        close: () => void;
        openInvoice?: (url: string, callback?: (status: string) => void) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export const isTelegramWebApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
};

export const initTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    webApp.ready();
    webApp.expand();
  }
};

export const getTelegramUserData = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
};

export const triggerHaptic = (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'selection' | 'warning' | 'error' = 'medium'
) => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    const haptic = window.Telegram.WebApp.HapticFeedback;
    if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else if (type === 'selection') {
      haptic.selectionChanged();
    } else {
      haptic.impactOccurred(type);
    }
  }
};

export const openTelegramInvoice = (invoiceUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openInvoice) {
      window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
        resolve(status); // 'paid' | 'cancelled' | 'failed' | 'pending'
      });
    } else {
      // Direct Web Fallback simulation for preview testing
      setTimeout(() => {
        resolve('paid');
      }, 1500);
    }
  });
};
