import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend interaction
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global route prefix
  app.setGlobalPrefix('api');

  // Swagger / OpenAPI 3.0 Documentation setup
  const config = new DocumentBuilder()
    .setTitle('Link-in-Bio Platform API')
    .setDescription('Scalable Link-in-Bio REST API specification')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 API is running on: http://localhost:${port}/api`);
  logger.log(`📑 Swagger Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
