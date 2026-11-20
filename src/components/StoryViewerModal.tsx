import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Music2, MapPin } from 'lucide-react';
import { Story } from '../types';
import { Avatar, SmartImage, VerifiedBadge, useToast } from './ui';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onSendStoryReply: (authorId: string, replyText: string) => void;
  onReactStory: (storyId: string, emoji: string) => void;
  onOpenUserProfile?: (user: { id: string; name: string; username: string; avatar: string; isVerified?: boolean }) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex = 0,
  isOpen,
  onClose,
  onSendStoryReply,
  onReactStory,
  onOpenUserProfile,
}) => {
  const { showToast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [votedOption, setVotedOption] = useState<'A' | 'B' | null>(null);

  const durationMs = 5000;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setProgress(0);
      setVotedOption(null);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const stepMs = 50;
    const increment = (stepMs / durationMs) * 100;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, stepMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, isPaused, currentIndex, stories.length, onClose]);

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex] || stories[0];

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSendStoryReply(currentStory.authorId, `Replied to story: "${replyText.trim()}"`);
    setReplyText('');
    showToast('Reply sent', { type: 'success', durationMs: 1800 });
  };

  const handleEmojiReact = (emoji: string) => {
    onReactStory(currentStory.id, emoji);
    onSendStoryReply(currentStory.authorId, `Reacted ${emoji} to your story`);
    showToast(`Sent ${emoji}`, { type: 'success', durationMs: 1500 });
  };

  return (
    <div
      id="story-viewer-modal"
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
    >
      <div className="relative w-full h-full max-w-md bg-[#0B0B0F] overflow-hidden flex flex-col justify-between">
        {/* Background Media */}
        <div
          className="absolute inset-0 z-0 flex items-center justify-center bg-black"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <img
            src={currentStory.mediaUrl}
            alt="Story content"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        </div>

        {/* Tap zones (Left for prev, Right for next) */}
        <div
          className="absolute top-20 bottom-24 left-0 w-1/3 z-10"
          onClick={handlePrev}
        />
        <div
          className="absolute top-20 bottom-24 right-0 w-2/3 z-10"
          onClick={handleNext}
        />

        {/* Top Header & Progress Bars */}
        <div className="relative z-20 pt-4 px-4">
          {/* Multi-story Segment Progress Indicators */}
          <div className="flex items-center gap-1 mb-3">
            {stories.map((story, idx) => (
              <div
                key={story.id}
                className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < currentIndex
                        ? '100%'
                        : idx === currentIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author info & Close */}
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2.5 ${onOpenUserProfile ? 'cursor-pointer active:opacity-80' : ''}`}
              onClick={(e) => {
                if (onOpenUserProfile) {
                  e.stopPropagation();
                  onClose();
                  onOpenUserProfile({
                    id: currentStory.authorId,
                    name: currentStory.authorName,
                    username: currentStory.authorUsername || currentStory.authorName.toLowerCase().replace(/\s+/g, '_'),
                    avatar: currentStory.authorAvatar,
                    isVerified: currentStory.authorVerified,
                  });
                }
              }}
            >
              <Avatar src={currentStory.authorAvatar} name={currentStory.authorName} size="sm" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white leading-tight">
                    {currentStory.authorName}
                  </span>
                  {currentStory.authorVerified && <VerifiedBadge size={14} />}
                  <span className="text-xs text-white/70">· 2h</span>
                </div>
                {currentStory.location && (
                  <span className="text-[11px] text-white/80 flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-[#007AFF]" />
                    {currentStory.location}
                  </span>
                )}
              </div>
            </div>

            <button
              id="close-story-btn"
              onClick={onClose}
              aria-label="Close story"
              className="w-10 h-10 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-md ios-press hover:bg-black/65 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center / Bottom Content */}
        <div className="relative z-20 px-4 pb-2">
          {currentStory.musicTitle && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-medium mb-3">
              <Music2 className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>
                {currentStory.musicArtist} — {currentStory.musicTitle}
              </span>
            </div>
          )}

          {currentStory.poll && (
            <div className="mb-4 bg-black/60 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 text-white max-w-xs mx-auto shadow-2xl">
              <p className="text-sm font-semibold text-center mb-3">{currentStory.poll.question}</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setVotedOption('A')}
                  className={`w-full py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-between border transition-all cursor-pointer ${
                    votedOption === 'A'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white font-semibold'
                      : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                  }`}
                >
                  <span>{currentStory.poll.optionA}</span>
                  {votedOption && <span className="text-[11px] font-bold">54%</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setVotedOption('B')}
                  className={`w-full py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-between border transition-all cursor-pointer ${
                    votedOption === 'B'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white font-semibold'
                      : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                  }`}
                >
                  <span>{currentStory.poll.optionB}</span>
                  {votedOption && <span className="text-[11px] font-bold">46%</span>}
                </button>
              </div>
            </div>
          )}

          {currentStory.caption && (
            <div className="bg-black/45 backdrop-blur-md rounded-xl p-2.5 mb-3 text-white text-sm">
              <p className="leading-snug">{currentStory.caption}</p>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="relative z-20 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pb-safe">
          <div className="flex items-center justify-around mb-2.5 px-1">
            {['🔥', '❤️', '😂', '😍', '👏', '😮'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiReact(emoji)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-110 transition-transform flex items-center justify-center text-lg backdrop-blur-sm cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${currentStory.authorName}...`}
              className="flex-1 bg-white/15 border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/60 focus:outline-none focus:border-[#007AFF] backdrop-blur-md"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              aria-label="Send reply"
              className="w-10 h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center disabled:opacity-40 ios-press cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
