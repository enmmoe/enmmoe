import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface TikTokBackButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLight?: boolean;
  className?: string;
  ariaLabel?: string;
  title?: string;
  id?: string;
  label?: string | null;
}

export const TikTokBackButton: React.FC<TikTokBackButtonProps> = ({
  onClick,
  className = '',
  ariaLabel,
  title,
  id,
  label,
}) => {
  const { t } = useLanguage();
  const displayLabel = label === undefined ? t('back', 'Back') : label;
  const resolvedAriaLabel = ariaLabel || displayLabel || 'Back';

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label={resolvedAriaLabel}
      title={title || resolvedAriaLabel}
      className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-0.5 px-1 text-[#007AFF] hover:opacity-70 ios-press cursor-pointer select-none transition-opacity ${className}`}
    >
      <ChevronLeft className="w-[24px] h-[24px] stroke-[2.2] -ml-1 shrink-0" />
      {displayLabel && (
        <span className="text-[17px] font-normal leading-none pr-1 whitespace-nowrap">
          {displayLabel}
        </span>
      )}
    </button>
  );
};
