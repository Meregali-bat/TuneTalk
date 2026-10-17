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

    const comentar = (texto) => call('POST', '/posts', JSON.stringify({ texto, parentId: post.id }));
    expect((await comentar('  ')).status).toBe(400);
    expect((await comentar('massa')).status).toBe(201);
    const thread = (await call('GET', `/posts/${post.id}`)).body;
    expect(thread.respostas.at(-1)).toMatchObject({ texto: 'massa', parentId: post.id, titulo: null, nota: null });
    expect(thread.post.quantidadeComentarios).toBe(thread.respostas.length);
    expect((await call('GET', '/posts?feed=foryou')).body.some((p) => p.texto === 'massa')).toBe(false);

    const created = await call('POST', '/posts', JSON.stringify({ texto: 'novo', musicName: 'Help!', artistName: 'The Beatles', postType: 'música', nota: 5 }));
    expect(created.status).toBe(201);
    const meus = (await call('GET', `/users/${api.currentUserId()}`)).body.posts;
    expect(meus[0]).toMatchObject({ id: created.body.id, texto: 'novo', titulo: 'Help!' });

    const soTexto = await call('POST', '/posts', JSON.stringify({ texto: 'só texto' }));
    expect(soTexto.status).toBe(201);
    expect((await call('GET', `/posts/${soTexto.body.id}`)).body.post).toMatchObject({ texto: 'só texto', titulo: null, nota: null });
  });

  it('não deixa apagar post de outra pessoa', async () => {
    await login();
    const [post] = (await call('GET', '/posts?feed=seguindo')).body;
    expect(await call('DELETE', `/posts/${post.id}`)).toMatchObject({ status: 403 });
  });

  it('cadastro só com email e senha, escolha do nome de usuário e seguir', async () => {
    const register = (senha) => call('POST', '/auth/register', JSON.stringify({ email: 'nova@demo.com', senha }));
    expect((await register('fraca')).status).toBe(400);

    const created = await register('Senha!1');
    expect(created).toMatchObject({ status: 201, body: { nome: null, email: 'nova@demo.com' } });

    expect(await call('GET', '/posts?feed=foryou')).toEqual({ status: 403, body: { error: 'Escolha um nome de usuário para continuar.' } });
    expect((await call('PUT', '/users/me/username', JSON.stringify({ nome: 'ana_souza_' }))).status).toBe(200);
    expect((await call('PUT', '/users/me/username', JSON.stringify({ nome: 'nova user' }))).status).toBe(400);
    expect((await call('GET', '/auth/me')).body.nome).toBe('ana_souza_');

    const [alvo] = (await call('GET', '/posts?feed=foryou')).body.map((p) => p.autor);
    expect((await call('POST', `/users/${alvo.id}/follow`)).status).toBe(204);
    const perfil = (await call('GET', `/users/${alvo.id}`)).body;
    expect(perfil.seguindoIds).toContain(alvo.id);
  });

  it('não deixa escolher um nome que já existe', async () => {
    await call('POST', '/auth/register', JSON.stringify({ email: 'nova@demo.com', senha: 'Senha!1' }));
    expect(await call('PUT', '/users/me/username', JSON.stringify({ nome: 'Ana.Souza' })))
      .toEqual({ status: 409, body: { error: 'Esse nome de usuário já está em uso.' } });
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
