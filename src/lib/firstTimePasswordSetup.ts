type UserWithMetadata = {
  user_metadata?: Record<string, unknown>;
};

export const validateFirstTimePassword = (password: string, confirmation: string) => {
  if (password.length < 10) return 'Your password must contain at least 10 characters.';
  if (!/[a-z]/.test(password)) return 'Your password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Your password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Your password must include a number.';
  if (password !== confirmation) return 'The passwords do not match.';
  return null;
};

export const requiresFirstTimePasswordSetup = (user: UserWithMetadata | null | undefined) => {
  const marker = user?.user_metadata?.requires_password_setup;
  return marker === true || marker === 'true';
};
