/**
 * Apple iOS Emoji Asset Utilities
 * Resolves any Unicode emoji grapheme (including ZWJ, skin tones, keycaps, flags,
 * and optional U+FE0F variation selectors) to local 64px Apple PNG files served at
 * /emoji/apple/64/<codepoints>.png.
 */

const EXTENDED_PICT_RE = /\p{Extended_Pictographic}/u;
const REGIONAL_FLAG_RE = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
const KEYCAP_RE = /^[0-9#*]\uFE0F?\u20E3$/u;

// BMP symbols in EMOJI_DATABASE that may lack U+FE0F in source string yet require -fe0f in PNG filenames
const FORCE_FE0F_CANDIDATES: Record<string, string> = {
  '261d': '261d-fe0f',
  '2620': '2620-fe0f',
  '263a': '263a-fe0f',
  '26a0': '26a0-fe0f',
  '270c': '270c-fe0f',
  '270d': '270d-fe0f',
  '2763': '2763-fe0f',
  '2764': '2764-fe0f',
  '1f590': '1f590-fe0f',
};

let segmenterInstance: Intl.Segmenter | null = null;
function getSegmenter(): Intl.Segmenter | null {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    if (!segmenterInstance) {
      segmenterInstance = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    }
    return segmenterInstance;
  }
  return null;
}

export function segmentGraphemes(text: string): string[] {
  if (!text) return [];
  const seg = getSegmenter();
  if (seg) {
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export function isEmojiGrapheme(grapheme: string): boolean {
  if (!grapheme) return false;
  if (REGIONAL_FLAG_RE.test(grapheme)) return true;
  if (KEYCAP_RE.test(grapheme)) return true;
  // Digits, #, * alone are NOT emojis
  if (/^[0-9#*]+$/.test(grapheme)) return false;
  return EXTENDED_PICT_RE.test(grapheme);
}

function toHexCodepoints(str: string): string[] {
  const cps: string[] = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined) {
      cps.push(cp.toString(16).toLowerCase().padStart(4, '0'));
    }
  }
  return cps;
}

function normalizeAppleHex(cpHex: string): string {
  // emoji-datasource-apple filenames do not zero-pad codepoints > 4 hex digits and strip leading zeros down to 4 hex digits
  return cpHex.length > 4 ? cpHex.replace(/^0+/, '') : cpHex;
}

/**
 * Returns ordered candidate URLs under `/emoji/apple/64/` for a single emoji grapheme.
 */
export function getAppleEmojiUrls(grapheme: string): string[] {
  if (!grapheme) return [];
  const rawCps = toHexCodepoints(grapheme).map(normalizeAppleHex);
  const candidates: string[] = [];

  const pushSlug = (slug: string) => {
    const url = `/emoji/apple/64/${slug}.png`;
    if (!candidates.includes(url)) {
      candidates.push(url);
    }
  };

  // Keycap emojis in emoji-datasource-apple always include -fe0f-20e3 (e.g. 0023-fe0f-20e3.png)
  if (KEYCAP_RE.test(grapheme) && rawCps.length >= 2) {
    const base = rawCps[0].padStart(4, '0');
    pushSlug(`${base}-fe0f-20e3`);
    pushSlug(`${base}-20e3`);
  }

  // Exact full sequence
  pushSlug(rawCps.join('-'));

  // Force FE0F variant if BMP emoji came without U+FE0F (e.g. ❤ -> 2764-fe0f)
  if (rawCps.length === 1 && FORCE_FE0F_CANDIDATES[rawCps[0]]) {
    pushSlug(FORCE_FE0F_CANDIDATES[rawCps[0]]);
  }

  // Strip trailing standalone fe0f (common for BMP/emoji-datasource files like 2b50.png or 1f3cb-1f3fb.png)
  if (rawCps.includes('fe0f')) {
    // Strip trailing fe0f
    if (rawCps[rawCps.length - 1] === 'fe0f') {
      pushSlug(rawCps.slice(0, -1).join('-'));
    }
    // Strip all fe0f (for sequences where some middle ZWJ elements drop fe0f)
    const withoutAllFe0f = rawCps.filter((c) => c !== 'fe0f');
    if (withoutAllFe0f.length > 0) {
      pushSlug(withoutAllFe0f.join('-'));
    }
  } else if (rawCps.includes('200d')) {
    // Insert fe0f after BMP ZWJ parts like 2764, 2640, 2642, 26a7, 2620, 2695, 2708
    const bmpZwjSet = new Set(['2764', '2640', '2642', '26a7', '2695', '2696', '2708', '2620', '2601']);
    const enriched: string[] = [];
    rawCps.forEach((cp, idx) => {
      enriched.push(cp);
      if (bmpZwjSet.has(cp) && rawCps[idx + 1] !== 'fe0f') {
        enriched.push('fe0f');
      }
    });
    pushSlug(enriched.join('-'));
  }

  return candidates;
}

export interface TextEmojiToken {
  type: 'text' | 'emoji';
  value: string;
}

export function tokenizeTextWithEmojis(text: string): TextEmojiToken[] {
  if (!text) return [];
  const graphemes = segmentGraphemes(text);
  const tokens: TextEmojiToken[] = [];
  let textBuffer = '';

  for (const g of graphemes) {
    if (isEmojiGrapheme(g)) {
      if (textBuffer) {
        tokens.push({ type: 'text', value: textBuffer });
        textBuffer = '';
      }
      tokens.push({ type: 'emoji', value: g });
    } else {
      textBuffer += g;
    }
  }

  if (textBuffer) {
    tokens.push({ type: 'text', value: textBuffer });
  }

  return tokens;
}
