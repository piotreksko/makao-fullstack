import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { User } from '../user/user.entity.js';
import { Game } from './game.entity.js';
import { MAX_SEATS } from './rooms.types.js';

// Who finished where. (gameId, place) is the key, so a place is given once
// per game. A null user is a bot (or a seat a bot took over).
@Entity('game_players')
@Check(`"place" BETWEEN 1 AND ${MAX_SEATS}`)
export class GamePlayer {
  @PrimaryColumn({ type: 'uuid' })
  gameId: string;

  @PrimaryColumn({ type: 'smallint' })
  place: number;

  @ManyToOne(() => Game, (game) => game.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Relation<Game>;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User> | null;
}
