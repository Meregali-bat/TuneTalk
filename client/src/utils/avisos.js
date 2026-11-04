import { pushApi } from '../api/index.js';

// Chave VAPID (base64url) no formato que o PushManager espera.
export function chaveParaBytes(base64url) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

/**
 * Situação dos avisos neste aparelho:
 * 'desligado' (servidor sem chaves: não mostra nada), 'sem-suporte', 'iphone-instalar',
 * 'bloqueado' (a pessoa negou), 'desativado' ou 'ativado'.
 */
export async function situacaoDosAvisos() {
  const chave = await pushApi.chave().catch(() => null);
  if (!chave) return { estado: 'desligado' };
  const suporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!suporta) return { estado: ehIphone() && !instalado() ? 'iphone-instalar' : 'sem-suporte' };
  if (Notification.permission === 'denied') return { estado: 'bloqueado' };
  const registro = await navigator.serviceWorker.ready;
  const inscricao = await registro.pushManager.getSubscription();
  if (inscricao) {
    // Reenvia a inscrição: mantém o aparelho ligado à conta que está usando o app agora.
    pushApi.inscrever(inscricao.toJSON()).catch(() => {});
    return { estado: 'ativado' };
  }
  return { estado: 'desativado' };
}

// Precisa ser chamada dentro de um toque (o iPhone só pede permissão assim).
export async function ativarAvisos() {
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') return { estado: permissao === 'denied' ? 'bloqueado' : 'desativado' };
  const chave = await pushApi.chave();
  const registro = await navigator.serviceWorker.ready;
  const inscricao = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) });
  await pushApi.inscrever(inscricao.toJSON());
  return { estado: 'ativado' };
}

export async function desativarAvisos() {
  const registro = await navigator.serviceWorker.ready;
  const inscricao = await registro.pushManager.getSubscription();
  if (inscricao) {
    await pushApi.cancelar(inscricao.endpoint).catch(() => {});
    await inscricao.unsubscribe();
  }
  return { estado: 'desativado' };
}

// Bolinha com o número de não lidas no ícone do app (quando o sistema permite).
export function atualizarBolinha(naoLidas) {
  if (!('setAppBadge' in navigator)) return;
  const pedido = naoLidas > 0 ? navigator.setAppBadge(naoLidas) : navigator.clearAppBadge();
  pedido?.catch?.(() => {});
}
