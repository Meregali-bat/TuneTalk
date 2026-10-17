// Capas e avatares gerados como SVG em data: URI — a página publicada não carrega imagens de fora.

const PALETTES = [
  ['#2ba84a', '#0b3d1c'], ['#f55b64', '#4a0f14'], ['#3d7cf5', '#0d2257'], ['#f5b83d', '#5a3a05'],
  ['#9b5df5', '#2b0d57'], ['#2bc4c4', '#06393f'], ['#f57c3d', '#4f1d05'], ['#d3d33b', '#3f3f06'],
];

const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const escape = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const toDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function avatar(nome) {
  const [light, dark] = PALETTES[hash(nome) % PALETTES.length];
  const initials = nome.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${dark}"/>`
    + `<text x="50" y="62" font-family="sans-serif" font-size="38" font-weight="700" fill="${light}" text-anchor="middle">${escape(initials)}</text></svg>`,
  );
}

export function coverArt(titulo, artista) {
  const [light, dark] = PALETTES[hash(`${titulo}${artista}`) % PALETTES.length];
  const short = titulo.length > 16 ? `${titulo.slice(0, 15)}…` : titulo;
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>`
    + `<rect width="200" height="200" fill="url(#g)"/><circle cx="150" cy="55" r="38" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="10"/>`
    + `<text x="16" y="160" font-family="sans-serif" font-size="20" font-weight="700" fill="#fff">${escape(short)}</text>`
    + `<text x="16" y="184" font-family="sans-serif" font-size="13" fill="#fff" fill-opacity=".8">${escape(artista)}</text></svg>`,
  );
}
