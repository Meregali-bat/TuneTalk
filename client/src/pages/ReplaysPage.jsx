import { useParams } from 'react-router-dom';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { BackBar } from '../components/layout/BackBar.jsx';
import { PostCard } from '../components/post/PostCard.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';

// Replays de um post (quem citou ele), do mais novo para o mais antigo.
export function ReplaysPage() {
  const { id } = useParams();
  const { data: replays, error, reload, setData } = useAsync(() => postsApi.replays(id), [id]);

  const quantos = replays ? `${replays.length} ${replays.length === 1 ? 'replay' : 'replays'}` : null;
  const removePost = (postId) => setData((lista) => lista.filter((p) => p.id !== postId));
  const ocultarAutor = (autorId) => setData((lista) => lista.filter((p) => p.autor.id !== autorId));

  return (
    <div className="feed">
      <BackBar titulo="Replays" subtitulo={quantos} />
      <PullToRefresh onRefresh={reload} />

      {error && <div role="alert" className="feed-error"><p>{error.message}</p></div>}
      {!replays && !error && <p role="status" className="composer-hint">Carregando…</p>}
      {replays?.length === 0 && (
        <div className="feed-empty">
          <i className="bi bi-arrow-repeat" aria-hidden="true" />
          <p>Ninguém deu replay nesse post ainda.</p>
        </div>
      )}
      {replays?.length > 0 && (
        <div className="feed-list">
          {replays.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} onAutorOculto={ocultarAutor} />)}
        </div>
      )}
    </div>
  );
}
