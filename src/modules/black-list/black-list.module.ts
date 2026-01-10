import { Module } from '@nestjs/common';
import { BlackListService } from './black-list.service';
import { BlackListController } from './black-list.controller';
import { UserBlackList } from 'src/entities/userBlackList.entity';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

@Module({
  controllers: [BlackListController],
  providers: [BlackListService],
  exports: [BlackListService],
  imports: [PassportModule, TypeOrmModule.forFeature([User, UserBlackList])],
})
export class BlackListModule {}
