export type LanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'it'
  | 'ru'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'id'
  | 'th'
  | 'vi'
  | 'tr'
  | 'ar'
  | 'hi'
  | 'fil'
  | 'pl'
  | 'nl'
  | 'uk'
  | 'my'
  | 'am';

export interface SupportedLanguage {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag?: string; // Optional for backward compatibility, unused
  isRtl?: boolean;
}

// Curated best languages for the global webtoon, manga, and social community
// NO flag icons (Instagram style: clean typography with native name & English name)
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português (Brasil)' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'fil', name: 'Filipino', nativeName: 'Tagalog' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
];

export const POPULAR_LANGUAGE_CODES: LanguageCode[] = [
  'en',
  'es',
  'fr',
  'ja',
  'ko',
  'zh',
  'de',
  'pt',
  'ar',
];
