import { useState } from 'react';
import { Link } from 'react-router-dom';
import { queroOuvirApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { BackBar } from '../components/layout/BackBar.jsx';
import { CreatePost } from '../components/post/CreatePost.jsx';
import { PullToRefresh } from '../components/common/PullToRefresh.jsx';
import { obraUrl } from '../utils/obra.js';
import { releaseInfo } from '../utils/postFormat.js';

// O item da lista vira a música já escolhida no novo post.
const comoMusica = (item) => ({
  tipo: item.tipo,
  titulo: item.titulo,
  artista: item.artista,
  capa: item.capa,
  duracao: item.tipo === 'album' ? undefined : Number(item.releaseDate) || undefined,
  preview: item.preview,
});

/** Discos guardados para ouvir depois. Avaliar um deles publica o post e tira da lista. */
export function QueroOuvirPage() {
  const { data: itens, error, reload, setData } = useAsync(() => queroOuvirApi.list(), []);
  const [avaliando, setAvaliando] = useState(null);
  const [compondo, setCompondo] = useState(false);
  const [aviso, setAviso] = useState('');

  const tirar = (item) => setData((lista) => lista.filter((i) => i.id !== item.id));

  const remover = async (item) => {
    tirar(item);
    try {
      await queroOuvirApi.remove(item);
    } catch {
      reload();
    }
  };

  const avaliar = (item) => {
    setAvaliando(item);
    setCompondo(true);
  };

  const abrirOuFechar = (aberto) => {
    setCompondo(aberto);
    if (!aberto) setAvaliando(null);
  };

  const publicado = () => {
    // O servidor já tirou o disco da lista ao publicar a avaliação.
    if (!avaliando) return;
    tirar(avaliando);
    setAviso(`Avaliação de ${avaliando.titulo} publicada.`);
  };

  const quantos = itens ? `${itens.length} ${itens.length === 1 ? 'disco' : 'discos'}` : null;

  return (
    <div className="feed">
      <BackBar titulo="Quero ouvir" subtitulo={quantos} />
      <PullToRefresh onRefresh={reload} />

      {aviso && (
        <p role="status" className="profile-notice">
          <i className="bi bi-check-circle-fill" aria-hidden="true" /> {aviso}
        </p>
      )}
      {error && <div role="alert" className="feed-error"><p>{error.message}</p></div>}
      {!itens && !error && <p role="status" className="composer-hint">Carregando…</p>}

      {itens?.length === 0 && (
        <div className="feed-empty">
          <i className="bi bi-bookmark" aria-hidden="true" />
          <h2>Nada para ouvir depois</h2>
          <p>Viu um disco recomendado? Toque no marcador ao lado dele no post para guardar aqui.</p>
        </div>
      )}

      {itens?.length > 0 && (
        <ul className="quero-lista">
          {itens.map((item) => (
            <li key={item.id} className="quero-item">
              <Link to={obraUrl(item)} className="quero-item__link">
                <img src={item.capa} alt="" />
                <span className="quero-item__info">
                  <strong>{item.titulo}</strong>
                  <span>
                    {[item.artista, item.tipo === 'album' ? 'álbum' : 'música', releaseInfo(item.releaseDate)]
                      .filter(Boolean).join(' • ')}
                  </span>
                </span>
              </Link>
              <div className="quero-item__acoes">
                <button type="button" className="quero-item__avaliar" onClick={() => avaliar(item)}>
                  Avaliar
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Tirar ${item.titulo} da lista`}
                  onClick={() => remover(item)}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* key: o novo post abre com o disco escolhido em cada "Avaliar" (o botão de postar abre vazio). */}
      <CreatePost
        key={avaliando?.id ?? 'novo'}
        open={compondo}
        onOpenChange={abrirOuFechar}
        onCreated={publicado}
        musicaInicial={avaliando && comoMusica(avaliando)}
      />
    </div>
  );
}
