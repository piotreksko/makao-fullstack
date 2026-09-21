import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../user/user.entity.js';
import { RoomPlayer } from './room-player.entity.js';
import {
  MAX_SEATS,
  MIN_SEATS,
  RoomStatus,
  RoomVisibility,
} from './rooms.types.js';

@Entity('rooms')
@Check(`"maxPlayers" BETWEEN ${MIN_SEATS} AND ${MAX_SEATS}`)
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 8, unique: true, nullable: true })
  inviteCode: string | null;

  @Column({
    type: 'enum',
    enum: RoomVisibility,
    default: RoomVisibility.Public,
  })
  visibility: RoomVisibility;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.Waiting })
  status: RoomStatus;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: Relation<User>;

  @Column({ type: 'smallint', default: MIN_SEATS })
  maxPlayers: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => RoomPlayer, (player) => player.room)
  players: Relation<RoomPlayer[]>;
}
