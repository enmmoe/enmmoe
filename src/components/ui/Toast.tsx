import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, WifiOff, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'offline';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (
    message: string,
    options?: {
      type?: ToastType;
      durationMs?: number;
      actionLabel?: string;
      onAction?: () => void;
    }
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  dismissToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      options?: {
        type?: ToastType;
        durationMs?: number;
        actionLabel?: string;
        onAction?: () => void;
      }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const type = options?.type || 'info';
      const durationMs = options?.durationMs ?? 2800;

      setToasts((prev) => [...prev.slice(-2), { id, message, type, actionLabel: options?.actionLabel, onAction: options?.onAction }]);

      if (durationMs > 0) {
        timersRef.current[id] = setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }
    },
    [dismissToast]
  );

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#007AFF] shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-black dark:text-white shrink-0" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-[#8E8E93] shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-[#007AFF] shrink-0" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-3 inset-x-0 z-[100] pointer-events-none flex flex-col items-center gap-2 px-4 pt-safe"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto max-w-sm w-auto min-w-[220px] bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl text-black dark:text-white border border-black/[0.08] dark:border-white/[0.12] rounded-2xl px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)] flex items-center gap-2.5"
            >
              {renderIcon(toast.type)}
              <span className="text-[14px] font-medium leading-snug flex-1">
                {toast.message}
              </span>
              {toast.actionLabel && toast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    dismissToast(toast.id);
                  }}
                  className="text-[13px] font-semibold text-[#007AFF] px-2 py-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                >
                  {toast.actionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-[#8E8E93] hover:text-black dark:hover:text-white p-0.5 rounded-full cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
