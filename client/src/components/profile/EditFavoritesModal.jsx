import { useState } from 'react';
import { usersApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { useMusicSearch } from '../../hooks/useMusicSearch.js';
import { FAVORITOS_MAX } from '../../../../shared/favorites.js';
import { FavoriteCover, SECOES_FAVORITOS, listaDeFavoritos } from './ProfileFavorites.jsx';

const paraFavorito = (resultado, chave) => ({
  id: String(resultado.id),
  titulo: resultado.titulo,
  ...(chave !== 'artistas' && { artista: resultado.artista }),
  capa: resultado.capa,
});

const descricao = (resultado) => {
  if (resultado.tipo === 'artista') return resultado.fas ? `${resultado.fas.toLocaleString('pt-BR')} fãs` : 'Artista';
  return resultado.artista;
};

/** Escolher até 5 de cada: abas Músicas/Álbuns/Artistas, os 5 espaços em cima e a busca embaixo. */
export function EditFavoritesModal({ favoritos, onClose, onSaved }) {
  const [rascunho, setRascunho] = useState(() => Object.fromEntries(
    SECOES_FAVORITOS.map(({ chave }) => [chave, listaDeFavoritos(favoritos, chave)]),
  ));
  const [aba, setAba] = useState('musicas');
  const [query, setQuery] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const secao = SECOES_FAVORITOS.find((s) => s.chave === aba);
  const search = useMusicSearch(query, secao.tipo);
  const lista = rascunho[aba];
  const cheia = lista.length >= FAVORITOS_MAX;
  const redondo = aba === 'artistas';

  const mudarLista = (nova) => setRascunho((atual) => ({ ...atual, [aba]: nova }));
  const adicionar = (resultado) => {
    if (cheia || lista.some((f) => f.id === String(resultado.id))) return;
    mudarLista([...lista, paraFavorito(resultado, aba)]);
  };
  const remover = (i) => mudarLista(lista.filter((_, j) => j !== i));
  // Troca o item de lugar com o vizinho (para a esquerda: -1; para a direita: +1).
  const mover = (i, passo) => {
    const k = i + passo;
    if (k < 0 || k >= lista.length) return;
    mudarLista(lista.map((f, j) => (j === i ? lista[k] : j === k ? lista[i] : f)));
  };

  const trocarAba = (chave) => {
    setAba(chave);
    setQuery('');
  };

  const salvar = async () => {
    setErro('');
    setSalvando(true);
    try {
      onSaved(await usersApi.updateFavorites(rascunho));
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  // Fechar com escolhas não salvas pergunta antes (evita perder a lista por um toque no X ou no Esc).
  const alterado = SECOES_FAVORITOS.some(({ chave }) => {
    const antes = listaDeFavoritos(favoritos, chave).map((f) => f.id).join();
    return antes !== rascunho[chave].map((f) => f.id).join();
  });
  const fechar = () => {
    if (alterado && !window.confirm('Descartar as mudanças nos favoritos?')) return;
    onClose();
  };

  const resultados = search.results.filter((r) => r && r.titulo && r.capa);

  return (
    <Modal open title="Favoritos" onClose={fechar} variant="sheet">
      <div className="composer-step favorites-editor">
        <div role="tablist" aria-label="Tipo de favorito" className="composer-tabs">
          {SECOES_FAVORITOS.map(({ chave, aba: rotulo }) => (
            <button
              key={chave}
              type="button"
              role="tab"
              aria-selected={chave === aba}
              aria-label={`${rotulo}: ${rascunho[chave].length} de ${FAVORITOS_MAX}`}
              className={`composer-tabs__tab${chave === aba ? ' is-active' : ''}`}
              onClick={() => trocarAba(chave)}
            >
              {rotulo} <span className="favorites-editor__conta" aria-hidden="true">{rascunho[chave].length}/{FAVORITOS_MAX}</span>
            </button>
          ))}
        </div>

        <p className="composer-hint favorites-editor__contador">
          {secao.titulo}: toque numa capa da busca para adicionar.
        </p>
        <ol className="favorites-grid favorites-editor__slots" aria-label={`${secao.titulo} escolhidos`}>
          {Array.from({ length: FAVORITOS_MAX }, (_, i) => lista[i]).map((item, i) => (item ? (
            <li key={item.id} className="favorites-grid__item">
              <FavoriteCover item={item} redondo={redondo} />
              <span className="favorites-grid__titulo">{item.titulo}</span>
              <button
                type="button"
                className="favorites-editor__tirar"
                aria-label={`Tirar ${item.titulo}`}
                onClick={() => remover(i)}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
              {lista.length > 1 && (
                <span className="favorites-editor__ordem">
                  <button type="button" aria-label={`Mover ${item.titulo} para antes`} disabled={i === 0} onClick={() => mover(i, -1)}>
                    <i className="bi bi-chevron-left" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover ${item.titulo} para depois`}
                    disabled={i === lista.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          ) : (
            <li key={`vazio-${i}`} className={`favorites-editor__vazio${redondo ? ' favorite-cover--redondo' : ''}`} aria-hidden="true">
              {i + 1}
            </li>
          )))}
        </ol>

        <div className="composer-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            key={aba}
            aria-label={`Buscar ${secao.aba.toLowerCase()}`}
            placeholder={cheia ? 'Lista cheia: tire um para trocar' : `Buscar ${secao.aba.toLowerCase()}`}
            autoComplete="off"
            disabled={cheia}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {!cheia && search.status === 'loading' && <p role="status" className="composer-hint">Buscando…</p>}
        {!cheia && search.status === 'error' && (
          <p role="alert" className="composer-error">Não foi possível buscar agora. Tente de novo.</p>
        )}
        {!cheia && search.status === 'done' && resultados.length === 0 && (
          <p className="composer-hint">Nada encontrado para “{search.term}”.</p>
        )}
        {!cheia && search.status === 'done' && resultados.length > 0 && (
          <ul className="composer-results" aria-label="Resultados">
            {resultados.map((resultado) => {
              const ja = lista.some((f) => f.id === String(resultado.id));
              return (
                <li key={resultado.id}>
                  <button type="button" className="track-row" disabled={ja} onClick={() => adicionar(resultado)}>
                    <img src={resultado.capa} alt="" className={`track-row__cover${redondo ? ' favorite-cover--redondo' : ''}`} />
                    <span className="track-row__info">
                      <span className="track-row__title">{resultado.titulo}</span>
                      <span className="track-row__meta">{descricao(resultado)}</span>
                    </span>
                    <i className={`bi ${ja ? 'bi-check-lg' : 'bi-plus-lg'} track-row__chevron`} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {erro && <p role="alert" className="composer-error">{erro}</p>}
        {/* Fica presa embaixo da folha: com muitos resultados, Salvar não some da tela. */}
        <div className="lyrics-picker__acoes favorites-editor__acoes">
          <button type="button" className="composer-link" onClick={fechar}>Cancelar</button>
          <button type="button" className="composer-submit" disabled={salvando || !alterado} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
