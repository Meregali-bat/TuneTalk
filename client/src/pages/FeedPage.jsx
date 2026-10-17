import { Link } from 'react-router-dom';
import { postsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { PostCard } from '../components/post/PostCard.jsx';
import { CreatePost } from '../components/post/CreatePost.jsx';

const TABS = [
  { feed: 'foryou', label: 'Foryou', to: '/foryou' },
  { feed: 'seguindo', label: 'Seguindo', to: '/seguindo' },
];

function FeedTabs({ active }) {
  return (
    <div className="feeds">
      <div className="feeds-a">
        {TABS.map((tab) => (
          <Link key={tab.feed} to={tab.to} aria-current={tab.feed === active ? 'page' : undefined}>
            {tab.feed === active ? <strong>{tab.label}</strong> : tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function FeedPage({ feed }) {
  const { data: posts, error, loading, reload, setData } = useAsync(() => postsApi.feed(feed), [feed]);

  const removePost = (id) => setData((list) => list.filter((post) => post.id !== id));

  return (
    <>
      <FeedTabs active={feed} />
      <div className="container-xl">
        <div className="row">
          {error && <div role="alert" className="alert alert-danger mt-3">{error.message}</div>}
          {!loading && posts?.length === 0 && (
            <p className="text-center mt-4" style={{ color: '#fff' }}>Nenhum post por aqui ainda.</p>
          )}
          {posts?.map((post) => (
            <div key={post.id} className="col-lg-10 offset-lg-1">
              <PostCard post={post} onDeleted={removePost} />
            </div>
          ))}
        </div>
        <CreatePost onCreated={reload} />
      </div>
    </>
  );
}
