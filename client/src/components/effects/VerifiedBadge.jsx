import { verifiedStyleFor } from './profileEffects.js';

// Selo ao lado do nome de quem é verificado; não renderiza nada para os outros.
export function VerifiedBadge({ nome }) {
  const estilo = verifiedStyleFor(nome);
  if (!estilo) return null;
  return (
    <i
      className={`bi bi-patch-check-fill verified-badge verified-badge--${estilo}`}
      role="img"
      aria-label="Verificado"
      title="Verificado"
    />
  );
}
