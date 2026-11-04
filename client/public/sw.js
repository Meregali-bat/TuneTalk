/* Service worker do TuneTalk: recebe os avisos (push) mesmo com o app fechado e mostra a página
   "Sem internet" quando o site é aberto sem conexão. */

// Troque a versão quando mudar offline.html, para o aparelho guardar a nova.
const CACHE_OFFLINE = 'tunetalk-offline-v1';
const PAGINA_OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_OFFLINE);
    await cache.add(new Request(PAGINA_OFFLINE, { cache: 'reload' }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Apaga as versões antigas da página offline.
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('tunetalk-offline-') && n !== CACHE_OFFLINE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Só a abertura de páginas passa por aqui: tenta a rede normalmente e, se ela falhar (sem
// internet), responde com a página guardada. O resto (API, imagens, scripts) segue direto.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch {
      const guardada = await caches.match(PAGINA_OFFLINE, { cacheName: CACHE_OFFLINE });
      return guardada || new Response('Sem internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

self.addEventListener('push', (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch {
    aviso = { texto: event.data ? event.data.text() : '' };
  }
  const tarefas = [
    // O iPhone exige mostrar um aviso para cada push recebido.
    self.registration.showNotification(aviso.titulo || 'TuneTalk', {
      body: aviso.texto || 'Você tem uma notificação nova.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: aviso.url || '/' },
    }),
  ];
  // Bolinha com o número de não lidas no ícone (app adicionado à tela inicial).
  if (typeof aviso.naoLidas === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
    tarefas.push(self.navigator.setAppBadge(aviso.naoLidas).catch(() => {}));
  }
  event.waitUntil(Promise.all(tarefas));
});

// Tocar no aviso abre o app no post ou perfil certo (reaproveitando a janela aberta, se houver).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const janela = janelas.find((c) => c.url.startsWith(self.location.origin));
    if (janela) {
      await janela.focus();
      if ('navigate' in janela) await janela.navigate(url);
      return;
    }
    await self.clients.openWindow(url);
  })());
});
