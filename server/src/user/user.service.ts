import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../common/pg-errors.js';
import { User } from './user.entity.js';

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
      if (isUniqueViolation(err)) {
        throw new ConflictException('Display name or email already taken');
      }
      throw err;
    }
  }
}
