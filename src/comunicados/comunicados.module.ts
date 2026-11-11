import { Module } from '@nestjs/common';
import {
  ComunicadosController,
  TorresComunicadosController,
} from './comunicados.controller.js';
import { ComunicadosService } from './comunicados.service.js';
import { ComunicadosRepository } from './comunicados.repository.js';
import { AvisosComunicados } from './avisos-comunicados.service.js';
@Module({
  controllers: [ComunicadosController, TorresComunicadosController],
  providers: [ComunicadosService, ComunicadosRepository, AvisosComunicados],
})
export class ComunicadosModule {}
