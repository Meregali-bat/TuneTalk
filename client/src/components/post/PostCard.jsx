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

function MusicMeta({ post }) {
  return (
    <h3 className="artist-name">
      {post.artista} • {post.tipo} • {releaseInfo(post.releaseDate)} • <StarRating nota={post.nota} />
    </h3>
  );
}

function PostMedia({ post, postUrl }) {
  if (post.tipo === 'album') {
    return (
      <Link to={postUrl} className="container-album">
        <img src={post.capa} alt="Poster do álbum" className="album-poster" />
        <div className="column">
          <h2 className="titulo-album">{post.titulo}</h2>
          <MusicMeta post={post} />
        </div>
      </Link>
    );
  }

  return (
    <div className="container-musica d-flex">
      <Link to={postUrl}>
        <img src={post.capa} alt="Poster da música" className="music-poster" />
      </Link>
      <div className="d-flex align-items-center justify-content-between w-100">
        <Link to={postUrl}>
          <h2 className="titulo-musica">{post.titulo}</h2>
          <MusicMeta post={post} />
        </Link>
        {post.preview && (
          <div className="botao-play ml-auto" style={{ marginRight: '1rem' }}>
            <PlayButton src={post.preview} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PostCard({ post, onDeleted, commentCount = post.quantidadeComentarios, showMenu = true }) {
  const { user } = useAuth();
  const postUrl = `/post/${post.id}`;
  const profileUrl = `/perfil/${post.autor.id}`;

  const handleDelete = async () => {
    await postsApi.remove(post.id);
    onDeleted?.(post.id);
  };

  return (
    <div className="card mb-3 post">
      <div className="card-header">
        <div className="row">
          <div className="col-auto">
            <Link to={profileUrl}>
              <img src={post.autor.fotoPerfil} alt="Foto de perfil do usuário" className="user-profile-picture rounded-circle" />
            </Link>
          </div>
          <div className="col d-flex justify-content-between">
            <div>
              <Link to={profileUrl}>
                <span className="autor-post">{post.autor.nome}</span>
              </Link>{' '}
              <span className="data-post">{relativeTime(post.data)}</span>
            </div>
            {showMenu && <PostMenu isOwner={user?.id === post.autor.id} onDelete={handleDelete} />}
          </div>
        </div>
      </div>

      <div className="card-body">
        <Link to={postUrl}>
          <h5 className="card-title texto-post">{post.texto}</h5>
        </Link>
        <PostMedia post={post} postUrl={postUrl} />
      </div>

      <div className="card-footer">
        <div className="interacoes">
          <Link to={postUrl} className="btn botao-interacao" aria-label={`Comentários: ${commentCount}`}>
            <i className="bi bi-chat" style={{ color: '#2ba84a' }} />{' '}
            <small className="comment-count" style={{ color: '#2ba84a' }}>{commentCount}</small>
          </Link>
          <LikeButton postId={post.id} likes={post.likes} curtido={post.curtido} />
          <ShareButton postId={post.id} />
        </div>
      </div>
    </div>
  );
}
