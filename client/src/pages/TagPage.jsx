import { useParams } from 'react-router-dom';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { BackBar } from '../components/layout/BackBar.jsx';
import { PostCard } from '../components/post/PostCard.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';
import { hashflag } from '../utils/hashflags.js';

// Posts (e comentários) com uma hashtag, do mais novo para o mais antigo.
export function TagPage() {
  const { tag } = useParams();
  const { data: posts, error, reload, setData } = useAsync(() => postsApi.byHashtag(tag), [tag]);

  const quantos = posts ? `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}` : null;
  const removePost = (id) => setData((lista) => lista.filter((p) => p.id !== id));
  const ocultarAutor = (autorId) => setData((lista) => lista.filter((p) => p.autor.id !== autorId));

  return (
    <div className="feed">
      <PullToRefresh onRefresh={reload} />
      <BackBar titulo={`#${tag}${hashflag(tag) ? ` ${hashflag(tag).emoji}` : ''}`} subtitulo={quantos} />

      {error && <div role="alert" className="feed-error"><p>{error.message}</p></div>}
      {!posts && !error && <p role="status" className="composer-hint">Carregando…</p>}
      {posts?.length === 0 && (
        <div className="feed-empty">
          <i className="bi bi-hash" aria-hidden="true" />
          <p>Ninguém usou #{tag} ainda.</p>
        </div>
      )}
      {posts?.length > 0 && (
        <div className="feed-list">
          {posts.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} onAutorOculto={ocultarAutor} />)}
        </div>
      )}
    </div>
  );
}
