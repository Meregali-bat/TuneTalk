import { useEffect, useState } from 'react';
import { musicApi } from '../../api/index.js';
import { alternarVerso, MAX_VERSOS } from '../../../../shared/lyrics.js';

/**
 * Escolha do trecho da letra (até 4 versos seguidos). Se a base de letras falhar ou não tiver a letra,
 * mostra o aviso e deixa voltar: o post segue sem o trecho.
 */
export function LyricsPicker({ track, inicial, onConfirm, onCancel }) {
  const [estado, setEstado] = useState({ status: 'loading', versos: [] });
  const [selecao, setSelecao] = useState(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let ativo = true;
    setEstado({ status: 'loading', versos: [] });
    musicApi.lyrics(track.titulo, track.artista, track.duracao)
      .then((versos) => {
        if (!ativo) return;
        setEstado({ status: versos.length ? 'done' : 'empty', versos });
        // Reabrir com um trecho já escolhido marca os mesmos versos.
        if (inicial?.length) {
          const inicio = versos.findIndex((_, i) => inicial.every((v, j) => versos[i + j] === v));
          if (inicio >= 0) setSelecao({ inicio, fim: inicio + inicial.length - 1 });
        }
      })
      .catch(() => ativo && setEstado({ status: 'error', versos: [] }));
    return () => { ativo = false; };
    // Só busca de novo se a música mudar (o trecho inicial é usado uma vez, na abertura).
  }, [track.titulo, track.artista, track.duracao]);

  const tocar = (indice) => {
    const resultado = alternarVerso(selecao, indice);
    setSelecao(resultado.selecao);
    setAviso(resultado.limite ? `Dá pra escolher até ${MAX_VERSOS} versos.` : '');
  };

  const quantidade = selecao ? selecao.fim - selecao.inicio + 1 : 0;
  const usar = () => onConfirm(estado.versos.slice(selecao.inicio, selecao.fim + 1));

  return (
    <div className="composer-step lyrics-picker">
      <div className="composer-search-bar">
        <button type="button" className="icon-button" aria-label="Voltar" onClick={onCancel}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </button>
        <h3 className="lyrics-picker__titulo">Trecho da letra</h3>
      </div>
      <p className="lyrics-picker__musica">{track.titulo} · {track.artista}</p>

      {estado.status === 'loading' && <p role="status" className="composer-hint">Buscando a letra…</p>}
      {estado.status === 'empty' && (
        <p className="composer-hint">Não encontramos a letra dessa música. Você pode postar sem o trecho.</p>
      )}
      {estado.status === 'error' && (
        <p role="alert" className="composer-error">
          Não foi possível carregar a letra agora. Você pode postar sem o trecho e tentar de novo depois.
        </p>
      )}

      {estado.status === 'done' && (
        <>
          <p className="composer-hint">
            Toque nos versos que quer postar (até {MAX_VERSOS} seguidos) ·{' '}
            <strong className="lyrics-picker__contador">{quantidade} de {MAX_VERSOS}</strong>
          </p>
          <ul className="lyrics-picker__versos" aria-label="Versos da letra">
            {estado.versos.map((verso, i) => {
              const escolhido = selecao && i >= selecao.inicio && i <= selecao.fim;
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={Boolean(escolhido)}
                    className={`lyrics-picker__verso${escolhido ? ' is-selected' : ''}`}
                    onClick={() => tocar(i)}
                  >
                    {verso}
                  </button>
                </li>
              );
            })}
          </ul>
          {aviso && <p role="status" className="composer-hint">{aviso}</p>}
        </>
      )}

      <div className="lyrics-picker__acoes">
        <button type="button" className="composer-link" onClick={onCancel}>Cancelar</button>
        {estado.status === 'done' && (
          <button type="button" className="composer-submit" disabled={!selecao} onClick={usar}>Usar trecho</button>
        )}
      </div>
    </div>
  );
}
