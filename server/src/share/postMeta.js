import { formatEstrelas } from '../../../shared/rating.js';

// Tags Open Graph de um post: o que WhatsApp, X, Discord, iMessage etc. mostram ao colar o link.
// Esses apps não rodam JavaScript, então as tags precisam vir prontas no HTML.

export const CARD_LARGURA = 1200;
export const CARD_ALTURA = 630;

const escapar = (texto) =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const umaLinha = (texto) => (texto ?? '').replace(/\s+/g, ' ').trim();

export function cortar(texto, max) {
  const limpo = umaLinha(texto);
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max - 1).trimEnd()}…`;
}

export const nomeDoAutor = (autor) => umaLinha(autor.nomeExibicao) || autor.nome || 'Alguém';

export function descreverPost(post) {
  const quem = nomeDoAutor(post.autor);
  const arroba = post.autor.nome ? ` (@${post.autor.nome})` : '';

  let titulo = `${quem}${arroba} no TuneTalk`;
  if (post.titulo) {
    const obra = post.artista ? `${post.titulo} — ${post.artista}` : post.titulo;
    const nota = post.nota == null ? '' : ` · ${formatEstrelas(post.nota)}★`;
    titulo = `${quem} sobre ${obra}${nota}`;
  } else if (post.enquete) {
    titulo = `Enquete de ${quem} no TuneTalk`;
  }

  let descricao = cortar(post.texto, 200);
  if (!descricao && post.enquete) descricao = post.enquete.opcoes.map((o) => o.titulo).join(' · ');
  if (!descricao) descricao = `Veja o post de ${quem}${arroba} no TuneTalk.`;

  return { titulo: cortar(titulo, 110), descricao: cortar(descricao, 200) };
}

export function metaTags({ titulo, descricao, url, imagem }) {
  const tags = [
    ['property', 'og:site_name', 'TuneTalk'],
    ['property', 'og:type', 'article'],
    ['property', 'og:title', titulo],
    ['property', 'og:description', descricao],
    ['property', 'og:url', url],
    ['property', 'og:image', imagem],
    ['property', 'og:image:width', CARD_LARGURA],
    ['property', 'og:image:height', CARD_ALTURA],
    ['property', 'og:image:alt', titulo],
    ['property', 'og:locale', 'pt_BR'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', titulo],
    ['name', 'twitter:description', descricao],
    ['name', 'twitter:image', imagem],
    ['name', 'description', descricao],
  ];
  return [
    `<title>${escapar(titulo)}</title>`,
    `<link rel="canonical" href="${escapar(url)}" />`,
    ...tags.map(([attr, nome, valor]) => `<meta ${attr}="${nome}" content="${escapar(valor)}" />`),
  ].join('\n    ');
}

/** Troca o <title> do index.html pelas tags do post (e tira as tags genéricas do site). */
export function injetarMeta(html, tags) {
  const semGenericas = html
    .replace(/\s*<meta (?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*>/g, '')
    .replace(/<title>[\s\S]*?<\/title>/, () => tags);
  return semGenericas.includes(tags) ? semGenericas : semGenericas.replace('</head>', () => `  ${tags}\n  </head>`);
}
