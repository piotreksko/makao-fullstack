import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { isUniqueViolation } from '../common/pg-errors.js';
import { CreateRoomDto } from './rooms.dto.js';
import { RoomEvents } from './room-events.service.js';
import { RoomPlayer } from './room-player.entity.js';
import { Room } from './room.entity.js';
import {
  MIN_SEATS,
  RoomStatus,
  RoomView,
  RoomVisibility,
} from './rooms.types.js';

// No 0/O/1/I so codes are easy to read out loud
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_ATTEMPTS = 5;

const generateInviteCode = () =>
  Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)],
  ).join('');

// TypeORM loads no relations unless asked; buildRoomView needs all of these
const ROOM_RELATIONS = { createdBy: true, players: { user: true } } as const;

const isFull = (room: Room) => room.players.length >= room.maxPlayers;

const firstFreeSeat = (room: Room): number | undefined => {
  const taken = new Set(room.players.map((p) => p.seat));
  return [...Array(room.maxPlayers).keys()].find((seat) => !taken.has(seat));
};

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(RoomPlayer)
    private readonly players: Repository<RoomPlayer>,
    private readonly dataSource: DataSource,
    private readonly events: RoomEvents,
  ) {}

  async listPublic(userId: string): Promise<RoomView[]> {
    const rooms = await this.rooms.find({
      where: {
        visibility: RoomVisibility.Public,
        status: RoomStatus.Waiting,
      },
      relations: ROOM_RELATIONS,
      order: { createdAt: 'DESC' },
    });
    return rooms
      .filter((room) => !isFull(room))
      .map((room) => this.buildRoomView(room, userId));
  }

  async getRoomView(roomId: string, userId: string): Promise<RoomView> {
    const room = await this.findRoom(roomId);
    const isSeated = room?.players.some((p) => p.userId === userId);
    // Private rooms are hidden from non-players so their ids cannot be probed
    if (!room || (room.visibility === RoomVisibility.Private && !isSeated)) {
      throw new NotFoundException('Room not found');
    }
    return this.buildRoomView(room, userId);
  }

  // Like getRoomView, but only for players; everyone else gets a 404
  async getSeatedRoomView(userId: string, roomId: string): Promise<RoomView> {
    const room = await this.requireSeatedRoom(userId, roomId);
    return this.buildRoomView(room, userId);
  }

  async requireSeat(userId: string, roomId: string): Promise<void> {
    await this.requireSeatedRoom(userId, roomId);
  }

  // One view to broadcast to everyone in the room (all of them are players)
  async getRoomSnapshot(roomId: string): Promise<RoomView | null> {
    const room = await this.findRoom(roomId);
    return room ? this.buildRoomView(room, room.createdById) : null;
  }

  async create(userId: string, dto: CreateRoomDto): Promise<RoomView> {
    const bots = dto.bots ?? 0;
    // The host takes one seat, so at most every other seat can be a bot
    if (bots > dto.maxPlayers - 1) {
      throw new BadRequestException(
        `A ${dto.maxPlayers}-player room fits at most ${dto.maxPlayers - 1} bots`,
      );
    }
    await this.requireNotInActiveRoom(userId);

    const needsCode = dto.visibility === RoomVisibility.Private;

    for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt++) {
      try {
        const roomId = await this.dataSource.transaction(async (em) => {
          const room = await em.save(
            em.create(Room, {
              createdById: userId,
              visibility: dto.visibility,
              maxPlayers: dto.maxPlayers,
              inviteCode: needsCode ? generateInviteCode() : null,
            }),
          );
          await em.save(RoomPlayer, [
            em.create(RoomPlayer, { roomId: room.id, seat: 0, userId }),
            ...Array.from({ length: bots }, (_, i) =>
              em.create(RoomPlayer, {
                roomId: room.id,
                seat: i + 1,
                userId: null,
                isBot: true,
                isReady: true,
              }),
            ),
          ]);
          return room.id;
        });
        return this.getRoomView(roomId, userId);
      } catch (err) {
        // The only unique column on a brand-new room is its invite code
        if (!needsCode || !isUniqueViolation(err)) throw err;
      }
    }
    throw new ConflictException('Could not allocate an invite code, try again');
  }

  async join(
    userId: string,
    roomId: string,
    inviteCode?: string,
  ): Promise<RoomView> {
    const room = await this.findRoom(roomId);
    if (!room) throw new NotFoundException('Room not found');
    return this.seatPlayer(userId, room, inviteCode);
  }

  async joinByCode(userId: string, inviteCode: string): Promise<RoomView> {
    const room = await this.rooms.findOne({
      where: { inviteCode: inviteCode.toUpperCase() },
      relations: ROOM_RELATIONS,
    });
    if (!room) throw new NotFoundException('Room not found');
    return this.seatPlayer(userId, room, inviteCode);
  }

  async leave(userId: string, roomId: string): Promise<void> {
    const room = await this.requireSeatedRoom(userId, roomId);
    const me = room.players.find((p) => p.userId === userId)!;
    // Sorted by seat: the database returns players in no guaranteed order, and
    // the next host must not depend on it
    const otherHumans = room.players
      .filter((p) => !p.isBot && p.userId !== userId)
      .sort((a, b) => a.seat - b.seat);

    await this.dataSource.transaction(async (em) => {
      if (otherHumans.length === 0) {
        // A room needs a human; deleting it cascades to any bot seats
        await em.delete(Room, { id: room.id });
        return;
      }
      if (room.status === RoomStatus.InProgress) {
        // The seat is kept and a bot takes it over, so the hand and the turn
        // order survive; the engine (Phase 4) plays the hand for the bot
        await em.update(
          RoomPlayer,
          { roomId: room.id, seat: me.seat },
          { userId: null, isBot: true, isReady: true },
        );
      } else {
        await em.delete(RoomPlayer, { roomId: room.id, seat: me.seat });
      }
      if (room.createdById === userId) {
        await em.update(
          Room,
          { id: room.id },
          { createdById: otherHumans[0].userId! },
        );
      }
    });

    this.events.emit({
      type: 'playerLeft',
      roomId,
      userId,
      displayName: me.user?.displayName ?? '',
    });
  }

  async toggleReady(userId: string, roomId: string): Promise<RoomView> {
    const room = await this.requireSeatedRoom(userId, roomId);
    if (room.status !== RoomStatus.Waiting) {
      throw new ConflictException('Game already started');
    }
    const me = room.players.find((p) => p.userId === userId)!;
    const isReady = !me.isReady;

    await this.players.update({ roomId, seat: me.seat }, { isReady });
    this.events.emit({ type: 'playerReady', roomId, userId, isReady });
    return this.getRoomView(roomId, userId);
  }

  async startGame(userId: string, roomId: string): Promise<RoomView> {
    const room = await this.requireSeatedRoom(userId, roomId);
    // Checked here, on the server, because a hidden button is not a rule
    if (room.createdById !== userId) {
      throw new ForbiddenException('Only the host can start the game');
    }
    if (room.status !== RoomStatus.Waiting) {
      throw new ConflictException('Game already started');
    }
    if (room.players.length < MIN_SEATS) {
      throw new ConflictException('At least two players are needed');
    }
    if (room.players.some((p) => !p.isReady)) {
      throw new ConflictException('Everyone must be ready');
    }

    // Conditional update so two start requests can't both succeed
    const result = await this.rooms.update(
      { id: roomId, status: RoomStatus.Waiting },
      { status: RoomStatus.InProgress },
    );
    if (!result.affected) {
      throw new ConflictException('Game already started');
    }
    this.events.emit({ type: 'started', roomId });
    return this.getRoomView(roomId, userId);
  }

  async addBot(userId: string, roomId: string): Promise<RoomView> {
    const room = await this.requireHostedWaitingRoom(userId, roomId);
    const seat = firstFreeSeat(room);
    if (seat === undefined) throw new ConflictException('Room is full');

    try {
      await this.players.save(
        this.players.create({
          roomId,
          seat,
          userId: null,
          isBot: true,
          isReady: true,
        }),
      );
    } catch (err) {
      // A human took the seat between our read and our insert
      if (isUniqueViolation(err)) throw new ConflictException('Room is full');
      throw err;
    }
    this.events.emit({ type: 'changed', roomId });
    return this.getRoomView(roomId, userId);
  }

  async removeBot(
    userId: string,
    roomId: string,
    seat: number,
  ): Promise<RoomView> {
    const room = await this.requireHostedWaitingRoom(userId, roomId);
    const bot = room.players.find((p) => p.seat === seat && p.isBot);
    if (!bot) throw new NotFoundException('There is no bot on that seat');

    await this.players.delete({ roomId, seat });
    this.events.emit({ type: 'changed', roomId });
    return this.getRoomView(roomId, userId);
  }

  private async seatPlayer(
    userId: string,
    room: Room,
    inviteCode?: string,
  ): Promise<RoomView> {
    if (
      room.visibility === RoomVisibility.Private &&
      room.inviteCode !== inviteCode?.toUpperCase()
    ) {
      throw new ForbiddenException('Invalid invite code');
    }
    await this.requireNotInActiveRoom(userId);
    if (room.status !== RoomStatus.Waiting) {
      throw new ConflictException('Game already started');
    }
    const seat = firstFreeSeat(room);
    if (seat === undefined) throw new ConflictException('Room is full');

    try {
      await this.players.save(
        this.players.create({ roomId: room.id, seat, userId }),
      );
    } catch (err) {
      // Someone else took the seat between our read and our insert
      if (isUniqueViolation(err)) throw new ConflictException('Room is full');
      throw err;
    }

    const view = await this.getRoomView(room.id, userId);
    const me = view.players.find((p) => p.user?.id === userId);
    this.events.emit({
      type: 'playerJoined',
      roomId: room.id,
      userId,
      displayName: me?.user?.displayName ?? '',
    });
    return view;
  }

  private async requireSeatedRoom(
    userId: string,
    roomId: string,
  ): Promise<Room> {
    const room = await this.findRoom(roomId);
    if (!room || !room.players.some((p) => p.userId === userId)) {
      throw new NotFoundException('You are not in this room');
    }
    return room;
  }

  private async requireHostedWaitingRoom(
    userId: string,
    roomId: string,
  ): Promise<Room> {
    const room = await this.requireSeatedRoom(userId, roomId);
    if (room.createdById !== userId) {
      throw new ForbiddenException('Only the host can manage bots');
    }
    if (room.status !== RoomStatus.Waiting) {
      throw new ConflictException('Game already started');
    }
    return room;
  }

  private async requireNotInActiveRoom(userId: string): Promise<void> {
    const seats = await this.players
      .createQueryBuilder('p')
      .innerJoin('p.room', 'r')
      .where('p.userId = :userId', { userId })
      .andWhere('r.status != :finished', { finished: RoomStatus.Finished })
      .getCount();
    if (seats > 0) {
      throw new ConflictException('You are already in a room');
    }
  }

  private findRoom(roomId: string): Promise<Room | null> {
    return this.rooms.findOne({
      where: { id: roomId },
      relations: ROOM_RELATIONS,
    });
  }

  private buildRoomView(room: Room, userId: string): RoomView {
    const players = [...room.players]
      .sort((a, b) => a.seat - b.seat)
      .map((p) => ({
        seat: p.seat,
        isBot: p.isBot,
        isReady: p.isReady,
        user: p.user
          ? { id: p.user.id, displayName: p.user.displayName }
          : null,
      }));
    const isSeated = players.some((p) => p.user?.id === userId);

    return {
      id: room.id,
      visibility: room.visibility,
      status: room.status,
      maxPlayers: room.maxPlayers,
      inviteCode: isSeated ? room.inviteCode : null,
      host: {
        id: room.createdBy.id,
        displayName: room.createdBy.displayName,
      },
      players,
      createdAt: room.createdAt,
    };
  }
}
