import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi, musicApi, notificationsApi, postsApi, usersApi } from './index.js';
import { request } from './http.js';

vi.mock('./http.js', async (importOriginal) => ({
  ...(await importOriginal()),
  request: vi.fn().mockResolvedValue('ok'),
}));

describe('endpoints da API', () => {
  beforeEach(() => request.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['authApi.me', () => authApi.me(), ['/auth/me']],
    ['authApi.login', () => authApi.login('a@a.com', 's'), ['/auth/login', { method: 'POST', body: { email: 'a@a.com', senha: 's' } }]],
    ['authApi.logout', () => authApi.logout(), ['/auth/logout', { method: 'POST' }]],
    ['postsApi.feed', () => postsApi.feed('seguindo'), ['/posts?feed=seguindo']],
    ['postsApi.get', () => postsApi.get(3), ['/posts/3']],
    ['postsApi.byHashtag', () => postsApi.byHashtag('músicaboa'), [`/posts?tag=${encodeURIComponent('músicaboa')}`]],
    ['postsApi.create', () => postsApi.create({ texto: 'x' }), ['/posts', { method: 'POST', body: { texto: 'x' } }]],
    ['postsApi.remove', () => postsApi.remove(3), ['/posts/3', { method: 'DELETE' }]],
    ['postsApi.like', () => postsApi.like(3), ['/posts/3/like', { method: 'POST' }]],
    ['postsApi.unlike', () => postsApi.unlike(3), ['/posts/3/like', { method: 'DELETE' }]],
    ['usersApi.profile', () => usersApi.profile(2), ['/users/2']],
    ['usersApi.profile (pelo @)', () => usersApi.profile('@bia.souza'), ['/users/by-name/bia.souza']],
    ['usersApi.search', () => usersApi.search('@bi a'), ['/users?q=%40bi%20a']],
    ['authApi.forgotPassword', () => authApi.forgotPassword('a@x.com'), ['/auth/forgot-password', { method: 'POST', body: { email: 'a@x.com' } }]],
    ['authApi.resetPassword', () => authApi.resetPassword('tk', 'Nova!123'), ['/auth/reset-password', { method: 'POST', body: { token: 'tk', novaSenha: 'Nova!123' } }]],
    ['usersApi.changePassword', () => usersApi.changePassword('A!1aaa', 'B!2bbb'), ['/users/me/password', { method: 'PUT', body: { senhaAtual: 'A!1aaa', novaSenha: 'B!2bbb' } }]],
    ['usersApi.follow', () => usersApi.follow(2), ['/users/2/follow', { method: 'POST' }]],
    ['usersApi.unfollow', () => usersApi.unfollow(2), ['/users/2/follow', { method: 'DELETE' }]],
    ['notificationsApi.list', () => notificationsApi.list(), ['/notifications']],
    ['notificationsApi.readAll', () => notificationsApi.readAll(), ['/notifications/read-all', { method: 'POST' }]],
    ['musicApi.search', () => musicApi.search('a b'), ['/music/search?q=a%20b']],
    ['musicApi.search (álbuns)', () => musicApi.search('abbey', 'album'), ['/music/search?q=abbey&tipo=album']],
  ])('%s chama o endpoint certo', async (_, call, args) => {
    await call();
    expect(request).toHaveBeenCalledWith(...args);
  });

  it('authApi.register envia só email e senha', async () => {
    await authApi.register({ email: 'a@a.com', senha: 's' });
    expect(request).toHaveBeenCalledWith('/auth/register', { method: 'POST', body: { email: 'a@a.com', senha: 's' } });
  });

  it('usersApi.setUsername define o nome de usuário', async () => {
    await usersApi.setUsername('ana');
    expect(request).toHaveBeenCalledWith('/users/me/username', { method: 'PUT', body: { nome: 'ana' } });
  });

  it('usersApi.updateMe envia os dados (com o link da foto já enviada) em JSON', async () => {
    await usersApi.updateMe({ nome: 'ana', bio: 'oi', fotoPerfil: 'https://res.cloudinary.com/x.gif' });
    expect(request).toHaveBeenCalledWith('/users/me', {
      method: 'PUT', body: { nome: 'ana', bio: 'oi', fotoPerfil: 'https://res.cloudinary.com/x.gif' },
    });
  });

  it('usersApi.uploadBanner usa a assinatura de capa', async () => {
    request.mockResolvedValueOnce({ uploadUrl: 'https://api.cloudinary.com/x', fields: {} });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/c.jpg' }) }));
    expect(await usersApi.uploadBanner(new File(['c'], 'c.jpg'))).toBe('https://res.cloudinary.com/c.jpg');
    expect(request).toHaveBeenCalledWith('/users/me/banner-upload', { method: 'POST' });
  });

  it('postsApi.uploadImage usa a assinatura de imagem de post', async () => {
    request.mockResolvedValueOnce({ uploadUrl: 'https://api.cloudinary.com/x', fields: {} });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/p.gif' }) }));
    expect(await postsApi.uploadImage(new File(['g'], 'p.gif'))).toBe('https://res.cloudinary.com/p.gif');
    expect(request).toHaveBeenCalledWith('/posts/image-upload', { method: 'POST' });
  });

  describe('usersApi.uploadPhoto (direto para o Cloudinary)', () => {
    const file = new File(['gif'], 'eu.gif', { type: 'image/gif' });
    let fetchMock;

    beforeEach(() => {
      request.mockResolvedValueOnce({ uploadUrl: 'https://api.cloudinary.com/v1_1/t/image/upload', fields: { api_key: 'k', signature: 's' } });
      fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
    });

    it('pede a assinatura ao servidor, envia o arquivo com ela e devolve o link', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/t/eu.gif' }) });

      expect(await usersApi.uploadPhoto(file)).toBe('https://res.cloudinary.com/t/eu.gif');
      expect(request).toHaveBeenCalledWith('/users/me/photo-upload', { method: 'POST' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.cloudinary.com/v1_1/t/image/upload');
      expect(init.method).toBe('POST');
      expect(init.body.get('api_key')).toBe('k');
      expect(init.body.get('signature')).toBe('s');
      expect(init.body.get('file')).toBe(file);
    });

    it('explica quando o Cloudinary recusa por tamanho', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'File size too large. Got 12000000. Maximum is 10485760.' } }) });
      await expect(usersApi.uploadPhoto(file)).rejects.toThrow('A imagem pode ter no máximo 10 MB.');
    });

    it('outros erros do Cloudinary viram uma mensagem simples', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'Invalid image file' } }) });
      await expect(usersApi.uploadPhoto(file)).rejects.toThrow('Não foi possível enviar essa imagem. Tente outra.');
    });
  });

  it('musicApi.preview pede um link novo da prévia', async () => {
    request.mockResolvedValueOnce({ preview: 'novo.mp3' });
    expect(await musicApi.preview('Help!', 'The Beatles')).toBe('novo.mp3');
    expect(request).toHaveBeenCalledWith('/music/preview?titulo=Help!&artista=The%20Beatles');
  });

  it('notificationsApi.unreadCount devolve só o número', async () => {
    request.mockResolvedValueOnce({ count: 4 });
    expect(await notificationsApi.unreadCount()).toBe(4);
  });

  it('postsApi.like/unlike devolvem só o total', async () => {
    request.mockResolvedValueOnce({ likes: 7 });
    expect(await postsApi.like(1)).toBe(7);
  });
});
