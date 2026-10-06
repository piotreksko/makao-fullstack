import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { UserModule } from '../user/user.module.js';
import { GameGateway } from './game.gateway.js';
import { GamePlayer } from './game-player.entity.js';
import { GameResults } from './game-results.service.js';
import { GameStore } from './game-store.js';
import { Game } from './game.entity.js';
import { GAME_RNG, GamesService } from './games.service.js';
import { RoomEvents } from './room-events.service.js';
import { RoomPlayer } from './room-player.entity.js';
import { Room } from './room.entity.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomPlayer, Game, GamePlayer]),
    AuthModule,
    RedisModule,
    UserModule,
  ],
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomEvents,
    GameStore,
    GameResults,
    GamesService,
    { provide: GAME_RNG, useValue: Math.random },
    GameGateway,
  ],
})
export class RoomsModule {}
