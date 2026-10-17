const DEFAULT_PROFILE_PHOTO =
  'https://res.cloudinary.com/dorm41uma/image/upload/v1701558934/jyqonmjasuobge6nmvi4.png';

export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && !env.SESSION_SECRET) {
    throw new Error('Defina SESSION_SECRET no ambiente de produção.');
  }
  if (isProduction && !env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL no ambiente de produção.');
  }

  return {
    isProduction,
    port: Number(env.PORT) || 3000,
    sessionSecret: env.SESSION_SECRET || 'dev-only-secret',
    // Ative quando o app estiver atrás de HTTPS; com HTTP puro o navegador descartaria o cookie.
    secureCookies: env.COOKIE_SECURE === 'true',
    defaultProfilePhoto: env.DEFAULT_PROFILE_PHOTO || DEFAULT_PROFILE_PHOTO,
    databaseUrl: env.DATABASE_URL,
    cloudinary: {
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    },
  };
}
