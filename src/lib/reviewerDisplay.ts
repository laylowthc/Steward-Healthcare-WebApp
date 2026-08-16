const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isReviewerUuid = (value: string | undefined): value is string => Boolean(value && uuidPattern.test(value));

export const reviewerDisplayName = (reviewerId: string | undefined, names: Record<string, string>) => {
  if (!reviewerId) return 'Not reviewed';
  if (names[reviewerId]) return names[reviewerId];
  return isReviewerUuid(reviewerId) ? 'SHC administrator' : reviewerId;
};
