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
  type GameState,
  type GameView,
  type Outcome,
  type PlayChoice,
  type Rng,
} from '../game-engine/index.js';
import { RoomEvents } from './room-events.service.js';
import { RoomsService } from './rooms.service.js';

export const GAME_RNG = Symbol('GAME_RNG');

const DEFAULT_BOT_DELAY_MS = 900;

interface Session {
  state: GameState;
  // seat -> the user playing it, or null when a bot has it
  seatUsers: Map<number, string | null>;
  botTimer?: NodeJS.Timeout;
}

// Sent whenever a game changes: each human gets their own view of the game,
// and everyone in the room gets the (public) events that just happened
export interface GameUpdate {
  roomId: string;
  events: GameEvent[];
  views: { userId: string; view: GameView }[];
}

// Runs the games that are in progress. The rules live in the game engine;
// this only keeps each room's state, works out which seat a user plays, and
// lets bots take their turns.
//
// Games are held in memory, so a server restart ends them.
@Injectable()
export class GamesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GamesService.name);
  private readonly sessions = new Map<string, Session>();
  private readonly updates = new Subject<GameUpdate>();
  private readonly botDelayMs: number;
  private subscription?: Subscription;

  readonly updates$: Observable<GameUpdate> = this.updates.asObservable();

  constructor(
    private readonly rooms: RoomsService,
    private readonly roomEvents: RoomEvents,
    config: ConfigService,
    @Inject(GAME_RNG) private readonly rng: Rng,
  ) {
    this.botDelayMs = Number(config.get('BOT_DELAY_MS', DEFAULT_BOT_DELAY_MS));
  }

  onModuleInit() {
    // A player who leaves mid-game hands their seat to a bot (ADR 0007)
    this.subscription = this.roomEvents.events$.subscribe((event) => {
      if (event.type === 'playerLeft') this.seatBecomesBot(event);
    });
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
    [...this.sessions.keys()].forEach((roomId) => this.discard(roomId));
  }

  create(
    roomId: string,
    players: { seat: number; userId: string | null }[],
  ): void {
    const session: Session = {
      state: createGame(
        players.map((p) => p.seat),
        this.rng,
      ),
      seatUsers: new Map(players.map((p) => [p.seat, p.userId])),
    };
    this.sessions.set(roomId, session);
    this.publish(roomId, session, []);
    this.scheduleBot(roomId);
  }

  // The game as this user may see it, or null if they are not in a game
  getView(userId: string, roomId: string): GameView | null {
    const session = this.sessions.get(roomId);
    const seat = session && this.seatOf(session, userId);
    return session && seat !== undefined
      ? buildGameView(session.state, seat)
      : null;
  }

  play(
    userId: string,
    roomId: string,
    cards: readonly Card[],
    choice: PlayChoice,
  ): void {
    this.act(userId, roomId, (state, seat) =>
      playCards(state, seat, cards, choice),
    );
  }

  draw(userId: string, roomId: string): void {
    this.act(userId, roomId, (state, seat) => drawCard(state, seat, this.rng));
  }

  keepDrawnCard(userId: string, roomId: string): void {
    this.act(userId, roomId, (state, seat) =>
      keepDrawnCard(state, seat, this.rng),
    );
  }

  wait(userId: string, roomId: string): void {
    this.act(userId, roomId, (state, seat) => waitTurns(state, seat));
  }

  private act(
    userId: string,
    roomId: string,
    action: (state: GameState, seat: number) => Outcome,
  ): void {
    const session = this.sessions.get(roomId);
    if (!session) {
      throw new ConflictException('No game is running in this room');
    }
    const seat = this.seatOf(session, userId);
    if (seat === undefined) {
      throw new NotFoundException('You are not playing in this game');
    }
    // The engine rejects illegal moves by throwing, before anything changes
    this.apply(roomId, session, action(session.state, seat));
  }

  private apply(roomId: string, session: Session, outcome: Outcome): void {
    session.state = outcome.state;
    this.publish(roomId, session, outcome.events);

    if (outcome.state.status === 'finished') {
      this.discard(roomId);
      this.rooms.markFinished(roomId).catch((err: unknown) => {
        this.logger.error(`Could not mark room ${roomId} as finished`, err);
      });
      return;
    }
    this.scheduleBot(roomId);
  }

  private publish(roomId: string, session: Session, events: GameEvent[]): void {
    const views = [...session.seatUsers].flatMap(([seat, userId]) =>
      userId ? [{ userId, view: buildGameView(session.state, seat) }] : [],
    );
    this.updates.next({ roomId, events, views });
  }

  private seatOf(session: Session, userId: string): number | undefined {
    for (const [seat, seatUser] of session.seatUsers) {
      if (seatUser === userId) return seat;
    }
    return undefined;
  }

  private seatBecomesBot(event: { roomId: string; userId: string }): void {
    const session = this.sessions.get(event.roomId);
    const seat = session && this.seatOf(session, event.userId);
    if (!session || seat === undefined) return;

    session.seatUsers.set(seat, null);
    if ([...session.seatUsers.values()].every((user) => user === null)) {
      this.discard(event.roomId);
      return;
    }
    this.scheduleBot(event.roomId);
  }

  // If it is a bot's turn, plays it after a short pause so it does not feel
  // instant. Only one pending move per room.
  private scheduleBot(roomId: string): void {
    const session = this.sessions.get(roomId);
    if (!session) return;
    clearTimeout(session.botTimer);
    session.botTimer = undefined;

    const { state, seatUsers } = session;
    if (
      state.status !== 'playing' ||
      seatUsers.get(state.currentSeat) !== null
    ) {
      return;
    }
    session.botTimer = setTimeout(() => this.runBot(roomId), this.botDelayMs);
    session.botTimer.unref();
  }

  private runBot(roomId: string): void {
    const session = this.sessions.get(roomId);
    if (!session) return;
    session.botTimer = undefined;

    const { state, seatUsers } = session;
    if (
      state.status !== 'playing' ||
      seatUsers.get(state.currentSeat) !== null
    ) {
      return;
    }
    try {
      this.apply(roomId, session, botMove(state, this.rng));
    } catch (err) {
      this.logger.error(`Bot move failed in room ${roomId}`, err);
    }
  }

  private discard(roomId: string): void {
    const session = this.sessions.get(roomId);
    if (session) clearTimeout(session.botTimer);
    this.sessions.delete(roomId);
  }
}
