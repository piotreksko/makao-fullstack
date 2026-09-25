import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './../src/app.module.js';

interface TestUser {
  id: string;
  token: string;
}

interface Ack {
  ok: boolean;
  room?: {
    id: string;
    status: string;
    players: Player[];
    host: { id: string };
  };
  error?: { status: number; message: string };
}

interface RoomSnapshot {
  status: string;
  players: Player[];
}

interface Player {
  seat: number;
  isBot: boolean;
  isReady: boolean;
  user: { id: string; displayName: string } | null;
}

describe('GameGateway (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwt: JwtService;
  let url: string;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;
  const sockets: Socket[] = [];

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

  const createRoom = async (
    user: TestUser,
    body: { visibility: string; maxPlayers: number; bots?: number },
  ): Promise<string> => {
    const res = await http()
      .post('/rooms')
      .set(as(user))
      .send(body)
      .expect(201);
    return res.body.id;
  };
  const restJoin = (user: TestUser, roomId: string) =>
    http().post(`/rooms/${roomId}/join`).set(as(user)).send({}).expect(200);
  const restLeave = (user: TestUser, roomId: string) =>
    http().post(`/rooms/${roomId}/leave`).set(as(user)).expect(204);

  const connect = (auth: object): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = io(`${url}/game`, {
        auth,
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  const connectAs = (user: TestUser) => connect({ token: user.token });

  const emit = (socket: Socket, event: string, payload: unknown = {}) =>
    new Promise<Ack>((resolve) => socket.emit(event, payload, resolve));
  const nextEvent = <T = unknown>(socket: Socket, event: string) =>
    new Promise<T>((resolve) => socket.once(event, resolve));
  const stateWhere = (
    socket: Socket,
    matches: (room: RoomSnapshot) => boolean,
  ) =>
    new Promise<RoomSnapshot>((resolve) => {
      const handler = (room: RoomSnapshot) => {
        if (!matches(room)) return;
        socket.off('room:state', handler);
        resolve(room);
      };
      socket.on('room:state', handler);
    });
  const noEventWithin = (socket: Socket, event: string, ms = 250) =>
    new Promise<boolean>((resolve) => {
      const handler = () => resolve(false);
      socket.once(event, handler);
      setTimeout(() => {
        socket.off(event, handler);
        resolve(true);
      }, ms);
    });

  // Connects a user and joins their room in one step
  const enter = async (user: TestUser, roomId: string) => {
    const socket = await connectAs(user);
    const ack = await emit(socket, 'room:join', { roomId });
    expect(ack.ok).toBe(true);
    return socket;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    url = `http://127.0.0.1:${address.port}`;
    dataSource = app.get(DataSource);
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE users CASCADE');
    alice = await registerUser('Alice');
    bob = await registerUser('Bob');
    carol = await registerUser('Carol');
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('connection', () => {
    it('accepts a valid token', async () => {
      const socket = await connectAs(alice);
      expect(socket.connected).toBe(true);
    });

    it.each([
      ['no token', {}],
      ['a non-string token', { token: 123 }],
      ['a malformed token', { token: 'not.a.token' }],
    ])('rejects %s', async (_label, auth) => {
      await expect(connect(auth)).rejects.toThrow('unauthorized');
    });

    it('rejects a token signed with the wrong secret', async () => {
      const forged = await new JwtService({
        secret: 'not-the-secret',
      }).signAsync({ sub: alice.id, displayName: 'Alice' });
      await expect(connect({ token: forged })).rejects.toThrow('unauthorized');
    });

    it('rejects a valid token whose user no longer exists', async () => {
      const token = await jwt.signAsync({
        sub: '8a4f0f4e-3f0b-4b46-9a63-6d3d5a1b2c3d',
        displayName: 'Ghost',
      });
      await expect(connect({ token })).rejects.toThrow('unauthorized');
    });
  });

  describe('room:join', () => {
    it('returns the room state to a member', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      });
      const socket = await connectAs(alice);
      const ack = await emit(socket, 'room:join', { roomId });
      expect(ack.ok).toBe(true);
      expect(ack.room?.id).toBe(roomId);
      expect(ack.room?.players).toHaveLength(1);
    });

    it('refuses someone who has no seat, even in a public room', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      });
      const socket = await connectAs(bob);
      const ack = await emit(socket, 'room:join', { roomId });
      expect(ack).toMatchObject({ ok: false, error: { status: 404 } });
    });

    it('rejects a malformed payload', async () => {
      const socket = await connectAs(alice);
      expect(await emit(socket, 'room:join', { roomId: 'nope' })).toMatchObject(
        { ok: false, error: { status: 400 } },
      );
      expect(await emit(socket, 'room:join', 'nope')).toMatchObject({
        ok: false,
        error: { status: 400 },
      });
      expect(
        await emit(socket, 'room:join', {
          roomId: '8a4f0f4e-3f0b-4b46-9a63-6d3d5a1b2c3d',
          extra: 1,
        }),
      ).toMatchObject({ ok: false, error: { status: 400 } });
    });

    it('requires joining a room before other room events', async () => {
      const socket = await connectAs(alice);
      for (const event of ['room:toggleReady', 'game:start']) {
        expect(await emit(socket, event)).toMatchObject({
          ok: false,
          error: { status: 409 },
        });
      }
      expect(
        await emit(socket, 'room:sendMessage', { text: 'hi' }),
      ).toMatchObject({ ok: false, error: { status: 409 } });
    });
  });

  describe('changes made over REST reach connected players', () => {
    it('tells the room when someone joins', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 3,
      });
      const aliceSocket = await enter(alice, roomId);

      const joined = nextEvent<{ userId: string; displayName: string }>(
        aliceSocket,
        'room:playerJoined',
      );
      const state = nextEvent<{ players: Player[] }>(aliceSocket, 'room:state');
      await restJoin(bob, roomId);

      expect(await joined).toEqual({ userId: bob.id, displayName: 'Bob' });
      expect((await state).players.map((p) => p.user?.displayName)).toEqual([
        'Alice',
        'Bob',
      ]);
    });

    it('tells the room when someone leaves and stops sending to the leaver', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 3,
      });
      await restJoin(bob, roomId);
      const aliceSocket = await enter(alice, roomId);
      const bobSocket = await enter(bob, roomId);

      const leftForAlice = nextEvent(aliceSocket, 'room:playerLeft');
      const leftForBob = nextEvent(bobSocket, 'room:left');
      await restLeave(bob, roomId);
      expect(await leftForAlice).toEqual({
        userId: bob.id,
        displayName: 'Bob',
      });
      expect(await leftForBob).toEqual({ roomId });

      const heard = noEventWithin(bobSocket, 'room:message');
      await emit(aliceSocket, 'room:sendMessage', { text: 'still here?' });
      expect(await heard).toBe(true);
    });

    it('broadcasts host-managed bot changes', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 3,
      });
      const aliceSocket = await enter(alice, roomId);

      const state = nextEvent<{ players: Player[] }>(aliceSocket, 'room:state');
      await http().post(`/rooms/${roomId}/bots`).set(as(alice)).expect(200);
      expect((await state).players.map((p) => p.isBot)).toEqual([false, true]);
    });
  });

  describe('room:toggleReady', () => {
    it('flips readiness and tells everyone in the room', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      });
      await restJoin(bob, roomId);
      const aliceSocket = await enter(alice, roomId);
      const bobSocket = await enter(bob, roomId);

      const seenByAlice = nextEvent(aliceSocket, 'room:playerReady');
      const seenByBob = nextEvent(bobSocket, 'room:playerReady');
      const ack = await emit(bobSocket, 'room:toggleReady');

      expect(ack.ok).toBe(true);
      expect(
        ack.room?.players.find((p) => p.user?.id === bob.id)?.isReady,
      ).toBe(true);
      expect(await seenByAlice).toEqual({ userId: bob.id, isReady: true });
      expect(await seenByBob).toEqual({ userId: bob.id, isReady: true });

      const off = await emit(bobSocket, 'room:toggleReady');
      expect(
        off.room?.players.find((p) => p.user?.id === bob.id)?.isReady,
      ).toBe(false);
    });
  });

  describe('game:start', () => {
    let roomId: string;
    let aliceSocket: Socket;
    let bobSocket: Socket;

    beforeEach(async () => {
      roomId = await createRoom(alice, { visibility: 'public', maxPlayers: 3 });
      await restJoin(bob, roomId);
      aliceSocket = await enter(alice, roomId);
      bobSocket = await enter(bob, roomId);
    });

    it('is refused for anyone but the host, server-side', async () => {
      await emit(aliceSocket, 'room:toggleReady');
      await emit(bobSocket, 'room:toggleReady');
      expect(await emit(bobSocket, 'game:start')).toMatchObject({
        ok: false,
        error: { status: 403 },
      });
    });

    it('is refused until every human is ready', async () => {
      await emit(aliceSocket, 'room:toggleReady');
      expect(await emit(aliceSocket, 'game:start')).toMatchObject({
        ok: false,
        error: { status: 409, message: 'Everyone must be ready' },
      });
    });

    it('starts once everyone is ready and tells the whole room', async () => {
      await emit(aliceSocket, 'room:toggleReady');
      await emit(bobSocket, 'room:toggleReady');

      const startedForBob = nextEvent(bobSocket, 'game:started');
      // Readiness snapshots may still be in flight, so wait for the started one
      const stateForBob = stateWhere(
        bobSocket,
        (room) => room.status === 'in_progress',
      );
      const ack = await emit(aliceSocket, 'game:start');

      expect(ack.ok).toBe(true);
      expect(ack.room?.status).toBe('in_progress');
      expect(await startedForBob).toEqual({ roomId });
      expect((await stateForBob).status).toBe('in_progress');
    });

    it('cannot be started twice or have readiness changed afterwards', async () => {
      await emit(aliceSocket, 'room:toggleReady');
      await emit(bobSocket, 'room:toggleReady');
      await emit(aliceSocket, 'game:start');

      expect(await emit(aliceSocket, 'game:start')).toMatchObject({
        ok: false,
        error: { status: 409 },
      });
      expect(await emit(bobSocket, 'room:toggleReady')).toMatchObject({
        ok: false,
        error: { status: 409 },
      });
    });

    const startGame = async () => {
      await emit(aliceSocket, 'room:toggleReady');
      await emit(bobSocket, 'room:toggleReady');
      await emit(aliceSocket, 'game:start');
    };

    it('turns a leaver into a bot on the same seat instead of removing them', async () => {
      await startGame();
      // Earlier room:state messages (from readiness and starting) may still be
      // in flight, so wait for the snapshot that actually shows the bot
      const stateForAlice = stateWhere(
        aliceSocket,
        (room) => room.players[1]?.isBot === true,
      );
      await restLeave(bob, roomId);

      const view = await http()
        .get(`/rooms/${roomId}`)
        .set(as(alice))
        .expect(200);
      expect(view.body.status).toBe('in_progress');
      expect(view.body.players).toEqual([
        expect.objectContaining({ seat: 0, isBot: false }),
        { seat: 1, isBot: true, isReady: true, user: null },
      ]);
      expect((await stateForAlice).players[1].isBot).toBe(true);
    });

    it('frees the leaver to join or create another room', async () => {
      await startGame();
      await restLeave(bob, roomId);
      await http()
        .post('/rooms')
        .set(as(bob))
        .send({ visibility: 'public', maxPlayers: 2 })
        .expect(201);
    });

    it('passes the host role on when the host leaves mid-game', async () => {
      await startGame();
      await restLeave(alice, roomId);

      const view = await http()
        .get(`/rooms/${roomId}`)
        .set(as(bob))
        .expect(200);
      expect(view.body.host.id).toBe(bob.id);
      expect(view.body.players[0]).toMatchObject({ seat: 0, isBot: true });
    });

    it('abandons the game when the last human leaves', async () => {
      await startGame();
      await restLeave(bob, roomId);
      await restLeave(alice, roomId);
      const seats = await dataSource.query('SELECT count(*) FROM room_players');
      expect(Number(seats[0].count)).toBe(0);
    });
  });

  describe('game:start with bots', () => {
    it('does not wait for bots, which are always ready', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
        bots: 2,
      });
      const socket = await enter(alice, roomId);
      await emit(socket, 'room:toggleReady');
      const ack = await emit(socket, 'game:start');
      expect(ack.ok).toBe(true);
      expect(ack.room?.status).toBe('in_progress');
    });

    it('needs at least two seats filled', async () => {
      const roomId = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
      });
      const socket = await enter(alice, roomId);
      await emit(socket, 'room:toggleReady');
      expect(await emit(socket, 'game:start')).toMatchObject({
        ok: false,
        error: { status: 409, message: 'At least two players are needed' },
      });
    });
  });

  describe('room:sendMessage', () => {
    let roomId: string;
    let aliceSocket: Socket;
    let bobSocket: Socket;
    let carolSocket: Socket;

    beforeEach(async () => {
      roomId = await createRoom(alice, { visibility: 'public', maxPlayers: 3 });
      await restJoin(bob, roomId);
      aliceSocket = await enter(alice, roomId);
      bobSocket = await enter(bob, roomId);
      carolSocket = await connectAs(carol);
    });

    it('delivers a trimmed message with the sender to everyone in the room', async () => {
      const toAlice = nextEvent<Record<string, string>>(
        aliceSocket,
        'room:message',
      );
      const toBob = nextEvent<Record<string, string>>(
        bobSocket,
        'room:message',
      );
      const ack = await emit(bobSocket, 'room:sendMessage', {
        text: '  hello there  ',
      });

      expect(ack.ok).toBe(true);
      for (const message of [await toAlice, await toBob]) {
        expect(message).toMatchObject({
          roomId,
          userId: bob.id,
          displayName: 'Bob',
          text: 'hello there',
        });
        expect(Number.isNaN(Date.parse(message.sentAt))).toBe(false);
      }
    });

    it.each([
      ['empty text', { text: '' }],
      ['whitespace only', { text: '   ' }],
      ['text over 500 characters', { text: 'a'.repeat(501) }],
      ['a non-string', { text: 42 }],
      ['a missing field', {}],
      ['an extra field', { text: 'hi', admin: true }],
    ])('rejects %s', async (_label, payload) => {
      expect(
        await emit(aliceSocket, 'room:sendMessage', payload),
      ).toMatchObject({ ok: false, error: { status: 400 } });
    });

    it('does not reach people outside the room', async () => {
      const heard = noEventWithin(carolSocket, 'room:message');
      await emit(aliceSocket, 'room:sendMessage', { text: 'private chat' });
      expect(await heard).toBe(true);
    });

    it('is refused once the sender has lost their seat', async () => {
      await restLeave(bob, roomId);
      expect(
        await emit(bobSocket, 'room:sendMessage', { text: 'hello?' }),
      ).toMatchObject({ ok: false, error: { status: 404 } });
    });
  });
});
