import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { formatearErroresValidacion } from './utils/functions/formatear-errores-validacion';
import { Config } from './infrastructure/config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const mensajesValidaciones = formatearErroresValidacion(errors);
        return new BadRequestException(mensajesValidaciones);
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Erika Programador API')
    .setDescription('Endpoints para programación de tareas y automatizaciones')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(Config.puerto);
  logger.log(
    `Aplicación erika-back-programador corriendo en el puerto ${Config.puerto}`,
  );
}
bootstrap();
