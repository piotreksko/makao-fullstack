import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './user.entity.js';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByDisplayNameWithHash(displayName: string): Promise<User | null> {
    return this.users.findOne({
      where: { displayName },
      select: { id: true, displayName: true, email: true, passwordHash: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  // The returned entity contains passwordHash; never send it to a client.
  async create(
    email: string,
    passwordHash: string,
    displayName: string,
  ): Promise<User> {
    try {
      return await this.users.save({ email, passwordHash, displayName });
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Display name or email already taken');
      }
      throw err;
    }
  }
}
