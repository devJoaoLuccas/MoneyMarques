import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
