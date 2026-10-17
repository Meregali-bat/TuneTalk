import { Link } from 'react-router-dom';
import { asset } from '../utils/asset.js';
import { StarRating } from '../components/post/StarRating.jsx';

const FEATURES = [
  { titulo: 'Debata sobre músicas', texto: 'Comente nos posts e responda quem discordou da sua nota.', img: 'img/debateIMG.webp' },
  { titulo: 'Compartilhe o que ouve', texto: 'Busque a faixa e publique com a sua avaliação em segundos.', img: 'img/albunsIMG.webp' },
  { titulo: 'Monte seu perfil', texto: 'Foto, bio e todas as suas avaliações reunidas num lugar só.', img: 'img/betles.webp' },
  { titulo: 'Descubra artistas novos', texto: 'Siga gente com gosto parecido e veja o que ela anda ouvindo.', img: 'img/musicasIMG.webp' },
];

const STEPS = [
  { titulo: 'Busque a música', texto: 'Digite o nome da faixa e escolha o resultado certo.' },
  { titulo: 'Dê sua nota', texto: 'De 1 a 5 estrelas, com um texto dizendo o porquê.' },
  { titulo: 'Converse', texto: 'Receba curtidas, comentários e novos seguidores.' },
];

function SamplePost() {
  return (
    <figure className="sample-post" aria-label="Exemplo de post no TuneTalk">
      <div className="sample-post__header">
        <span className="sample-post__avatar" aria-hidden="true">CM</span>
        <div>
          <strong>Carla Mendes</strong>
          <span className="sample-post__time">há 2 horas</span>
        </div>
      </div>
      <p className="sample-post__text">O lado B é uma obra-prima. Ouvi inteiro de novo hoje.</p>
      <div className="sample-post__music">
        <div className="sample-post__cover" aria-hidden="true" />
        <div>
          <span className="sample-post__title">Abbey Road</span>
          <span className="sample-post__meta">The Beatles • álbum • 1969</span>
          <span className="sample-post__stars"><StarRating nota={5} /></span>
        </div>
      </div>
      <div className="sample-post__actions" aria-hidden="true">
        <span><i className="bi bi-chat" /> 12</span>
        <span><i className="bi bi-heart-fill" /> 48</span>
        <span><i className="bi bi-share" /></span>
      </div>
    </figure>
  );
}

export function LandingPage() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-eyebrow">Rede social de música</p>
          <h1>
            Avalie, comente e <em>descubra</em> música
          </h1>
          <p className="landing-lead">
            Poste a faixa ou o álbum que está ouvindo, dê sua nota de 1 a 5 estrelas e converse com quem curte o mesmo som.
          </p>
          <div className="landing-ctas">
            <Link to="/cadastrar" className="landing-button landing-button--primary">Criar conta</Link>
            <Link to="/login" className="landing-button landing-button--ghost">Já tenho conta</Link>
          </div>
        </div>
        <SamplePost />
      </section>

      <section className="landing-section" aria-labelledby="landing-features">
        <h2 id="landing-features">O que dá para fazer</h2>
        <div className="landing-features">
          {FEATURES.map((feature) => (
            <article key={feature.titulo} className="landing-feature">
              <img src={asset(feature.img)} alt="" />
              <h3>{feature.titulo}</h3>
              <p>{feature.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="landing-steps">
        <h2 id="landing-steps">Como funciona</h2>
        <ol className="landing-steps">
          {STEPS.map((step) => (
            <li key={step.titulo}>
              <h3>{step.titulo}</h3>
              <p>{step.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-final">
        <h2>Pronto para dar sua primeira nota?</h2>
        <Link to="/cadastrar" className="landing-button landing-button--primary">Criar conta</Link>
      </section>

      <footer className="landing-footer">TuneTalk · feito por Lucas Meregali</footer>
    </div>
  );
}
