# 0009. Playing games over sockets: sessions, private views and bots

Status: Accepted
Date: 2026-09-26

## Context

The rules engine (ADR 0008) is pure code. To play, it has to be connected to the rooms and the `/game` socket (ADR 0007): something must hold each running game, work out which seat a user plays, hide other players' cards, and move bots.

## Decision

- **`GamesService` holds one session per room, in memory:** the engine's `GameState` plus a map from seat to user (`null` = bot). It contains no rules; every move goes through the engine, which rejects illegal ones by throwing before anything changes. A server restart ends running games; hot state moves to Redis in Phase 5.
- **Starting:** `game:start` first runs the room's own checks (host, all ready, at least two seats), then deals the game.
- **Each player gets only their own view.** After every change `GamesService` publishes a `GameUpdate`; the gateway sends each human `game:state` (their hand and legal cards, but only card *counts* for everyone else, the deck only as a count, the pile only near the top) to their private `user:<id>` channel. What just happened goes to the whole room as `game:events`; those are public by construction (a draw reports how many cards, never which). The card just drawn is visible only to the player who drew it.
- **Client to server** (all reply through the acknowledgement): `game:playCards { cards, suit?, demand? }`, `game:drawCard`, `game:keepCard`, `game:wait`. Payload shape is validated like other socket messages (known ranks and suits, 1 to 4 cards, no extra fields); whether the move is *allowed* is the engine's decision. A rejected move is `{ ok: false, error: { status, code, message } }` with the engine's machine-readable `code` (for example `NOT_YOUR_TURN`); malformed moves are 400, moves that conflict with the game state are 409.
- **Reconnecting:** `room:join` also returns the player's current `game` view (or `null`), so a page refresh can resume.
- **Bots are placeholders:** a simple engine function that plays a legal card when it can, draws otherwise, and picks an ace suit or jack demand from what its hand holds most of. It only ever uses the engine's legal moves, so it cannot cheat. A bot moves after a short pause (`BOT_DELAY_MS`, default 900 ms), one pending move per room.
- **A player who leaves mid-game** keeps their seat as a bot (ADR 0007): `GamesService` listens for `playerLeft` and re-seats it; if no humans remain the session is dropped.
- **When the game ends,** the room is marked `finished` (freeing everyone to join or create another room) and the session is discarded after the final views are sent.
- **Randomness is injected** (`GAME_RNG`), so end-to-end tests deal reproducible games.

## Consequences

- Cheating by tampering with messages is impossible by construction: the client only ever asks, and the server decides. The e2e tests send out-of-turn, foreign and malformed moves and check that nothing changes.
- Privacy is tested at two levels: the view builder never contains another player's cards, and over real sockets neither player's message mentions the other's hand.
- Memory-only sessions mean a restart loses games in progress, and running more than one server instance would split a game's players. Both go away when the state lives in Redis (Phase 5).
- Nothing is persisted about finished games yet (no `games` row, no move log, no stats). That is the next step for per-user statistics.
- There are no turn timers and no disconnect handling: a player who closes the tab keeps their seat until they leave, and the game waits for them.
- The bot is intentionally weak; the client's weighted AI could later replace `botMove` without touching the wiring.
