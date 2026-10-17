import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Executa `load` quando as dependências mudam e expõe { data, error, loading, reload, setData }.
 * Respostas de cargas antigas são descartadas para evitar condições de corrida.
 */
export function useAsync(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const lastCall = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    const call = ++lastCall.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loadRef.current();
      if (call === lastCall.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (call === lastCall.current) setState({ data: null, error, loading: false });
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
