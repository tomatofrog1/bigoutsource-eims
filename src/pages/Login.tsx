import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Building2, Check, CheckCircle2, ChevronRight, Circle, Clock, Eye, EyeOff, Lock, Mail, MapPin, ShieldCheck, ShieldX, User, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { AlertCircle, Building2, Check, CheckCircle2, ChevronRight, Circle, Eye, EyeOff, Lock, Mail, MapPin, ShieldCheck, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import logoUrl from '../public/logo-only-bigoutsource.svg';

type AuthMode = 'login' | 'register';
type RegistrationStep = 0 | 1 | 2;
type RegistrationErrors = Partial<Record<'fullName' | 'department' | 'site' | 'email' | 'password' | 'confirmPassword', string>>;

const REGISTRATION_STEPS = [
  { title: 'User Information', fields: ['fullName', 'email'] },
  { title: 'Work Details', fields: ['department', 'site'] },
  { title: 'Security', fields: ['password', 'confirmPassword'] },
] as const;

const SITE_OPTIONS = ['San Pablo City (HQ)', 'Candelaria', 'WFH', 'Hybrid'];

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRegistrationErrors({
  email,
  password,
  confirmPassword,
  fullName,
  department,
  site,
}: {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  department: string;
  site: string;
}): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (fullName.trim().length < 2) errors.fullName = 'Full name must be at least 2 characters.';
  if (!department.trim()) errors.department = 'Select a department.';
  if (!site.trim()) errors.site = 'Select a site.';
  if (!emailPattern.test(email.trim())) errors.email = 'Enter a valid email address.';

  const missingPasswordRules = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label.toLowerCase());
  if (missingPasswordRules.length) {
    errors.password = `Password must include ${missingPasswordRules.join(', ')}.`;
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

function getFirstRegistrationError(errors: RegistrationErrors) {
  return errors.fullName || errors.department || errors.site || errors.email || errors.password || errors.confirmPassword || '';
}

function getStepHasErrors(errors: RegistrationErrors, step: RegistrationStep) {
  return REGISTRATION_STEPS[step].fields.some((field) => Boolean(errors[field]));
}

function getFirstInvalidStep(errors: RegistrationErrors): RegistrationStep {
  const invalidIndex = REGISTRATION_STEPS.findIndex((_, index) => getStepHasErrors(errors, index as RegistrationStep));
  return (invalidIndex === -1 ? 2 : invalidIndex) as RegistrationStep;
}

export default function Login() {
  const { login, register } = useAuth();
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
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentOptionsError, setDepartmentOptionsError] = useState('');
  const [site, setSite] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedRegistration, setSubmittedRegistration] = useState(false);
  const [modalError, setModalError] = useState('');
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<RegistrationStep>(0);
  const [isExiting, setIsExiting] = useState(false);
  const [authStatusError, setAuthStatusError] = useState<{ type: 'pending' | 'disabled', message: string } | null>(null);

  const isRegistering = mode === 'register';
  useEffect(() => {
    if (!isRegistering) return;

    let isMounted = true;

    async function loadDepartmentOptions() {
      setIsLoadingDepartments(true);
      setDepartmentOptionsError('');

      try {
        const data = await authService.internalDepartments();

        if (!isMounted) return;

        const options = Array.from(
          new Set(
            (Array.isArray(data) ? data : [])
              .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
              .map((name) => name.trim())
          )
        ).sort((first, second) => first.localeCompare(second));

        setDepartmentOptions(options);
        setDepartmentOptionsError('');
      } catch (error) {
        if (!isMounted) return;
        setDepartmentOptions([]);
        setDepartmentOptionsError(error instanceof Error ? error.message : 'Unable to load departments.');
      } finally {
        if (isMounted) setIsLoadingDepartments(false);
      }
    }

    loadDepartmentOptions();

    return () => {
      isMounted = false;
    };
  }, [isRegistering]);

  const registrationErrors = useMemo(
    () => getRegistrationErrors({ email, password, confirmPassword, fullName, department, site }),
    [confirmPassword, department, email, fullName, password, site]
  );
  const currentStepHasErrors =
    getStepHasErrors(registrationErrors, registrationStep) ||
    (registrationStep === 1 && (isLoadingDepartments || Boolean(departmentOptionsError)));
  const firstInvalidStep = getFirstInvalidStep(registrationErrors);
  const passwordStrengthScore = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const passwordStrength = passwordStrengthScore <= 2 ? 'Weak' : passwordStrengthScore <= 4 ? 'Fair' : 'Strong';
  const passwordStrengthColor =
    passwordStrengthScore <= 2 ? 'bg-[#EF4444]' : passwordStrengthScore <= 4 ? 'bg-[#F59E0B]' : 'bg-[#10B981]';
  const canSubmit = isRegistering
    ? Object.keys(registrationErrors).length === 0
    : email.trim().length > 0 && password.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isRegistering && registrationStep < 2) {
      handleNextStep();
      return;
    }

    if (isRegistering && Object.keys(registrationErrors).length > 0) {
      setSubmittedRegistration(true);
      setModalError(getFirstRegistrationError(registrationErrors));
      return;
    }

    if (!canSubmit) {
      setModalError('Complete all required fields before submitting.');
      return;
    }

    setModalError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        await register({ email, password, fullName, department, site });
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setSubmittedRegistration(false);
        return;
      }

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

  const handleNextStep = () => {
    if (currentStepHasErrors) {
      setSubmittedRegistration(true);
      setModalError(getFirstRegistrationError(registrationErrors));
      return;
    }

    const nextStep = Math.min(registrationStep + 1, 2) as RegistrationStep;
    setRegistrationStep(nextStep);
    setMaxUnlockedStep((current) => Math.max(current, nextStep) as RegistrationStep);
    setModalError('');
  };

  const handleStepNavigation = (step: RegistrationStep) => {
    const canNavigate = step <= maxUnlockedStep;
    if (!canNavigate) return;
    setRegistrationStep(step);
    setModalError('');
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
        <motion.div
          layout
          transition={{
            layout: { type: 'spring', stiffness: 350, damping: 35 }
          }}
          className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-8 md:p-10 overflow-hidden relative"
        >
          {/* Subtle top accent inside card */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />

          <motion.div layout className="flex flex-col items-center mb-8 relative z-10">
            <img src={logoUrl} alt="Big Outsource" className="w-20 h-auto mb-6 relative z-10 object-contain" />
            <h1 className="text-[32px] font-black text-[#111827] tracking-tight text-center w-full min-h-[36px] flex items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mode}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="block"
                >
                  {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
                </motion.span>
              </AnimatePresence>
            </h1>
            <p className="text-[#6B7280] text-[15px] mt-3 text-center text-balance w-full min-h-[44px] flex items-center justify-center leading-relaxed">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mode}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="block"
                >
                  {mode === 'login'
                    ? 'Enter your credentials to access your dashboard.'
                    : 'Fill in your details to request system access.'}
                </motion.span>
              </AnimatePresence>
            </p>
          </motion.div>

          <motion.div layout className="grid grid-cols-2 gap-2 p-1 mb-6 bg-[#F3F4F6] rounded-xl relative z-0">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setModalError('');
                setRegistrationStep(0);
              }}
              className="relative py-2.5 rounded-lg text-sm font-black transition-colors focus:outline-none w-full"
            >
              {mode === 'login' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 block transition-colors duration-200 ${mode === 'login' ? 'text-[#111827]' : 'text-[#6B7280] hover:text-[#111827]'}`}>
                Log In
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setModalError('');
              }}
              className="relative py-2.5 rounded-lg text-sm font-black transition-colors focus:outline-none w-full"
            >
              {mode === 'register' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 block transition-colors duration-200 ${mode === 'register' ? 'text-[#111827]' : 'text-[#6B7280] hover:text-[#111827]'}`}>
                Register
              </span>
            </button>
          </motion.div>

          <motion.form layout onSubmit={handleSubmit} className="space-y-5 w-full relative" noValidate>
            <AnimatePresence mode="popLayout" initial={false}>
              {isRegistering ? (
                <motion.div
                  key="register-container"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-5 w-full"
                >
                  <RegistrationProgress
                    currentStep={registrationStep}
                    maxUnlockedStep={maxUnlockedStep}
                    firstInvalidStep={firstInvalidStep}
                    onStepClick={handleStepNavigation}
                  />

                  <AnimatePresence mode="wait" initial={false}>
                    {registrationStep === 0 && (
                      <motion.div
                        key="step-0"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        <AuthInput
                          icon={User}
                          label="Full Name"
                          type="text"
                          value={fullName}
                          onChange={setFullName}
                          placeholder="e.g. Juan Dela Cruz"
                          error={registrationErrors.fullName}
                          required
                        />
                        <AuthInput
                          icon={Mail}
                          label="Email Address"
                          type="email"
                          value={email}
                          onChange={setEmail}
                          placeholder="name@bigoutsource.com"
                          error={registrationErrors.email}
                          required
                        />
                      </motion.div>
                    )}

                    {registrationStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        <SelectInput
                          icon={Building2}
                          label="Department"
                          value={department}
                          onChange={setDepartment}
                          placeholder={isLoadingDepartments ? 'Loading departments...' : 'Select department'}
                          options={departmentOptions}
                          disabled={isLoadingDepartments || Boolean(departmentOptionsError)}
                          error={departmentOptionsError || registrationErrors.department}
                          required
                        />
                        <SelectInput
                          icon={MapPin}
                          label="Site"
                          value={site}
                          onChange={setSite}
                          placeholder="Select site"
                          options={SITE_OPTIONS}
                          error={registrationErrors.site}
                          required
                        />
                      </motion.div>
                    )}

                    {registrationStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        <PasswordInput
                          label="Password"
                          value={password}
                          onChange={setPassword}
                          showPassword={showPassword}
                          onToggleVisibility={() => setShowPassword(!showPassword)}
                          minLength={8}
                          error={registrationErrors.password}
                        />
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5" aria-label={`Password strength: ${passwordStrength}`}>
                            {PASSWORD_RULES.map((rule) => (
                              <div
                                key={rule.label}
                                className={`h-1.5 flex-1 rounded-full ${rule.test(password) ? passwordStrengthColor : 'bg-[#E5E7EB]'
                                  }`}
                              />
                            ))}
                            <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
                              {passwordStrength}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1 text-[11px] text-[#6B7280]">
                            {PASSWORD_RULES.map((rule) => {
                              const passed = rule.test(password);
                              return (
                                <p key={rule.label} className={passed ? 'text-[#047857]' : 'text-[#6B7280]'}>
                                  {passed ? 'OK' : '-'} {rule.label}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                        <PasswordInput
                          label="Confirm Password"
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          showPassword={showConfirmPassword}
                          onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
                          minLength={8}
                          placeholder="Re-enter password"
                          error={registrationErrors.confirmPassword}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegistrationStep((current) => Math.max(current - 1, 0) as RegistrationStep)}
                      disabled={registrationStep === 0 || isLoading}
                      className="rounded-xl bg-[#F3F4F6] py-3 text-sm font-bold text-[#374151] transition-all hover:bg-[#E5E7EB] disabled:opacity-50"
                    >
                      Back
                    </button>
                    {registrationStep < 2 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={currentStepHasErrors || isLoading}
                        className="rounded-2xl bg-[#111827] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#111827]/20 transition-all hover:bg-[#1F2937] active:scale-[0.98] disabled:opacity-50"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLoading || !canSubmit}
                        className="rounded-2xl bg-[#111827] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#111827]/20 transition-all hover:bg-[#1F2937] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Submit Request'
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="login-container"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-5 w-full"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          <motion.div layout className="mt-8 pt-8 border-t border-[#F3F4F6] text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-bold">
              © 2026 BIG OUTSOURCE
            </p>
            <p className="mt-2 text-[10px] text-[#9CA3AF]">
              Secure access for authorized users
            </p>
          </motion.div>
        </motion.div>
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
        {modalError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF2F2]">
                    <AlertCircle className="h-5 w-5 text-[#DC2626]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#111827]">Registration needs attention</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">{modalError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalError('')}
                  className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
                  aria-label="Close error modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setModalError('')}
                className="w-full rounded-xl bg-[#111827] py-3 text-sm font-bold text-white transition-all hover:bg-[#374151]"
              >
                Review fields
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  error,
  required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] peer-focus:text-[#111827] transition-colors pointer-events-none" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="peer w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none placeholder:text-gray-400 shadow-sm shadow-gray-900/5"
        />
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs font-semibold text-[#DC2626] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  options,
  error,
  required,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#111827] transition-colors z-10 pointer-events-none" />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-gray-50 py-3.5 pl-11 pr-4 text-left text-[15px] outline-none transition-all shadow-sm shadow-gray-900/5 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-[#DC2626] ring-4 ring-red-500/10 bg-red-50' : 'border-gray-200'
            }`}
        >
          <span className={`truncate ${!value ? 'text-gray-400' : 'text-[#111827]'}`}>
            {value || placeholder}
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform ${isOpen ? 'rotate-90' : ''
              }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl shadow-[#11182714]"
              >
                <div className="max-h-64 overflow-y-auto">
                  {options.length > 0 ? (
                    options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          onChange(option);
                          setIsOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-semibold text-[#4B5563] transition-colors hover:bg-[#F3F4F6] focus:bg-[#F3F4F6] outline-none"
                      >
                        {option}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs font-bold text-[#6B7280]">
                      No options available
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs font-semibold text-[#DC2626] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  placeholder = 'Enter password',
  minLength = 1,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  placeholder?: string;
  minLength?: number;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] peer-focus:text-[#111827] transition-colors pointer-events-none" />
        <input
          type={showPassword ? 'text' : 'password'}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="peer w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all outline-none placeholder:text-gray-400 shadow-sm shadow-gray-900/5"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#111827] transition-colors"
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs font-semibold text-[#DC2626] overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function RegistrationProgress({
  currentStep,
  maxUnlockedStep,
  firstInvalidStep,
  onStepClick,
}: {
  currentStep: RegistrationStep;
  maxUnlockedStep: RegistrationStep;
  firstInvalidStep: RegistrationStep;
  onStepClick: (step: RegistrationStep) => void;
}) {
  return (
    <div className="space-y-3" aria-label="Registration progress">
      <div className="flex items-start">
        {REGISTRATION_STEPS.map((step, index) => {
          const stepIndex = index as RegistrationStep;
          const isCurrent = stepIndex === currentStep;
          const isComplete = stepIndex < currentStep;
          const canNavigate = stepIndex <= currentStep;

          return (
            <React.Fragment key={step.title}>
              <button
                type="button"
                onClick={() => onStepClick(stepIndex)}
                disabled={!canNavigate}
                className="group flex w-20 flex-col items-center gap-2 text-center disabled:cursor-not-allowed"
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${isComplete ? 'Completed' : isCurrent ? 'Current' : 'Upcoming'} step ${index + 1}: ${step.title}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-black transition-all ${isCurrent
                    ? 'border-[#111827] bg-white text-[#111827] ring-4 ring-[#11182714]'
                    : isComplete
                      ? 'border-[#111827] bg-[#111827] text-white group-hover:bg-[#374151]'
                      : 'border-[#D1D5DB] bg-white text-[#9CA3AF]'
                    }`}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={`text-[10px] font-black uppercase leading-tight tracking-wider ${isCurrent ? 'text-[#111827]' : isComplete ? 'text-[#374151]' : 'text-[#9CA3AF]'
                    }`}
                >
                  {step.title}
                </span>
              </button>
              {index < REGISTRATION_STEPS.length - 1 && (
                <div className="mt-3.5 h-0.5 flex-1 rounded-full bg-[#E5E7EB]">
                  <div
                    className={`h-full rounded-full transition-all ${stepIndex < currentStep ? 'bg-[#111827]' : 'bg-transparent'}`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
