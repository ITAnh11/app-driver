import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { Message } from './message.schema';

@Controller('message')
export class MessageController {
	constructor(private readonly messageService: MessageService) {}

	// Tạo tin nhắn mới (dùng cho cả trip và private)
	@Post()
	async createMessage(@Body() data: Partial<Message>) {
		return this.messageService.create(data);
	}

	// Lấy tin nhắn theo tripId
	@Get('trip')
	async getTripMessages(@Query('tripId') tripId: string) {
		return this.messageService.findByTrip(tripId);
	}

	// Lấy tin nhắn riêng giữa 2 user
	@Get('private')
	async getPrivateMessages(@Query('senderId') senderId: string, @Query('receiverId') receiverId: string) {
		return this.messageService.findPrivate(senderId, receiverId);
	}
}
