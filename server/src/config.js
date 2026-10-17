const DEFAULT_PROFILE_PHOTO =
  'https://res.cloudinary.com/dorm41uma/image/upload/v1701558934/jyqonmjasuobge6nmvi4.png';

export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && !env.SESSION_SECRET) {
    throw new Error('Defina SESSION_SECRET no ambiente de produção.');
  }

  return {
    isProduction,
    port: Number(env.PORT) || 3000,
    sessionSecret: env.SESSION_SECRET || 'dev-only-secret',
    // Ative quando o app estiver atrás de HTTPS; com HTTP puro o navegador descartaria o cookie.
    secureCookies: env.COOKIE_SECURE === 'true',
    defaultProfilePhoto: env.DEFAULT_PROFILE_PHOTO || DEFAULT_PROFILE_PHOTO,
    db: {
      host: env.DB_HOST,
      user: env.DB_USER,
      database: env.DB_NAME,
      password: env.DB_PASS,
    },
    cloudinary: {
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    },
  };
}
