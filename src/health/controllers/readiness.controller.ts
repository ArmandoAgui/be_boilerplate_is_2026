import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '@Auth/decorators';
import { PrismaService } from '@Prisma/services';

@Controller('health')
export class ReadinessController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Servicio no disponible');
    }
  }
}
