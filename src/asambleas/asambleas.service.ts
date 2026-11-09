import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@PrismaClient';
import type { User } from '@PrismaClient';
import { AsambleasRepository } from './asambleas.repository.js';
import type { CrearAsambleaDto, VotarDto } from './dto/asambleas.dto.js';
@Injectable()
export class AsambleasService {
 constructor(private readonly repo:AsambleasRepository){}
 private permitir(user:User,rol:'RESIDENTE'|'ADMINISTRADOR'){if(user.rol!==rol)throw new ForbiddenException('No tienes permiso para realizar esta operación');}
 async crear(user:User,d:CrearAsambleaDto){
  this.permitir(user,'ADMINISTRADOR'); const now=new Date(), fecha=new Date(d.fechaAt);
  if(fecha<=now)throw new BadRequestException('La fecha de asamblea debe ser posterior a ahora');
  const temas=d.temas??[];
  for(const t of temas){const a=new Date(t.aperturaAt),c=new Date(t.cierreAt); if(a<now)throw new BadRequestException('La apertura no puede ser anterior a ahora'); if(c<=a)throw new BadRequestException('El cierre debe ser posterior a la apertura'); if(t.opciones.length<2||t.opciones.length>10)throw new BadRequestException('Cada tema necesita entre 2 y 10 opciones'); if(new Set(t.opciones.map(x=>x.trim().toLocaleLowerCase())).size!==t.opciones.length)throw new BadRequestException('Las opciones deben ser únicas');}
  return this.repo.crear(user.id,{titulo:d.titulo.trim(),fechaAt:fecha,descripcion:d.descripcion?.trim(),temas:temas.map(t=>({...t,pregunta:t.pregunta.trim(),aperturaAt:new Date(t.aperturaAt),cierreAt:new Date(t.cierreAt),opciones:t.opciones.map(x=>x.trim())}))});
 }
 async publicar(user:User,id:string){this.permitir(user,'ADMINISTRADOR'); const a=await this.repo.una(id);if(!a)throw new NotFoundException('Asamblea inexistente');if(a.estado!=='BORRADOR')throw new ConflictException('No se puede editar ni publicar una asamblea publicada');if(!a.temas.length)throw new BadRequestException('La asamblea debe incluir al menos un tema');const now=new Date();for(const t of a.temas){if(t.aperturaAt<now||t.cierreAt<=t.aperturaAt||t.opciones.length<2||t.opciones.length>10)throw new BadRequestException('Cada tema necesita fechas válidas y entre 2 y 10 opciones');}if((await this.repo.publicar(id)).count!==1)throw new ConflictException('La asamblea ya fue publicada');return {id,estado:'PUBLICADA',mensaje:'Asamblea publicada'};}
 async listar(user:User){if(user.rol!=='RESIDENTE'&&user.rol!=='ADMINISTRADOR')throw new ForbiddenException();const rows=await this.repo.listar();const now=new Date();return rows.map(a=>({...a,temas:a.temas.map(t=>({...t,estado:now<t.aperturaAt?'PUBLICADA':now<=t.cierreAt?'ABIERTO':'CERRADO'}))}));}
 async miEstado(user:User,temaId:string,unidadId:string){this.permitir(user,'RESIDENTE');const tema=await this.repo.tema(temaId);if(!tema)throw new NotFoundException('Tema inexistente');if(!await this.repo.unidadActivaVinculada(user.id,unidadId))throw new ForbiddenException('La unidad no está activa o vinculada');const p=await this.repo.estadoVoto(temaId,unidadId);return {temaId,unidadId,yaVoto:!!p,fecha:p?.createdAt??null};}
 async votar(user:User,temaId:string,d:VotarDto){this.permitir(user,'RESIDENTE');const tema=await this.repo.tema(temaId);if(!tema)throw new NotFoundException('Tema inexistente');if(!await this.repo.unidadActivaVinculada(user.id,d.unidadId))throw new ForbiddenException('La unidad no está activa o vinculada');const now=new Date();if(tema.asamblea.estado!=='PUBLICADA'||now<tema.aperturaAt||now>tema.cierreAt)throw new ConflictException('Este tema no está abierto para votar');if(!tema.opciones.some(o=>o.id===d.opcionId))throw new BadRequestException('La opción no pertenece al tema');try{const p=await this.repo.votar(temaId,d.unidadId,d.opcionId);if(!p)throw new NotFoundException('Tema inexistente');if('opcionInvalida'in p)throw new BadRequestException('La opción no pertenece al tema');return {id:p.id,temaId:p.temaId,unidadId:p.unidadId,fecha:p.createdAt};}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw new ConflictException('Tu unidad ya votó en este tema');throw e;}}
}
