import React, { useState, useMemo } from 'react';
import { ChevronLeft, Check, Search } from 'lucide-react';
import {
  useLanguage,
  SUPPORTED_LANGUAGES,
  POPULAR_LANGUAGE_CODES,
  LanguageCode,
  SupportedLanguage,
} from '../utils/i18n';
import { EmptyState, SearchBar, useToast } from './ui';

interface LanguageScreenProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
}

export const LanguageScreen: React.FC<LanguageScreenProps> = ({ onBack }) => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const suggestedLanguages = useMemo(() => {
    const list: SupportedLanguage[] = [];
    const current = SUPPORTED_LANGUAGES.find((l) => l.code === language);
    if (current) list.push(current);
    POPULAR_LANGUAGE_CODES.forEach((code) => {
      if (code !== language) {
        const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
        if (found) list.push(found);
      }
    });
    return list.slice(0, 8);
  }, [language]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const allSortedLanguages = useMemo(
    () => [...SUPPORTED_LANGUAGES].sort((a, b) => a.nativeName.localeCompare(b.nativeName)),
    []
  );

  const handleSelectLanguage = (code: LanguageCode, langName: string) => {
    setLanguage(code);
    showToast(`${t('language_updated', 'Language updated')}: ${langName}`, {
      type: 'success',
      durationMs: 2000,
    });
  };

  const renderRow = (lang: SupportedLanguage, keyPrefix: string) => {
    const isSelected = language === lang.code;
    return (
      <button
        key={`${keyPrefix}-${lang.code}`}
        id={keyPrefix === 'suggested' ? `lang-row-${lang.code}` : undefined}
        type="button"
        onClick={() => handleSelectLanguage(lang.code, lang.nativeName)}
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
      >
        <div className="min-w-0 pr-3">
          <p className="text-[17px] font-normal text-black dark:text-white leading-snug truncate">
            {lang.nativeName}
          </p>
          {lang.name !== lang.nativeName && (
            <p className="text-[13px] text-[#8E8E93] truncate">{lang.name}</p>
          )}
        </div>

        {isSelected && (
          <Check className="w-5 h-5 text-[#007AFF] stroke-[2.4] shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div
      id="ios-language-screen"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-full w-full flex flex-col bg-[#F2F2F7] dark:bg-black text-black dark:text-white select-none"
    >
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] pt-safe">
        <div className="max-w-2xl mx-auto h-12 px-2 flex items-center justify-between">
          <button
            id="btn-language-back"
            type="button"
            onClick={onBack}
            className="min-w-[44px] min-h-[44px] inline-flex items-center gap-0.5 px-2 text-[#007AFF] cursor-pointer ios-press"
            aria-label={t('cancel', 'Back')}
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
            <span className="text-[17px]">{t('settings_title', 'Settings')}</span>
          </button>

          <h1 className="text-[17px] font-semibold tracking-tight">
            {t('settings_language', 'Language')}
          </h1>

          <div className="w-[72px]" />
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3 pt-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('search', 'Search languages')}
            showCancelOnFocus
            cancelLabel={t('cancel', 'Cancel')}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl w-full mx-auto space-y-6 pb-12">
        {searchQuery.trim() ? (
          filteredLanguages.length === 0 ? (
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title={t('no_results', 'No languages found')}
              description={`No language matches "${searchQuery}"`}
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden border border-black/[0.04] dark:border-white/[0.08]">
              {filteredLanguages.map((lang) => renderRow(lang, 'search'))}
            </div>
          )
        ) : (
          <>
            <section>
              <h2 className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-4 mb-2">
                {t('suggested_languages', 'Suggested')}
              </h2>
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden border border-black/[0.04] dark:border-white/[0.08]">
                {suggestedLanguages.map((lang) => renderRow(lang, 'suggested'))}
              </div>
            </section>

            <section>
              <h2 className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-4 mb-2">
                {t('all_languages', 'All Languages')}
              </h2>
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden border border-black/[0.04] dark:border-white/[0.08]">
                {allSortedLanguages.map((lang) => renderRow(lang, 'all'))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
