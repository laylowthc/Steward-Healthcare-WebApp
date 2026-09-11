export const resolveStaffHubInviteRedirect = (env: Record<string, string | undefined> = process.env) => {
  const configuredUrl = env.STAFFHUB_APP_URL?.trim();
  const productionHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const baseUrl = configuredUrl || (productionHost ? `https://${productionHost}` : '');

  if (!baseUrl) {
    throw new Error('StaffHub production URL is not configured. Set STAFFHUB_APP_URL or deploy on Vercel with VERCEL_PROJECT_PRODUCTION_URL available.');
  }

  const url = new URL('/invite', baseUrl);
  return url.toString();
};
