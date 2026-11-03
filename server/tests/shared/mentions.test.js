import { describe, it, expect } from 'vitest';
import { extractHashtags, extractMentions, hasHashtag, splitMentions } from '../../../shared/mentions.js';

describe('marcações (@usuario)', () => {
  it('acha os @ no texto, sem repetir e sem diferenciar maiúsculas', () => {
    expect(extractMentions('oi @bia e @Caio.Souza, olha @BIA de novo')).toEqual(['bia', 'caio.souza']);
  });

  it('ignora ponto no fim (fim de frase), email e @ curto demais', () => {
    expect(extractMentions('valeu @bia. fala comigo em ana@x.com ou @ab')).toEqual(['bia']);
  });

  it('acha as hashtags (com acento), sem repetir e sem diferenciar maiúsculas', () => {
    expect(extractHashtags('que som #MúsicaBoa #rock2024 #rock, #a e c#')).toEqual(['músicaboa', 'rock2024', 'rock']);
  });

  it('hasHashtag confere a tag inteira (#rock não é #rockabilly)', () => {
    expect(hasHashtag('ouvindo #Rock agora', 'rock')).toBe(true);
    expect(hasHashtag('ouvindo #rockabilly', 'rock')).toBe(false);
  });

  it('separa marcações e hashtags para mostrar como link', () => {
    expect(splitMentions('oi @bia, olha #GUTS!')).toEqual([
      { tipo: 'texto', valor: 'oi ' },
      { tipo: 'mencao', valor: 'bia' },
      { tipo: 'texto', valor: ', olha ' },
      { tipo: 'hashtag', valor: 'GUTS' },
      { tipo: 'texto', valor: '!' },
    ]);
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
