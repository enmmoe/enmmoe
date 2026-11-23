import {
  ReportItem,
  SocialConversation,
  SocialMessage,
  Story,
  StoryHighlight,
  User,
} from '../types';

export interface BootstrapResponse {
  success: boolean;
  privacy?: Partial<User>;
  onlineUserIds: string[];
  conversations: SocialConversation[];
  stories: Story[];
  archiveStories: Story[];
  highlights: StoryHighlight[];
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const socialApi = {
  bootstrap: (userId: string) =>
    apiJson<BootstrapResponse>(`/api/social/bootstrap?userId=${encodeURIComponent(userId)}`),

  updatePrivacy: (userId: string, updates: Partial<User>) =>
    apiJson<{ success: boolean; privacy: Partial<User> }>('/api/users/privacy', {
      method: 'POST',
      body: JSON.stringify({ userId, ...updates }),
    }),

  createOrGetConversation: (payload: {
    userId: string;
    targetUserId?: string;
    targetUserData?: Partial<User>;
    title?: string;
    participantIds?: string[];
  }) =>
    apiJson<{ success: boolean; conversation: SocialConversation }>('/api/messages/conversation', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendMessage: (payload: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderUsername: string;
    senderAvatar: string;
    text: string;
    replyTo?: SocialMessage['replyTo'];
    storyReply?: SocialMessage['storyReply'];
    bubbleStyle?: string;
  }) =>
    apiJson<{ success: boolean; message: SocialMessage }>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  markConversationRead: (conversationId: string, readerId: string) =>
    apiJson<{ success: boolean; receiptVisible: boolean; seenAt: number }>('/api/messages/read', {
      method: 'POST',
      body: JSON.stringify({ conversationId, readerId }),
    }),

  reactMessage: (conversationId: string, messageId: string, userId: string, emoji: string) =>
    apiJson<{ success: boolean; reactions: Record<string, string> }>('/api/messages/react', {
      method: 'POST',
      body: JSON.stringify({ conversationId, messageId, userId, emoji }),
    }),

  deleteMessage: (
    conversationId: string,
    messageId: string,
    userId: string,
    mode: 'unsend' | 'delete_for_me' = 'unsend'
  ) =>
    apiJson<{
      success: boolean;
      messageId: string;
      mode?: 'unsend' | 'delete_for_me';
      deletedForEveryone?: boolean;
    }>(
      `/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}?userId=${encodeURIComponent(userId)}&mode=${mode}`,
      { method: 'DELETE' }
    ),

  handleRequestAction: (
    conversationId: string,
    userId: string,
    action: 'accept' | 'decline' | 'block' | 'spam'
  ) =>
    apiJson<{ success: boolean; conversation?: SocialConversation; blockedUserId?: string }>(
      '/api/messages/request-action',
      {
        method: 'POST',
        body: JSON.stringify({ conversationId, userId, action }),
      }
    ),

  toggleBlockUser: (userId: string, targetUserId: string, block: boolean) =>
    apiJson<{ success: boolean; blockedUserIds: string[] }>('/api/messages/block', {
      method: 'POST',
      body: JSON.stringify({ userId, targetUserId, block }),
    }),

  createStory: (payload: Partial<Story> & { authorId: string; saveToArchive?: boolean }) =>
    apiJson<{ success: boolean; story: Story; deduplicated?: boolean }>('/api/stories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStory: (
    storyId: string,
    payload: {
      userId: string;
      caption?: string;
      location?: string;
      audience?: Story['audience'];
      hiddenFromIds?: string[];
      replyPermission?: Story['replyPermission'];
    }
  ) =>
    apiJson<{ success: boolean; story: Story }>(`/api/stories/${encodeURIComponent(storyId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteStory: (storyId: string, userId: string) =>
    apiJson<{ success: boolean; deletedId: string }>(
      `/api/stories/${encodeURIComponent(storyId)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    ),

  viewStory: (storyId: string, viewer: { userId: string; name: string; username: string; avatar: string }) =>
    apiJson<{ success: boolean; story: Story }>(`/api/stories/${encodeURIComponent(storyId)}/view`, {
      method: 'POST',
      body: JSON.stringify(viewer),
    }),

  likeStory: (storyId: string, viewer: { userId: string; name: string; username: string; avatar: string }) =>
    apiJson<{ success: boolean; likesCount: number; liked: boolean; likedByIds: string[] }>(
      `/api/stories/${encodeURIComponent(storyId)}/like`,
      {
        method: 'POST',
        body: JSON.stringify(viewer),
      }
    ),

  reactStory: (
    storyId: string,
    payload: { userId: string; emoji: string; name: string; username: string; avatar: string }
  ) =>
    apiJson<{ success: boolean; reactions: { userId: string; emoji: string }[] }>(
      `/api/stories/${encodeURIComponent(storyId)}/react`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  voteStoryPoll: (storyId: string, userId: string, option: 'A' | 'B') =>
    apiJson<{ success: boolean; poll: Story['poll'] }>(
      `/api/stories/${encodeURIComponent(storyId)}/poll`,
      {
        method: 'POST',
        body: JSON.stringify({ userId, option }),
      }
    ),

  answerStoryQuestion: (
    storyId: string,
    payload: {
      stickerId: string;
      userId: string;
      name: string;
      username: string;
      avatar: string;
      answer: string;
    }
  ) =>
    apiJson<{ success: boolean; responses: any[] }>(
      `/api/stories/${encodeURIComponent(storyId)}/question`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  interactStorySticker: (
    storyId: string,
    payload: { stickerId: string; userId: string; sliderValue?: number; toggleReminder?: boolean }
  ) =>
    apiJson<{ success: boolean; sliderValues?: Record<string, number>; reminderUserIds?: string[] }>(
      `/api/stories/${encodeURIComponent(storyId)}/sticker-interact`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  replyToStory: (
    storyId: string,
    payload: {
      senderId: string;
      senderName: string;
      senderUsername: string;
      senderAvatar: string;
      replyText: string;
    }
  ) =>
    apiJson<{ success: boolean; conversationId: string; message: SocialMessage }>(
      `/api/stories/${encodeURIComponent(storyId)}/reply`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getArchive: (userId: string) =>
    apiJson<{ success: boolean; archiveStories: Story[] }>(
      `/api/stories/archive?userId=${encodeURIComponent(userId)}`
    ),

  createHighlight: (payload: { ownerId: string; title: string; coverImage: string; storyIds: string[] }) =>
    apiJson<{ success: boolean; highlight: StoryHighlight }>('/api/highlights', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateHighlight: (
    highlightId: string,
    payload: { ownerId: string; title?: string; coverImage?: string; storyIds?: string[] }
  ) =>
    apiJson<{ success: boolean; highlight: StoryHighlight }>(
      `/api/highlights/${encodeURIComponent(highlightId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  deleteHighlight: (highlightId: string, userId: string) =>
    apiJson<{ success: boolean; deletedId: string }>(
      `/api/highlights/${encodeURIComponent(highlightId)}?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    ),

  submitReport: (payload: {
    reporterId: string;
    targetType: ReportItem['targetType'];
    targetId: string;
    reason: string;
    notes?: string;
  }) =>
    apiJson<{ success: boolean; report: ReportItem }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
