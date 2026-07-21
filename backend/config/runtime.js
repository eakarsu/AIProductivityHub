function validateRuntimeEnvironment() {
  const production = process.env.NODE_ENV === 'production';
  const problems = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace-with')) {
    problems.push('JWT_SECRET must contain at least 32 characters');
  }
  if (process.env.JWT_PREVIOUS_SECRET && process.env.JWT_PREVIOUS_SECRET.length < 32) {
    problems.push('JWT_PREVIOUS_SECRET must contain at least 32 characters when provided');
  }
  const personalProviderConfigured = [
    'GOOGLE_CALENDAR_REFRESH_TOKEN', 'OUTLOOK_REFRESH_TOKEN', 'GOOGLE_FIT_ACCESS_TOKEN'
  ].some((name) => Boolean(process.env[name]));
  if (personalProviderConfigured && !/^\d+$/.test(process.env.INTEGRATION_OWNER_USER_ID || '')) {
    problems.push('INTEGRATION_OWNER_USER_ID is required when personal provider credentials are configured');
  }
  if (production && !process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
    problems.push('DATABASE_URL or DB_PASSWORD is required in production');
  }
  if (production && process.env.DB_PASSWORD === 'change-me') {
    problems.push('DB_PASSWORD must not use the environment-template placeholder in production');
  }
  if (production && (!process.env.SMTP_HOST || !process.env.SMTP_FROM)) {
    problems.push('SMTP_HOST and SMTP_FROM are required in production for account recovery');
  }
  if (production && process.env.EXPOSE_DEMO_TOKENS === 'true') {
    problems.push('EXPOSE_DEMO_TOKENS cannot be enabled in production');
  }
  if (problems.length) {
    const error = new Error(`Invalid runtime configuration: ${problems.join('; ')}`);
    error.code = 'INVALID_RUNTIME_CONFIGURATION';
    throw error;
  }
}

module.exports = { validateRuntimeEnvironment };
