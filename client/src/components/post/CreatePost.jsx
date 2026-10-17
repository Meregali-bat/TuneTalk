import { useEffect, useId, useState } from 'react';
import { musicApi, postsApi } from '../../api/index.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatDuration } from '../../utils/postFormat.js';
import { Modal } from '../common/Modal.jsx';
import { StarRatingInput } from './StarRatingInput.jsx';

const TEXTO_MAX = 500;

function TrackInfo({ track }) {
  return (
    <>
      <img src={track.capa} alt="" className="track-row__cover" />
      <span className="track-row__info">
        <span className="track-row__title">{track.titulo}</span>
        <span className="track-row__meta">{track.artista} · {formatDuration(track.duracao)}</span>
      </span>
    </>
  );
}

function SearchStep({ query, onQueryChange, search, onSelect }) {
  return (
    <div className="composer-step">
      <div className="composer-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar música"
          placeholder="Música ou artista"
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      {search.status === 'idle' && <p className="composer-hint">Digite o nome de uma música ou artista.</p>}
      {search.status === 'loading' && <p role="status" className="composer-hint">Buscando…</p>}
      {search.status === 'error' && (
        <p role="alert" className="composer-error">Não foi possível buscar agora. Tente de novo.</p>
      )}
      {search.status === 'done' && search.results.length === 0 && (
        <p className="composer-hint">Nada encontrado para “{search.term}”.</p>
      )}
      {search.status === 'done' && search.results.length > 0 && (
        <ul className="composer-results" aria-label="Resultados">
          {search.results.map((track) => (
            <li key={track.id}>
              <button type="button" className="track-row" onClick={() => onSelect(track)}>
                <TrackInfo track={track} />
                <i className="bi bi-chevron-right track-row__chevron" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewStep({ track, onChangeTrack, onPublished }) {
  const textoId = useId();
  const [texto, setTexto] = useState('');
  const [nota, setNota] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (nota === null) return;
    setSending(true);
    setError('');
    try {
      await postsApi.create({
        texto: texto.trim(),
        musicName: track.titulo,
        artistName: track.artista,
        posterMusica: track.capa,
        postType: 'música',
        releaseDate: String(track.duracao),
        musicPreview: track.preview,
        nota,
      });
      onPublished();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <form className="composer-step" onSubmit={submit}>
      <div role="group" aria-label="Música escolhida" className="track-row track-row--selected">
        <TrackInfo track={track} />
        <button type="button" className="composer-link" onClick={onChangeTrack}>Trocar música</button>
      </div>

      <StarRatingInput value={nota} onChange={setNota} />

      <div className="composer-field">
        <label htmlFor={textoId}>O que você achou?</label>
        <textarea
          id={textoId}
          rows={4}
          maxLength={TEXTO_MAX}
          placeholder="Conte o que achou (opcional)"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
        />
        <span className="composer-counter">{texto.length}/{TEXTO_MAX}</span>
      </div>

      {error && <p role="alert" className="composer-error">{error}</p>}

      <button type="submit" className="composer-submit" disabled={nota === null || sending}>
        {sending ? 'Publicando…' : 'Publicar'}
      </button>
    </form>
  );
}

// Fluxo em duas etapas: buscar a música e depois avaliar. Fechar o diálogo descarta o rascunho.
function Composer({ onPublished }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ status: 'idle', results: [] });
  const [track, setTrack] = useState(null);
  const term = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (!term) {
      setSearch({ status: 'idle', results: [] });
      return undefined;
    }
    let active = true;
    setSearch((current) => ({ ...current, status: 'loading' }));
    musicApi.search(term)
      .then((results) => active && setSearch({ status: 'done', results, term }))
      .catch(() => active && setSearch({ status: 'error', results: [] }));
    return () => { active = false; };
  }, [term]);

  return track
    ? <ReviewStep track={track} onChangeTrack={() => setTrack(null)} onPublished={onPublished} />
    : <SearchStep query={query} onQueryChange={setQuery} search={search} onSelect={setTrack} />;
}

// Pode ser controlado de fora (open/onOpenChange), ex.: botão do feed vazio; sem isso, controla o próprio estado.
export function CreatePost({ onCreated, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const close = () => setOpen(false);

  const handlePublished = () => {
    close();
    onCreated();
  };

  return (
    <>
      <button type="button" className="composer-fab" aria-label="Criar post" onClick={() => setOpen(true)}>
        <i className="bi bi-music-note-beamed" aria-hidden="true" />
        <span className="composer-fab__label" aria-hidden="true">Postar</span>
      </button>
      <Modal open={open} title="Novo post" onClose={close} variant="sheet">
        <Composer onPublished={handlePublished} />
      </Modal>
    </>
  );
}
