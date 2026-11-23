import React, { useMemo, useState, useEffect } from 'react';
import { getAppleEmojiUrls, tokenizeTextWithEmojis } from '../utils/emoji';

export interface AppleEmojiProps {
  char: string;
  size?: number;
  className?: string;
}

/**
 * Renders an authentic Apple iOS emoji PNG image across all OSes/browsers,
 * preserving the native Unicode character as `alt` text and falling back cleanly
 * to the Unicode glyph only if no PNG asset candidate loads.
 */
export const AppleEmoji: React.FC<AppleEmojiProps> = ({
  char,
  size = 18,
  className = '',
}) => {
  const candidates = useMemo(() => getAppleEmojiUrls(char), [char]);
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [char]);

  const activeSrc = candidates[candidateIdx];

  if (!activeSrc) {
    return (
      <span
        className={`inline-block align-middle leading-none select-text ${className}`}
        style={{ fontSize: `${Math.round(size * 0.9)}px` }}
      >
        {char}
      </span>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={char}
      width={size}
      height={size}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => {
        setCandidateIdx((prev) => prev + 1);
      }}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block shrink-0 object-contain align-[-0.2em] select-none pointer-events-none ${className}`}
    />
  );
};

export interface EmojiTextProps {
  text: string;
  emojiSize?: number;
  className?: string;
}

/**
 * Splits mixed text + Unicode emojis and renders emojis with Apple iOS PNG artwork
 * while preserving ordinary text copyability, wrapping, and typography.
 */
export const EmojiText: React.FC<EmojiTextProps> = ({
  text,
  emojiSize = 17,
  className = '',
}) => {
  const tokens = useMemo(() => tokenizeTextWithEmojis(text), [text]);

  if (tokens.length === 0) return null;

  return (
    <span className={className}>
      {tokens.map((tok, idx) =>
        tok.type === 'emoji' ? (
          <AppleEmoji
            key={`em-${idx}-${tok.value}`}
            char={tok.value}
            size={emojiSize}
            className="mx-[0.04em]"
          />
        ) : (
          <React.Fragment key={`tx-${idx}`}>{tok.value}</React.Fragment>
        )
      )}
    </span>
  );
};
