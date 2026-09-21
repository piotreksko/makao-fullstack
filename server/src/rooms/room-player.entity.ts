import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity.js';
import { Room } from './room.entity.js';
import { MAX_SEATS } from './rooms.types.js';

// (roomId, seat) is the primary key, so two users racing for the same seat
// cannot both succeed: the database rejects the second insert.
@Entity('room_players')
@Unique(['roomId', 'userId'])
@Check(`"seat" BETWEEN 0 AND ${MAX_SEATS - 1}`)
export class RoomPlayer {
  @PrimaryColumn({ type: 'uuid' })
  roomId: string;

  @PrimaryColumn({ type: 'smallint' })
  seat: number;

  @ManyToOne(() => Room, (room) => room.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Relation<Room>;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User> | null;

  @Column({ type: 'boolean', default: false })
  isBot: boolean;

  @Column({ type: 'boolean', default: false })
  isReady: boolean;
}
