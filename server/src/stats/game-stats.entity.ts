import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('game_stats')
export class GameStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 0 })
  totalMoves: number;

  @Column({ type: 'int', default: 0 })
  totalMacaoCalls: number;

  @Column({ type: 'int', default: 0 })
  totalPlayerWins: number;

  @Column({ type: 'int', default: 0 })
  totalComputerWins: number;
}
