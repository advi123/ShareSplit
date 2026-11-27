import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Home, Key, Eye, EyeOff, LogIn, UserPlus, AlertCircle, Moon, Sun, ArrowLeft, KeyRound, Send, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AuthView: React.FC = () => {
  const { login, register, sendResetOTP, validateResetOTP, verifyResetOTP, settings, toggleTheme } = useApp();

  const [tab, setTab] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [groupChoice, setGroupChoice] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Password recovery 3-stage states: 'email' -> 'otp' -> 'password'
  const [recoveryStage, setRecoveryStage] = useState<'email' | 'otp' | 'password'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [validatingOtp, setValidatingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const isDark = settings.theme === 'dark';

  // 60-second cooldown timer for resending OTP
  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const resetToSignIn = () => {
    setTab('login');
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setRecoveryStage('email');
    setOtpCode('');
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setError(null);
    setSendingOtp(true);
    try {
      await sendResetOTP(email.trim());
      setRecoveryStage('otp');
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code from your Gmail.');
      return;
    }
    if (otpCode.trim().length < 4) {
      setError('Please enter a valid 6-digit code.');
      return;
    }
    setError(null);
    setValidatingOtp(true);
    try {
      await validateResetOTP(email.trim(), otpCode.trim());
      setRecoveryStage('password');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please check your Gmail or request a new code.');
    } finally {
      setValidatingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'login') {
      setLoading(true);
      try {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email.trim(), password);
      } catch (err: any) {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    } else if (tab === 'register') {
      setLoading(true);
      try {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (!email.trim()) throw new Error('Please enter a valid email.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        if (groupChoice === 'create' && !groupName.trim()) {
          throw new Error('Please provide a name for your group/flat.');
        }
        if (groupChoice === 'join' && !inviteCode.trim()) {
          throw new Error('Please enter the 6-character invite code from your roommates.');
        }

        await register(
          email.trim(),
          password,
          name.trim(),
          groupChoice === 'create' ? groupName.trim() : undefined,
          groupChoice === 'join' ? inviteCode.trim().toUpperCase() : undefined
        );
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else if (tab === 'forgot-password') {
      if (recoveryStage === 'email') {
        await handleSendOtp();
      } else if (recoveryStage === 'otp') {
        await handleVerifyOtp();
      } else if (recoveryStage === 'password') {
        setLoading(true);
        try {
          if (!email.trim()) throw new Error('Email address is missing.');
          if (!otpCode.trim()) throw new Error('Verification code is missing.');
          if (!password) throw new Error('Please enter a new password.');
          if (password.length < 6) throw new Error('New password must be at least 6 characters.');
          if (password !== confirmPassword) throw new Error('Passwords do not match. Please re-enter.');

          await verifyResetOTP(email.trim(), otpCode.trim(), password);
        } catch (err: any) {
          setError(err.message || 'Failed to update password.');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-150">
      {/* Background glowing ambient effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto relative z-10">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon.png"
            alt="ShareSplit Logo"
            className="w-9 h-9 rounded-xl shadow-md object-cover ring-1 ring-slate-900/10 dark:ring-white/10"
          />
          <img
            src="/logo-text-light.png"
            alt="ShareSplit"
            className="h-5 w-auto object-contain dark:hidden"
          />
          <img
            src="/logo-text-dark.png"
            alt="ShareSplit"
            className="h-5 w-auto object-contain hidden dark:block"
          />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs cursor-pointer"
          title={`Switch to ${isDark ? 'light' : 'dark'} mode (instant)`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-md w-full mx-auto my-auto relative z-10 pt-6 pb-6">
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {tab === 'login'
                ? 'Sign In to Your Flat'
                : tab === 'register'
                ? 'Create Your Flat & Account'
                : recoveryStage === 'email'
                ? 'Reset Your Password'
                : recoveryStage === 'otp'
                ? 'Verify 6-Digit Code'
                : 'Create New Password'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tab === 'login'
                ? 'Enter your email & password to access your private expenses'
                : tab === 'register'
                ? 'Set up your roommate group or join using your flat invite code'
                : recoveryStage === 'email'
                ? 'Enter your registered Gmail to receive a 6-digit verification code'
                : recoveryStage === 'otp'
                ? `Enter the 6-digit code sent to ${email}`
                : 'Code verified! Set your new password below'}
            </p>
          </div>

          {/* Back Navigation Bar (No Step numbers) */}
          {tab === 'forgot-password' ? (
            <div className="flex items-center p-1.5 bg-slate-100 dark:bg-slate-950/90 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={resetToSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-950/90 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError(null);
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  tab === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Advi"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email field (Only on login, register, or Stage 1 of forgot password) */}
            {tab !== 'forgot-password' ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>
            ) : recoveryStage === 'email' ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Registered Gmail Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  We will send a 6-digit verification code to your Gmail inbox.
                </p>
              </div>
            ) : recoveryStage === 'otp' ? (
              /* Stage 2: ONLY 6-Digit OTP Field */
              <div className="space-y-3">
                {/* Email Chip */}
                <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryStage('email');
                      setError(null);
                    }}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Real Gmail Confirmation Notice */}
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold">Check your Gmail Inbox!</div>
                    <div className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                      We sent a verification code to <strong>{email}</strong>. Enter the 6-digit code below to unlock password reset.
                    </div>
                  </div>
                </div>

                {/* 6-Digit OTP Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      6-Digit Code (from Gmail)
                    </label>
                    {resendCountdown > 0 ? (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Resend in {resendCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={sendingOtp}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {sendingOtp ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-center text-lg font-mono font-bold tracking-[0.4em] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>
            ) : (
              /* Stage 3: ONLY shown after code is validated */
              <div className="space-y-4">
                {/* Verified success banner */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Code verified for <strong>{email}</strong>. Now set your new password.</span>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Password input for Login & Register */}
            {tab !== 'forgot-password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Password
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot-password');
                        setError(null);
                        setPassword('');
                        setConfirmPassword('');
                        setRecoveryStage('email');
                        setOtpCode('');
                      }}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline cursor-pointer transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {tab === 'register' && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Flat / Group Membership
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGroupChoice('create')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      groupChoice === 'create'
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20 text-slate-900 dark:text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Home className={`w-4 h-4 mt-0.5 ${groupChoice === 'create' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">New Flat</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Start fresh group</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupChoice('join')}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      groupChoice === 'join'
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20 text-slate-900 dark:text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Key className={`w-4 h-4 mt-0.5 ${groupChoice === 'join' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Join Flat</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Have invite code</div>
                    </div>
                  </button>
                </div>

                {groupChoice === 'create' ? (
                  <div>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Flat 304, Green Glen Apartment"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter Roommates' Code e.g. FLAT-8421"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 uppercase"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons based on Tab & Recovery Stage */}
            {tab === 'forgot-password' && recoveryStage === 'email' ? (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={sendingOtp || !email.trim()}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {sendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Verification Code to Gmail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Verification Code to Gmail</span>
                  </>
                )}
              </button>
            ) : tab === 'forgot-password' && recoveryStage === 'otp' ? (
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={validatingOtp || !otpCode.trim()}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {validatingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code & Continue</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {tab === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{loading ? 'Authenticating...' : 'Sign In to Your Flat'}</span>
                  </>
                ) : tab === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{loading ? 'Creating Flat & Account...' : 'Create Account & Enter'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{loading ? 'Updating Password...' : 'Save New Password & Sign In'}</span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-[11px] text-slate-400 dark:text-slate-600 relative z-10">
        ShareSplit © 2026 • Minimum Necessary Debt Settlement System
      </div>
    </div>
  );
};
