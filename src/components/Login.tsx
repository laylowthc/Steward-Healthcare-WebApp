import React, { useState } from 'react';
import { AlertCircle, Lock, Mail, Shield } from 'lucide-react';
import BrandedLogo from './BrandedLogo';
import { Applicant } from '../types';
import { supabase } from '../lib/supabase';
import { createUserProfile } from '../lib/workflowRepository';

interface LoginProps {
  onLoginSuccess: (userRole: 'admin' | 'staff' | 'family' | 'applicant', userId?: string) => void;
  onAddApplicant?: (applicant: Omit<Applicant, 'id' | 'dateCreated'>, id?: string) => Promise<string>;
}

export default function Login({ onLoginSuccess, onAddApplicant }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/#reset-password`,
      });
      if (resetError) throw resetError;
    } catch (err) {
      console.error('Password reset request failed:', err);
    } finally {
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
        setShowForgot(false);
        setForgotEmail('');
      }, 2800);
    }
  };

  const createApplicantWorkflow = async (userId: string) => {
    if (!onAddApplicant) return;
    await onAddApplicant({
      name: regName,
      email: regEmail,
      phone: '',
      position: '',
      status: 'Applied',
      notes: 'Self-registered applicant via portal.'
    }, userId);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName || !regEmail || !regPassword) {
      setError('Please fill out all fields.');
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: { data: { full_name: regName } }
      });

      if (signUpError) throw signUpError;
      const user = data.user;
      if (!user) throw new Error('Registration failed, user object is empty.');

      await createUserProfile({
        id: user.id,
        fullName: regName,
        email: regEmail,
        role: 'applicant',
        status: 'Pending'
      });
      await createApplicantWorkflow(user.id);

      setRegSuccess(true);
      setTimeout(() => onLoginSuccess('applicant', user.id), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to register.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="shc-login-view">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-60 transform translate-x-20 -translate-y-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-100 rounded-full blur-3xl opacity-60 transform -translate-x-20 translate-y-20"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center p-3 mb-2" id="logo-branding">
          <BrandedLogo layout="vertical" size="lg" />
        </div>
        <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-slate-900">StaffHub Portal</h2>
        <p className="mt-1 text-center text-sm text-slate-500">Digitized Healthcare Staff Recruitment & Compliance</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10" id="login-container-card">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-2xl sm:px-10">
          {showRegistration ? (
            <form className="space-y-6" onSubmit={handleRegisterSubmit}>
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Create an Account</h3>
                <p className="text-xs text-slate-500 mt-1">Applicant accounts require administrator activation before portal access.</p>
              </div>

              {error && <ErrorMessage message={error} />}

              {regSuccess ? (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-md text-center">
                  <span className="text-xs text-emerald-800 font-semibold">Registration successful. Your account is pending approval.</span>
                </div>
              ) : (
                <>
                  <TextInput id="reg-name" label="Full Name" value={regName} onChange={setRegName} placeholder="John Doe" />
                  <EmailInput id="reg-email" label="Email Address" value={regEmail} onChange={setRegEmail} />
                  <PasswordInput id="reg-password" label="Password" value={regPassword} onChange={setRegPassword} />

                  <button type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-purple-900 via-purple-800 to-rose-700 hover:from-purple-950 hover:to-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 cursor-pointer transition-all duration-200">
                    Complete Registration
                  </button>
                  <p className="text-center text-xs text-slate-600">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setShowRegistration(false)} className="text-purple-700 font-bold hover:underline">
                      Sign in here
                    </button>
                  </p>
                </>
              )}
            </form>
          ) : !showForgot ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && <ErrorMessage message={error} />}
              <EmailInput id="email" label="Email Address" value={email} onChange={setEmail} />
              <PasswordInput id="password" label="Password" value={password} onChange={setPassword} />

              <div className="flex items-center justify-end">
                <button type="button" onClick={() => { setShowForgot(true); setError(''); }} className="text-xs font-semibold text-purple-700 hover:text-purple-600 hover:underline transition-colors">
                  Forgot your password?
                </button>
              </div>

              <button type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-purple-900 via-purple-800 to-rose-700 hover:from-purple-950 hover:to-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 cursor-pointer transition-all duration-200">
                Sign In to StaffHub
              </button>

              <div className="text-center mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-600">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setShowRegistration(true)} className="text-purple-700 font-bold hover:underline">
                    Register here
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleForgotSubmit}>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your registered email and we will send a recovery link.</p>
              </div>

              {forgotSent ? (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-md text-center">
                  <span className="text-xs text-emerald-800 font-semibold">Recovery instruction email has been dispatched.</span>
                </div>
              ) : (
                <>
                  <EmailInput id="forgot-email" label="Email Address" value={forgotEmail} onChange={setForgotEmail} />
                  <div className="flex space-x-3">
                    <button type="button" onClick={() => setShowForgot(false)} className="w-1/2 flex justify-center py-2 px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-all">
                      Back to Login
                    </button>
                    <button type="submit" className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-lg text-xs font-semibold text-white bg-purple-900 hover:bg-purple-950 shadow focus:outline-none transition-all">
                      Send Reset Link
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mt-6 text-xs text-slate-400">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Secured with UK Agency Standards</span>
        </div>
        <p className="mt-1 font-medium">Steward Health Care 247 Professionals © 2026. All rights reserved.</p>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-rose-50 border-l-4 border-rose-600 p-3 rounded-r-md flex items-start space-x-2">
      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <span className="text-xs text-rose-800 font-medium">{message}</span>
    </div>
  );
}

function TextInput({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
      <input id={id} type="text" required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm" />
    </div>
  );
}

function EmailInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Mail className="h-5 w-5 text-slate-400" />
        </div>
        <input id={id} type="email" required value={value} onChange={(e) => onChange(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm" placeholder="yourname@shc247.co.uk" />
      </div>
    </div>
  );
}

function PasswordInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-slate-400" />
        </div>
        <input id={id} type="password" required value={value} onChange={(e) => onChange(e.target.value)} className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm" placeholder="Password" />
      </div>
    </div>
  );
}
