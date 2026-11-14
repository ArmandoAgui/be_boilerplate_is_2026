import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@PrismaClient';
import { EstadoNotificacion, ModuloOrigen } from '@PrismaClient';
import { CurrentUser } from '@Auth/decorators';
import {
  ListarNotificacionesQueryDto,
  NotificacionLeidaResponseDto,
  NotificacionesPaginaResponseDto,
} from '../dto/index.js';
import { ResidenteNotificacionesGuard } from '../guards/residente-notificaciones.guard.js';
import { NotificacionIdPipe } from '../pipes/notificacion-id.pipe.js';
import { BandejaNotificacionesService } from '../services/bandeja-notificaciones.service.js';
import {
  ApiAvisoNoEncontrado,
  ApiErroresAccesoNotificaciones,
  ApiErroresConsultaNotificaciones,
} from '../swagger/index.js';

const PAGINA_MAXIMA_SEGURA = Math.floor(Number.MAX_SAFE_INTEGER / 50) + 1;

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(ResidenteNotificacionesGuard)
export class NotificacionesController {
  constructor(private readonly bandeja: BandejaNotificacionesService) {}

  @Get('mias')
  @ApiOperation({
    summary: 'Consultar mis avisos',
    description:
      'Devuelve avisos del Residente autenticado, el total filtrado y el contador global de no leídas.',
  })
  @ApiQuery({
    name: 'moduloOrigen',
    required: false,
    enum: ModuloOrigen,
    enumName: 'ModuloOrigen',
    description: 'Limita los avisos a un módulo de origen.',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoNotificacion,
    enumName: 'EstadoNotificacion',
    description: 'Limita los avisos al estado indicado.',
  })
  @ApiQuery({
    name: 'pagina',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: PAGINA_MAXIMA_SEGURA,
      default: 1,
    },
    description: 'Entero seguro de página, comenzando en 1.',
  })
  @ApiQuery({
    name: 'tamanoPagina',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    description: 'Cantidad de resultados por página.',
  })
  @ApiOkResponse({
    description: 'Página de avisos y conteos del Residente autenticado.',
    type: NotificacionesPaginaResponseDto,
  })
  @ApiErroresConsultaNotificaciones()
  listarMias(
    @CurrentUser() user: User,
    @Query() query: ListarNotificacionesQueryDto,
  ): Promise<NotificacionesPaginaResponseDto> {
    return this.bandeja.listarMias(user.id, query);
  }

  @Patch(':id/lectura')
  @ApiOperation({
    summary: 'Marcar un aviso como leído',
    description:
      'Operación idempotente. Repetirla conserva la fecha original de lectura.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del aviso propio.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Aviso marcado como leído o ya leído.',
    type: NotificacionLeidaResponseDto,
  })
  @ApiErroresAccesoNotificaciones()
  @ApiAvisoNoEncontrado()
  marcarLeida(
    @CurrentUser() user: User,
    @Param('id', NotificacionIdPipe) id: string,
  ): Promise<NotificacionLeidaResponseDto> {
    return this.bandeja.marcarLeida(user.id, id);
  }
}
