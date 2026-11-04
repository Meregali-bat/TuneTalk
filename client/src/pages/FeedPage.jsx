import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeed } from '../hooks/useFeed.js';
import { PostCard } from '../components/post/PostCard.jsx';
import { CreatePost } from '../components/post/CreatePost.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';

const TABS = [
  { feed: 'foryou', label: 'Para você', to: '/foryou' },
  { feed: 'seguindo', label: 'Seguindo', to: '/seguindo' },
];

function FeedTabs({ active }) {
  return (
    <div className="feed-tabs-bar">
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
    </div>
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

// Fica no fim da lista: quando chega perto da tela (bem antes de a pessoa ver o último post),
// já pede a próxima página. Assim o feed continua sem a pessoa esperar.
function FimDoFeed({ carregarMais, carregandoMais, erroMais, fim, onRetry, quantidade }) {
  const ref = useRef(null);

  useEffect(() => {
    if (fim || erroMais || !ref.current || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) carregarMais();
    }, { rootMargin: '0px 0px 1500px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
    // Recria ao crescer a lista: se o fim ainda estiver perto da tela, pede mais uma página.
  }, [carregarMais, fim, erroMais, quantidade]);

  if (erroMais) {
    return (
      <div className="feed-more feed-more--error">
        <p>Não deu para carregar mais posts.</p>
        <button type="button" onClick={onRetry}>Tentar de novo</button>
      </div>
    );
  }
  if (fim) return <p className="feed-more feed-more--end">Você chegou ao fim.</p>;
  return (
    <div ref={ref} className="feed-more">
      {carregandoMais && (
        <span role="status" className="feed-more__loading">
          <span className="feed-more__spinner" aria-hidden="true" />
          <span className="visually-hidden">Carregando mais posts</span>
        </span>
      )}
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
  const {
    posts, error, loading, reload, setPosts, carregarMais, tentarMaisDeNovo, carregandoMais, erroMais, fim,
  } = useFeed(feed);
  const [composerOpen, setComposerOpen] = useState(false);

  const removePost = (id) => setPosts((list) => list.filter((post) => post.id !== id));

  return (
    <div className="feed">
      <PullToRefresh onRefresh={reload} />
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

      {posts?.length > 0 && !error && (
        <FimDoFeed
          carregarMais={carregarMais}
          carregandoMais={carregandoMais}
          erroMais={erroMais}
          fim={fim}
          onRetry={tentarMaisDeNovo}
          quantidade={posts.length}
        />
      )}

      <CreatePost open={composerOpen} onOpenChange={setComposerOpen} onCreated={reload} />
    </div>
  );
}
