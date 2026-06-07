# TuneTalk — Roadmap de Melhorias

Organizado em 4 fases incrementais. Cada fase é independente e deployável.  
Design completo em `docs/superpowers/specs/2026-06-01-tunetalk-modernization-design.md`.

---

## Fase 1 — Segurança (Express + EJS atual)

### 1.1 SQL Injection
- [✅] Atualizar `models/dbModel.js` para aceitar `params` como segundo argumento e usar `connection.execute(sql, params)` (com `namedPlaceholders: true` na conexão)
- [✅] Migrar `models/modelUsuario.js` — todas as queries para placeholders nomeados `:p_xxx`
- [✅] Migrar `models/modelPost.js` — todas as queries para placeholders nomeados `:p_xxx`
- [✅] Migrar `models/modelComentario.js` — todas as queries para placeholders nomeados `:p_xxx`
- [✅] Migrar `models/modelNotificacao.js` — todas as queries para placeholders nomeados `:p_xxx`

### 1.2 Credenciais expostas
- [ ] Mover chave RapidAPI (Deezer) de `public/script/apiDeezer.js` para `.env`
- [ ] Mover `client_id` e `client_secret` do Spotify de `public/script/apiSpotify.js` para `.env`
- [ ] Mover o `secret` da sessão hardcoded em `index.js` para `.env`
- [ ] Criar rota Express `/api/music/search` para proxear chamadas Deezer/Spotify (tira credenciais do client-side)
- [ ] Atualizar `apiDeezer.js` e `apiSpotify.js` para chamar `/api/music/search` em vez da API externa diretamente
- [ ] Adicionar `.env` e `uploads/` ao `.gitignore`

### 1.3 Hashing de senhas
- [ ] Instalar `bcrypt`
- [ ] Atualizar `models/modelUsuario.js`: função `cadastrar` passa a usar `bcrypt.hash(senha, 10)`
- [ ] Atualizar `models/modelUsuario.js`: função `autenticar` usa `bcrypt.compare` em vez de comparar MD5
- [ ] Adicionar lógica de re-hash transparente no login: se hash MD5 bater, re-salvar com bcrypt

### 1.4 Connection pool
- [ ] Substituir `mysql.createConnection` por `mysql.createPool` em `models/dbModel.js`
- [ ] Remover o `connection.end()` manual (pool gerencia o ciclo de vida)

---

## Fase 2 — JWT (Express + EJS)

- [ ] Instalar `jsonwebtoken` e `cookie-parser`
- [ ] Remover `express-session` do `package.json` e de `index.js`
- [ ] Criar `lib/auth.js` com funções `signAccessToken(payload)` e `signRefreshToken(payload)`
- [ ] Adicionar `JWT_SECRET` e `JWT_REFRESH_SECRET` ao `.env`
- [ ] Criar middleware `verifyToken` em `lib/auth.js`:
  - Lê cookie `accessToken`
  - Se válido: popula `req.user` e chama `next()`
  - Se expirado: tenta refresh silencioso via cookie `refreshToken`
  - Se inválido/ausente: redireciona para `/login` (ou retorna 401 em rotas `/api/*`)
- [ ] Substituir o bloco de middleware de sessão em `index.js` pelo `verifyToken`
- [ ] Atualizar `controllers/controllerUsuario.js`: `POST /login` emite tokens como cookies `httpOnly; Secure; SameSite=Strict`
- [ ] Atualizar `GET /logout`: limpa os dois cookies em vez de destruir sessão
- [ ] Criar rota `POST /refresh` que valida `refreshToken` e emite novo `accessToken`
- [ ] Fazer busca global por `req.session.user` e substituir por `req.user` em controllers e views
- [ ] Remover `req.session.authorizationCode` e `req.session.accessToken` das variáveis de layout (eram do Spotify)

---

## Fase 3 — Prisma (Express + EJS + JWT)

- [ ] Instalar `prisma` e `@prisma/client`
- [ ] Rodar `npx prisma init` e configurar `DATABASE_URL` no `.env`
- [ ] Rodar `npx prisma db pull` para gerar o `schema.prisma` a partir do banco existente
- [ ] Revisar e completar relações no `schema.prisma` (Post→Usuario, Curtir→Post+Usuario, etc.)
- [ ] Criar `lib/prisma.js` com singleton do `PrismaClient`
- [ ] Reescrever `models/modelUsuario.js` usando Prisma Client (manter assinaturas de função)
- [ ] Reescrever `models/modelPost.js` usando Prisma Client — substituir classe por funções exportadas
- [ ] Reescrever `models/modelComentario.js` usando Prisma Client
- [ ] Reescrever `models/modelNotificacao.js` usando Prisma Client
- [ ] Deletar `models/dbModel.js`
- [ ] Rodar `npx prisma migrate dev --name init` para criar a primeira migration versionada

---

## Fase 4 — Next.js (Next.js + Prisma + JWT)

### Setup
- [ ] Criar projeto com `npx create-next-app@latest tunetalk-next --typescript --app`
- [ ] Copiar `lib/prisma.ts`, `lib/auth.ts` e `prisma/schema.prisma` para o novo projeto
- [ ] Configurar `.env.local` com as mesmas variáveis de ambiente

### API Routes (substituem rotas Express)
- [ ] `app/api/auth/login/route.ts`
- [ ] `app/api/auth/logout/route.ts`
- [ ] `app/api/auth/refresh/route.ts`
- [ ] `app/api/posts/route.ts` — GET (feed), POST (criar)
- [ ] `app/api/posts/[id]/route.ts` — GET (detalhe), DELETE
- [ ] `app/api/posts/[id]/like/route.ts` — GET curtir, DELETE descurtir
- [ ] `app/api/posts/[id]/comments/route.ts` — GET listar, POST criar
- [ ] `app/api/users/[id]/route.ts` — GET perfil, POST editar
- [ ] `app/api/users/[id]/follow/route.ts` — GET seguir, DELETE deixar de seguir
- [ ] `app/api/notifications/route.ts` — GET listar
- [ ] `app/api/notifications/read/route.ts` — POST marcar lidas
- [ ] `app/api/music/search/route.ts` — proxy para Deezer/Spotify

### Auth Middleware
- [ ] Criar `middleware.ts` na raiz — verifica `accessToken` cookie em todas as rotas `/(app)/*`

### Páginas React (substituem views EJS)
- [ ] `app/(auth)/login/page.tsx`
- [ ] `app/(auth)/cadastrar/page.tsx`
- [ ] `app/(app)/foryou/page.tsx` — Server Component, busca posts via Prisma direto
- [ ] `app/(app)/seguindo/page.tsx` — Server Component
- [ ] `app/(app)/perfil/[id]/page.tsx` — Server Component
- [ ] `app/(app)/post/[id]/page.tsx` — Server Component

### Componentes Client-side
- [ ] `components/PostCard.tsx` — card de post com like button (`"use client"`)
- [ ] `components/CreatePostModal.tsx` — modal de busca musical + formulário (`"use client"`)
- [ ] `components/FollowButton.tsx` — botão seguir/deixar de seguir (`"use client"`)
- [ ] `components/NotificationDropdown.tsx` — dropdown de notificações (`"use client"`)
- [ ] `components/Header.tsx` — header com navegação

### Finalização
- [ ] Remover Multer — upload de imagens via `FormData` na API Route com Cloudinary
- [ ] Deletar `public/script/apiDeezer.js` e `public/script/apiSpotify.js`
- [ ] Deploy no Vercel + banco MySQL no Railway ou PlanetScale
