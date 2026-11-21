import React, { useState, forwardRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocusChange?: (focused: boolean) => void;
  onCancel?: () => void;
  showCancelOnFocus?: boolean;
  cancelLabel?: string;
  autoFocus?: boolean;
  className?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Search',
      onFocusChange,
      onCancel,
      showCancelOnFocus = false,
      cancelLabel = 'Cancel',
      autoFocus = false,
      className = '',
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);

    const handleFocus = () => {
      setFocused(true);
      onFocusChange?.(true);
    };

    const handleBlur = () => {
      setFocused(false);
      onFocusChange?.(false);
    };

    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div
          className={`flex-1 flex items-center h-[40px] px-3 rounded-[12px] bg-[#F2F2F7] dark:bg-[#1C1C1E] transition-all duration-200 border ${
            focused
              ? 'border-[#007AFF] bg-white dark:bg-[#1C1C1E] shadow-[0_0_0_3px_rgba(0,122,255,0.12)]'
              : 'border-transparent'
          }`}
        >
          <Search className="w-[17px] h-[17px] text-[#8E8E93] stroke-[2] shrink-0 mr-2" />
          <input
            ref={ref}
            type="text"
            value={value}
            autoFocus={autoFocus}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent border-0 text-[16px] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none leading-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Clear search"
              className="w-5 h-5 rounded-full bg-[#8E8E93]/30 hover:bg-[#8E8E93]/50 text-white flex items-center justify-center shrink-0 ml-1.5 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          )}
        </div>

        {showCancelOnFocus && (focused || value) && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange('');
              onCancel?.();
            }}
            className="text-[16px] font-normal text-[#007AFF] whitespace-nowrap shrink-0 px-1 py-1 cursor-pointer active:opacity-60 transition-opacity"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => (
  <div className="space-y-1.5 w-full">
    {label && (
      <label className="block text-[13px] font-medium text-[#8E8E93] px-1">
        {label}
      </label>
    )}
    <input
      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[16px] text-black dark:text-white placeholder-[#8E8E93] border transition-all focus:bg-white dark:focus:bg-[#2C2C2E] ${
        error
          ? 'border-black/60 dark:border-white/60 focus:border-black dark:focus:border-white'
          : 'border-black/[0.06] dark:border-white/[0.08] focus:border-[#007AFF]'
      } ${className}`}
      {...props}
    />
    {error ? (
      <p className="text-[13px] font-medium text-black dark:text-white px-1">{error}</p>
    ) : helperText ? (
      <p className="text-[13px] text-[#8E8E93] px-1">{helperText}</p>
    ) : null}
  </div>
);
