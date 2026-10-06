import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GamePlayer } from './game-player.entity.js';
import { Game } from './game.entity.js';

// Keeps the outcome of finished games in Postgres
@Injectable()
export class GameResults {
  constructor(private readonly dataSource: DataSource) {}

  // `userIdsByPlace[0]` is who came first; null is a bot
  async record(
    roomId: string,
    userIdsByPlace: readonly (string | null)[],
  ): Promise<void> {
    // The game and its players are saved together or not at all
    await this.dataSource.transaction(async (em) => {
      const game = await em.save(em.create(Game, { roomId }));
      await em.save(
        userIdsByPlace.map((userId, index) =>
          em.create(GamePlayer, { gameId: game.id, place: index + 1, userId }),
        ),
      );
    });
  }
}
