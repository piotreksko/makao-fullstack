import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UserService } from '../user/user.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import type { JwtPayload } from './jwt.strategy.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.userService.create(
      dto.email,
      passwordHash,
      dto.displayName,
    );
    return { accessToken: await this.signToken(user.id, user.displayName) };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userService.findByDisplayNameWithHash(
      dto.displayName,
    );
    const valid =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid display name or password');
    }
    return { accessToken: await this.signToken(user.id, user.displayName) };
  }

  private signToken(userId: string, displayName: string): Promise<string> {
    const payload: JwtPayload = { sub: userId, displayName };
    return this.jwtService.signAsync(payload);
  }
}
