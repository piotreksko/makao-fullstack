import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

interface TestUser {
  id: string;
  token: string;
}

interface RoomBody {
  visibility: string;
  maxPlayers: number;
  bots?: number;
}

const UNKNOWN_ID = '8a4f0f4e-3f0b-4b46-9a63-6d3d5a1b2c3d';

describe('Rooms (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;
  let dave: TestUser;
  let erin: TestUser;

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

  const createRoom = (user: TestUser, body: RoomBody) =>
    http().post('/rooms').set(as(user)).send(body);
  const join = (user: TestUser, roomId: string, body: object = {}) =>
    http().post(`/rooms/${roomId}/join`).set(as(user)).send(body);
  const leave = (user: TestUser, roomId: string) =>
    http().post(`/rooms/${roomId}/leave`).set(as(user));
  const addBot = (user: TestUser, roomId: string) =>
    http().post(`/rooms/${roomId}/bots`).set(as(user));
  const removeBot = (user: TestUser, roomId: string, seat: number) =>
    http().delete(`/rooms/${roomId}/bots/${seat}`).set(as(user));
  const getRoom = (user: TestUser, roomId: string) =>
    http().get(`/rooms/${roomId}`).set(as(user));
  const seatsOf = (body: { players: { seat: number }[] }) =>
    body.players.map((p) => p.seat);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE users CASCADE');
    alice = await registerUser('Alice');
    bob = await registerUser('Bob');
    carol = await registerUser('Carol');
    dave = await registerUser('Dave');
    erin = await registerUser('Erin');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authentication', () => {
    it.each([
      ['get', '/rooms'],
      ['post', '/rooms'],
      ['get', `/rooms/${UNKNOWN_ID}`],
      ['post', `/rooms/${UNKNOWN_ID}/join`],
      ['post', `/rooms/${UNKNOWN_ID}/leave`],
      ['post', `/rooms/${UNKNOWN_ID}/bots`],
      ['delete', `/rooms/${UNKNOWN_ID}/bots/1`],
      ['post', '/rooms/join-by-code'],
    ] as const)('%s %s requires a token', async (method, path) => {
      await http()[method](path).expect(401);
    });
  });

  describe('POST /rooms', () => {
    it('creates a 2-player public room with the creator on seat 0', async () => {
      const res = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      expect(res.body).toMatchObject({
        visibility: 'public',
        status: 'waiting',
        maxPlayers: 2,
        inviteCode: null,
        host: { id: alice.id, displayName: 'Alice' },
      });
      expect(res.body.players).toHaveLength(1);
      expect(res.body.players[0]).toMatchObject({
        seat: 0,
        isBot: false,
        isReady: false,
        user: { id: alice.id },
      });
    });

    it.each([2, 3, 4])('accepts a room of %i players', async (maxPlayers) => {
      const res = await createRoom(alice, {
        visibility: 'public',
        maxPlayers,
      }).expect(201);
      expect(res.body.maxPlayers).toBe(maxPlayers);
    });

    it('seats the requested number of ready bots after the host', async () => {
      const res = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
        bots: 2,
      }).expect(201);
      expect(seatsOf(res.body)).toEqual([0, 1, 2]);
      expect(res.body.players[0].isBot).toBe(false);
      expect(res.body.players.slice(1)).toEqual([
        { seat: 1, isBot: true, isReady: true, user: null },
        { seat: 2, isBot: true, isReady: true, user: null },
      ]);
    });

    it('allows every seat except the host to be a bot', async () => {
      const res = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
        bots: 3,
      }).expect(201);
      expect(res.body.players).toHaveLength(4);
    });

    it('rejects more bots than the host leaves seats for with 400', async () => {
      await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
        bots: 2,
      }).expect(400);
      await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 3,
        bots: 3,
      }).expect(400);
    });

    it('gives every private room an invite code, even with bots', async () => {
      const plain = await createRoom(alice, {
        visibility: 'private',
        maxPlayers: 2,
      }).expect(201);
      const withBots = await createRoom(bob, {
        visibility: 'private',
        maxPlayers: 4,
        bots: 2,
      }).expect(201);
      expect(plain.body.inviteCode).toMatch(/^[A-Z2-9]{8}$/);
      expect(withBots.body.inviteCode).toMatch(/^[A-Z2-9]{8}$/);
    });

    it('rejects a user who is already in a room with 409', async () => {
      await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(409);
    });

    it.each([
      ['unknown visibility', { visibility: 'secret', maxPlayers: 2 }],
      ['missing maxPlayers', { visibility: 'public' }],
      ['maxPlayers below 2', { visibility: 'public', maxPlayers: 1 }],
      ['maxPlayers above 4', { visibility: 'public', maxPlayers: 5 }],
      ['fractional maxPlayers', { visibility: 'public', maxPlayers: 2.5 }],
      ['negative bots', { visibility: 'public', maxPlayers: 4, bots: -1 }],
      ['bots above 3', { visibility: 'public', maxPlayers: 4, bots: 4 }],
      [
        'legacy vsBot field',
        { visibility: 'public', maxPlayers: 2, vsBot: true },
      ],
    ])('rejects %s with 400', async (_label, body) => {
      await http().post('/rooms').set(as(alice)).send(body).expect(400);
    });
  });

  describe('GET /rooms', () => {
    it('lists public waiting rooms that have a free seat', async () => {
      const open = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      await createRoom(bob, { visibility: 'private', maxPlayers: 2 }).expect(
        201,
      );
      await createRoom(carol, {
        visibility: 'public',
        maxPlayers: 2,
        bots: 1,
      }).expect(201);

      const res = await getRooms(dave);
      expect(res.map((r) => r.id)).toEqual([open.body.id]);
    });

    it('lists a room with bots while a human seat is still free', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
        bots: 2,
      }).expect(201);
      const res = await getRooms(bob);
      expect(res.map((r) => r.id)).toEqual([room.body.id]);
    });

    it('drops a room from the list once it is full', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      await join(bob, room.body.id).expect(200);
      expect(await getRooms(carol)).toEqual([]);
    });

    async function getRooms(user: TestUser): Promise<{ id: string }[]> {
      const res = await http().get('/rooms').set(as(user)).expect(200);
      return res.body;
    }
  });

  describe('POST /rooms/:id/join', () => {
    it('seats the joiner on the free seat', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      const res = await join(bob, room.body.id).expect(200);
      expect(seatsOf(res.body)).toEqual([0, 1]);
      expect(res.body.players[1].user.id).toBe(bob.id);
    });

    it('fills a 4-player room and rejects a fifth with 409', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
      }).expect(201);
      await join(bob, room.body.id).expect(200);
      await join(carol, room.body.id).expect(200);
      const last = await join(dave, room.body.id).expect(200);
      expect(seatsOf(last.body)).toEqual([0, 1, 2, 3]);
      await join(erin, room.body.id).expect(409);
    });

    it('joins after the bots, on the first free seat', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
        bots: 2,
      }).expect(201);
      const res = await join(bob, room.body.id).expect(200);
      expect(seatsOf(res.body)).toEqual([0, 1, 2, 3]);
      expect(res.body.players[3].user.id).toBe(bob.id);
      await join(carol, room.body.id).expect(409);
    });

    it('rejects joining a room the bots have filled with 409', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 3,
        bots: 2,
      }).expect(201);
      await join(bob, room.body.id).expect(409);
    });

    it('rejects a user who is already in a room with 409', async () => {
      const aliceRoom = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      await createRoom(bob, { visibility: 'public', maxPlayers: 2 }).expect(
        201,
      );
      await join(bob, aliceRoom.body.id).expect(409);
    });

    it('lets only one of two simultaneous joiners take the last seat', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 3,
      }).expect(201);
      await join(bob, room.body.id).expect(200);
      const results = await Promise.all([
        join(carol, room.body.id),
        join(dave, room.body.id),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });

    it('returns 404 for an unknown room and 400 for a malformed id', async () => {
      await join(bob, UNKNOWN_ID).expect(404);
      await join(bob, 'not-a-uuid').expect(400);
    });
  });

  describe('private rooms and invite codes', () => {
    let roomId: string;
    let code: string;

    beforeEach(async () => {
      const room = await createRoom(alice, {
        visibility: 'private',
        maxPlayers: 3,
        bots: 1,
      }).expect(201);
      roomId = room.body.id;
      code = room.body.inviteCode;
    });

    it('hides the room from non-members', async () => {
      await getRoom(bob, roomId).expect(404);
      await getRoom(alice, roomId).expect(200);
    });

    it('rejects joining by id without the right code with 403', async () => {
      await join(bob, roomId).expect(403);
      await join(bob, roomId, { inviteCode: 'ZZZZZZZZ' }).expect(403);
    });

    it('lets a user join by id with the right code', async () => {
      await join(bob, roomId, { inviteCode: code }).expect(200);
    });

    it('lets a user join by code alone, case-insensitively', async () => {
      const res = await http()
        .post('/rooms/join-by-code')
        .set(as(bob))
        .send({ inviteCode: code.toLowerCase() })
        .expect(200);
      expect(res.body.id).toBe(roomId);
      expect(res.body.inviteCode).toBe(code);
    });

    it('returns 404 for a code that matches no room', async () => {
      await http()
        .post('/rooms/join-by-code')
        .set(as(bob))
        .send({ inviteCode: 'ZZZZZZZZ' })
        .expect(404);
    });

    it('rejects a malformed code with 400', async () => {
      await http()
        .post('/rooms/join-by-code')
        .set(as(bob))
        .send({ inviteCode: 'abc' })
        .expect(400);
    });
  });

  describe('POST /rooms/:id/bots and DELETE /rooms/:id/bots/:seat', () => {
    let roomId: string;

    beforeEach(async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
      }).expect(201);
      roomId = room.body.id;
    });

    it('lets the host add bots until the room is full', async () => {
      let res = await addBot(alice, roomId).expect(200);
      expect(res.body.players[1]).toEqual({
        seat: 1,
        isBot: true,
        isReady: true,
        user: null,
      });
      await addBot(alice, roomId).expect(200);
      res = await addBot(alice, roomId).expect(200);
      expect(seatsOf(res.body)).toEqual([0, 1, 2, 3]);
      await addBot(alice, roomId).expect(409);
    });

    it('puts a new bot on the first free seat, filling gaps', async () => {
      await addBot(alice, roomId).expect(200);
      await addBot(alice, roomId).expect(200);
      await removeBot(alice, roomId, 1).expect(200);
      const res = await addBot(alice, roomId).expect(200);
      expect(seatsOf(res.body)).toEqual([0, 1, 2]);
    });

    it('does not let a bot take a seat a human needs to join', async () => {
      await addBot(alice, roomId).expect(200);
      await join(bob, roomId).expect(200);
      await join(carol, roomId).expect(200);
      await addBot(alice, roomId).expect(409);
    });

    it('lets the host remove a bot, freeing its seat for a human', async () => {
      await addBot(alice, roomId).expect(200);
      await addBot(alice, roomId).expect(200);
      await addBot(alice, roomId).expect(200);
      await join(bob, roomId).expect(409);

      const res = await removeBot(alice, roomId, 2).expect(200);
      expect(seatsOf(res.body)).toEqual([0, 1, 3]);
      const joined = await join(bob, roomId).expect(200);
      expect(
        joined.body.players.find((p: { seat: number }) => p.seat === 2),
      ).toMatchObject({ isBot: false, user: { id: bob.id } });
    });

    it('rejects removing a seat that is not a bot with 404', async () => {
      await removeBot(alice, roomId, 0).expect(404);
      await removeBot(alice, roomId, 3).expect(404);
    });

    it('lets only the host manage bots', async () => {
      await join(bob, roomId).expect(200);
      await addBot(bob, roomId).expect(403);
      await addBot(alice, roomId).expect(200);
      await removeBot(bob, roomId, 2).expect(403);
    });

    it('returns 404 to someone who is not in the room', async () => {
      await addBot(bob, roomId).expect(404);
      await removeBot(bob, roomId, 1).expect(404);
    });

    it('rejects a non-numeric seat with 400', async () => {
      await http()
        .delete(`/rooms/${roomId}/bots/left`)
        .set(as(alice))
        .expect(400);
    });
  });

  describe('POST /rooms/:id/leave', () => {
    it('frees the seat when a guest leaves', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      await join(bob, room.body.id).expect(200);
      await leave(bob, room.body.id).expect(204);

      const res = await getRoom(alice, room.body.id).expect(200);
      expect(res.body.players).toHaveLength(1);
      expect(res.body.host.id).toBe(alice.id);
      const listed = await http().get('/rooms').set(as(carol)).expect(200);
      expect(listed.body).toHaveLength(1);
    });

    it('lets the freed user create a room again', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      await join(bob, room.body.id).expect(200);
      await leave(bob, room.body.id).expect(204);
      await createRoom(bob, { visibility: 'public', maxPlayers: 2 }).expect(
        201,
      );
    });

    it('hands the host role to a remaining human when the host leaves', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
        bots: 1,
      }).expect(201);
      await join(bob, room.body.id).expect(200);
      await join(carol, room.body.id).expect(200);
      await leave(alice, room.body.id).expect(204);

      const res = await getRoom(bob, room.body.id).expect(200);
      expect(res.body.host.id).toBe(bob.id);
      expect(seatsOf(res.body)).toEqual([1, 2, 3]);
      expect(
        res.body.players.filter((p: { isBot: boolean }) => p.isBot),
      ).toHaveLength(1);
    });

    it('deletes the room, bots included, when the last human leaves', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 4,
        bots: 3,
      }).expect(201);
      await leave(alice, room.body.id).expect(204);
      await getRoom(alice, room.body.id).expect(404);
      const seats = await dataSource.query('SELECT count(*) FROM room_players');
      expect(Number(seats[0].count)).toBe(0);
    });

    it('keeps bots while at least one human remains', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 3,
        bots: 1,
      }).expect(201);
      await join(bob, room.body.id).expect(200);
      await leave(bob, room.body.id).expect(204);
      const res = await getRoom(alice, room.body.id).expect(200);
      expect(res.body.players).toHaveLength(2);
    });

    it('returns 404 for a user who is not in the room', async () => {
      const room = await createRoom(alice, {
        visibility: 'public',
        maxPlayers: 2,
      }).expect(201);
      await leave(bob, room.body.id).expect(404);
    });
  });
});
