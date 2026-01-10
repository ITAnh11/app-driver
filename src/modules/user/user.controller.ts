import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    @Post('register')
    async createUser(@Body() userData: any) {
        return this.userService.create(userData);
    }
}
