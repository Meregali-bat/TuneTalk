import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capaDoDeezer } from '../../../shared/favorites.js';
import { CARD_ALTURA, CARD_LARGURA, cortar, nomeDoAutor } from './postMeta.js';

// Imagem 1200×630 que aparece no cartão do link de um post (og:image).

const COR = {
  fundo: '#000505',
  superficie: '#0f1d17',
  linha: '#1f3329',
  texto: '#fcfffc',
  suave: '#a6b5ae',
  destaque: '#2ba84a',
};

const fontes = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');
let fontesCarregadas;
function carregarFontes() {
  fontesCarregadas ??= [400, 700].map((weight) => ({
    name: 'Geologica',
    data: fs.readFileSync(path.join(fontes, `geologica-latin-${weight}-normal.woff`)),
    weight,
    style: 'normal',
  }));
  return fontesCarregadas;
}

// Elemento no formato que o Satori entende (o mesmo de um elemento React, sem precisar de JSX).
const h = (type, style, ...children) => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c != null && c !== false) },
});
const img = (src, style) => ({ type: 'img', props: { src, style } });

const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const LOGO = svgUri(`<svg width="63" height="93" viewBox="0 0 63 93" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3 3V79.0558C3 83.105 5.39687 86.7702 9.10641 88.3934C11.4661 89.426 14.1292 89.5269 16.5602 88.6759L17.1361 88.4743C21.8463 86.8254 25 82.3799 25 77.3895V39.6066" stroke="${COR.destaque}" stroke-width="6" stroke-linecap="round"/>
<path d="M34 3V79.0558C34 83.105 36.3969 86.7702 40.1064 88.3934C42.4661 89.426 45.1292 89.5269 47.5602 88.6759L48.1361 88.4743C52.8463 86.8254 56 82.3799 56 77.3895V39.6066" stroke="${COR.destaque}" stroke-width="6" stroke-linecap="round"/>
<path d="M3 28L59.5 28" stroke="${COR.destaque}" stroke-width="6" stroke-linecap="round"/>
</svg>`);

const ESTRELA = 'M12 2.5l2.94 6.06 6.56.92-4.78 4.6 1.16 6.52L12 17.5l-5.88 3.1 1.16-6.52-4.78-4.6 6.56-.92z';
const estrela = (preenchida) => svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
<defs><linearGradient id="m"><stop offset="${preenchida}" stop-color="${COR.destaque}"/><stop offset="${preenchida}" stop-color="${COR.linha}"/></linearGradient></defs>
<path d="${ESTRELA}" fill="url(#m)"/></svg>`);
const ESTRELAS = { cheia: estrela(1), meia: estrela(0.5), vazia: estrela(0) };

function estrelas(nota) {
  return h('div', { gap: 6, alignItems: 'center' },
    [0, 1, 2, 3, 4].map((i) => {
      const pontos = nota - i * 2;
      const src = pontos >= 2 ? ESTRELAS.cheia : pontos === 1 ? ESTRELAS.meia : ESTRELAS.vazia;
      return img(src, { width: 44, height: 44 });
    }));
}

// Só busca imagens de onde o app já guarda as dele (Deezer e Cloudinary): nada de URL qualquer.
function urlPermitida(url) {
  if (capaDoDeezer(url)) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

// O Satori não lê WebP: no Cloudinary pedimos a imagem já em JPG e no tamanho certo.
function noTamanho(url, lado) {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_jpg,q_80,c_fill,w_${lado},h_${lado}/`);
}

async function baixarImagem(url, lado, fetchImpl) {
  if (!url || !urlPermitida(url)) return null;
  try {
    const resposta = await fetchImpl(noTamanho(url, lado), { signal: AbortSignal.timeout(4000) });
    const tipo = resposta.headers.get('content-type') ?? '';
    if (!resposta.ok || !/^image\/(jpeg|png)/.test(tipo)) return null;
    const dados = Buffer.from(await resposta.arrayBuffer());
    return `data:${tipo.split(';')[0]};base64,${dados.toString('base64')}`;
  } catch {
    return null;
  }
}

export function montarCard(post, { capa, foto }) {
  const temObra = Boolean(post.titulo);
  const temLateral = Boolean(capa);
  const textoMax = temObra ? (temLateral ? 100 : 160) : post.enquete ? 90 : temLateral ? 130 : 200;
  const texto = cortar(post.texto, textoMax);

  const autor = h('div', { alignItems: 'center', gap: 20 },
    foto && img(foto, { width: 72, height: 72, borderRadius: 999, objectFit: 'cover' }),
    h('div', { flexDirection: 'column' },
      h('div', { fontSize: 32, fontWeight: 700, color: COR.texto }, cortar(nomeDoAutor(post.autor), 28)),
      post.autor.nome && h('div', { fontSize: 26, color: COR.suave }, `@${post.autor.nome}`)));

  const obra = temObra && h('div', { flexDirection: 'column', gap: 10 },
    h('div', { fontSize: 52, fontWeight: 700, color: COR.texto, lineHeight: 1.1 }, cortar(post.titulo, 48)),
    post.artista && h('div', { fontSize: 32, color: COR.suave }, cortar(post.artista, 48)),
    post.nota != null && h('div', { marginTop: 8 }, estrelas(post.nota)));

  const enquete = !temObra && post.enquete && h('div', { flexDirection: 'column', gap: 12 },
    h('div', { fontSize: 24, fontWeight: 700, color: COR.destaque, letterSpacing: 2 }, 'ENQUETE'),
    post.enquete.opcoes.slice(0, 4).map((opcao) => h('div', {
      fontSize: 28, color: COR.texto, padding: '10px 20px', borderRadius: 14,
      border: `2px solid ${COR.linha}`, backgroundColor: COR.superficie,
    }, cortar(opcao.artista ? `${opcao.titulo} — ${opcao.artista}` : opcao.titulo, 50))));

  const tamanhoTexto = temObra || post.enquete ? 30 : temLateral ? 38 : 46;
  const corpo = texto && h('div', {
    fontSize: tamanhoTexto, color: temObra ? COR.suave : COR.texto, lineHeight: 1.35,
  }, temObra ? `“${texto}”` : texto);

  const rodape = h('div', { alignItems: 'center', gap: 14 },
    img(LOGO, { width: 26, height: 38 }),
    h('div', { fontSize: 30, fontWeight: 700, color: COR.texto }, 'TuneTalk'));

  return h('div', {
    width: CARD_LARGURA, height: CARD_ALTURA, backgroundColor: COR.fundo, padding: 56, gap: 56,
    fontFamily: 'Geologica', borderBottom: `10px solid ${COR.destaque}`,
  },
  temLateral && h('div', { alignItems: 'center' },
    img(capa, { width: 440, height: 440, borderRadius: 24, objectFit: 'cover' })),
  h('div', { flexDirection: 'column', flex: 1, justifyContent: 'space-between', minWidth: 0, gap: 24 },
    h('div', { flexDirection: 'column', gap: 32, overflow: 'hidden' }, autor, obra, post.enquete && !temObra ? [corpo, enquete] : [enquete, corpo]),
    rodape));
}

/** PNG do cartão do post. `fetchImpl` permite testar sem rede. */
export async function renderizarCard(post, { fetchImpl = fetch } = {}) {
  const { ImageResponse } = await import('@vercel/og');
  const [capa, foto] = await Promise.all([
    baixarImagem(post.capa ?? post.imagem, 880, fetchImpl),
    baixarImagem(post.autor.fotoPerfil, 144, fetchImpl),
  ]);
  const resposta = new ImageResponse(montarCard(post, { capa, foto }), {
    width: CARD_LARGURA, height: CARD_ALTURA, fonts: carregarFontes(),
  });
  return Buffer.from(await resposta.arrayBuffer());
}
