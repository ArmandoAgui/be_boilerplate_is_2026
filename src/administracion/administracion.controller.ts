import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { AdministracionService } from './administracion.service.js';
import { OperacionesPaquetesService } from '../paquetes/operaciones-paquetes.service.js';
import {
  VinculoDto,
  AjusteCuotaDto,
  PaginaAdminDto,
  EntregaDto,
  CorreccionPaqueteDto,
} from './administracion.dto.js';
@Controller('administracion')
export class AdministracionController {
  constructor(private readonly service: AdministracionService) {}
  @Get('vinculos') catalogos(@CurrentUser() u: User) {
    return this.service.catalogos(u);
  }
  @Post('vinculos') vincular(@CurrentUser() u: User, @Body() d: VinculoDto) {
    return this.service.vincular(u, d);
  }
  @Get('cuotas') cuotas(@CurrentUser() u: User, @Query() q: PaginaAdminDto) {
    return this.service.cuotas(u, q);
  }
  @Patch('cuotas/:id') ajustar(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AjusteCuotaDto,
  ) {
    return this.service.ajustarCuota(u, id, d);
  }
  @Get('unidades/:id/residentes') residentes(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.residentesUnidad(u, id);
  }
}
@Controller('paquetes')
export class OperacionesPaquetesController {
  constructor(private readonly service: OperacionesPaquetesService) {}
  @Get(':id/residentes') residentes(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.residentesPaquete(u, id);
  }
  @Post(':id/entrega') entregar(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: EntregaDto,
  ) {
    return this.service.entregar(u, id, d);
  }
  @Patch(':id/correccion') corregir(
    @CurrentUser() u: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: CorreccionPaqueteDto,
  ) {
    return this.service.corregir(u, id, d);
  }
}
