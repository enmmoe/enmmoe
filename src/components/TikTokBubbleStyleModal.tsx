import React, { useState, useEffect } from 'react';
import { Check, Ban } from 'lucide-react';
import { TikTokBackButton } from './TikTokBackButton';
import { soundFX } from '../utils/audio';
import { triggerHaptic } from '../utils/telegram';

export interface BubbleStyleDef {
  id: string;
  name: string;
  description: string;
  bubbleClass: string;
  textClass: string;
  previewText: string;
  decorationPosition: 'top-left' | 'top-right';
  renderCharacter: (mode: 'preview' | 'grid' | 'chat') => React.ReactNode;
}

export const BUBBLE_STYLES: BubbleStyleDef[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean standard system blue bubble',
    bubbleClass:
      'bg-[#007AFF] text-white rounded-[20px] rounded-br-[6px] border border-[#007AFF]',
    textClass: 'text-white font-normal',
    previewText: 'Default',
    decorationPosition: 'top-right',
    renderCharacter: () => null,
  },
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    description: 'Rich high-contrast blue bubble with crisp rim',
    bubbleClass:
      'bg-[#0051B3] text-white border border-[#007AFF]/60 rounded-[20px] rounded-br-[6px] shadow-[0_2px_10px_rgba(0,122,255,0.22)] relative overflow-hidden',
    textClass: 'text-white font-medium',
    previewText: 'Deep',
    decorationPosition: 'top-left',
    renderCharacter: (mode) => {
      const size = mode === 'preview' ? 20 : mode === 'grid' ? 12 : 16;
      return (
        <div
          className={`absolute pointer-events-none select-none z-10 ${
            mode === 'preview' ? 'top-2.5 left-2.5' : mode === 'grid' ? 'top-1.5 left-1.5' : 'top-2 left-2'
          }`}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="8" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="#FFFFFF" fillOpacity="0.85" />
          </svg>
        </div>
      );
    },
  },
  {
    id: 'ink-obsidian',
    name: 'Obsidian Ink',
    description: 'Minimalist monochrome ink bubble with blue crest',
    bubbleClass:
      'bg-[#1C1C1E] text-white border border-[#007AFF]/50 rounded-[18px] rounded-br-[4px] shadow-[0_2px_10px_rgba(0,0,0,0.18)] relative overflow-hidden',
    textClass: 'text-white font-medium',
    previewText: 'Ink',
    decorationPosition: 'top-left',
    renderCharacter: (mode) => {
      const size = mode === 'preview' ? 20 : mode === 'grid' ? 12 : 16;
      return (
        <div
          className={`absolute pointer-events-none select-none z-10 ${
            mode === 'preview' ? 'top-2.5 left-2.5' : mode === 'grid' ? 'top-1.5 left-1.5' : 'top-2 left-2'
          }`}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path d="M4 12L14 4L11 12H20L10 20L13 12H4Z" fill="#007AFF" />
          </svg>
        </div>
      );
    },
  },
  {
    id: 'crisp-outline',
    name: 'Editorial Line',
    description: 'Clean white editorial bubble with blue accent border',
    bubbleClass:
      'bg-white dark:bg-[#1C1C1E] text-black dark:text-white border-[1.5px] border-[#007AFF] rounded-[20px] rounded-br-[6px] relative overflow-hidden',
    textClass: 'text-black dark:text-white font-medium',
    previewText: 'Line',
    decorationPosition: 'top-right',
    renderCharacter: (mode) => {
      const size = mode === 'preview' ? 20 : mode === 'grid' ? 12 : 16;
      return (
        <div
          className={`absolute pointer-events-none select-none z-10 ${
            mode === 'preview' ? 'top-2.5 right-2.5' : mode === 'grid' ? 'top-1.5 right-1.5' : 'top-2 right-2'
          }`}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path d="M5 17L17 5M11 5H17V11" stroke="#007AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    },
  },
  {
    id: 'soft-tint',
    name: 'Soft Blue',
    description: 'Airy translucent blue bubble with subtle stroke',
    bubbleClass:
      'bg-[#EAF3FF] dark:bg-[#007AFF]/20 text-black dark:text-white border border-[#007AFF]/25 rounded-[20px] rounded-br-[6px] relative overflow-hidden',
    textClass: 'text-black dark:text-white font-normal',
    previewText: 'Soft',
    decorationPosition: 'top-right',
    renderCharacter: (mode) => {
      const size = mode === 'preview' ? 20 : mode === 'grid' ? 12 : 16;
      return (
        <div
          className={`absolute pointer-events-none select-none z-10 ${
            mode === 'preview' ? 'top-2.5 right-2.5' : mode === 'grid' ? 'top-1.5 right-1.5' : 'top-2 right-2'
          }`}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <rect x="5" y="5" width="14" height="14" rx="4" stroke="#007AFF" strokeWidth="2" />
          </svg>
        </div>
      );
    },
  },
  {
    id: 'graphite-slate',
    name: 'Graphite',
    description: 'Neutral slate surface with subtle crisp corner',
    bubbleClass:
      'bg-[#2C2C2E] text-white border border-white/15 rounded-[18px] rounded-br-[4px] relative overflow-hidden',
    textClass: 'text-white font-normal',
    previewText: 'Slate',
    decorationPosition: 'top-left',
    renderCharacter: (mode) => {
      const size = mode === 'preview' ? 20 : mode === 'grid' ? 12 : 16;
      return (
        <div
          className={`absolute pointer-events-none select-none z-10 ${
            mode === 'preview' ? 'top-2.5 left-2.5' : mode === 'grid' ? 'top-1.5 left-1.5' : 'top-2 left-2'
          }`}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path d="M12 4L14.5 9.5L20 12L14.5 14.5L12 20L9.5 14.5L4 12L9.5 9.5L12 4Z" fill="#FFFFFF" fillOpacity="0.7" />
          </svg>
        </div>
      );
    },
  },
];

export function getBubbleStyle(id?: string): BubbleStyleDef {
  if (!id) return BUBBLE_STYLES[0];
  const normalized = id.replace(/_/g, '-').toLowerCase();
  return (
    BUBBLE_STYLES.find(
      (b) =>
        b.id === id ||
        b.id.toLowerCase() === normalized ||
        b.id.replace(/-/g, '_').toLowerCase() === id.toLowerCase()
    ) || BUBBLE_STYLES[0]
  );
}

interface TikTokBubbleStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyleId?: string;
  onSave: (styleId: string) => void;
  isLight?: boolean;
}

export const TikTokBubbleStyleModal: React.FC<TikTokBubbleStyleModalProps> = ({
  isOpen,
  onClose,
  currentStyleId,
  onSave,
  isLight: propIsLight,
}) => {
  const [isThemeLight, setIsThemeLight] = useState<boolean>(() => {
    if (propIsLight !== undefined) return propIsLight;
    if (typeof document !== 'undefined') {
      return (
        !document.body.classList.contains('dark') &&
        !document.documentElement.classList.contains('dark')
      );
    }
    return true;
  });

  useEffect(() => {
    if (propIsLight !== undefined) {
      setIsThemeLight(propIsLight);
    } else if (typeof document !== 'undefined') {
      const updateTheme = () => {
        setIsThemeLight(
          !document.body.classList.contains('dark') &&
          !document.documentElement.classList.contains('dark')
        );
      };
      updateTheme();
      const observer = new MutationObserver(updateTheme);
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, [propIsLight]);

  const isLight = isThemeLight;

  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    currentStyleId || 'default'
  );

  React.useEffect(() => {
    if (isOpen) {
      setSelectedStyleId(currentStyleId || 'default');
    }
  }, [isOpen, currentStyleId]);

  if (!isOpen) return null;

  const currentDef = getBubbleStyle(selectedStyleId);
  const hasChanged = selectedStyleId !== currentStyleId;

  const handleSelect = (styleId: string) => {
    soundFX.playPop();
    triggerHaptic();
    setSelectedStyleId(styleId);
  };

  const handleSave = () => {
    soundFX.playSuccess();
    triggerHaptic();
    onSave(selectedStyleId);
    onClose();
  };

  const handleCancel = () => {
    soundFX.playClick();
    onClose();
  };

  return (
    <div
      id="tiktok-bubble-style-modal-root"
      className={`fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden font-sans ${
        isLight ? 'bg-[#FFFFFF] text-[#000000]' : 'bg-[#000000] text-[#FFFFFF]'
      }`}
    >
      <div
        className={`w-full max-w-2xl mx-auto h-full flex flex-col justify-between relative ${
          isLight ? 'bg-[#FFFFFF] text-[#000000]' : 'bg-[#000000] text-[#FFFFFF]'
        }`}
      >
        <header
          id="bubble-style-top-bar"
          className={`relative z-50 flex items-center justify-between px-4 sm:px-5 py-3 border-b shrink-0 min-h-[56px] transition-colors ${
            isLight
              ? 'bg-[#FFFFFF] text-[#000000] border-black/[0.08]'
              : 'bg-[#000000] text-[#FFFFFF] border-white/[0.12]'
          }`}
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
          }}
        >
          <div className="w-20 min-w-[70px] flex justify-start items-center">
            <TikTokBackButton
              id="bubble-style-cancel-btn"
              onClick={handleCancel}
              isLight={isLight}
              className="-ml-2"
              ariaLabel="Back"
              title="Back"
            />
          </div>

          <h1
            id="bubble-style-title"
            className={`text-[17px] font-semibold tracking-tight text-center flex-1 truncate px-2 select-none ${
              isLight ? 'text-[#000000]' : 'text-[#FFFFFF]'
            }`}
          >
            Bubble Style
          </h1>

          <div className="w-20 min-w-[70px] flex justify-end items-center">
            <button
              id="bubble-style-save-btn"
              type="button"
              onClick={handleSave}
              className={`text-[17px] font-semibold tracking-normal cursor-pointer py-1.5 px-1 text-[#007AFF] transition-opacity ${
                hasChanged ? 'opacity-100' : 'opacity-85 hover:opacity-100'
              }`}
            >
              Save
            </button>
          </div>
        </header>

        {/* Live Message Bubble Preview */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-4 sm:py-6 overflow-hidden relative">
          <div className="w-full flex justify-end">
            <div
              className={`relative w-[310px] max-w-[88vw] px-5 py-4 transition-all duration-200 ${currentDef.bubbleClass}`}
            >
              {currentDef.renderCharacter('preview')}

              <p
                className={`text-[15px] leading-[1.45] select-none ${
                  currentDef.id !== 'default'
                    ? currentDef.decorationPosition === 'top-left'
                      ? 'pl-5'
                      : 'pr-5'
                    : ''
                } ${currentDef.textClass}`}
              >
                You can customize your outgoing message style while keeping every chat crisp and readable.
              </p>

              <div className={`flex items-center justify-end gap-1.5 mt-2.5 text-[11px] opacity-75 font-medium select-none ${currentDef.textClass}`}>
                <span>10:42 PM</span>
                <span>·</span>
                <span>Sent</span>
                <svg className="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Grid */}
        <div
          className={`relative z-10 w-full px-4 sm:px-6 pt-2 pb-8 sm:pb-10 flex flex-col max-h-[60vh] sm:max-h-[58vh] ${
            isLight ? 'bg-[#FFFFFF] text-[#000000]' : 'bg-[#000000] text-[#FFFFFF]'
          }`}
        >
          <div className="mb-3 sm:mb-4 shrink-0">
            <h2 className="text-[17px] sm:text-[18px] font-bold tracking-tight">
              Bubble Styles
            </h2>
            <p className="text-[12.5px] sm:text-[13px] text-[#8E8E93] mt-0.5 sm:mt-1 leading-normal">
              Applies to new outgoing messages across all chats.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 -mr-1 pb-3">
            <div className="grid grid-cols-3 gap-x-2.5 sm:gap-x-3 gap-y-3 sm:gap-y-3.5">
              {BUBBLE_STYLES.map((style) => {
                const isSelected = selectedStyleId === style.id;
                const isDefault = style.id === 'default';

                return (
                  <button
                    key={style.id}
                    id={`bubble-option-${style.id}`}
                    type="button"
                    onClick={() => handleSelect(style.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-[18px] transition-colors cursor-pointer group active:opacity-80 outline-none relative ${
                      isSelected
                        ? isLight
                          ? 'bg-[#F2F2F7] ring-1.5 ring-[#007AFF]'
                          : 'bg-[#1C1C1E] ring-1.5 ring-[#007AFF]'
                        : isLight
                        ? 'bg-transparent hover:bg-black/5'
                        : 'bg-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="h-11 w-full flex items-center justify-center relative">
                      <div
                        className={`w-[98px] h-[36px] px-2.5 py-1.5 flex items-center relative transition-transform group-hover:scale-[1.02] ${style.bubbleClass}`}
                      >
                        {style.renderCharacter('grid')}

                        <div
                          className={`w-full flex items-center justify-center ${
                            isDefault
                              ? ''
                              : style.decorationPosition === 'top-left'
                              ? 'pl-3'
                              : 'pr-3'
                          }`}
                        >
                          {isDefault ? (
                            <div className="flex items-center gap-1">
                              <Ban className="w-3 h-3 text-white/80" />
                              <span className="text-[11px] font-medium text-white tracking-tight">
                                Default
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`text-[11px] font-semibold truncate leading-tight tracking-tight ${style.textClass}`}
                            >
                              {style.previewText}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#007AFF] flex items-center justify-center text-white shadow-xs z-20">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <span
                      className={`text-[12px] sm:text-[12.5px] text-center mt-2 truncate w-full px-0.5 ${
                        isSelected
                          ? 'text-[#007AFF] font-semibold'
                          : isLight
                          ? 'text-[#3C3C43] group-hover:text-[#000000] font-normal'
                          : 'text-[#E5E5EA] group-hover:text-white font-normal'
                      }`}
                    >
                      {style.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
