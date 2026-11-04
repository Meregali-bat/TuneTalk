// Rascunho do post/comentário guardado no aparelho, para não perder o texto ao fechar sem querer.
// O armazenamento pode não existir (aba anônima, bloqueado): aí o rascunho só não é guardado.
const PREFIXO = 'tunetalk:rascunho:';

export const chaveRascunho = (usuarioId, parentId) => `${PREFIXO}${usuarioId ?? 'anonimo'}:${parentId ?? 'post'}`;

export function lerRascunho(chave) {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function apagarRascunho(chave) {
  try {
    window.localStorage.removeItem(chave);
  } catch {
    // sem armazenamento: nada a apagar
  }
}

// Rascunho vazio não ocupa espaço: apaga em vez de guardar.
export function salvarRascunho(chave, rascunho) {
  const vazio = !rascunho.texto?.trim() && !rascunho.track && !rascunho.enquete;
  if (vazio) {
    apagarRascunho(chave);
    return;
  }
  try {
    window.localStorage.setItem(chave, JSON.stringify(rascunho));
  } catch {
    // sem armazenamento ou cheio: segue sem rascunho
  }
}
