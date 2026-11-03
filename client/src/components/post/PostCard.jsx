import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { postsApi } from '../../api/index.js';
import { releaseInfo } from '../../utils/postFormat.js';
import { relativeTime } from '../../utils/relativeTime.js';
import { StarRating } from './StarRating.jsx';
import { formatEstrelas } from '../../../../shared/rating.js';
import { splitMentions } from '../../../../shared/mentions.js';
import { VerifiedBadge } from '../effects/VerifiedBadge.jsx';
import { FounderBadge } from '../effects/FounderBadge.jsx';
import { LikeButton } from './LikeButton.jsx';
import { PlayButton } from './PlayButton.jsx';
import { ShareButton } from './ShareButton.jsx';
import { PostMenu } from './PostMenu.jsx';

// Texto com as marcações (@usuario) como link para o perfil.
function TextoComMarcacoes({ texto }) {
  return splitMentions(texto).map((parte, i) => (parte.tipo === 'mencao'
    ? <Link key={i} to={`/perfil/@${parte.valor}`} className="mention">@{parte.valor}</Link>
    : <span key={i}>{parte.valor}</span>));
}

const TIPO_LABEL = { album: 'álbum', 'música': 'música' };

function MusicBlock({ post, postUrl }) {
  const isAlbum = post.tipo === 'album';
  const meta = [post.artista, TIPO_LABEL[post.tipo], releaseInfo(post.releaseDate)].filter(Boolean).join(' • ');

  return (
    <div className="post-card__music">
      <Link to={postUrl} className="post-card__music-link">
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
      {!isAlbum && post.preview && <PlayButton src={post.preview} />}
    </div>
  );
}

// variant: "feed" (padrão), "detail" (post aberto na página dele) ou "reply" (resposta dentro de um post).
// showPinned: mostra a etiqueta "Fixado" (só faz sentido no perfil do autor).
export function PostCard({
  post, onDeleted, onPinChange, commentCount = post.quantidadeComentarios, showMenu = true, showPinned = false, variant = 'feed',
  threadLine = false,
}) {
  const { user } = useAuth();
  const [fixado, setFixado] = useState(Boolean(post.fixado));
  useEffect(() => setFixado(Boolean(post.fixado)), [post.fixado]);
  const isOwner = user?.id === post.autor.id;
  const navigate = useNavigate();
  const temMarcacao = splitMentions(post.texto ?? '').some((p) => p.tipo === 'mencao');
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
      aria-label={post.titulo ? `Post de ${post.autor.nome} sobre ${post.titulo}` : `Post de ${post.autor.nome}`}
    >
      {showPinned && fixado && (
        <p className="post-card__pinned"><i className="bi bi-pin-angle-fill" aria-hidden="true" /> Fixado</p>
      )}
      <header className="post-card__header">
        <Link to={profileUrl} className="post-card__avatar" tabIndex={-1} aria-hidden="true">
          <img src={post.autor.fotoPerfil} alt="" />
        </Link>
        <div className="post-card__who">
          <span className="post-card__author-line">
            <Link to={profileUrl} className="post-card__author" id={authorId}>{post.autor.nome}</Link>
            <VerifiedBadge nome={post.autor.nome} />
            <FounderBadge ativo={Boolean(post.autor.fundador)} />
          </span>
          <time className="post-card__time" dateTime={post.data}>{relativeTime(post.data)}</time>
        </div>
        {showMenu && (
          <PostMenu
            isOwner={isOwner}
            onDelete={handleDelete}
            pinned={isOwner && !post.parentId ? fixado : undefined}
            onTogglePin={togglePin}
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

      {post.imagem && (
        // Posts novos guardam a proporção do corte: a caixa segue essa proporção, com altura limitada.
        // Posts antigos (sem proporção) continuam como eram.
        <Link
          to={postUrl}
          className={`post-card__image${post.imagemProporcao ? ' post-card__image--ajustada' : ''}`}
          style={post.imagemProporcao ? { '--proporcao': post.imagemProporcao } : undefined}
          tabIndex={-1}
        >
          <img src={post.imagem} alt={`Imagem do post de ${post.autor.nome}`} loading="lazy" />
        </Link>
      )}

      {post.titulo && <MusicBlock post={post} postUrl={postUrl} />}

      <footer className="post-card__actions">
        <Link to={postUrl} className="post-action" aria-label={`Comentários: ${commentCount}`}>
          <i className="bi bi-chat" aria-hidden="true" />
          <span>{commentCount}</span>
        </Link>
        <LikeButton postId={post.id} likes={post.likes} curtido={post.curtido} />
        <ShareButton postId={post.id} />
      </footer>
    </article>
  );
}
