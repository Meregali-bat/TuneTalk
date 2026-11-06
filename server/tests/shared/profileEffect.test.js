import { describe, it, expect } from 'vitest';
import { EFEITO_PADRAO, EFEITO_PALETAS, efeitoVisivel, validarEfeito } from '../../../shared/profileEffect.js';

describe('validarEfeito', () => {
  it('aceita forma e paleta da lista e descarta o resto', () => {
    expect(validarEfeito({ tipo: 'estrelas', paleta: 'noite', extra: true })).toEqual({ efeito: { tipo: 'estrelas', paleta: 'noite' } });
  });

  it('recusa pétalas (exclusivas da sweetener), forma ou paleta desconhecida, null e o que não é objeto', () => {
    for (const valor of [{ tipo: 'x', paleta: 'lilas' }, { tipo: 'notas', paleta: 'toString' }, null, [], 'petalas', { tipo: 'petalas', paleta: 'lilas' }, undefined]) {
      expect(validarEfeito(valor).erro).toBeTruthy();
    }
  });

  it('cada paleta tem cores em hexadecimal', () => {
    for (const { cores } of Object.values(EFEITO_PALETAS)) {
      expect(cores.length).toBeGreaterThan(2);
      for (const cor of cores) expect(cor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('efeitoVisivel', () => {
  const desde = '2026-11-06T00:00:00.000Z';

  it('só aparece se foi desbloqueado e está ligado', () => {
    expect(efeitoVisivel({ efeitoDesde: null, efeitoPerfil: { tipo: 'notas', paleta: 'sol' } })).toBeNull();
    expect(efeitoVisivel({ efeitoDesde: desde, efeitoPerfil: { tipo: 'notas', paleta: 'sol' }, mostrarEfeito: false })).toBeNull();
    expect(efeitoVisivel({ efeitoDesde: desde, efeitoPerfil: { tipo: 'notas', paleta: 'sol' }, mostrarEfeito: true }))
      .toEqual({ tipo: 'notas', paleta: 'sol' });
    expect(efeitoVisivel(null)).toBeNull();
  });

  it('escolha ausente ou estragada no banco cai no padrão', () => {
    expect(efeitoVisivel({ efeitoDesde: desde, efeitoPerfil: null })).toEqual(EFEITO_PADRAO);
    expect(efeitoVisivel({ efeitoDesde: desde, efeitoPerfil: { tipo: 'lixo' } })).toEqual(EFEITO_PADRAO);
  });
});
