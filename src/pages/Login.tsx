import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ShieldCheck, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, loginWithGoogle, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (error) {
      // toast handled in context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: Parameters<typeof loginAsDemo>[0]) => {
    loginAsDemo(role);
    navigate('/', { replace: true });
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
              Authorized BigOutsource personnel only. Enter your credentials to access the EIMS database.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@bigoutsource.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#111827] transition-colors"
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
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#F3F4F6]"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                <span className="bg-white px-3 text-[#9CA3AF]">Mock / Demo Roles Bypass</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => handleDemoLogin('super_admin')}
                className="py-2.5 px-3 bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#111827] text-left rounded-xl transition-all cursor-pointer"
              >
                <p className="text-[10px] font-black uppercase text-[#111827]">Super Admin</p>
                <p className="text-[9px] text-[#6B7280]">Full Access & Users</p>
              </button>
              <button 
                type="button" 
                onClick={() => handleDemoLogin('hr_admin')}
                className="py-2.5 px-3 bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#111827] text-left rounded-xl transition-all cursor-pointer"
              >
                <p className="text-[10px] font-black uppercase text-[#111827]">HR Admin</p>
                <p className="text-[9px] text-[#6B7280]">Manage Employees</p>
              </button>
              <button 
                type="button" 
                onClick={() => handleDemoLogin('it_admin')}
                className="py-2.5 px-3 bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#111827] text-left rounded-xl transition-all cursor-pointer"
              >
                <p className="text-[10px] font-black uppercase text-[#111827]">IT Admin</p>
                <p className="text-[9px] text-[#6B7280]">Manage Assets</p>
              </button>
              <button 
                type="button" 
                onClick={() => handleDemoLogin('viewer')}
                className="py-2.5 px-3 bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#111827] text-left rounded-xl transition-all cursor-pointer"
              >
                <p className="text-[10px] font-black uppercase text-[#111827]">Auditor/Viewer</p>
                <p className="text-[9px] text-[#6B7280]">Read Only</p>
              </button>
            </div>
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
