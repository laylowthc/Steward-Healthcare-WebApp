import { supabase } from './supabase';
import { isReviewerUuid } from './reviewerDisplay';

export { reviewerDisplayName } from './reviewerDisplay';

export async function loadReviewerNames(reviewerIds: Array<string | undefined>) {
  const ids = Array.from(new Set(reviewerIds.filter(isReviewerUuid)));
  if (!ids.length) return {};
  const { data, error } = await supabase.from('users').select('id, full_name').in('id', ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map(row => [row.id, row.full_name || 'SHC administrator']));
}
