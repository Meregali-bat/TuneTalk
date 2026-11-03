// O corte é aplicado pelo Cloudinary no próprio link (transformação c_crop): funciona com GIF
// animado, coisa que cortar no navegador com <canvas> estragaria. A largura fica limitada a 1600 px.
const UPLOAD = '/image/upload/';

export function croppedImageUrl(url, pixels) {
  const at = url.indexOf(UPLOAD);
  if (!url.startsWith('https://res.cloudinary.com/') || at === -1) return url;

  const round = (n) => Math.max(0, Math.round(n));
  const crop = pixels
    ? `c_crop,x_${round(pixels.x)},y_${round(pixels.y)},w_${round(pixels.width)},h_${round(pixels.height)}/`
    : '';
  const start = at + UPLOAD.length;
  return `${url.slice(0, start)}${crop}c_limit,w_1600/${url.slice(start)}`;
}
