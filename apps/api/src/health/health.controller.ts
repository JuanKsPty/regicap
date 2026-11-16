import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async estado() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { estado: 'ok', hora: new Date().toISOString() };
  }
}
