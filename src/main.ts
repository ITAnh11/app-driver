import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { IoAdapter } from '@nestjs/platform-socket.io';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sử dụng WebSocket adapter
  // app.useWebSocketAdapter(new WsAdapter(app));

  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({
    origin: '*', // tạm thời cho tất cả, kiểm thử
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
