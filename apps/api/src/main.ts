import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env.APP_BASE_URL ?? "http://localhost:3000",
    credentials: true,
  });

  // Reject unknown fields and coerce types at the boundary — never trust
  // client input, per docs/ARCHITECTURE.md §7.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix("api/v1");

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
}

bootstrap();
