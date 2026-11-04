import { useEffect, useState } from 'react';

const online = () => (typeof navigator === 'undefined' || navigator.onLine !== false);

/**
 * Com o app já aberto e a conexão caindo, avisa no topo em vez de deixar as ações falharem
 * sem explicação. Some sozinho quando a internet volta. (Abrir o site sem internet mostra a
 * página offline.html, servida pelo service worker.)
 */
export function AvisoSemInternet() {
  const [conectado, setConectado] = useState(online);

  useEffect(() => {
    const atualizar = () => setConectado(online());
    window.addEventListener('online', atualizar);
    window.addEventListener('offline', atualizar);
    return () => {
      window.removeEventListener('online', atualizar);
      window.removeEventListener('offline', atualizar);
    };
  }, []);

  if (conectado) return null;
  return (
    <div className="aviso-offline" role="status">
      <i className="bi bi-wifi-off" aria-hidden="true" />
      <span>Você está sem internet</span>
    </div>
  );
}
