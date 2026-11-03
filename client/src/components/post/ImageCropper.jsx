import { useState } from 'react';
import Cropper from 'react-easy-crop';

// null = proporção da própria imagem.
const FORMATOS = [
  ['Original', null],
  ['Quadrado', 1],
  ['Retrato', 4 / 5],
  ['Paisagem', 16 / 9],
];

/**
 * Ajuste da imagem do post: a pessoa escolhe o formato, arrasta e dá zoom para enquadrar.
 * Devolve o pedaço escolhido em pixels da imagem original (o corte é feito pelo Cloudinary)
 * e a proporção final. "Original" sem zoom não corta nada.
 */
export function ImageCropper({ src, onConfirm, onCancel }) {
  const [formato, setFormato] = useState('Original');
  const [natural, setNatural] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [recorte, setRecorte] = useState(null);

  const fixo = FORMATOS.find(([nome]) => nome === formato)[1];
  const aspect = fixo ?? natural ?? undefined;

  const confirmar = () => {
    const semCorte = formato === 'Original' && zoom === 1;
    onConfirm({
      pixels: semCorte ? null : recorte.pixels,
      area: semCorte ? null : recorte.area,
      proporcao: aspect,
    });
  };

  return (
    <div className="composer-step cropper">
      <div className="cropper__area">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          objectFit="contain"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(area, pixels) => setRecorte({ area, pixels })}
          onMediaLoaded={(media) => setNatural(media.naturalWidth / media.naturalHeight)}
        />
      </div>

      <div role="group" aria-label="Formato da imagem" className="cropper__formatos">
        {FORMATOS.map(([nome]) => (
          <button
            key={nome}
            type="button"
            className={`cropper__formato${nome === formato ? ' is-active' : ''}`}
            aria-pressed={nome === formato}
            onClick={() => { setFormato(nome); setZoom(1); setCrop({ x: 0, y: 0 }); }}
          >
            {nome}
          </button>
        ))}
      </div>

      <label className="cropper__zoom">
        <i className="bi bi-zoom-out" aria-hidden="true" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          aria-label="Zoom"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
        <i className="bi bi-zoom-in" aria-hidden="true" />
      </label>

      <div className="edit-profile__actions">
        <button type="button" className="composer-link" onClick={onCancel}>Cancelar</button>
        <button type="button" className="composer-submit" disabled={!recorte || !aspect} onClick={confirmar}>
          Usar imagem
        </button>
      </div>
    </div>
  );
}
