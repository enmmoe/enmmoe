import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}> = ({ icon, title, description, actionLabel, onAction, className = '' }) => (
  <div className={`py-14 px-6 flex flex-col items-center justify-center text-center ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[#8E8E93] flex items-center justify-center mb-3.5">
      {icon}
    </div>
    <h3 className="text-[18px] font-semibold text-black dark:text-white">{title}</h3>
    {description && (
      <p className="text-[15px] text-[#8E8E93] mt-1 max-w-xs leading-snug">{description}</p>
    )}
    {actionLabel && onAction && (
      <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
        {actionLabel}
      </Button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}> = ({
  title = 'Something went wrong',
  description = 'Unable to load content right now. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}) => (
  <div className={`py-14 px-6 flex flex-col items-center justify-center text-center ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center mb-3.5">
      <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
    </div>
    <h3 className="text-[18px] font-semibold text-black dark:text-white">{title}</h3>
    <p className="text-[15px] text-[#8E8E93] mt-1 max-w-xs leading-snug">{description}</p>
    {onRetry && (
      <Button
        variant="primary"
        size="sm"
        onClick={onRetry}
        leftIcon={<RefreshCw className="w-4 h-4" />}
        className="mt-4"
      >
        {retryLabel}
      </Button>
    )}
  </div>
);

export const OfflineBanner: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div
    role="status"
    className="w-full px-4 py-2 bg-[#F2F2F7] dark:bg-[#1C1C1E] border-b border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-3 text-[13px] text-black dark:text-white shrink-0"
  >
    <div className="flex items-center gap-2 min-w-0">
      <WifiOff className="w-4 h-4 text-[#8E8E93] shrink-0" />
      <span className="font-medium truncate">You are offline. Some actions may be unavailable.</span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="text-[13px] font-semibold text-[#007AFF] dark:text-[#0A84FF] shrink-0 cursor-pointer"
      >
        Retry
      </button>
    )}
  </div>
);
