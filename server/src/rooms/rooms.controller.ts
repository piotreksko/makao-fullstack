import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateRoomDto, JoinByCodeDto, JoinRoomDto } from './rooms.dto.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.roomsService.listPublic(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateRoomDto) {
    return this.roomsService.create(user.id, body);
  }

  @Post('join-by-code')
  @HttpCode(200)
  joinByCode(@CurrentUser() user: AuthUser, @Body() body: JoinByCodeDto) {
    return this.roomsService.joinByCode(user.id, body.inviteCode);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.getView(id, user.id);
  }

  @Post(':id/join')
  @HttpCode(200)
  join(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: JoinRoomDto,
  ) {
    return this.roomsService.join(user.id, id, body.inviteCode);
  }

  @Post(':id/bots')
  @HttpCode(200)
  addBot(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roomsService.addBot(user.id, id);
  }

  @Delete(':id/bots/:seat')
  removeBot(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('seat', ParseIntPipe) seat: number,
  ) {
    return this.roomsService.removeBot(user.id, id, seat);
  }

  @Post(':id/leave')
  @HttpCode(204)
  async leave(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.roomsService.leave(user.id, id);
  }
}
