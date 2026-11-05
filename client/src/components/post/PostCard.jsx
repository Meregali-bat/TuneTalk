import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { postsApi } from '../../api/index.js';
import { releaseInfo } from '../../utils/postFormat.js';
import { obraUrl } from '../../utils/obra.js';
import { relativeTime, shortTime } from '../../utils/relativeTime.js';
import { StarRating } from './StarRating.jsx';
import { formatEstrelas } from '../../../../shared/rating.js';
import { splitMentions } from '../../../../shared/mentions.js';
import { VerifiedBadge } from '../effects/VerifiedBadge.jsx';
import { FounderBadge } from '../effects/FounderBadge.jsx';
import { LikeButton } from './LikeButton.jsx';
import { PlayButton } from './PlayButton.jsx';
import { ShareButton } from './ShareButton.jsx';
import { PostMenu } from './PostMenu.jsx';
import { LyricQuote } from './LyricQuote.jsx';
import { PollBlock } from './PollBlock.jsx';
import { QueroOuvirButton } from './QueroOuvirButton.jsx';
import { CitarButton } from './CitarButton.jsx';
import { PostCitado } from './PostCitado.jsx';
import { ImagemDoPost } from './ImagemDoPost.jsx';

// Texto com as marcações (@usuario, link para o perfil) e hashtags (link para a página da tag).
function TextoComMarcacoes({ texto }) {
  return splitMentions(texto).map((parte, i) => {
    if (parte.tipo === 'mencao') return <Link key={i} to={`/perfil/@${parte.valor}`} className="mention">@{parte.valor}</Link>;
    if (parte.tipo === 'hashtag') return <Link key={i} to={`/tag/${encodeURIComponent(parte.valor)}`} className="hashtag">#{parte.valor}</Link>;
    return <span key={i}>{parte.valor}</span>;
  });
}

const TIPO_LABEL = { album: 'álbum', 'música': 'música' };

// Tocar na música abre a página do álbum/música (com a média de todo mundo); dentro dela, abre o post.
function MusicBlock({ post, postUrl, linkObra, isOwner }) {
  const isAlbum = post.tipo === 'album';
  const destino = linkObra && post.artista ? obraUrl(post) : postUrl;
  const meta = [post.artista, TIPO_LABEL[post.tipo], releaseInfo(post.releaseDate)].filter(Boolean).join(' • ');

  return (
    <div className="post-card__music">
      <Link to={destino} className="post-card__music-link">
        <img
          src={post.capa}
          alt={isAlbum ? 'Poster do álbum' : 'Poster da música'}
          className="post-card__cover"
          loading="lazy"
        />
        <div className="post-card__music-info">
          <h2 className="post-card__title">{post.titulo}</h2>
          <p className="post-card__meta">{meta}</p>
          <span className="post-card__rating">
            <span className="post-card__stars"><StarRating nota={post.nota} /></span>
            <span className="post-card__score" aria-hidden="true">{formatEstrelas(post.nota)}/5</span>
          </span>
        </div>
      </Link>
      <div className="post-card__music-actions">
        {!isAlbum && post.preview && <PlayButton src={post.preview} titulo={post.titulo} artista={post.artista} />}
        {/* No post de outra pessoa: guardar o disco para ouvir depois. */}
        {!isOwner && post.queroOuvir !== undefined && post.artista && (
          <QueroOuvirButton disco={post} salvo={post.queroOuvir} />
        )}
      </div>
    </div>
  );
}

// variant: "feed" (padrão), "detail" (post aberto na página dele) ou "reply" (resposta dentro de um post).
// showPinned: mostra a etiqueta "Fixado" (só faz sentido no perfil do autor).
export function PostCard({
  post, onDeleted, onPinChange, commentCount = post.quantidadeComentarios, showMenu = true, showPinned = false, variant = 'feed',
  threadLine = false, linkObra = true, onAutorOculto,
}) {
  const { user } = useAuth();
  const [fixado, setFixado] = useState(Boolean(post.fixado));
  useEffect(() => setFixado(Boolean(post.fixado)), [post.fixado]);
  const isOwner = user?.id === post.autor.id;
  const nomeAutor = post.autor.nomeExibicao || post.autor.nome;
  const navigate = useNavigate();
  const temMarcacao = splitMentions(post.texto ?? '').some((p) => p.tipo !== 'texto');
  const authorId = useId();
  const postUrl = `/post/${post.id}`;
  const profileUrl = `/perfil/${post.autor.id}`;

  const togglePin = async () => {
    const novo = !fixado;
    await (novo ? postsApi.pin(post.id) : postsApi.unpin(post.id));
    setFixado(novo);
    onPinChange?.(post.id, novo);
  };

  const handleDelete = async () => {
    await postsApi.remove(post.id);
    onDeleted?.(post.id);
  };

  return (
    <article
      // threadLine: numa conversa, a linha sai da foto e liga este post ao de baixo (como no Twitter).
      className={`post-card post-card--${variant}${threadLine ? ' post-card--continua' : ''}`}
      aria-label={post.titulo ? `Post de ${nomeAutor} sobre ${post.titulo}` : `Post de ${nomeAutor}`}
    >
      {post.respondendoA && (
        <Link to={`/post/${post.respondendoA.postId}`} className="post-card__context">
          <i className="bi bi-reply" aria-hidden="true" /> Respondendo a @{post.respondendoA.nome}
        </Link>
      )}
      {showPinned && fixado && (
        <p className="post-card__pinned"><i className="bi bi-pin-angle-fill" aria-hidden="true" /> Fixado</p>
      )}
      <header className="post-card__header">
        <Link to={profileUrl} className="post-card__avatar" tabIndex={-1} aria-hidden="true">
          <img src={post.autor.fotoPerfil} alt="" />
        </Link>
        {/* Nome de exibição com os selos em cima; @usuario e o tempo curto embaixo, menores. */}
        <div className="post-card__who">
          <span className="post-card__author-line">
            <Link to={profileUrl} className="post-card__author" id={authorId}>{nomeAutor}</Link>
            <VerifiedBadge nome={post.autor.nome} />
            <FounderBadge ativo={Boolean(post.autor.fundador)} />
          </span>
          <span className="post-card__meta">
            <span className="post-card__handle">@{post.autor.nome}</span>
            <span className="post-card__dot" aria-hidden="true">·</span>
            <time className="post-card__time" dateTime={post.data} title={relativeTime(post.data)}>{shortTime(post.data)}</time>
          </span>
        </div>
        {showMenu && (
          <PostMenu
            isOwner={isOwner}
            onDelete={handleDelete}
            pinned={isOwner && !post.parentId ? fixado : undefined}
            onTogglePin={togglePin}
            autor={post.autor}
            onAutorOculto={onAutorOculto}
          />
        )}
      </header>

      {post.texto && (variant === 'detail' || temMarcacao) && (
        // Com marcação não dá para envolver o texto num link (link dentro de link): tocar fora
        // dos @ abre o post do mesmo jeito.
        <div
          className={`post-card__text${variant === 'detail' ? '' : ' is-clicavel'}`}
          data-testid="post-text"
          onClick={variant === 'detail' ? undefined : (event) => !event.target.closest('a') && navigate(postUrl)}
        >
          <p><TextoComMarcacoes texto={post.texto} /></p>
        </div>
      )}
      {post.texto && variant !== 'detail' && !temMarcacao && (
        <Link to={postUrl} className="post-card__text" data-testid="post-text">
          <p>{post.texto}</p>
        </Link>
      )}

      {post.citado && <PostCitado post={post.citado} />}

      {post.imagem && (
        // Posts novos guardam a proporção do corte: a caixa segue essa proporção, com altura limitada.
        // Posts antigos (sem proporção) continuam como eram.
        <Link
          to={postUrl}
          className={`post-card__image${post.imagemProporcao ? ' post-card__image--ajustada' : ''}`}
          style={post.imagemProporcao ? { '--proporcao': post.imagemProporcao } : undefined}
          tabIndex={-1}
        >
          <ImagemDoPost src={post.imagem} alt={`Imagem do post de ${post.autor.nome}`} loading="lazy" />
        </Link>
      )}

      {post.enquete && <PollBlock post={post} />}
      {post.titulo && <LyricQuote versos={post.trechoLetra} titulo={post.titulo} artista={post.artista} />}
      {post.titulo && <MusicBlock post={post} postUrl={postUrl} linkObra={linkObra} isOwner={isOwner} />}

      <footer className="post-card__actions">
        <Link to={postUrl} className="post-action" aria-label={`Comentários: ${commentCount}`}>
          <i className="bi bi-chat" aria-hidden="true" />
          <span>{commentCount}</span>
        </Link>
        <LikeButton postId={post.id} likes={post.likes} curtido={post.curtido} />
        {/* Comentários não são citados: o botão fica nos posts. */}
        {!post.parentId && <CitarButton post={post} />}
        <ShareButton postId={post.id} />
      </footer>
    </article>
  );
}
