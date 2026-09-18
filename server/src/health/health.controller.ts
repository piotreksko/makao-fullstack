import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { REDIS_CLIENT, type RedisClient } from '../redis/redis.module.js';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  @Get()
  async check() {
    const [postgres, redis] = await Promise.all([
      this.dataSource
        .query('SELECT 1')
        .then(() => true)
        .catch(() => false),
      this.redis
        .ping()
        .then(() => true)
        .catch(() => false),
    ]);

    if (!postgres || !redis) {
      throw new ServiceUnavailableException({ postgres, redis });
    }

    return { status: 'ok', postgres, redis };
  }
}
