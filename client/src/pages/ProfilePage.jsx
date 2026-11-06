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
import { ChangeEmailModal } from '../components/profile/ChangeEmailModal.jsx';
import { PetalRain, ProfileEffect } from '../components/effects/PetalRain.jsx';
import { efeitoVisivel } from '../../../shared/profileEffect.js';
import { profileEffectFor } from '../components/effects/profileEffects.js';
import { VerifiedBadge } from '../components/effects/VerifiedBadge.jsx';
import { FounderBadge, mostraSeloFundador } from '../components/effects/FounderBadge.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';
import { ProfileFavorites } from '../components/profile/ProfileFavorites.jsx';
import { EditFavoritesModal } from '../components/profile/EditFavoritesModal.jsx';
import { ProfileMenu } from '../components/profile/ProfileMenu.jsx';

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

const SEM_RELACAO = { bloqueado: false, meBloqueou: false, silenciado: false };

function ProfileHeader({
  profile, isOwnProfile, onEdit, onChangeEmail, onChangePassword, onOpenList, onFollowChange, onRelacaoChange,
}) {
  const { usuario } = profile;
  const relacao = profile.relacao ?? SEM_RELACAO;
  const comBloqueio = relacao.bloqueado || relacao.meBloqueou;
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
                {/* No celular viram só os ícones; o nome continua para leitores de tela. */}
                <button
                  type="button"
                  className="follow-button follow-button--md is-following profile-action--senha"
                  aria-label="Trocar email"
                  onClick={onChangeEmail}
                >
                  <i className="bi bi-envelope" aria-hidden="true" />
                  <span className="profile-action__label">Trocar email</span>
                </button>
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
              <>
                {!comBloqueio && (
                  <FollowButton
                    userId={usuario.id}
                    following={profile.seguindoIds.includes(usuario.id)}
                    onChange={onFollowChange}
                  />
                )}
                <ProfileMenu usuario={usuario} relacao={relacao} onMudou={onRelacaoChange} />
              </>
            )}
          </div>
        </div>

        <div className="profile-header__identity">
          <div className="profile-header__name">
            <h1>{nome}</h1>
            <VerifiedBadge nome={usuario.nome} />
            <FounderBadge ativo={mostraSeloFundador(usuario)} />
          </div>
          <p className="profile-header__handle">@{usuario.nome}</p>
          {usuario.bio && <p className="profile-header__bio">{usuario.bio}</p>}
        </div>

        {!comBloqueio && (
        <ul className="profile-stats" aria-label="Números do perfil">
          <Stat value={profile.quantidadePosts} label="Posts" />
          <Stat value={profile.quantidadeSeguidores} label="Seguidores" onClick={() => onOpenList('seguidores')} />
          <Stat value={profile.quantidadeSeguindo} label="Seguindo" onClick={() => onOpenList('seguindo')} />
          {media !== null && <Stat value={`${formatMediaEstrelas(media)}/5`} label="Nota média" />}
        </ul>
        )}
      </div>
    </header>
  );
}

// Aba "Comentários": só busca quando aberta pela primeira vez.
function ProfileComments({ usuarioId, nome }) {
  const { data: comentarios, error, setData } = useAsync(() => usersApi.comments(usuarioId), [usuarioId]);
  const remover = (id) => setData((lista) => lista.filter((c) => c.id !== id));

  if (error) return <div role="alert" className="feed-error"><p>{error.message}</p></div>;
  if (!comentarios) return <p role="status" className="composer-hint">Carregando comentários…</p>;
  if (comentarios.length === 0) {
    return (
      <div className="feed-empty">
        <i className="bi bi-chat" aria-hidden="true" />
        <p>{nome} ainda não comentou nada.</p>
      </div>
    );
  }
  return (
    <div className="feed-list">
      {comentarios.map((c) => <PostCard key={c.id} post={c} onDeleted={remover} />)}
    </div>
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
  const [changingEmail, setChangingEmail] = useState(false);
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [notice, setNotice] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [aba, setAba] = useState('posts');
  const [abriuComentarios, setAbriuComentarios] = useState(false);

  if (error) {
    return (
      <div className="feed">
        <div role="alert" className="feed-error"><p>{error.message}</p></div>
      </div>
    );
  }
  if (!profile) return <div className="feed"><ProfileSkeleton /></div>;

  const isOwnProfile = profile.usuario.id === user.id;
  const relacao = profile.relacao ?? SEM_RELACAO;
  const comBloqueio = relacao.bloqueado || relacao.meBloqueou;
  const efeito = comBloqueio ? null : efeitoVisivel(profile.usuario);

  const handleSaved = (usuario) => {
    updateUser({ nome: usuario.nome });
    setEditing(false);
    reload();
  };

  const removePost = (postId) =>
    setData((p) => ({ ...p, posts: p.posts.filter((post) => post.id !== postId), quantidadePosts: p.quantidadePosts - 1 }));

  return (
    <div className="feed profile">
      {/* key: só cai de novo ao abrir outro perfil, não quando os dados deste recarregam (ex.: seguir). */}
      {profileEffectFor(profile.usuario.nome) === 'petalas'
        ? <PetalRain key={profile.usuario.id} />
        : efeito && <ProfileEffect key={`${profile.usuario.id}-${efeito.tipo}-${efeito.paleta}`} efeito={efeito} />}
      <PullToRefresh onRefresh={reload} />
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEdit={() => setEditing(true)}
        onChangeEmail={() => { setNotice(''); setChangingEmail(true); }}
        onChangePassword={() => { setNotice(''); setChangingPassword(true); }}
        onOpenList={setOpenList}
        onFollowChange={reload}
        onRelacaoChange={reload}
      />
      {notice && (
        <p role="status" className="profile-notice">
          <i className="bi bi-check-circle-fill" aria-hidden="true" /> {notice}
        </p>
      )}

      {relacao.silenciado && !comBloqueio && (
        <p className="profile-notice profile-notice--silenciado">
          <i className="bi bi-volume-mute" aria-hidden="true" />
          Você silenciou @{profile.usuario.nome}: os posts não aparecem nos seus feeds e você não recebe notificações.
        </p>
      )}

      {comBloqueio ? (
        <div className="feed-empty">
          <i className="bi bi-slash-circle" aria-hidden="true" />
          {relacao.bloqueado ? (
            <>
              <h2>Você bloqueou @{profile.usuario.nome}</h2>
              <p>Vocês não veem os posts um do outro. Para desfazer, use o menu ⋯ acima.</p>
            </>
          ) : (
            <>
              <h2>@{profile.usuario.nome} bloqueou você</h2>
              <p>Você não pode ver os posts nem seguir essa pessoa.</p>
            </>
          )}
        </div>
      ) : (
      <>
      <ProfileFavorites
        favoritos={profile.favoritos}
        editavel={isOwnProfile}
        onEditar={() => setEditingFavorites(true)}
      />

      {/* Posts/Comentários ficam presos no topo ao rolar, como as abas do feed. */}
      <div className="feed-tabs-bar profile-tabs-bar">
      <div role="tablist" aria-label="Conteúdo do perfil" className="feed-tabs profile-tabs">
        {[['posts', 'Posts'], ['comentarios', 'Comentários']].map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            id={`aba-${chave}`}
            aria-selected={aba === chave}
            aria-controls={`painel-${chave}`}
            className={`feed-tabs__tab${aba === chave ? ' is-active' : ''}`}
            onClick={() => { setAba(chave); if (chave === 'comentarios') setAbriuComentarios(true); }}
          >
            {rotulo}
          </button>
        ))}
      </div>
      </div>

      <div role="tabpanel" id="painel-posts" aria-labelledby="aba-posts" hidden={aba !== 'posts'}>
        {profile.posts.length === 0 ? (
          <EmptyPosts nome={displayName(profile.usuario)} isOwnProfile={isOwnProfile} onCompose={() => setComposerOpen(true)} />
        ) : (
          <div className="feed-list">
            {profile.posts.map((post) => (
              <PostCard key={post.id} post={post} onDeleted={removePost} onPinChange={reload} showPinned />
            ))}
          </div>
        )}
      </div>

      {/* Fica montada depois de aberta, para não buscar de novo a cada troca de aba. */}
      <div role="tabpanel" id="painel-comentarios" aria-labelledby="aba-comentarios" hidden={aba !== 'comentarios'}>
        {abriuComentarios && <ProfileComments usuarioId={profile.usuario.id} nome={displayName(profile.usuario)} />}
      </div>
      </>
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
      {isOwnProfile && changingEmail && (
        <ChangeEmailModal
          open
          emailAtual={user.email}
          onClose={() => setChangingEmail(false)}
          onChanged={(email) => {
            updateUser({ email });
            setChangingEmail(false);
            setNotice(`Email trocado. Agora você entra com ${email}.`);
          }}
        />
      )}
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
      {isOwnProfile && editingFavorites && (
        <EditFavoritesModal
          favoritos={profile.favoritos}
          onClose={() => setEditingFavorites(false)}
          onSaved={(favoritos) => {
            setData((p) => ({ ...p, favoritos }));
            setEditingFavorites(false);
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
