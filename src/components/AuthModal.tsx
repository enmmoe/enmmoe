import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Smartphone,
  User as UserIcon,
} from 'lucide-react';
import { User, Gender } from '../types';
import { ENMMOE_AVATARS } from '../data/enmmoeAvatars';
import { Avatar, BottomSheet, Button, TextField, useToast } from './ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'signup' | 'login';
}

const COUNTRY_CODES = [
  { code: '+1', name: 'US / CA' },
  { code: '+44', name: 'UK' },
  { code: '+49', name: 'DE' },
  { code: '+33', name: 'FR' },
  { code: '+81', name: 'JP' },
  { code: '+82', name: 'KR' },
  { code: '+91', name: 'IN' },
  { code: '+251', name: 'ET' },
];

const AVATAR_PRESETS = ENMMOE_AVATARS.map((a) => a.src);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signup',
}) => {
  const { showToast } = useToast();
  const [authMode, setAuthMode] = useState<'signup' | 'login'>(initialMode);
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [birthYear, setBirthYear] = useState('2000');
  const [birthMonth, setBirthMonth] = useState('06');
  const [birthDay, setBirthDay] = useState('15');
  const [calculatedAge, setCalculatedAge] = useState(24);
  const [ageValid, setAgeValid] = useState(true);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<Gender>('Girl');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0] || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    const birthDate = new Date(
      parseInt(birthYear, 10),
      parseInt(birthMonth, 10) - 1,
      parseInt(birthDay, 10)
    );
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const mDiff = today.getMonth() - birthDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setCalculatedAge(age);
    setAgeValid(age >= 18);
  }, [birthYear, birthMonth, birthDay]);

  const handleSendCode = () => {
    setErrorMsg(null);
    if (signupMethod === 'email') {
      if (!email || !email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
    } else if (!phoneNumber || phoneNumber.length < 6) {
      setErrorMsg('Please enter a valid phone number.');
      return;
    }
    setIsCodeSent(true);
    setResendTimer(60);
    setVerificationCode('749215');
  };

  const handleStep1Next = () => {
    setErrorMsg(null);
    if (!isCodeSent) {
      handleSendCode();
      return;
    }
    if (verificationCode.length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    setErrorMsg(null);
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!ageValid) {
      setErrorMsg('You must be at least 18 years old.');
      return;
    }
    setStep(3);
  };

  const handleFinalSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }
    const cleanUsername =
      username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '') ||
      fullName.toLowerCase().replace(/\s+/g, '_');

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: fullName.trim(),
      surname: '',
      username: cleanUsername,
      age: calculatedAge,
      gender,
      avatar: selectedAvatar,
      bio: 'Creator & story reader.',
      location: 'San Francisco, CA',
      joinDate: 'Just now',
      isVerified: false,
      isPremium: false,
      followersCount: 0,
      followingCount: 2,
      postsCount: 0,
      likesCount: 0,
      followingIds: ['creator-1', 'creator-2'],
      savedPostIds: [],
      hearts: 250,
      moneyPoints: 500,
      walletBalance: 0,
      level: 1,
      xp: 0,
      maxXp: 500,
      kissPoints: 0,
      emotionPoints: 0,
      admire: 0,
      league: 'Bronze',
      rank: 450,
      referralCode: `ENM${Math.floor(100000 + Math.random() * 900000)}`,
      referralCount: 0,
      lastClaimTimestamp: Date.now(),
      isChannelJoined: true,
      inventory: [],
      relationships: [],
      guests: [],
      theme: 'light',
    };

    showToast(`Welcome, ${newUser.name}`, { type: 'success' });
    onSuccess(newUser);
    onClose();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter both your username and password.');
      return;
    }

    const loggedUser: User = {
      id: 'user-me',
      name: loginIdentifier.includes('@') ? loginIdentifier.split('@')[0] : loginIdentifier,
      username: loginIdentifier.replace('@', '').toLowerCase(),
      avatar: AVATAR_PRESETS[0] || '',
      gender: 'Girl',
      age: 22,
      bio: 'Music enthusiast, story reader, and creator.',
      location: 'Los Angeles, CA',
      joinDate: '2024',
      isVerified: true,
      isPremium: false,
      followersCount: 18400,
      followingCount: 340,
      postsCount: 24,
      likesCount: 94200,
      followingIds: ['creator-1', 'creator-2', 'creator-3'],
      savedPostIds: [],
      hearts: 480,
      moneyPoints: 1250,
      walletBalance: 145.5,
      level: 4,
      xp: 750,
      maxXp: 1000,
      kissPoints: 180,
      emotionPoints: 95,
      admire: 42,
      league: 'Gold',
      rank: 28,
      referralCode: 'ENMVIP888',
      referralCount: 12,
      lastClaimTimestamp: Date.now(),
      isChannelJoined: true,
      inventory: [],
      relationships: [],
      guests: [],
      theme: 'light',
    };

    showToast('Signed in', { type: 'success' });
    onSuccess(loggedUser);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={authMode === 'signup' ? 'Create Account' : 'Sign In'}
    >
      <div className="px-4 py-3 space-y-4">
        <div className="grid grid-cols-2 p-1 rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-[9px] text-[14px] font-medium cursor-pointer transition-all ${
              authMode === 'signup'
                ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs font-semibold'
                : 'text-[#8E8E93]'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-[9px] text-[14px] font-medium cursor-pointer transition-all ${
              authMode === 'login'
                ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-xs font-semibold'
                : 'text-[#8E8E93]'
            }`}
          >
            Sign In
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/25 dark:border-white/25 text-black dark:text-white text-[13px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {authMode === 'signup' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#007AFF] uppercase tracking-wider">
                Step {step} of 3
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-6 h-1.5 rounded-full ${
                      step >= s ? 'bg-[#007AFF]' : 'bg-black/[0.08] dark:bg-white/[0.1]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod('email');
                      setIsCodeSent(false);
                    }}
                    className={`h-11 rounded-2xl border flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer ${
                      signupMethod === 'email'
                        ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                        : 'border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod('phone');
                      setIsCodeSent(false);
                    }}
                    className={`h-11 rounded-2xl border flex items-center justify-center gap-2 text-[14px] font-medium cursor-pointer ${
                      signupMethod === 'phone'
                        ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                        : 'border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Phone</span>
                  </button>
                </div>

                {signupMethod === 'email' ? (
                  <div className="space-y-2">
                    <TextField
                      label="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      type="email"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={resendTimer > 0}
                      onClick={handleSendCode}
                    >
                      {resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : isCodeSent
                        ? 'Resend Code'
                        : 'Send Code'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={selectedCountryCode}
                        onChange={(e) => setSelectedCountryCode(e.target.value)}
                        className="h-11 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3 text-[15px] outline-none"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} {c.code}
                          </option>
                        ))}
                      </select>
                      <div className="flex-1 flex items-center h-11 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3.5 gap-2">
                        <Phone className="w-4 h-4 text-[#8E8E93]" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="555 123 4567"
                          className="flex-1 bg-transparent text-[15px] outline-none"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={resendTimer > 0}
                      onClick={handleSendCode}
                    >
                      {resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : isCodeSent
                        ? 'Resend Code'
                        : 'Send Code'}
                    </Button>
                  </div>
                )}

                {isCodeSent && (
                  <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-2">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium">Verification Code</span>
                      <span className="text-[#007AFF] dark:text-[#0A84FF] font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    </div>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      maxLength={6}
                      className="w-full h-11 rounded-xl bg-white dark:bg-[#1C1C1E] text-center text-[18px] font-bold tracking-[0.28em] outline-none"
                    />
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleStep1Next}
                >
                  {isCodeSent ? 'Continue' : 'Send Code & Continue'}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">
                    Create Password
                  </label>
                  <div className="flex items-center h-11 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3.5 gap-2">
                    <Lock className="w-4 h-4 text-[#8E8E93]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="flex-1 bg-transparent text-[15px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#8E8E93] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[13px]">
                    <span className="font-medium text-[#8E8E93]">Date of Birth (18+)</span>
                    <span className={ageValid ? 'text-[#007AFF] dark:text-[#0A84FF]' : 'text-black dark:text-white font-semibold'}>
                      Age: {calculatedAge}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      className="h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3 text-[14px] outline-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(
                        (m) => (
                          <option key={m} value={m}>
                            Month {m}
                          </option>
                        )
                      )}
                    </select>
                    <select
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      className="h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3 text-[14px] outline-none"
                    >
                      {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(
                        (d) => (
                          <option key={d} value={d}>
                            Day {d}
                          </option>
                        )
                      )}
                    </select>
                    <select
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3 text-[14px] outline-none"
                    >
                      {Array.from({ length: 70 }, (_, i) => String(2008 - i)).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="md" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={!ageValid}
                    className="flex-1"
                    onClick={handleStep2Next}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleFinalSignup} className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium text-[#8E8E93] mb-2">Choose Avatar</p>
                  <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                    {AVATAR_PRESETS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`rounded-full p-0.5 cursor-pointer transition-transform ${
                          selectedAvatar === av ? 'ring-2 ring-[#007AFF] scale-105' : 'opacity-70'
                        }`}
                      >
                        <Avatar src={av} name={`Preset ${idx + 1}`} size="md" />
                      </button>
                    ))}
                  </div>
                </div>

                <TextField
                  label="Display Name"
                  value={fullName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFullName(v);
                    if (!username) setUsername(v.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  placeholder="Sophia Turner"
                />

                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                  }
                  placeholder="sophiaturner"
                />

                <div className="grid grid-cols-3 gap-2">
                  {(['Girl', 'Boy', 'Non-binary'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2.5 rounded-xl text-[14px] font-medium cursor-pointer ${
                        gender === g
                          ? 'bg-[#007AFF] text-white font-semibold'
                          : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="md" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" variant="primary" size="md" className="flex-1">
                    Finish Setup
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">
                Email or Username
              </label>
              <div className="flex items-center h-11 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3.5 gap-2">
                <UserIcon className="w-4 h-4 text-[#8E8E93]" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Username or email"
                  className="flex-1 bg-transparent text-[15px] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">
                Password
              </label>
              <div className="flex items-center h-11 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] px-3.5 gap-2">
                <Lock className="w-4 h-4 text-[#8E8E93]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="flex-1 bg-transparent text-[15px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#8E8E93] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full">
              Sign In
            </Button>
          </form>
        )}
      </div>
    </BottomSheet>
  );
};
