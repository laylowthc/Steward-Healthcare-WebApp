import React, { useState } from 'react';
import { Shield, Clock, Mail, Lock, AlertCircle, ArrowRight, Heart } from 'lucide-react';
import BrandedLogo from './BrandedLogo';
import { Applicant } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: (userRole: 'admin' | 'staff' | 'family' | 'applicant', userId?: string) => void;
  onAddApplicant?: (applicant: Omit<Applicant, 'id' | 'dateCreated'>, id?: string) => string;
  onSystemReset?: () => Promise<void>;
}

export default function Login({ onLoginSuccess, onAddApplicant, onSystemReset }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'staff' | 'admin' | 'applicant'>('applicant');
  const [regSuccess, setRegSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (signInError) {
        throw signInError;
      }
      // Successful auth triggers onAuthStateChange in App.tsx
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    }
  };

  const handleLoginReset = async () => {
    if (window.confirm("This will clear your local storage, session storage, and sign you out of all accounts to give you a pristine starting screen. To completely delete the remote cloud Firestore database, log in as an Admin and use the Database Reset button in the console. Proceed?")) {
      localStorage.clear();
      sessionStorage.clear();
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
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
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
        setShowForgot(false);
        setForgotEmail('');
      }, 2800);
    } catch (err: any) {
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
        setShowForgot(false);
        setForgotEmail('');
      }, 2800);
    }
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
        options: {
          data: {
            full_name: regName
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const user = data.user;
      if (!user) {
        throw new Error('Registration failed, user object is empty.');
      }
      
      const userId = user.id;
      
      const { error: insertError } = await supabase.from('users').insert({
        id: userId,
        firebase_uid: userId,
        full_name: regName,
        email: regEmail.toLowerCase(),
        role: regRole === 'admin' ? 'Admin' : (regRole === 'staff' ? 'Staff' : 'Applicant'),
        status: 'Pending'
      });

      if (insertError) {
        console.error("Error creating Supabase user during registration:", insertError);
        setError(`Failed to create database profile: ${insertError.message}`);
        return;
      }

      setRegSuccess(true);
      setTimeout(() => {
        if (regRole === 'applicant' && onAddApplicant) {
          onAddApplicant({
            name: regName,
            email: regEmail,
            phone: '',
            position: 'Care Assistant', // Default target role
            status: 'Applied',
            notes: 'Self-registered applicant via portal.'
          }, userId);
        }
        onLoginSuccess(regRole, userId);
      }, 1500);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use' || (err.message && (err.message.includes('already registered') || err.message.includes('already exists') || err.message.includes('already in use')))) {
        try {
          // Attempt to automatically sign in with the password provided
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: regEmail,
            password: regPassword
          });
          if (signInError) {
            throw signInError;
          }
          const user = signInData.user;
          if (!user) {
            throw new Error('User object is empty.');
          }
          const userId = user.id;
          
          // Check if their Supabase profile is missing
          const { data: existingUsers, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('email', regEmail.toLowerCase());

          let finalRole = regRole;
          if (selectError) {
            console.error("Supabase profile check failed during registration fallback:", selectError);
          } else if (!existingUsers || existingUsers.length === 0) {
            // Profile is missing in Supabase, create it
            await supabase.from('users').insert({
              id: userId,
              firebase_uid: userId,
              full_name: regName,
              email: regEmail.toLowerCase(),
              role: regRole === 'admin' ? 'Admin' : (regRole === 'staff' ? 'Staff' : 'Applicant'),
              status: 'Pending'
            });
          } else {
            const sUser = existingUsers[0];
            finalRole = (sUser.role || regRole).toLowerCase() as 'admin' | 'staff' | 'family' | 'applicant';
          }

          setRegSuccess(true);
          setTimeout(() => {
            if (finalRole === 'applicant' && onAddApplicant) {
              onAddApplicant({
                name: regName,
                email: regEmail,
                phone: '',
                position: 'Care Assistant',
                status: 'Applied',
                notes: 'Self-registered applicant via portal.'
              }, userId);
            }
            onLoginSuccess(finalRole, userId);
          }, 1500);
          return;
        } catch (signInErr: any) {
          setError("This email is already registered. If this is your account, please enter the correct password to sign in, or click 'Sign in here' below.");
          return;
        }
      }

      setError(err.message || 'Failed to register.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="shc-login-view">
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-60 transform translate-x-20 -translate-y-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-100 rounded-full blur-3xl opacity-60 transform -translate-x-20 translate-y-20"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center justify-center">
        {/* Steward Health Care Logo Reconstruction */}
        <div className="flex flex-col items-center justify-center p-3 mb-2" id="logo-branding">
          <BrandedLogo layout="vertical" size="lg" />
        </div>

        <h2 className="mt-4 text-center text-3xl font-bold tracking-tight text-slate-900">
          StaffHub Portal
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Digitized Healthcare Staff Recruitment & Compliance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10" id="login-container-card">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-2xl sm:px-10">
          {showRegistration ? (
            <form className="space-y-6" onSubmit={handleRegisterSubmit}>
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Create an Account</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Join Steward Health Care StaffHub
                </p>
              </div>

              {error && (
                <div className="bg-rose-50 border-l-4 border-rose-600 p-3 rounded-r-md flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-rose-800 font-medium">{error}</span>
                </div>
              )}

              {regSuccess ? (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-md text-center">
                  <span className="text-xs text-emerald-800 font-semibold">
                    ✓ Registration successful! Logging you in...
                  </span>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-semibold text-slate-700">Full Name</label>
                    <div className="mt-1">
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-700">Email Address</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                        placeholder="yourname@shc247.co.uk"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-sm font-semibold text-slate-700">Password</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="reg-password"
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-purple-900 via-purple-800 to-rose-700 hover:from-purple-950 hover:to-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 cursor-pointer text-center transition-all duration-200"
                    >
                      Complete Registration
                    </button>
                  </div>
                  <div className="text-center mt-4">
                     <p className="text-xs text-slate-600">
                       Already have an account?{' '}
                       <button 
                         type="button" 
                         onClick={() => setShowRegistration(false)}
                         className="text-purple-700 font-bold hover:underline"
                       >
                         Sign in here
                       </button>
                     </p>
                  </div>
                </>
              )}
            </form>
          ) : !showForgot ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-rose-50 border-l-4 border-rose-600 p-3 rounded-r-md flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-rose-800 font-medium">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm transition-all"
                    placeholder="Enter email or 'admin' / 'clara'"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs font-medium text-slate-600">
                    Remember my credentials
                  </label>
                </div>

                <div className="text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setError('');
                    }}
                    className="font-semibold text-purple-700 hover:text-purple-600 hover:underline transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-purple-900 via-purple-800 to-rose-700 hover:from-purple-950 hover:to-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 cursor-pointer text-center transition-all duration-200"
                >
                  Sign In to StaffHub
                </button>
              </div>

              <div className="text-center mt-4 border-t border-slate-100 pt-4">
                 <p className="text-xs text-slate-600">
                   Don't have an account?{' '}
                   <button 
                     type="button" 
                     onClick={() => setShowRegistration(true)}
                     className="text-purple-700 font-bold hover:underline"
                   >
                     Register here
                   </button>
                 </p>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleForgotSubmit}>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your registered NHS or work email, and we will dispatch a temporary recovery link.
                </p>
              </div>

              {forgotSent ? (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-md text-center">
                  <span className="text-xs text-emerald-800 font-semibold">
                    ✓ Recovery instruction email has been dispatched! Returning to login.
                  </span>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-semibold text-slate-700">
                      Email Address
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                        placeholder="yourname@shc247.co.uk"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="w-1/2 flex justify-center py-2 px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-all"
                    >
                      Back to Login
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-lg text-xs font-semibold text-white bg-purple-900 hover:bg-purple-950 shadow focus:outline-none transition-all"
                    >
                      Send Reset Link
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* Quick Demo Logins Section removed for production */}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mt-6 text-xs text-slate-400">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Secured with UK Agency Standards (Health & Safety Executive)</span>
        </div>
        <p className="mt-1 font-medium">Steward Health Care 247 Professionals © 2026. All rights Reserved.</p>
      </div>
    </div>
  );
}
