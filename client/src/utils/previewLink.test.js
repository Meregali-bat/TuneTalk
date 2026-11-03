import { describe, it, expect } from 'vitest';
import { precisaRenovar } from './previewLink.js';

const agora = Date.UTC(2026, 10, 3, 12, 0, 0);
const exp = (ms) => Math.floor(ms / 1000);

describe('precisaRenovar (link de prévia do Deezer)', () => {
  it('links do formato antigo (cdns-preview) já não funcionam', () => {
    expect(precisaRenovar('https://cdns-preview-6.dzcdn.net/stream/c-6d24-3.mp3', agora)).toBe(true);
  });

  it('link com prazo (hdnea=exp=) vencido ou vencendo em menos de 1 minuto', () => {
    const base = 'https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/x.mp3?hdnea=exp=';
    expect(precisaRenovar(`${base}${exp(agora - 1000)}~acl=x~hmac=y`, agora)).toBe(true);
    expect(precisaRenovar(`${base}${exp(agora + 30_000)}~acl=x`, agora)).toBe(true);
    expect(precisaRenovar(`${base}${exp(agora + 3_600_000)}~acl=x`, agora)).toBe(false);
  });

  it('link sem prazo conhecido é usado como está; sem link, precisa buscar', () => {
    expect(precisaRenovar('https://cdn/preview.mp3', agora)).toBe(false);
    expect(precisaRenovar(null, agora)).toBe(true);
  });
});
