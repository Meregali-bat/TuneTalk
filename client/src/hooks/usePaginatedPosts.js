import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigationType } from 'react-router-dom';
import { lembrarLista, lerLista } from './memoriaDaLista.js';
import { FEED_PAGINA } from '../../../shared/feed.js';

const INICIAL = { posts: null, error: null, loading: true, carregandoMais: false, erroMais: null, fim: false };

/**
 * Lista de posts em páginas (feeds, página de álbum/música). `carregarPagina(depois)` busca a
 * primeira página (sem `depois`) ou a seguinte a partir do último post mostrado ({ data, id }).
 * Uma página com menos de FEED_PAGINA posts quer dizer que acabou. Quando `chave` muda, recomeça;
 * respostas de uma lista antiga (trocou de aba, recarregou) são descartadas.
 *
 * `memoria` (opcional): nome para lembrar a lista e a rolagem. Voltando para ela pelo "voltar"
 * (do navegador ou do app), aparece do jeito que estava, no mesmo ponto, sem buscar de novo.
 */
export function usePaginatedPosts(carregarPagina, chave, { memoria } = {}) {
  const voltando = useNavigationType() === 'POP';
  const [lembrada] = useState(() => (memoria && voltando ? lerLista(memoria) : null));
  const [state, setState] = useState(() => (lembrada
    ? { ...INICIAL, posts: lembrada.posts, fim: lembrada.fim, loading: false }
    : INICIAL));
  // Para qual `chave` a lista na tela já foi carregada (a lembrada já vale para a atual).
  const carregadaPara = useRef(lembrada ? chave : null);
  const geracao = useRef(0);
  const ocupado = useRef(false);
  const atual = useRef(state);
  atual.current = state;
  const carregar = useRef(carregarPagina);
  carregar.current = carregarPagina;

  const reload = useCallback(async () => {
    const minha = ++geracao.current;
    ocupado.current = false;
    setState((s) => ({ ...INICIAL, posts: s.posts }));
    try {
      const posts = await carregar.current();
      if (minha === geracao.current) setState({ ...INICIAL, posts, loading: false, fim: posts.length < FEED_PAGINA });
    } catch (error) {
      if (minha === geracao.current) setState({ ...INICIAL, error, loading: false });
    }
  }, []);

  useEffect(() => {
    // Já carregada (ou lembrada) para esta chave: não busca de novo. Puxar para atualizar
    // continua valendo. Também evita buscar duas vezes quando o React roda o efeito de novo.
    if (carregadaPara.current === chave) return;
    carregadaPara.current = chave;
    setState(INICIAL);
    reload();
  }, [reload, chave]);

  // Volta para onde a pessoa tinha rolado, antes de a tela aparecer. "instant" porque o site usa
  // rolagem suave: sem isso a tela desceria animando desde o topo.
  useLayoutEffect(() => {
    if (lembrada?.rolagem) window.scrollTo({ top: lembrada.rolagem, behavior: 'instant' });
  }, [lembrada]);

  // Guarda a lista sempre que muda, e a rolagem ao sair da página (antes de a próxima rolar ao topo).
  useEffect(() => {
    if (memoria && state.posts) lembrarLista(memoria, { posts: state.posts, fim: state.fim });
  }, [memoria, state.posts, state.fim]);
  useLayoutEffect(() => () => {
    if (memoria) lembrarLista(memoria, { rolagem: window.scrollY });
  }, [memoria]);

  const carregarMais = useCallback(async () => {
    const { posts, loading, fim, erroMais } = atual.current;
    if (ocupado.current || loading || fim || erroMais || !posts?.length) return;
    ocupado.current = true;
    const minha = geracao.current;
    setState((s) => ({ ...s, carregandoMais: true }));
    try {
      const ultimo = posts.at(-1);
      const pagina = await carregar.current({ data: ultimo.data, id: ultimo.id });
      if (minha !== geracao.current) return;
      setState((s) => {
        const vistos = new Set(s.posts.map((p) => p.id));
        return {
          ...s,
          posts: [...s.posts, ...pagina.filter((p) => !vistos.has(p.id))],
          carregandoMais: false,
          fim: pagina.length < FEED_PAGINA,
        };
      });
    } catch (error) {
      if (minha === geracao.current) setState((s) => ({ ...s, carregandoMais: false, erroMais: error }));
    } finally {
      if (minha === geracao.current) ocupado.current = false;
    }
  }, []);

  // "Tentar de novo" depois de uma página que falhou.
  const tentarMaisDeNovo = useCallback(() => {
    setState((s) => ({ ...s, erroMais: null }));
    atual.current = { ...atual.current, erroMais: null };
    carregarMais();
  }, [carregarMais]);

  const setPosts = useCallback((updater) => {
    setState((s) => ({ ...s, posts: typeof updater === 'function' ? updater(s.posts) : updater }));
  }, []);

  return { ...state, reload, carregarMais, tentarMaisDeNovo, setPosts };
}
