import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  BellOff,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Moon,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  UserX,
} from 'lucide-react';
import { LanguageScreen } from './LanguageScreen';
import { ProfilePrivacyModal } from './ProfilePrivacyModal';
import {
  getReaderPreferences,
  saveReaderPreferences,
  ReaderPreferences,
} from './WebtoonReaderModal';
import { SocialPost, User } from '../types';
import { SUPPORTED_LANGUAGES, formatLocalizedTime, useLanguage } from '../utils/i18n';
import { EmojiText } from './AppleEmoji';
import { ENMMOE_AVATARS } from '../data/enmmoeAvatars';
import { INITIAL_CREATORS, INITIAL_POSTS } from '../data/socialMockData';
import {
  Avatar,
  BottomSheet,
  Button,
  Dialog,
  EmptyState,
  TextField,
  Toggle,
  useToast,
} from './ui';

interface SettingsViewProps {
  currentUser: User;
  onBack: () => void;
  onUpdateUser: (updatedFields: Partial<User>) => void;
  onOpenAuthModal?: () => void;
  onOpenEditProfile?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onBack,
  onUpdateUser,
  onOpenAuthModal,
  onOpenEditProfile,
}) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [activeSubScreen, setActiveSubScreen] = useState<'language' | null>(null);
  const [activeSubModal, setActiveSubModal] = useState<
    | null
    | 'blocked'
    | 'mute'
    | 'favourite'
    | 'delete_account'
    | 'email'
    | 'reader'
    | 'privacy'
    | 'help'
    | 'about'
  >(null);

  const [name, setName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || ENMMOE_AVATARS[0].src);

  // Reader Preferences State
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(() =>
    getReaderPreferences()
  );

  // Help / Feedback State
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Email & Verification State
  const [email, setEmail] = useState<string>(
    currentUser.email || 'zaydmezgebo964@gmail.com'
  );
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(
    Boolean(currentUser.isEmailVerified)
  );
  const [emailInput, setEmailInput] = useState<string>(email);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [codeSentSuccess, setCodeSentSuccess] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [devPreviewCode, setDevPreviewCode] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Email messaging
  const [messageSubject, setMessageSubject] = useState<string>('Account Activity Update');
  const [messageBody, setMessageBody] = useState<string>(
    'Hello! This is a notification dispatched from your enmmoe settings.'
  );
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [emailLogs, setEmailLogs] = useState<
    Array<{
      id: string;
      email: string;
      subject: string;
      message: string;
      timestamp: number;
      status: 'delivered' | 'sent';
    }>
  >([]);

  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(
    currentUser.blockedUserIds || []
  );
  const [muteMessages, setMuteMessages] = useState<boolean>(() => {
    try {
      return localStorage.getItem('enmmoe_mute_messages') === 'true';
    } catch {
      return false;
    }
  });
  const [muteNotifications, setMuteNotifications] = useState<boolean>(() => {
    try {
      return localStorage.getItem('enmmoe_mute_notifs') === 'true';
    } catch {
      return false;
    }
  });
  const [mutedUserIds, setMutedUserIds] = useState<string[]>(
    currentUser.mutedUserIds || []
  );
  const [savedPostIds, setSavedPostIds] = useState<string[]>(
    currentUser.savedPostIds || ['post-1', 'post-3']
  );

  useEffect(() => {
    setName(currentUser.name || '');
    setUsername(currentUser.username || '');
    setBio(currentUser.bio || '');
    setAvatar(currentUser.avatar || ENMMOE_AVATARS[0].src);
    if (currentUser.email) {
      setEmail(currentUser.email);
      setEmailInput(currentUser.email);
    }
    if (typeof currentUser.isEmailVerified === 'boolean') {
      setIsEmailVerified(currentUser.isEmailVerified);
    }
    setBlockedUserIds(currentUser.blockedUserIds || []);
    setMutedUserIds(currentUser.mutedUserIds || []);
  }, [currentUser]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const fetchEmailLogs = async (targetEmail?: string) => {
    const e = (targetEmail || email || '').trim().toLowerCase();
    if (!e) return;
    try {
      const res = await fetch(`/api/email/logs?email=${encodeURIComponent(e)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setEmailLogs(data.logs);
      }
    } catch {
      // ignore network error
    }
  };

  useEffect(() => {
    if (activeSubModal === 'email') {
      fetchEmailLogs(email);
      setEmailError(null);
    }
  }, [activeSubModal, email]);

  const handleSaveAll = () => {
    const cleanedUsername = username.replace(/^@/, '').trim();
    onUpdateUser({
      name: name.trim() || currentUser.name,
      username: cleanedUsername || currentUser.username,
      bio,
      avatar,
      email,
      isEmailVerified,
      blockedUserIds,
      mutedUserIds,
      savedPostIds,
    });
    showToast('Settings saved', { type: 'success' });
  };

  const handleUpdateReaderPrefs = (next: ReaderPreferences) => {
    setReaderPrefs(next);
    saveReaderPreferences(next);
  };

  const handleSendVerificationCode = async (targetEmail?: string) => {
    const toVerify = (targetEmail || emailInput || email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toVerify)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError(null);
    setIsSendingCode(true);
    try {
      const res = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: toVerify,
          userId: currentUser.id,
          userName: currentUser.name || name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmail(toVerify);
        setEmailInput(toVerify);
        setCodeSentSuccess(true);
        setResendCooldown(60);
        if (data.previewCode) setDevPreviewCode(data.previewCode);
        onUpdateUser({ email: toVerify });
        showToast(`Verification code sent to ${toVerify}`, { type: 'success' });
      } else {
        setEmailError(data.error || 'Failed to send verification code');
      }
    } catch {
      setEmailError('Network error while sending verification code');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.trim().length < 4) {
      setEmailError('Please enter the 6-digit verification code');
      return;
    }
    setEmailError(null);
    setIsVerifyingCode(true);
    try {
      const res = await fetch('/api/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode.trim(),
          userId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEmailVerified(true);
        setCodeSentSuccess(false);
        setVerificationCode('');
        setDevPreviewCode(null);
        setIsEditingEmail(false);
        onUpdateUser({ isEmailVerified: true });
        showToast('Email verified', { type: 'success' });
        fetchEmailLogs(email);
      } else {
        setEmailError(data.error || 'Invalid or expired code');
      }
    } catch {
      setEmailError('Verification failed. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSendMessageToEmail = async () => {
    const targetEmail = (email || emailInput || '').trim();
    if (!targetEmail || !messageSubject.trim() || !messageBody.trim()) {
      setEmailError('Please fill in email, subject, and message');
      return;
    }
    setEmailError(null);
    setIsSendingMessage(true);
    try {
      const res = await fetch('/api/email/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          subject: messageSubject.trim(),
          message: messageBody.trim(),
          userName: currentUser.name || name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Dispatched to ${targetEmail}`, { type: 'success' });
        fetchEmailLogs(targetEmail);
      } else {
        setEmailError(data.error || 'Failed to dispatch email');
      }
    } catch {
      setEmailError('Network error while sending email');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  const currentLangLabel = currentLangObj ? currentLangObj.nativeName : 'English';
  const isDark = currentUser.theme === 'dark';

  const blockedUsers = INITIAL_CREATORS.filter((c) => blockedUserIds.includes(c.id));
  const mutedUsers = INITIAL_CREATORS.filter((c) => mutedUserIds.includes(c.id));
  const favouritePosts: SocialPost[] = INITIAL_POSTS.filter((p) =>
    savedPostIds.includes(p.id)
  );

  if (activeSubScreen === 'language') {
    return (
      <LanguageScreen
        onBack={() => setActiveSubScreen(null)}
        theme={isDark ? 'dark' : 'light'}
      />
    );
  }

  return (
    <div
      id="settings-view-container"
      className="w-full min-h-full bg-[#F2F2F7] dark:bg-black text-black dark:text-white pb-14 select-none"
    >
      {/* iOS Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/92 dark:bg-[#1C1C1E]/92 backdrop-blur-2xl pt-safe">
        <div className="max-w-2xl mx-auto h-12 px-2 flex items-center justify-between">
          <button
            id="settings-back-btn"
            type="button"
            onClick={onBack}
            className="min-w-[44px] min-h-[44px] inline-flex items-center gap-0.5 px-2 text-[#007AFF] cursor-pointer ios-press"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
            <span className="text-[17px]">{t('back', 'Back')}</span>
          </button>

          <h1 className="text-[17px] font-semibold tracking-tight">
            {t('settings_title', 'Settings')}
          </h1>

          <button
            id="settings-header-save-btn"
            type="button"
            onClick={handleSaveAll}
            className="min-h-[44px] px-3 text-[17px] font-semibold text-[#007AFF] cursor-pointer ios-press"
          >
            {t('save_button', 'Save')}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Profile Avatar Preview */}
        <div className="flex flex-col items-center gap-2">
          <Avatar
            src={avatar}
            name={name || 'User'}
            size="xl"
            onClick={onOpenEditProfile}
          />
          {onOpenEditProfile && (
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="text-[15px] font-medium text-[#007AFF] cursor-pointer ios-press"
            >
              Change Profile Icon
            </button>
          )}
        </div>

        {/* 1. ACCOUNT */}
        <section className="space-y-1.5" aria-label="Account Settings">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-4">
            Account
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            <label className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[17px] shrink-0">{t('name', 'Name')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 text-right text-[16px] text-[#8E8E93] focus:text-black dark:focus:text-white bg-transparent focus:outline-none"
              />
            </label>

            <label className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[17px] shrink-0">{t('username', 'Username')}</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 text-right text-[16px] text-[#8E8E93] focus:text-black dark:focus:text-white bg-transparent focus:outline-none"
              />
            </label>

            <label className="px-4 py-3 flex items-start justify-between gap-4">
              <span className="text-[17px] shrink-0 pt-0.5">{t('bio', 'Bio')}</span>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="flex-1 text-right text-[15px] text-[#8E8E93] focus:text-black dark:focus:text-white bg-transparent focus:outline-none resize-none"
              />
            </label>

            <button
              id="settings-item-email"
              type="button"
              onClick={() => setActiveSubModal('email')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF]/12 dark:bg-[#007AFF]/18 text-[#007AFF] flex items-center justify-center shrink-0">
                  <Mail className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('settings_email', 'Email & Verification')}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[14px] text-[#8E8E93] truncate max-w-[140px]">
                  {email || 'Add'}
                </span>
                {isEmailVerified && (
                  <CheckCircle2 className="w-4 h-4 text-[#007AFF] shrink-0" />
                )}
                <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
              </div>
            </button>

            {onOpenAuthModal && (
              <button
                id="settings-item-logout"
                type="button"
                onClick={onOpenAuthModal}
                className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#007AFF]/12 dark:bg-[#007AFF]/18 text-[#007AFF] flex items-center justify-center shrink-0">
                    <LogOut className="w-[17px] h-[17px] stroke-[1.9]" />
                  </div>
                  <span className="text-[17px] text-[#007AFF] font-medium">
                    {t('logout', 'Log Out / Switch Account')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </button>
            )}
          </div>
        </section>

        {/* 2. PERSONALIZATION */}
        <section className="space-y-1.5" aria-label="Personalization Settings">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-4">
            Personalization
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            <div className="min-h-[48px] px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white flex items-center justify-center">
                  <Moon className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('dark_mode', 'Dark Appearance')}</span>
              </div>
              <Toggle
                checked={isDark}
                onChange={(val) => onUpdateUser({ theme: val ? 'dark' : 'light' })}
                ariaLabel={t('dark_mode', 'Toggle dark appearance')}
              />
            </div>

            <button
              id="settings-item-reader"
              type="button"
              onClick={() => setActiveSubModal('reader')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF]/12 dark:bg-[#007AFF]/18 text-[#007AFF] flex items-center justify-center shrink-0">
                  <BookOpen className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('reader_preferences', 'Reader Preferences')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] text-[#8E8E93] capitalize">
                  {readerPrefs.bgMode === 'theme' ? 'Auto' : readerPrefs.bgMode}
                </span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </div>
            </button>

            <button
              id="settings-item-language"
              type="button"
              onClick={() => setActiveSubScreen('language')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF]/12 dark:bg-[#007AFF]/18 text-[#007AFF] flex items-center justify-center shrink-0">
                  <Globe className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('settings_language', 'Language')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] text-[#8E8E93]">{currentLangLabel}</span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </div>
            </button>
          </div>
        </section>

        {/* 3. PRIVACY & SECURITY */}
        <section className="space-y-1.5" aria-label="Privacy and Security">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-4">
            Privacy &amp; Security
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            <button
              id="settings-item-privacy"
              type="button"
              onClick={() => setActiveSubModal('privacy')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF]/12 dark:bg-[#007AFF]/18 text-[#007AFF] flex items-center justify-center shrink-0">
                  <Shield className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">Privacy, Messages &amp; Stories</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
            </button>

            <button
              id="settings-item-blocked"
              type="button"
              onClick={() => setActiveSubModal('blocked')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] flex items-center justify-center shrink-0">
                  <UserX className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('settings_blocked', 'Blocked Users')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {blockedUserIds.length > 0 && (
                  <span className="text-[15px] text-[#8E8E93] tabular-nums">
                    {blockedUserIds.length}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </div>
            </button>
          </div>
        </section>

        {/* 4. SOCIAL */}
        <section className="space-y-1.5" aria-label="Social Settings">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-4">
            Social
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            <button
              id="settings-item-mute"
              type="button"
              onClick={() => setActiveSubModal('mute')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white flex items-center justify-center shrink-0">
                  <BellOff className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('settings_mute', 'Notifications & Mute')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
            </button>

            <button
              id="settings-item-favourite"
              type="button"
              onClick={() => setActiveSubModal('favourite')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#007AFF]/12 dark:bg-[#007AFF]/18 text-[#007AFF] flex items-center justify-center shrink-0">
                  <Bookmark className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('settings_favourite', 'Saved Items')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] text-[#8E8E93] tabular-nums">
                  {savedPostIds.length}
                </span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </div>
            </button>
          </div>
        </section>

        {/* 5. APP INFORMATION & ACCOUNT DELETION */}
        <section className="space-y-1.5" aria-label="App Information">
          <p className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wider px-4">
            App Information
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            <button
              id="settings-item-help"
              type="button"
              onClick={() => setActiveSubModal('help')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white flex items-center justify-center shrink-0">
                  <HelpCircle className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('settings_help', 'Help & Feedback')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
            </button>

            <button
              id="settings-item-about"
              type="button"
              onClick={() => setActiveSubModal('about')}
              className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] flex items-center justify-center shrink-0">
                  <Info className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px]">{t('settings_about', 'About enmmoe')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] text-[#8E8E93]">v2.0</span>
                <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
              </div>
            </button>

            <button
              id="settings-item-delete-account"
              type="button"
              onClick={() => setActiveSubModal('delete_account')}
              className="w-full min-h-[48px] px-4 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white flex items-center justify-center shrink-0">
                  <Trash2 className="w-[17px] h-[17px] stroke-[1.9]" />
                </div>
                <span className="text-[17px] font-semibold text-black dark:text-white">
                  {t('settings_delete', 'Delete Account')}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
            </button>
          </div>
        </section>
      </div>

      {/* Email Verification & Messaging Sheet */}
      <BottomSheet
        isOpen={activeSubModal === 'email'}
        onClose={() => {
          setActiveSubModal(null);
          setIsEditingEmail(false);
          setEmailError(null);
        }}
        title="Email & Verification"
      >
        <div className="p-4 space-y-4">
          {emailError && (
            <div className="p-3 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/25 dark:border-white/25 text-black dark:text-white text-[14px] font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{emailError}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#8E8E93] uppercase">
                Linked Email
              </span>
              <span
                className={`text-[13px] font-semibold ${
                  isEmailVerified
                    ? 'text-[#007AFF]'
                    : 'text-[#8E8E93]'
                }`}
              >
                {isEmailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            {isEmailVerified && !isEditingEmail ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[16px] font-medium truncate">{email}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditingEmail(true);
                    setCodeSentSuccess(false);
                  }}
                  className="bg-white dark:bg-[#1C1C1E]"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <TextField
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    loading={isSendingCode}
                    onClick={() => handleSendVerificationCode(emailInput)}
                  >
                    {codeSentSuccess
                      ? resendCooldown > 0
                        ? `${resendCooldown}s`
                        : 'Resend'
                      : 'Send'}
                  </Button>
                </div>

                {codeSentSuccess && (
                  <div className="space-y-2.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    {devPreviewCode && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#007AFF]" />
                          Code: <strong className="tabular-nums">{devPreviewCode}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setVerificationCode(devPreviewCode)}
                          className="text-[#007AFF] font-semibold cursor-pointer"
                        >
                          Fill
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <TextField
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) =>
                          setVerificationCode(e.target.value.replace(/\D/g, ''))
                        }
                        placeholder="6-digit code"
                      />
                      <Button
                        variant="primary"
                        size="md"
                        loading={isVerifyingCode}
                        onClick={handleVerifyCode}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dispatch Message to Email */}
          <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-3">
            <p className="text-[13px] font-semibold text-[#8E8E93] uppercase">
              Send Notification Email
            </p>
            <TextField
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              placeholder="Subject"
            />
            <textarea
              rows={3}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Message body..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] text-[15px] border border-black/[0.06] dark:border-white/[0.08] focus:border-[#007AFF] resize-none outline-none"
            />
            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={isSendingMessage}
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleSendMessageToEmail}
            >
              Send Email
            </Button>

            {emailLogs.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[12px] font-semibold text-[#8E8E93]">Recent Logs</p>
                {emailLogs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] text-[13px]"
                  >
                    <p className="font-semibold truncate">{log.subject}</p>
                    <p className="text-[#8E8E93] text-[12px]">
                      {formatLocalizedTime(log.timestamp, language)} · {log.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Reader Preferences Sheet */}
      <BottomSheet
        isOpen={activeSubModal === 'reader'}
        onClose={() => setActiveSubModal(null)}
        title="Reader Preferences"
      >
        <div className="p-4 space-y-5">
          <div>
            <p className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
              Canvas Background
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'theme', label: 'Auto' },
                  { id: 'white', label: 'White' },
                  { id: 'paper', label: 'Soft Tint' },
                  { id: 'dark', label: 'Dark' },
                ] as const
              ).map((opt) => {
                const active = readerPrefs.bgMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleUpdateReaderPrefs({ ...readerPrefs, bgMode: opt.id })}
                    className={`min-h-[44px] py-2.5 px-2 rounded-xl text-[13px] font-semibold border transition-all cursor-pointer ios-press ${
                      active
                        ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                        : 'border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-black dark:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
              Panel Spacing
            </p>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] gap-1">
              {(
                [
                  { id: 'seamless', label: 'Seamless Scroll' },
                  { id: 'comfort', label: 'Comfortable Gap' },
                ] as const
              ).map((opt) => {
                const active = readerPrefs.panelGap === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      handleUpdateReaderPrefs({ ...readerPrefs, panelGap: opt.id })
                    }
                    className={`py-2 rounded-lg text-[14px] font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#1C1C1E] text-[#007AFF] shadow-xs'
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold">Auto-Hide Controls</p>
              <p className="text-[12px] text-[#8E8E93]">
                Tap the reader canvas to show or hide chrome
              </p>
            </div>
            <Toggle
              checked={readerPrefs.autoHideControls}
              onChange={(val) =>
                handleUpdateReaderPrefs({ ...readerPrefs, autoHideControls: val })
              }
              ariaLabel="Auto hide reader controls"
            />
          </div>
        </div>
      </BottomSheet>

      {/* Privacy Modal */}
      <ProfilePrivacyModal
        isOpen={activeSubModal === 'privacy'}
        currentUser={currentUser}
        onUpdatePrivacy={(settings) => onUpdateUser(settings)}
        onClose={() => setActiveSubModal(null)}
      />

      {/* Mute Sheet (Messages & Push Alerts only — no calls) */}
      <BottomSheet
        isOpen={activeSubModal === 'mute'}
        onClose={() => setActiveSubModal(null)}
        title={t('settings_mute', 'Notifications & Mute')}
      >
        <div className="p-4 space-y-4">
          <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-[16px]">{t('mute_messages', 'Mute Direct Messages')}</span>
              <Toggle
                checked={muteMessages}
                onChange={(v) => {
                  setMuteMessages(v);
                  try {
                    localStorage.setItem('enmmoe_mute_messages', String(v));
                    window.dispatchEvent(new Event('enmmoe:notif-prefs-changed'));
                  } catch {}
                }}
              />
            </div>
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-[16px]">{t('pause_push_alerts', 'Pause Push Alerts')}</span>
              <Toggle
                checked={muteNotifications}
                onChange={(v) => {
                  setMuteNotifications(v);
                  try {
                    localStorage.setItem('enmmoe_mute_notifs', String(v));
                    window.dispatchEvent(new Event('enmmoe:notif-prefs-changed'));
                  } catch {}
                }}
              />
            </div>
          </div>

          {mutedUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-[#8E8E93] uppercase px-1">
                Muted Accounts
              </p>
              {mutedUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={u.avatar} name={u.name} size="sm" />
                    <span className="text-[15px] font-medium">{u.name}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const next = mutedUserIds.filter((id) => id !== u.id);
                      setMutedUserIds(next);
                      onUpdateUser({ mutedUserIds: next });
                      showToast(`Unmuted @${u.username}`);
                    }}
                  >
                    Unmute
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Blocked Users Sheet */}
      <BottomSheet
        isOpen={activeSubModal === 'blocked'}
        onClose={() => setActiveSubModal(null)}
        title="Blocked Users"
      >
        <div className="p-4">
          {blockedUsers.length === 0 ? (
            <EmptyState
              icon={<UserX className="w-6 h-6" />}
              title="No blocked accounts"
              description="Accounts you block will appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {blockedUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatar} name={u.name} size="sm" />
                    <div>
                      <p className="text-[15px] font-semibold">{u.name}</p>
                      <p className="text-[13px] text-[#8E8E93]">@{u.username}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const next = blockedUserIds.filter((id) => id !== u.id);
                      setBlockedUserIds(next);
                      onUpdateUser({ blockedUserIds: next });
                      showToast(`Unblocked @${u.username}`, { type: 'success' });
                    }}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Favourites Sheet */}
      <BottomSheet
        isOpen={activeSubModal === 'favourite'}
        onClose={() => setActiveSubModal(null)}
        title={t('settings_favourite', 'Saved Items')}
      >
        <div className="p-4">
          {favouritePosts.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="w-6 h-6" />}
              title={t('no_saved_yet', 'No saved items')}
              description="Posts and series you bookmark appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {favouritePosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold truncate">{post.authorName}</p>
                    <p className="text-[13px] text-[#8E8E93] line-clamp-1"><EmojiText text={post.content} /></p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const next = savedPostIds.filter((id) => id !== post.id);
                      setSavedPostIds(next);
                      onUpdateUser({ savedPostIds: next });
                      showToast('Removed from saved');
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Help & Feedback Sheet */}
      <BottomSheet
        isOpen={activeSubModal === 'help'}
        onClose={() => setActiveSubModal(null)}
        title="Help & Feedback"
      >
        <div className="p-4 space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-2 text-[14px] text-[#8E8E93]">
            <p className="font-semibold text-black dark:text-white text-[15px]">
              Reading &amp; Community Guide
            </p>
            <p>
              Tap any series card on Home or Search to browse episodes, adjust reader preferences,
              and leave episode comments.
            </p>
          </div>
          <textarea
            rows={4}
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder="Share a suggestion or report an issue with enmmoe..."
            className="w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] outline-none focus:ring-2 focus:ring-[#007AFF]/25 resize-none"
          />
          <Button
            variant="primary"
            size="md"
            fullWidth
            disabled={!feedbackMessage.trim()}
            onClick={() => {
              setFeedbackMessage('');
              setActiveSubModal(null);
              showToast('Thank you for your feedback', { type: 'success' });
            }}
          >
            Submit Feedback
          </Button>
        </div>
      </BottomSheet>

      {/* About enmmoe Sheet */}
      <BottomSheet
        isOpen={activeSubModal === 'about'}
        onClose={() => setActiveSubModal(null)}
        title="About enmmoe"
      >
        <div className="p-4 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#007AFF] text-white mx-auto flex items-center justify-center text-[22px] font-bold tracking-tight">
            e
          </div>
          <div>
            <h3 className="text-[20px] font-bold lowercase">enmmoe</h3>
            <p className="text-[14px] text-[#8E8E93] mt-0.5">
              Version 2.0 · Webtoon, Novel &amp; Community Platform
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] divide-y divide-black/[0.06] dark:divide-white/[0.08] text-left text-[15px]">
            <div className="py-2.5 flex justify-between">
              <span className="text-[#8E8E93]">Interface</span>
              <span className="font-medium">iOS Design System</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-[#8E8E93]">Account</span>
              <span className="font-medium">@{currentUser.username}</span>
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Delete Account Dialog */}
      <Dialog
        isOpen={activeSubModal === 'delete_account'}
        onClose={() => setActiveSubModal(null)}
        title={t('settings_delete', 'Delete Account?')}
        description="This action requests permanent deletion of your account and reading history."
        confirmLabel={t('delete', 'Delete')}
        destructive
        onConfirm={() => {
          showToast('Account deletion requested', { type: 'info' });
          if (onOpenAuthModal) onOpenAuthModal();
          else onBack();
        }}
      />
    </div>
  );
};
