import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { PaquetesRepository } from './paquetes.repository.js';
import type { MisPaquetesDto } from './dto/paquetes.dto.js';
@Injectable()
export class PaquetesService {
    constructor(private readonly repo: PaquetesRepository) { }
    private residente(user: User) { if (user.rol !== 'RESIDENTE') throw new ForbiddenException('No tienes permiso para consultar paquetes'); }
    async mios(user: User, q: MisPaquetesDto) {
        this.residente(user); const vinculo = await this.repo.vinculo(user.id, q.unidadId);
        if (!vinculo || !vinculo.unidad.activa) throw new ForbiddenException('La unidad no está vinculada o está inactiva');
        const [datos, total] = await this.repo.listar(q.unidadId, q.estado, q.pagina, q.tamanoPagina);
        return { datos, total, pagina: q.pagina, tamanoPagina: q.tamanoPagina };
    }
    async detalle(user: User, id: string) {
        this.residente(user); const p = await this.repo.detalle(id); if (!p) throw new NotFoundException('Paquete inexistente');
        const v = await this.repo.vinculo(user.id, p.unidadId); if (!v || !v.unidad.activa) throw new NotFoundException('Paquete inexistente');
        const { unidadId, ...dto } = p; return dto;
    }
}
