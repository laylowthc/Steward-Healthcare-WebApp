import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase environment variables are missing. Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function syncUserWithSupabase(firebaseUid: string, email: string, displayName: string) {
  try {
    const { data: existingUsers, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid);

    if (selectError) {
      console.error('Error fetching Supabase user:', JSON.stringify(selectError, null, 2));
      return null;
    }

    if (existingUsers && existingUsers.length > 0) {
      return existingUsers[0];
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        firebase_uid: firebaseUid,
        email: email,
        full_name: displayName,
        role: 'Applicant',
        status: 'Pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating Supabase user:', JSON.stringify(insertError, null, 2));
      return null;
    }

    return newUser;
  } catch (error) {
    console.error('Unexpected error syncing user with Supabase:', error);
    return null;
  }
}
