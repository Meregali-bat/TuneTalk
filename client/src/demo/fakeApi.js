// Backend da demonstração: as mesmas rotas e respostas da API Express, executando os
// serviços reais do servidor sobre um banco em memória salvo no localStorage do visitante.
import { HttpError, badRequest, forbidden, notFound, unauthorized } from '../../../server/src/errors.js';
import { createAuthService } from '../../../server/src/services/authService.js';
import { createPostService } from '../../../server/src/services/postService.js';
import { createUserService } from '../../../server/src/services/userService.js';
import { createPasswords } from '../../../server/src/security/passwords.js';
import { createPasswordResetService } from '../../../server/src/services/passwordResetService.js';
import { createHashtagService } from '../../../server/src/services/hashtagService.js';
import { createMemoryRepositories } from './memoryRepositories.js';
import { ALBUM_CATALOG, CATALOG, DEMO_LOGIN, createSeed } from './seed.js';
import { avatar } from './art.js';

const LETRA_DEMO = [
  'A cidade acorda devagar', 'E eu ainda penso no que você disse', 'Toda vez que esse som começa a tocar',
  'Eu volto pra noite em que tudo existe', 'O rádio baixinho, a janela aberta', 'O mundo inteiro cabia no carro',
  'E a gente cantava a parte errada', 'Rindo de tudo que era tão raro',
];

export { DEMO_LOGIN };

const STORAGE_KEY = 'tunetalk-demo-v10';

const readState = (storage) => {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeState = (storage, state) => {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // armazenamento cheio ou bloqueado: a demo segue só em memória
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(badRequest('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });

const searchCatalog = (q, tipo) => {
  const term = (q ?? '').trim().toLowerCase();
  if (!term) return [];
  const catalogo = tipo === 'album' ? ALBUM_CATALOG : CATALOG;
  return catalogo.filter((t) => `${t.titulo} ${t.artista}`.toLowerCase().includes(term));
};

// Custo menor que o do servidor: no navegador, cada hash bcrypt trava a tela enquanto calcula.
const passwords = createPasswords({ rounds: 8 });

export function createFakeApi({ storage = globalThis.localStorage } = {}) {
  let state = readState(storage) ?? createSeed();
  let services;

  const build = () => {
    const repos = createMemoryRepositories(state, () => writeState(storage, state));
    const postService = createPostService({
      posts: repos.posts, likes: repos.likes, notifications: repos.notifications, users: repos.users,
    });
    services = {
      auth: createAuthService({ users: repos.users, passwords, notifications: repos.notifications }),
      // Sem email na demo: o link aparece no console do navegador.
      reset: createPasswordResetService({
        users: repos.users,
        resets: repos.resets,
        passwords,
        mailer: { send: async ({ text }) => console.info(text) },
        sessions: { destroyAll: async () => { state.session = null; } },
        appUrl: `${globalThis.location?.origin ?? ''}${globalThis.location?.pathname ?? ''}`,
      }),
      posts: postService,
      users: createUserService({
        users: repos.users, follows: repos.follows, postService, notifications: repos.notifications, passwords,
      }),
      notifications: repos.notifications,
      hashtags: createHashtagService({ posts: repos.posts }),
    };
  };
  build();

  const session = () => state.session;
  const signedIn = () => {
    if (!state.session) throw unauthorized();
    return state.session.id;
  };
  // Igual ao middleware requireUsername do servidor: sem nome de usuário, só a sessão e a escolha do nome.
  const me = () => {
    const id = signedIn();
    if (!state.session.nome) throw forbidden('Escolha um nome de usuário para continuar.');
    return id;
  };
  const startSession = (user) => {
    state.session = user;
    writeState(storage, state);
    return user;
  };

  const ok = (body, status = 200) => ({ status, body });
  const noContent = () => ({ status: 204, body: null });

  const routes = [
    ['GET', /^\/auth\/me$/, () => { signedIn(); return ok(session()); }],
    ['POST', /^\/auth\/login$/, async ({ body }) => ok(startSession(await services.auth.login(body.email, body.senha)))],
    ['POST', /^\/auth\/logout$/, () => { state.session = null; writeState(storage, state); return noContent(); }],
    ['POST', /^\/auth\/forgot-password$/, async ({ body }) => { await services.reset.request(body.email); return noContent(); }],
    ['POST', /^\/auth\/reset-password$/, async ({ body }) => {
      await services.reset.reset(body.token, body.novaSenha);
      writeState(storage, state);
      return noContent();
    }],
    ['POST', /^\/auth\/register$/, async ({ body }) => {
      const fotoPerfil = avatar(String(body.email ?? '?').split('@')[0] || '?');
      const user = await services.auth.register({ email: body.email, senha: body.senha, fotoPerfil });
      return ok(startSession(user), 201);
    }],

    ['GET', /^\/posts$/, async ({ query }) => {
      if (query.has('tag')) return ok(await services.posts.byHashtag(query.get('tag'), me()));
      const feeds = { foryou: services.posts.forYou, seguindo: services.posts.following };
      const load = feeds[query.get('feed')];
      if (!load) throw badRequest('Feed inválido.');
      return ok(await load(me()));
    }],
    ['POST', /^\/posts$/, async ({ body }) => ok({ id: await services.posts.create(me(), body) }, 201)],
    ['GET', /^\/posts\/(\d+)$/, async ({ id }) => ok(await services.posts.get(id, me()))],
    ['DELETE', /^\/posts\/(\d+)$/, async ({ id }) => { await services.posts.remove(id, me()); return noContent(); }],
    ['POST', /^\/posts\/(\d+)\/pin$/, async ({ id }) => { await services.posts.pin(id, me()); return noContent(); }],
    ['DELETE', /^\/posts\/(\d+)\/pin$/, async ({ id }) => { await services.posts.unpin(id, me()); return noContent(); }],
    ['POST', /^\/posts\/(\d+)\/like$/, async ({ id }) => ok({ likes: await services.posts.like(id, me()) })],
    ['DELETE', /^\/posts\/(\d+)\/like$/, async ({ id }) => ok({ likes: await services.posts.unlike(id, me()) })],

    ['PUT', /^\/users\/me\/username$/, async ({ body }) => {
      const { nome } = await services.users.setUsername(signedIn(), body.nome);
      return ok(startSession({ ...state.session, nome }));
    }],
    ['PUT', /^\/users\/me\/password$/, async ({ body }) => {
      await services.users.changePassword(me(), body.senhaAtual, body.novaSenha);
      return noContent();
    }],
    // Na demo o "Cloudinary" é este endereço: a foto vira data URL e fica no próprio navegador.
    ['POST', /^\/posts\/image-upload$/, () => { me(); return ok({ uploadUrl: '/api/demo-upload', fields: {} }); }],
    ['POST', /^\/users\/me\/banner-upload$/, () => { me(); return ok({ uploadUrl: '/api/demo-upload', fields: {} }); }],
    ['POST', /^\/users\/me\/photo-upload$/, () => { me(); return ok({ uploadUrl: '/api/demo-upload', fields: {} }); }],
    ['POST', /^\/demo-upload$/, async ({ form }) => ok({ secure_url: await fileToDataUrl(form.get('file')) })],
    ['PUT', /^\/users\/me$/, async ({ body }) => {
      const isDemoImage = (url) => url === undefined || String(url).startsWith('data:image/');
      if (!isDemoImage(body.fotoPerfil)) throw badRequest('Foto inválida. Envie a imagem de novo.');
      if (!isDemoImage(body.bannerUrl)) throw badRequest('Capa inválida. Envie a imagem de novo.');
      const { nome, nomeExibicao, bio, fotoPerfil, bannerUrl, mostrarSeloFundador } = body;
      const usuario = await services.users.updateProfile(me(), { nome, nomeExibicao, bio, fotoPerfil, bannerUrl, mostrarSeloFundador });
      startSession({ ...state.session, nome: usuario.nome });
      return ok(usuario);
    }],
    ['GET', /^\/users\/by-name\/([^/]+)$/, async ({ match }) => ok(await services.users.getProfileByName(decodeURIComponent(match[1]), me()))],
    ['GET', /^\/users$/, async ({ query }) => ok(await services.users.search(query.get('q'), me()))],
    ['GET', /^\/users\/(\d+)\/comentarios$/, async ({ id }) => ok(await services.posts.repliesByAuthor(id, me()))],
    ['GET', /^\/users\/(\d+)$/, async ({ id }) => ok(await services.users.getProfile(id, me()))],
    ['POST', /^\/users\/(\d+)\/follow$/, async ({ id }) => { await services.users.follow(me(), id); return noContent(); }],
    ['DELETE', /^\/users\/(\d+)\/follow$/, async ({ id }) => { await services.users.unfollow(me(), id); return noContent(); }],

    ['GET', /^\/notifications$/, async () => ok(await services.notifications.listForUser(me()))],
    ['GET', /^\/notifications\/unread-count$/, async () => ok({ count: await services.notifications.countUnread(me()) })],
    ['POST', /^\/notifications\/read-all$/, async () => { await services.notifications.markAllRead(me()); return noContent(); }],

    ['GET', /^\/hashtags\/em-alta$/, async () => { me(); return ok(await services.hashtags.trending()); }],
    ['GET', /^\/hashtags$/, async ({ query }) => { me(); return ok(await services.hashtags.search(query.get('q'))); }],
    // Letra de mentira (versos inventados): o demo não acessa a LRCLIB.
    ['GET', /^\/music\/lyrics$/, () => { me(); return ok({ versos: LETRA_DEMO }); }],
    ['GET', /^\/music\/search$/, ({ query }) => { me(); return ok(searchCatalog(query.get('q'), query.get('tipo'))); }],
  ];

  return {
    currentUserId: () => state.session?.id ?? null,

    reset() {
      state = createSeed();
      writeState(storage, state);
      build();
    },

    async handle(method, url, rawBody) {
      const [pathname, search = ''] = url.split('?');
      const route = routes.find(([m, pattern]) => m === method && pattern.test(pathname));
      try {
        if (!route) throw notFound('Rota não encontrada.');
        const match = pathname.match(route[1]);
        const form = rawBody instanceof FormData ? rawBody : null;
        const body = !form && typeof rawBody === 'string' ? JSON.parse(rawBody) : {};
        return await route[2]({ id: match[1] && Number(match[1]), match, body, form, query: new URLSearchParams(search) });
      } catch (error) {
        if (error instanceof HttpError) return { status: error.status, body: { error: error.message } };
        console.error(error);
        return { status: 500, body: { error: 'Erro interno do servidor.' } };
      }
    },
  };
}

// Intercepta as chamadas a /api feitas pelo cliente (api/http.js) e responde com a API fake.
export function installFakeBackend() {
  const api = createFakeApi();
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('/api/')) return realFetch(input, init);

    const { status, body } = await api.handle(init.method ?? 'GET', url.slice('/api'.length), init.body);
    return status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };

  return api;
}
