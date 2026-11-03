const DEFAULT_PROFILE_PHOTO =
  'https://res.cloudinary.com/dorm41uma/image/upload/v1701558934/jyqonmjasuobge6nmvi4.png';

function appUrl(env) {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, '');
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:5173';
}

export function loadConfig(env = process.env) {
  // A Vercel define VERCEL=1 no build e nas funções.
  const onVercel = env.VERCEL === '1';
  const isProduction = env.NODE_ENV === 'production' || onVercel;
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
    secureCookies: env.COOKIE_SECURE === 'true' || onVercel,
    // Na Vercel os arquivos do React são servidos pela própria Vercel; em outro host, pelo Express.
    serveClient: isProduction && !onVercel,
    defaultProfilePhoto: env.DEFAULT_PROFILE_PHOTO || DEFAULT_PROFILE_PHOTO,
    databaseUrl: env.DATABASE_URL,
    // "Esqueci minha senha": sem RESEND_API_KEY o email só aparece no terminal.
    resendApiKey: env.RESEND_API_KEY,
    emailFrom: env.EMAIL_FROM || 'TuneTalk <onboarding@resend.dev>',
    // Base dos links enviados por email. Nunca vem do cabeçalho Host da requisição, que pode ser forjado.
    appUrl: appUrl(env),
    cloudinary: {
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    },
  };
}
