import { useEffect, useState } from 'react';

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);

  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function ShareButton({ postId }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    try {
      await copyToClipboard(`${window.location.origin}/post/${postId}`);
      setCopied(true);
    } catch {
      // sem permissão de clipboard: não há o que mostrar
    }
  };

  return (
    <button type="button" className="btn botao-interacao" aria-label="Copiar link do post" onClick={share}>
      <i className="bi bi-share" style={{ color: '#2ba84a' }} />
      {copied && (
        <small role="status" className="comment-count" style={{ color: '#2ba84a', marginLeft: '.25rem' }}>
          Link copiado!
        </small>
      )}
    </button>
  );
}
