import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { GamePlayer } from './game-player.entity.js';
import { Room } from './room.entity.js';

// The result of one finished game; running games live in Redis (ADR 0010)
@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Relation<Room>;

  @CreateDateColumn()
  finishedAt: Date;

  @OneToMany(() => GamePlayer, (player) => player.game)
  players: Relation<GamePlayer[]>;
}
