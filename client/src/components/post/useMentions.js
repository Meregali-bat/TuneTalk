import { useEffect, useState } from 'react';
import { usersApi } from '../../api/index.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

// "@" + começo do nome logo antes do cursor (no início do texto ou depois de um espaço).
const TOKEN = /(^|\s)@([a-zA-Z0-9._]{1,30})$/;

/**
 * Sugestões de marcação enquanto se digita "@nome" num campo de texto.
 * Devolve as sugestões, qual está ativa, e como completar o texto com a escolhida.
 */
export function useMentions(texto, cursor) {
  const antes = texto.slice(0, cursor);
  const token = antes.match(TOKEN);
  const inicio = token ? token.index + token[1].length : null;
  const termo = useDebouncedValue(token ? token[2] : '', 200);
  const [sugestoes, setSugestoes] = useState([]);
  const [ativa, setAtiva] = useState(0);
  const [fechadaEm, setFechadaEm] = useState(null);

  useEffect(() => {
    if (!termo) {
      setSugestoes([]);
      return undefined;
    }
    let vivo = true;
    usersApi.search(termo)
      .then((achados) => { if (vivo) { setSugestoes(achados.slice(0, 5)); setAtiva(0); } })
      .catch(() => vivo && setSugestoes([]));
    return () => { vivo = false; };
  }, [termo]);

  const aberta = token !== null && fechadaEm !== inicio && sugestoes.length > 0;

  // Troca o "@co" pelo "@nome " completo e diz onde o cursor deve ficar.
  const completar = (usuario) => {
    const novo = `${texto.slice(0, inicio)}@${usuario.nome} ${texto.slice(cursor)}`;
    return { texto: novo, cursor: inicio + usuario.nome.length + 2 };
  };

  return {
    aberta,
    sugestoes,
    ativa,
    setAtiva,
    completar,
    fechar: () => setFechadaEm(inicio),
  };
}
