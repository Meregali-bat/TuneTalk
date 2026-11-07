import { useParams } from 'react-router-dom';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { BackBar } from '../components/layout/BackBar.jsx';
import { PostCard } from '../components/post/PostCard.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';

// Remixes de um post (quem citou ele), do mais novo para o mais antigo.
export function RemixesPage() {
  const { id } = useParams();
  const { data: remixes, error, reload, setData } = useAsync(() => postsApi.remixes(id), [id]);

  const quantos = remixes ? `${remixes.length} ${remixes.length === 1 ? 'remix' : 'remixes'}` : null;
  const removePost = (postId) => setData((lista) => lista.filter((p) => p.id !== postId));
  const ocultarAutor = (autorId) => setData((lista) => lista.filter((p) => p.autor.id !== autorId));

  return (
    <div className="feed">
      <BackBar titulo="Remixes" subtitulo={quantos} />
      <PullToRefresh onRefresh={reload} />

      {error && <div role="alert" className="feed-error"><p>{error.message}</p></div>}
      {!remixes && !error && <p role="status" className="composer-hint">Carregando…</p>}
      {remixes?.length === 0 && (
        <div className="feed-empty">
          <i className="bi bi-shuffle" aria-hidden="true" />
          <p>Ninguém remixou esse post ainda.</p>
        </div>
      )}
      {remixes?.length > 0 && (
        <div className="feed-list">
          {remixes.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} onAutorOculto={ocultarAutor} />)}
        </div>
      )}
    </div>
  );
}
