import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Building2, Eye, EyeOff, Lock, Mail, MapPin, ShieldCheck, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register';
type RegistrationStep = 0 | 1 | 2;
type RegistrationErrors = Partial<Record<'fullName' | 'department' | 'site' | 'email' | 'password' | 'confirmPassword', string>>;

const REGISTRATION_STEPS = [
  { title: 'User Information', fields: ['fullName', 'email'] },
  { title: 'Work Details', fields: ['department', 'site'] },
  { title: 'Security', fields: ['password', 'confirmPassword'] },
] as const;

const SITE_OPTIONS = ['HQ', 'Candelaria', 'WFH', 'Hybrid'];

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
  const navigate = useNavigate();
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

  const isRegistering = mode === 'register';
  useEffect(() => {
    if (!isRegistering) return;

    let isMounted = true;

    async function loadDepartmentOptions() {
      setIsLoadingDepartments(true);
      setDepartmentOptionsError('');

      const { data, error } = await supabase
        .from('accounts')
        .select('name')
        .eq('account_type', 'internal')
        .order('name', { ascending: true });

      if (!isMounted) return;

      if (error) {
        setDepartmentOptions([]);
        setDepartmentOptionsError(error.message || 'Unable to load departments.');
        setIsLoadingDepartments(false);
        return;
      }

      const options = Array.from(
        new Set(
          (data || [])
            .map((item) => item.name)
            .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
            .map((name) => name.trim())
        )
      ).sort((first, second) => first.localeCompare(second));

      setDepartmentOptions(options);
      setDepartmentOptionsError('');
      setIsLoadingDepartments(false);
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
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
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
    const canNavigate = step <= maxUnlockedStep && step <= firstInvalidStep;
    if (!canNavigate) return;
    setRegistrationStep(step);
    setModalError('');
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
              onClick={() => {
                setMode('login');
                setModalError('');
                setRegistrationStep(0);
              }}
              className={`py-2.5 rounded-lg text-sm font-black transition-all ${
                mode === 'login' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setModalError('');
              }}
              className={`py-2.5 rounded-lg text-sm font-black transition-all ${
                mode === 'register' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {isRegistering ? (
              <div className="space-y-5">
                <RegistrationProgress
                  currentStep={registrationStep}
                  maxUnlockedStep={maxUnlockedStep}
                  firstInvalidStep={firstInvalidStep}
                  onStepClick={handleStepNavigation}
                />

                {registrationStep === 0 && (
                  <>
                    <AuthInput
                      icon={User}
                      label="Full Name"
                      type="text"
                      value={fullName}
                      onChange={setFullName}
                      placeholder="Juan Dela Cruz"
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
                  </>
                )}

                {registrationStep === 1 && (
                  <>
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
                  </>
                )}

                {registrationStep === 2 && (
                  <>
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
                            className={`h-1.5 flex-1 rounded-full ${
                              rule.test(password) ? passwordStrengthColor : 'bg-[#E5E7EB]'
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
                  </>
                )}

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
                      className="rounded-xl bg-[#111827] py-3 text-sm font-bold text-white shadow-lg shadow-[#11182720] transition-all hover:bg-[#374151] active:scale-[0.98] disabled:opacity-50"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading || !canSubmit}
                      className="rounded-xl bg-[#111827] py-3 text-sm font-bold text-white shadow-lg shadow-[#11182720] transition-all hover:bg-[#374151] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
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
                  className="w-full bg-[#111827] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#374151] shadow-lg shadow-[#11182720] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </button>
              </>
            )}
          </form>

          <div className="mt-8 pt-8 border-t border-[#F3F4F6] text-center">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-bold">
              Secure Access Layer v2.0
            </p>
          </div>
        </div>
      </motion.div>
      {modalError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
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
          </div>
        </div>
      )}
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
      {error && <p className="text-xs font-semibold text-[#DC2626]">{error}</p>}
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
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <select
          required={required}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border-none bg-[#F3F4F6] py-3 pl-10 pr-10 text-sm outline-none transition-all focus:ring-2 focus:ring-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#9CA3AF]">
          v
        </span>
      </div>
      {error && <p className="text-xs font-semibold text-[#DC2626]">{error}</p>}
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
    <div className="space-y-2">
      <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          type={showPassword ? 'text' : 'password'}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-12 py-3 bg-[#F3F4F6] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#111827] transition-all outline-none"
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
      {error && <p className="text-xs font-semibold text-[#DC2626]">{error}</p>}
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
          const isComplete = stepIndex < maxUnlockedStep && stepIndex < firstInvalidStep;
          const canNavigate = isCurrent || isComplete;

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
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-black transition-all ${
                    isCurrent
                      ? 'border-[#111827] bg-white text-[#111827] ring-4 ring-[#11182714]'
                      : isComplete
                        ? 'border-[#111827] bg-[#111827] text-white group-hover:bg-[#374151]'
                        : 'border-[#D1D5DB] bg-white text-[#9CA3AF]'
                  }`}
                >
                  {isComplete ? '●' : index + 1}
                </span>
                <span
                  className={`text-[10px] font-black uppercase leading-tight tracking-wider ${
                    isCurrent ? 'text-[#111827]' : isComplete ? 'text-[#374151]' : 'text-[#9CA3AF]'
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
