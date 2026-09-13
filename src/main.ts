import 'dotenv/config';

import { env } from '@/config/env.config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';

async function bootstrap() {
  /**
   * Crear la aplicación NestJS utilizando el módulo principal AppModule.
   * Se especifica que la aplicación es de tipo NestExpressApplication
   * para aprovechar las características específicas de Express.
   */
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /** Swagger */
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API documentation for the application')
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  /**
   * Coors
   */
  app.enableCors({
    origin: '*', // Permitir solicitudes desde cualquier origen
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Métodos HTTP permitidos
    preflightContinue: false, // No pasar la solicitud de preflight a la siguiente función de middleware
    // optionsSuccessStatus: 204, // Respuesta para solicitudes de preflight exitosas
  });
  /**
   * Configurar la aplicación para usar tuberías de validación globales.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: validationExceptionFactory,
    }),
  );
  /**
   * Iniciar el servidor en el puerto especificado en las variables de entorno o en el puerto 3000 por defecto.
   * El servidor escuchará en todas las interfaces de red
   */
  await app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${env.PORT}`);
  });

  /**
   * Obtener el adaptador HTTP de la aplicación para acceder a la instancia del servidor Express.
   * Luego, se accede al enrutador del servidor para obtener la lista de rutas disponibles.
   * Se mapea cada capa del enrutador para extraer el método HTTP y la ruta, y se filtran los elementos indefinidos.
   * Finalmente, se muestra la tabla de rutas disponibles en la consola.
   */
  const server = app.getHttpAdapter().getInstance();
  const router = server.router;
  const availableRoutes = router.stack
    .map((layer) => {
      if (layer.route) {
        return {
          path: layer.route?.path,
          method: layer.route?.stack[0].method,
        };
      }
    })
    .filter((item) => item !== undefined);
  console.table(availableRoutes);
}
/**
 * Iniciar la función bootstrap y manejar cualquier error que pueda ocurrir durante el inicio del servidor.
 */
bootstrap().catch((error) => {
  console.error('Error starting the server:', error);
  throw error;
});
