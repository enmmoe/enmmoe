import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { CURRENT_USER } from '../data/socialMockData';
import { ProfileView } from './ProfileView';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) | null;
  currentUser?: User;
  isMyProfile?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: (userId: string) => void;
  onSendMessage?: (userId: string) => void;
  onOpenEditProfile?: () => void;
  onOpenBadgeInfo?: () => void;
  onOpenStoryReader?: (storyId: string) => void;
  isLight?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  isFollowing = false,
  onToggleFollow,
  onSendMessage,
  onOpenEditProfile,
  onOpenStoryReader,
}) => {
  if (!isOpen || !user) return null;

  const effectiveCurrentUser: User = currentUser || CURRENT_USER;

  return (
    <AnimatePresence>
      <motion.div
        key="user-profile-screen"
        initial={{ x: '100%', opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.9 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-black text-black dark:text-white"
      >
        <div className="max-w-3xl mx-auto min-h-full">
          <ProfileView
            currentUser={effectiveCurrentUser}
            profileUser={user}
            isFollowing={isFollowing}
            showBackButton={true}
            onBack={onClose}
            onToggleFollow={onToggleFollow}
            onSendMessage={onSendMessage}
            onOpenEditProfile={onOpenEditProfile}
            onOpenBook={onOpenStoryReader}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const UserProfileScreen = UserProfileModal;
export type UserProfileScreenProps = UserProfileModalProps;
