import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Mail, MapPin, ShieldCheck, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/contexts/AuthContext';
import { authService } from '@/src/services/authService';
import { roleService, type Role } from '@/src/services/roleService';
import { AppUser, UserRole } from '@/src/types';
import logoUrl from '@/src/public/logo-only-bigoutsource.svg';
import { AuthInput, PasswordInput, SelectInput } from './authFields';

type RegistrationStep = 0 | 1 | 2;
type RegistrationErrors = Partial<Record<'fullName' | 'department' | 'site' | 'email' | 'password' | 'confirmPassword', string>>;

const REGISTRATION_STEPS = [
  { title: 'User Information', fields: ['fullName', 'email'] },
  { title: 'Work Details', fields: ['department', 'site'] },
  { title: 'Security', fields: ['password', 'confirmPassword'] },
] as const;

const SITE_OPTIONS = ['San Pablo City (HQ)', 'Candelaria', 'WFH', 'Hybrid'];

// Assignable roles are fetched live from the roles table (Super Admin is excluded).

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

function getStepHasErrors(errors: RegistrationErrors, step: RegistrationStep) {
  return REGISTRATION_STEPS[step].fields.some((field) => Boolean(errors[field as keyof RegistrationErrors]));
}

interface RegisterFormProps {
  /** Called after a successful registration request, with the newly created account. */
  onSuccess?: (user: AppUser) => void;
  /** Render the logo + heading block (matches the logged-out screen). Default true. */
  showHeader?: boolean;
}

/**
 * Self-contained registration wizard. Renders exactly like the logged-out
 * registration screen, but can be embedded anywhere (e.g. the "Register
 * Account" modal in User Management). Creates an account via the shared
 * auth context; the caller's session is unaffected.
 */
export default function RegisterForm({ onSuccess, showHeader = true }: RegisterFormProps) {
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentOptionsError, setDepartmentOptionsError] = useState('');
  const [site, setSite] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleSlug, setRoleSlug] = useState('viewer');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(0);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<RegistrationStep>(0);

  useEffect(() => {
    let active = true;
    roleService
      .list()
      .then((list) => {
        if (active) setRoles(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
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
        setDepartmentOptionsError(options.length === 0 ? 'No departments available. Create one first.' : '');
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
  }, []);

  const registrationErrors = useMemo(
    () => getRegistrationErrors({ email, password, confirmPassword, fullName, department, site }),
    [confirmPassword, department, email, fullName, password, site]
  );
  const currentStepHasErrors =
    getStepHasErrors(registrationErrors, registrationStep) ||
    (registrationStep === 1 && (isLoadingDepartments || Boolean(departmentOptionsError)));

  const passwordStrengthScore = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const passwordStrength = passwordStrengthScore <= 2 ? 'Weak' : passwordStrengthScore <= 4 ? 'Fair' : 'Strong';
  const passwordStrengthColor =
    passwordStrengthScore <= 2 ? 'bg-[#EF4444]' : passwordStrengthScore <= 4 ? 'bg-[#F59E0B]' : 'bg-[#10B981]';
  const canSubmit = Object.keys(registrationErrors).length === 0;

  const handleNextStep = () => {
    if (currentStepHasErrors) return;
    const nextStep = Math.min(registrationStep + 1, 2) as RegistrationStep;
    setRegistrationStep(nextStep);
    setMaxUnlockedStep((current) => Math.max(current, nextStep) as RegistrationStep);
  };

  const handleStepNavigation = (step: RegistrationStep) => {
    if (step > maxUnlockedStep) return;
    setRegistrationStep(step);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (registrationStep < 2) {
      handleNextStep();
      return;
    }

    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const user = await register({ email, password, fullName, department, site });
      // The register endpoint creates the base account; the admin's chosen role
      // rides back on the user object for the caller to apply immediately.
      onSuccess?.({ ...user, role: roleSlug as UserRole });
    } catch {
      // AuthContext surfaces the error via toast; keep the form open for retry.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex flex-col items-center mb-8">
          <img src={logoUrl} alt="Big Outsource" className="w-16 h-auto mb-5 object-contain" />
          <h1 className="text-[26px] font-black text-[#111827] tracking-tight text-center">Create an Account</h1>
          <p className="text-[#6B7280] text-sm mt-2 text-center leading-relaxed">
            Fill in the details to request system access.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 w-full" noValidate>
        <RegistrationProgress currentStep={registrationStep} onStepClick={handleStepNavigation} />

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
              />
              <SelectInput
                icon={MapPin}
                label="Site"
                value={site}
                onChange={setSite}
                placeholder="Select site"
                options={SITE_OPTIONS}
                error={registrationErrors.site}
              />
              <SelectInput
                icon={ShieldCheck}
                label="Role"
                value={roles.find((role) => role.slug === roleSlug)?.name || ''}
                onChange={(value) => {
                  const match = roles.find((role) => role.name === value && role.slug !== 'super_admin');
                  if (match) setRoleSlug(match.slug);
                }}
                placeholder="Select role"
                options={roles.filter((role) => role.slug !== 'super_admin').map((role) => role.name)}
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
                      className={`h-1.5 flex-1 rounded-full ${rule.test(password) ? passwordStrengthColor : 'bg-[#E5E7EB]'}`}
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
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
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
            className="min-h-12 rounded-xl bg-[#F3F4F6] px-4 py-3 text-sm font-bold text-[#374151] transition-all hover:bg-[#E5E7EB] disabled:opacity-50"
          >
            Back
          </button>
          {registrationStep < 2 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={currentStepHasErrors || isLoading}
              className="min-h-12 rounded-2xl bg-[#111827] px-4 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#111827]/20 transition-all hover:bg-[#1F2937] active:scale-[0.98] disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#111827]/20 transition-all hover:bg-[#1F2937] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function RegistrationProgress({
  currentStep,
  onStepClick,
}: {
  currentStep: RegistrationStep;
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
