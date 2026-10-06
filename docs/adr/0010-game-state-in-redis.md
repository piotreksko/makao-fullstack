# 0010. Live game state in Redis, moves applied with optimistic concurrency

Status: Accepted (implemented in `server/src/rooms/game-store.ts` and `games.service.ts`)
Date: 2026-10-06

## Context

`GamesService` keeps each running game in a `Map` in the process's memory (ADR 0009). With one backend instance that works. With several, a player's socket can land on an instance that has no session for their room, so `game:playCards` fails with "No game is running in this room". The Redis adapter (Phase 5, step 1) makes broadcasts reach every instance, but it does not move the game itself.

The engine state (`GameState`) is plain data: no `Map`, `Set`, or `Date` fields, so it can be stored as JSON.

## Decision

- **Store each running game as JSON under `game:{roomId}` in Redis.** Any instance can read it, and any instance can apply a move. Sticky routing per room was rejected: ALB stickiness works per connection, not per room, and REST calls would still have to find the same instance.
- **Add a `version` number to the stored game.** Every change reads the game, runs the engine, and writes back only if the stored text is still what was read. The write is a small Lua script (`COMPARE_AND_SET` in `game-store.ts`), which Redis runs atomically. If the write fails, re-read and try again, up to five attempts. The engine is pure, so re-running a move on fresh state is safe. If every attempt fails, the move is rejected with a conflict error.
  - Deviation from the first draft: `WATCH` / `MULTI` was replaced by the Lua script. `WATCH` is tied to one Redis connection, and the shared client serves many requests at once, so another request's commands could land inside someone else's transaction.
- **Bot turns need no leader.** After any change, each instance may schedule a bot timer that records the version it expects. When the timer fires, it only acts if the stored version still matches. If two instances schedule the same bot move, the second one fails its version check and does nothing.
- **Finishing a game** saves its result to Postgres, then marks the room finished and deletes `game:{roomId}`. The result is a `games` row plus one `game_players` row per place (`gameId`, `place`, `userId`; a null user is a bot or a seat a bot took over). No move log or move counter is kept. Per-user stats and any rating system (Elo, for games with only human seats) can be computed from these rows later. If saving fails, the error is logged and the game still closes.
- **Game keys expire** 10 minutes after the last move (`GAME_TTL_SECONDS` in `game-store.ts`), so an abandoned game does not stay in Redis forever.
- **Publishing** stays as it is: the instance that applied a change calls `updates$`, and the Socket.io Redis adapter delivers the events to sockets on every instance.

## Consequences

- Games survive a backend restart, as long as Redis keeps its data. The old startup cleanup in `RoomsService` was removed. In its place, `GamesService.onModuleInit` finishes any in-progress room whose game is missing from Redis (for example after a Redis wipe), and reschedules bot turns for the rest.
- Every move is now a Redis round trip plus a `WATCH` transaction. That is acceptable at this scale, and it is the cost ADR 0009 expected to pay in Phase 5.
- The engine's RNG is still seeded per instance, which is fine. Shuffles and draws happen inside one move and are stored with the result.
- Redis must keep data across restarts. ElastiCache does, in Phase 6. A local Redis without persistence will lose games on restart.
- Bot timers are per-instance state. A restart cancels pending bot moves, so the instance that loads a stored game with a bot to move must reschedule its bot turn on load.

## Alternatives considered

- **Sticky routing per room**: rejected above.
- **One leader instance runs all bot timers**: needs leader election and a failover path. The version check makes duplicate timers harmless without that.
- **Redis Lua script for each move**: would also work, but the engine is TypeScript, so the script would have to duplicate the rules or receive them as data. `WATCH` keeps the rules in one place.
