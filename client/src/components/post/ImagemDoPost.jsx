import { useEffect, useState } from 'react';
import { originalImageUrl } from '../../utils/cloudinaryCrop.js';

// Imagem do post que se recupera sozinha: se o Cloudinary não conseguir gerar a versão cortada
// ou reduzida (acontece com GIF longo no plano grátis), mostra o arquivo como foi enviado.
export function ImagemDoPost({ src, ...props }) {
  const [atual, setAtual] = useState(src);
  useEffect(() => setAtual(src), [src]);

  const usarOriginal = () => {
    const original = originalImageUrl(atual);
    if (original) setAtual(original);
  };

  return <img src={atual} onError={usarOriginal} {...props} />;
}
