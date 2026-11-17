import { ReadinessController } from './controllers/readiness.controller.js';
import { Module } from '@nestjs/common';
import { HealthController } from '@Health/controllers';
import { HealthService } from '@Health/services';

@Module({
  controllers: [HealthController, ReadinessController],
  providers: [HealthService],
})
export class HealthModule {}
