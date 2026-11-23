import React, { useMemo, useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Story, User } from '../types';
import { StoryAuthorGroup, groupStoriesByAuthor } from '../utils/storyMedia';
import { useLanguage } from '../utils/i18n';

export interface StoriesBarProps {
  currentUser: User;
  stories: Story[];
  isLoading?: boolean;
  onOpenAuthorStory: (authorId: string, group: StoryAuthorGroup) => void;
  onOpenCreateStory: () => void;
  className?: string;
}

interface StoryAvatarCircleProps {
  src?: string;
  name: string;
  bordered?: boolean;
}

const StoryAvatarCircle: React.FC<StoryAvatarCircleProps> = ({
  src,
  name,
  bordered = false,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';

  return (
    <div
      className={`w-[60px] h-[60px] aspect-square rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] select-none ${
        bordered ? 'border border-black/[0.08] dark:border-white/[0.12]' : ''
      }`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="block w-full h-full aspect-square rounded-full object-cover"
        />
      ) : (
        <span className="text-[18px] font-semibold text-[#8E8E93] leading-none">
          {initials}
        </span>
      )}
    </div>
  );
};

export const StoriesBar: React.FC<StoriesBarProps> = ({
  currentUser,
  stories,
  isLoading = false,
  onOpenAuthorStory,
  onOpenCreateStory,
  className = '',
}) => {
  const { t } = useLanguage();
  const groups = useMemo(
    () => groupStoriesByAuthor(stories, currentUser),
    [stories, currentUser]
  );

  const ownGroup = groups.find((g) => g.isOwn);
  const otherGroups = groups.filter((g) => !g.isOwn);

  if (isLoading) {
    return (
      <div className={`py-2 ${className}`}>
        <div className="flex items-start gap-3 overflow-x-auto no-scrollbar px-4 py-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
              <div className="w-[68px] h-[68px] aspect-square rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] animate-pulse shrink-0" />
              <div className="w-11 h-2.5 rounded-full bg-[#F2F2F7] dark:bg-[#1C1C1E] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`py-2 ${className}`} aria-label={t('stories', 'Stories')}>
      <div className="flex items-start gap-3 overflow-x-auto no-scrollbar px-4 py-0.5">
        {/* Current User Tile: View own story if active, or Create Story */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
          <div className="relative w-[68px] h-[68px] aspect-square shrink-0 flex items-center justify-center">
            <button
              type="button"
              id="stories-own-tile-btn"
              onClick={() => {
                if (ownGroup) {
                  onOpenAuthorStory(currentUser.id, ownGroup);
                } else {
                  onOpenCreateStory();
                }
              }}
              aria-label={ownGroup ? 'View your story' : 'Add to your story'}
              className={`w-[68px] h-[68px] aspect-square rounded-full shrink-0 flex items-center justify-center p-[2px] cursor-pointer ios-press focus-visible:outline-none ${
                ownGroup
                  ? ownGroup.hasUnseen
                    ? 'bg-[#007AFF]'
                    : 'bg-[#C7C7CC] dark:bg-[#3A3A3C]'
                  : 'bg-transparent'
              }`}
            >
              <div
                className={`w-full h-full aspect-square rounded-full flex items-center justify-center p-[2px] ${
                  ownGroup ? 'bg-white dark:bg-black' : 'bg-transparent'
                }`}
              >
                <StoryAvatarCircle
                  src={currentUser.avatar}
                  name={currentUser.name}
                  bordered={!ownGroup}
                />
              </div>
            </button>

            <button
              type="button"
              id="stories-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateStory();
              }}
              aria-label="Add Story"
              className="absolute bottom-0 right-0 w-[22px] h-[22px] aspect-square rounded-full bg-[#007AFF] text-white flex items-center justify-center border-2 border-white dark:border-black cursor-pointer ios-press"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>

          <span className="text-[11px] font-medium text-[#8E8E93] truncate w-full text-center leading-[14px] px-0.5">
            {t('add_story', 'Your Story')}
          </span>
        </div>

        {/* Grouped Author Rings */}
        {otherGroups.map((group) => (
          <button
            key={group.authorId}
            type="button"
            onClick={() => onOpenAuthorStory(group.authorId, group)}
            className={`flex flex-col items-center gap-1.5 shrink-0 w-[72px] ios-press cursor-pointer focus-visible:outline-none ${
              group.isMuted ? 'opacity-45' : ''
            }`}
          >
            <div
              className={`w-[68px] h-[68px] aspect-square rounded-full shrink-0 flex items-center justify-center p-[2px] ${
                group.hasUnseen
                  ? 'bg-[#007AFF]'
                  : 'bg-[#C7C7CC] dark:bg-[#3A3A3C]'
              }`}
            >
              <div className="w-full h-full aspect-square rounded-full flex items-center justify-center p-[2px] bg-white dark:bg-black">
                <StoryAvatarCircle
                  src={group.authorAvatar}
                  name={group.authorName}
                />
              </div>
            </div>
            <span
              className={`text-[11px] truncate w-full text-center leading-[14px] px-0.5 ${
                group.hasUnseen
                  ? 'font-medium text-black dark:text-white'
                  : 'font-normal text-[#8E8E93]'
              }`}
            >
              {group.authorName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
