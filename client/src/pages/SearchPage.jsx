import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hashtagsApi, usersApi } from '../api/index.js';
import { hashflag } from '../utils/hashflags.js';
import { useAsync } from '../hooks/useAsync.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { UserRow } from '../components/profile/UserRow.jsx';
import { SugestoesDeQuemSeguir } from '../components/profile/SugestoesDeQuemSeguir.jsx';

const ABAS = {
  hashtags: { rotulo: 'Hashtags', campo: 'Buscar hashtags', placeholder: '#hashtag', buscar: (q) => hashtagsApi.search(q) },
  pessoas: { rotulo: 'Pessoas', campo: 'Buscar pessoas', placeholder: 'Nome ou @usuário', buscar: (q) => usersApi.search(q) },
};

function useBusca(texto, aba) {
  const [busca, setBusca] = useState({ status: 'idle', results: [] });
  const termo = useDebouncedValue(texto.trim(), 300);

  useEffect(() => {
    if (!termo) {
      setBusca({ status: 'idle', results: [] });
      return undefined;
    }
    let ativo = true;
    setBusca((atual) => ({ ...atual, status: 'loading' }));
    ABAS[aba].buscar(termo)
      .then((results) => ativo && setBusca({ status: 'done', results, termo, aba }))
      .catch(() => ativo && setBusca({ status: 'error', results: [] }));
    return () => { ativo = false; };
  }, [termo, aba]);

  return [busca, setBusca];
}

const quantosPosts = (n) => `${n} ${n === 1 ? 'post' : 'posts'}`;

function HashtagItem({ item, posicao }) {
  return (
    <li>
      <Link to={`/tag/${encodeURIComponent(item.tag)}`} className="hashtag-row">
        {posicao && <span className="hashtag-row__posicao">{posicao}</span>}
        <span className="hashtag-row__tag">#{item.tag}{hashflag(item.tag) && <span className="hashflag" aria-hidden="true">{hashflag(item.tag).emoji}</span>}</span>
        <span className="hashtag-row__posts">{quantosPosts(item.posts)}</span>
      </Link>
    </li>
  );
}

// "Em alta agora": as hashtags mais usadas nos últimos dias.
function EmAlta() {
  const { data: emAlta, error } = useAsync(() => hashtagsApi.trending(), []);
  if (error) return <p role="alert" className="composer-error">Não foi possível carregar as hashtags agora.</p>;
  if (!emAlta) return <p role="status" className="composer-hint">Carregando o que está em alta…</p>;
  if (emAlta.length === 0) return <p className="composer-hint">Nenhuma hashtag ainda. Use # nos seus posts!</p>;
  return (
    <section className="search-page__secao">
      <h2 className="search-page__subtitulo">
        <i className="bi bi-fire" aria-hidden="true" /> Em alta agora
      </h2>
      <ol className="hashtag-list" aria-label="Em alta agora">
        {emAlta.map((item, i) => <HashtagItem key={item.tag} item={item} posicao={i + 1} />)}
      </ol>
    </section>
  );
}

export function SearchPage() {
  const [aba, setAba] = useState('hashtags');
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = useBusca(texto, aba);

  // "@" no começo leva para Pessoas e "#" para Hashtags.
  const digitar = (valor) => {
    if (valor.startsWith('@')) setAba('pessoas');
    if (valor.startsWith('#')) setAba('hashtags');
    setTexto(valor);
  };

  // Seguir/deixar de seguir atualiza só aquela pessoa na lista.
  const marcarSeguindo = (id, seguindo) =>
    setBusca((atual) => ({ ...atual, results: atual.results.map((u) => (u.id === id ? { ...u, seguindo } : u)) }));

  const resultados = busca.status === 'done' && busca.aba === aba ? busca.results : null;

  return (
    <div className="feed search-page">
      <h1 className="search-page__title">Buscar</h1>

      <div role="tablist" aria-label="O que buscar" className="feed-tabs">
        {Object.entries(ABAS).map(([chave, { rotulo }]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={aba === chave}
            className={`feed-tabs__tab${aba === chave ? ' is-active' : ''}`}
            onClick={() => setAba(chave)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="composer-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          aria-label={ABAS[aba].campo}
          placeholder={ABAS[aba].placeholder}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
          autoFocus
          value={texto}
          onChange={(event) => digitar(event.target.value)}
        />
      </div>

      {busca.status === 'idle' && aba === 'hashtags' && <EmAlta />}
      {busca.status === 'idle' && aba === 'pessoas' && (
        <>
          <p className="composer-hint">Busque pelo nome ou pelo @.</p>
          <SugestoesDeQuemSeguir titulo="Sugestões para você" />
        </>
      )}
      {busca.status === 'loading' && <p role="status" className="composer-hint">Buscando…</p>}
      {busca.status === 'error' && (
        <p role="alert" className="composer-error">Não foi possível buscar agora. Tente de novo.</p>
      )}

      {resultados?.length === 0 && (
        <p className="composer-hint">
          {aba === 'hashtags' ? `Nenhuma hashtag com “${busca.termo}”.` : `Ninguém encontrado para “${busca.termo}”.`}
        </p>
      )}
      {resultados?.length > 0 && aba === 'hashtags' && (
        <ul className="hashtag-list" aria-label="Hashtags encontradas">
          {resultados.map((item) => <HashtagItem key={item.tag} item={item} />)}
        </ul>
      )}
      {resultados?.length > 0 && aba === 'pessoas' && (
        <ul className="user-list search-page__results" aria-label="Pessoas encontradas">
          {resultados.map((usuario) => (
            <UserRow
              key={usuario.id}
              usuario={usuario}
              following={usuario.seguindo}
              onFollowChange={(seguindo) => marcarSeguindo(usuario.id, seguindo)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
