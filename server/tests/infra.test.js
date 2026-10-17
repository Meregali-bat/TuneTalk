import { describe, it, expect, vi } from 'vitest';
import { createCloudinaryUploader } from '../src/infra/cloudinaryUploader.js';
import { createDatabase } from '../src/infra/database.js';
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

describe('database', () => {
  it('executa a query no pool e devolve só as linhas', async () => {
    const pool = { execute: vi.fn().mockResolvedValue([[{ id: 1 }], []]) };
    const db = createDatabase(pool);
    expect(await db.query('SELECT 1', { a: 1 })).toEqual([{ id: 1 }]);
    expect(pool.execute).toHaveBeenCalledWith('SELECT 1', { a: 1 });
  });

  it('usa parâmetros vazios por padrão', async () => {
    const pool = { execute: vi.fn().mockResolvedValue([[], []]) };
    await createDatabase(pool).query('SELECT 1');
    expect(pool.execute).toHaveBeenCalledWith('SELECT 1', {});
  });
});

describe('loadConfig', () => {
  it('lê as variáveis de ambiente com padrões razoáveis', () => {
    const config = loadConfig({ PORT: '4000', DB_HOST: 'db', SESSION_SECRET: 's' });
    expect(config.port).toBe(4000);
    expect(config.db.host).toBe('db');
    expect(config.sessionSecret).toBe('s');
    expect(config.isProduction).toBe(false);
  });

  it('exige SESSION_SECRET em produção', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/SESSION_SECRET/);
  });

  it('usa porta 3000 por padrão', () => {
    expect(loadConfig({}).port).toBe(3000);
  });
});
