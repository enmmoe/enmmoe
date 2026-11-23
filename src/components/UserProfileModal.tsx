import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactionType, SocialPost, User } from '../types';
import { CURRENT_USER } from '../data/socialMockData';
import { ProfileView } from './ProfileView';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: (Partial<User> & { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) | null;
  currentUser?: User;
  creators?: User[];
  posts?: SocialPost[];
  isMyProfile?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: (userId: string) => void;
  onSendMessage?: (userId: string) => void;
  onReactPost?: (postId: string, reaction: ReactionType) => void;
  onOpenComments?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
  onToggleRepost?: (postId: string) => void;
  onVotePoll?: (postId: string, optionId: string) => void;
  onOpenEditProfile?: () => void;
  onOpenBadgeInfo?: () => void;
  onOpenStoryReader?: (storyId: string, initialEpisodeNumber?: number) => void;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  }) => void;
  subscribedWebtoons?: Record<string, boolean>;
  onToggleSubscribe?: (webtoonId: string) => void;
  likedWebtoons?: Record<string, boolean>;
  onToggleLikeWebtoon?: (webtoonId: string) => void;
  isLight?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  creators,
  posts,
  isFollowing = false,
  onToggleFollow,
  onSendMessage,
  onReactPost,
  onOpenComments,
  onToggleSave,
  onToggleRepost,
  onVotePoll,
  onOpenEditProfile,
  onOpenStoryReader,
  onOpenUserProfile,
  subscribedWebtoons,
  onToggleSubscribe,
  likedWebtoons,
  onToggleLikeWebtoon,
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
            creators={creators}
            profileUser={user}
            posts={posts}
            isFollowing={isFollowing}
            showBackButton={true}
            onBack={onClose}
            onToggleFollow={onToggleFollow}
            onSendMessage={onSendMessage}
            onReactPost={onReactPost}
            onOpenComments={onOpenComments}
            onToggleSave={onToggleSave}
            onToggleRepost={onToggleRepost}
            onVotePoll={onVotePoll}
            onOpenEditProfile={onOpenEditProfile}
            onOpenBook={onOpenStoryReader}
            onOpenUserProfile={onOpenUserProfile}
            subscribedWebtoons={subscribedWebtoons}
            onToggleSubscribe={onToggleSubscribe}
            likedWebtoons={likedWebtoons}
            onToggleLikeWebtoon={onToggleLikeWebtoon}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const UserProfileScreen = UserProfileModal;
export type UserProfileScreenProps = UserProfileModalProps;
