import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;
  // Railway proxies to $PORT on 0.0.0.0 — default listen can refuse edge traffic.
  await app.listen(port, "0.0.0.0");
}

bootstrap();
