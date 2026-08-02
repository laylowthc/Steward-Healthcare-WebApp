import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class AcceptApplicantError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

const requireActiveAdmin = async (authorization?: string) => {
  if (!authorization?.startsWith('Bearer ')) throw new AcceptApplicantError('Missing or invalid authorization header', 401);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) throw new AcceptApplicantError('Server configuration is incomplete', 500);

  const sessionClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await sessionClient.auth.getUser(authorization.slice(7));
  if (authError || !user) throw new AcceptApplicantError('Invalid or expired session token', 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, role, status, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'Admin' || profile.status !== 'Active') {
    throw new AcceptApplicantError('Active administrator access is required', 403);
  }

  return { adminClient, caller: profile };
};

const removeCreatedStaffProfile = async (client: SupabaseClient, id?: string) => {
  if (id) await client.from('staff_profiles').delete().eq('id', id);
};

export async function acceptApplicant(input: { authorization?: string; applicantId?: string }) {
  if (!input.applicantId) throw new AcceptApplicantError('Missing applicantId', 400);
  const { adminClient, caller } = await requireActiveAdmin(input.authorization);

  const { data: applicant, error: applicantError } = await adminClient
    .from('applicants')
    .select('*')
    .eq('id', input.applicantId)
    .single();
  if (applicantError || !applicant) throw new AcceptApplicantError('Applicant not found', 404);

  const { data: existingStaff } = await adminClient
    .from('staff_profiles')
    .select('*')
    .eq('applicant_id', applicant.id)
    .maybeSingle();

  if (applicant.status === 'Accepted' && existingStaff) {
    return { applicant, staffProfile: existingStaff };
  }
  if (applicant.status !== 'Compliance') {
    throw new AcceptApplicantError('Applicant must reach the Compliance stage before staff approval', 409);
  }

  let userId = applicant.user_id;
  if (!userId) {
    const { data: userByEmail } = await adminClient
      .from('users')
      .select('id')
      .eq('email', String(applicant.email).toLowerCase())
      .maybeSingle();
    userId = userByEmail?.id;
  }
  if (!userId) throw new AcceptApplicantError('Applicant has no linked authenticated user profile', 409);

  const { data: targetUser, error: targetUserError } = await adminClient
    .from('users')
    .select('id, role, status')
    .eq('id', userId)
    .single();
  if (targetUserError || !targetUser) throw new AcceptApplicantError('Applicant user profile was not found', 409);
  if (targetUser.role !== 'Applicant') {
    throw new AcceptApplicantError('Only an Applicant account can be promoted to staff', 409);
  }
  if (targetUser.status !== 'Active') {
    throw new AcceptApplicantError('Applicant account must be Active before staff approval', 409);
  }

  const { data: staffProfile, error: staffError } = await adminClient
    .from('staff_profiles')
    .upsert({
      user_id: userId,
      applicant_id: applicant.id,
      full_name: applicant.full_name,
      email: String(applicant.email).toLowerCase(),
      phone: applicant.phone || '',
      address: '',
      role: applicant.position || 'Care Assistant',
      employment_status: 'Active',
      dbs_status: 'Pending',
      right_to_work: 'Pending',
      training_status: 'Pending',
      joined_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (staffError || !staffProfile) throw new AcceptApplicantError('Failed to create staff profile', 500);

  const createdNewStaffProfile = !existingStaff;
  const { data: acceptedApplicant, error: statusError } = await adminClient
    .from('applicants')
    .update({ status: 'Accepted', updated_at: new Date().toISOString() })
    .eq('id', applicant.id)
    .eq('status', 'Compliance')
    .select('*')
    .single();
  if (statusError || !acceptedApplicant) {
    if (createdNewStaffProfile) await removeCreatedStaffProfile(adminClient, staffProfile.id);
    throw new AcceptApplicantError('Failed to approve applicant', 409);
  }

  const { error: userUpdateError } = await adminClient
    .from('users')
    .update({ role: 'Staff', status: 'Active', full_name: applicant.full_name, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (userUpdateError) {
    await adminClient.from('applicants').update({ status: 'Compliance' }).eq('id', applicant.id);
    if (createdNewStaffProfile) await removeCreatedStaffProfile(adminClient, staffProfile.id);
    throw new AcceptApplicantError('Failed to promote user account', 500);
  }

  await adminClient.from('documents').update({ staff_profile_id: staffProfile.id }).eq('user_id', userId);
  await adminClient.from('activity_logs').insert({
    actor_user_id: caller.id,
    actor_name: caller.full_name || 'Administrator',
    type: 'status',
    action: `STAFFING: ${applicant.full_name} approved from Compliance and promoted to staff.`
  });

  return { applicant: acceptedApplicant, staffProfile };
}
