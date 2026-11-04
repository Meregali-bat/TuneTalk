import { useCallback, useEffect, useRef, useState } from 'react';
import { postsApi } from '../api/index.js';
import { FEED_PAGINA } from '../../../shared/feed.js';

const INICIAL = { posts: null, error: null, loading: true, carregandoMais: false, erroMais: null, fim: false };

/**
 * Feed em páginas: carrega a primeira e, com `carregarMais`, as seguintes a partir do último
 * post mostrado. Uma página com menos de FEED_PAGINA posts quer dizer que acabou.
 * Respostas de um feed antigo (trocou de aba, recarregou) são descartadas.
 */
export function useFeed(feed) {
  const [state, setState] = useState(INICIAL);
  const geracao = useRef(0);
  const ocupado = useRef(false);
  const atual = useRef(state);
  atual.current = state;

  const reload = useCallback(async () => {
    const minha = ++geracao.current;
    ocupado.current = false;
    setState((s) => ({ ...INICIAL, posts: s.posts }));
    try {
      const posts = await postsApi.feed(feed);
      if (minha === geracao.current) setState({ ...INICIAL, posts, loading: false, fim: posts.length < FEED_PAGINA });
    } catch (error) {
      if (minha === geracao.current) setState({ ...INICIAL, error, loading: false });
    }
  }, [feed]);

  useEffect(() => {
    setState(INICIAL);
    reload();
  }, [reload]);

  const carregarMais = useCallback(async () => {
    const { posts, loading, fim, erroMais } = atual.current;
    if (ocupado.current || loading || fim || erroMais || !posts?.length) return;
    ocupado.current = true;
    const minha = geracao.current;
    setState((s) => ({ ...s, carregandoMais: true }));
    try {
      const ultimo = posts.at(-1);
      const pagina = await postsApi.feed(feed, { data: ultimo.data, id: ultimo.id });
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
  }, [feed]);

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
