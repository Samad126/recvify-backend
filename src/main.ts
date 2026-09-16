import { resolve } from 'node:path';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());

  // CV profile photos only — unlike UPLOAD_DIR (raw resumes, parsed then
  // discarded) and EXPORT_DIR (served through an authenticated download
  // route), photos need a plain <img src> the browser can load directly, so
  // they get their own public static directory with unguessable filenames.
  app.useStaticAssets(resolve(process.env.PHOTO_DIR ?? './photos'), { prefix: '/photos' });

  // Reflects any request origin instead of allowlisting one, so any frontend
  // (any port, any host) can call the API during testing. `credentials: true`
  // requires this (browsers reject `origin: '*'` with cookies) — tighten back
  // to FRONTEND_URL before deploying anywhere real.
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ReCvify API')
    .setDescription('AI-powered CV/resume builder API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'accessToken',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
