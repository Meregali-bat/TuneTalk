import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { PostCard } from '../components/post/PostCard.jsx';

function CommentForm({ postId, onCommented }) {
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!texto.trim()) return;
    setSending(true);
    try {
      await postsApi.comment(postId, texto);
      setTexto('');
      await onCommented();
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="comentario-form" onSubmit={submit}>
      <input
        type="text"
        className="comment-input"
        placeholder="Poste sua resposta"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
      />
      <button type="submit" className="comment-button" aria-label="Enviar comentário" disabled={sending}>
        <i className="bi bi-send" />
      </button>
    </form>
  );
}

function Comment({ comentario }) {
  return (
    <div className="comment" style={{ padding: 0 }}>
      <div className="container-imagem">
        <Link to={`/perfil/${comentario.autor.id}`}>
          <img src={comentario.autor.fotoPerfil} alt="Foto de perfil do usuário" className="user-profile-picture" />
        </Link>
      </div>
      <div className="nome-texto">
        <h4 className="username">{comentario.autor.nome}</h4>
        <p className="card-text">{comentario.texto}</p>
      </div>
    </div>
  );
}

export function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, reload } = useAsync(() => postsApi.get(id), [id]);

  if (error) return <div role="alert" className="alert alert-danger m-4">{error.message}</div>;
  if (!data) return null;

  const { post, comentarios } = data;

  return (
    <div className="post mt-5" style={{ width: '80%', marginLeft: '10%', border: 0 }}>
      <PostCard post={post} commentCount={comentarios.length} onDeleted={() => navigate('/foryou')} />
      <CommentForm postId={post.id} onCommented={reload} />
      <div className="container-comentario">
        {comentarios.map((comentario) => (
          <Comment key={comentario.id} comentario={comentario} />
        ))}
      </div>
    </div>
  );
}
