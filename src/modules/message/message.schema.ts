import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true })
  senderId: string;

  @Prop()
  receiverId?: string; // Dùng cho nhắn riêng

  @Prop()
  tripId?: string; // Dùng cho nhắn trong trip

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'trip' }) // 'trip' hoặc 'private'
  type: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);