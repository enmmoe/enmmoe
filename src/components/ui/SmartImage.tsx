import React, { useState, useEffect } from 'react';
import { ImageOff, RefreshCw } from 'lucide-react';

export interface SmartImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'placeholder'> {
  src: string;
  alt: string;
  aspectClassName?: string;
  containerClassName?: string;
  fallbackText?: string;
  showRetryOnError?: boolean;
  preserveNaturalAspect?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  aspectClassName = '',
  containerClassName = '',
  fallbackText,
  showRetryOnError = false,
  preserveNaturalAspect = false,
  loading = 'lazy',
  decoding = 'async',
  ...rest
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [src, retryCount]);

  const effectiveSrc = retryCount > 0 && src
    ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}`
    : src;

  return (
    <div
      className={`relative overflow-hidden bg-[#F2F2F7] dark:bg-[#1C1C1E] ${aspectClassName} ${containerClassName}`}
    >
      {/* Shimmer skeleton while loading */}
      {status === 'loading' && (
        <div
          aria-hidden="true"
          className={`ios-skeleton ${preserveNaturalAspect ? 'min-h-[260px] w-full' : 'absolute inset-0'}`}
        />
      )}

      {/* Error state fallback */}
      {status === 'error' ? (
        <div
          className={`${
            preserveNaturalAspect ? 'min-h-[240px] w-full py-10' : 'absolute inset-0'
          } flex flex-col items-center justify-center gap-2 p-3 text-center bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93]`}
        >
          <ImageOff className="w-5 h-5 stroke-[1.6] opacity-75" />
          {fallbackText && (
            <span className="text-[12px] font-medium line-clamp-2 max-w-[160px]">{fallbackText}</span>
          )}
          {showRetryOnError && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRetryCount((c) => c + 1);
              }}
              className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.1] text-[12px] font-medium text-[#007AFF] dark:text-[#0A84FF] active:scale-95 transition-transform cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : (
        <img
          src={effectiveSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading={loading}
          decoding={decoding}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`${
            preserveNaturalAspect ? 'w-full h-auto block' : 'w-full h-full object-cover'
          } transition-opacity duration-300 ease-out ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...rest}
        />
      )}
    </div>
  );
};
