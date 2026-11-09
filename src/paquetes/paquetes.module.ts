import { Module } from '@nestjs/common';
import { PaquetesController } from './paquetes.controller.js';
import { PaquetesService } from './paquetes.service.js';
import { PaquetesRepository } from './paquetes.repository.js';
@Module({controllers:[PaquetesController],providers:[PaquetesService,PaquetesRepository]})
export class PaquetesModule{}
