import { describe, it, expect } from 'vitest';
import { porcentagem, validarEnquete } from '../../../shared/poll.js';

const opcao = (titulo, extra) => ({ titulo, artista: 'Artista', capa: 'https://cdn-images.dzcdn.net/c.jpg', preview: 'https://p/x.mp3', ...extra });

describe('validarEnquete', () => {
  it('aceita de 2 a 4 músicas com duração de 1, 3 ou 7 dias (1 dia por padrão)', () => {
    expect(validarEnquete({ opcoes: [opcao('A'), opcao('B')] })).toEqual({
      enquete: { opcoes: [opcao('A'), opcao('B')], duracaoDias: 1 },
    });
    expect(validarEnquete({ opcoes: [opcao('A'), opcao('B'), opcao('C'), opcao('D')], duracaoDias: 7 }).enquete.duracaoDias).toBe(7);
  });

  it('limpa o preview que não for https', () => {
    expect(validarEnquete({ opcoes: [opcao('A', { preview: 'http://x' }), opcao('B')] }).enquete.opcoes[0].preview).toBeNull();
  });

  it('recusa formato errado, quantidade fora do limite, duração estranha, opção sem título/capa e repetida', () => {
    expect(validarEnquete(null).erro).toBe('Enquete inválida.');
    expect(validarEnquete({ opcoes: [opcao('A')] }).erro).toBe('A enquete precisa de 2 a 4 opções.');
    expect(validarEnquete({ opcoes: ['A', 'B', 'C', 'D', 'E'].map((t) => opcao(t)) }).erro).toBe('A enquete precisa de 2 a 4 opções.');
    expect(validarEnquete({ opcoes: [opcao('A'), opcao('B')], duracaoDias: 2 }).erro).toBe('Duração da enquete inválida.');
    expect(validarEnquete({ opcoes: [opcao(' '), opcao('B')] }).erro).toMatch(/Opção da enquete inválida/);
    expect(validarEnquete({ opcoes: [opcao('A', { capa: 'https://x.com/a.jpg' }), opcao('B')] }, { capaValida: () => false }).erro).toMatch(/Opção/);
    expect(validarEnquete({ opcoes: [opcao('A'), opcao('A')] }).erro).toBe('A mesma opção aparece duas vezes na enquete.');
  });
});

describe('porcentagem', () => {
  it('arredonda e dá 0 sem votos', () => {
    expect(porcentagem(1, 3)).toBe(33);
    expect(porcentagem(2, 3)).toBe(67);
    expect(porcentagem(0, 0)).toBe(0);
  });
});
