import { Inject, Injectable } from '@nestjs/common';
import { REDIS_CLIENT, type RedisClient } from '../redis/redis.module.js';
import type { GameState } from '../game-engine/index.js';

export interface StoredSeat {
  seat: number;
  // null when a bot plays this seat
  userId: string | null;
}

// Everything a running game needs, as it is kept in Redis
export interface StoredGame {
  // Goes up by one on every change; a bot timer uses it to know it is still current
  version: number;
  state: GameState;
  seats: StoredSeat[];
}

// A game as it was read, with the exact text it was read as
export interface LoadedGame {
  raw: string;
  game: StoredGame;
}

// Lua runs atomically on Redis: the write happens only if the value is still what we read
const COMPARE_AND_SET = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
end
return 0
`;

// A game nobody has touched for this long is abandoned; every move renews it
const GAME_TTL_SECONDS = 10 * 60;

const keyOf = (roomId: string) => `game:${roomId}`;

@Injectable()
export class GameStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async load(roomId: string): Promise<LoadedGame | null> {
    const raw = await this.redis.get(keyOf(roomId));
    return raw === null ? null : { raw, game: JSON.parse(raw) as StoredGame };
  }

  // false if a game already exists for this room
  async create(roomId: string, game: StoredGame): Promise<boolean> {
    const result = await this.redis.set(
      keyOf(roomId),
      JSON.stringify(game),
      'EX',
      GAME_TTL_SECONDS,
      'NX',
    );
    return result === 'OK';
  }

  // false if the stored game changed since `current` was loaded
  async replace(
    roomId: string,
    current: LoadedGame,
    next: StoredGame,
  ): Promise<boolean> {
    const written = await this.redis.eval(
      COMPARE_AND_SET,
      1,
      keyOf(roomId),
      current.raw,
      JSON.stringify(next),
      GAME_TTL_SECONDS,
    );
    return written === 1;
  }

  async delete(roomId: string): Promise<void> {
    await this.redis.del(keyOf(roomId));
  }

  async exists(roomId: string): Promise<boolean> {
    return (await this.redis.exists(keyOf(roomId))) === 1;
  }
}
