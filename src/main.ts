import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port", 4000);
  const apiPrefix = configService.get<string>("apiPrefix", "api");
  const corsOrigin = configService.get<string>(
  "corsOrigin",
  "http://localhost:3000",
  );

  // Global Prefix: /api
  app.setGlobalPrefix(apiPrefix);

  // CORS Configuration
  const origins = corsOrigin.includes(",")
    ? corsOrigin.split(",").map((s) => s.trim())
    : corsOrigin === "*"
      ? true
      : corsOrigin;

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  // Global Validation Pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);
  logger.log(`========================================================`);
  logger.log(`Recruitment Backend REST API listening on port ${port}`);
  logger.log(`API Base: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Health Check: http://localhost:${port}/${apiPrefix}/health`);
  logger.log(`========================================================`);
}

bootstrap();
