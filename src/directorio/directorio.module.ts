import { Module } from '@nestjs/common';
import { DirectorioController } from './directorio.controller.js';
import { DirectorioService } from './directorio.service.js';
import { DirectorioRepository } from './directorio.repository.js';

@Module({
  controllers: [DirectorioController],
  providers: [DirectorioService, DirectorioRepository],
})
export class DirectorioModule {}
