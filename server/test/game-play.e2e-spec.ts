import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { GAME_RNG } from '../src/rooms/games.service.js';
import { AppModule } from './../src/app.module.js';
import { seededRng } from './helpers/game-state.js';

interface TestUser {
  id: string;
  token: string;
}

interface Card {
  rank: string;
  suit: string;
}

interface View {
  status: 'playing' | 'finished';
  currentSeat: number;
  ranking: number[];
  you: {
    seat: number;
    hand: Card[];
    legalCards: Card[];
    drawnCard: Card | null;
  } | null;
  players: { seat: number; cardCount: number }[];
  pendingSkips: number;
  penalty: number;
  hasDrawn: boolean;
}

interface GameEvent {
  type: string;
  seat?: number;
  ranking?: number[];
}

interface Ack {
  ok: boolean;
  game?: View | null;
  room?: { status: string };
  error?: { status: number; code?: string; message: string };
}

// What one connected player has been sent so far
interface Recorder {
  views: View[];
  events: GameEvent[];
}

describe('Playing a game over sockets (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let url: string;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;
  const sockets: Socket[] = [];
  const recorders = new Map<Socket, Recorder>();

  const http = () => request(app.getHttpServer());
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });

  const registerUser = async (name: string): Promise<TestUser> => {
    const { body } = await http()
      .post('/auth/register')
      .send({
        email: `${name}@example.com`,
        password: 'password123',
        displayName: name,
      })
      .expect(201);
    const me = await http()
      .get('/auth/me')
      .set({ Authorization: `Bearer ${body.accessToken}` })
      .expect(200);
    return { id: me.body.id, token: body.accessToken };
  };

  const emit = (socket: Socket, event: string, payload: unknown = {}) =>
    new Promise<Ack>((resolve) => socket.emit(event, payload, resolve));

  const until = async (
    condition: () => boolean,
    what: string,
    timeoutMs = 15000,
  ) => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for ${what}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  };

  const connect = (user: TestUser): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = io(`${url}/game`, {
        auth: { token: user.token },
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(socket);
      const recorder: Recorder = { views: [], events: [] };
      recorders.set(socket, recorder);
      socket.on('game:state', (view: View) => recorder.views.push(view));
      socket.on('game:events', (events: GameEvent[]) =>
        recorder.events.push(...events),
      );
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  const enter = async (user: TestUser, roomId: string) => {
    const socket = await connect(user);
    expect((await emit(socket, 'room:join', { roomId })).ok).toBe(true);
    return socket;
  };

  const createRoom = async (
    host: TestUser,
    body: { visibility: string; maxPlayers: number; bots?: number },
  ): Promise<string> =>
    (await http().post('/rooms').set(as(host)).send(body).expect(201)).body.id;

  const restJoin = (user: TestUser, roomId: string) =>
    http().post(`/rooms/${roomId}/join`).set(as(user)).send({}).expect(200);

  const viewsOf = (socket: Socket) => recorders.get(socket)!.views;
  const eventsOf = (socket: Socket) => recorders.get(socket)!.events;
  const lastView = (socket: Socket) => viewsOf(socket).at(-1)!;

  // Sets up a room, has everyone ready up, and has the host start the game
  const startGame = async (
    players: TestUser[],
    options: { bots?: number } = {},
  ) => {
    const bots = options.bots ?? 0;
    const roomId = await createRoom(players[0], {
      visibility: 'public',
      maxPlayers: players.length + bots,
      bots,
    });
    for (const user of players.slice(1)) await restJoin(user, roomId);
    const playerSockets: Socket[] = [];
    for (const user of players) playerSockets.push(await enter(user, roomId));
    for (const socket of playerSockets) {
      expect((await emit(socket, 'room:toggleReady')).ok).toBe(true);
    }
    const started = await emit(playerSockets[0], 'game:start');
    expect(started.ok).toBe(true);
    return { roomId, sockets: playerSockets, started };
  };

  // Plays for a human: a legal card if there is one, otherwise draws or waits
  const autoplay = (socket: Socket) => {
    const failures: unknown[] = [];
    let busy = false;
    let stopped = false;

    const respond = (view: View): Promise<Ack> => {
      const you = view.you!;
      const play = (card: Card) =>
        emit(socket, 'game:playCards', {
          cards: [card],
          suit: 'hearts',
          demand: null,
        });
      if (you.drawnCard && you.legalCards.length > 0)
        return play(you.drawnCard);
      if (view.pendingSkips > 0) {
        return you.legalCards.length > 0
          ? play(you.legalCards[0])
          : emit(socket, 'game:wait');
      }
      return you.legalCards.length > 0
        ? play(you.legalCards[0])
        : emit(socket, 'game:drawCard');
    };

    const act = async (): Promise<void> => {
      const view = viewsOf(socket).at(-1);
      if (busy || stopped || !view || view.status !== 'playing') return;
      if (!view.you || view.currentSeat !== view.you.seat) return;

      busy = true;
      const ack = await respond(view);
      busy = false;
      if (!ack.ok) failures.push(ack.error);
      // The state may have moved on while waiting for the acknowledgement
      void act();
    };

    socket.on('game:state', () => void act());
    void act();
    return { failures, stop: () => (stopped = true) };
  };

  const gameOverSeen = (socket: Socket) =>
    eventsOf(socket).some((event) => event.type === 'gameOver');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GAME_RNG)
      .useValue(seededRng(20260926))
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    url = `http://127.0.0.1:${address.port}`;
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE users CASCADE');
    alice = await registerUser('Alice');
    bob = await registerUser('Bob');
    carol = await registerUser('Carol');
  });

  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
    recorders.clear();
    // A game that just ended is still saving its result; the next test's
    // TRUNCATE must not collide with that write
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  afterAll(async () => {
    // Let broadcasts that are still in flight finish before the database closes
    await new Promise((resolve) => setTimeout(resolve, 150));
    await app.close();
  });

  describe('starting a game', () => {
    it('deals every player five cards and shows each only their own', async () => {
      const {
        sockets: [aliceSocket, bobSocket],
      } = await startGame([alice, bob]);
      await until(
        () => viewsOf(aliceSocket).length > 0 && viewsOf(bobSocket).length > 0,
        'the first game views',
      );

      const aliceView = viewsOf(aliceSocket)[0];
      const bobView = viewsOf(bobSocket)[0];
      expect(aliceView.you?.hand).toHaveLength(5);
      expect(bobView.you?.hand).toHaveLength(5);
      expect(aliceView.players.map((p) => p.cardCount)).toEqual([5, 5]);
      expect(aliceView.status).toBe('playing');

      // Nothing about the other player's cards is in a player's view
      for (const secret of bobView.you!.hand) {
        expect(JSON.stringify(aliceView)).not.toContain(JSON.stringify(secret));
      }
      for (const secret of aliceView.you!.hand) {
        expect(JSON.stringify(bobView)).not.toContain(JSON.stringify(secret));
      }
    });

    it('lets only the player whose turn it is see legal cards', async () => {
      const {
        sockets: [aliceSocket, bobSocket],
      } = await startGame([alice, bob]);
      await until(() => viewsOf(bobSocket).length > 0, 'the first view');

      const views = [lastView(aliceSocket), lastView(bobSocket)];
      const waiting = views.find((v) => v.you!.seat !== v.currentSeat)!;
      expect(waiting.you!.legalCards).toEqual([]);
    });

    it('returns the running game to a player who reconnects', async () => {
      const {
        roomId,
        sockets: [aliceSocket],
      } = await startGame([alice, bob]);
      await until(() => viewsOf(aliceSocket).length > 0, 'the first view');

      const again = await connect(alice);
      const ack = await emit(again, 'room:join', { roomId });
      expect(ack.game).toEqual(lastView(aliceSocket));
    });

    it('refuses game moves before a game has started', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      });
      const socket = await enter(alice, roomId);
      expect(await emit(socket, 'game:drawCard')).toMatchObject({
        ok: false,
        error: { status: 409, message: 'No game is running in this room' },
      });
    });
  });

  describe('moves that are refused', () => {
    let aliceSocket: Socket;
    let bobSocket: Socket;
    let current: Socket;
    let waiting: Socket;

    beforeEach(async () => {
      const game = await startGame([alice, bob]);
      [aliceSocket, bobSocket] = game.sockets;
      await until(
        () => viewsOf(aliceSocket).length > 0 && viewsOf(bobSocket).length > 0,
        'the first views',
      );
      const aliceView = lastView(aliceSocket);
      const aliceIsCurrent = aliceView.you!.seat === aliceView.currentSeat;
      current = aliceIsCurrent ? aliceSocket : bobSocket;
      waiting = aliceIsCurrent ? bobSocket : aliceSocket;
    });

    it('a move out of turn', async () => {
      const card = lastView(waiting).you!.hand[0];
      expect(
        await emit(waiting, 'game:playCards', { cards: [card] }),
      ).toMatchObject({
        ok: false,
        error: { status: 409, code: 'NOT_YOUR_TURN' },
      });
      expect(await emit(waiting, 'game:drawCard')).toMatchObject({
        ok: false,
        error: { code: 'NOT_YOUR_TURN' },
      });
      expect(await emit(waiting, 'game:wait')).toMatchObject({
        ok: false,
        error: { code: 'NOT_YOUR_TURN' },
      });
    });

    it('a card the player does not hold', async () => {
      const foreign = lastView(waiting).you!.hand[0];
      expect(
        await emit(current, 'game:playCards', { cards: [foreign] }),
      ).toMatchObject({
        ok: false,
        error: { status: 400, code: 'CARD_NOT_IN_HAND' },
      });
    });

    it('a card that does not fit the pile', async () => {
      const view = lastView(current);
      const unplayable = view.you!.hand.find(
        (card) =>
          !view.you!.legalCards.some(
            (legal) => legal.rank === card.rank && legal.suit === card.suit,
          ),
      );
      if (!unplayable) return; // every card happens to fit in this deal

      expect(
        await emit(current, 'game:playCards', {
          cards: [unplayable],
          suit: 'hearts',
          demand: null,
        }),
      ).toMatchObject({
        ok: false,
        error: { status: 409, code: 'CARD_NOT_PLAYABLE' },
      });
    });

    it('waiting when there is nothing to wait for, and keeping when nothing was drawn', async () => {
      expect(await emit(current, 'game:wait')).toMatchObject({
        ok: false,
        error: { code: 'NO_WAIT_PENDING' },
      });
      expect(await emit(current, 'game:keepCard')).toMatchObject({
        ok: false,
        error: { code: 'NOTHING_DRAWN' },
      });
    });

    it('a malformed message', async () => {
      for (const payload of [
        {},
        { cards: [] },
        { cards: 'all of them' },
        { cards: [{ rank: '1', suit: 'hearts' }] },
        { cards: [{ rank: '7', suit: 'stars' }] },
        { cards: [{ rank: '7', suit: 'hearts' }], extra: true },
        {
          cards: Array.from({ length: 5 }, () => ({
            rank: '7',
            suit: 'hearts',
          })),
        },
        'nonsense',
      ]) {
        expect(await emit(current, 'game:playCards', payload)).toMatchObject({
          ok: false,
          error: { status: 400 },
        });
      }
    });

    it('leaves the game untouched', async () => {
      const before = JSON.stringify(lastView(current));
      await emit(waiting, 'game:drawCard');
      await emit(current, 'game:wait');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(JSON.stringify(lastView(current))).toBe(before);
    });
  });

  describe('a whole game', () => {
    it('is played to the end by two players', async () => {
      const {
        sockets: [aliceSocket, bobSocket],
      } = await startGame([alice, bob]);
      const players = [autoplay(aliceSocket), autoplay(bobSocket)];

      await until(
        () => gameOverSeen(aliceSocket) && gameOverSeen(bobSocket),
        'the game to end',
      );
      players.forEach((p) => p.stop());

      expect(players.flatMap((p) => p.failures)).toEqual([]);
      for (const socket of [aliceSocket, bobSocket]) {
        const final = lastView(socket);
        expect(final.status).toBe('finished');
        expect(final.ranking).toHaveLength(2);
        expect(new Set(final.ranking).size).toBe(2);
        // The winner has no cards left
        const winner = final.players.find((p) => p.seat === final.ranking[0])!;
        expect(winner.cardCount).toBe(0);
      }

      // Everyone saw the same public events, in the same order
      expect(eventsOf(aliceSocket)).toEqual(eventsOf(bobSocket));
      expect(eventsOf(aliceSocket).some((e) => e.type === 'played')).toBe(true);
    });

    it('marks the room finished and frees the players', async () => {
      const {
        roomId,
        sockets: [aliceSocket, bobSocket],
      } = await startGame([alice, bob]);
      const players = [autoplay(aliceSocket), autoplay(bobSocket)];
      await until(() => gameOverSeen(aliceSocket), 'the game to end');
      players.forEach((p) => p.stop());

      // The status is written just after the last move, so poll for it
      let status = '';
      for (let i = 0; i < 100 && status !== 'finished'; i++) {
        const res = await http()
          .get(`/rooms/${roomId}`)
          .set(as(alice))
          .expect(200);
        status = res.body.status;
        if (status !== 'finished') {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      expect(status).toBe('finished');

      // The result is kept: one game, with each player's place
      const saved: { place: number; userId: string }[] =
        await dataSource.query(
          `SELECT gp."place", gp."userId" FROM game_players gp
           JOIN games g ON g.id = gp."gameId"
           WHERE g."roomId" = $1 ORDER BY gp."place"`,
          [roomId],
        );
      expect(saved.map((row) => row.place)).toEqual([1, 2]);
      expect(saved.map((row) => row.userId).sort()).toEqual(
        [alice.id, bob.id].sort(),
      );

      await http()
        .post('/rooms')
        .set(as(alice))
        .send({ visibility: 'public', maxPlayers: 2 })
        .expect(201);
    });

    it('does not accept moves after it has ended', async () => {
      const {
        sockets: [aliceSocket, bobSocket],
      } = await startGame([alice, bob]);
      const players = [autoplay(aliceSocket), autoplay(bobSocket)];
      await until(() => gameOverSeen(aliceSocket), 'the game to end');
      players.forEach((p) => p.stop());

      expect(await emit(aliceSocket, 'game:drawCard')).toMatchObject({
        ok: false,
        error: { status: 409 },
      });
    });

    it('is played by a person against bots', async () => {
      const {
        sockets: [aliceSocket],
      } = await startGame([alice], { bots: 2 });
      const player = autoplay(aliceSocket);

      await until(() => gameOverSeen(aliceSocket), 'the game to end');
      player.stop();

      expect(player.failures).toEqual([]);
      const final = lastView(aliceSocket);
      expect(final.status).toBe('finished');
      expect(final.ranking).toHaveLength(3);
      // The bots took turns too
      const seatsThatPlayed = new Set(
        eventsOf(aliceSocket)
          .filter((e) => e.type === 'played')
          .map((e) => e.seat),
      );
      expect(seatsThatPlayed.size).toBeGreaterThan(1);
    });

    it('carries on with a bot in the seat of a player who leaves', async () => {
      const { roomId, sockets } = await startGame([alice, bob, carol]);
      const [aliceSocket, bobSocket, carolSocket] = sockets;
      await until(() => viewsOf(bobSocket).length > 0, 'the first views');
      const bobSeat = lastView(bobSocket).you!.seat;

      await http().post(`/rooms/${roomId}/leave`).set(as(bob)).expect(204);
      const players = [autoplay(aliceSocket), autoplay(carolSocket)];

      await until(() => gameOverSeen(aliceSocket), 'the game to end');
      players.forEach((p) => p.stop());

      expect(players.flatMap((p) => p.failures)).toEqual([]);
      const final = lastView(aliceSocket);
      expect(final.status).toBe('finished');
      expect(final.ranking).toHaveLength(3);
      // The seat the leaver left kept playing (and ranked) as a bot
      expect(final.ranking).toContain(bobSeat);
    });
  });
});
