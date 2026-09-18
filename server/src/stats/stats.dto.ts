import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { StatField } from './stats.types.js';

const STAT_FIELDS: StatField[] = [
  'totalMoves',
  'totalMacaoCalls',
  'totalPlayerWins',
  'totalComputerWins',
];

export class IncrementStatDto {
  @ApiProperty({ enum: STAT_FIELDS })
  @IsIn(STAT_FIELDS)
  field: StatField;
}
