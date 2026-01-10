import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { BlackListService } from './black-list.service';
import { CreateBlackListDto } from './dto/create-black-list.dto';
import { UpdateBlackListDto } from './dto/update-black-list.dto';
import { get } from 'http';
import { JwtAccessAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('blackList')
export class BlackListController {
  constructor(private readonly blackListService: BlackListService) {}

  @UseGuards(JwtAccessAuthGuard)
  @Post()
  blockUser(@Request() req, @Body() blockUser: any) {
    const userId = req.user.id; // Lấy userId từ request
    return this.blackListService.blockUser(userId, blockUser.blockedId);
  }

  @UseGuards(JwtAccessAuthGuard)
  @Get()
  getBlockedUsers(@Request() req) {
    const userId = req.user.id; // Lấy userId từ request
    return this.blackListService.getBlockedUsers(userId);
  }

  @UseGuards(JwtAccessAuthGuard)
  @Delete()
  unblockUser(@Request() req, @Body() unblockUser: any) {
    const userId = req.user.id; // Lấy userId từ request
    return this.blackListService.unblockUser(userId, unblockUser.blockedId);
  }

}
