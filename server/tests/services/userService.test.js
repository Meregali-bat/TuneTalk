import { describe, it, expect, vi, beforeEach } from 'vitest';
import md5 from 'md5';
import { createUserService } from '../../src/services/userService.js';
import { createPasswords } from '../../src/security/passwords.js';

const passwords = createPasswords({ rounds: 4 });

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
      findAuthById: vi.fn().mockResolvedValue({ id: 1, senha: md5('Atual!1') }),
      updatePassword: vi.fn(),
      getFavorites: vi.fn().mockResolvedValue(null),
      setFavorites: vi.fn(),
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
    service = createUserService({ users, follows, postService, notifications, passwords });
  });

  describe('bloqueios', () => {
    const comRelacao = (relacao) => createUserService({
      users, follows, postService, notifications, passwords, restricoes: { relacao: vi.fn().mockResolvedValue(relacao) },
    });

    it('perfil com bloqueio em qualquer sentido vem só com o usuário, sem posts nem listas', async () => {
      for (const relacao of [{ bloqueado: true, meBloqueou: false, silenciado: false }, { bloqueado: false, meBloqueou: true, silenciado: false }]) {
        const profile = await comRelacao(relacao).getProfile(1, 2);
        expect(profile).toMatchObject({ usuario: ana, relacao, posts: [], seguidores: [], seguindo: [], quantidadePosts: 0 });
      }
      expect(postService.byAuthor).not.toHaveBeenCalled();
    });

    it('perfil silenciado continua normal, só avisa que está silenciado', async () => {
      const profile = await comRelacao({ bloqueado: false, meBloqueou: false, silenciado: true }).getProfile(1, 2);
      expect(profile.relacao.silenciado).toBe(true);
      expect(profile.posts).toEqual([{ id: 10 }]);
    });

    it('não dá para seguir com bloqueio no meio', async () => {
      await expect(comRelacao({ bloqueado: false, meBloqueou: true, silenciado: false }).follow(2, 1)).rejects.toMatchObject({ status: 403 });
      expect(follows.follow).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('agrega usuário, posts, contadores, listas e quem o visitante segue', async () => {
      const profile = await service.getProfile(1, 2);

      expect(postService.byAuthor).toHaveBeenCalledWith(1, 2);
      expect(follows.followingIds).toHaveBeenCalledWith(2);
      expect(profile).toEqual({
        usuario: ana,
        relacao: { bloqueado: false, meBloqueou: false, silenciado: false },
        posts: [{ id: 10 }],
        quantidadePosts: 1,
        quantidadeSeguidores: 1,
        quantidadeSeguindo: 0,
        seguidores: [bia],
        seguindo: [],
        seguindoIds: [2],
        favoritos: { musicas: [], albuns: [], artistas: [] },
      });
    });

    it('traz os favoritos guardados, sem os itens estragados', async () => {
      const capa = 'https://cdn-images.dzcdn.net/images/cover/a/250x250.jpg';
      users.getFavorites.mockResolvedValue({ albuns: [{ id: '9', titulo: 'Abbey Road', artista: 'The Beatles', capa }, { lixo: true }] });
      const { favoritos } = await service.getProfile(1, 2);
      expect(users.getFavorites).toHaveBeenCalledWith(1);
      expect(favoritos.albuns).toEqual([{ id: '9', titulo: 'Abbey Road', artista: 'The Beatles', capa }]);
    });

    it('lança 404 para usuário inexistente', async () => {
      await expect(service.getProfile(99, 1)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('efeito do perfil (recompensa dos 100 posts)', () => {
    it('ao abrir o próprio perfil, quem passou dos 100 sem o efeito ganha na hora', async () => {
      const comEfeito = { ...ana, efeitoDesde: '2026-11-06T00:00:00.000Z', efeitoPerfil: { tipo: 'notas', paleta: 'oceano' } };
      users.findById.mockResolvedValueOnce(ana).mockResolvedValueOnce(comEfeito);
      postService.verificarMarco = vi.fn().mockResolvedValue(true);
      const profile = await service.getProfile(1, 1);
      expect(postService.verificarMarco).toHaveBeenCalledWith(1);
      expect(profile.usuario).toEqual(comEfeito);
    });

    it('no perfil dos outros, ou se já tem o efeito, nem confere', async () => {
      postService.verificarMarco = vi.fn();
      await service.getProfile(2, 1);
      users.findById.mockResolvedValueOnce({ ...ana, efeitoDesde: '2026-11-06T00:00:00.000Z' });
      await service.getProfile(1, 1);
      expect(postService.verificarMarco).not.toHaveBeenCalled();
    });

    it('quem desbloqueou escolhe forma, paleta e se mostra', async () => {
      users.findById.mockResolvedValue({ ...ana, efeitoDesde: '2026-11-06T00:00:00.000Z' });
      const usuario = await service.updateProfile(1, { efeitoPerfil: { tipo: 'notas', paleta: 'oceano', lixo: 1 }, mostrarEfeito: false });
      expect(users.update).toHaveBeenCalledWith(1, expect.objectContaining({
        efeitoPerfil: { tipo: 'notas', paleta: 'oceano' }, mostrarEfeito: false,
      }));
      expect(usuario.efeitoPerfil).toEqual({ tipo: 'notas', paleta: 'oceano' });
    });

    it('forma ou paleta fora da lista: 400', async () => {
      users.findById.mockResolvedValue({ ...ana, efeitoDesde: '2026-11-06T00:00:00.000Z' });
      for (const efeitoPerfil of [{ tipo: 'fogos', paleta: 'lilas' }, { tipo: 'notas', paleta: 'arco-iris' }, null, 'petalas']) {
        await expect(service.updateProfile(1, { efeitoPerfil })).rejects.toMatchObject({ status: 400 });
      }
      expect(users.update).not.toHaveBeenCalled();
    });

    it('sem os 100 posts, não dá para mexer no efeito (403); o resto do perfil salva normal', async () => {
      await expect(service.updateProfile(1, { efeitoPerfil: { tipo: 'notas', paleta: 'oceano' } })).rejects.toMatchObject({ status: 403 });
      await expect(service.updateProfile(1, { mostrarEfeito: true })).rejects.toMatchObject({ status: 403 });
      await service.updateProfile(1, { bio: 'nova' });
      expect(users.update).toHaveBeenCalledWith(1, expect.not.objectContaining({ efeitoPerfil: expect.anything() }));
    });
  });

  describe('presente dos 100 posts (disco de vinil do feed)', () => {
    const desde = '2026-11-06T00:00:00.000Z';

    it('pendente enquanto o efeito foi ganho e o disco não foi aberto', async () => {
      users.getGift = vi.fn().mockResolvedValue({ efeitoDesde: desde, presenteAbertoEm: null });
      expect(await service.presente(1)).toEqual({ pendente: true });
      users.getGift.mockResolvedValue({ efeitoDesde: desde, presenteAbertoEm: desde });
      expect(await service.presente(1)).toEqual({ pendente: false });
      users.getGift.mockResolvedValue({ efeitoDesde: null, presenteAbertoEm: null });
      postService.verificarMarco = vi.fn().mockResolvedValue(false);
      expect(await service.presente(1)).toEqual({ pendente: false });
    });

    it('quem já tinha passado de 100 ganha ao abrir o feed, e o disco já aparece', async () => {
      users.getGift = vi.fn()
        .mockResolvedValueOnce({ efeitoDesde: null, presenteAbertoEm: null })
        .mockResolvedValueOnce({ efeitoDesde: desde, presenteAbertoEm: null });
      postService.verificarMarco = vi.fn().mockResolvedValue(true);
      expect(await service.presente(1)).toEqual({ pendente: true });
      expect(postService.verificarMarco).toHaveBeenCalledWith(1);
    });

    it('abrir marca o presente; sem os 100 posts, 403', async () => {
      users.openGift = vi.fn();
      users.getGift = vi.fn().mockResolvedValue({ efeitoDesde: desde, presenteAbertoEm: null });
      await service.abrirPresente(1);
      expect(users.openGift).toHaveBeenCalledWith(1);
      users.getGift.mockResolvedValue({ efeitoDesde: null, presenteAbertoEm: null });
      await expect(service.abrirPresente(1)).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('updateFavorites', () => {
    const capa = 'https://cdn-images.dzcdn.net/images/artist/a/250x250.jpg';

    it('valida e guarda os favoritos', async () => {
      const favoritos = await service.updateFavorites(1, { artistas: [{ id: 5, titulo: 'Olivia Rodrigo', capa }] });
      expect(favoritos.artistas).toEqual([{ id: '5', titulo: 'Olivia Rodrigo', capa }]);
      expect(users.setFavorites).toHaveBeenCalledWith(1, favoritos);
    });

    it('recusa o que não passar na validação', async () => {
      await expect(service.updateFavorites(1, { musicas: 'x' })).rejects.toMatchObject({ status: 400 });
      await expect(service.updateFavorites(1, { artistas: [{ id: 5, titulo: 'X', capa: 'https://outro.com/a.jpg' }] }))
        .rejects.toMatchObject({ status: 400 });
      expect(users.setFavorites).not.toHaveBeenCalled();
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

    it('limita a bio a 255 caracteres', async () => {
      await expect(service.updateProfile(1, { bio: 'a'.repeat(256) })).rejects.toMatchObject({
        status: 400,
        message: 'A bio pode ter no máximo 255 caracteres.',
      });
      expect(users.update).not.toHaveBeenCalled();
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

    it('nome de exibição: livre (com espaço e acento), até 50 caracteres; vazio volta a mostrar o @', async () => {
      await service.updateProfile(1, { nomeExibicao: '  Ana Souza ✨ ' });
      expect(users.update.mock.calls[0][1].nomeExibicao).toBe('Ana Souza ✨');

      await service.updateProfile(1, { nomeExibicao: '   ' });
      expect(users.update.mock.calls[1][1].nomeExibicao).toBeNull();

      await expect(service.updateProfile(1, { nomeExibicao: 'a'.repeat(51) })).rejects.toMatchObject({
        status: 400, message: 'O nome pode ter no máximo 50 caracteres.',
      });
    });

    it('salva a capa nova e mantém a atual (e o nome de exibição) quando não enviados', async () => {
      users.findById.mockResolvedValue({ ...ana, nomeExibicao: 'Ana', bannerUrl: 'velha.png' });
      await service.updateProfile(1, { bio: 'x' });
      expect(users.update.mock.calls[0][1]).toMatchObject({ nomeExibicao: 'Ana', bannerUrl: 'velha.png' });

      await service.updateProfile(1, { bannerUrl: 'nova.png' });
      expect(users.update.mock.calls[1][1].bannerUrl).toBe('nova.png');
    });

    it('a pessoa escolhe se a medalha de fundador aparece (sem mudar quando não enviado)', async () => {
      users.findById.mockResolvedValue({ ...ana, mostrarSeloFundador: true });
      await service.updateProfile(1, { mostrarSeloFundador: false });
      expect(users.update.mock.calls[0][1].mostrarSeloFundador).toBe(false);

      await service.updateProfile(1, { bio: 'x' });
      expect(users.update.mock.calls[1][1].mostrarSeloFundador).toBe(true);
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

    it('seguir de novo depois de deixar de seguir não avisa outra vez', async () => {
      const avisarUmaVez = vi.fn().mockResolvedValue(false);
      service = createUserService({ users, follows, postService, notifications, passwords, avisarUmaVez });
      await service.follow(1, 2);
      expect(follows.follow).toHaveBeenCalledWith(1, 2);
      expect(avisarUmaVez).toHaveBeenCalledWith('follow:1:2');
      expect(notifications.create).not.toHaveBeenCalled();
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

  describe('getProfileByName (link do @)', () => {
    it('acha a conta pelo nome e devolve o perfil', async () => {
      users.findByNames = vi.fn().mockResolvedValue([{ id: 2, nome: 'Bia' }]);
      const perfil = await service.getProfileByName('bia', 1);
      expect(users.findByNames).toHaveBeenCalledWith(['bia']);
      expect(perfil.usuario).toEqual(bia);
    });

    it('404 quando não existe', async () => {
      users.findByNames = vi.fn().mockResolvedValue([]);
      await expect(service.getProfileByName('ninguem', 1)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('search', () => {
    it('busca pessoas (tirando o @ do começo) e diz quem quem busca já segue', async () => {
      users.search = vi.fn().mockResolvedValue([ana, bia]);
      expect(await service.search('  @Bi ', 1)).toEqual([
        { ...ana, seguindo: false },
        { ...bia, seguindo: true },
      ]);
      expect(users.search).toHaveBeenCalledWith('Bi');
      expect(follows.followingIds).toHaveBeenCalledWith(1);
    });

    it('busca vazia não consulta o banco', async () => {
      users.search = vi.fn();
      expect(await service.search(' @ ', 1)).toEqual([]);
      expect(users.search).not.toHaveBeenCalled();
    });
  });

  describe('changeEmail', () => {
    let mailer;
    beforeEach(async () => {
      users.findAuthById.mockResolvedValue({ id: 1, nome: 'ana', email: 'ana@x.com', senha: await passwords.hash('Atual!1') });
      users.existsByEmail = vi.fn().mockResolvedValue(false);
      users.updateEmail = vi.fn();
      mailer = { send: vi.fn() };
      service = createUserService({ users, follows, postService, notifications, passwords, mailer });
    });

    it('confere a senha, grava o novo email (minúsculo, sem espaços) e avisa o endereço antigo', async () => {
      expect(await service.changeEmail(1, 'Atual!1', '  Ana.Nova@X.com ')).toEqual({ email: 'ana.nova@x.com' });
      expect(users.existsByEmail).toHaveBeenCalledWith('ana.nova@x.com');
      expect(users.updateEmail).toHaveBeenCalledWith(1, 'ana.nova@x.com');
      expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({
        to: 'ana@x.com', subject: 'O email da sua conta no TuneTalk mudou',
      }));
      expect(mailer.send.mock.calls[0][0].text).toContain('ana.nova@x.com');
    });

    it('recusa senha errada, email inválido, o mesmo email e email de outra conta', async () => {
      await expect(service.changeEmail(1, 'errada', 'novo@x.com')).rejects.toMatchObject({ status: 400, message: 'A senha atual está incorreta.' });
      await expect(service.changeEmail(1, 'Atual!1', 'sem-arroba')).rejects.toMatchObject({ status: 400, message: 'Informe um email válido.' });
      await expect(service.changeEmail(1, 'Atual!1', 'ANA@x.com')).rejects.toMatchObject({ status: 400, message: 'Esse já é o seu email.' });
      await expect(service.changeEmail(1, '', 'novo@x.com')).rejects.toMatchObject({ status: 400 });
      users.existsByEmail.mockResolvedValue(true);
      await expect(service.changeEmail(1, 'Atual!1', 'bia@x.com')).rejects.toMatchObject({ status: 409, message: 'Já existe uma conta com esse email.' });
      expect(users.updateEmail).not.toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('se o aviso por email falhar, a troca vale do mesmo jeito', async () => {
      mailer.send.mockRejectedValue(new Error('Resend fora'));
      expect(await service.changeEmail(1, 'Atual!1', 'novo@x.com')).toEqual({ email: 'novo@x.com' });
      expect(users.updateEmail).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('confere a senha atual e grava a nova em bcrypt', async () => {
      await service.changePassword(1, 'Atual!1', 'Nova!123');

      const [id, hash] = users.updatePassword.mock.calls[0];
      expect(id).toBe(1);
      expect(await passwords.verify('Nova!123', hash)).toEqual({ ok: true, needsRehash: false });
    });

    it('funciona também com a senha atual já em bcrypt', async () => {
      users.findAuthById.mockResolvedValue({ id: 1, senha: await passwords.hash('Atual!1') });
      await service.changePassword(1, 'Atual!1', 'Nova!123');
      expect(users.updatePassword).toHaveBeenCalled();
    });

    it('recusa quando a senha atual está errada', async () => {
      await expect(service.changePassword(1, 'errada', 'Nova!123')).rejects.toMatchObject({
        status: 400,
        message: 'A senha atual está incorreta.',
      });
      expect(users.updatePassword).not.toHaveBeenCalled();
    });

    it('aplica as mesmas regras do cadastro à nova senha', async () => {
      await expect(service.changePassword(1, 'Atual!1', 'fraca')).rejects.toMatchObject({
        status: 400,
        message: 'A senha deve conter pelo menos um símbolo, mais de 6 caracteres e uma letra maiúscula.',
      });
      expect(users.findAuthById).not.toHaveBeenCalled();
    });

    it('exige que a nova seja diferente da atual', async () => {
      await expect(service.changePassword(1, 'Atual!1', 'Atual!1')).rejects.toMatchObject({
        status: 400,
        message: 'A nova senha precisa ser diferente da atual.',
      });
    });

    it('exige os dois campos', async () => {
      await expect(service.changePassword(1, '', 'Nova!123')).rejects.toMatchObject({ status: 400, message: 'Preencha a senha atual e a nova.' });
      await expect(service.changePassword(1, 'Atual!1', '')).rejects.toMatchObject({ status: 400 });
    });
  });
});
