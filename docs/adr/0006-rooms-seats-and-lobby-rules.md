# 0006. Rooms: seats, invite codes and lobby rules

Status: Accepted
Date: 2026-09-21

## Context

Phase 3 adds rooms (a table two players sit at). Lobby management is REST; real-time play comes later over WebSockets. Several rules had to be decided so the REST layer is safe under concurrent requests.

## Decision

- **Seats are rows in `room_players` with primary key `(roomId, seat)`.** The database, not application code, decides who gets the last seat: two simultaneous joins both try to insert seat 1, one insert violates the key and is turned into a 409. A `(roomId, userId)` unique constraint stops one user sitting twice.
- **A room has 2 to 4 seats** (`maxPlayers`, enforced by a CHECK constraint). Seat numbers run `0..maxPlayers-1`.
- **A bot is a seated row** with `isBot = true`, no `userId` and `isReady = true`. Any seat except the host's can be a bot, so a 4-player room holds at most 3 bots. The host can seat bots at creation (`bots`) and add or remove them while the room is waiting (`POST /rooms/:id/bots`, `DELETE /rooms/:id/bots/:seat`); only the host may. A room is full when its seats (humans and bots) reach `maxPlayers`.
- **One active room per user.** Creating or joining while seated in a room whose status is not `finished` returns 409.
- **Private rooms** get an 8-character invite code from an alphabet without look-alike characters (`0/O`, `1/I`), generated with `crypto.randomInt`. Joining a private room needs the code (`POST /rooms/:id/join` with `inviteCode`, or `POST /rooms/join-by-code`). Codes are compared case-insensitively.
- **Private rooms are invisible to non-members:** `GET /rooms/:id` returns 404 (not 403) so room ids can't be probed. The invite code is only included in responses to members.
- **Leaving:** a guest leaving frees the seat; if the host leaves, the host role passes to the remaining human; when the last human leaves the room is deleted (seats cascade). Leaving was first limited to `waiting` rooms, but ADR 0007 allows it in any non-finished state so nobody can get stuck.
- **Leaving with bots:** bots stay while at least one human remains; the room is deleted (bots cascade) when the last human leaves.
- `GET /rooms` lists only public, waiting rooms that still have a free seat, including rooms that already contain bots.
- The `games` table from the migration plan is deferred to Phase 4, when something writes to it.

## Consequences

- Concurrency safety comes from database constraints, which the e2e tests exercise (two parallel joins for the last seat).
- A user firing two `POST /rooms` requests at the same instant could pass the "already in a room" check twice and create two rooms; a partial unique index would close this if it matters.
- Phase 4 must define what leaving means for a game in progress (forfeit, replace with a bot, abandon), since leaving is allowed at any time.
- Live updates, ready/start and chat are covered in ADR 0007.
