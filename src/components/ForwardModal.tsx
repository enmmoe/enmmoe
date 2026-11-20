import React, { useState } from 'react';
import { Check, Users } from 'lucide-react';
import { SocialConversation, SocialMessage } from '../types';
import { INITIAL_CREATORS } from '../data/socialMockData';
import { soundFX } from '../utils/audio';
import { Avatar, BottomSheet, EmptyState, SearchBar, VerifiedBadge, useToast } from './ui';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: SocialMessage | null;
  conversations: SocialConversation[];
  onForward: (targetConvId: string, messageText: string) => void;
}

interface ForwardTarget {
  id: string;
  name: string;
  avatar: string;
  isVerified?: boolean;
  username?: string;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  conversations,
  onForward,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  const convTargets: ForwardTarget[] = conversations.map((c) => {
    const p = c.participants[0];
    return {
      id: c.id,
      name: c.type === 'group' ? c.title || 'Group' : p?.name || 'Chat',
      avatar: p?.avatar || '',
      isVerified: p?.isVerified || false,
      username: p?.username,
    };
  });

  const allTargets: ForwardTarget[] = [...convTargets];
  INITIAL_CREATORS.forEach((creator) => {
    if (!allTargets.some((t) => t.name.toLowerCase() === creator.name.toLowerCase())) {
      allTargets.push({
        id: creator.id,
        name: creator.name,
        avatar: creator.avatar,
        isVerified: creator.isVerified,
        username: creator.username,
      });
    }
  });

  const filteredTargets = allTargets.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.username && t.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSendToPerson = (target: ForwardTarget) => {
    if (!messageToForward) return;
    soundFX.playClick();
    setSentMap((prev) => ({ ...prev, [target.id]: true }));
    onForward(target.id, `Forwarded: "${messageToForward.text}"`);
    showToast(`Sent to ${target.name}`, { type: 'success', durationMs: 1800 });

    setTimeout(() => {
      setSentMap({});
      onClose();
    }, 450);
  };

  return (
    <BottomSheet
      isOpen={Boolean(isOpen && messageToForward)}
      onClose={onClose}
      title="Forward Message"
    >
      <div className="px-4 py-3 space-y-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search recipient"
        />

        {filteredTargets.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="No Matching Recipients"
            description={`No people matched "${searchQuery}".`}
          />
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 pt-1 pb-4">
            {filteredTargets.map((person) => {
              const isSent = Boolean(sentMap[person.id]);
              return (
                <button
                  key={person.id}
                  type="button"
                  disabled={isSent}
                  onClick={() => handleSendToPerson(person)}
                  className="flex flex-col items-center text-center cursor-pointer ios-press"
                >
                  <div className="relative">
                    <Avatar src={person.avatar} name={person.name} size="lg" />
                    {isSent && (
                      <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center text-white">
                        <Check className="w-6 h-6 text-[#0A84FF] stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center justify-center gap-1 max-w-[96px]">
                    <span className="text-[13px] font-medium line-clamp-1">{person.name}</span>
                    {person.isVerified && <VerifiedBadge size={12} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
