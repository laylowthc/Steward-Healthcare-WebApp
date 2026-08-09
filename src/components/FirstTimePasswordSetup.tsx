import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import BrandedLogo from './BrandedLogo';
import SHCLoader from './SHCLoader';
import { supabase } from '../lib/supabase';
import { validateFirstTimePassword } from '../lib/firstTimePasswordSetup';

type FirstTimePasswordSetupProps = {
  email: string;
  onComplete: (user: User) => void;
};

export default function FirstTimePasswordSetup({ email, onComplete }: FirstTimePasswordSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validationError = validateFirstTimePassword(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { data: currentUserData, error: currentUserError } = await supabase.auth.getUser();
      if (currentUserError || !currentUserData.user) {
        throw new Error('Your invitation session has expired. Please ask an administrator for a new invitation.');
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          ...currentUserData.user.user_metadata,
          requires_password_setup: false,
          password_setup_completed_at: new Date().toISOString()
        }
      });

      if (updateError || !data.user) {
        throw new Error(updateError?.message || 'StaffHub could not save your password. Please try again.');
      }

      onComplete(data.user);
    } catch (caughtError: any) {
      setError(caughtError?.message || 'StaffHub could not save your password. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10 relative overflow-hidden" id="shc-first-time-password-setup">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-60 translate-x-20 -translate-y-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-100 rounded-full blur-3xl opacity-60 -translate-x-20 translate-y-20" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-xl sm:px-10" aria-labelledby="password-setup-title">
        <div className="flex justify-center mb-5">
          <BrandedLogo size="md" />
        </div>

        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 id="password-setup-title" className="text-2xl font-bold text-slate-900">Create your StaffHub password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Complete your invited account setup before continuing into Steward Health Care StaffHub.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-purple-700">Invited email address</p>
          <p className="mt-1 flex items-center gap-2 break-all text-sm font-semibold text-slate-900">
            <Mail className="h-4 w-4 shrink-0 text-purple-600" aria-hidden="true" />
            {email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <PasswordField
            id="first-time-password"
            label="Create password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="first-time-password-confirmation"
            label="Confirm password"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Use at least 10 characters, including uppercase, lowercase and a number.
            </p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-xl bg-purple-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <SHCLoader variant="inline" text="Saving password…" /> : 'Create password and continue'}
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative mt-1">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
      </div>
    </div>
  );
}
