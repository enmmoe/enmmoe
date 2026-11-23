import React, { useEffect, useState } from 'react';
import {
  Archive,
  Check,
  Eye,
  Heart,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Story, StoryHighlight, User } from '../types';
import { formatRelativeStoryTime } from '../utils/storyMedia';
import { Avatar, BottomSheet, Button, EmptyState, TextField, useToast } from './ui';
import { EmojiText } from './AppleEmoji';
import { useLanguage } from '../utils/i18n';

export interface HighlightEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingHighlight?: StoryHighlight | null;
  availableStories: Story[];
  preselectedStoryId?: string | null;
  onSave: (payload: {
    id?: string;
    title: string;
    coverImage: string;
    storyIds: string[];
  }) => Promise<void> | void;
  onDelete?: (highlightId: string) => Promise<void> | void;
}

export const HighlightEditorModal: React.FC<HighlightEditorModalProps> = ({
  isOpen,
  onClose,
  editingHighlight,
  availableStories,
  preselectedStoryId,
  onSave,
  onDelete,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingHighlight) {
      setTitle(editingHighlight.title);
      setSelectedIds(editingHighlight.storyIds || []);
      setCoverImage(editingHighlight.coverImage || '');
    } else {
      const initIds = preselectedStoryId
        ? [preselectedStoryId]
        : availableStories[0]
        ? [availableStories[0].id]
        : [];
      setTitle('');
      setSelectedIds(initIds);
      const firstStory = availableStories.find((s) => s.id === initIds[0]);
      setCoverImage(firstStory?.thumbnailUrl || firstStory?.mediaUrl || '');
    }
  }, [isOpen, editingHighlight, preselectedStoryId, availableStories]);

  const toggleStory = (story: Story) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(story.id);
      const next = exists ? prev.filter((id) => id !== story.id) : [...prev, story.id];
      if (!coverImage && !exists) {
        setCoverImage(story.thumbnailUrl || story.mediaUrl || '');
      }
      return next;
    });
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      showToast('Enter a highlight title', { type: 'error' });
      return;
    }
    if (selectedIds.length === 0) {
      showToast('Select at least one story', { type: 'error' });
      return;
    }
    const fallbackStory = availableStories.find((s) => selectedIds.includes(s.id));
    const finalCover =
      coverImage || fallbackStory?.thumbnailUrl || fallbackStory?.mediaUrl || '';
    setSaving(true);
    try {
      await onSave({
        id: editingHighlight?.id,
        title: cleanTitle,
        coverImage: finalCover,
        storyIds: selectedIds,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingHighlight ? 'Edit Highlight' : 'New Story Highlight'}
    >
      <div className="px-4 py-3 space-y-4">
        <TextField
          label="Highlight Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Behind the Scenes"
          maxLength={24}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-[#8E8E93]">
              Select Stories ({selectedIds.length})
            </p>
            {selectedIds.length > 0 && (
              <span className="text-[12px] text-[#007AFF]">Tap to include</span>
            )}
          </div>

          {availableStories.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-6 h-6" />}
              title="No Stories in Archive"
              description="Share a story first — it automatically saves to your Archive so you can feature it in Highlights."
            />
          ) : (
            <div className="grid grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-0.5">
              {availableStories.map((st) => {
                const isSelected = selectedIds.includes(st.id);
                const thumb = st.thumbnailUrl || (st.mediaType !== 'video' ? st.mediaUrl : '');
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggleStory(st)}
                    className={`relative aspect-[9/14] rounded-2xl overflow-hidden text-left cursor-pointer transition-all ios-press ${
                      isSelected
                        ? 'ring-2 ring-[#007AFF] ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1E]'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ background: st.backgroundGradient || '#1C1C1E' }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={st.caption || 'Story'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2 text-center text-white text-[12px] font-semibold">
                        <EmojiText text={st.caption || 'Story'} />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/75 to-transparent">
                      <p className="text-[10px] text-white/90 truncate">
                        {formatRelativeStoryTime(st.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border ${
                        isSelected
                          ? 'bg-[#007AFF] border-[#007AFF] text-white'
                          : 'bg-black/35 border-white/70 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          {editingHighlight && onDelete && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={async () => {
                await onDelete(editingHighlight.id);
                onClose();
              }}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              {t('delete', 'Delete')}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={saving}
            className="flex-1"
            onClick={handleSave}
          >
            {editingHighlight ? t('save_details', 'Save Highlight') : t('add_to_highlight', 'Create Highlight')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export interface StoryArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  creators: User[];
  archiveStories: Story[];
  onCreateHighlightFromStory: (story: Story) => void;
  onOpenStory?: (story: Story) => void;
  onUpdateCloseFriends: (closeFriendIds: string[]) => void;
}

export const StoryArchiveModal: React.FC<StoryArchiveModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  creators,
  archiveStories,
  onCreateHighlightFromStory,
  onOpenStory,
  onUpdateCloseFriends,
}) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'archive' | 'close_friends'>('archive');
  const closeFriendIds = currentUser.closeFriendIds || [];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'archive' ? 'Story Archive' : 'Close Friends'}
    >
      <div className="px-4 py-3 space-y-4">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <button
            type="button"
            onClick={() => setTab('archive')}
            className={`py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer ${
              tab === 'archive'
                ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                : 'text-[#8E8E93]'
            }`}
          >
            Archive ({archiveStories.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('close_friends')}
            className={`py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer ${
              tab === 'close_friends'
                ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs'
                : 'text-[#8E8E93]'
            }`}
          >
            Close Friends ({closeFriendIds.length})
          </button>
        </div>

        {tab === 'archive' ? (
          archiveStories.length === 0 ? (
            <EmptyState
              icon={<Archive className="w-7 h-7" />}
              title="Archive Empty"
              description="Stories you post stay saved privately here even after 24 hours."
            />
          ) : (
            <div className="grid grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-0.5">
              {archiveStories.map((st) => {
                const thumb = st.thumbnailUrl || (st.mediaType !== 'video' ? st.mediaUrl : '');
                return (
                  <div
                    key={st.id}
                    className="relative aspect-[9/14] rounded-2xl overflow-hidden bg-[#1C1C1E] group"
                    style={{ background: st.backgroundGradient || '#1C1C1E' }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenStory?.(st)}
                      className="w-full h-full block text-left cursor-pointer"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={st.caption || 'Archived story'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 text-center text-white text-[12px] font-semibold">
                          <EmojiText text={st.caption || 'Story'} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
                        <p className="text-[10px] text-white/80">
                          {formatRelativeStoryTime(st.createdAt)}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-white/90 mt-0.5 tabular-nums">
                          <span className="inline-flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> {st.viewsCount || st.viewers?.length || 0}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Heart className="w-3 h-3" /> {st.likesCount || 0}
                          </span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onCreateHighlightFromStory(st)}
                      aria-label="Add to Highlight"
                      title="Add to Highlight"
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center cursor-pointer ios-press"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto">
            {creators.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6" />}
                title="No Accounts Found"
                description="Creators and subscribers will appear here."
              />
            ) : (
              creators
                .filter((c) => c.id !== currentUser.id)
                .map((person) => {
                  const isCF = closeFriendIds.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        const next = isCF
                          ? closeFriendIds.filter((id) => id !== person.id)
                          : [...closeFriendIds, person.id];
                        onUpdateCloseFriends(next);
                      }}
                      className="w-full p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between cursor-pointer ios-press"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={person.avatar} name={person.name} size="sm" />
                        <div className="text-left min-w-0">
                          <p className="text-[15px] font-semibold truncate">{person.name}</p>
                          <p className="text-[12px] text-[#8E8E93] truncate">@{person.username}</p>
                        </div>
                      </div>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                          isCF
                            ? 'bg-[#007AFF] border-[#007AFF] text-white'
                            : 'border-[#C7C7CC] dark:border-[#48484A]'
                        }`}
                      >
                        {isCF && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
