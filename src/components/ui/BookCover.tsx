import React from 'react';
import { SmartImage } from './SmartImage';
import { ProgressBar } from './ProgressIndicator';

export interface BookCoverProps {
  title: string;
  subtitle?: string;
  coverImage: string;
  badgeText?: string;
  progressPercent?: number;
  onClick: () => void;
  className?: string;
  compact?: boolean;
}

export const BookCover: React.FC<BookCoverProps> = ({
  title,
  subtitle,
  coverImage,
  badgeText,
  progressPercent,
  onClick,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group text-left flex flex-col cursor-pointer ios-press focus-visible:outline-none ${className}`}
  >
    <div className="relative w-full aspect-[3/4] rounded-[14px] overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] mb-2">
      <SmartImage
        src={coverImage}
        alt={title}
        aspectClassName="w-full h-full"
        className="object-cover object-[center_14%] transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        fallbackText={title}
      />

      {badgeText && (
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide uppercase">
          {badgeText}
        </span>
      )}

      {typeof progressPercent === 'number' && progressPercent > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30 pointer-events-none">
          <div
            className="h-full bg-[#007AFF] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
          />
        </div>
      )}
    </div>

    <h3 className="text-[15px] font-semibold text-black dark:text-white line-clamp-1 w-full leading-snug group-hover:text-[#007AFF] transition-colors">
      {title}
    </h3>
    {subtitle && (
      <p className="text-[13px] text-[#8E8E93] truncate w-full mt-0.5 leading-tight tabular-nums">
        {subtitle}
      </p>
    )}
  </button>
);
