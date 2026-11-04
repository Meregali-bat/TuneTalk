/* Service worker do TuneTalk: recebe os avisos (push) mesmo com o app fechado. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
