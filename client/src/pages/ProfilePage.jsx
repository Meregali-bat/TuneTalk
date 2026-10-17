import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usersApi } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { PostCard } from '../components/post/PostCard.jsx';
import { FollowButton } from '../components/common/FollowButton.jsx';
import { UserListModal } from '../components/profile/UserListModal.jsx';
import { EditProfileModal } from '../components/profile/EditProfileModal.jsx';

// Mantém <span> (como no EJS) para herdar o estilo de `.textoPerfil span`, mas acessível como botão.
function Counter({ label, value, onClick }) {
  return (
    <span
      className="seguidores"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onClick()}
    >
      {label} <strong>{value}</strong>
    </span>
  );
}

function ProfileHeader({ profile, isOwnProfile, onEdit, onOpenList, onFollowChange }) {
  const { usuario } = profile;

  return (
    <div className="row mb-5" style={{ margin: 0 }}>
      <div className="container-fluid">
        <div className="row">
          <div className="col-1" />
          <div className="col-md-10">
            <div className="row p-3">
              <div className="col-12 col-md-1" />
              <div className="col-12 col-md-2 d-flex justify-content-center align-items-center">
                <img src={usuario.fotoPerfil} alt="Foto de perfil do usuário" className="profile-picture" />
              </div>
              <div className="col-12 col-md-6 textoPerfil p-3 d-flex flex-column justify-content-center text-center">
                <h1>{usuario.nome}</h1>
                <span className="text-center">{usuario.bio}</span>
                <div className="mt-3">
                  <Counter label="Seguidores" value={profile.quantidadeSeguidores} onClick={() => onOpenList('seguidores')} />{' '}
                  <Counter label="Seguindo" value={profile.quantidadeSeguindo} onClick={() => onOpenList('seguindo')} />{' '}
                  <span className="seguidores">Posts <strong>{profile.quantidadePosts}</strong></span>
                </div>
              </div>
              <div className="col-12 col-md-2 d-flex justify-content-center align-items-center">
                {isOwnProfile ? (
                  <button type="button" className="botao-editar-perfil" onClick={onEdit}>
                    <span>Editar perfil</span>
                  </button>
                ) : (
                  <FollowButton
                    userId={usuario.id}
                    following={profile.seguindoIds.includes(usuario.id)}
                    onChange={onFollowChange}
                  />
                )}
              </div>
              <div className="col-12 col-md-1" />
            </div>
          </div>
          <div className="col-1" />
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const { data: profile, error, reload, setData } = useAsync(() => usersApi.profile(id), [id]);
  const [openList, setOpenList] = useState(null);
  const [editing, setEditing] = useState(false);

  if (error) return <div role="alert" className="alert alert-danger m-4">{error.message}</div>;
  if (!profile) return null;

  const isOwnProfile = profile.usuario.id === user.id;

  const handleSaved = (usuario) => {
    updateUser({ nome: usuario.nome });
    setEditing(false);
    reload();
  };

  const removePost = (postId) =>
    setData((p) => ({ ...p, posts: p.posts.filter((post) => post.id !== postId), quantidadePosts: p.quantidadePosts - 1 }));

  return (
    <>
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEdit={() => setEditing(true)}
        onOpenList={setOpenList}
        onFollowChange={reload}
      />

      <div className="container-xl">
        <span style={{ color: '#fff', marginBottom: '5rem', fontSize: '2rem' }}>Posts</span>
        <hr style={{ borderTop: '2px solid #2ba84a' }} />
        <div className="row mt-4">
          {profile.posts.map((post) => (
            <div key={post.id} className="col-lg-10 offset-lg-1">
              <PostCard post={post} onDeleted={removePost} />
            </div>
          ))}
        </div>
      </div>

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
    </>
  );
}
