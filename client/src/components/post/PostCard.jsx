import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { postsApi } from '../../api/index.js';
import { releaseInfo } from '../../utils/postFormat.js';
import { relativeTime } from '../../utils/relativeTime.js';
import { StarRating } from './StarRating.jsx';
import { LikeButton } from './LikeButton.jsx';
import { PlayButton } from './PlayButton.jsx';
import { ShareButton } from './ShareButton.jsx';
import { PostMenu } from './PostMenu.jsx';

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
          <span className="post-card__stars"><StarRating nota={post.nota} /></span>
        </div>
      </Link>
      {!isAlbum && post.preview && <PlayButton src={post.preview} />}
    </div>
  );
}

export function PostCard({ post, onDeleted, commentCount = post.quantidadeComentarios, showMenu = true }) {
  const { user } = useAuth();
  const authorId = useId();
  const postUrl = `/post/${post.id}`;
  const profileUrl = `/perfil/${post.autor.id}`;

  const handleDelete = async () => {
    await postsApi.remove(post.id);
    onDeleted?.(post.id);
  };

  return (
    <article className="post-card" aria-label={`Post de ${post.autor.nome} sobre ${post.titulo}`}>
      <header className="post-card__header">
        <Link to={profileUrl} className="post-card__avatar" tabIndex={-1} aria-hidden="true">
          <img src={post.autor.fotoPerfil} alt="" />
        </Link>
        <div className="post-card__who">
          <Link to={profileUrl} className="post-card__author" id={authorId}>{post.autor.nome}</Link>
          <time className="post-card__time" dateTime={post.data}>{relativeTime(post.data)}</time>
        </div>
        {showMenu && <PostMenu isOwner={user?.id === post.autor.id} onDelete={handleDelete} />}
      </header>

      {post.texto && (
        <Link to={postUrl} className="post-card__text" data-testid="post-text">
          <p>{post.texto}</p>
        </Link>
      )}

      <MusicBlock post={post} postUrl={postUrl} />

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
