import { useState } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { PostCard } from '../components/post/PostCard.jsx';
import { CreatePost } from '../components/post/CreatePost.jsx';

const TABS = [
  { feed: 'foryou', label: 'Para você', to: '/foryou' },
  { feed: 'seguindo', label: 'Seguindo', to: '/seguindo' },
];

function FeedTabs({ active }) {
  return (
    <nav className="feed-tabs" aria-label="Feeds">
      {TABS.map((tab) => (
        <Link
          key={tab.feed}
          to={tab.to}
          className={`feed-tabs__tab${tab.feed === active ? ' is-active' : ''}`}
          aria-current={tab.feed === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function FeedSkeleton() {
  return (
    <div role="status" className="feed-list">
      <span className="visually-hidden">Carregando posts</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="post-card post-card--skeleton" aria-hidden="true">
          <div className="skeleton-row"><span className="skeleton skeleton--avatar" /><span className="skeleton skeleton--line" /></div>
          <span className="skeleton skeleton--text" />
          <span className="skeleton skeleton--music" />
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ feed, onCompose }) {
  if (feed === 'seguindo') {
    return (
      <div className="feed-empty">
        <i className="bi bi-people" aria-hidden="true" />
        <h2>Nada de quem você segue ainda</h2>
        <p>Siga pessoas pelo perfil delas para ver aqui o que estão ouvindo.</p>
        <Link to="/foryou" className="feed-empty__action">Ver posts para você</Link>
      </div>
    );
  }
  return (
    <div className="feed-empty">
      <i className="bi bi-vinyl" aria-hidden="true" />
      <h2>Ainda não há posts</h2>
      <p>Escolha uma música, dê sua nota e comece a conversa.</p>
      <button type="button" className="feed-empty__action" onClick={onCompose}>Fazer o primeiro post</button>
    </div>
  );
}

export function FeedPage({ feed }) {
  const { data: posts, error, loading, reload, setData } = useAsync(() => postsApi.feed(feed), [feed]);
  const [composerOpen, setComposerOpen] = useState(false);

  const removePost = (id) => setData((list) => list.filter((post) => post.id !== id));

  return (
    <div className="feed">
      <FeedTabs active={feed} />

      {loading && !posts && <FeedSkeleton />}

      {error && (
        <div role="alert" className="feed-error">
          <p>{error.message}</p>
          <button type="button" onClick={reload}>Tentar de novo</button>
        </div>
      )}

      {posts?.length === 0 && <EmptyFeed feed={feed} onCompose={() => setComposerOpen(true)} />}

      {posts?.length > 0 && (
        <div className="feed-list">
          {posts.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} />)}
        </div>
      )}

      <CreatePost open={composerOpen} onOpenChange={setComposerOpen} onCreated={reload} />
    </div>
  );
}
