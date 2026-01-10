import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserBlackList {
  @PrimaryGeneratedColumn()
  id: number;

  // Người block
  @ManyToOne(() => User, (user) => user.blockedUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  // Người bị block
  @ManyToOne(() => User, (user) => user.blockedBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: User;

  @CreateDateColumn()
  createdAt: Date;
}
