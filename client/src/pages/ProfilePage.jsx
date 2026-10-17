import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usersApi } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { PostCard } from '../components/post/PostCard.jsx';
import { CreatePost } from '../components/post/CreatePost.jsx';
import { FollowButton } from '../components/common/FollowButton.jsx';
import { UserListModal } from '../components/profile/UserListModal.jsx';
import { EditProfileModal } from '../components/profile/EditProfileModal.jsx';

const formatMedia = (valor) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function notaMedia(posts) {
  if (posts.length === 0) return null;
  return posts.reduce((soma, post) => soma + post.nota, 0) / posts.length;
}

function ProfileSkeleton() {
  return (
    <div role="status" className="profile-header" aria-live="polite">
      <span className="visually-hidden">Carregando perfil</span>
      <div className="profile-header__top" aria-hidden="true">
        <span className="skeleton profile-header__avatar" />
        <div className="profile-header__identity">
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--text" />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, onClick }) {
  const content = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );
  return (
    <li className="profile-stat">
      {onClick ? (
        <button type="button" className="profile-stat__inner" aria-label={`${label}: ${value}`} onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className="profile-stat__inner">{content}</div>
      )}
    </li>
  );
}

function ProfileHeader({ profile, isOwnProfile, onEdit, onOpenList, onFollowChange }) {
  const { usuario } = profile;
  const media = notaMedia(profile.posts);

  return (
    <header className="profile-header">
      <div className="profile-header__top">
        <img src={usuario.fotoPerfil} alt={`Foto de perfil de ${usuario.nome}`} className="profile-header__avatar" />
        <div className="profile-header__identity">
          <h1>{usuario.nome}</h1>
          {usuario.bio && <p className="profile-header__bio">{usuario.bio}</p>}
        </div>
      </div>

      <ul className="profile-stats" aria-label="Números do perfil">
        <Stat value={profile.quantidadePosts} label="Posts" />
        <Stat value={profile.quantidadeSeguidores} label="Seguidores" onClick={() => onOpenList('seguidores')} />
        <Stat value={profile.quantidadeSeguindo} label="Seguindo" onClick={() => onOpenList('seguindo')} />
        {media !== null && <Stat value={formatMedia(media)} label="Nota média" />}
      </ul>

      <div className="profile-header__actions">
        {isOwnProfile ? (
          <button type="button" className="follow-button follow-button--md is-following" onClick={onEdit}>
            Editar perfil
          </button>
        ) : (
          <FollowButton
            userId={usuario.id}
            following={profile.seguindoIds.includes(usuario.id)}
            onChange={onFollowChange}
          />
        )}
      </div>
    </header>
  );
}

function EmptyPosts({ nome, isOwnProfile, onCompose }) {
  if (!isOwnProfile) {
    return (
      <div className="feed-empty">
        <i className="bi bi-music-note-beamed" aria-hidden="true" />
        <p>{nome} ainda não postou nada.</p>
      </div>
    );
  }
  return (
    <div className="feed-empty">
      <i className="bi bi-vinyl" aria-hidden="true" />
      <h2>Seu perfil está esperando a primeira música</h2>
      <p>Escolha algo que você anda ouvindo e dê sua nota.</p>
      <button type="button" className="feed-empty__action" onClick={onCompose}>Fazer o primeiro post</button>
    </div>
  );
}

export function ProfilePage() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const { data: profile, error, reload, setData } = useAsync(() => usersApi.profile(id), [id]);
  const [openList, setOpenList] = useState(null);
  const [editing, setEditing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  if (error) {
    return (
      <div className="feed">
        <div role="alert" className="feed-error"><p>{error.message}</p></div>
      </div>
    );
  }
  if (!profile) return <div className="feed"><ProfileSkeleton /></div>;

  const isOwnProfile = profile.usuario.id === user.id;

  const handleSaved = (usuario) => {
    updateUser({ nome: usuario.nome });
    setEditing(false);
    reload();
  };

  const removePost = (postId) =>
    setData((p) => ({ ...p, posts: p.posts.filter((post) => post.id !== postId), quantidadePosts: p.quantidadePosts - 1 }));

  return (
    <div className="feed profile">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEdit={() => setEditing(true)}
        onOpenList={setOpenList}
        onFollowChange={reload}
      />

      <h2 className="profile-section-title">Posts</h2>
      {profile.posts.length === 0 ? (
        <EmptyPosts nome={profile.usuario.nome} isOwnProfile={isOwnProfile} onCompose={() => setComposerOpen(true)} />
      ) : (
        <div className="feed-list">
          {profile.posts.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} />)}
        </div>
      )}

      <UserListModal
        open={openList === 'seguidores'}
        title="Seguidores"
        users={profile.seguidores}
        seguindoIds={profile.seguindoIds}
        onClose={() => setOpenList(null)}
        onFollowChange={reload}
      />
      <UserListModal
        open={openList === 'seguindo'}
        title="Seguindo"
        users={profile.seguindo}
        seguindoIds={profile.seguindoIds}
        onClose={() => setOpenList(null)}
        onFollowChange={reload}
      />
      {isOwnProfile && editing && (
        <EditProfileModal open usuario={profile.usuario} onClose={() => setEditing(false)} onSaved={handleSaved} />
      )}
      {isOwnProfile && (
        <CreatePost open={composerOpen} onOpenChange={setComposerOpen} onCreated={reload} />
      )}
    </div>
  );
}
