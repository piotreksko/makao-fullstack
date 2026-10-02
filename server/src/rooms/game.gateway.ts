import {
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Subscription } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';
import type { AuthUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import {
  IllegalMoveError,
  type IllegalMoveCode,
} from '../game-engine/index.js';
import { UserService } from '../user/user.service.js';
import { PlayCardsDto, RoomIdDto, SendMessageDto } from './game.dto.js';
import { GameUpdate, GamesService } from './games.service.js';
import { RoomEvent, RoomEvents } from './room-events.service.js';
import { RoomsService } from './rooms.service.js';

interface SocketData {
  user: AuthUser;
  roomId?: string;
}

type Ack<T> =
  | ({ ok: true } & T)
  | { ok: false; error: { status: number; message: string; code?: string } };

// A move that is malformed is a 400; one that is well-formed but not allowed
// right now (wrong turn, card does not fit, ...) conflicts with the game: 409
const BAD_REQUEST_CODES: readonly IllegalMoveCode[] = [
  'NO_CARDS',
  'CARD_NOT_IN_HAND',
  'MIXED_RANKS',
  'CHOICE_REQUIRED',
  'INVALID_CHOICE',
];

const roomChannel = (roomId: string) => `room:${roomId}`;
const userChannel = (userId: string) => `user:${userId}`;

const dataOf = (socket: Socket) => socket.data as SocketData;

async function parse<T extends object>(
  cls: new () => T,
  payload: unknown,
): Promise<T> {
  if (typeof payload !== 'object' || payload === null) {
    throw new BadRequestException('Payload must be an object');
  }
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    throw new BadRequestException(
      errors.flatMap((e) => Object.values(e.constraints ?? {})),
    );
  }
  return instance;
}

const messageOf = (err: HttpException): string => {
  const response = err.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: string | string[] }).message;
  return Array.isArray(message) ? message.join('; ') : (message ?? err.message);
};

// Client -> server events reply through the acknowledgement callback:
//   { ok: true, ... } or { ok: false, error: { status, message, code? } }
//   room:join, room:toggleReady, room:sendMessage, game:start, and the moves
//   game:playCards, game:drawCard, game:keepCard, game:wait
// Server -> client events: room:state, room:playerJoined, room:playerLeft,
// room:playerReady, room:message, room:left, game:started, and during a game
// game:state (that player's own view) and game:events (what just happened).
@WebSocketGateway({ namespace: 'game' })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  private readonly logger = new Logger(GameGateway.name);
  private namespace: Namespace;
  private subscription?: Subscription;
  private gameSubscription?: Subscription;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserService,
    private readonly rooms: RoomsService,
    private readonly games: GamesService,
    private readonly events: RoomEvents,
  ) {}

  afterInit(namespace: Namespace) {
    this.namespace = namespace;
    namespace.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        () => next(new Error('unauthorized')),
      );
    });
    this.subscription = this.events.events$.subscribe((event) => {
      this.broadcast(event).catch((err: unknown) =>
        this.logger.error(`Failed to broadcast ${event.type}`, err),
      );
    });
    this.gameSubscription = this.games.updates$.subscribe((update) =>
      this.broadcastGame(update),
    );
  }

  handleConnection(socket: Socket) {
    // Lets the server reach every tab/device of one user
    void socket.join(userChannel(dataOf(socket).user.id));
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
    this.gameSubscription?.unsubscribe();
  }

  @SubscribeMessage('room:join')
  joinRoom(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.handle(async () => {
      const { roomId } = await parse(RoomIdDto, body);
      const room = await this.rooms.getSeatedRoomView(
        dataOf(socket).user.id,
        roomId,
      );

      const previous = dataOf(socket).roomId;
      if (previous && previous !== roomId) {
        await socket.leave(roomChannel(previous));
      }
      await socket.join(roomChannel(roomId));
      dataOf(socket).roomId = roomId;
      // A game already under way is included, so a reconnecting player can resume
      return { room, game: this.games.getView(dataOf(socket).user.id, roomId) };
    });
  }

  @SubscribeMessage('room:toggleReady')
  toggleReady(@ConnectedSocket() socket: Socket) {
    return this.handle(async () => ({
      room: await this.rooms.toggleReady(
        dataOf(socket).user.id,
        this.currentRoom(socket),
      ),
    }));
  }

  @SubscribeMessage('game:start')
  startGame(@ConnectedSocket() socket: Socket) {
    return this.handle(async () => {
      const { user } = dataOf(socket);
      const roomId = this.currentRoom(socket);

      // The room checks who may start; then the game itself is dealt
      const room = await this.rooms.startGame(user.id, roomId);
      this.games.create(
        roomId,
        room.players.map((p) => ({ seat: p.seat, userId: p.user?.id ?? null })),
      );
      return { room, game: this.games.getView(user.id, roomId) };
    });
  }

  @SubscribeMessage('game:playCards')
  playCards(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.handle(async () => {
      const { cards, suit, demand } = await parse(PlayCardsDto, body);
      return this.move(socket, (userId, roomId) =>
        this.games.play(userId, roomId, cards, { suit, demand }),
      );
    });
  }

  @SubscribeMessage('game:drawCard')
  drawCard(@ConnectedSocket() socket: Socket) {
    return this.handle(async () =>
      this.move(socket, (userId, roomId) => this.games.draw(userId, roomId)),
    );
  }

  @SubscribeMessage('game:keepCard')
  keepCard(@ConnectedSocket() socket: Socket) {
    return this.handle(async () =>
      this.move(socket, (userId, roomId) =>
        this.games.keepDrawnCard(userId, roomId),
      ),
    );
  }

  @SubscribeMessage('game:wait')
  waitTurn(@ConnectedSocket() socket: Socket) {
    return this.handle(async () =>
      this.move(socket, (userId, roomId) => this.games.wait(userId, roomId)),
    );
  }

  @SubscribeMessage('room:sendMessage')
  sendMessage(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    return this.handle(async () => {
      const { text } = await parse(SendMessageDto, body);
      const { user } = dataOf(socket);
      const roomId = this.currentRoom(socket);
      // Membership is re-checked every time: seats can change after joining
      await this.rooms.requireSeat(user.id, roomId);

      this.namespace.to(roomChannel(roomId)).emit('room:message', {
        roomId,
        userId: user.id,
        displayName: user.displayName,
        text,
        sentAt: new Date().toISOString(),
      });
      return {};
    });
  }

  private async authenticate(socket: Socket): Promise<void> {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== 'string') throw new Error('missing token');

    const payload = await this.jwt.verifyAsync<JwtPayload>(token);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new Error('unknown user');

    socket.data = {
      user: { id: user.id, displayName: user.displayName },
    } satisfies SocketData;
  }

  // Runs a move for the socket's user in the room they joined. The result
  // reaches everyone through game:state / game:events; the acknowledgement
  // carries the mover's fresh view for convenience.
  private move(
    socket: Socket,
    action: (userId: string, roomId: string) => void,
  ) {
    const { user } = dataOf(socket);
    const roomId = this.currentRoom(socket);
    action(user.id, roomId);
    return { game: this.games.getView(user.id, roomId) };
  }

  private currentRoom(socket: Socket): string {
    const roomId = dataOf(socket).roomId;
    if (!roomId) throw new ConflictException('Join a room first');
    return roomId;
  }

  private async handle<T extends object>(
    fn: () => Promise<T>,
  ): Promise<Ack<T>> {
    try {
      return { ok: true, ...(await fn()) };
    } catch (err) {
      if (err instanceof HttpException) {
        return {
          ok: false,
          error: { status: err.getStatus(), message: messageOf(err) },
        };
      }
      if (err instanceof IllegalMoveError) {
        return {
          ok: false,
          error: {
            status: BAD_REQUEST_CODES.includes(err.code) ? 400 : 409,
            code: err.code,
            message: err.message,
          },
        };
      }
      this.logger.error('Unexpected error in socket handler', err);
      return {
        ok: false,
        error: { status: 500, message: 'Internal server error' },
      };
    }
  }

  // Each player gets only their own view (their hand, never another's); the
  // events of what just happened are public and go to the whole room
  private broadcastGame(update: GameUpdate): void {
    for (const { userId, view } of update.views) {
      this.namespace.to(userChannel(userId)).emit('game:state', view);
    }
    if (update.events.length > 0) {
      this.namespace
        .to(roomChannel(update.roomId))
        .emit('game:events', update.events);
    }
  }

  private async broadcast(event: RoomEvent): Promise<void> {
    const channel = roomChannel(event.roomId);

    switch (event.type) {
      case 'playerJoined':
        this.namespace.to(channel).emit('room:playerJoined', {
          userId: event.userId,
          displayName: event.displayName,
        });
        break;
      case 'playerLeft':
        // Tell the leaver, then drop their sockets so they stop hearing the room
        this.namespace
          .to(userChannel(event.userId))
          .emit('room:left', { roomId: event.roomId });
        this.namespace.in(userChannel(event.userId)).socketsLeave(channel);
        this.namespace.to(channel).emit('room:playerLeft', {
          userId: event.userId,
          displayName: event.displayName,
        });
        break;
      case 'playerReady':
        this.namespace.to(channel).emit('room:playerReady', {
          userId: event.userId,
          isReady: event.isReady,
        });
        break;
      case 'started':
        this.namespace
          .to(channel)
          .emit('game:started', { roomId: event.roomId });
        break;
      case 'changed':
        break;
    }

    // The snapshot is the source of truth; the events above are hints
    const room = await this.rooms.getRoomSnapshot(event.roomId);
    if (room) this.namespace.to(channel).emit('room:state', room);
  }
}
