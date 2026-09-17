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
  // Global Prefix: /api
  app.setGlobalPrefix(apiPrefix);

  // CORS Configuration - explicit allowlist
  const allowedOrigins = [
    "http://localhost:3000",
    "https://assessment.ngstellar.com",
  ];

  const configuredCorsOrigin = configService.get<string>("corsOrigin");
  if (configuredCorsOrigin && configuredCorsOrigin !== "*") {
    configuredCorsOrigin
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !allowedOrigins.includes(s))
      .forEach((origin) => allowedOrigins.push(origin));
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    optionsSuccessStatus: 204,
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
