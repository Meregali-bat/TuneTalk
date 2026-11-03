// Selo de fundador: para quem tinha conta no TuneTalk antigo (ativado no primeiro login depois da mudança).
// A pessoa pode escondê-lo no Editar perfil.
export const mostraSeloFundador = (usuario) => Boolean(usuario.fundadorDesde) && usuario.mostrarSeloFundador !== false;

export function FounderBadge({ ativo }) {
  if (!ativo) return null;
  return (
    <i
      className="bi bi-award-fill founder-badge"
      role="img"
      aria-label="No TuneTalk desde o início"
      title="No TuneTalk desde o início"
    />
  );
}
