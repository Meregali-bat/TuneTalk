// O corte é aplicado pelo Cloudinary no próprio link (transformação c_crop): funciona com GIF
// animado, coisa que cortar no navegador com <canvas> estragaria. A largura fica limitada a 1600 px.
const UPLOAD = '/image/upload/';

const ehGif = (url) => /\.gif(\?|$)/i.test(url);

export function croppedImageUrl(url, pixels) {
  const at = url.indexOf(UPLOAD);
  if (!url.startsWith('https://res.cloudinary.com/') || at === -1) return url;
  // GIF sem corte vai como foi enviado: o plano grátis do Cloudinary recusa processar GIF animado
  // grande (conta os pixels de todos os quadros), e aí a imagem do post não aparece.
  if (!pixels && ehGif(url)) return url;

  const round = (n) => Math.max(0, Math.round(n));
  const crop = pixels
    ? `c_crop,x_${round(pixels.x)},y_${round(pixels.y)},w_${round(pixels.width)},h_${round(pixels.height)}/`
    : '';
  const start = at + UPLOAD.length;
  return `${url.slice(0, start)}${crop}c_limit,w_1600/${url.slice(start)}`;
}

// Link do arquivo como foi enviado, sem as transformações (corte, limite de largura). Serve de
// reserva quando o Cloudinary não consegue gerar a versão transformada (ex.: GIF longo demais).
export function originalImageUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('https://res.cloudinary.com/')) return null;
  const at = url.indexOf(UPLOAD);
  if (at === -1) return null;
  const inicio = at + UPLOAD.length;
  const resto = url.slice(inicio);
  const versao = resto.search(/(^|\/)v\d+\//);
  if (versao <= 0) return null; // sem transformação (ou sem versão para saber onde ela termina)
  const original = url.slice(0, inicio) + resto.slice(resto[versao] === '/' ? versao + 1 : versao);
  return original === url ? null : original;
}
