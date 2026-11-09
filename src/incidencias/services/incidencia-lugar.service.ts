import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { CrearIncidenciaDto } from '../dto/crear-incidencia.dto.js';
import {
  AreaIncidenciaInactivaError,
  AreaIncidenciaInexistenteError,
  LugarIncidenciaInvalidoError,
  UnidadIncidenciaAjenaError,
  UnidadIncidenciaInexistenteError,
} from '../errors/incidencias.errors.js';
import { IncidenciasRepository } from '../repositories/incidencias.repository.js';

/** Comprueba existencia, actividad y pertenencia antes de persistir H9. */
@Injectable()
export class IncidenciaLugarService {
  constructor(private readonly incidenciasRepository: IncidenciasRepository) {}

  async validar(
    residenteId: string,
    { lugarTipo, unidadId, areaId }: CrearIncidenciaDto,
  ): Promise<void> {
    if (lugarTipo === 'UNIDAD') {
      if (!unidadId || areaId !== undefined || !isUUID(unidadId)) {
        throw new LugarIncidenciaInvalidoError();
      }

      const unidad = await this.incidenciasRepository.findUnitAccess(
        unidadId,
        residenteId,
      );
      if (!unidad.existe) throw new UnidadIncidenciaInexistenteError();
      if (!unidad.vinculada) throw new UnidadIncidenciaAjenaError();
      return;
    }

    if (lugarTipo === 'AREA_COMUN') {
      if (!areaId || unidadId !== undefined || !isUUID(areaId)) {
        throw new LugarIncidenciaInvalidoError();
      }

      const area = await this.incidenciasRepository.findAreaAccess(areaId);
      if (!area) throw new AreaIncidenciaInexistenteError();
      if (!area.activa) throw new AreaIncidenciaInactivaError();
      return;
    }

    throw new LugarIncidenciaInvalidoError();
  }
}
