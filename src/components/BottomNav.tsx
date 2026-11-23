import React, { useState, useEffect, useId } from 'react';
import { NavDestination } from '../types';
import { useLanguage } from '../utils/i18n';

interface BottomNavProps {
  activeTab: NavDestination;
  onTabChange: (tab: NavDestination) => void;
  unreadMessagesCount?: number;
  userAvatar?: string;
  userName?: string;
  theme?: 'light' | 'dark';
}

const HomeNavIcon: React.FC<{ active: boolean }> = ({ active }) =>
  active ? (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.2 20.2H5.6C4.72 20.2 4 19.48 4 18.6V10.65C4 9.95 4.32 9.28 4.88 8.85L10.78 4.22C11.5 3.66 12.5 3.66 13.22 4.22L19.12 8.85C19.68 9.28 20 9.95 20 10.65V18.6C20 19.48 19.28 20.2 18.4 20.2H14.8V14.6C14.8 13.05 13.55 11.8 12 11.8C10.45 11.8 9.2 13.05 9.2 14.6V20.2Z" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.05}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.2 20.2H5.6C4.72 20.2 4 19.48 4 18.6V10.65C4 9.95 4.32 9.28 4.88 8.85L10.78 4.22C11.5 3.66 12.5 3.66 13.22 4.22L19.12 8.85C19.68 9.28 20 9.95 20 10.65V18.6C20 19.48 19.28 20.2 18.4 20.2H14.8V14.6C14.8 13.05 13.55 11.8 12 11.8C10.45 11.8 9.2 13.05 9.2 14.6V20.2Z" />
    </svg>
  );

const StoriesNavIcon: React.FC<{ active: boolean }> = ({ active }) =>
  active ? (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.2 2.7H14.8A5 5 0 0 1 19.8 7.7V16.3A5 5 0 0 1 14.8 21.3H9.2A5 5 0 0 1 4.2 16.3V7.7A5 5 0 0 1 9.2 2.7ZM10.1 9.35C10.1 8.78 10.72 8.43 11.21 8.73L15.48 11.38C15.94 11.67 15.94 12.33 15.48 12.62L11.21 15.27C10.72 15.57 10.1 15.22 10.1 14.65V9.35Z"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.05}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="3.5" width="14" height="17" rx="4.4" />
      <path d="M10.45 9.65C10.45 9.15 11.0 8.85 11.43 9.11L15.18 11.46C15.59 11.71 15.59 12.29 15.18 12.54L11.43 14.89C11.0 15.15 10.45 14.85 10.45 14.35V9.65Z" />
    </svg>
  );

const DIRECT_OUTLINE_PATH =
  'M5.85 4.65H18.1C19.75 4.65 20.62 6.45 19.7 7.82C17.85 10.62 15.65 14.55 13.85 18.22C13.05 19.85 10.75 19.65 10.28 17.9L9.45 13.15C9.32 12.42 8.95 11.75 8.38 11.25L4.52 7.85C3.42 6.88 4.12 4.65 5.85 4.65Z';

const MessagesNavIcon: React.FC<{ active: boolean }> = ({ active }) => {
  const rawId = useId();
  const maskId = `ig-direct-mask-${rawId.replace(/:/g, '')}`;

  if (active) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect width="24" height="24" fill="white" />
            <path
              d="M9.6 12.05L14.2 8.6"
              stroke="black"
              strokeWidth={2.25}
              strokeLinecap="round"
            />
          </mask>
        </defs>
        <path
          d={DIRECT_OUTLINE_PATH}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1.05}
          strokeLinecap="round"
          strokeLinejoin="round"
          mask={`url(#${maskId})`}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.05}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={DIRECT_OUTLINE_PATH} />
      <path d="M9.6 12.05L14.2 8.6" />
    </svg>
  );
};

const SearchNavIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    viewBox="0 0 24 24"
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? 2.95 : 2.05}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="10.8" cy="10.8" r="6.6" />
    <path d="M19.8 19.8L15.6 15.6" />
  </svg>
);

const ProfileFallbackIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    viewBox="0 0 24 24"
    className="w-6 h-6"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={active ? 1.8 : 2.05}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8.25" r="3.75" />
    <path d="M5 19.75a7 7 0 0 1 14 0" />
  </svg>
);

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadMessagesCount = 0,
  userAvatar,
  userName,
}) => {
  const { t } = useLanguage();
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [userAvatar]);

  const navItems: Array<{ id: NavDestination; label: string }> = [
    { id: 'home', label: t('nav_home', 'Home') },
    { id: 'pulse', label: 'enmmoe+' },
    { id: 'messages', label: t('nav_messages', 'Messages') },
    { id: 'discover', label: t('search', 'Search') },
    { id: 'profile', label: t('nav_profile', 'Profile') },
  ];

  return (
    <nav
      id="ios-tab-bar"
      aria-label={t('main_navigation', 'Main Navigation')}
      className="shrink-0 w-full z-40 bg-white dark:bg-[#0B0B0D] select-none"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="grid grid-cols-5 h-[54px] max-w-2xl mx-auto px-1.5">
        {navItems.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`nav-btn-${id}`}
              type="button"
              onClick={() => onTabChange(id)}
              aria-label={label}
              title={label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex items-center justify-center min-h-[44px] h-full w-full text-black dark:text-white bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-black dark:focus-visible:outline-white [-webkit-tap-highlight-color:transparent]"
            >
              <div
                className={`flex items-center justify-center w-[64px] h-[38px] rounded-full ${
                  isActive ? 'bg-[#EFEFF4] dark:bg-white/[0.12]' : 'bg-transparent'
                }`}
              >
                <div className="relative flex items-center justify-center w-6 h-6">
                  {id === 'home' && <HomeNavIcon active={isActive} />}
                  {id === 'pulse' && <StoriesNavIcon active={isActive} />}
                  {id === 'messages' && <MessagesNavIcon active={isActive} />}
                  {id === 'discover' && <SearchNavIcon active={isActive} />}
                  {id === 'profile' &&
                    (userAvatar && !avatarFailed ? (
                      <div
                        className={`w-6 h-6 aspect-square rounded-full overflow-hidden ${
                          isActive
                            ? 'ring-[1.75px] ring-black dark:ring-white'
                            : 'ring-1 ring-black/15 dark:ring-white/20'
                        }`}
                      >
                        <img
                          src={userAvatar}
                          alt={userName || label}
                          onError={() => setAvatarFailed(true)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <ProfileFallbackIcon active={isActive} />
                    ))}

                  {id === 'messages' && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF3040] text-white text-[10px] font-semibold flex items-center justify-center leading-none border-[1.5px] border-white dark:border-[#0B0B0D] tabular-nums">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
