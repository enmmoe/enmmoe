import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex items-center w-[51px] h-[31px] rounded-full transition-colors duration-200 ease-out shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
      checked
        ? 'bg-[#007AFF]'
        : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'
    }`}
  >
    <span
      className={`inline-block w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transform transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
      }`}
    />
  </button>
);
