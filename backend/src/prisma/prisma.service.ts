import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('Variavel de ambiente DATABASE_URL ausente.');
    }

    const url = new URL(databaseUrl);
    const schema = url.searchParams.get('schema') ?? 'public';
    url.searchParams.delete('schema');

    super({
      adapter: new PrismaPg({ connectionString: url.toString() }, { schema }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
