# 0008. Server-side game engine: pure functions, N players

Status: Accepted (engine done; wiring to the gateway, bots and client are next)
Date: 2026-09-26

## Context

The Makao rules lived in the client's Redux code (`logicActions.js`, `Player.jsx`) and were hard-wired for one human against one CPU. For rooms with 2 to 4 players and real opponents, the server must own the rules, otherwise a client could play any card it likes. The old "action tests" only checked that Redux actions dispatch, so there were no rule tests to port.

## Decision

- **A pure TypeScript module, `server/src/game-engine/`**, with no Nest, database or socket code. Every action takes a `GameState` and returns a new state plus a list of events; the input is never mutated. Randomness is injected (`Rng`), so games are reproducible in tests. The state is plain JSON, so it can be stored (Redis, Phase 5) or sent as-is.
- **Actions:** `createGame`, `playCards`, `drawCard`, `keepDrawnCard`, `waitTurns`, plus `getLegalCards`. Illegal moves throw `IllegalMoveError` with a machine-readable `code`; the gateway will map it to an acknowledgement error.
- **Players are identified by room seat**, so the engine plugs into the rooms from ADR 0006. Seats need not be contiguous; turn order is ascending seat.
- **Naming:** the client's confusing `type` / `weight` are `rank` / `suit` on the server; the client will map them when it is connected.
- **Decided with the project owner:**
  - **Jack demand lasts one full round:** it ends when the turn returns to the seat of the player who played the Jack, even if that player has finished. Works the same for 2, 3 or 4 players.
  - **Drawing keeps the "check" mechanic:** you draw one card first; if it can be played you may play it (this is how a drawn battle card passes a penalty on) or keep it, in which case the rest of the penalty is drawn. If it cannot be played the turn ends automatically.
  - **Macao stays automatic:** the engine emits a `macao` event when a player is left with one card. An explicit `game:sayMacao` call with a penalty for forgetting is deferred.
  - **Games play on for ranking:** the first player out is the winner; the game continues until one player remains, who takes last place. `ranking` lists seats in finishing order.
- **Rules as implemented** (taken from the client, with its bugs not copied):
  - A card is playable if it matches the top card's rank or suit; several cards of one rank can be played together (the first must be legal, the last ends on top).
  - Battle cards: 2 (+2), 3 (+3), K♥ and K♠ (+5). A battle is answered by the same rank, or by a 2 or 3 of the same suit. K♣ and K♦, being kings, can answer a battle king and cancel the penalty.
  - A 4 makes the next player wait; 4s stack, and whoever cannot answer waits out all of them (`waitTurns`).
  - Jack demands a rank (5 to 10 or Q) or nothing; Ace chooses a suit. A player playing their last card needs to choose nothing.
  - Drawing is allowed on any turn except while a wait is pending.
  - When the deck runs short the pile (minus its top card) is reshuffled; cards still in the deck are drawn first.
- **Client bugs deliberately not ported:** `nobodyIsWaiting()` returned a function (always truthy), and the branch letting K♣/K♦ answer a battle king compared an object to a string (dead code; the rank-equality rule already covers it).

## Consequences

- The rules can be tested completely on their own: 136 unit tests, including a fuzz test that plays 360 random full games and checks after every move that exactly 52 unique cards exist and the turn is always with a player still in the game. Deliberately breaking the engine made those tests fail.
- The state contains every hand, so the gateway must send each player a filtered view (their own hand, only the card counts of others); that view builder is not written yet.
- Bots are not implemented. The bot logic in the client (weighted random choices) is separate work and will call the same engine, so a bot can never make an illegal move. Seats converted to bots when a player leaves (ADR 0007) rely on this.
- A single Jack or Ace choice covers a whole multi-card play, and the last card played decides the top of the pile.
- Turn timers and disconnect handling are not part of the engine; they belong to the gateway.
