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

Produção: `npm run db:migrate && npm run build && npm start` — o Express serve a API e o build do React na mesma porta.

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
| `npm run db:import` | importa um dump do MySQL antigo |
| `npm run db:studio` | abre o Prisma Studio para ver os dados |
| `npm run build:demo` | gera a demo que roda só no navegador (backend fake com os serviços reais e dados fictícios) em `dist-demo/` |

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
| GET | `/api/posts?feed=foryou\|seguindo` | feed |
| POST | `/api/posts` | cria post; com `parentId` vira comentário. Música opcional (com música, `nota` de 0 a 10 é obrigatória) |
| GET / DELETE | `/api/posts/:id` | `{ post, pai, respostas }` / apagar com as respostas (só o autor) |
| POST / DELETE | `/api/posts/:id/like` | curtir / descurtir → `{ likes }` |
| GET | `/api/users/:id` | perfil, posts, seguidores e seguindo |
| PUT | `/api/users/me` | multipart: `nome`, `bio`, `foto?` |
| POST / DELETE | `/api/users/:id/follow` | seguir / deixar de seguir |
| GET | `/api/notifications` | lista |
| GET | `/api/notifications/unread-count` | `{ count }` |
| POST | `/api/notifications/read-all` | marca todas como lidas |
| GET | `/api/music/search?q=` | busca no Deezer pelo servidor |
