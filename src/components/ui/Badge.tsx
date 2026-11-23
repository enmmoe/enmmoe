import React from 'react';

const VERIFIED_SEAL_PATH =
  'M 10.79 1.37 Q 12 0.41 13.21 1.37 L 13.97 2.72 Q 14.38 3.1 14.93 2.97 L 16.27 2.19 Q 17.8 1.96 18.36 3.4 L 18.35 4.95 Q 18.51 5.49 19.05 5.65 L 20.6 5.64 Q 22.04 6.2 21.81 7.73 L 21.03 9.07 Q 20.9 9.62 21.28 10.03 L 22.63 10.79 Q 23.59 12 22.63 13.21 L 21.28 13.97 Q 20.9 14.38 21.03 14.93 L 21.81 16.27 Q 22.04 17.8 20.6 18.36 L 19.05 18.35 Q 18.51 18.51 18.35 19.05 L 18.36 20.6 Q 17.8 22.04 16.27 21.81 L 14.93 21.03 Q 14.38 20.9 13.97 21.28 L 13.21 22.63 Q 12 23.59 10.79 22.63 L 10.03 21.28 Q 9.62 20.9 9.07 21.03 L 7.73 21.81 Q 6.2 22.04 5.64 20.6 L 5.65 19.05 Q 5.49 18.51 4.95 18.35 L 3.4 18.36 Q 1.96 17.8 2.19 16.27 L 2.97 14.93 Q 3.1 14.38 2.72 13.97 L 1.37 13.21 Q 0.41 12 1.37 10.79 L 2.72 10.03 Q 3.1 9.62 2.97 9.07 L 2.19 7.73 Q 1.96 6.2 3.4 5.64 L 4.95 5.65 Q 5.49 5.49 5.65 4.95 L 5.64 3.4 Q 6.2 1.96 7.73 2.19 L 9.07 2.97 Q 9.62 3.1 10.03 2.72 Z';

export const VerifiedBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 15,
  className = '',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Verified"
    style={{ width: size, height: size }}
    className={`inline-block shrink-0 align-middle ${className}`}
  >
    <title>Verified</title>
    <path d={VERIFIED_SEAL_PATH} fill="#0095F6" />
    <path
      d="M7.6 12.15L10.55 15.1L16.55 9.1"
      stroke="#FFFFFF"
      strokeWidth={2.35}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
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
