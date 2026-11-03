import { HttpError } from '../errors.js';
import { versosDaLetra } from '../../../shared/lyrics.js';

// LRCLIB: base aberta de letras, sem chave. Se ela cair ou demorar, o app segue funcionando:
// a rota responde 503 e o compositor só não oferece o trecho.
const LRCLIB_SEARCH_URL = 'https://lrclib.net/api/search';
const TIMEOUT_MS = 5000;
const HEADERS = { 'User-Agent': 'TuneTalk (https://github.com/meregali-bat/tunetalk)' };

export const letrasIndisponiveis = () => new HttpError(503, 'Não foi possível carregar a letra agora.');

// Entre os resultados com letra, o de duração mais próxima da faixa escolhida (quando sabemos a duração).
function melhorResultado(resultados, duracao) {
  const comLetra = resultados.filter((r) => r && typeof r === 'object' && !r.instrumental
    && typeof r.plainLyrics === 'string' && r.plainLyrics.trim());
  if (comLetra.length === 0) return null;
  if (!Number.isFinite(duracao) || duracao <= 0) return comLetra[0];
  const distancia = (r) => (Number.isFinite(r.duration) ? Math.abs(r.duration - duracao) : Infinity);
  return comLetra.reduce((melhor, r) => (distancia(r) < distancia(melhor) ? r : melhor));
}

export function createLyricsService({ fetch = globalThis.fetch, timeoutMs = TIMEOUT_MS } = {}) {
  return {
    /**
     * Versos da letra da faixa: { versos } ou null se não houver letra.
     * Qualquer falha da LRCLIB (rede, demora, erro, resposta estranha) vira 503.
     */
    async letra(titulo, artista, duracao) {
      const t = (titulo ?? '').trim();
      const a = (artista ?? '').trim();
      if (!t) return null;

      const params = new URLSearchParams({ track_name: t, ...(a && { artist_name: a }) });
      let body;
      try {
        const response = await fetch(`${LRCLIB_SEARCH_URL}?${params}`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`LRCLIB respondeu ${response.status}`);
        body = await response.json();
      } catch {
        throw letrasIndisponiveis();
      }
      if (!Array.isArray(body)) throw letrasIndisponiveis();

      const versos = versosDaLetra(melhorResultado(body, Number(duracao))?.plainLyrics);
      return versos.length > 0 ? { versos } : null;
    },
  };
}
