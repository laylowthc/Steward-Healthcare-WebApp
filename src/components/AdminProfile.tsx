import React, { useEffect, useState } from 'react';
import { Save, ShieldCheck, UserRound } from 'lucide-react';
import { SystemUserProfile } from '../types';
import PassportPhotoUpload from './PassportPhotoUpload';
import SHCLoader from './SHCLoader';

interface AdminProfileProps {
  profile: SystemUserProfile;
  avatarUrl?: string;
  onSave: (details: { fullName: string; phone: string }) => Promise<void>;
  onPhotoUploaded: () => Promise<void> | void;
}

export default function AdminProfile({ profile, avatarUrl, onSave, onPhotoUploaded }: AdminProfileProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile.fullName);
    setPhone(profile.phone || '');
  }, [profile.fullName, profile.phone]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || isSaving) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await onSave({ fullName: fullName.trim(), phone: phone.trim() });
      setMessage('Admin profile updated successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update admin profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl" id="shc-admin-profile">
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <UserRound className="w-5 h-5 text-purple-200" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Admin Profile</h2>
            <p className="text-xs text-slate-400">Manage your identity, contact details and Web ID headshot.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-slate-900">Profile photograph</h3>
            <p className="text-xs text-slate-500 mt-1">This photograph appears on your dashboard Web ID and admin profile.</p>
          </div>
          <PassportPhotoUpload
            compact
            currentPhotoUrl={avatarUrl}
            userId={profile.id}
            userName={profile.fullName}
            onPhotoUploaded={() => onPhotoUploaded()}
          />
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Stored securely with the same SHC profile-photo system used across StaffHub.
          </div>
        </section>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="admin-full-name">Full name</label>
            <input
              id="admin-full-name"
              value={fullName}
              onChange={event => setFullName(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="admin-email">Email address</label>
            <input id="admin-email" value={profile.email} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="admin-phone">Telephone number</label>
            <input
              id="admin-phone"
              value={phone}
              onChange={event => setPhone(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Add a contact number"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <span className="text-slate-500 block">System role</span>
              <strong className="text-slate-900 capitalize">{profile.role}</strong>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <span className="text-slate-500 block">Account status</span>
              <strong className="text-slate-900">{profile.status}</strong>
            </div>
          </div>
          {message && <p className="text-xs font-semibold text-slate-700" role="status">{message}</p>}
          <button
            type="submit"
            disabled={isSaving || !fullName.trim()}
            className="w-full bg-purple-900 hover:bg-purple-950 text-white rounded-xl py-2.5 text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSaving ? <SHCLoader text="Saving profile…" className="text-white [&_.shc-loader__text]:text-white" /> : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>
        </form>
      </div>
    </div>
  );
}
