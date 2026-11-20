import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface TikTokBackButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLight?: boolean;
  className?: string;
  ariaLabel?: string;
  title?: string;
  id?: string;
  label?: string;
}

export const TikTokBackButton: React.FC<TikTokBackButtonProps> = ({
  onClick,
  className = '',
  ariaLabel = 'Back',
  title = 'Back',
  id,
  label,
}) => (
  <button
    id={id}
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    title={title}
    className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-0.5 px-1.5 rounded-xl bg-transparent text-[#007AFF] dark:text-[#0A84FF] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ios-press cursor-pointer select-none ${className}`}
  >
    <ChevronLeft className="w-[26px] h-[26px] stroke-[2.2] -ml-1" />
    {label && <span className="text-[17px] font-normal leading-none pr-1">{label}</span>}
  </button>
);
