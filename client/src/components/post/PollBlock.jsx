import { useState } from 'react';
import { postsApi } from '../../api/index.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { porcentagem } from '../../../../shared/poll.js';
import { PlayButton } from './PlayButton.jsx';

// "termina em 2 dias", "em 5 h", "em 10 min".
export function tempoRestante(fim, agora = Date.now()) {
  const ms = new Date(fim).getTime() - agora;
  if (ms <= 0) return null;
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.round(horas / 24);
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

/**
 * Enquete de músicas no post: antes de votar, cada música é um botão (com a prévia ao lado);
 * depois (ou quando termina, ou para quem postou), mostra as porcentagens.
 */
export function PollBlock({ post }) {
  const { user } = useAuth();
  const [enquete, setEnquete] = useState(post.enquete);
  const [votando, setVotando] = useState(null);
  const [erro, setErro] = useState('');
  if (!enquete || !Array.isArray(enquete.opcoes)) return null;

  const restante = tempoRestante(enquete.fim);
  const encerrada = enquete.encerrada || !restante;
  const meuVoto = enquete.meuVoto ?? null;
  const resultado = meuVoto !== null || encerrada || post.autor?.id === user?.id;
  const total = enquete.total ?? 0;
  const lider = Math.max(...enquete.opcoes.map((o) => o.votos ?? 0));

  const votar = async (opcao) => {
    setVotando(opcao.id);
    setErro('');
    try {
      setEnquete(await postsApi.votar(post.id, opcao.id));
    } catch (err) {
      setErro(err.message);
    } finally {
      setVotando(null);
    }
  };

  return (
    <div className="poll" role="group" aria-label="Enquete">
      <ul className="poll__opcoes">
        {enquete.opcoes.map((opcao) => {
          const pct = porcentagem(opcao.votos ?? 0, total);
          const capa = opcao.capa && <img src={opcao.capa} alt="" className="poll__capa" />;
          const nome = (
            <span className="poll__nome">
              <span className="poll__titulo">{opcao.titulo}</span>
              {opcao.artista && <span className="poll__artista">{opcao.artista}</span>}
            </span>
          );
          return (
            <li key={opcao.id} className="poll__item">
              {resultado ? (
                <div
                  className={`poll__resultado${opcao.id === meuVoto ? ' is-meu' : ''}${encerrada && (opcao.votos ?? 0) === lider && lider > 0 ? ' is-lider' : ''}`}
                  style={{ '--pct': `${pct}%` }}
                  aria-label={`${opcao.titulo}: ${pct}%${opcao.id === meuVoto ? ', seu voto' : ''}`}
                >
                  {capa}
                  {nome}
                  {opcao.id === meuVoto && <i className="bi bi-check-circle-fill poll__check" aria-hidden="true" />}
                  <span className="poll__pct" aria-hidden="true">{pct}%</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="poll__opcao"
                  disabled={votando !== null}
                  aria-label={`Votar em ${opcao.titulo}${opcao.artista ? `, ${opcao.artista}` : ''}`}
                  onClick={() => votar(opcao)}
                >
                  {capa}
                  {nome}
                </button>
              )}
              {opcao.preview && (
                <PlayButton src={opcao.preview} titulo={opcao.titulo} artista={opcao.artista} rotulo={opcao.titulo} size="sm" />
              )}
            </li>
          );
        })}
      </ul>
      <p className="poll__rodape">
        {total} {total === 1 ? 'voto' : 'votos'} · {encerrada ? 'Enquete encerrada' : `termina em ${restante}`}
      </p>
      {erro && <p role="alert" className="composer-error">{erro}</p>}
    </div>
  );
}
