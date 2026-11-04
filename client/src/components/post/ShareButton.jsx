import { useEffect, useRef, useState } from 'react';

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);

  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// A demo roda só no navegador, sem o servidor que gera a imagem do Stories.
const TEM_STORIES = import.meta.env.VITE_DEMO !== 'true';

async function baixarImagemStories(postId) {
  const resposta = await fetch(`/api/og/post/${postId}/stories.png`);
  if (!resposta.ok) throw new Error('Falha ao gerar a imagem.');
  return new File([await resposta.blob()], `tunetalk-post-${postId}.png`, { type: 'image/png' });
}

function salvarArquivo(arquivo) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = arquivo.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Compartilhar: copiar o link do post ou mandar a imagem vertical dele para o Stories.
 * No celular a imagem abre o menu de compartilhar do aparelho (aí é só escolher o Instagram);
 * no computador ela é baixada. A imagem começa a ser gerada assim que o menu abre, porque o
 * iPhone só deixa abrir o menu de compartilhar logo depois do toque.
 */
export function ShareButton({ postId }) {
  const [open, setOpen] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [imagem, setImagem] = useState(null);
  const pedido = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!aviso) return undefined;
    const timer = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(timer);
  }, [aviso]);

  useEffect(() => {
    if (!open) return undefined;
    const fecharFora = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const fecharEsc = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [open]);

  const prepararImagem = () => {
    if (!TEM_STORIES || pedido.current) return pedido.current;
    pedido.current = baixarImagemStories(postId).then(
      (arquivo) => {
        setImagem(arquivo);
        return arquivo;
      },
      (erro) => {
        pedido.current = null;
        throw erro;
      },
    );
    pedido.current.catch(() => {});
    return pedido.current;
  };

  const abrir = () => {
    setOpen((aberto) => !aberto);
    prepararImagem();
  };

  const copiarLink = async () => {
    setOpen(false);
    try {
      await copyToClipboard(`${window.location.origin}/post/${postId}`);
      setAviso('Link copiado!');
    } catch {
      // sem permissão de clipboard: não há o que mostrar
    }
  };

  const compartilharStories = async () => {
    setOpen(false);
    let arquivo = imagem;
    try {
      arquivo ??= await prepararImagem();
    } catch {
      setAviso('Não deu para gerar a imagem.');
      return;
    }
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo] });
        return;
      } catch (erro) {
        if (erro?.name === 'AbortError') return; // a pessoa fechou o menu de compartilhar
      }
    }
    salvarArquivo(arquivo);
    setAviso('Imagem salva! Poste no Stories.');
  };

  return (
    <div className="post-menu share-menu" ref={ref}>
      <button
        type="button"
        className="post-action"
        aria-label="Compartilhar post"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={abrir}
      >
        <i className={aviso === 'Link copiado!' ? 'bi bi-check2' : 'bi bi-share'} aria-hidden="true" />
        {aviso && <span role="status">{aviso}</span>}
      </button>
      {open && (
        <ul className="post-menu__list share-menu__list" role="menu">
          <li role="none">
            <button type="button" role="menuitem" className="post-menu__item" onClick={copiarLink}>
              <i className="bi bi-link-45deg" aria-hidden="true" /> Copiar link
            </button>
          </li>
          {TEM_STORIES && (
            <li role="none">
              <button type="button" role="menuitem" className="post-menu__item" onClick={compartilharStories}>
                <i className="bi bi-instagram" aria-hidden="true" /> Compartilhar no Stories
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
