import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { FollowButton } from '../common/FollowButton.jsx';
import { VerifiedBadge } from '../effects/VerifiedBadge.jsx';
import { FounderBadge, mostraSeloFundador } from '../effects/FounderBadge.jsx';

// Uma pessoa numa lista (seguidores, busca): foto, nome de exibição, @, selo, bio e o botão de seguir.
// `detalhe` (ex.: por que foi sugerida) aparece no lugar da bio.
export function UserRow({ usuario, following, onFollowChange, onNavigate, detalhe }) {
  const { user: me } = useAuth();
  return (
    <li className="user-row">
      <Link to={`/perfil/${usuario.id}`} className="user-row__link" onClick={onNavigate}>
        <img src={usuario.fotoPerfil} alt="" className="user-row__avatar" />
        <span className="user-row__info">
          <span className="user-row__name">
            {usuario.nomeExibicao || usuario.nome} <VerifiedBadge nome={usuario.nome} />
            <FounderBadge ativo={mostraSeloFundador(usuario)} />
          </span>
          <span className="user-row__handle">@{usuario.nome}</span>
          {detalhe ? <span className="user-row__bio user-row__detalhe">{detalhe}</span>
            : usuario.bio && <span className="user-row__bio">{usuario.bio}</span>}
        </span>
      </Link>
      {usuario.id !== me.id && (
        <FollowButton size="sm" userId={usuario.id} following={following} onChange={onFollowChange} />
      )}
    </li>
  );
}
