import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSugestaoService } from '../../src/services/sugestaoService.js';

const usuario = (id) => ({ id, nome: `u${id}`, fotoPerfil: 'f.png' });

describe('sugestaoService', () => {
  let sugestoes;
  let follows;
  let restricoes;
  let service;

  beforeEach(() => {
    sugestoes = {
      parecidos: vi.fn().mockResolvedValue([]),
      ativos: vi.fn().mockResolvedValue([]),
      usuarios: vi.fn(async (ids) => ids.map(usuario)),
    };
    follows = { followingIds: vi.fn().mockResolvedValue([]) };
    restricoes = { ocultosPara: vi.fn().mockResolvedValue([]) };
    service = createSugestaoService({ sugestoes, follows, restricoes, now: () => new Date('2026-11-01T00:00:00Z') });
  });

  it('ordena por gosto parecido: mais discos em comum e notas mais próximas', async () => {
    sugestoes.parecidos.mockResolvedValue([
      { autorId: 2, emComum: 1, diferenca: 0 },
      { autorId: 3, emComum: 4, diferenca: 1 },
      { autorId: 4, emComum: 3, diferenca: 6 },
      { autorId: 5, emComum: 2, diferenca: 10 },
    ]);
    const lista = await service.listar(1);
    expect(lista.map((s) => s.usuario.id)).toEqual([3, 4, 2]);
    expect(lista[0].motivo).toBe('Notas parecidas com as suas em 4 discos');
    expect(lista[1].motivo).toBe('Avaliou 3 discos que você também avaliou');
    expect(lista[2].motivo).toBe('Notas parecidas com as suas em 1 disco');
  });

  it('não sugere quem já segue, quem está oculto nem a própria pessoa', async () => {
    sugestoes.parecidos.mockResolvedValue([2, 3, 4, 5].map((autorId) => ({ autorId, emComum: 1, diferenca: 0 })));
    sugestoes.ativos.mockResolvedValue([{ autorId: 1, posts: 9 }, { autorId: 6, posts: 3 }]);
    follows.followingIds.mockResolvedValue([2]);
    restricoes.ocultosPara.mockResolvedValue([3]);
    const lista = await service.listar(1);
    expect(lista.map((s) => s.usuario.id)).toEqual([4, 5, 6]);
  });

  it('quem não avaliou nada recebe quem posta bastante (recentes primeiro, depois de sempre)', async () => {
    sugestoes.ativos
      .mockResolvedValueOnce([{ autorId: 7, posts: 5 }])
      .mockResolvedValueOnce([{ autorId: 7, posts: 9 }, { autorId: 8, posts: 4 }]);
    const lista = await service.listar(1);
    expect(sugestoes.ativos).toHaveBeenNthCalledWith(1, { desde: new Date('2026-09-02T00:00:00Z'), limite: 15 });
    expect(sugestoes.ativos).toHaveBeenNthCalledWith(2, { limite: 15 });
    expect(lista).toEqual([
      { usuario: usuario(7), motivo: 'Posta bastante por aqui' },
      { usuario: usuario(8), motivo: 'Posta bastante por aqui' },
    ]);
  });

  it('no máximo 5, e só contas com nome de usuário', async () => {
    sugestoes.parecidos.mockResolvedValue([2, 3, 4, 5, 6, 7, 8].map((autorId) => ({ autorId, emComum: 1, diferenca: 0 })));
    sugestoes.usuarios.mockImplementation(async (ids) => ids.filter((id) => id !== 2).map(usuario));
    const lista = await service.listar(1);
    expect(lista.map((s) => s.usuario.id)).toEqual([3, 4, 5, 6, 7]);
  });
});
