import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { GameStats } from './game-stats.entity.js';
import type { StatField } from './stats.types.js';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(GameStats)
    private readonly statsRepo: Repository<GameStats>,
  ) {}

  async getStats() {
    const existing = await this.statsRepo.findOneBy({});
    if (existing) return existing;
    return this.statsRepo.save(this.statsRepo.create());
  }

  async increment(field: StatField) {
    const stats = await this.getStats();
    stats[field]++;
    return this.statsRepo.save(stats);
  }
}
