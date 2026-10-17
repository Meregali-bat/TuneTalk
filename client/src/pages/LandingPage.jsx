import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { asset } from '../utils/asset.js';

const blocks = [
  { text: 'Debater livremente sobre músicas', img: asset('img/debateIMG.jpg'), n: 'first', imageFirst: true, textAos: 'fade-down-left', imgAos: 'fade-up-right' },
  { text: 'compartilhar sua banda ou artista favorito', img: asset('img/albunsIMG.png'), n: 'second', imageFirst: false, textAos: 'fade-up-right', imgAos: 'fade-up-left' },
  { text: 'Personalizar seu perfil como quiser', img: asset('img/betles.png'), n: 'third', imageFirst: true, textAos: 'fade-down-left', imgAos: 'fade-up-right' },
  { text: 'Conhecer músicas e artistas novos', img: asset('img/musicasIMG.jpg'), n: 'fourth', imageFirst: false, textAos: 'fade-right', imgAos: 'fade-up-right' },
];

export function LandingPage() {
  useEffect(() => {
    AOS.init();
  }, []);

  return (
    <div className="main">
      <div data-aos="zoom-in" className="welcome-text">
        <span>
          Olá, seja bem-vindo(a) ao <strong>TuneTalk</strong> <br /> Aqui você pode
        </span>
      </div>
      <div>
        <i className="bi bi-arrow-down icone" />
      </div>
      {blocks.map((block) => {
        const image = (
          <div key="img" className={`${block.n}-block-image`} data-aos={block.imgAos}>
            <img src={block.img} alt="" />
          </div>
        );
        const text = (
          <div key="text" data-aos={block.textAos} className={`${block.n}-block`}>
            <span>{block.text}</span>
          </div>
        );
        return (
          <div key={block.n} className="block">
            <div className="block-container">
              {block.imageFirst ? [image, text] : [text, image]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
