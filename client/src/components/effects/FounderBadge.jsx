// Selo de fundador: para quem tinha conta no TuneTalk antigo (ativado no primeiro login depois da mudança).
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
