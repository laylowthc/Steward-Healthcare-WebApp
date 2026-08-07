import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, AlertCircle, RefreshCw, User, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PassportPhotoUploadProps {
  currentPhotoUrl?: string;
  userId: string;
  userName: string;
  onPhotoUploaded: (photoUrl: string) => void;
  compact?: boolean;
}

export default function PassportPhotoUpload({
  currentPhotoUrl,
  userId,
  userName,
  onPhotoUploaded,
  compact = false
}: PassportPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|jpg|webp)$/i)) {
      setUploadError("Please upload a valid image file (JPG, JPEG, PNG).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image file size must be less than 10MB.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      // 1. Create a local preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      // 2. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `avatars/${userId}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      let finalUrl = localUrl;

      if (!storageError && uploadData) {
        // Get public or relative path for avatar
        const { data: publicUrlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          finalUrl = publicUrlData.publicUrl;
        } else {
          finalUrl = fileName;
        }
      } else {
        console.warn("Storage upload notice (falling back to blob URL/metadata):", storageError);
      }

      // 3. Save avatarUrl in staff_profiles or users table in Supabase
      try {
        const { error: profileErr } = await supabase
          .from('staff_profiles')
          .update({
            staff_number: JSON.stringify({ avatarUrl: finalUrl })
          })
          .eq('user_id', userId);

        if (profileErr) {
          console.error("Error saving avatar URL to staff_profiles:", profileErr);
        }
      } catch (dbErr) {
        console.error("DB update exception:", dbErr);
      }

      onPhotoUploaded(finalUrl);
    } catch (err: any) {
      console.error("Error uploading profile photo:", err);
      setUploadError("Failed to upload profile photo. Please retry.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 bg-slate-100 flex items-center justify-center shrink-0 shadow-sm">
          {previewUrl ? (
            <img src={previewUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-slate-400" />
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{previewUrl ? 'Change Photo' : 'Upload Headshot'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/jpg,image/webp"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <Camera className="w-5 h-5 text-purple-900" />
        <h3 className="text-sm font-bold text-slate-800">Passport-Style Headshot (Mandatory)</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative w-28 h-32 rounded-xl overflow-hidden border-2 border-purple-200 bg-slate-50 flex items-center justify-center shrink-0 shadow-inner group">
          {previewUrl ? (
            <img src={previewUrl} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-2">
              <User className="w-10 h-10 text-slate-300 mx-auto" />
              <span className="text-[10px] text-slate-400 font-bold block mt-1">No Photo</span>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
              <RefreshCw className="w-6 h-6 animate-spin mb-1" />
              <span className="text-[10px] font-bold">Uploading...</span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-left flex-1">
          <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100 text-[11px] text-purple-950 space-y-1">
            <span className="font-extrabold uppercase tracking-wider block text-purple-900">Headshot Requirements:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-700 font-medium">
              <li>Recent passport-style photo with plain background</li>
              <li>Head and shoulders facing directly at camera</li>
              <li>Good lighting, clear facial visibility (JPG, JPEG, PNG)</li>
            </ul>
          </div>

          {uploadError && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{previewUrl ? 'Replace Passport Headshot' : 'Upload Passport Headshot'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
