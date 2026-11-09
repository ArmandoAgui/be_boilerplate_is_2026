import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
@Injectable()
export class PaquetesRepository {
 constructor(private readonly prisma: PrismaService) {}
 vinculo(userId:string, unidadId:string) { return this.prisma.usuarioUnidad.findUnique({where:{userId_unidadId:{userId,unidadId}},select:{id:true,unidad:{select:{activa:true}}}}); }
 listar(unidadId:string, estado:'PENDIENTE'|'ENTREGADO', pagina:number, tamanoPagina:number) {
  const where={unidadId,estado};
  return this.prisma.$transaction([
   this.prisma.paquete.findMany({where,orderBy: estado==='PENDIENTE'?[{recibidoAt:'asc'},{id:'asc'}]:[{entregadoAt:'desc'},{id:'asc'}],skip:(pagina-1)*tamanoPagina,take:tamanoPagina,select:{id:true,codigo:true,empresa:true,descripcion:true,recibidoAt:true,estado:true,entregadoAt:true,retiraNombre:true}}),
   this.prisma.paquete.count({where})
  ],{isolationLevel:'RepeatableRead'});
 }
 detalle(id:string) { return this.prisma.paquete.findUnique({where:{id},select:{id:true,codigo:true,empresa:true,descripcion:true,recibidoAt:true,estado:true,entregadoAt:true,retiraNombre:true,unidadId:true}}); }
}
