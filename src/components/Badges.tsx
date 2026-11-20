import React from 'react';
import { VerifiedBadge as UIVerifiedBadge } from './ui/Badge';
import { BottomSheet, Button } from './ui';

interface BadgeProps {
  className?: string;
  size?: number;
}

export const TelegramPremiumStar: React.FC<BadgeProps> = ({
  className = 'inline-block shrink-0',
  size = 16,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ width: size, height: size }}
    aria-label="enmmoe Premium"
  >
    <path
      d="M12 2.5L14.3 7.2L19.5 7.9L15.7 11.6L16.6 16.8L12 14.4L7.4 16.8L8.3 11.6L4.5 7.9L9.7 7.2L12 2.5Z"
      fill="#007AFF"
    />
  </svg>
);

export const BlueVerifiedBadge = UIVerifiedBadge;
export const VerifiedBadge = UIVerifiedBadge;

export const BadgesExplanationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => (
  <BottomSheet isOpen={isOpen} onClose={onClose} title="enmmoe Badges">
    <div className="px-4 py-3 space-y-3">
      <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-start gap-3">
        <BlueVerifiedBadge size={18} className="mt-0.5" />
        <div>
          <p className="text-[15px] font-semibold">Verified Account</p>
          <p className="text-[13px] text-[#8E8E93] mt-0.5 leading-relaxed">
            Indicates authentic creators, studios, and verified community members.
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-start gap-3">
        <TelegramPremiumStar size={18} className="mt-0.5" />
        <div>
          <p className="text-[15px] font-semibold">enmmoe Premium</p>
          <p className="text-[13px] text-[#8E8E93] mt-0.5 leading-relaxed">
            Supports creators directly and unlocks early series access.
          </p>
        </div>
      </div>

      <Button variant="primary" size="md" className="w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  </BottomSheet>
);
