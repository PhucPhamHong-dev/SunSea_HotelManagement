import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  const config = new DocumentBuilder()
    .setTitle('SUNSEA Hotel Management API')
    .setVersion('0.1.0')
    .addCookieAuth('hotel_session')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  await writeFile('openapi.json', JSON.stringify(document, null, 2));
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
