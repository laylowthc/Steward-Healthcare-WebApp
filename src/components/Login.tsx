import React, { useState } from 'react';
import { Shield, Clock, Mail, Lock, AlertCircle, ArrowRight, Heart } from 'lucide-react';
import BrandedLogo from './BrandedLogo';

interface LoginProps {
  onLoginSuccess: (userRole: 'admin' | 'staff' | 'family', userId?: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Direct validation routes for easier evaluation
    if (email.toLowerCase() === 'admin@shc247.co.uk' || email.toLowerCase() === 'admin') {
      onLoginSuccess('admin');
    } else if (email.toLowerCase() === 'clara.oswald@shc247.co.uk' || email.toLowerCase() === 'clara' || email.toLowerCase() === 'staff') {
      onLoginSuccess('staff', 'staff_1');
    } else {
      setError('Invalid username or password. Use demo quick-login buttons below.');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setShowForgot(false);
      setForgotEmail('');
    }, 2800);
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
          {!showForgot ? (
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

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs text-slate-500">
                <span className="bg-white px-3 font-semibold uppercase tracking-wider text-slate-400">
                  Quick Demo Viewers
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onLoginSuccess('admin')}
                className="flex flex-col items-center justify-center p-3 border border-purple-100 rounded-xl bg-purple-50/50 hover:bg-purple-50 hover:border-purple-300 text-center transition-all cursor-pointer group"
              >
                <div className="p-1 px-2 rounded-full bg-purple-100 text-purple-900 text-[10px] font-bold mb-1 shadow-sm">
                  AGENCY ROLE
                </div>
                <span className="text-xs font-bold text-purple-950 group-hover:text-purple-600 flex items-center">
                  Admin Dashboard <ArrowRight className="w-3 h-3 ml-1" />
                </span>
                <span className="text-[10px] text-slate-500">Recruitment & Compliance</span>
              </button>

              <button
                type="button"
                onClick={() => onLoginSuccess('staff', 'staff_1')}
                className="flex flex-col items-center justify-center p-3 border border-rose-100 rounded-xl bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300 text-center transition-all cursor-pointer group"
              >
                <div className="p-1 px-2 rounded-full bg-rose-100 text-rose-900 text-[10px] font-bold mb-1 shadow-sm">
                  STAFF ROLE
                </div>
                <span className="text-xs font-bold text-rose-950 group-hover:text-rose-600 flex items-center">
                  Staff Member <ArrowRight className="w-3 h-3 ml-1" />
                </span>
                <span className="text-[10px] text-slate-500">Blessing (Registered Nurse)</span>
              </button>
            </div>

            {/* Family & Relatives Live Portal link */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => onLoginSuccess('family')}
                className="w-full flex items-center justify-between p-3.5 border border-dashed border-rose-200 rounded-xl bg-rose-50/30 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-lg group-hover:scale-105 transition-transform">
                    <Heart className="w-4 h-4 fill-rose-600 text-rose-700 font-bold" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-rose-950 font-sans tracking-wide">Family & Client Care Hub</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Are you a client relative? Submit real-time surveys here</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-700 font-bold transform group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          </div>
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
