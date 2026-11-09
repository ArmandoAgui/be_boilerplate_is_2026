import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '@PrismaClient';
import { CurrentUser } from '@Auth/decorators';
import type { Response } from 'express';
import {
  CATEGORIAS_INCIDENCIA,
  CrearIncidenciaDto,
  LUGARES_INCIDENCIA,
} from '../dto/crear-incidencia.dto.js';
import { IncidenciaCreadaDto } from '../dto/incidencia-creada.dto.js';
import { IncidenciasHttpFilter } from '../filters/incidencias-http.filter.js';
import { ResidenteIncidenciasGuard } from '../guards/residente-incidencias.guard.js';
import { FotosIncidenciaInterceptor } from '../interceptors/fotos-incidencia.interceptor.js';
import { IncidenciasService } from '../services/incidencias.service.js';

@ApiTags('Incidencias')
@ApiBearerAuth()
@Controller('incidencias')
@UseFilters(IncidenciasHttpFilter)
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

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
