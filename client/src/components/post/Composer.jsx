import { useEffect, useId, useRef, useState } from 'react';
import { musicApi, postsApi } from '../../api/index.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatDuration } from '../../utils/postFormat.js';
import { StarRatingInput } from './StarRatingInput.jsx';
import { IMAGEM_MAX_MB } from '../../api/limits.js';
import { croppedImageUrl } from '../../utils/cloudinaryCrop.js';
import { ImageCropper } from './ImageCropper.jsx';

const TEXTO_MAX = 500;

function TrackInfo({ track }) {
  return (
    <>
      <img src={track.capa} alt="" className="track-row__cover" />
      <span className="track-row__info">
        <span className="track-row__title">{track.titulo}</span>
        <span className="track-row__meta">
          {track.artista} · {track.tipo === 'album' ? `${track.faixas} faixas` : formatDuration(track.duracao)}
        </span>
      </span>
    </>
  );
}

function useObjectUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }
    const created = URL.createObjectURL(file);
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [file]);
  return url;
}

// Prévia do pedaço escolhido: a imagem inteira é deslocada dentro de uma caixa na proporção do corte.
function CropPreview({ src, recorte }) {
  if (!recorte.area) return <img src={src} alt="Imagem escolhida" />;
  const { x, y, width, height } = recorte.area;
  return (
    <div className="composer-image__crop" style={{ '--proporcao': recorte.proporcao }}>
      <img
        src={src}
        alt="Imagem escolhida"
        style={{
          width: `${10000 / width}%`,
          height: `${10000 / height}%`,
          left: `${(-x * 100) / width}%`,
          top: `${(-y * 100) / height}%`,
        }}
      />
    </div>
  );
}

// tipo: 'musica' (faixas) ou 'album'.
function useMusicSearch(query, tipo) {
  const [search, setSearch] = useState({ status: 'idle', results: [] });
  const term = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (!term) {
      setSearch({ status: 'idle', results: [] });
      return undefined;
    }
    let active = true;
    setSearch((current) => ({ ...current, status: 'loading' }));
    (tipo === 'album' ? musicApi.search(term, 'album') : musicApi.search(term))
      .then((results) => active && setSearch({ status: 'done', results, term }))
      .catch(() => active && setSearch({ status: 'error', results: [] }));
    return () => { active = false; };
  }, [term, tipo]);

  return search;
}

const BUSCAS = {
  musica: { aba: 'Músicas', rotulo: 'Buscar música', placeholder: 'Música ou artista', dica: 'Digite o nome de uma música ou artista.' },
  album: { aba: 'Álbuns', rotulo: 'Buscar álbum', placeholder: 'Álbum ou artista', dica: 'Digite o nome de um álbum ou artista.' },
};

function SearchStep({ query, onQueryChange, tipo, onTipoChange, search, onSelect, onBack }) {
  const busca = BUSCAS[tipo];
  return (
    <div className="composer-step">
      <div role="tablist" aria-label="O que buscar" className="composer-tabs">
        {Object.entries(BUSCAS).map(([chave, { aba }]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={chave === tipo}
            className={`composer-tabs__tab${chave === tipo ? ' is-active' : ''}`}
            onClick={() => onTipoChange(chave)}
          >
            {aba}
          </button>
        ))}
      </div>
      <div className="composer-search-bar">
        <button type="button" className="icon-button" aria-label="Voltar" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </button>
        <div className="composer-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            key={tipo}
            aria-label={busca.rotulo}
            placeholder={busca.placeholder}
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
      </div>

      {search.status === 'idle' && <p className="composer-hint">{busca.dica}</p>}
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

const musicFields = (track) => (track.tipo === 'album' ? {
  albumName: track.titulo,
  artistName: track.artista,
  posterAlbum: track.capa,
  postType: 'album',
} : {
  musicName: track.titulo,
  artistName: track.artista,
  posterMusica: track.capa,
  postType: 'música',
  releaseDate: String(track.duracao),
  musicPreview: track.preview,
});

/**
 * Escreve um post ou uma resposta (com parentId). O texto vem primeiro; a música é opcional,
 * mas quando escolhida precisa de nota. A busca de música troca o formulário sem perder o rascunho.
 */
export function Composer({
  parentId,
  onPublished,
  textLabel = 'O que você quer dizer?',
  placeholder = 'Fale de uma música, um disco, um show…',
  submitLabel = 'Publicar',
}) {
  const textoId = useId();
  const [texto, setTexto] = useState('');
  const [track, setTrack] = useState(null);
  const [nota, setNota] = useState(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [tipoBusca, setTipoBusca] = useState('musica');
  const search = useMusicSearch(query, tipoBusca);
  const [imagem, setImagem] = useState(null);
  const [recorte, setRecorte] = useState(null);
  const [pendente, setPendente] = useState(null); // imagem aberta no ajuste
  const previa = useObjectUrl(imagem);
  const previaPendente = useObjectUrl(pendente);
  const imagemInput = useRef(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(null); // null, 'imagem' ou 'post'

  const clean = texto.trim();
  const canPublish = !sending && (track ? nota !== null : clean.length > 0 || imagem !== null);

  const chooseImagem = (file) => {
    if (!file) return;
    if (file.size > IMAGEM_MAX_MB * 1024 * 1024) {
      setError(`A imagem pode ter no máximo ${IMAGEM_MAX_MB} MB.`);
      return;
    }
    setError('');
    setPendente(file);
  };

  const confirmarRecorte = (resultado) => {
    setImagem(pendente);
    setRecorte(resultado);
    setPendente(null);
  };

  const removeImagem = () => {
    setImagem(null);
    setRecorte(null);
  };

  const chooseTrack = (chosen) => {
    if (chosen.id !== track?.id) setNota(null);
    setTrack(chosen);
    setSearching(false);
  };

  const removeTrack = () => {
    setTrack(null);
    setNota(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canPublish) return;
    setError('');
    try {
      let imagemUrl;
      if (imagem) {
        setSending('imagem');
        imagemUrl = croppedImageUrl(await postsApi.uploadImage(imagem), recorte.pixels);
      }
      setSending('post');
      await postsApi.create({
        texto: clean,
        ...(parentId !== undefined && { parentId }),
        ...(track && { ...musicFields(track), nota }),
        ...(imagemUrl && { imagemUrl, imagemProporcao: recorte.proporcao }),
      });
      onPublished();
    } catch (err) {
      setError(err.message);
      setSending(null);
    }
  };

  if (pendente) {
    return (
      <ImageCropper
        src={previaPendente}
        onConfirm={confirmarRecorte}
        onCancel={() => setPendente(null)}
      />
    );
  }

  if (searching) {
    return (
      <SearchStep
        query={query}
        onQueryChange={setQuery}
        tipo={tipoBusca}
        onTipoChange={setTipoBusca}
        search={search}
        onSelect={chooseTrack}
        onBack={() => setSearching(false)}
      />
    );
  }

  return (
    <form className="composer-step" onSubmit={submit}>
      <div className="composer-field">
        <label htmlFor={textoId}>{textLabel}</label>
        <textarea
          id={textoId}
          rows={4}
          maxLength={TEXTO_MAX}
          autoFocus
          placeholder={placeholder}
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
        />
        <span className="composer-counter">{texto.length}/{TEXTO_MAX}</span>
      </div>

      {previa && recorte && (
        <figure className="composer-image">
          <CropPreview src={previa} recorte={recorte} />
          <div className="composer-image__tools">
            <button type="button" className="icon-button" aria-label="Ajustar imagem" onClick={() => setPendente(imagem)}>
              <i className="bi bi-crop" aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" aria-label="Remover imagem" onClick={removeImagem}>
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </figure>
      )}

      {track ? (
        <div className="composer-music">
          <div
            role="group"
            aria-label={track.tipo === 'album' ? 'Álbum escolhido' : 'Música escolhida'}
            className="track-row track-row--selected"
          >
            <TrackInfo track={track} />
            <button type="button" className="composer-link" onClick={() => setSearching(true)}>
              {track.tipo === 'album' ? 'Trocar álbum' : 'Trocar música'}
            </button>
            <button type="button" className="icon-button" aria-label="Remover música" onClick={removeTrack}>
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          <StarRatingInput value={nota} onChange={setNota} />
        </div>
      ) : (
        <button type="button" className="composer-attach" onClick={() => setSearching(true)}>
          <i className="bi bi-music-note-beamed" aria-hidden="true" />
          Adicionar música ou álbum
          <span className="composer-attach__hint" aria-hidden="true">opcional</span>
        </button>
      )}

      {!imagem && (
        <button type="button" className="composer-attach" onClick={() => imagemInput.current?.click()}>
          <i className="bi bi-image" aria-hidden="true" />
          Adicionar imagem
          <span className="composer-attach__hint" aria-hidden="true">GIF também</span>
        </button>
      )}
      <input
        ref={imagemInput}
        type="file"
        accept="image/*"
        aria-label="Escolher imagem"
        className="visually-hidden"
        tabIndex={-1}
        onChange={(event) => { chooseImagem(event.target.files[0]); event.target.value = ''; }}
      />

      {error && <p role="alert" className="composer-error">{error}</p>}

      <button type="submit" className="composer-submit" disabled={!canPublish}>
        {{ imagem: 'Enviando imagem…', post: 'Publicando…' }[sending] ?? submitLabel}
      </button>
    </form>
  );
}
