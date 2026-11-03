// Links de prévia do Deezer: os do formato antigo (cdns-preview) foram desativados e os atuais
// vêm com prazo (hdnea=exp=<segundos>). Vencidos ou quase vencendo, precisam ser buscados de novo.
const FOLGA_MS = 60_000;

export function precisaRenovar(url, agora = Date.now()) {
  if (!url) return true;
  if (/\/\/cdns-preview-[^/]*\.dzcdn\.net\//.test(url)) return true;
  const exp = url.match(/[?&~]hdnea=exp=(\d+)/) ?? url.match(/exp=(\d+)/);
  return exp ? Number(exp[1]) * 1000 < agora + FOLGA_MS : false;
}
