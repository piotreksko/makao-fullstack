import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStats } from './game-stats.entity.js';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([GameStats])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
