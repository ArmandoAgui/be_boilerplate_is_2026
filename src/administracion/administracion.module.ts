import { Module } from '@nestjs/common';
import {
  AdministracionController,
  OperacionesPaquetesController,
} from './administracion.controller.js';
import { AdministracionService } from './administracion.service.js';
import { OperacionesPaquetesService } from '../paquetes/operaciones-paquetes.service.js';
@Module({
  controllers: [AdministracionController, OperacionesPaquetesController],
  providers: [AdministracionService, OperacionesPaquetesService],
})
export class AdministracionModule {}
