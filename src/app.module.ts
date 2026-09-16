import path from 'node:path';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './common/database/database.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { RedisService } from './common/redis/redis.service.js';
import { MailModule } from './common/mail/mail.module.js';
import { ThrottlerStorageRedisService } from './common/throttler/throttler-storage-redis.service.js';
import { JwtAccessGuard } from './common/guards/jwt-access.guard.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';
import { CvsModule } from './modules/cvs/cvs.module.js';
import { GeminiModule } from './common/gemini/gemini.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), '../.env'),
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [{ ttl: 60_000, limit: 60 }],
        storage: new ThrottlerStorageRedisService(redisService),
      }),
    }),
    DatabaseModule,
    RedisModule,
    MailModule,
    GeminiModule,
    AuthModule,
    UsersModule,
    TemplatesModule,
    CvsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
