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

export async function syncUserWithSupabase(userId: string, email: string, displayName: string) {
  try {
    const { data: existingUsers, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);

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
        id: userId,
        firebase_uid: userId,
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

export async function getSignedUrlForDocument(filePath: string): Promise<string | null> {
  if (!filePath) return null;
  
  let cleanedPath = filePath;
  
  // If it's a full URL, let's see if we can extract the relative path inside the documents bucket.
  if (cleanedPath.startsWith('http://') || cleanedPath.startsWith('https://')) {
    const docMarker = '/documents/';
    if (cleanedPath.includes(docMarker)) {
      const parts = cleanedPath.split(docMarker);
      let relativePath = parts[parts.length - 1];
      // Strip any query parameters
      const queryIndex = relativePath.indexOf('?');
      if (queryIndex !== -1) {
        relativePath = relativePath.substring(0, queryIndex);
      }
      cleanedPath = relativePath;
      console.log(`[getSignedUrlForDocument] Extracted relative path "${cleanedPath}" from full URL: "${filePath}"`);
    } else {
      // If it's a non-Supabase external URL, return it directly
      return filePath;
    }
  }

  // Strip leading slashes and optional bucket name prefix
  cleanedPath = cleanedPath.replace(/^\/+/, '');
  if (cleanedPath.startsWith('documents/')) {
    cleanedPath = cleanedPath.substring('documents/'.length);
    console.log(`[getSignedUrlForDocument] Stripped "documents/" prefix. New path: "${cleanedPath}"`);
  }

  // If filePath is already a local blob or base64 data URL, return it directly.
  if (
    filePath.startsWith('blob:') || 
    filePath.startsWith('data:')
  ) {
    return filePath;
  }

  try {
    console.log("=== SUPABASE CREATE SIGNED URL LOGGING ===");
    console.log("Uploaded Storage bucket name: 'documents'");
    console.log("Exact path passed to createSignedUrl():", cleanedPath);
    console.log("Original path parameter:", filePath);
    console.log("=========================================");

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(cleanedPath, 300); // 5 minutes expiration
    
    if (error) {
      console.error('[getSignedUrlForDocument] Error generating signed URL for cleaned path:', cleanedPath, 'Error:', JSON.stringify(error, null, 2));
      return null;
    }
    return data?.signedUrl || null;
  } catch (err) {
    console.error('Unexpected error generating signed URL:', err);
    return null;
  }
}

