import { useEffect, useState } from 'react';
import { musicApi, postsApi } from '../../api/index.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { StarRatingInput } from './StarRatingInput.jsx';

function MusicSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return undefined;
    }
    let active = true;
    musicApi.search(debouncedQuery)
      .then((tracks) => active && setResults(tracks))
      .catch(() => active && setResults([]));
    return () => { active = false; };
  }, [debouncedQuery]);

  return (
    <>
      <input
        type="text"
        id="search-input"
        className="form-control"
        placeholder="Digite a música"
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div id="search-results">
        {results.map((track) => (
          <div
            key={track.id}
            className="search-result"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(track)}
            onKeyDown={(event) => event.key === 'Enter' && onSelect(track)}
          >
            <img src={track.capa} alt="" className="search-result-img" />
            {`${track.titulo} by ${track.artista} (Track)`}
          </div>
        ))}
      </div>
    </>
  );
}

function PostForm({ track, onCreated }) {
  const [texto, setTexto] = useState('');
  const [nota, setNota] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await postsApi.create({
        texto,
        musicName: track.titulo,
        artistName: track.artista,
        posterMusica: track.capa,
        postType: 'música',
        releaseDate: String(track.duracao),
        musicPreview: track.preview,
        nota,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 id="music-name">{`${track.titulo} by ${track.artista}`}</h2>
      <div className="post-configs">
        <img
          id="foto-musica"
          src={track.capa}
          alt={track.titulo}
          className="img-fluid rounded"
          style={{ marginRight: '1rem', maxWidth: 150 }}
        />
        <form className="ml-3 d-flex flex-column" onSubmit={submit}>
          {error && <div role="alert" className="text-danger mb-2">{error}</div>}
          <div className="form-group">
            <textarea
              id="texto"
              aria-label="Texto do post"
              className="form-control rounded"
              rows={6}
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
            />
          </div>
          <div className="form-group">
            <StarRatingInput value={nota} onChange={setNota} />
          </div>
          <button type="submit" className="btn btn-postar btn-primary align-self-center" disabled={sending}>
            Postar
          </button>
        </form>
      </div>
    </div>
  );
}

export function CreatePost({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState(null);

  const close = () => {
    setOpen(false);
    setTrack(null);
  };

  const handleCreated = () => {
    close();
    onCreated();
  };

  return (
    <div className="fixed-bottom mb-3">
      <button type="button" className="botao-criarpost border-0" aria-label="Criar post" onClick={() => setOpen(true)}>
        <i className="bi bi-music-note" />
      </button>
      {open && (
        <>
          <div id="overlay" data-testid="create-post-overlay" style={{ display: 'block' }} onClick={close} />
          <div id="search-bar" className="input-group" style={{ display: 'block' }}>
            {track
              ? <PostForm track={track} onCreated={handleCreated} />
              : <MusicSearch onSelect={setTrack} />}
          </div>
        </>
      )}
    </div>
  );
}
