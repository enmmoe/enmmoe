import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface EnmmoeIntroProps {
  onFinished?: () => void;
}

export const EnmmoeIntro: React.FC<EnmmoeIntroProps> = ({ onFinished }) => {
  const prefersReducedMotion = useReducedMotion();

  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const holdMs = prefersReducedMotion ? 260 : 820;
    const unmountMs = prefersReducedMotion ? 460 : 1140;

    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, holdMs);

    const doneTimer = setTimeout(() => {
      setVisible(false);
      onFinished?.();
    }, unmountMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [prefersReducedMotion, onFinished]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="enmmoe-intro-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: fadingOut ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.18 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-black select-none pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            animate={
              fadingOut
                ? prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 1.03 }
                : { opacity: 1, scale: 1 }
            }
            transition={{
              duration: prefersReducedMotion ? 0.16 : 0.42,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex items-center"
          >
            <span className="text-[36px] sm:text-[42px] font-bold tracking-[-0.045em] lowercase text-black dark:text-white leading-none">
              enm<span className="text-[#007AFF]">moe</span>
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
