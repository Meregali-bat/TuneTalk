import { describe, it, expect, vi } from 'vitest';
import { createCloudinaryUploader } from '../src/infra/cloudinaryUploader.js';
import { loadConfig } from '../src/config.js';

describe('cloudinaryUploader', () => {
  const fakeCloudinary = (error, result) => {
    const end = vi.fn();
    const upload_stream = vi.fn((options, callback) => {
      end.mockImplementation(() => callback(error, result));
      return { end };
    });
    return { uploader: { upload_stream }, end };
  };

  it('envia o buffer e devolve a URL segura', async () => {
    const cloudinary = fakeCloudinary(null, { secure_url: 'https://cdn/x.png' });
    const uploader = createCloudinaryUploader(cloudinary);
    const buffer = Buffer.from('img');

    expect(await uploader.upload(buffer)).toBe('https://cdn/x.png');
    expect(cloudinary.end).toHaveBeenCalledWith(buffer);
  });

  it('rejeita quando o Cloudinary falha', async () => {
    const uploader = createCloudinaryUploader(fakeCloudinary(new Error('boom')));
    await expect(uploader.upload(Buffer.from('x'))).rejects.toMatchObject({
      status: 502,
      message: 'Erro ao fazer o upload da imagem',
    });
  });
});

describe('loadConfig', () => {
  it('lê as variáveis de ambiente com padrões razoáveis', () => {
    const config = loadConfig({ PORT: '4000', DATABASE_URL: 'postgresql://u:p@db:5432/tunetalk', SESSION_SECRET: 's' });
    expect(config.port).toBe(4000);
    expect(config.databaseUrl).toBe('postgresql://u:p@db:5432/tunetalk');
    expect(config.sessionSecret).toBe('s');
    expect(config.isProduction).toBe(false);
  });

  it('exige SESSION_SECRET e DATABASE_URL em produção', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: 'x' })).toThrow(/SESSION_SECRET/);
    expect(() => loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 's' })).toThrow(/DATABASE_URL/);
  });

  it('usa porta 3000 por padrão', () => {
    expect(loadConfig({}).port).toBe(3000);
  });

  it('só marca o cookie de sessão como secure quando COOKIE_SECURE=true', () => {
    expect(loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 's', DATABASE_URL: 'x' }).secureCookies).toBe(false);
    expect(loadConfig({ COOKIE_SECURE: 'true' }).secureCookies).toBe(true);
  });

  it('fora da Vercel, em produção o Express também entrega o build do React', () => {
    expect(loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 's', DATABASE_URL: 'x' }).serveClient).toBe(true);
    expect(loadConfig({}).serveClient).toBe(false);
  });

  describe('na Vercel', () => {
    const vercel = { VERCEL: '1', SESSION_SECRET: 's', DATABASE_URL: 'postgresql://neon' };

    it('exige os segredos mesmo sem NODE_ENV', () => {
      expect(() => loadConfig({ VERCEL: '1', DATABASE_URL: 'x' })).toThrow(/SESSION_SECRET/);
      expect(() => loadConfig({ VERCEL: '1', SESSION_SECRET: 's' })).toThrow(/DATABASE_URL/);
    });

    it('usa cookie secure (é sempre HTTPS) e deixa os arquivos do React com a própria Vercel', () => {
      const config = loadConfig(vercel);
      expect(config.secureCookies).toBe(true);
      expect(config.serveClient).toBe(false);
    });
  });

  describe('email e link do "esqueci minha senha"', () => {
    it('lê a chave do Resend e o remetente', () => {
      const config = loadConfig({ RESEND_API_KEY: 're_x', EMAIL_FROM: 'TuneTalk <oi@tunetalk.app>' });
      expect(config.resendApiKey).toBe('re_x');
      expect(config.emailFrom).toBe('TuneTalk <oi@tunetalk.app>');
    });

    it('sem EMAIL_FROM usa o remetente de teste do Resend', () => {
      expect(loadConfig({}).emailFrom).toBe('TuneTalk <onboarding@resend.dev>');
    });

    it('endereço do site: APP_URL, senão o domínio de produção da Vercel, senão o Vite local', () => {
      expect(loadConfig({ APP_URL: 'https://tunetalk.app/' }).appUrl).toBe('https://tunetalk.app');
      expect(loadConfig({ VERCEL_PROJECT_PRODUCTION_URL: 'tune-talk.vercel.app' }).appUrl).toBe('https://tune-talk.vercel.app');
      expect(loadConfig({}).appUrl).toBe('http://localhost:5173');
    });
  });
});
