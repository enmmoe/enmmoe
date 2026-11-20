import React, { useMemo, useState } from 'react';
import { CornerDownRight, Flag, Heart, MessageCircle, Send, X } from 'lucide-react';
import { PostComment } from '../types';
import { useLanguage } from '../utils/i18n';
import { Avatar, BottomSheet, EmptyState, VerifiedBadge } from './ui';

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  comments: PostComment[];
  onAddComment: (postId: string, text: string, replyToCommentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
  onOpenUserProfile?: (user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  }) => void;
}

export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  isOpen,
  onClose,
  postId,
  comments,
  onAddComment,
  onLikeComment,
  onReportComment,
  onOpenUserProfile,
}) => {
  const { t } = useLanguage();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('newest');

  const sortedComments = useMemo(() => {
    const copy = [...comments];
    if (sortBy === 'top') {
      return copy.sort((a, b) => b.likesCount - a.likesCount || b.createdAt - a.createdAt);
    }
    return copy.sort((a, b) => b.createdAt - a.createdAt);
  }, [comments, sortBy]);

  const totalCount = useMemo(
    () =>
      comments.reduce(
        (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
        0
      ),
    [comments]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(postId, commentText.trim(), replyingTo?.id);
    setCommentText('');
    setReplyingTo(null);
  };

  const renderComment = (comment: PostComment, isReply = false, parentId?: string) => (
    <div key={comment.id} className={`flex gap-3 items-start ${isReply ? 'ml-10 mt-2.5' : ''}`}>
      <button
        type="button"
        onClick={() =>
          onOpenUserProfile?.({
            id: comment.authorId,
            name: comment.authorName,
            username: comment.authorUsername,
            avatar: comment.authorAvatar,
            isVerified: comment.authorVerified,
          })
        }
        className="shrink-0 ios-press cursor-pointer"
      >
        <Avatar src={comment.authorAvatar} name={comment.authorName} size={isReply ? 'xs' : 'sm'} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <button
              type="button"
              onClick={() =>
                onOpenUserProfile?.({
                  id: comment.authorId,
                  name: comment.authorName,
                  username: comment.authorUsername,
                  avatar: comment.authorAvatar,
                  isVerified: comment.authorVerified,
                })
              }
              className="inline-flex items-center gap-1 text-left cursor-pointer min-w-0"
            >
              <span className="text-[14px] font-semibold truncate hover:underline">
                {comment.authorName}
              </span>
              {comment.authorVerified && <VerifiedBadge size={13} />}
            </button>
            <span className="text-[11px] text-[#8E8E93] tabular-nums shrink-0">
              {new Date(comment.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p className="text-[15px] leading-snug break-words">
            {comment.replyToUsername && (
              <span className="text-[#007AFF] dark:text-[#0A84FF] font-medium mr-1">
                @{comment.replyToUsername}
              </span>
            )}
            {comment.text}
          </p>
        </div>

        <div className="flex items-center gap-4 px-2 mt-1 text-[13px] text-[#8E8E93]">
          <button
            type="button"
            onClick={() => onLikeComment(comment.id)}
            className={`inline-flex items-center gap-1 cursor-pointer ios-press ${
              comment.isLiked ? 'text-[#007AFF] dark:text-[#0A84FF] font-semibold' : ''
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-current' : ''}`} />
            <span className="tabular-nums">
              {comment.likesCount > 0 ? comment.likesCount : 'Like'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setReplyingTo({
                id: parentId || comment.id,
                username: comment.authorUsername,
              })
            }
            className="hover:text-black dark:hover:text-white cursor-pointer"
          >
            {t('reply', 'Reply')}
          </button>

          {onReportComment && (
            <button
              type="button"
              onClick={() => onReportComment(comment.id)}
              aria-label="Report comment"
              className="ml-auto hover:text-black dark:hover:text-white cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 mt-1">
            {comment.replies.map((reply) => renderComment(reply, true, comment.id))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('comments', 'Comments')} (${totalCount})`}
      headerRight={
        comments.length > 1 ? (
          <div className="flex items-center bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-lg p-0.5">
            {(['newest', 'top'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSortBy(mode)}
                className={`px-2 py-0.5 rounded-md text-[12px] font-semibold capitalize cursor-pointer transition-colors ${
                  sortBy === mode
                    ? 'bg-white dark:bg-[#1C1C1E] text-[#007AFF] dark:text-[#0A84FF] shadow-xs'
                    : 'text-[#8E8E93]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col min-h-[340px]">
        <div className="px-4 py-3 space-y-4 flex-1">
          {sortedComments.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="w-7 h-7" />}
              title={t('no_comments_yet', 'No Comments Yet')}
              description="Be the first to share your thoughts."
            />
          ) : (
            sortedComments.map((comment) => renderComment(comment))
          )}
        </div>

        <div className="sticky bottom-0 px-4 py-3 bg-white dark:bg-[#1C1C1E] border-t border-black/[0.06] dark:border-white/[0.08]">
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[13px] text-[#8E8E93]">
              <div className="flex items-center gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5 text-[#007AFF] dark:text-[#0A84FF]" />
                <span>
                  Replying to <strong className="text-black dark:text-white">@{replyingTo.username}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                aria-label="Cancel reply"
                className="text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                replyingTo
                  ? `Reply to @${replyingTo.username}...`
                  : t('write_comment', 'Add a comment...')
              }
              className="flex-1 h-10 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] outline-none focus:ring-2 focus:ring-[#007AFF]/25"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              aria-label="Send comment"
              className="w-10 h-10 rounded-full bg-[#007AFF] dark:bg-[#0A84FF] text-white flex items-center justify-center disabled:opacity-35 cursor-pointer ios-press"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </BottomSheet>
  );
};
