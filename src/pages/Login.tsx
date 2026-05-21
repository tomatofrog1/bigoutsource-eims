import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Eye, EyeOff, Lock, Mail, MapPin, ShieldCheck, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

type AuthMode = 'login' | 'register';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [site, setSite] = useState('HQ');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isRegistering = mode === 'register';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (isRegistering) {
        await register({ email, password, fullName, department, site });
        setMode('login');
        setPassword('');
        return;
      }

      await login(email, password);
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#111827] rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#111827] tracking-tight">System Login</h1>
            <p className="text-[#6B7280] text-sm mt-2 text-center text-balance">
              Authorized BigOutsource personnel only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-[#F3F4F6] rounded-xl">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2.5 rounded-lg text-sm font-black transition-all ${
                mode === 'login' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2.5 rounded-lg text-sm font-black transition-all ${
                mode === 'register' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <>
                <AuthInput
                  icon={User}
                  label="Full Name"
                  type="text"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Juan Dela Cruz"
                  required
                />
                <AuthInput
                  icon={Building2}
                  label="Department"
                  type="text"
                  value={department}
                  onChange={setDepartment}
                  placeholder="IT, HR, Operations"
                  required
                />
                <AuthInput
                  icon={MapPin}
                  label="Site"
                  type="text"
                  value={site}
                  onChange={setSite}
                  placeholder="HQ"
                  required
                />
              </>
            )}

            <AuthInput
              icon={Mail}
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@bigoutsource.com"
              required
            />

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isRegistering ? 8 : 1}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-12 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#111827] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#111827] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#374151] shadow-lg shadow-[#11182720] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isRegistering ? (
                'Submit Account Request'
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[#F3F4F6] text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-bold">
              Secure Access Layer v2.0
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AuthInput({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
        />
      </div>
    </div>
  );
}
