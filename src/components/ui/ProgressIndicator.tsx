import React from 'react';
import { Loader2 } from 'lucide-react';

export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  className?: string;
  heightClass?: string;
}> = ({ value, max = 100, className = '', heightClass = 'h-1' }) => {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full rounded-full overflow-hidden bg-black/[0.08] dark:bg-white/[0.15] ${heightClass} ${className}`}
    >
      <div
        className="h-full bg-[#007AFF] rounded-full transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export const InlineSpinner: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = '',
}) => (
  <Loader2
    style={{ width: size, height: size }}
    className={`animate-spin text-[#007AFF] ${className}`}
  />
);
