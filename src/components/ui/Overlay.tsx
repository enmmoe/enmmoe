import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeightClass?: string;
  showCloseButton?: boolean;
  headerRight?: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeightClass = 'max-h-[88vh]',
  showCloseButton = true,
  headerRight,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 32, stiffness: 360, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 450) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 w-full sm:max-w-md bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-t-[24px] sm:rounded-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.16)] flex flex-col overflow-hidden ${maxHeightClass}`}
          >
            {/* Drag Handle */}
            <div className="pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-9 h-1 rounded-full bg-black/[0.15] dark:bg-white/[0.22]" />
            </div>

            {(title || showCloseButton || headerRight) && (
              <div className="px-4 py-2.5 flex items-center justify-between shrink-0">
                <h3 className="text-[18px] font-semibold truncate">{title}</h3>
                <div className="flex items-center gap-2">
                  {headerRight}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] hover:text-black dark:hover:text-white flex items-center justify-center ios-press cursor-pointer"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pb-safe">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  destructive?: boolean;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = false,
  children,
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-[2px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-[320px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] shadow-2xl overflow-hidden text-center"
        >
          <div className="p-5">
            <h3 className="text-[18px] font-semibold text-black dark:text-white">{title}</h3>
            {description && (
              <p className="text-[14px] text-[#8E8E93] mt-1.5 leading-snug">{description}</p>
            )}
            {children && <div className="mt-3 text-left">{children}</div>}
          </div>

          <div className="grid grid-cols-2 border-t border-black/[0.08] dark:border-white/[0.1] divide-x divide-black/[0.08] dark:divide-white/[0.1]">
            <button
              type="button"
              onClick={onClose}
              className="py-3 text-[17px] font-normal text-[#007AFF] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm?.();
                onClose();
              }}
              className={`py-3 text-[17px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer ${
                destructive
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-[#007AFF]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
