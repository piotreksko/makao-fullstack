import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'citext', unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'citext', unique: true })
  displayName: string;

  @CreateDateColumn()
  createdAt: Date;
}
