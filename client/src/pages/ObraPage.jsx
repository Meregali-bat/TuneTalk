import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { obrasApi } from '../api/index.js';
import { usePaginatedPosts } from '../hooks/usePaginatedPosts.js';
import { BackBar } from '../components/layout/BackBar.jsx';
import { PostCard } from '../components/post/PostCard.jsx';
import { StarRating } from '../components/post/StarRating.jsx';
import { PlayButton } from '../components/post/PlayButton.jsx';
import { QueroOuvirButton } from '../components/post/QueroOuvirButton.jsx';
import { CreatePost } from '../components/post/CreatePost.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';
import { LoadMore } from '../components/common/LoadMore.jsx';
import { releaseInfo } from '../utils/postFormat.js';
import { formatMediaEstrelas } from '../../../shared/rating.js';

const plural = (n, um, varios) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;

// Quantas pessoas deram cada nota, de meia estrela (1) a cinco (10). Nota 0 entra na primeira barra.
function Distribuicao({ distribuicao, avaliacoes }) {
  const barras = distribuicao.slice(1);
  barras[0] += distribuicao[0];
  const maior = Math.max(...barras, 1);
  return (
    <div className="obra-dist" role="img" aria-label="Quantas pessoas deram cada nota, de meia a cinco estrelas">
      {barras.map((quantos, i) => (
        <span
          key={i}
          className="obra-dist__barra"
          style={{ '--altura': `${Math.max((quantos / maior) * 100, quantos ? 6 : 2)}%` }}
          title={`${((i + 1) / 2).toLocaleString('pt-BR')} ★: ${plural(quantos, 'pessoa', 'pessoas')}`}
        />
      ))}
      <span className="obra-dist__legenda" aria-hidden="true">
        <i className="bi bi-star-half" />
        <span>{plural(avaliacoes, 'avaliação', 'avaliações')}</span>
        <i className="bi bi-star-fill" />
      </span>
    </div>
  );
}

function Cabecalho({ resumo, onAvaliar }) {
  const { obra, media, avaliacoes, distribuicao } = resumo;
  const ehAlbum = obra.tipo === 'album';
  const meta = [ehAlbum ? 'Álbum' : 'Música', releaseInfo(obra.releaseDate)].filter(Boolean).join(' • ');

  return (
    <section className="obra-header" aria-label={`${obra.titulo}, de ${obra.artista}`}>
      <div className="obra-header__top">
        <img src={obra.capa} alt="" className="obra-header__capa" />
        <div className="obra-header__info">
          <p className="obra-header__tipo">{meta}</p>
          <h2 className="obra-header__titulo">{obra.titulo}</h2>
          <p className="obra-header__artista">{obra.artista}</p>
          {!ehAlbum && obra.preview && (
            <PlayButton src={obra.preview} titulo={obra.titulo} artista={obra.artista} rotulo={obra.titulo} size="sm" />
          )}
        </div>
      </div>

      <div className="obra-nota">
        {avaliacoes > 0 ? (
          <>
            <div className="obra-nota__media">
              <span className="obra-nota__numero">{formatMediaEstrelas(media)}</span>
              <span className="obra-nota__estrelas"><StarRating nota={Math.round(media)} /></span>
              <span className="obra-nota__quantas">média de {plural(avaliacoes, 'pessoa', 'pessoas')}</span>
            </div>
            <Distribuicao distribuicao={distribuicao} avaliacoes={avaliacoes} />
          </>
        ) : (
          <p className="obra-nota__vazia">Ainda sem notas.</p>
        )}
      </div>

      <div className="obra-header__botoes">
        <button type="button" className="obra-header__avaliar" onClick={onAvaliar}>
          <i className="bi bi-star" aria-hidden="true" /> Avaliar {ehAlbum ? 'este álbum' : 'esta música'}
        </button>
        <QueroOuvirButton disco={obra} salvo={resumo.naLista} comTexto />
      </div>
    </section>
  );
}

/** Página de um álbum ou música: a média das notas de todo mundo e os posts sobre ele. */
export function ObraPage({ tipo }) {
  const [params] = useSearchParams();
  const titulo = params.get('titulo') ?? '';
  const artista = params.get('artista') ?? '';
  const [resumo, setResumo] = useState(null);
  const [avaliando, setAvaliando] = useState(false);

  const lista = usePaginatedPosts(async (depois) => {
    const resposta = await obrasApi.get(tipo, titulo, artista, depois);
    if (!depois) setResumo(resposta);
    return resposta.posts;
  }, `${tipo}|${titulo}|${artista}`);
  const { posts, error, reload, setPosts } = lista;

  const removePost = (id) => setPosts((atuais) => atuais.filter((p) => p.id !== id));
  const ocultarAutor = (autorId) => setPosts((atuais) => atuais.filter((p) => p.autor.id !== autorId));
  const obra = resumo?.obra;
  const musicaInicial = obra && {
    tipo: obra.tipo,
    titulo: obra.titulo,
    artista: obra.artista,
    capa: obra.capa,
    duracao: obra.tipo === 'album' ? undefined : Number(obra.releaseDate) || undefined,
    preview: obra.preview,
  };

  return (
    <div className="feed">
      <BackBar titulo={tipo === 'album' ? 'Álbum' : 'Música'} />
      <PullToRefresh onRefresh={reload} />

      {error && (
        <div className="feed-empty">
          <i className={`bi ${error.status === 404 ? 'bi-vinyl' : 'bi-exclamation-circle'}`} aria-hidden="true" />
          <p role="alert">{error.message}</p>
          {error.status !== 404 && <button type="button" className="feed-empty__action" onClick={reload}>Tentar de novo</button>}
        </div>
      )}
      {!posts && !error && <p role="status" className="composer-hint">Carregando…</p>}

      {resumo && posts && (
        <>
          <Cabecalho resumo={resumo} onAvaliar={() => setAvaliando(true)} />
          <h2 className="obra-posts__titulo">Posts</h2>
          <div className="feed-list">
            {posts.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} linkObra={false} onAutorOculto={ocultarAutor} />)}
          </div>
          <LoadMore
            carregarMais={lista.carregarMais}
            carregandoMais={lista.carregandoMais}
            erroMais={lista.erroMais}
            fim={lista.fim}
            onRetry={lista.tentarMaisDeNovo}
            quantidade={posts.length}
          />
          <CreatePost open={avaliando} onOpenChange={setAvaliando} onCreated={reload} musicaInicial={musicaInicial} />
        </>
      )}
    </div>
  );
}
