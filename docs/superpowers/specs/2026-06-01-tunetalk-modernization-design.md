# TuneTalk Modernization Design

**Date:** 2026-06-01  
**Status:** Approved  
**Scope:** Security hardening + incremental stack modernization (JWT → Prisma → Next.js)

---

## Overview

TuneTalk is a music social network built on Express + EJS + MySQL. This document defines a four-phase incremental modernization path that prioritizes security first, then replaces each layer of the stack without mixing concerns across phases.

### Goals
- Fix critical security vulnerabilities before any new development
- Learn JWT, Prisma, and Next.js in isolation, one phase at a time
- End with a production-quality Next.js + Prisma + JWT stack deployable on Vercel

### Non-goals
- Automated test suite (out of scope for this plan)
- Real-time features (WebSockets, live notifications)
- Mobile app

---

## Phase 1 — Security Fixes (Express + EJS + MySQL2)

**Goal:** Eliminate all critical vulnerabilities in the current codebase. No architectural changes.

### 1.1 SQL Injection
All models construct queries via template literals with user-supplied values interpolated directly. Every `db.query()` call must be migrated to parameterized queries using `mysql2`'s placeholder syntax:

```js
// Before
db.query(`SELECT * FROM usuario WHERE email = '${email}'`)

// After
db.query(`SELECT * FROM usuario WHERE email = ?`, [email])
```

`dbModel.js` must be updated to accept a `params` array as a second argument and pass it to `connection.execute()`.

### 1.2 Hardcoded Credentials
Three locations contain hardcoded secrets:
- `public/script/apiDeezer.js` — RapidAPI key
- `public/script/apiSpotify.js` — Spotify `client_id` and `client_secret`
- `index.js` — express-session `secret`

All must be moved to `.env`. The Spotify and Deezer credentials must additionally be moved server-side (see Phase 4 for full resolution; interim fix: proxy calls through an Express route).

### 1.3 Weak Password Hashing
Passwords are hashed with `md5`, which is broken for this purpose. Replace with `bcrypt` (10 salt rounds). Existing users will need to reset passwords or a migration strategy must be applied on next login.

### 1.4 `.gitignore`
Add `.env` and `uploads/` to `.gitignore`. Currently only `node_modules` is ignored.

### 1.5 Connection Per Query
`dbModel.js` opens and closes a new MySQL connection on every query. Replace with `mysql2` connection pool (`mysql.createPool()`), which reuses connections and handles concurrency correctly.

---

## Phase 2 — JWT Authentication (Express + EJS)

**Goal:** Replace `express-session` with stateless JWT. No changes to controllers or views.

### Token Strategy
- **Access token:** signed JWT, expires in 15 minutes, contains `{ id, nome, email }`
- **Refresh token:** signed JWT, expires in 7 days
- Both stored in `httpOnly; Secure; SameSite=Strict` cookies — never in `localStorage`

### New Dependencies
- `jsonwebtoken` — sign and verify tokens
- `cookie-parser` — parse cookies in Express

### Middleware
Replace the session-check middleware block in `index.js` with a `verifyToken` middleware:
1. Read `accessToken` cookie
2. If valid: attach decoded payload to `req.user`, call `next()`
3. If expired: attempt silent refresh via `refreshToken` cookie, issue new `accessToken`, continue
4. If invalid/missing: redirect to `/login` or return 401 for API routes

### Auth Routes
- `POST /login` — validate credentials, issue both tokens as cookies
- `GET /logout` — clear both cookies
- `POST /refresh` — validate refresh token, issue new access token

### Impact on Existing Code
`req.session.user` is replaced by `req.user` everywhere. Controllers and views reference this variable; a global search-and-replace covers this change. Session middleware is removed from `index.js`.

---

## Phase 3 — Prisma ORM (Express + EJS + JWT)

**Goal:** Replace raw MySQL2 queries with Prisma Client. No changes to Express routes, controllers, or views.

### Setup
```bash
npm install prisma @prisma/client
npx prisma init          # generates prisma/schema.prisma
npx prisma db pull       # introspects existing MySQL schema
npx prisma generate      # generates PrismaClient
```

### Prisma Client Singleton
Create `lib/prisma.js` exporting a single `PrismaClient` instance (prevents connection exhaustion in development with hot reload):

```js
const { PrismaClient } = require('@prisma/client')
const prisma = global.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma
module.exports = prisma
```

### Schema
Models map directly to existing tables: `Usuario`, `Post`, `Comentario`, `Curtir`, `Seguir`, `Notificacao`. Relations (e.g., `Post` belongs to `Usuario`, `Curtir` links `Post` and `Usuario`) are declared explicitly in the schema, enabling `include` queries that replace multi-step SQL joins.

### Model Rewrite
Each model file (`modelPost.js`, `modelUsuario.js`, `modelComentario.js`, `modelNotificacao.js`) is rewritten to use Prisma Client. The exported function signatures remain identical so controllers require no changes. The `Post` class can be replaced with plain exported functions — Prisma does not require class wrappers.

`dbModel.js` is deleted once all models are migrated.

### Migrations
All future schema changes go through `prisma migrate dev`, which generates versioned SQL migration files committed to git.

---

## Phase 4 — Next.js Migration (Next.js + Prisma + JWT)

**Goal:** Replace Express + EJS with Next.js App Router. Prisma and JWT carry over unchanged.

### Project Structure
```
app/
  (auth)/
    login/page.tsx
    cadastrar/page.tsx
  (app)/
    foryou/page.tsx
    seguindo/page.tsx
    perfil/[id]/page.tsx
    post/[id]/page.tsx
  api/
    auth/
      login/route.ts
      logout/route.ts
      refresh/route.ts
    posts/
      route.ts           # GET list, POST create
      [id]/route.ts      # GET, DELETE
      [id]/like/route.ts
      [id]/comments/route.ts
    users/
      [id]/route.ts
      [id]/follow/route.ts
    notifications/
      route.ts
      read/route.ts
middleware.ts            # JWT verification, replaces Express auth middleware
lib/
  prisma.ts
  auth.ts                # token helpers
```

### Server vs Client Components
- **Server Components** (default): profile page, post detail, feed — fetch data directly via Prisma, no client-side waterfall
- **Client Components** (`"use client"`): post creation modal (music search + form), like button, follow button, notification dropdown

### Auth Middleware
`middleware.ts` at the project root runs on every request matching `/(app)/*`. Reads the `accessToken` cookie, verifies it, and redirects to `/login` on failure. Mirrors the Express middleware from Phase 2.

### Music API Credentials
`apiDeezer.js` and `apiSpotify.js` are deleted. Music search moves to server-side API Routes (`app/api/music/search/route.ts`), which proxy requests to Deezer/Spotify. Credentials stay in `.env` and never reach the browser.

### Image Uploads
Multer is replaced by Next.js built-in form handling. Cloudinary upload logic moves to the `POST /api/users/[id]` route handler.

### Deployment
- Next.js app → Vercel (free tier sufficient)
- MySQL database → PlanetScale (free tier) or Railway

---

## Phase Summary

| Phase | Stack at end | Key change |
|-------|-------------|------------|
| 1 | Express + EJS + MySQL2 | Security: parameterized queries, bcrypt, env vars, pool |
| 2 | Express + EJS + JWT | Auth: stateless JWT replaces express-session |
| 3 | Express + EJS + Prisma | Data: Prisma replaces raw SQL, migrations added |
| 4 | Next.js + Prisma + JWT | Framework: Next.js replaces Express + EJS entirely |

Each phase is independently deployable and learnable. Phase N does not require starting Phase N+1.
