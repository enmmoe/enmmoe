import React from 'react';
import { Loader2, Check } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;

  const variantClasses = {
    primary:
      'bg-[#007AFF] hover:bg-[#0066D6] dark:bg-[#0A84FF] dark:hover:bg-[#2E96FF] text-white shadow-[0_1px_2px_rgba(0,122,255,0.2)]',
    secondary:
      'bg-[#F2F2F7] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-black dark:text-white',
    outline:
      'bg-transparent hover:bg-[#F2F2F7] dark:hover:bg-white/[0.06] text-black dark:text-white border border-black/[0.12] dark:border-white/[0.16]',
    ghost:
      'bg-transparent hover:bg-[#F2F2F7] dark:hover:bg-white/[0.08] text-[#007AFF] dark:text-[#0A84FF]',
    destructive:
      'bg-black hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black',
  }[variant];

  const sizeClasses = {
    sm: 'min-h-[36px] px-3.5 py-1.5 text-[15px] rounded-xl gap-1.5',
    md: 'min-h-[44px] px-4 py-2.5 text-[17px] rounded-2xl gap-2',
    lg: 'min-h-[50px] px-5 py-3 text-[17px] rounded-2xl gap-2',
  }[size];

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap shrink-0 select-none ios-press cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${variantClasses} ${sizeClasses} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : success ? (
        <Check className="w-4 h-4 shrink-0" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
};
