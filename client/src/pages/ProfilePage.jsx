import { useState } from 'react';
import { formatMediaEstrelas } from '../../../shared/rating.js';
import { useParams } from 'react-router-dom';
import { usersApi } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { PostCard } from '../components/post/PostCard.jsx';
import { CreatePost } from '../components/post/CreatePost.jsx';
import { FollowButton } from '../components/common/FollowButton.jsx';
import { UserListModal } from '../components/profile/UserListModal.jsx';
import { EditProfileModal } from '../components/profile/EditProfileModal.jsx';
import { ChangePasswordModal } from '../components/profile/ChangePasswordModal.jsx';
import { PetalRain } from '../components/effects/PetalRain.jsx';
import { profileEffectFor } from '../components/effects/profileEffects.js';
import { VerifiedBadge } from '../components/effects/VerifiedBadge.jsx';
import { FounderBadge } from '../components/effects/FounderBadge.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';

// Só posts com música têm nota. A média sai na escala guardada (0 a 10) e é mostrada em estrelas.
function notaMedia(posts) {
  const notas = posts.map((post) => post.nota).filter((nota) => nota !== null && nota !== undefined);
  if (notas.length === 0) return null;
  return notas.reduce((soma, nota) => soma + nota, 0) / notas.length;
}

function ProfileSkeleton() {
  return (
    <div role="status" className="profile-header" aria-live="polite">
      <span className="visually-hidden">Carregando perfil</span>
      <div className="profile-banner skeleton" aria-hidden="true" />
      <div className="profile-header__body" aria-hidden="true">
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

// Nome de exibição (livre) quando existe; senão, o nome de usuário. O @ é sempre o nome de usuário.
export const displayName = (usuario) => usuario.nomeExibicao || usuario.nome;

function ProfileHeader({ profile, isOwnProfile, onEdit, onChangePassword, onOpenList, onFollowChange }) {
  const { usuario } = profile;
  const nome = displayName(usuario);
  const media = notaMedia(profile.posts);

  return (
    <header className="profile-header">
      {usuario.bannerUrl ? (
        <img src={usuario.bannerUrl} alt={`Capa do perfil de ${nome}`} className="profile-banner" />
      ) : (
        <div className="profile-banner profile-banner--padrao" data-testid="capa-padrao" aria-hidden="true" />
      )}

      <div className="profile-header__body">
        <div className="profile-header__row">
          <img src={usuario.fotoPerfil} alt={`Foto de perfil de ${nome}`} className="profile-header__avatar" />
          <div className="profile-header__actions">
            {isOwnProfile ? (
              <>
                <button type="button" className="follow-button follow-button--md is-following" onClick={onEdit}>
                  Editar perfil
                </button>
                {/* No celular vira só o ícone de chave; o nome continua para leitores de tela. */}
                <button
                  type="button"
                  className="follow-button follow-button--md is-following profile-action--senha"
                  aria-label="Trocar senha"
                  onClick={onChangePassword}
                >
                  <i className="bi bi-key" aria-hidden="true" />
                  <span className="profile-action__label">Trocar senha</span>
                </button>
              </>
            ) : (
              <FollowButton
                userId={usuario.id}
                following={profile.seguindoIds.includes(usuario.id)}
                onChange={onFollowChange}
              />
            )}
          </div>
        </div>

        <div className="profile-header__identity">
          <div className="profile-header__name">
            <h1>{nome}</h1>
            <VerifiedBadge nome={usuario.nome} />
            <FounderBadge ativo={Boolean(usuario.fundadorDesde)} />
          </div>
          <p className="profile-header__handle">@{usuario.nome}</p>
          {usuario.bio && <p className="profile-header__bio">{usuario.bio}</p>}
        </div>

        <ul className="profile-stats" aria-label="Números do perfil">
          <Stat value={profile.quantidadePosts} label="Posts" />
          <Stat value={profile.quantidadeSeguidores} label="Seguidores" onClick={() => onOpenList('seguidores')} />
          <Stat value={profile.quantidadeSeguindo} label="Seguindo" onClick={() => onOpenList('seguindo')} />
          {media !== null && <Stat value={`${formatMediaEstrelas(media)}/5`} label="Nota média" />}
        </ul>
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
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState('');
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
      <PullToRefresh onRefresh={reload} />
      {/* key: só cai de novo ao abrir outro perfil, não quando os dados deste recarregam (ex.: seguir). */}
      {profileEffectFor(profile.usuario.nome) === 'petalas' && <PetalRain key={profile.usuario.id} />}
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEdit={() => setEditing(true)}
        onChangePassword={() => { setNotice(''); setChangingPassword(true); }}
        onOpenList={setOpenList}
        onFollowChange={reload}
      />
      {notice && (
        <p role="status" className="profile-notice">
          <i className="bi bi-check-circle-fill" aria-hidden="true" /> {notice}
        </p>
      )}

      <h2 className="profile-section-title">Posts</h2>
      {profile.posts.length === 0 ? (
        <EmptyPosts nome={displayName(profile.usuario)} isOwnProfile={isOwnProfile} onCompose={() => setComposerOpen(true)} />
      ) : (
        <div className="feed-list">
          {profile.posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={removePost} onPinChange={reload} showPinned />
          ))}
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
      {isOwnProfile && changingPassword && (
        <ChangePasswordModal
          open
          onClose={() => setChangingPassword(false)}
          onChanged={() => {
            setChangingPassword(false);
            setNotice('Senha alterada. Os outros aparelhos conectados precisam entrar de novo.');
          }}
        />
      )}
      {isOwnProfile && editing && (
        <EditProfileModal open usuario={profile.usuario} onClose={() => setEditing(false)} onSaved={handleSaved} />
      )}
      {isOwnProfile && (
        <CreatePost open={composerOpen} onOpenChange={setComposerOpen} onCreated={reload} />
      )}
    </div>
  );
}
