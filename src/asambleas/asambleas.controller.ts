import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { AsambleasService } from './asambleas.service.js';
import { CrearAsambleaDto, MiEstadoVotoDto, VotarDto } from './dto/asambleas.dto.js';
@Controller()
export class AsambleasController {
 constructor(private readonly service:AsambleasService){}
 @Get('asambleas') listar(@CurrentUser() user:User){return this.service.listar(user);}
 @Post('asambleas') crear(@CurrentUser() user:User,@Body() d:CrearAsambleaDto){return this.service.crear(user,d);}
 @Post('asambleas/:id/publicacion') publicar(@CurrentUser() user:User,@Param('id') id:string){return this.service.publicar(user,id);}
 @Get('votaciones/:temaId/miestado') estado(@CurrentUser() user:User,@Param('temaId') id:string,@Query() q:MiEstadoVotoDto){return this.service.miEstado(user,id,q.unidadId);}
 @Post('votaciones/:temaId/votos') votar(@CurrentUser() user:User,@Param('temaId') id:string,@Body() d:VotarDto){return this.service.votar(user,id,d);}
}
