import { INestApplicationContext } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';
import { REDIS_CLIENT, type RedisClient } from '../redis/redis.module.js';
import { CorsIoAdapter } from './cors-io.adapter.js';

// Broadcasts go through Redis, so every backend instance delivers them to its own sockets
export class RedisIoAdapter extends CorsIoAdapter {
  private readonly redisAdapter: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext, origin: string) {
    super(app, origin);
    // One connection publishes, the duplicate subscribes
    const pubClient = app.get<RedisClient>(REDIS_CLIENT);
    const subClient = pubClient.duplicate();
    this.redisAdapter = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.redisAdapter);
    return server;
  }
}
