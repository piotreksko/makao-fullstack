import { Body, Controller, Get, Post } from '@nestjs/common';
import { StatsService } from './stats.service.js';
import { IncrementStatDto } from './stats.dto.js';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats() {
    return this.statsService.getStats();
  }

  @Post('increment')
  increment(@Body() body: IncrementStatDto) {
    return this.statsService.increment(body.field);
  }
}
