import { useEffect, useState } from 'react';

// Versão deste build (vem do vite.config). 'dev' em desenvolvimento, testes e demo: aí não confere.
// eslint-disable-next-line no-undef
export const VERSAO_ATUAL = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export const INTERVALO_VERSAO_MS = 5 * 60 * 1000;

async function versaoPublicada() {
  const resposta = await fetch('/version.json', { cache: 'no-store' });
  if (!resposta.ok) return null;
  return (await resposta.json())?.versao ?? null;
}

/**
 * Quem está com o app aberto (ou o atalho do iPhone "congelado" em segundo plano) segue com a
 * versão antiga depois de uma publicação. Este aviso confere se saiu versão nova ao voltar para o
 * app e a cada 5 min, e oferece "Atualizar". Não recarrega sozinho para não perder um post sendo escrito.
 */
export function AvisoNovaVersao({ versaoAtual = VERSAO_ATUAL, buscar = versaoPublicada }) {
  const [novaVersao, setNovaVersao] = useState(false);

  useEffect(() => {
    if (versaoAtual === 'dev') return undefined;
    let ativo = true;
    const conferir = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const publicada = await buscar();
        if (ativo && publicada && publicada !== versaoAtual) setNovaVersao(true);
      } catch {
        // Sem rede: confere de novo depois.
      }
    };
    conferir();
    const intervalo = setInterval(conferir, INTERVALO_VERSAO_MS);
    document.addEventListener('visibilitychange', conferir);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', conferir);
    };
  }, [versaoAtual, buscar]);

  if (!novaVersao) return null;
  return (
    <div className="aviso-versao" role="status">
      <span>Tem uma versão nova do TuneTalk.</span>
      <button type="button" onClick={() => window.location.reload()}>Atualizar</button>
    </div>
  );
}
