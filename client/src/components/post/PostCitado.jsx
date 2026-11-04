import { Link } from 'react-router-dom';
import { shortTime } from '../../utils/relativeTime.js';
import { StarRating } from './StarRating.jsx';

// O post citado, compacto, dentro de outro post (ou no compositor, sem link). Tocar abre o post citado.
// Apagado ou de alguém que quem vê não vê: só o aviso de indisponível.
export function PostCitado({ post, comLink = true }) {
  if (!post || post.indisponivel) {
    return <p className="post-citado post-citado--indisponivel">Este post não está disponível.</p>;
  }
  const nome = post.autor.nomeExibicao || post.autor.nome;
  const conteudo = (
    <>
      <span className="post-citado__autor">
        <img src={post.autor.fotoPerfil} alt="" className="post-citado__foto" />
        <span className="post-citado__nome">{nome}</span>
        <span className="post-citado__handle">@{post.autor.nome} · {shortTime(post.data)}</span>
      </span>
      {post.texto && <span className="post-citado__texto">{post.texto}</span>}
      {post.titulo && (
        <span className="post-citado__musica">
          <img src={post.capa} alt="" className="post-citado__capa" />
          <span className="post-citado__obra">
            <span className="post-citado__titulo">{post.titulo}</span>
            <span className="post-citado__artista">{post.artista}</span>
          </span>
          {post.nota !== null && (
            <span className="post-citado__nota"><StarRating nota={post.nota} /></span>
          )}
        </span>
      )}
      {post.imagem && <img src={post.imagem} alt="" className="post-citado__imagem" loading="lazy" />}
      {post.enquete && (
        <span className="post-citado__extra"><i className="bi bi-bar-chart-line" aria-hidden="true" /> Enquete</span>
      )}
    </>
  );
  const rotulo = `Post original de ${nome}`;
  return comLink
    ? <Link to={`/post/${post.id}`} className="post-citado" aria-label={rotulo}>{conteudo}</Link>
    : <div className="post-citado" role="group" aria-label={rotulo}>{conteudo}</div>;
}
