import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { Modal } from '../components/common/Modal.jsx';
import { PostCard } from '../components/post/PostCard.jsx';
import { Composer } from '../components/post/Composer.jsx';

function ThreadBar() {
  const navigate = useNavigate();
  const location = useLocation();
  // Quem abriu o link direto não tem para onde voltar no histórico.
  const back = () => (location.key === 'default' ? navigate('/foryou') : navigate(-1));

  return (
    <div className="thread-bar">
      <button type="button" className="icon-button" aria-label="Voltar" onClick={back}>
        <i className="bi bi-arrow-left" aria-hidden="true" />
      </button>
      <h1 className="thread-bar__title">Post</h1>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div role="status" className="feed-list">
      <span className="visually-hidden">Carregando post</span>
      <div className="post-card post-card--skeleton" aria-hidden="true">
        <div className="skeleton-row"><span className="skeleton skeleton--avatar" /><span className="skeleton skeleton--line" /></div>
        <span className="skeleton skeleton--text" />
        <span className="skeleton skeleton--music" />
      </div>
    </div>
  );
}

/**
 * Um comentário com a conversa embaixo, como no Twitter: a primeira resposta aparece direto;
 * se houver mais, "Mostrar respostas" busca as outras e mostra ali mesmo.
 */
function ReplyThread({ resposta, onDeleted }) {
  const [todas, setTodas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const respostas = todas ?? (resposta.primeiraResposta ? [resposta.primeiraResposta] : []);
  const faltam = resposta.quantidadeComentarios - respostas.length;

  const mostrarTodas = async () => {
    setCarregando(true);
    try {
      setTodas((await postsApi.get(resposta.id)).respostas);
    } finally {
      setCarregando(false);
    }
  };

  const tirar = (id) => setTodas(respostas.filter((r) => r.id !== id));

  return (
    <div role="group" aria-label={`Conversa do comentário de ${resposta.autor.nome}`} className="reply-thread">
      {/* Todos na mesma coluna; a linha entre as fotos mostra quem responde a quem. */}
      <PostCard post={resposta} variant="reply" onDeleted={onDeleted} threadLine={respostas.length > 0} />
      {respostas.map((r, i) => (
        <PostCard key={r.id} post={r} variant="reply" onDeleted={tirar} threadLine={i < respostas.length - 1} />
      ))}
      {todas === null && faltam > 0 && respostas.length > 0 && (
        <button type="button" className="reply-thread__more" onClick={mostrarTodas} disabled={carregando}>
          {carregando ? 'Carregando…' : `Mostrar respostas (mais ${faltam})`}
        </button>
      )}
    </div>
  );
}

function ParentLink({ pai }) {
  return (
    <Link to={`/post/${pai.id}`} className="thread-parent">
      <i className="bi bi-reply" aria-hidden="true" />
      <span className="thread-parent__body">
        <span>Em resposta a <strong>{pai.autor.nome}</strong></span>
        {(pai.texto || pai.titulo) && <span className="thread-parent__snippet">{pai.texto || pai.titulo}</span>}
      </span>
    </Link>
  );
}

export function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, reload, setData } = useAsync(() => postsApi.get(id), [id]);
  const [replying, setReplying] = useState(false);

  if (error) {
    return (
      <div className="feed">
        <ThreadBar />
        <div role="alert" className="feed-error"><p>{error.message}</p></div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="feed">
        <ThreadBar />
        <ThreadSkeleton />
      </div>
    );
  }

  const { post, pai, respostas } = data;

  const removeReply = (replyId) =>
    setData((current) => ({ ...current, respostas: current.respostas.filter((r) => r.id !== replyId) }));

  const handlePublished = () => {
    setReplying(false);
    reload();
  };

  return (
    <div className="feed thread">
      <ThreadBar />

      {pai && <ParentLink pai={pai} />}

      {/* A key zera o estado interno (ex.: curtida) ao abrir outro post na mesma página. */}
      <PostCard
        key={post.id}
        post={post}
        variant="detail"
        commentCount={respostas.length}
        onDeleted={() => navigate(pai ? `/post/${pai.id}` : '/foryou')}
      />

      <button type="button" className="reply-prompt" aria-label="Comentar" onClick={() => setReplying(true)}>
        <i className="bi bi-chat" aria-hidden="true" />
        <span>Escreva um comentário…</span>
      </button>

      <section className="thread-replies" aria-label="Comentários">
        <h2 className="thread-replies__title">
          Comentários <span className="thread-replies__count">{respostas.length}</span>
        </h2>
        {respostas.length === 0 ? (
          <p className="thread-empty">Ninguém comentou ainda. Que tal começar?</p>
        ) : (
          <div className="reply-list">
            {respostas.map((resposta) => (
              <ReplyThread key={resposta.id} resposta={resposta} onDeleted={removeReply} />
            ))}
          </div>
        )}
      </section>

      <Modal open={replying} title="Comentar" onClose={() => setReplying(false)} variant="sheet">
        <p className="composer-context">Respondendo a <strong>{post.autor.nome}</strong></p>
        <Composer
          parentId={post.id}
          onPublished={handlePublished}
          textLabel="Seu comentário"
          placeholder={`Comente o post de ${post.autor.nome}`}
          submitLabel="Comentar"
        />
      </Modal>
    </div>
  );
}
