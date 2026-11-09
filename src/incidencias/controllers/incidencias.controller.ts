import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '@PrismaClient';
import { EstadoIncidencia, Prioridad } from '@PrismaClient';
import { CurrentUser } from '@Auth/decorators';
import type { Response } from 'express';
import {
  CATEGORIAS_INCIDENCIA,
  CrearIncidenciaDto,
  LUGARES_INCIDENCIA,
} from '../dto/crear-incidencia.dto.js';
import { ActualizarAsignacionDto } from '../dto/actualizar-asignacion.dto.js';
import { AsignacionActualizadaDto } from '../dto/asignacion-actualizada.dto.js';
import { IncidenciaCreadaDto } from '../dto/incidencia-creada.dto.js';
import { IncidenciaErrorDto } from '../dto/incidencia-error.dto.js';
import { IncidenciaIdParamsDto } from '../dto/incidencia-id-params.dto.js';
import { ListarIncidenciasDto } from '../dto/listar-incidencias.dto.js';
import { ListarResponsablesDto } from '../dto/listar-responsables.dto.js';
import { ListadoIncidenciasDto } from '../dto/incidencia-listado.dto.js';
import { ListadoResponsablesDto } from '../dto/responsable-incidencia.dto.js';
import { IncidenciasHttpFilter } from '../filters/incidencias-http.filter.js';
import { AdministradorIncidenciasGuard } from '../guards/administrador-incidencias.guard.js';
import { ResidenteIncidenciasGuard } from '../guards/residente-incidencias.guard.js';
import { FotosIncidenciaInterceptor } from '../interceptors/fotos-incidencia.interceptor.js';
import { ActualizarAsignacionBodyPipe } from '../pipes/actualizar-asignacion-body.pipe.js';
import { IncidenciasService } from '../services/incidencias.service.js';

const PAGINA_MAXIMA_SEGURA = Math.floor(Number.MAX_SAFE_INTEGER / 50) + 1;

@ApiTags('Incidencias')
@ApiBearerAuth()
@Controller('incidencias')
@UseFilters(IncidenciasHttpFilter)
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Get('responsables')
  @UseGuards(AdministradorIncidenciasGuard)
  @ApiOperation({
    summary: 'Listar responsables elegibles',
    description:
      'Endpoint de soporte del selector H10. Devuelve solo administradores y personal de Seguridad activos, con los campos mínimos id/nombre y sin filtros de rol del cliente. Recorra las páginas para cargar todos los candidatos.',
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
    description: 'Página de candidatos mínimos para el selector.',
    type: ListadoResponsablesDto,
  })
  @ApiBadRequestResponse({
    description: 'Paginación no escalar, repetida, desconocida o inválida.',
    type: IncidenciaErrorDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer ausente, inválido o expirado; usuario inactivo.',
    type: IncidenciaErrorDto,
  })
  @ApiForbiddenResponse({
    description: 'Solo un administrador puede consultar responsables.',
    type: IncidenciaErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'No se pudo completar la consulta de responsables.',
    type: IncidenciaErrorDto,
  })
  async listarResponsables(
    @CurrentUser() usuario: User,
    @Query() query: ListarResponsablesDto,
  ): Promise<ListadoResponsablesDto> {
    return this.incidenciasService.listarResponsablesAdministrativamente(
      usuario.id,
      query,
    );
  }

  @Get()
  @UseGuards(AdministradorIncidenciasGuard)
  @ApiOperation({
    summary: 'Listar incidencias para administración',
    description:
      'Aplica filtros y paginación en el servidor antes de ordenar y limitar los resultados. El orden es URGENTE, ALTA, MEDIA, BAJA y sin prioridad (null al final); dentro de cada grupo, createdAt ascendente y luego id ascendente como desempate estable.',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoIncidencia,
    description:
      'Filtro exacto de estado; se combina con prioridad mediante AND.',
  })
  @ApiQuery({
    name: 'prioridad',
    required: false,
    enum: Prioridad,
    description:
      'Filtro exacto de prioridad; omitirlo incluye las prioridades null.',
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
    description: 'Página administrativa y total antes de paginar.',
    type: ListadoIncidenciasDto,
  })
  @ApiBadRequestResponse({
    description:
      'Estado/prioridad fuera de enum, query no escalar/repetida/desconocida o paginación inválida.',
    type: IncidenciaErrorDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer ausente, inválido o expirado; usuario inactivo.',
    type: IncidenciaErrorDto,
  })
  @ApiForbiddenResponse({
    description: 'Solo un administrador puede listar incidencias.',
    type: IncidenciaErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'No se pudo completar la consulta de incidencias.',
    type: IncidenciaErrorDto,
  })
  async listarAdministrativamente(
    @CurrentUser() usuario: User,
    @Query() query: ListarIncidenciasDto,
  ): Promise<ListadoIncidenciasDto> {
    return this.incidenciasService.listarAdministrativamente(usuario.id, query);
  }

  @Patch(':id/asignacion')
  @UseGuards(AdministradorIncidenciasGuard)
  @ApiOperation({
    summary: 'Priorizar y asignar una incidencia',
    description:
      'Actualiza prioridad y/o responsable en una transacción. Enviar al menos una propiedad; cada propiedad es opcional, pero null no es válido. La incidencia ABIERTA pasa a ASIGNADA cuando cambia su responsable; una incidencia RESUELTA no se puede modificar. La respuesta solo incluye id, prioridad, responsable y estado, sin historial.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'UUID de la incidencia que se va a priorizar o asignar.',
  })
  @ApiBody({
    type: ActualizarAsignacionDto,
    required: true,
    description:
      'Objeto JSON no vacío, sin propiedades adicionales. Incluir prioridad, responsableId o ambos. Prioridad acepta BAJA, MEDIA, ALTA o URGENTE; responsableId debe ser UUID activo de ADMINISTRADOR o SEGURIDAD. Omitir conserva el valor actual; null se rechaza.',
  })
  @ApiOkResponse({
    description: 'Asignación actualizada después de confirmar la transacción.',
    type: AsignacionActualizadaDto,
  })
  @ApiBadRequestResponse({
    description:
      'UUID de ruta inválido; body vacío/no objeto/con campos extra; prioridad inválida o null; responsableId inválido, inexistente, inactivo o con rol no elegible.',
    type: IncidenciaErrorDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'Bearer ausente, inválido o expirado; cuenta inexistente o inactiva.',
    type: IncidenciaErrorDto,
  })
  @ApiForbiddenResponse({
    description: 'Solo un administrador puede modificar asignaciones.',
    type: IncidenciaErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'La incidencia no existe.',
    type: IncidenciaErrorDto,
  })
  @ApiConflictResponse({
    description: 'La incidencia está RESUELTA; no se modifica ningún campo.',
    type: IncidenciaErrorDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'No se pudo completar la asignación.',
    type: IncidenciaErrorDto,
  })
  async actualizarAsignacion(
    @Param() params: IncidenciaIdParamsDto,
    @Body(ActualizarAsignacionBodyPipe) cuerpo: unknown,
    @CurrentUser() usuario: User,
  ): Promise<AsignacionActualizadaDto> {
    return this.incidenciasService.actualizarAsignacion(
      usuario.id,
      params.id,
      cuerpo as ActualizarAsignacionDto,
    );
  }

  @Post()
  @UseGuards(ResidenteIncidenciasGuard)
  @UseInterceptors(FotosIncidenciaInterceptor)
  @ApiOperation({
    summary: 'Reportar una incidencia',
    description:
      'Crea una incidencia en una unidad vinculada o área común activa, con hasta tres fotografías JPG/PNG opcionales.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['lugarTipo', 'categoria', 'descripcion'],
      properties: {
        lugarTipo: {
          type: 'string',
          enum: [...LUGARES_INCIDENCIA],
          description: 'UNIDAD requiere unidadId; AREA_COMUN requiere areaId.',
        },
        unidadId: {
          type: 'string',
          format: 'uuid',
          description: 'Obligatorio solo cuando lugarTipo es UNIDAD.',
        },
        areaId: {
          type: 'string',
          format: 'uuid',
          description: 'Obligatorio solo cuando lugarTipo es AREA_COMUN.',
        },
        categoria: {
          type: 'string',
          enum: [...CATEGORIAS_INCIDENCIA],
        },
        descripcion: {
          type: 'string',
          minLength: 10,
          maxLength: 500,
        },
        fotos: {
          type: 'array',
          maxItems: 3,
          description: 'JPG o PNG reales, máximo 5 MiB por imagen.',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Incidencia registrada con enlaces privados a sus evidencias.',
    type: IncidenciaCreadaDto,
  })
  @ApiBadRequestResponse({
    description: 'Campos, destino o fotografías inválidos.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta una sesión válida o está inactiva.',
  })
  @ApiForbiddenResponse({
    description: 'Solo un residente puede reportar incidencias.',
  })
  @ApiNotFoundResponse({
    description: 'La unidad o el área indicada no existe.',
  })
  @ApiInternalServerErrorResponse({
    description: 'No se pudo guardar la incidencia o sus evidencias.',
  })
  async crear(
    @CurrentUser() usuario: User,
    @Body() dto: CrearIncidenciaDto,
    @UploadedFiles() fotos?: Express.Multer.File[],
  ): Promise<IncidenciaCreadaDto> {
    return this.incidenciasService.crear(usuario.id, dto, fotos);
  }

  @Get(':incidenciaId/evidencias/:evidenciaId')
  @ApiOperation({
    summary: 'Leer una evidencia privada de una incidencia',
    description:
      'Solo accede el residente autor, un administrador o Seguridad asignada. Requiere sesión Bearer; la URL no concede acceso por sí sola. Next.js debe reenviar la credencial de la sesión HttpOnly al solicitar o proxificar la imagen.',
  })
  @ApiParam({
    name: 'incidenciaId',
    description: 'UUID de la incidencia propietaria de la evidencia.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'evidenciaId',
    description: 'UUID de la evidencia dentro de la incidencia.',
    format: 'uuid',
  })
  @ApiProduces('image/jpeg', 'image/png')
  @ApiOkResponse({
    description: 'Bytes de la imagen, servidos de forma privada.',
    content: {
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiBadRequestResponse({
    description: 'Uno de los UUID de la ruta es inválido.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta una sesión válida o está inactiva.',
  })
  @ApiNotFoundResponse({
    description:
      'La evidencia no existe, no corresponde a la incidencia o el usuario no puede leerla.',
  })
  @ApiInternalServerErrorResponse({
    description: 'No se pudo leer la evidencia almacenada.',
  })
  async leerEvidencia(
    @Param('incidenciaId') incidenciaId: string,
    @Param('evidenciaId') evidenciaId: string,
    @CurrentUser() usuario: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const evidencia = await this.incidenciasService.leerEvidencia(
      usuario.id,
      incidenciaId,
      evidenciaId,
    );

    response.setHeader('Content-Type', evidencia.mimeType);
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');

    return new StreamableFile(evidencia.stream, {
      type: evidencia.mimeType,
      disposition: 'inline',
    });
  }
}
