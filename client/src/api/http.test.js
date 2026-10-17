import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, request } from './http.js';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('request', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('faz GET em /api e devolve o JSON', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { ok: 1 }));
    expect(await request('/posts')).toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({ method: 'GET', credentials: 'same-origin' }));
  });

  it('envia corpo JSON com o header correto', async () => {
    fetch.mockResolvedValue(jsonResponse(201, { id: 1 }));
    await request('/posts', { method: 'POST', body: { texto: 'oi' } });
    const [, init] = fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"texto":"oi"}');
  });

  it('envia FormData sem definir Content-Type (o navegador define o boundary)', async () => {
    fetch.mockResolvedValue(jsonResponse(200, {}));
    const form = new FormData();
    await request('/users/me', { method: 'PUT', form });
    const [, init] = fetch.mock.calls[0];
    expect(init.body).toBe(form);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('devolve null em 204', async () => {
    fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('sem corpo'); } });
    expect(await request('/x', { method: 'DELETE' })).toBeNull();
  });

  it('lança ApiError com status e mensagem do servidor', async () => {
    fetch.mockResolvedValue(jsonResponse(401, { error: 'Usuário ou senha incorretos.' }));
    const error = await request('/auth/login').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Usuário ou senha incorretos.');
  });

  it('usa mensagem genérica quando o erro não tem corpo JSON', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('html'); } });
    await expect(request('/x')).rejects.toMatchObject({ status: 500, message: 'Erro inesperado. Tente novamente.' });
  });
});
