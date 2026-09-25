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
import { UserService } from '../user/user.service.js';
import { RoomIdDto, SendMessageDto } from './game.dto.js';
import { RoomEvent, RoomEvents } from './room-events.service.js';
import { RoomsService } from './rooms.service.js';

interface SocketData {
  user: AuthUser;
  roomId?: string;
}

type Ack<T> =
  | ({ ok: true } & T)
  | { ok: false; error: { status: number; message: string } };

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
//   { ok: true, ... } or { ok: false, error: { status, message } }
// Server -> client events: room:state, room:playerJoined, room:playerLeft,
// room:playerReady, room:message, room:left, game:started.
@WebSocketGateway({ namespace: 'game' })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  private readonly logger = new Logger(GameGateway.name);
  private namespace: Namespace;
  private subscription?: Subscription;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserService,
    private readonly rooms: RoomsService,
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
  }

  handleConnection(socket: Socket) {
    // Lets the server reach every tab/device of one user
    void socket.join(userChannel(dataOf(socket).user.id));
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
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
      return { room };
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
    return this.handle(async () => ({
      room: await this.rooms.startGame(
        dataOf(socket).user.id,
        this.currentRoom(socket),
      ),
    }));
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
      this.logger.error('Unexpected error in socket handler', err);
      return {
        ok: false,
        error: { status: 500, message: 'Internal server error' },
      };
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
