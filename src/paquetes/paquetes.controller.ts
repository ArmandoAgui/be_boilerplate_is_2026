import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { PaquetesService } from './paquetes.service.js';
import { MisPaquetesDto } from './dto/paquetes.dto.js';
@Controller('paquetes')
export class PaquetesController {
 constructor(private readonly service:PaquetesService){}
 @Get('mios') mios(@CurrentUser() user:User,@Query() q:MisPaquetesDto){return this.service.mios(user,q);}
 @Get(':id') detalle(@CurrentUser() user:User,@Param('id') id:string){return this.service.detalle(user,id);}
}
