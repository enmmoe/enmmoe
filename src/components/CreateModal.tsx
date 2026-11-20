import React, { useState } from 'react';
import {
  BarChart2,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../utils/i18n';
import { SocialPost, Story, User } from '../types';
import { ALL_WEBTOONS } from '../data/webtoonData';
import { Avatar, BottomSheet, Button, SmartImage, TextField, useToast } from './ui';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onPublishPost: (post: Partial<SocialPost>) => void;
  onPublishStory: (story: Partial<Story>) => void;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPublishPost,
  onPublishStory,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [contentType, setContentType] = useState<'post' | 'story' | 'poll' | 'link'>('post');

  const [textCaption, setTextCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Yes, definitely', 'Not sure yet']);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const sampleImages = ALL_WEBTOONS.slice(0, 4).map((w) => w.coverImage);

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePublish = () => {
    if (contentType === 'post') {
      const parsedTags = tags
        .split(' ')
        .map((tag) => tag.replace('#', '').trim())
        .filter(Boolean);

      onPublishPost({
        content: textCaption,
        mediaType: mediaUrl ? 'photo' : 'text',
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        location: location || undefined,
        tags: parsedTags.length > 0 ? parsedTags : ['enmmoe', 'Creator'],
      });
    } else if (contentType === 'story') {
      onPublishStory({
        mediaUrl: mediaUrl || sampleImages[0],
        mediaType: 'photo',
        caption: textCaption || 'Live moment',
        location: location || undefined,
      });
    } else if (contentType === 'poll') {
      onPublishPost({
        content: textCaption || 'Cast your vote in this poll',
        mediaType: 'poll',
        mediaUrls: [],
        poll: {
          id: `poll-${Date.now()}`,
          question: pollQuestion || 'What should our next community project be?',
          options: pollOptions.map((optText, index) => ({
            id: `opt-${index}`,
            text: optText,
            votes: 0,
            voterIds: [],
          })),
          totalVotes: 0,
          expiresAt: 'In 3 days',
        },
      });
    } else if (contentType === 'link') {
      onPublishPost({
        content: textCaption || 'Check out this featured link:',
        mediaType: 'link',
        mediaUrls: [],
        linkPreview: {
          url: linkUrl || 'https://enmmoe.app',
          title: linkTitle || 'Featured Series',
          description: 'Explore creators, series, and community discussions.',
          image: mediaUrl || sampleImages[0],
          siteName: 'enmmoe',
        },
      });
    }

    showToast('Published successfully', { type: 'success' });
    setTextCaption('');
    setLocation('');
    setTags('');
    setMediaUrl('');
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('create_title', 'Create')}
    >
      <div className="px-4 py-3 space-y-4">
        {/* Content Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-[14px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          {[
            { id: 'post', label: t('create_post', 'Post'), icon: ImageIcon },
            { id: 'story', label: t('create_story', 'Story'), icon: Sparkles },
            { id: 'poll', label: t('create_poll', 'Poll'), icon: BarChart2 },
            { id: 'link', label: t('create_link', 'Link'), icon: LinkIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = contentType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setContentType(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs font-semibold'
                    : 'text-[#8E8E93] hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Author Header */}
        <div className="flex items-center gap-2.5">
          <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
          <div>
            <p className="text-[15px] font-semibold leading-tight">{currentUser.name}</p>
            <p className="text-[13px] text-[#8E8E93]">@{currentUser.username} · Public</p>
          </div>
        </div>

        {/* Main Caption */}
        <textarea
          value={textCaption}
          onChange={(e) => setTextCaption(e.target.value)}
          placeholder={
            contentType === 'poll'
              ? 'Add an optional description...'
              : t('whats_on_your_mind', "What's happening?")
          }
          rows={3}
          className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] outline-none focus:ring-2 focus:ring-[#007AFF]/25 resize-none"
        />

        {/* Poll Builder */}
        {contentType === 'poll' && (
          <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-2.5">
            <TextField
              label="Poll Question"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Ask a question..."
            />

            <p className="text-[13px] font-medium text-[#8E8E93]">Options</p>
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const updated = [...pollOptions];
                    updated[i] = e.target.value;
                    setPollOptions(updated);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 h-10 px-3 rounded-xl bg-white dark:bg-[#1C1C1E] text-[14px] text-black dark:text-white outline-none focus:ring-2 focus:ring-[#007AFF]/25"
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePollOption(i)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {pollOptions.length < 4 && (
              <button
                type="button"
                onClick={handleAddPollOption}
                className="text-[14px] font-medium text-[#007AFF] inline-flex items-center gap-1 cursor-pointer pt-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Option</span>
              </button>
            )}
          </div>
        )}

        {/* Link Builder */}
        {contentType === 'link' && (
          <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-3">
            <TextField
              label="Target URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
            <TextField
              label="Link Title"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Custom title preview"
            />
          </div>
        )}

        {/* Attach Artwork */}
        <div>
          <p className="text-[13px] font-medium text-[#8E8E93] mb-2">Attach Artwork</p>
          <div className="grid grid-cols-4 gap-2">
            {sampleImages.map((imgUrl, i) => {
              const selected = mediaUrl === imgUrl;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMediaUrl(selected ? '' : imgUrl)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ios-press ${
                    selected
                      ? 'border-[#007AFF] ring-2 ring-[#007AFF]/30'
                      : 'border-transparent opacity-85 hover:opacity-100'
                  }`}
                >
                  <SmartImage
                    src={imgUrl}
                    alt={`Artwork ${i + 1}`}
                    aspectClassName="w-full h-full"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Location & Hashtags */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <MapPin className="w-4 h-4 text-[#007AFF] shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="flex-1 bg-transparent text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] outline-none"
            />
          </div>

          <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <span className="text-[15px] font-semibold text-[#007AFF] shrink-0">#</span>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Add tags separated by spaces"
              className="flex-1 bg-transparent text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1"
            leftIcon={<Send className="w-4 h-4" />}
            onClick={handlePublish}
          >
            {t('publish', 'Publish')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
