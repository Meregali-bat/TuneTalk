import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserService } from '../../src/services/userService.js';

const ana = { id: 1, nome: 'Ana', fotoPerfil: 'ana.png', bio: 'oi' };
const bia = { id: 2, nome: 'Bia', fotoPerfil: 'bia.png', bio: null };

describe('userService', () => {
  let users;
  let follows;
  let postService;
  let notifications;
  let service;

  beforeEach(() => {
    users = {
      findById: vi.fn(async (id) => ({ 1: ana, 2: bia })[id] ?? null),
      update: vi.fn(),
      isNameTaken: vi.fn().mockResolvedValue(false),
    };
    follows = {
      isFollowing: vi.fn().mockResolvedValue(false),
      follow: vi.fn(),
      unfollow: vi.fn(),
      followingIds: vi.fn().mockResolvedValue([2]),
      listFollowers: vi.fn().mockResolvedValue([bia]),
      listFollowing: vi.fn().mockResolvedValue([]),
      countFollowers: vi.fn().mockResolvedValue(1),
      countFollowing: vi.fn().mockResolvedValue(0),
    };
    postService = { byAuthor: vi.fn().mockResolvedValue([{ id: 10 }]) };
    notifications = { create: vi.fn() };
    service = createUserService({ users, follows, postService, notifications });
  });

  describe('getProfile', () => {
    it('agrega usuário, posts, contadores, listas e quem o visitante segue', async () => {
      const profile = await service.getProfile(1, 2);

      expect(postService.byAuthor).toHaveBeenCalledWith(1, 2);
      expect(follows.followingIds).toHaveBeenCalledWith(2);
      expect(profile).toEqual({
        usuario: ana,
        posts: [{ id: 10 }],
        quantidadePosts: 1,
        quantidadeSeguidores: 1,
        quantidadeSeguindo: 0,
        seguidores: [bia],
        seguindo: [],
        seguindoIds: [2],
      });
    });

    it('lança 404 para usuário inexistente', async () => {
      await expect(service.getProfile(99, 1)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('setUsername', () => {
    it('grava o nome de usuário sem espaços em volta', async () => {
      expect(await service.setUsername(1, '  ana.souza ')).toEqual({ id: 1, nome: 'ana.souza' });
      expect(users.isNameTaken).toHaveBeenCalledWith('ana.souza', 1);
      expect(users.update).toHaveBeenCalledWith(1, { nome: 'ana.souza' });
    });

    it('rejeita nome fora das regras com a regra que faltou', async () => {
      await expect(service.setUsername(1, 'an')).rejects.toMatchObject({ status: 400, message: 'Use de 3 a 30 caracteres.' });
      await expect(service.setUsername(1, 'ana souza')).rejects.toMatchObject({
        status: 400,
        message: 'Use só letras sem acento, números, ponto e underline.',
      });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('rejeita nome já usado por outra pessoa', async () => {
      users.isNameTaken.mockResolvedValue(true);
      await expect(service.setUsername(1, 'bia')).rejects.toMatchObject({
        status: 409,
        message: 'Esse nome de usuário já está em uso.',
      });
    });
  });

  describe('updateProfile', () => {
    it('atualiza nome, bio e foto', async () => {
      const updated = await service.updateProfile(1, { nome: 'ana_b', bio: 'nova', fotoPerfil: 'nova.png' });
      expect(users.update).toHaveBeenCalledWith(1, { nome: 'ana_b', bio: 'nova', fotoPerfil: 'nova.png' });
      expect(updated).toEqual({ id: 1, nome: 'ana_b', bio: 'nova', fotoPerfil: 'nova.png' });
    });

    it('valida o nome novo com as mesmas regras do nome de usuário', async () => {
      await expect(service.updateProfile(1, { nome: 'ana b' })).rejects.toMatchObject({ status: 400 });
      users.isNameTaken.mockResolvedValue(true);
      await expect(service.updateProfile(1, { nome: 'bia' })).rejects.toMatchObject({ status: 409 });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('não revalida um nome antigo que não mudou (mesmo fora das regras novas)', async () => {
      users.findById.mockResolvedValue({ ...ana, nome: 'Ana Souza' });
      await service.updateProfile(1, { nome: 'Ana Souza', bio: 'x' });
      expect(users.isNameTaken).not.toHaveBeenCalled();
      expect(users.update).toHaveBeenCalledWith(1, { nome: 'Ana Souza', bio: 'x', fotoPerfil: 'ana.png' });
    });

    it('mantém a foto e o nome atuais quando não enviados', async () => {
      await service.updateProfile(1, { nome: '', bio: 'nova' });
      expect(users.update).toHaveBeenCalledWith(1, { nome: 'Ana', bio: 'nova', fotoPerfil: 'ana.png' });
    });
  });

  describe('follow', () => {
    it('segue e notifica o seguido', async () => {
      await service.follow(1, 2);
      expect(follows.follow).toHaveBeenCalledWith(1, 2);
      expect(notifications.create).toHaveBeenCalledWith({
        destinatarioId: 2,
        autorId: 1,
        tipo: 'new_follower',
        conteudo: 'seguiu você',
      });
    });

    it('não permite seguir a si mesmo', async () => {
      await expect(service.follow(1, 1)).rejects.toMatchObject({ status: 400 });
    });

    it('lança 404 para usuário inexistente', async () => {
      await expect(service.follow(1, 99)).rejects.toMatchObject({ status: 404 });
    });

    it('lança 409 se já segue', async () => {
      follows.isFollowing.mockResolvedValue(true);
      await expect(service.follow(1, 2)).rejects.toMatchObject({ status: 409 });
      expect(follows.follow).not.toHaveBeenCalled();
    });
  });

  describe('unfollow', () => {
    it('deixa de seguir', async () => {
      follows.isFollowing.mockResolvedValue(true);
      await service.unfollow(1, 2);
      expect(follows.unfollow).toHaveBeenCalledWith(1, 2);
    });

    it('lança 409 se não segue', async () => {
      await expect(service.unfollow(1, 2)).rejects.toMatchObject({ status: 409 });
    });
  });
});
