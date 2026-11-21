import React from 'react';
import { Check } from 'lucide-react';

export const VerifiedBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 15,
  className = '',
}) => (
  <span
    title="Verified"
    aria-label="Verified"
    style={{ width: size, height: size }}
    className={`inline-flex items-center justify-center rounded-full bg-[#007AFF] text-white shrink-0 ${className}`}
  >
    <Check style={{ width: size * 0.62, height: size * 0.62 }} className="stroke-[3]" />
  </span>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'blue' | 'neutral' | 'success' | 'danger';
  className?: string;
}> = ({ children, variant = 'blue', className = '' }) => {
  const styles = {
    blue: 'bg-[#007AFF] text-white',
    neutral: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white',
    success: 'bg-[#007AFF] text-white',
    danger: 'bg-black dark:bg-white text-white dark:text-black',
  }[variant];

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold leading-none whitespace-nowrap ${styles} ${className}`}
    >
      {children}
    </span>
  );
};
