# 0007. Socket.IO gateway for real-time room events

Status: Accepted
Date: 2026-09-21

## Context

Lobby management is REST (ADR 0006), but once seated, players need live updates: someone joins or leaves, readiness changes, the host starts the game, chat. The migration plan calls for a `/game` namespace.

## Decision

- **Socket.IO** through `@nestjs/websockets` + `@nestjs/platform-socket.io`, one namespace: `/game` (`GameGateway`).
- **Authentication in the handshake:** the client connects with `auth: { token: <JWT> }`. A namespace middleware verifies the token and loads the user (a token for a deleted user is refused); failure is a `connect_error` with message `unauthorized`. No cookies are involved, so this matches ADR 0004.
- **One room per socket.** `room:join { roomId }` puts the socket in the Socket.IO channel `room:<id>`, but only if the user has a seat (membership comes from the database, never from the client). Every socket also joins `user:<id>` so the server can reach all of a user's tabs.
- **Client to server** events reply through the acknowledgement callback: `{ ok: true, room? }` or `{ ok: false, error: { status, message } }`, reusing HTTP status codes. Events: `room:join`, `room:toggleReady`, `game:start`, `room:sendMessage { text }`. Payloads are validated with class-validator (unknown fields rejected) and `text` is trimmed and limited to 500 characters.
- **Server to client** events: `room:state` (full snapshot, the source of truth), plus hints `room:playerJoined`, `room:playerLeft`, `room:playerReady`, `room:message`, `room:left` (sent to the leaver) and `game:started`.
- **Rules live in `RoomsService`, not the gateway.** Ready and start are service methods, so any transport enforces the same rules. Starting requires: the caller is the host (403 otherwise), the room is waiting, at least two seats are filled, and every non-bot seat is ready (bots always are). The status change is a conditional update, so two start requests cannot both win.
- **REST changes reach sockets through an event bus.** `RoomsService` emits `RoomEvent`s on a small RxJS subject (`RoomEvents`); the gateway subscribes and broadcasts. This avoids a circular dependency between the service and the gateway, and means a join made over REST is heard by players already connected.
- A user who leaves a room has their sockets removed from its channel immediately, and message sending re-checks membership on every message.
- **Leaving a game in progress hands the seat to a bot.** Leaving is allowed in any non-finished state (it was waiting-only in ADR 0006), so nobody can get stuck. While the room is `waiting` the seat is simply freed; once it is `in_progress` the seat row is kept and converted to a bot (`isBot = true`, no user), so the leaver's hand and the turn order survive and the engine plays the hand for the bot. The leaver is free to join or create another room, and cannot return to that seat. If the last human leaves, the game is abandoned and the room deleted. Alternatives rejected: returning the hand to the deck (disturbs pending effects like a battle or demanded card) and forfeiting (ends the game for everyone in 3-4 player rooms).
- Socket.IO does its own CORS handling, so `main.ts` installs `CorsIoAdapter` using the same `CORS_ORIGIN` as the REST API.

## Alternatives considered

- **Raw `ws` (`@nestjs/platform-ws`):** lighter, but namespaces, channels, acknowledgements and reconnection would all be hand-built.
- **Making everything WebSocket, including lobby actions:** REST is simpler to test and cache for list/create; sockets are only needed for live updates.
- **Trusting the client's room id for chat/ready:** rejected; membership is checked server-side every time.

## Consequences

- Every mutation goes through the service, so its rules hold whether it arrives over REST or a socket.
- Broadcast snapshots include the invite code because every recipient is a member.
- There is no presence tracking yet: a player whose socket drops keeps their seat (no bot takeover on disconnect, so a page refresh never costs anyone their hand). A disconnect grace period followed by takeover, and turn timeouts, belong with the Phase 4 engine.
- There is no rate limiting on chat or events yet.
- Starting reads the players and then updates the room; a player who joins in that gap could slip in unready. A row lock would close it if it matters.
- Chat is not persisted; messages exist only while delivered.
- The Socket.IO adapter in `main.ts` is not covered by the e2e tests (they build the app without it); it was checked by hand against the built server.
