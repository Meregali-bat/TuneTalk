import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { postsApi } from '../../api/index.js';
import { useMusicSearch } from '../../hooks/useMusicSearch.js';
import { formatDuration } from '../../utils/postFormat.js';
import { StarRatingInput } from './StarRatingInput.jsx';
import { IMAGEM_MAX_MB } from '../../api/limits.js';
import { croppedImageUrl } from '../../utils/cloudinaryCrop.js';
import { ImageCropper } from './ImageCropper.jsx';
import { useMentions } from './useMentions.js';
import { LyricsPicker } from './LyricsPicker.jsx';
import { LyricQuote } from './LyricQuote.jsx';
import { PlayButton } from './PlayButton.jsx';
import { DURACOES_DIAS, ENQUETE_MAX, ENQUETE_MIN } from '../../../../shared/poll.js';

const TEXTO_MAX = 500;

function TrackInfo({ track }) {
  const artista = track.tipo === 'artista';
  let meta = `${track.artista} · ${track.tipo === 'album' ? `${track.faixas} faixas` : formatDuration(track.duracao)}`;
  if (artista) meta = track.fas ? `${Number(track.fas).toLocaleString('pt-BR')} fãs` : 'Artista';
  return (
    <>
      <img src={track.capa} alt="" className={`track-row__cover${artista ? ' track-row__cover--redondo' : ''}`} />
      <span className="track-row__info">
        <span className="track-row__title">{track.titulo}</span>
        <span className="track-row__meta">{meta}</span>
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

const BUSCAS = {
  musica: { aba: 'Músicas', rotulo: 'Buscar música', placeholder: 'Música ou artista', dica: 'Digite o nome de uma música ou artista.' },
  album: { aba: 'Álbuns', rotulo: 'Buscar álbum', placeholder: 'Álbum ou artista', dica: 'Digite o nome de um álbum ou artista.' },
  // Só na enquete: o post normal avalia música ou álbum, não artista.
  artista: { aba: 'Artistas', rotulo: 'Buscar artista', placeholder: 'Nome do artista', dica: 'Digite o nome de um artista.' },
};

function SearchStep({ query, onQueryChange, tipo, onTipoChange, search, onSelect, onBack, comArtistas = false }) {
  const busca = BUSCAS[tipo];
  return (
    <div className="composer-step">
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

      {/* No celular: a busca vem primeiro (com o voltar ao lado); o tipo fica logo abaixo, compacto. */}
      <div role="tablist" aria-label="O que buscar" className="composer-tabs composer-tabs--compacto">
        {Object.entries(BUSCAS).filter(([chave]) => comArtistas || chave !== 'artista').map(([chave, { aba }]) => (
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
            <li key={track.id} className="composer-results__item">
              <button type="button" className="track-row" onClick={() => onSelect(track)}>
                <TrackInfo track={track} />
              </button>
              {/* Ouvir antes de escolher (faixas têm prévia de 30 s; álbuns não). Sem prévia, a seta indica o toque. */}
              {track.tipo !== 'album' && track.preview ? (
                <PlayButton src={track.preview} titulo={track.titulo} artista={track.artista} rotulo={track.titulo} size="sm" />
              ) : (
                <i className="bi bi-chevron-right track-row__chevron" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const chaveOpcao = (item) => `${['album', 'artista'].includes(item.tipo) ? item.tipo : 'musica'}-${item.id}`;

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
  const sugestoesId = useId();
  const textoRef = useRef(null);
  const [cursor, setCursor] = useState(0);
  const [cursorPendente, setCursorPendente] = useState(null);

  // Põe o cursor depois do @nome completado logo após o texto mudar, antes da próxima tecla
  // (com requestAnimationFrame, quem digita rápido via o cursor pular no meio da palavra).
  useLayoutEffect(() => {
    if (cursorPendente === null) return;
    textoRef.current?.focus();
    textoRef.current?.setSelectionRange(cursorPendente, cursorPendente);
    setCursorPendente(null);
  }, [cursorPendente]);
  const [texto, setTexto] = useState('');
  const [track, setTrack] = useState(null);
  const [nota, setNota] = useState(null);
  const [searching, setSearching] = useState(false);
  const [buscandoPara, setBuscandoPara] = useState('post'); // 'post' (música do post) ou 'enquete'
  const [enquete, setEnquete] = useState(null); // { opcoes: [faixas], duracaoDias }
  const [trecho, setTrecho] = useState(null); // versos da letra escolhidos
  const [escolhendoTrecho, setEscolhendoTrecho] = useState(false);
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

  const marcacao = useMentions(texto, cursor);

  const marcar = (usuario) => {
    const completo = marcacao.completar(usuario);
    setTexto(completo.texto);
    setCursor(completo.cursor);
    setCursorPendente(completo.cursor);
  };

  // Com as sugestões abertas: setas escolhem, Enter/Tab completam, Esc fecha.
  const teclaNoTexto = (event) => {
    if (!marcacao.aberta) return;
    const total = marcacao.sugestoes.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      marcacao.setAtiva((marcacao.ativa + (event.key === 'ArrowDown' ? 1 : total - 1)) % total);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      marcar(marcacao.sugestoes[marcacao.ativa]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      marcacao.fechar();
    }
  };

  const clean = texto.trim();
  const podeEnquete = parentId === undefined;
  // Música escolhida precisa de nota; enquete precisa de pelo menos 2 opções; e o post precisa de algo.
  const temConteudo = clean.length > 0 || imagem !== null || track !== null || enquete !== null;
  const canPublish = !sending && temConteudo
    && (!track || nota !== null)
    && (!enquete || enquete.opcoes.length >= ENQUETE_MIN);

  const chooseImagem = (file) => {
    if (!file) return;
    if (file.size > IMAGEM_MAX_MB * 1024 * 1024) {
      setError(`A imagem pode ter no máximo ${IMAGEM_MAX_MB} MB.`);
      return;
    }
    setError('');
    setPendente(file);
  };

  // Colar uma imagem ou GIF (copiar e colar) entra como se tivesse sido anexada; texto cola normal.
  const colar = (event) => {
    const imagemColada = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (!imagemColada) return;
    event.preventDefault();
    chooseImagem(imagemColada);
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

  const abrirBusca = (para) => {
    setBuscandoPara(para);
    if (para === 'post' && tipoBusca === 'artista') setTipoBusca('musica');
    setSearching(true);
  };

  const chooseTrack = (chosen) => {
    if (buscandoPara === 'enquete') {
      // Música e álbum podem ter o mesmo id no Deezer: a chave considera o tipo.
      setEnquete((atual) => (atual.opcoes.some((o) => chaveOpcao(o) === chaveOpcao(chosen)) || atual.opcoes.length >= ENQUETE_MAX
        ? atual
        : { ...atual, opcoes: [...atual.opcoes, chosen] }));
      setSearching(false);
      return;
    }
    if (chosen.id !== track?.id) {
      setNota(null);
      setTrecho(null);
    }
    setTrack(chosen);
    setSearching(false);
  };

  const removeTrack = () => {
    setTrack(null);
    setNota(null);
    setTrecho(null);
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
        ...(track && track.tipo !== 'album' && trecho?.length && { trechoLetra: trecho }),
        ...(imagemUrl && { imagemUrl, imagemProporcao: recorte.proporcao }),
        ...(enquete && {
          enquete: {
            duracaoDias: enquete.duracaoDias,
            // Artista vai sem "artista" (é ele mesmo) e sem prévia; álbum, sem prévia.
            opcoes: enquete.opcoes.map(({ titulo, artista, capa, preview, tipo }) => ({
              titulo,
              artista: tipo === 'artista' ? null : artista,
              capa,
              preview: tipo === 'album' || tipo === 'artista' ? null : preview,
            })),
          },
        }),
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

  if (escolhendoTrecho && track) {
    return (
      <LyricsPicker
        track={track}
        inicial={trecho}
        onConfirm={(versos) => { setTrecho(versos); setEscolhendoTrecho(false); }}
        onCancel={() => setEscolhendoTrecho(false)}
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
        comArtistas={buscandoPara === 'enquete'}
      />
    );
  }

  return (
    <form className="composer-step" onSubmit={submit}>
      <div className="composer-field">
        <label htmlFor={textoId}>{textLabel}</label>
        <textarea
          ref={textoRef}
          id={textoId}
          rows={4}
          maxLength={TEXTO_MAX}
          autoFocus
          placeholder={placeholder}
          value={texto}
          aria-autocomplete="list"
          aria-expanded={marcacao.aberta}
          aria-controls={marcacao.aberta ? sugestoesId : undefined}
          onChange={(event) => { setTexto(event.target.value); setCursor(event.target.selectionStart); }}
          onSelect={(event) => setCursor(event.target.selectionStart)}
          onKeyDown={teclaNoTexto}
          onPaste={colar}
        />
        <span className="composer-counter">{texto.length}/{TEXTO_MAX}</span>
        {marcacao.aberta && (
          <ul id={sugestoesId} role="listbox" aria-label="Sugestões de marcação" className="mention-list">
            {marcacao.sugestoes.map((usuario, i) => (
              <li
                key={usuario.id}
                role="option"
                aria-selected={i === marcacao.ativa}
                className={`mention-list__item${i === marcacao.ativa ? ' is-active' : ''}`}
                // mousedown mantém o foco no texto (senão o teclado do celular fecha antes do clique)
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => marcar(usuario)}
              >
                <img src={usuario.fotoPerfil} alt="" />
                <span className="mention-list__nome">{usuario.nomeExibicao || usuario.nome}</span>
                <span className="mention-list__handle">@{usuario.nome}</span>
              </li>
            ))}
          </ul>
        )}
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

      {track && (
        <div className="composer-music">
          <div
            role="group"
            aria-label={track.tipo === 'album' ? 'Álbum escolhido' : 'Música escolhida'}
            className="track-row track-row--selected"
          >
            <TrackInfo track={track} />
            {track.tipo !== 'album' && track.preview && (
              <PlayButton src={track.preview} titulo={track.titulo} artista={track.artista} rotulo={track.titulo} size="sm" />
            )}
            {/* "Trocar" curto para sobrar espaço ao título (o nome completo fica para o leitor de tela). */}
            <button
              type="button"
              className="composer-link"
              aria-label={track.tipo === 'album' ? 'Trocar álbum' : 'Trocar música'}
              onClick={() => abrirBusca('post')}
            >
              Trocar
            </button>
            <button type="button" className="icon-button" aria-label="Remover música" onClick={removeTrack}>
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          <StarRatingInput value={nota} onChange={setNota} />
          {track.tipo !== 'album' && (trecho ? (
            <div className="composer-lyric">
              <LyricQuote versos={trecho} titulo={track.titulo} artista={track.artista} />
              <div className="composer-lyric__tools">
                <button type="button" className="composer-link" onClick={() => setEscolhendoTrecho(true)}>Trocar trecho</button>
                <button type="button" className="icon-button" aria-label="Remover trecho da letra" onClick={() => setTrecho(null)}>
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="composer-attach" onClick={() => setEscolhendoTrecho(true)}>
              <i className="bi bi-quote" aria-hidden="true" />
              Adicionar trecho da letra
              <span className="composer-attach__hint" aria-hidden="true">opcional</span>
            </button>
          ))}
        </div>
      )}

      {enquete && (
        <div className="composer-poll" role="group" aria-label="Enquete">
          <div className="composer-poll__topo">
            <span>Enquete · de {ENQUETE_MIN} a {ENQUETE_MAX} opções</span>
            <button type="button" className="icon-button" aria-label="Remover enquete" onClick={() => setEnquete(null)}>
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          <ol className="composer-poll__opcoes">
            {enquete.opcoes.map((opcao) => (
              <li key={chaveOpcao(opcao)} className="track-row track-row--selected">
                <TrackInfo track={opcao} />
                {opcao.preview && (
                  <PlayButton src={opcao.preview} titulo={opcao.titulo} artista={opcao.artista} rotulo={opcao.titulo} size="sm" />
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Tirar ${opcao.titulo} da enquete`}
                  onClick={() => setEnquete((atual) => ({ ...atual, opcoes: atual.opcoes.filter((o) => chaveOpcao(o) !== chaveOpcao(opcao)) }))}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          {enquete.opcoes.length < ENQUETE_MAX && (
            <button type="button" className="composer-poll__adicionar" aria-label="Adicionar opção à enquete" onClick={() => abrirBusca('enquete')}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Adicionar música, álbum ou artista
            </button>
          )}
          <div className="composer-poll__duracao" role="radiogroup" aria-label="Duração da enquete">
            <span>Dura</span>
            {DURACOES_DIAS.map((dias) => (
              <button
                key={dias}
                type="button"
                role="radio"
                aria-checked={enquete.duracaoDias === dias}
                className={enquete.duracaoDias === dias ? 'is-active' : undefined}
                onClick={() => setEnquete((atual) => ({ ...atual, duracaoDias: dias }))}
              >
                {dias} {dias === 1 ? 'dia' : 'dias'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Música avaliada e enquete não vão juntas no mesmo post. */}
      {!track && !enquete && (
        <button type="button" className="composer-attach" onClick={() => abrirBusca('post')}>
          <i className="bi bi-music-note-beamed" aria-hidden="true" />
          Adicionar música ou álbum
          <span className="composer-attach__hint" aria-hidden="true">opcional</span>
        </button>
      )}

      {!imagem && (
        <button type="button" className="composer-attach" onClick={() => imagemInput.current?.click()}>
          <i className="bi bi-image" aria-hidden="true" />
          Adicionar imagem
          <span className="composer-attach__hint" aria-hidden="true">ou cole um GIF</span>
        </button>
      )}

      {/* Enquete combina com texto e imagem; não aparece com música avaliada nem em comentário. */}
      {podeEnquete && !enquete && !track && (
        <button
          type="button"
          className="composer-attach"
          onClick={() => { setEnquete({ opcoes: [], duracaoDias: 1 }); abrirBusca('enquete'); }}
        >
          <i className="bi bi-bar-chart-line" aria-hidden="true" />
          Criar enquete
          <span className="composer-attach__hint" aria-hidden="true">músicas, álbuns ou artistas</span>
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
