import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { UserModule } from '../user/user.module.js';
import { GameGateway } from './game.gateway.js';
import { RoomEvents } from './room-events.service.js';
import { RoomPlayer } from './room-player.entity.js';
import { Room } from './room.entity.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomPlayer]),
    AuthModule,
    UserModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService, RoomEvents, GameGateway],
})
export class RoomsModule {}
