# TuneTalk

Rede social de música: poste músicas com nota e comentário, curta, comente, siga pessoas e receba notificações.

- **Frontend:** React 19 + React Router (SPA, Vite)
- **Backend:** Express (API JSON em `/api`) + PostgreSQL via Prisma 7
- **Testes:** Vitest + Testing Library (cliente), Supertest (rotas) e PGlite (repositórios contra Postgres real, em memória)

## Como rodar

```bash
cp .env.example .env        # preencha DATABASE_URL, Cloudinary e SESSION_SECRET
docker compose up -d        # sobe um Postgres local (ou use Neon/RDS no DATABASE_URL)
npm install                 # também gera o Prisma Client
npm run db:migrate          # cria as tabelas
npm run dev                 # API em :3000 e React em :5173 (com proxy para /api)
```

Produção em servidor próprio: `npm run db:migrate && npm run build && npm start` — o Express serve a API e o build do React na mesma porta.

### Deploy na Vercel + Neon

- `vercel.json`: a Vercel entrega o build do React (`dist/`) e manda `/api/*` para a função `api/index.js` (o mesmo app Express).
- O build (`npm run vercel-build`) aplica as migrations e depois gera o React.
- Sessões ficam no Postgres (tabela `session`), porque cada requisição pode cair numa instância diferente.
- Limite de requisições pelo mesmo motivo: os contadores ficam na tabela `limites_requisicao` e os números estão em `server/src/http/limites.js`. Passou do limite, a API responde 429 com `Retry-After`. O ip vem do `X-Forwarded-For` que a Vercel preenche; fora dela, atrás de outro proxy, ligue `COOKIE_SECURE=true` (que também ativa o `trust proxy`), senão todo mundo conta como um ip só.
- Variáveis de ambiente na Vercel: `DATABASE_URL` (Neon com pooler), `DATABASE_URL_UNPOOLED` (Neon direta, usada pelas migrations), `SESSION_SECRET` e as três do Cloudinary. A integração Neon da Vercel cria as duas do banco sozinha.
- "Esqueci minha senha" (email pelo [Resend](https://resend.com)): `RESEND_API_KEY`, `EMAIL_FROM` (ex.: `TuneTalk <nao-responda@seudominio.com>`, de um domínio verificado no Resend) e, se o site tiver domínio próprio, `APP_URL` (base dos links; sem ela, usa o domínio de produção da Vercel). Sem `RESEND_API_KEY` o email só aparece no log.

### Migrar os dados do MySQL antigo

```bash
npm run db:import -- banco.sql --dry-run   # mostra o que entra e o que é descartado (órfãos)
npm run db:import -- banco.sql             # grava no DATABASE_URL (precisa estar vazio)
```

Para dados mais recentes que o `banco.sql`, gere um dump novo com
`mysqldump -u <usuario> -p tunetalk > dump.sql` (formato padrão) e importe o arquivo.
Os ids são preservados, então links antigos (`/post/123`, `/perfil/11`) continuam funcionando.

| Script | O que faz |
| --- | --- |
| `npm test` | roda todos os testes (servidor + cliente) |
| `npm run test:watch` | testes em modo watch (para TDD) |
| `npm run test:server` / `npm run test:client` | só uma das partes |
| `npm run db:migrate` | aplica as migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | cria uma migration nova após mudar o `schema.prisma` |
| `npm run db:generate` | gera o Prisma Client e converte para JavaScript (roda sozinho no `npm install`) |
| `npm run db:import` | importa um dump do MySQL antigo |
| `npm run db:studio` | abre o Prisma Studio para ver os dados |
| `npm run build:demo` | gera a demo que roda só no navegador (backend fake com os serviços reais e dados fictícios) em `dist-demo/` |

## Padrão de commits e branches

- Commit: `:emoji: tipo: descrição` — ex.: `:bug: fix: ajuste no like`, `:sparkles: feat: repostar`
- Branch: `tipo/nome-curto` — ex.: `feat/repostar`, `fix/like`
- Tipos: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `chore`

O `npm install` liga os hooks de `.githooks/` (`commit-msg` e `pre-push`), que barram commit e push fora do padrão. O CI (`.github/workflows/ci.yml`) confere de novo em todo PR e roda testes e build. Ficam de fora: `main` e mensagens geradas pelo git (merge, revert, fixup). As branches `claude/...` passam no hook local, mas o CI recusa: o push vai para uma branch no padrão.

## Arquitetura

```
prisma/                 schema.prisma e migrations versionadas
scripts/                migrate-mysql-dump.js (importação dos dados antigos)
shared/                 regras usadas pelos dois lados (ex.: regras de senha)
server/src/
  app.js                createApp(deps): monta o Express com dependências injetadas
  container.js          composição real (Prisma/Postgres, Cloudinary, Deezer)
  config.js             leitura das variáveis de ambiente
  http/                 rotas finas: validam entrada, chamam serviços, devolvem JSON
  services/             regras de negócio (auth, posts, perfis, busca de música)
  repositories/         todo acesso ao banco (Prisma), convertendo registros em objetos da API
  migration/            leitura do dump MySQL, transformação e carga no Postgres
  infra/                adaptadores (Prisma Client, upload no Cloudinary)
  generated/prisma/     Prisma Client gerado (não versionado; `npm install` gera)
server/tests/           testes de repositórios e migração (Postgres em memória), serviços, rotas e infra
client/src/
  api/                  cliente HTTP e funções por recurso (authApi, postsApi, ...)
  auth/                 AuthContext (sessão) e guards de rota
  hooks/                useAsync, useDebouncedValue
  components/           post/, profile/, layout/, common/
  pages/                Landing, Login, Cadastro, Feed, Perfil, Post
  demo/                 backend fake da demo: serviços reais + repositórios em memória
  styles/               CSS original escopado por layout (.layout-app / .layout-public)
```

Cada camada só conhece a de baixo, e as dependências chegam por parâmetro. Por isso dá
para testar rotas sem banco e serviços sem HTTP.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/auth/me` | usuário da sessão (401 se deslogado) |
| POST | `/api/auth/login` | `{ email, senha }` |
| POST | `/api/auth/register` | `{ email, senha }` |
| POST | `/api/auth/logout` | encerra a sessão |
| POST | `/api/auth/forgot-password` | `{ email }` → 204 sempre; manda o link de redefinição (1 hora, uso único) |
| POST | `/api/auth/reset-password` | `{ token, novaSenha }` → troca a senha e desconecta todos os aparelhos |
| GET | `/api/posts?feed=foryou\|seguindo` | feed |
| POST | `/api/posts` | cria post; com `parentId` vira comentário. Música opcional (com música, `nota` de 0 a 10 é obrigatória) |
| GET / DELETE | `/api/posts/:id` | `{ post, pai, respostas }` / apagar com as respostas (só o autor) |
| POST / DELETE | `/api/posts/:id/like` | curtir / descurtir → `{ likes }` |
| POST / DELETE | `/api/posts/:id/pin` | fixar / desafixar no perfil (só o autor, só posts principais; um por perfil) |
| GET | `/api/users?q=` | busca pessoas pelo nome de usuário ou de exibição (com `seguindo`) |
| GET | `/api/users/:id` | perfil, posts, seguidores e seguindo |
| PUT | `/api/users/me` | `{ nome, nomeExibicao?, bio?, fotoPerfil?, bannerUrl? }` (foto e capa já enviadas ao Cloudinary) |
| POST | `/api/users/me/photo-upload` / `banner-upload` | assinatura para enviar foto/capa direto ao Cloudinary |
| POST | `/api/posts/image-upload` | assinatura para enviar a imagem do post direto ao Cloudinary |
| PUT | `/api/users/me/password` | `{ senhaAtual, novaSenha }` → troca a senha e desconecta os outros aparelhos |
| POST / DELETE | `/api/users/:id/follow` | seguir / deixar de seguir |
| GET | `/api/notifications` | lista |
| GET | `/api/notifications/unread-count` | `{ count }` |
| POST | `/api/notifications/read-all` | marca todas como lidas |
| GET | `/api/music/search?q=` | busca no Deezer pelo servidor |
| GET | `/api/hashtags/em-alta` | hashtags mais usadas nos últimos 7 dias (com quantos posts) |
| GET | `/api/hashtags?q=` | busca hashtags que começam com o texto |
