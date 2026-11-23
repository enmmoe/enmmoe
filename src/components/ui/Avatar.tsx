import React, { useState } from 'react';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  ring?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-9 h-9 text-[13px]',
  md: 'w-12 h-12 text-[16px]',
  lg: 'w-16 h-16 text-[20px]',
  xl: 'w-24 h-24 text-[28px]',
};

const DOT_MAP = {
  xs: 'w-2 h-2 border-[1.5px]',
  sm: 'w-2.5 h-2.5 border-[1.5px]',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline = false,
  ring = false,
  onClick,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    setImgError(false);
    setLoaded(false);
  }, [src]);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 select-none ${
        SIZE_MAP[size]
      } ${onClick ? 'cursor-pointer ios-press' : ''} ${
        ring ? 'ring-2 ring-[#007AFF] ring-offset-2 ring-offset-white dark:ring-offset-black' : ''
      } ${className}`}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.1] flex items-center justify-center font-semibold text-[#8E8E93]">
        {src && !imgError ? (
          <img
            src={src}
            alt={name}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {isOnline && (
        <span
          aria-label="Online"
          className={`absolute bottom-0 right-0 rounded-full bg-[#34C759] border-white dark:border-black ${DOT_MAP[size]}`}
        />
      )}
    </div>
  );
};
