# TuneTalk

Rede social de música: poste músicas com nota e comentário, curta, comente, siga pessoas e receba notificações.

- **Frontend:** React 19 + React Router (SPA, Vite)
- **Backend:** Express (API JSON em `/api`) + MySQL
- **Testes:** Vitest + Testing Library (cliente) e Supertest (servidor)

## Como rodar

```bash
cp .env.example .env        # preencha banco, Cloudinary e SESSION_SECRET
docker compose up -d        # sobe o MySQL com banco.sql (opcional)
npm install
npm run dev                 # API em :3000 e React em :5173 (com proxy para /api)
```

Produção: `npm run build && npm start` — o Express serve a API e o build do React na mesma porta.

| Script | O que faz |
| --- | --- |
| `npm test` | roda todos os testes (servidor + cliente) |
| `npm run test:watch` | testes em modo watch (para TDD) |
| `npm run test:server` / `npm run test:client` | só uma das partes |

## Arquitetura

```
shared/                 regras usadas pelos dois lados (ex.: regras de senha)
server/src/
  app.js                createApp(deps): monta o Express com dependências injetadas
  container.js          composição real (pool MySQL, Cloudinary, Deezer)
  config.js             leitura das variáveis de ambiente
  http/                 rotas finas: validam entrada, chamam serviços, devolvem JSON
  services/             regras de negócio (auth, posts, perfis, busca de música)
  repositories/         todo o SQL, convertendo linhas do banco em objetos da API
  infra/                adaptadores (pool MySQL, upload no Cloudinary)
server/tests/           testes de repositórios, serviços, rotas e infra
client/src/
  api/                  cliente HTTP e funções por recurso (authApi, postsApi, ...)
  auth/                 AuthContext (sessão) e guards de rota
  hooks/                useAsync, useDebouncedValue
  components/           post/, profile/, layout/, common/
  pages/                Landing, Login, Cadastro, Feed, Perfil, Post
  styles/               CSS original escopado por layout (.layout-app / .layout-public)
```

Cada camada só conhece a de baixo, e as dependências chegam por parâmetro. Por isso dá
para testar rotas sem banco e serviços sem HTTP.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/auth/me` | usuário da sessão (401 se deslogado) |
| POST | `/api/auth/login` | `{ email, senha }` |
| POST | `/api/auth/register` | multipart: `nome`, `email`, `senha`, `imagem?` |
| POST | `/api/auth/logout` | encerra a sessão |
| GET | `/api/posts?feed=foryou\|seguindo` | feed |
| POST | `/api/posts` | cria post |
| GET / DELETE | `/api/posts/:id` | detalhe com comentários / apagar (só o autor) |
| POST / DELETE | `/api/posts/:id/like` | curtir / descurtir → `{ likes }` |
| POST | `/api/posts/:id/comments` | `{ texto }` |
| GET | `/api/users/:id` | perfil, posts, seguidores e seguindo |
| PUT | `/api/users/me` | multipart: `nome`, `bio`, `foto?` |
| POST / DELETE | `/api/users/:id/follow` | seguir / deixar de seguir |
| GET | `/api/notifications` | lista |
| GET | `/api/notifications/unread-count` | `{ count }` |
| POST | `/api/notifications/read-all` | marca todas como lidas |
| GET | `/api/music/search?q=` | busca no Deezer pelo servidor |
