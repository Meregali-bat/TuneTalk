import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BackBar } from '../components/layout/BackBar.jsx';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { Modal } from '../components/common/Modal.jsx';
import { PostCard } from '../components/post/PostCard.jsx';
import { Composer } from '../components/post/Composer.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';

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

// Respostas de um post e, embaixo de cada uma, as respostas dela (até 3 níveis), numa lista só,
// na ordem da conversa — como o Twitter mostra ao abrir "Mostrar respostas".
async function carregarConversa(postId, nivel = 1) {
  const { respostas } = await postsApi.get(postId);
  const linhas = [];
  for (const resposta of respostas) {
    linhas.push(resposta);
    if (resposta.quantidadeComentarios > 0 && nivel < 3) linhas.push(...await carregarConversa(resposta.id, nivel + 1));
  }
  return linhas;
}

/**
 * Um comentário com a conversa embaixo, como no Twitter: a primeira resposta aparece direto;
 * se ainda houver resposta escondida (do comentário ou das respostas), "Mostrar respostas"
 * lista o resto ali mesmo, na mesma coluna.
 */
function ReplyThread({ resposta, onDeleted, onAutorOculto }) {
  const [todas, setTodas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const respostas = todas ?? (resposta.primeiraResposta ? [resposta.primeiraResposta] : []);
  const temMais = todas === null && respostas.length > 0 && (
    resposta.quantidadeComentarios > respostas.length || respostas.some((r) => r.quantidadeComentarios > 0)
  );

  const mostrarTodas = async () => {
    setCarregando(true);
    try {
      setTodas(await carregarConversa(resposta.id));
    } finally {
      setCarregando(false);
    }
  };

  const tirar = (id) => setTodas(respostas.filter((r) => r.id !== id));

  return (
    <div role="group" aria-label={`Conversa do comentário de ${resposta.autor.nome}`} className="reply-thread">
      {/* Todos na mesma coluna; a linha entre as fotos mostra quem responde a quem. */}
      <PostCard post={resposta} variant="reply" onDeleted={onDeleted} threadLine={respostas.length > 0} onAutorOculto={onAutorOculto} />
      {respostas.map((r, i) => (
        <PostCard key={r.id} post={r} variant="reply" onDeleted={tirar} threadLine={i < respostas.length - 1} onAutorOculto={onAutorOculto} />
      ))}
      {temMais && (
        <button type="button" className="reply-thread__more" onClick={mostrarTodas} disabled={carregando}>
          {carregando ? 'Carregando…' : 'Mostrar respostas'}
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
        <BackBar titulo="Post" />
        <div role="alert" className="feed-error"><p>{error.message}</p></div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="feed">
        <BackBar titulo="Post" />
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
      <BackBar titulo="Post" />
      <PullToRefresh onRefresh={reload} />

      {pai && <ParentLink pai={pai} />}

      {/* A key zera o estado interno (ex.: curtida) ao abrir outro post na mesma página. */}
      <PostCard
        key={post.id}
        post={post}
        variant="detail"
        commentCount={respostas.length}
        onDeleted={() => navigate(pai ? `/post/${pai.id}` : '/foryou')}
        onAutorOculto={() => navigate('/foryou')}
      />

      {/* Remixes (quem citou este post): abre a lista. */}
      {post.quantidadeRemixes > 0 && (
        <Link to={`/post/${post.id}/remixes`} className="thread-remixes">
          <i className="bi bi-shuffle" aria-hidden="true" />
          <span>
            <strong>{post.quantidadeRemixes}</strong> {post.quantidadeRemixes === 1 ? 'remix' : 'remixes'}
          </span>
          <i className="bi bi-chevron-right thread-remixes__seta" aria-hidden="true" />
        </Link>
      )}

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
              <ReplyThread key={resposta.id} resposta={resposta} onDeleted={removeReply} onAutorOculto={reload} />
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
