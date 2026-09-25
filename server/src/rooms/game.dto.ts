import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

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
