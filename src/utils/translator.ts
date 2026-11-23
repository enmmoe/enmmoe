import { SUPPORTED_LANGUAGES, SupportedLanguage, LanguageCode } from './i18n';

export { SUPPORTED_LANGUAGES };
export type { SupportedLanguage, LanguageCode };

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export interface TranslationResponse {
  originalText: string;
  originalLanguage: string;
  targetLanguage: string;
  translatedText: string;
  cached?: boolean;
}

// In-Memory Fast Client-Side Translation Cache (stores only real successful translations)
const clientTranslationCache = new Map<string, string>();

// In-Flight Request Deduplication: prevents duplicate parallel API calls
const pendingClientRequests = new Map<string, Promise<TranslationResponse>>();

/**
 * Fast synchronous cache check
 */
export function getCachedTranslation(messageId: string, targetLanguage: string): string | null {
  const key = `${messageId}:${targetLanguage}`;
  return clientTranslationCache.get(key) || null;
}

/**
 * Detect non-Latin scripts deterministically; return 'auto' for Latin-script languages
 * so the backend translation engine inspects the full sentence rather than misclassifying
 * English/Spanish/French/Portuguese/Italian/Indonesian.
 */
export function detectClearScriptLanguage(text: string): LanguageCode | 'auto' {
  const clean = text.trim();
  if (!clean) return 'auto';

  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(clean)) return 'ko';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) return 'ja';
  if (/[\u4E00-\u9FFF]/.test(clean)) return 'zh';
  if (/[\u0600-\u06FF]/.test(clean)) return 'ar';
  if (/[\u0900-\u097F]/.test(clean)) return 'hi';
  if (/[\u0E00-\u0E7F]/.test(clean)) return 'th';
  if (/[\u1200-\u137F]/.test(clean)) return 'am';
  if (/[\u1000-\u109F\uAA60-\uAA7F]/.test(clean)) return 'my';
  if (/[\u0400-\u04FF]/.test(clean)) return /[іїєґ]/i.test(clean) ? 'uk' : 'ru';

  return 'auto';
}

export function detectLanguageLocally(text: string): LanguageCode {
  const clear = detectClearScriptLanguage(text);
  if (clear !== 'auto') return clear;
  const clean = text.trim();
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean)) return 'vi';
  if (/[ğışİĞŞ]/i.test(clean)) return 'tr';
  if (/[ąćęłńśźżĄĆĘŁŃŚŹŻ]/.test(clean)) return 'pl';
  if (/[ß]/i.test(clean)) return 'de';
  if (/[¿¡ñ]/i.test(clean)) return 'es';
  if (/[ãõ]/i.test(clean)) return 'pt';
  return 'en';
}

/**
 * Translates message text into the user's selected language via the real backend `/api/translate` endpoint.
 * Throws descriptive errors when offline, unconfigured, or upstream fails (never returns fake mock data).
 */
export async function translateText(
  messageId: string,
  text: string,
  targetLanguage: LanguageCode
): Promise<TranslationResponse> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Empty message cannot be translated.');
  }

  const detectedSource = detectClearScriptLanguage(cleanText);

  if (detectedSource !== 'auto' && detectedSource === targetLanguage) {
    return {
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: text,
      cached: true,
    };
  }

  const cacheKey = `${messageId || cleanText}:${targetLanguage}`;

  if (clientTranslationCache.has(cacheKey)) {
    return {
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: clientTranslationCache.get(cacheKey)!,
      cached: true,
    };
  }

  if (pendingClientRequests.has(cacheKey)) {
    return pendingClientRequests.get(cacheKey)!;
  }

  const reqPromise = (async (): Promise<TranslationResponse> => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          text: cleanText,
          sourceLanguage: detectedSource,
          targetLanguage,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string' && payload.error.trim()
            ? payload.error
            : `Translation failed (${response.status})`
        );
      }

      const translatedText =
        typeof payload?.translatedText === 'string' ? payload.translatedText.trim() : '';
      if (!translatedText) {
        throw new Error('Translation service returned an empty result.');
      }

      clientTranslationCache.set(cacheKey, translatedText);
      return {
        originalText: text,
        originalLanguage: payload.originalLanguage || detectedSource,
        targetLanguage: payload.targetLanguage || targetLanguage,
        translatedText,
        cached: Boolean(payload.cached),
      };
    } finally {
      pendingClientRequests.delete(cacheKey);
    }
  })();

  pendingClientRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

export async function translateMessageText({
  text,
  targetLanguage,
  messageId = '',
}: {
  text: string;
  targetLanguage: LanguageCode;
  messageId?: string;
}): Promise<TranslationResponse> {
  return translateText(messageId, text, targetLanguage);
}
