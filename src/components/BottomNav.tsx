import React from 'react';
import { motion } from 'motion/react';
import { Home, MessageCircle, Search, User as UserIcon } from 'lucide-react';
import { NavDestination } from '../types';
import { useLanguage } from '../utils/i18n';

interface BottomNavProps {
  activeTab: NavDestination;
  onTabChange: (tab: NavDestination) => void;
  unreadMessagesCount?: number;
  userAvatar?: string;
  theme?: 'light' | 'dark';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadMessagesCount = 0,
}) => {
  const { t } = useLanguage();

  const navItems: Array<{
    id: NavDestination;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: t('nav_home', 'Home'), Icon: Home },
    { id: 'messages', label: t('nav_messages', 'Message'), Icon: MessageCircle },
    { id: 'discover', label: t('search', 'Search'), Icon: Search },
    { id: 'profile', label: t('nav_profile', 'Profile'), Icon: UserIcon },
  ];

  return (
    <nav
      id="ios-tab-bar"
      aria-label="Main Navigation"
      className="shrink-0 w-full z-40 bg-white/92 dark:bg-[#1C1C1E]/92 backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/[0.1] select-none"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="grid grid-cols-4 h-[54px] max-w-2xl mx-auto px-2">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`nav-btn-${id}`}
              type="button"
              onClick={() => onTabChange(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-[3px] min-h-[44px] h-full cursor-pointer ios-press focus-visible:outline-none"
            >
              <motion.div
                animate={{ scale: isActive ? 1.06 : 1 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-center justify-center w-6 h-6"
              >
                <Icon
                  className={`w-[22px] h-[22px] transition-colors duration-150 ${
                    isActive
                      ? 'text-[#007AFF] dark:text-[#0A84FF] stroke-[2.25] fill-[#007AFF]/12 dark:fill-[#0A84FF]/15'
                      : 'text-[#8E8E93] stroke-[1.8]'
                  }`}
                />

                {id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#007AFF] dark:bg-[#0A84FF] text-white text-[10px] font-semibold flex items-center justify-center leading-none border-[1.5px] border-white dark:border-[#1C1C1E] tabular-nums">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </motion.div>

              <span
                className={`text-[12px] font-medium leading-[1.1] whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'text-[#007AFF] dark:text-[#0A84FF]'
                    : 'text-[#8E8E93]'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
