import { useEffect, useState } from 'react';
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
import { FounderBadge, mostraSeloFundador } from '../components/effects/FounderBadge.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';
import { ProfileFavorites } from '../components/profile/ProfileFavorites.jsx';
import { EditFavoritesModal } from '../components/profile/EditFavoritesModal.jsx';

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

// 12345 vira "12,3 mil": cabe na coluna do número em qualquer tela.
const compacto = (valor) => (typeof valor === 'number'
  ? new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(valor)
  : valor);

function Stat({ value, label, onClick }) {
  const content = (
    <>
      <strong>{compacto(value)}</strong>
      <span>{label}</span>
    </>
  );
  return (
    <li className="profile-stat">
      {onClick ? (
        <button type="button" className="profile-stat__inner" aria-label={`${label}: ${compacto(value)}`} onClick={onClick}>
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

function ProfileHeader({ profile, isOwnProfile, onEdit, onOpenList, onOpenPosts, onFollowChange }) {
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
            <FounderBadge ativo={mostraSeloFundador(usuario)} />
          </div>
          <p className="profile-header__handle">@{usuario.nome}</p>
          {usuario.bio && <p className="profile-header__bio">{usuario.bio}</p>}
        </div>

        <ul className="profile-stats" aria-label="Números do perfil">
          <Stat value={profile.quantidadePosts} label="Posts" onClick={onOpenPosts} />
          <Stat value={profile.quantidadeSeguidores} label="Seguidores" onClick={() => onOpenList('seguidores')} />
          <Stat value={profile.quantidadeSeguindo} label="Seguindo" onClick={() => onOpenList('seguindo')} />
          {media !== null && <Stat value={`${formatMediaEstrelas(media)}/5`} label="Nota média" />}
        </ul>
      </div>
    </header>
  );
}

// Aba "Comentários": só busca quando aberta pela primeira vez.
function ProfileComments({ usuarioId, nome }) {
  const { data: comentarios, error, setData, reload } = useAsync(() => usersApi.comments(usuarioId), [usuarioId]);
  const remover = (id) => setData((lista) => lista.filter((c) => c.id !== id));

  if (error) return <LoadError mensagem="Não deu para carregar os comentários." onRetry={reload} />;
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

// Erro de carregamento com saída: explica e deixa tentar de novo sem recarregar a página.
function LoadError({ mensagem, onRetry }) {
  return (
    <div role="alert" className="feed-error">
      <p>{mensagem}</p>
      <button type="button" className="follow-button follow-button--md is-following" onClick={onRetry}>
        <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Tentar de novo
      </button>
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
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [notice, setNotice] = useState('');
  // O aviso ("Favoritos salvos.", "Senha alterada…") some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!notice) return undefined;
    const sumir = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(sumir);
  }, [notice]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [aba, setAba] = useState('posts');
  const [abriuComentarios, setAbriuComentarios] = useState(false);

  if (error) {
    return (
      <div className="feed">
        <LoadError
          mensagem={error.status === 404
            ? 'Esse perfil não existe ou mudou de @.'
            : 'Não deu para carregar o perfil. Confira sua conexão.'}
          onRetry={reload}
        />
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

  const abrirAba = (chave) => {
    setAba(chave);
    if (chave === 'comentarios') setAbriuComentarios(true);
  };
  // Setas trocam de aba, como em qualquer lista de abas (o Tab pula direto para o conteúdo).
  const moverAba = (event, chave) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const proxima = chave === 'posts' ? 'comentarios' : 'posts';
    abrirAba(proxima);
    document.getElementById(`aba-${proxima}`)?.focus();
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
        onOpenList={setOpenList}
        onOpenPosts={() => {
          abrirAba('posts');
          document.querySelector('.profile-tabs-bar')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        }}
        onFollowChange={reload}
      />
      {notice && (
        <p role="status" className="profile-notice">
          <i className="bi bi-check-circle-fill" aria-hidden="true" /> {notice}
        </p>
      )}

      <ProfileFavorites
        favoritos={profile.favoritos}
        editavel={isOwnProfile}
        onEditar={() => setEditingFavorites(true)}
      />

      {/* Fica presa no topo ao rolar, como as abas do feed. */}
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
            tabIndex={aba === chave ? 0 : -1}
            onClick={() => abrirAba(chave)}
            onKeyDown={(event) => moverAba(event, chave)}
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
      {isOwnProfile && editingFavorites && (
        <EditFavoritesModal
          favoritos={profile.favoritos}
          onClose={() => setEditingFavorites(false)}
          onSaved={(favoritos) => {
            setData((p) => ({ ...p, favoritos }));
            setEditingFavorites(false);
            setNotice('Favoritos salvos.');
          }}
        />
      )}
      {isOwnProfile && editing && (
        <EditProfileModal
          open
          usuario={profile.usuario}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
          /* Trocar senha mora em "Editar perfil": é coisa da conta, não da identidade do perfil. */
          onChangePassword={() => { setEditing(false); setNotice(''); setChangingPassword(true); }}
        />
      )}
      {isOwnProfile && (
        <CreatePost open={composerOpen} onOpenChange={setComposerOpen} onCreated={reload} />
      )}
    </div>
  );
}
