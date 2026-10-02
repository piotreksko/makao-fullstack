import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { RANKS, SUITS, type Rank, type Suit } from '../game-engine/index.js';

export const MAX_MESSAGE_LENGTH = 500;

export class RoomIdDto {
  @IsUUID()
  roomId: string;
}

export class SendMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, MAX_MESSAGE_LENGTH)
  text: string;
}

export class CardDto {
  @IsIn(RANKS)
  rank: Rank;

  @IsIn(SUITS)
  suit: Suit;
}

// Whether the cards fit, and whether a suit or demand is needed, is the game
// engine's decision; this only checks the shape of the message
export class PlayCardsDto {
  // At most one card of each suit can be played together
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SUITS.length)
  @ValidateNested({ each: true })
  @Type(() => CardDto)
  cards: CardDto[];

  // For an ace: the suit that must be played next
  @IsOptional()
  @IsIn(SUITS)
  suit?: Suit;

  // For a jack: the rank demanded, or null for no demand
  @IsOptional()
  @IsIn(RANKS)
  demand?: Rank | null;
}
