import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueroOuvirService } from '../../src/services/queroOuvirService.js';

describe('queroOuvirService', () => {
  let queroOuvir;
  let service;
  const capa = 'https://e-cdns-images.dzcdn.net/images/cover/x/250x250.jpg';
  const preview = 'https://cdnt-preview.dzcdn.net/api/1/1/p.mp3';

  beforeEach(() => {
    queroOuvir = { listar: vi.fn(), adicionar: vi.fn().mockResolvedValue({ id: 1 }), remover: vi.fn() };
    service = createQueroOuvirService({ queroOuvir });
  });

  it('guarda o disco com a chave (tipo|título|artista em minúsculas)', async () => {
    await service.adicionar(7, { tipo: 'musica', titulo: ' Help! ', artista: 'The Beatles', capa, preview, releaseDate: 138 });
    expect(queroOuvir.adicionar).toHaveBeenCalledWith(7, {
      tipo: 'musica', titulo: 'Help!', artista: 'The Beatles', capa, preview, releaseDate: '138', chave: 'musica|help!|the beatles',
    });
  });

  it('capa ou prévia de fora do Deezer ficam de fora; álbum não guarda prévia', async () => {
    await service.adicionar(7, { tipo: 'album', titulo: 'A', artista: 'B', capa: 'https://evil.com/x.jpg', preview });
    expect(queroOuvir.adicionar.mock.calls[0][1]).toMatchObject({ capa: null, preview: null, releaseDate: null });
  });

  it('recusa tipo, título ou artista inválidos', async () => {
    for (const corpo of [{ tipo: 'artista', titulo: 'x', artista: 'y' }, { tipo: 'album', titulo: '', artista: 'y' }, { tipo: 'album', titulo: 'x' }, undefined]) {
      await expect(service.adicionar(7, corpo)).rejects.toMatchObject({ status: 400 });
    }
    expect(queroOuvir.adicionar).not.toHaveBeenCalled();
  });

  it('remove pela chave', async () => {
    await service.remover(7, { tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles' });
    expect(queroOuvir.remover).toHaveBeenCalledWith(7, 'album|abbey road|the beatles');
  });
});
