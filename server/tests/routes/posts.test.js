import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';
import { HttpError } from '../../src/errors.js';

describe('rotas /api/posts', () => {
  let app;
  let deps;
  let agent;

  beforeEach(async () => {
    ({ app, deps } = buildTestApp());
    agent = await loggedAgent(app);
  });

  it('exige autenticação', async () => {
    await request(app).get('/api/posts?feed=foryou').expect(401);
    await request(app).post('/api/posts/1/like').expect(401);
  });

  describe('GET /api/posts', () => {
    it('feed=foryou usa o feed para você', async () => {
      deps.postService.forYou.mockResolvedValue([{ id: 1 }]);
      const res = await agent.get('/api/posts?feed=foryou');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1 }]);
      expect(deps.postService.forYou).toHaveBeenCalledWith(1);
    });

    it('feed=seguindo usa o feed de quem o usuário segue', async () => {
      deps.postService.following.mockResolvedValue([{ id: 2 }]);
      const res = await agent.get('/api/posts?feed=seguindo');
      expect(res.body).toEqual([{ id: 2 }]);
      expect(deps.postService.following).toHaveBeenCalledWith(1);
    });

    it('feed desconhecido responde 400', async () => {
      await agent.get('/api/posts?feed=xpto').expect(400);
    });
  });

  it('GET /api/posts?tag= lista os posts da hashtag', async () => {
    deps.postService.byHashtag.mockResolvedValue([{ id: 1 }]);
    const res = await agent.get(`/api/posts?tag=${encodeURIComponent('músicaboa')}`);
    expect(res.body).toEqual([{ id: 1 }]);
    expect(deps.postService.byHashtag).toHaveBeenCalledWith('músicaboa', 1);
  });

  it('POST /api/posts cria o post', async () => {
    deps.postService.create.mockResolvedValue(42);
    const body = { texto: 'oi', musicName: 'Help!', nota: '4' };
    const res = await agent.post('/api/posts').send(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 42 });
    expect(deps.postService.create).toHaveBeenCalledWith(1, body);
  });

  describe('GET /api/posts/:id', () => {
    it('devolve o post com comentários', async () => {
      deps.postService.get.mockResolvedValue({ post: { id: 3 }, comentarios: [] });
      const res = await agent.get('/api/posts/3');
      expect(res.body).toEqual({ post: { id: 3 }, comentarios: [] });
      expect(deps.postService.get).toHaveBeenCalledWith(3, 1);
    });

    it('responde 404 quando o serviço não acha', async () => {
      deps.postService.get.mockRejectedValue(new HttpError(404, 'Post não encontrado.'));
      const res = await agent.get('/api/posts/3');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Post não encontrado.');
    });

    it('responde 400 para id inválido', async () => {
      await agent.get('/api/posts/abc').expect(400);
      expect(deps.postService.get).not.toHaveBeenCalled();
    });
  });

  it('DELETE /api/posts/:id apaga o post', async () => {
    await agent.delete('/api/posts/3').expect(204);
    expect(deps.postService.remove).toHaveBeenCalledWith(3, 1);
  });

  it('POST /api/posts/:id/like curte e devolve o total', async () => {
    deps.postService.like.mockResolvedValue(6);
    const res = await agent.post('/api/posts/3/like');
    expect(res.body).toEqual({ likes: 6 });
    expect(deps.postService.like).toHaveBeenCalledWith(3, 1);
  });

  it('DELETE /api/posts/:id/like descurte e devolve o total', async () => {
    deps.postService.unlike.mockResolvedValue(5);
    const res = await agent.delete('/api/posts/3/like');
    expect(res.body).toEqual({ likes: 5 });
    expect(deps.postService.unlike).toHaveBeenCalledWith(3, 1);
  });

  it('POST e DELETE /api/posts/:id/pin fixam e desafixam no perfil', async () => {
    await agent.post('/api/posts/3/pin').expect(204);
    expect(deps.postService.pin).toHaveBeenCalledWith(3, 1);
    await agent.delete('/api/posts/3/pin').expect(204);
    expect(deps.postService.unpin).toHaveBeenCalledWith(3, 1);
  });

  it('POST /api/posts/image-upload assina o envio da imagem direto ao Cloudinary', async () => {
    deps.uploader.signUpload.mockReturnValue({ uploadUrl: 'u', fields: {} });
    const res = await agent.post('/api/posts/image-upload');
    expect(res.body).toEqual({ uploadUrl: 'u', fields: {} });
    expect(deps.uploader.signUpload).toHaveBeenCalledWith('post');
  });

  it('POST /api/posts aceita imagem só se o link vier da nossa pasta de posts', async () => {
    deps.postService.create.mockResolvedValue(5);
    deps.uploader.isOwnUrl.mockReturnValueOnce(true).mockReturnValueOnce(false);

    await agent.post('/api/posts').send({ imagemUrl: 'https://res.cloudinary.com/ok.gif' }).expect(201);
    expect(deps.uploader.isOwnUrl).toHaveBeenCalledWith('https://res.cloudinary.com/ok.gif', 'post');

    const res = await agent.post('/api/posts').send({ imagemUrl: 'https://site.com/x.gif' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Imagem inválida. Envie de novo.' });
    expect(deps.postService.create).toHaveBeenCalledTimes(1);
  });

  it('POST /api/posts com parentId cria uma resposta (comentário)', async () => {
    deps.postService.create.mockResolvedValue(9);
    const res = await agent.post('/api/posts').send({ texto: 'massa', parentId: 3 });
    expect(res.status).toBe(201);
    expect(deps.postService.create).toHaveBeenCalledWith(1, { texto: 'massa', parentId: 3 });
  });

  it('a rota antiga de comentários não existe mais', async () => {
    await agent.post('/api/posts/3/comments').send({ texto: 'massa' }).expect(404);
  });

  it('erros inesperados viram 500 sem vazar detalhes', async () => {
    deps.postService.forYou.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:3306'));
    const res = await agent.get('/api/posts?feed=foryou');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro interno do servidor.' });
  });

  it('POST /api/posts/:id/votos vota na enquete', async () => {
    deps.postService.votar = vi.fn().mockResolvedValue({ total: 1, meuVoto: 12 });
    const res = await agent.post('/api/posts/5/votos').send({ opcaoId: 12 }).expect(200);
    expect(res.body).toEqual({ total: 1, meuVoto: 12 });
    expect(deps.postService.votar).toHaveBeenCalledWith(5, 1, 12);
  });
});
