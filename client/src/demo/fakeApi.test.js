import { describe, it, expect, beforeEach } from 'vitest';
import { createFakeApi, DEMO_LOGIN } from './fakeApi.js';

// Armazenamento em memória com a mesma interface do localStorage.
const memoryStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
};

describe('API fake da demo (serviços reais + banco em memória)', () => {
  let storage;
  let api;
  const call = (method, path, body) => api.handle(method, path, body);
  const login = () => call('POST', '/auth/login', JSON.stringify({ email: DEMO_LOGIN.email, senha: DEMO_LOGIN.senha }));

  beforeEach(() => {
    storage = memoryStorage();
    api = createFakeApi({ storage });
  });

  it('exige login e aceita as credenciais de demonstração', async () => {
    expect(await call('GET', '/auth/me')).toEqual({ status: 401, body: { error: 'Não autenticado.' } });
    expect((await call('POST', '/auth/login', JSON.stringify({ email: DEMO_LOGIN.email, senha: 'errada' }))).status).toBe(401);

    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: DEMO_LOGIN.email });
    expect((await call('GET', '/auth/me')).body).toEqual(res.body);
  });

  it('serve os feeds com posts marcados como curtidos ou não', async () => {
    await login();
    const foryou = (await call('GET', '/posts?feed=foryou')).body;
    const seguindo = (await call('GET', '/posts?feed=seguindo')).body;

    expect(foryou.length).toBeGreaterThan(3);
    expect(foryou[0]).toHaveProperty('curtido');
    expect(seguindo.length).toBeGreaterThan(0);
    expect(seguindo.every((p) => p.autor.id !== api.currentUserId())).toBe(true);
  });

  it('curtir, descurtir, comentar e criar post usam as regras reais', async () => {
    await login();
    const [post] = (await call('GET', '/posts?feed=seguindo')).body;

    const liked = await call('POST', `/posts/${post.id}/like`);
    expect(liked.body.likes).toBe(post.likes + (post.curtido ? 0 : 1));
    expect((await call('DELETE', `/posts/${post.id}/like`)).body.likes).toBe(post.likes - (post.curtido ? 1 : 0));

    expect((await call('POST', `/posts/${post.id}/comments`, JSON.stringify({ texto: '  ' }))).status).toBe(400);
    expect((await call('POST', `/posts/${post.id}/comments`, JSON.stringify({ texto: 'massa' }))).status).toBe(201);
    expect((await call('GET', `/posts/${post.id}`)).body.comentarios[0].texto).toBe('massa');

    const created = await call('POST', '/posts', JSON.stringify({ texto: 'novo', musicName: 'Help!', artistName: 'The Beatles', postType: 'música', nota: 5 }));
    expect(created.status).toBe(201);
    const meus = (await call('GET', `/users/${api.currentUserId()}`)).body.posts;
    expect(meus[0]).toMatchObject({ id: created.body.id, texto: 'novo', titulo: 'Help!' });
  });

  it('não deixa apagar post de outra pessoa', async () => {
    await login();
    const [post] = (await call('GET', '/posts?feed=seguindo')).body;
    expect(await call('DELETE', `/posts/${post.id}`)).toMatchObject({ status: 403 });
  });

  it('cadastro com validação de senha, perfil e seguir', async () => {
    const fraca = new FormData();
    fraca.append('nome', 'Nova');
    fraca.append('email', 'nova@demo.com');
    fraca.append('senha', 'fraca');
    expect((await call('POST', '/auth/register', fraca)).status).toBe(400);

    const form = new FormData();
    form.append('nome', 'Nova');
    form.append('email', 'nova@demo.com');
    form.append('senha', 'Senha!1');
    const created = await call('POST', '/auth/register', form);
    expect(created.status).toBe(201);

    const [alvo] = (await call('GET', '/posts?feed=foryou')).body.map((p) => p.autor);
    expect((await call('POST', `/users/${alvo.id}/follow`)).status).toBe(204);
    const perfil = (await call('GET', `/users/${alvo.id}`)).body;
    expect(perfil.seguindoIds).toContain(alvo.id);
    expect(perfil.usuario.fotoPerfil).toBeTruthy();
  });

  it('notificações: contador de não lidas e marcar como lidas', async () => {
    await login();
    expect((await call('GET', '/notifications/unread-count')).body.count).toBeGreaterThan(0);
    expect((await call('GET', '/notifications')).body.length).toBeGreaterThan(0);
    expect((await call('POST', '/notifications/read-all')).status).toBe(204);
    expect((await call('GET', '/notifications/unread-count')).body.count).toBe(0);
  });

  it('busca músicas no catálogo local', async () => {
    await login();
    const results = (await call('GET', '/music/search?q=beatles')).body;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toEqual(expect.objectContaining({ titulo: expect.any(String), artista: expect.stringMatching(/Beatles/i) }));
    expect((await call('GET', '/music/search?q=')).body).toEqual([]);
  });

  it('guarda o estado entre recarregamentos e permite restaurar', async () => {
    await login();
    await call('POST', '/notifications/read-all');

    const reloaded = createFakeApi({ storage });
    expect((await reloaded.handle('GET', '/auth/me')).status).toBe(200);
    expect((await reloaded.handle('GET', '/notifications/unread-count')).body.count).toBe(0);

    reloaded.reset();
    expect((await createFakeApi({ storage }).handle('GET', '/auth/me')).status).toBe(401);
  });

  it('logout encerra a sessão e rotas desconhecidas dão 404', async () => {
    await login();
    expect((await call('POST', '/auth/logout')).status).toBe(204);
    expect((await call('GET', '/auth/me')).status).toBe(401);
    expect(await call('GET', '/xpto')).toEqual({ status: 404, body: { error: 'Rota não encontrada.' } });
  });

  it('funciona sem armazenamento disponível', async () => {
    const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); }, removeItem: () => {} };
    const semStorage = createFakeApi({ storage: broken });
    expect((await semStorage.handle('POST', '/auth/login', JSON.stringify(DEMO_LOGIN))).status).toBe(200);
  });
});
