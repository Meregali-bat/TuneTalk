import { describe, it, expect } from 'vitest';
import { extractMentions, splitMentions } from '../../../shared/mentions.js';

describe('marcações (@usuario)', () => {
  it('acha os @ no texto, sem repetir e sem diferenciar maiúsculas', () => {
    expect(extractMentions('oi @bia e @Caio.Souza, olha @BIA de novo')).toEqual(['bia', 'caio.souza']);
  });

  it('ignora ponto no fim (fim de frase), email e @ curto demais', () => {
    expect(extractMentions('valeu @bia. fala comigo em ana@x.com ou @ab')).toEqual(['bia']);
  });

  it('separa o texto em pedaços para mostrar as marcações como link', () => {
    expect(splitMentions('oi @bia, tudo bem?')).toEqual([
      { tipo: 'texto', valor: 'oi ' },
      { tipo: 'mencao', valor: 'bia' },
      { tipo: 'texto', valor: ', tudo bem?' },
    ]);
    expect(splitMentions('sem marcação')).toEqual([{ tipo: 'texto', valor: 'sem marcação' }]);
  });
});
