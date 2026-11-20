import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
// Misma forma de error que el resto del módulo de cuotas:
// { statusCode, error, message }.
import { ReservasHttpFilter } from '../../reservas/filters/reservas-http.filter.js';
import { CrearPagoDto } from '../dto/pagos.dto.js';
import { PagosService } from '../services/pagos.service.js';

@UseFilters(ReservasHttpFilter)
@ApiTags('pagos')
@ApiBearerAuth()
@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  /** H2: POST /api/v1/pagos → 201 con el resultado (APROBADO o RECHAZADO). */
  @Post()
  pagar(@CurrentUser() user: User, @Body() body: CrearPagoDto) {
    return this.service.pagar(user, body);
  }

  /** H2: GET /api/v1/pagos/:id → comprobante de un pago propio. */
  @Get(':id')
  detalle(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.detalle(user, id);
  }
}
