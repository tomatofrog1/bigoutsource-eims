import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Mail, ShieldX } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../public/logo-only-bigoutsource.svg';
import { AuthInput, PasswordInput } from '../components/auth/authFields';

export default function Login() {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    return () => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    };
  }, [isDark]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [authStatusError, setAuthStatusError] = useState<{ type: 'pending' | 'disabled'; message: string } | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) return;

    setIsLoading(true);

    try {
      await login(email, password);
      setIsExiting(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('pending')) {
        setAuthStatusError({ type: 'pending', message: msg });
      } else if (msg.toLowerCase().includes('disabled')) {
        setAuthStatusError({ type: 'disabled', message: msg });
      }
    } finally {
      // Only set loading to false if we are not navigating away to avoid state update warning
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Natural ambient background lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-400/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-300/10 blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={isExiting ? { opacity: 0, y: -50, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-8 md:p-10 overflow-hidden relative">
          {/* Subtle top accent inside card */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />

          <div className="flex flex-col items-center mb-8 relative z-10">
            <img src={logoUrl} alt="Big Outsource" className="w-20 h-auto mb-6 relative z-10 object-contain" />
            <h1 className="text-[32px] font-black text-[#111827] tracking-tight text-center">
              Welcome Back
            </h1>
            <p className="text-[#6B7280] text-[15px] mt-3 text-center text-balance leading-relaxed">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 w-full relative" noValidate>
            <AuthInput
              icon={Mail}
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@bigoutsource.com"
              required
            />
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              showPassword={showPassword}
              onToggleVisibility={() => setShowPassword(!showPassword)}
            />
            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="w-full bg-[#111827] text-white py-3.5 rounded-2xl font-bold text-[15px] shadow-lg shadow-[#111827]/20 transition-all hover:bg-[#1F2937] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[#F3F4F6] text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-bold">
              © 2026 BIG OUTSOURCE
            </p>
            <p className="mt-2 text-[10px] text-[#9CA3AF]">
              Secure access for authorized users
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {authStatusError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/60 px-4 py-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-md rounded-[28px] bg-white overflow-hidden shadow-2xl relative"
            >
              {/* Subtle top accent gradient */}
              <div className={`h-40 w-full absolute top-0 left-0 ${authStatusError.type === 'pending' ? 'bg-gradient-to-b from-amber-500/10 to-transparent' : 'bg-gradient-to-b from-red-500/10 to-transparent'}`} />

              <div className="px-8 pt-12 pb-10 relative z-10 flex flex-col items-center text-center">
                <div className={`flex h-24 w-24 items-center justify-center rounded-full mb-6 shadow-xl ${
                  authStatusError.type === 'pending'
                    ? 'bg-gradient-to-tr from-amber-400 to-amber-200 shadow-amber-500/20'
                    : 'bg-gradient-to-tr from-red-500 to-red-300 shadow-red-500/20'
                }`}>
                  {authStatusError.type === 'pending' ? (
                    <Clock className="h-10 w-10 text-amber-900" />
                  ) : (
                    <ShieldX className="h-10 w-10 text-white" />
                  )}
                </div>

                <h2 className="text-[28px] font-black text-[#111827] mb-4 tracking-tight">
                  {authStatusError.type === 'pending' ? 'Pending Approval' : 'Access Revoked'}
                </h2>

                <p className="text-[15px] text-[#4B5563] leading-relaxed mb-10 max-w-[340px]">
                  {authStatusError.type === 'pending'
                    ? 'Your account has been created successfully, but requires administrator approval before you can log in.'
                    : 'Your account access has been revoked. If you believe this is a mistake, please contact your IT administrator.'}
                </p>

                <button
                  type="button"
                  onClick={() => setAuthStatusError(null)}
                  className={`w-full rounded-2xl py-4 text-[15px] font-bold text-white transition-all shadow-lg active:scale-[0.98] ${
                    authStatusError.type === 'pending'
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                      : 'bg-[#DC2626] hover:bg-[#B91C1C] shadow-red-600/25'
                  }`}
                >
                  Return to Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
