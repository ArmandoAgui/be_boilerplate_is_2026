import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { ComunicadosRepository } from './comunicados.repository.js';
import { AvisosComunicados } from './avisos-comunicados.service.js';
import type {
  AudienciaComunicadoDto,
  CrearComunicadoDto,
  PaginaComunicadosDto,
} from './comunicados.dto.js';
@Injectable()
export class ComunicadosService {
  private readonly log = new Logger(ComunicadosService.name);
  constructor(
    private readonly repo: ComunicadosRepository,
    private readonly avisos: AvisosComunicados,
  ) {}
  private administrador(user: User) {
    if (user.rol !== 'ADMINISTRADOR')
      throw new ForbiddenException(
        'No tienes permiso para realizar esta operación',
      );
  }
  torres(user: User) {
    this.administrador(user);
    return this.repo.torres().then((datos) => ({ datos }));
  }
  previa(user: User, dto: AudienciaComunicadoDto) {
    this.administrador(user);
    return this.repo.previa(dto);
  }
  administracion(user: User, query: PaginaComunicadosDto) {
    this.administrador(user);
    return this.repo.administracion(query);
  }
  private residente(user: User) {
    if (user.rol !== 'RESIDENTE')
      throw new ForbiddenException(
        'No tienes permiso para realizar esta operación',
      );
  }
  mios(user: User, query: PaginaComunicadosDto) {
    this.residente(user);
    return this.repo.mios(user.id, query);
  }
  detalle(user: User, id: string) {
    this.residente(user);
    return this.repo.detalle(user.id, id);
  }
  async crear(user: User, dto: CrearComunicadoDto) {
    this.administrador(user);
    const creado = await this.repo.crear(user.id, dto);
    // La transacción ya terminó: un fallo de H28 nunca despublica el comunicado.
    try {
      await this.avisos.crear({
        destinatario: {
          tipo: dto.alcance,
          ...(dto.destinoId ? { id: dto.destinoId } : {}),
        },
        tipoEvento: 'COMUNICADO_NUEVO',
        titulo: 'Nuevo comunicado',
        mensaje: dto.titulo,
        moduloOrigen: 'COMUNICADOS',
        referenciaId: creado.id,
        claveEvento: `COMUNICADO_NUEVO:${creado.id}`,
      });
    } catch (error) {
      this.log.error(
        `El comunicado ${creado.id} sigue publicado; no se pudo enviar COMUNICADO_NUEVO`,
        error,
      );
    }
    return creado;
  }
}
