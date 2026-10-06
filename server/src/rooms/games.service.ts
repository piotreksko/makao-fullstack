import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject, Subscription } from 'rxjs';
import {
  botMove,
  buildGameView,
  createGame,
  drawCard,
  keepDrawnCard,
  playCards,
  waitTurns,
  type Card,
  type GameEvent,
  type GameView,
  type Outcome,
  type PlayChoice,
  type Rng,
} from '../game-engine/index.js';
import { RoomEvents } from './room-events.service.js';
import { GameResults } from './game-results.service.js';
import { GameStore, type LoadedGame, type StoredGame } from './game-store.js';
import { RoomsService } from './rooms.service.js';

export const GAME_RNG = Symbol('GAME_RNG');

const DEFAULT_BOT_DELAY_MS = 900;
// How often a move is retried when another instance changed the game first
const MAX_ATTEMPTS = 5;

// Sent whenever a game changes: each human gets their own view of the game,
// and everyone in the room gets the (public) events that just happened
export interface GameUpdate {
  roomId: string;
  events: GameEvent[];
  views: { userId: string; view: GameView }[];
}

const seatOf = (game: StoredGame, userId: string): number | undefined =>
  game.seats.find((s) => s.userId === userId)?.seat;

const isBotTurn = (game: StoredGame): boolean =>
  game.state.status === 'playing' &&
  game.seats.find((s) => s.seat === game.state.currentSeat)?.userId === null;

// Runs the games that are in progress. The rules live in the game engine;
// this only loads and saves each room's state, works out which seat a user
// plays, and lets bots take their turns.
//
// Games are kept in Redis, so any backend instance can serve any room.
@Injectable()
export class GamesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GamesService.name);
  // Bot timers are local to this instance; the version check keeps duplicates harmless
  private readonly botTimers = new Map<string, NodeJS.Timeout>();
  private readonly updates = new Subject<GameUpdate>();
  private readonly botDelayMs: number;
  private subscription?: Subscription;

  readonly updates$: Observable<GameUpdate> = this.updates.asObservable();

  constructor(
    private readonly rooms: RoomsService,
    private readonly roomEvents: RoomEvents,
    private readonly store: GameStore,
    private readonly results: GameResults,
    config: ConfigService,
    @Inject(GAME_RNG) private readonly rng: Rng,
  ) {
    this.botDelayMs = Number(config.get('BOT_DELAY_MS', DEFAULT_BOT_DELAY_MS));
  }

  async onModuleInit(): Promise<void> {
    // A player who leaves mid-game hands their seat to a bot (ADR 0007)
    this.subscription = this.roomEvents.events$.subscribe((event) => {
      if (event.type !== 'playerLeft') return;
      this.seatBecomesBot(event.roomId, event.userId).catch((err: unknown) =>
        this.logger.error(`Could not seat a bot in room ${event.roomId}`, err),
      );
    });

    // Games outlive a restart in Redis. A room still marked in progress with
    // no game left behind lost it, so it is finished; otherwise its bot
    // turn, which died with the old process, is scheduled again
    for (const roomId of await this.rooms.inProgressRoomIds()) {
      const loaded = await this.store.load(roomId);
      if (loaded) {
        this.scheduleBot(roomId, loaded.game);
      } else {
        await this.rooms.markFinished(roomId);
      }
    }
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
    this.botTimers.forEach((timer) => clearTimeout(timer));
    this.botTimers.clear();
  }

  async create(
    roomId: string,
    players: { seat: number; userId: string | null }[],
  ): Promise<void> {
    const game: StoredGame = {
      version: 0,
      state: createGame(
        players.map((p) => p.seat),
        this.rng,
      ),
      seats: players.map((p) => ({ seat: p.seat, userId: p.userId })),
    };
    if (!(await this.store.create(roomId, game))) {
      throw new ConflictException('A game is already running in this room');
    }
    this.publish(roomId, game, []);
    this.scheduleBot(roomId, game);
  }

  // The game as this user may see it, or null if they are not in a game
  async getView(userId: string, roomId: string): Promise<GameView | null> {
    const loaded = await this.store.load(roomId);
    if (!loaded) return null;
    const seat = seatOf(loaded.game, userId);
    return seat === undefined ? null : buildGameView(loaded.game.state, seat);
  }

  play(
    userId: string,
    roomId: string,
    cards: readonly Card[],
    choice: PlayChoice,
  ): Promise<void> {
    return this.act(userId, roomId, (state, seat) =>
      playCards(state, seat, cards, choice),
    );
  }

  draw(userId: string, roomId: string): Promise<void> {
    return this.act(userId, roomId, (state, seat) =>
      drawCard(state, seat, this.rng),
    );
  }

  keepDrawnCard(userId: string, roomId: string): Promise<void> {
    return this.act(userId, roomId, (state, seat) =>
      keepDrawnCard(state, seat, this.rng),
    );
  }

  wait(userId: string, roomId: string): Promise<void> {
    return this.act(userId, roomId, (state, seat) =>
      waitTurns(state, seat),
    );
  }

  private async act(
    userId: string,
    roomId: string,
    action: (state: StoredGame['state'], seat: number) => Outcome,
  ): Promise<void> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const loaded = await this.store.load(roomId);
      if (!loaded) {
        throw new ConflictException('No game is running in this room');
      }
      const seat = seatOf(loaded.game, userId);
      if (seat === undefined) {
        throw new NotFoundException('You are not playing in this game');
      }
      // The engine rejects illegal moves by throwing, before anything is written
      const outcome = action(loaded.game.state, seat);
      if (await this.commit(roomId, loaded, outcome)) return;
    }
    throw new ConflictException(
      'The game changed while your move was being made; try again',
    );
  }

  // Saves the outcome only if the game is still what was loaded, then tells
  // everyone. Returns false when another instance got there first.
  private async commit(
    roomId: string,
    loaded: LoadedGame,
    outcome: Outcome,
  ): Promise<boolean> {
    const next: StoredGame = {
      version: loaded.game.version + 1,
      state: outcome.state,
      seats: loaded.game.seats,
    };
    if (!(await this.store.replace(roomId, loaded, next))) return false;

    this.publish(roomId, next, outcome.events);
    if (next.state.status === 'finished') {
      const userIdsByPlace = next.state.ranking.map(
        (seat) => next.seats.find((s) => s.seat === seat)?.userId ?? null,
      );
      await this.results.record(roomId, userIdsByPlace).catch((err: unknown) => {
        this.logger.error(`Could not record the result of room ${roomId}`, err);
      });
      await this.store.delete(roomId);
      this.clearBot(roomId);
      await this.rooms.markFinished(roomId).catch((err: unknown) => {
        this.logger.error(`Could not mark room ${roomId} as finished`, err);
      });
      return true;
    }
    this.scheduleBot(roomId, next);
    return true;
  }

  private publish(roomId: string, game: StoredGame, events: GameEvent[]): void {
    const views = game.seats.flatMap(({ seat, userId }) =>
      userId ? [{ userId, view: buildGameView(game.state, seat) }] : [],
    );
    this.updates.next({ roomId, events, views });
  }

  // A seat that a player has left becomes a bot. Retried like any other change.
  private async seatBecomesBot(roomId: string, userId: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const loaded = await this.store.load(roomId);
      if (!loaded) return;
      const seat = seatOf(loaded.game, userId);
      if (seat === undefined) return;

      const next: StoredGame = {
        version: loaded.game.version + 1,
        state: loaded.game.state,
        seats: loaded.game.seats.map((s) =>
          s.seat === seat ? { seat, userId: null } : s,
        ),
      };
      if (!(await this.store.replace(roomId, loaded, next))) continue;

      if (next.seats.every((s) => s.userId === null)) {
        await this.store.delete(roomId);
        this.clearBot(roomId);
      } else {
        this.scheduleBot(roomId, next);
      }
      return;
    }
  }

  // If it is a bot's turn, plays it after a short pause so it does not feel
  // instant. Only one pending move per room on this instance.
  private scheduleBot(roomId: string, game: StoredGame): void {
    this.clearBot(roomId);
    if (!isBotTurn(game)) return;

    const timer = setTimeout(() => {
      this.botTimers.delete(roomId);
      this.runBot(roomId, game.version).catch((err: unknown) =>
        this.logger.error(`Bot move failed in room ${roomId}`, err),
      );
    }, this.botDelayMs);
    timer.unref();
    this.botTimers.set(roomId, timer);
  }

  private async runBot(roomId: string, expectedVersion: number): Promise<void> {
    const loaded = await this.store.load(roomId);
    // Skip if the game moved on: another instance already played this turn
    if (
      !loaded ||
      loaded.game.version !== expectedVersion ||
      !isBotTurn(loaded.game)
    ) {
      return;
    }
    await this.commit(roomId, loaded, botMove(loaded.game.state, this.rng));
  }

  private clearBot(roomId: string): void {
    clearTimeout(this.botTimers.get(roomId));
    this.botTimers.delete(roomId);
  }
}
