import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // adjust if supabaseClient is elsewhere

interface FormProps {
  userId: string;
  initialData?: any;
  onSave?: () => void;
}

export default function EmploymentApplicationForm({ userId, initialData, onSave }: FormProps) {
  const [formData, setFormData] = useState(initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    }
    setFormData((prev: any) => ({ ...prev, [name]: finalValue }));
  };

  const handleRadio = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const { error: submitError } = await supabase.from('applications').upsert({
        user_id: userId,
        ...formData
      });
      if (submitError) throw submitError;
      setSuccess('Application submitted successfully.');
      if (onSave) onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Did you run the SQL migration?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 text-slate-800 my-8">
      {/* Form Header */}
      <div className="p-8 border-b border-purple-900 flex justify-between items-center bg-white">
        <div>
          <h1 className="text-3xl font-black text-purple-900 flex items-center">
            <span className="text-rose-600 text-4xl mr-2">S2</span>
            Steward Health Care
          </h1>
          <h2 className="text-xl font-bold text-slate-700">247 Professionals</h2>
          <p className="text-rose-600 font-semibold italic">Redefining Care</p>
        </div>
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold border border-slate-200">CQC</div>
          <div className="w-16 h-16 bg-green-700 text-white rounded flex items-center justify-center text-xs font-bold">Herts</div>
        </div>
      </div>

      <div className="p-8 bg-white space-y-8">
        <h2 className="text-2xl font-black text-purple-950 uppercase tracking-widest border-b-2 border-rose-600 pb-2">Application for Employment</h2>
        
        {error && <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded">{error}</div>}
        {success && <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="space-y-4">
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <label className="font-semibold text-sm">Application for the Position of:</label>
              <input type="text" name="position_applied" value={formData.position_applied || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
            </div>
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <label className="font-semibold text-sm">Vacancy Reference / Location:</label>
              <input type="text" name="vacancy_reference" value={formData.vacancy_reference || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
            </div>
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <label className="font-semibold text-sm">Source of Advertisement:</label>
              <input type="text" name="source_of_advertisement" value={formData.source_of_advertisement || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
            </div>
          </div>

          <Section title="PERSONAL DETAILS (IN BLOCK CAPITALS)">
            <div className="space-y-4">
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Title (Mr / Mrs / Miss / Ms / Dr / Other):</label>
                <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Forenames:</label>
                <input type="text" name="forenames" value={formData.forenames || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Surname:</label>
                <input type="text" name="surname" value={formData.surname || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-start gap-4">
                <label className="font-semibold text-sm mt-2">Address:</label>
                <textarea name="address" value={formData.address || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 h-24" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Postcode:</label>
                <input type="text" name="postcode" value={formData.postcode || ''} onChange={handleChange} className="w-1/2 border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Telephone Number:</label>
                <input type="text" name="telephone" value={formData.telephone || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Mobile Number:</label>
                <input type="text" name="mobile" value={formData.mobile || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Personal Email Address:</label>
                <input type="email" name="personal_email" value={formData.personal_email || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">National Insurance Number:</label>
                <input type="text" name="national_insurance" value={formData.national_insurance || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Are you eligible to work in the UK?</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2"><input type="radio" checked={formData.eligible_to_work_uk === true} onChange={() => handleRadio('eligible_to_work_uk', true)} /> Yes</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={formData.eligible_to_work_uk === false} onChange={() => handleRadio('eligible_to_work_uk', false)} /> No</label>
                </div>
              </div>
            </div>
          </Section>

          <Section title="2. COMPLIANCE & VERIFICATION">
            <div className="space-y-4">
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Right to Work:</label>
                <input type="text" name="right_to_work_check" value={formData.right_to_work_check || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Enhanced DBS:</label>
                <input type="text" name="enhanced_dbs" value={formData.enhanced_dbs || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
              <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                <label className="font-semibold text-sm">Issue Date:</label>
                <input type="date" name="dbs_issue_date" value={formData.dbs_issue_date || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
              </div>
            </div>
          </Section>

          <div className="pt-6">
            <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-purple-900 hover:bg-purple-950 text-white font-bold rounded-lg text-lg">
              {isSubmitting ? 'Saving...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="border border-purple-900 rounded-lg overflow-hidden">
      <div className="bg-purple-900 text-white p-3 font-bold uppercase tracking-wider text-sm">{title}</div>
      <div className="p-6 bg-slate-50">{children}</div>
    </div>
  );
}
