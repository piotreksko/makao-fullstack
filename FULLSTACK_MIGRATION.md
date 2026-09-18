# Makao Fullstack Migration Guide

Turning the existing React/Redux single-player-vs-AI Makao game into a fullstack app with rooms, real human opponents, an optional bot, and a modern backend (NestJS + Postgres + Redis) deployed to AWS. This doc is the implementation roadmap — work through the phases in order, each one is independently shippable.

## How we work together

This is a learning project first, a shipped app second. Default mode: **you write the application code, Claude explains and unblocks.**

- Claude proposes the next concrete step and explains the concept behind it (why this piece exists, what it does, how it fits the architecture) *before* any code gets written — not just "what" but "why this approach."
- You write the actual NestJS modules/controllers/entities yourself. Claude reviews what you wrote, explains bugs rather than silently fixing them, and answers "why doesn't this work" questions.
- Claude handles pure setup/infrastructure chores that aren't the learning target — installing packages, editing `docker-compose.yml`, scaffolding folders — but narrates what each piece does and why it's needed, since even boilerplate is part of learning the stack.
- If Claude does touch application logic (a Nest module, an entity, a gateway handler, etc.), it explains the reasoning inline as it goes, the same way it would if you'd asked "explain this as you do it" — not a silent diff.
- Ask any time for "just do it" on a specific step if you want to move fast — this default applies unless you say otherwise for that step.

## Goals

- Learn NestJS, Postgres, Redis, WebSockets, and AWS by extending a project you already know inside out
- Move from "AI opponent baked into client Redux" to "server-authoritative game engine" so real players can't cheat
- Add a kurnik.pl-style lobby: create/join rooms, play vs human or vs bot
- Deploy the whole thing to AWS with a real CI/CD pipeline

## Target architecture

```
┌─────────────┐        HTTPS/WSS        ┌──────────────────────┐
│   React SPA │ ───────────────────────▶│   NestJS API/Gateway │
│  (S3+CDN)   │◀─────────────────────── │   (ECS Fargate)      │
└─────────────┘                         └──────────┬───────────┘
                                                     │
                              ┌──────────────────────┼──────────────────────┐
                              ▼                      ▼                      ▼
                       ┌─────────────┐        ┌─────────────┐       ┌─────────────┐
                       │  Postgres   │        │    Redis    │       │  Socket.io  │
                       │    (RDS)    │        │(ElastiCache)│       │Redis Adapter│
                       │  durable    │        │ hot game    │       │(cross-pod   │
                       │  records    │        │ state, pub/ │       │ broadcast)  │
                       └─────────────┘        │ sub, lobby  │       └─────────────┘
                                               └─────────────┘
```

- **Postgres** = source of truth for users, finished games, stats
- **Redis** = hot path during an active game (current hand/turn/discard pile), lobby presence, and the Socket.io adapter so WebSocket events reach clients regardless of which backend pod they're connected to
- **NestJS** = REST for auth/lobby/stats, WebSocket Gateway for in-room gameplay, and now owns the actual Makao rules engine (ported out of the client)

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| API framework | NestJS (Node/TypeScript) | modules, DI, guards, gateways |
| DB | PostgreSQL | via TypeORM or Prisma (pick one; examples below use TypeORM) |
| Cache/pubsub | Redis | ElastiCache in AWS, local via Docker |
| Realtime | Socket.io (`@nestjs/platform-socket.io`) + `@socket.io/redis-adapter` | |
| Auth | JWT via `@nestjs/jwt` + Passport | |
| Frontend | existing React/Redux app | swap Firebase calls for REST/WS |
| Infra | Docker, AWS RDS, ElastiCache, ECS Fargate, S3+CloudFront, ECR | |
| CI/CD | GitHub Actions | |

## Suggested repo layout

Keep the existing React app where it is; add a `server/` directory for the NestJS app (or split into a separate repo later — a monorepo is simplest to start).

```
Makao-React-Redux/
├── src/                # existing React/Redux frontend
├── server/             # new NestJS backend
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── stats/
│   │   ├── rooms/
│   │   ├── game-engine/
│   │   ├── bot/
│   │   └── main.ts
│   ├── docker-compose.yml
│   └── package.json
└── FULLSTACK_MIGRATION.md
```

---

## Phase 0 — Local dev environment

Get Postgres + Redis + NestJS running locally before writing any features.

`server/docker-compose.yml`:

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: makao
      POSTGRES_PASSWORD: makao
      POSTGRES_DB: makao
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes:
  pgdata:
```

- `nest new server` to scaffold the app
- `@nestjs/typeorm`, `pg`, `@nestjs/config`, `ioredis` as first dependencies
- `.env` for `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`

**Checklist**
- [ ] `docker-compose up` brings up Postgres + Redis
- [ ] NestJS app boots and connects to both
- [ ] `/health` endpoint returns 200

---

## Phase 1 — Stats API (replace Firebase RTDB)

Lowest-risk first cut: no auth yet, just swap where global stats live.

- `StatsModule` with a `GameStats` entity (`totalMoves`, `totalMacaoCalls`, `totalPlayerWins`, `totalComputerWins`)
- `POST /stats/increment`, `GET /stats` endpoints
- In the React app, replace the `react-redux-firebase` calls in your stats actions/reducers with plain `fetch`/`axios` calls to the new API
- Firebase Hosting/RTDB can stay live in parallel until you're ready to cut over — no need to break the deployed demo while building

**Checklist**
- [ ] Postgres table + migration for stats
- [ ] Frontend reads/writes stats via REST instead of Firebase
- [ ] Old Firebase RTDB code removed once verified

---

## Phase 2 — Auth (users)

- `users` table: `id`, `email`, `password_hash`, `display_name`, `created_at`
- `AuthModule`: `POST /auth/register`, `POST /auth/login` → JWT
- `JwtStrategy` + `AuthGuard` to protect routes
- Frontend: login/register forms, store JWT (httpOnly cookie preferred over localStorage), attach to API calls
- Personal stats (per-user win rate) become possible once games are tied to a `user_id`

**Checklist**
- [ ] Register/login working end to end
- [ ] Protected route returns 401 without valid JWT
- [ ] Frontend persists session across refresh

---

## Phase 3 — Rooms & lobby (the kurnik.pl part)

This is the core new feature. A room is a table that's either waiting, in progress, or finished.

**Postgres schema**

```sql
CREATE TYPE room_status AS ENUM ('waiting', 'in_progress', 'finished');
CREATE TYPE room_visibility AS ENUM ('public', 'private');

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code VARCHAR(8) UNIQUE,          -- for private rooms
  visibility room_visibility NOT NULL DEFAULT 'public',
  status room_status NOT NULL DEFAULT 'waiting',
  created_by UUID REFERENCES users(id),
  vs_bot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE room_players (
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),      -- NULL if the "player" is the bot
  is_bot BOOLEAN NOT NULL DEFAULT false,
  seat SMALLINT NOT NULL,                 -- 0 or 1 for 1v1
  PRIMARY KEY (room_id, seat)
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  winner_user_id UUID REFERENCES users(id),
  total_moves INT,
  macao_calls INT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  move_log JSONB                          -- full move history for replay
);
```

**REST endpoints** (lobby management — doesn't need to be real-time)
- `GET /rooms` — list public waiting rooms
- `POST /rooms` — create room (`{ visibility, vsBot }`) → returns room id / invite code
- `POST /rooms/:id/join`
- `POST /rooms/:id/leave`

**WebSocket namespace** (`/game`) — everything once you're seated at a table:

| Event (client→server) | Payload | Event (server→client) | Payload |
|---|---|---|---|
| `room:join` | `{ roomId }` | `room:state` | full room + game state snapshot |
| `game:playCard` | `{ card(s) }` | `game:update` | new state after move |
| `game:drawCard` | `{}` | `game:opponentAction` | for UI feedback |
| `game:sayMacao` | `{}` | `game:finished` | `{ winnerId }` |
| — | — | `room:playerJoined` / `room:playerLeft` | |

**Bot player**: when `vs_bot = true`, the second seat has no `user_id`. When it's the bot's turn, the `RoomsGateway` calls `BotModule.decideMove(gameState)` synchronously (server-side) instead of waiting on a socket event — port your existing AI logic from `src/utility` almost directly, it was already a pure function of game state.

**Checklist**
- [ ] Create room, appears in public list
- [ ] Second player (or bot) joins, game starts
- [ ] Private room via invite code works
- [ ] Bot makes moves on its turn with realistic delay (setTimeout, so it doesn't feel instant/robotic)

---

## Phase 4 — Server-authoritative game engine

The biggest single chunk of work. Move the Makao rules (turn validation, action cards — 2s/3s/4s/Jacks/Kings/Aces, "Macao!" call enforcement) from client-side Redux reducers into a NestJS service.

- `GameEngineModule`: pure functions — `canPlayCard(state, card)`, `applyMove(state, move)`, `checkWinner(state)` — ported from your existing reducer logic in `src/reducers`
- The Gateway calls the engine to validate every incoming move before broadcasting the result; if invalid, reject and don't mutate state
- Client Redux becomes a *view* of server state, not the source of truth — it still renders the same UI, just driven by `game:update` events instead of local dispatches
- This is the part that actually prevents cheating once it's real opponents, not just an AI you trust

**Checklist**
- [ ] All action-card rules re-implemented and unit tested server-side (you already have "Action tests" from a past commit — port those)
- [ ] Client can no longer force an illegal move (test by tampering with a dev-tools request)
- [ ] Full game playable end-to-end through the engine with two real browser tabs

---

## Phase 5 — Redis: hot state + WebSocket scaling

Two distinct uses, don't conflate them:

1. **Socket.io Redis adapter** — required the moment you run more than one NestJS instance. Without it, a message emitted from pod A never reaches a client on pod B.
   ```ts
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'redis';
   const pubClient = createClient({ url: process.env.REDIS_URL });
   const subClient = pubClient.duplicate();
   await Promise.all([pubClient.connect(), subClient.connect()]);
   app.useWebSocketAdapter(new RedisIoAdapter(app, pubClient, subClient));
   ```
2. **Hot game state cache** — while a game is in progress, keep the live state (`hand`, `discardPile`, `turn`, `deck`) in Redis under `game:{roomId}`, not Postgres. Write to Postgres only on room creation and on game finish (plus optional periodic snapshot for crash recovery). Avoids a DB round-trip on every single card play.
3. **Lobby presence / room list** — `SET room:{id}:status` + a Redis set of public waiting room ids, so `GET /rooms` doesn't hit Postgres on every poll.

**Checklist**
- [ ] Two backend instances locally (different ports), same Redis → confirm cross-instance broadcast works
- [ ] Live game reads/writes go to Redis, not Postgres, during play
- [ ] Game finish flushes final state + move log to Postgres, clears Redis key

---

## Phase 6 — AWS deployment

| Piece | Service |
|---|---|
| Postgres | RDS (Postgres 16, single-AZ to start) |
| Redis | ElastiCache for Redis |
| NestJS API | Docker image → ECR → ECS Fargate (start with 1 task, prove Redis adapter before scaling to 2+) |
| Frontend | S3 bucket + CloudFront (direct replacement for Firebase Hosting) |
| Secrets | SSM Parameter Store or Secrets Manager (`DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`) |
| Networking | All of RDS/ElastiCache/ECS in the same VPC, private subnets for DB/cache, ALB in public subnet in front of ECS |

**CI/CD (GitHub Actions)**
- On push to `main`: build/test backend → build Docker image → push to ECR → update ECS service
- Separate job: build React app → sync to S3 → invalidate CloudFront cache

**Checklist**
- [ ] `Dockerfile` for `server/` builds and runs locally
- [ ] RDS + ElastiCache reachable from ECS task (security groups configured)
- [ ] GitHub Actions deploys on merge to `main`
- [ ] Frontend on CloudFront talks to API over HTTPS (ALB with ACM cert)

---

## Stretch goals (after the above works end-to-end)

- Leaderboards (Postgres aggregate query, cached in Redis with a short TTL)
- "Quick match" matchmaking queue (Redis list/sorted set instead of manually picking a room)
- Reconnect handling (player refreshes mid-game — restore from Redis hot state)
- Spectator mode (join a room's WebSocket namespace read-only)
- Swap hand-rolled JWT for Cognito if you want to learn that AWS service too

---

## Milestone order recap

1. Stats API on NestJS+Postgres, Firebase RTDB retired
2. Auth (register/login/JWT)
3. Rooms + lobby REST endpoints, no realtime yet (poll for testing)
4. WebSocket gateway wired up, human-vs-human works with client still trusting itself
5. Game engine moved server-side, moves validated server-side
6. Bot ported into `BotModule`, playable as a room opponent
7. Redis: Socket.io adapter + hot game state
8. Deploy to AWS, CI/CD pipeline live
