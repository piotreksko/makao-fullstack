import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MAX_SEATS, MIN_SEATS, RoomVisibility } from './rooms.types.js';

export class CreateRoomDto {
  @ApiProperty({ enum: RoomVisibility })
  @IsEnum(RoomVisibility)
  visibility: RoomVisibility;

  @ApiProperty({ minimum: MIN_SEATS, maximum: MAX_SEATS })
  @IsInt()
  @Min(MIN_SEATS)
  @Max(MAX_SEATS)
  maxPlayers: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: MAX_SEATS - 1,
    default: 0,
    description: 'Bots seated at creation; the host always keeps one seat',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_SEATS - 1)
  bots?: number;
}

export class JoinRoomDto {
  @ApiPropertyOptional({ description: 'Required for private rooms' })
  @IsOptional()
  @IsString()
  @Length(8, 8)
  inviteCode?: string;
}

export class JoinByCodeDto {
  @ApiProperty()
  @IsString()
  @Length(8, 8)
  inviteCode: string;
}
