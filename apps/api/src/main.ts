import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Enable BigInt serialization for Prisma entities in JSON responses
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS: origin: true dynamically reflects request origin (safe with credentials: true)
  app.enableCors({
    origin: true,
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
  // Bind to 0.0.0.0 so all network interfaces (LAN Wi-Fi, localhost, containers) can connect
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API is running on: http://0.0.0.0:${port}/api`);
  logger.log(`📑 Swagger Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
