import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { User } from '@PrismaClient';
import { ReservasRepository } from '../repositories/reservas.repository.js';
import type {
  CrearAreaDto,
  EditarAreaDto,
  CrearReservaDto,
  ListarReservasDto,
} from '../dto/reservas.dto.js';
import {
  permitir,
  validarFecha,
  inicioLocal,
  HORA,
  dentroDeHorario,
  hayTraslape,
  validarReserva,
  validarHorarios,
} from './reservas.rules.js';

@Injectable()
export class ReservasService {
  static hayTraslape = hayTraslape;
  constructor(private readonly repo: ReservasRepository) {}
  async areas(user: User) {
    permitir(user.rol, 'RESIDENTE', 'ADMINISTRADOR');
    return { datos: await this.repo.areas(user.rol === 'ADMINISTRADOR') };
  }
  async unidades(user: User) {
    permitir(user.rol, 'RESIDENTE');
    return { datos: await this.repo.unidades(user.id) };
  }
  async disponibilidad(user: User, id: string, fecha: string) {
    permitir(user.rol, 'RESIDENTE', 'ADMINISTRADOR');
    validarFecha(fecha);
    return this.repo.transaccion(async (tx) => {
      // Lectura consistente con cambios de horarios y nuevas reservas del área.
      await tx.bloquearArea(id);
      const area = await tx.area(id);
      if (!area?.activa)
        throw new NotFoundException('Área inexistente o inactiva');
      const ahora = new Date();
      const desde = inicioLocal(fecha, '00:00');
      const reservas = await tx.ocupadas(
        id,
        desde,
        new Date(desde.getTime() + 24 * HORA),
      );
      const bloques = Array.from({ length: 24 }, (_, hora) => {
        const inicio = new Date(desde.getTime() + hora * HORA);
        const fin = new Date(inicio.getTime() + HORA);
        const ocupado = reservas.some((r) =>
          hayTraslape(inicio, fin, r.inicio, r.fin),
        );
        const estado = ocupado
          ? 'OCUPADO'
          : inicio < ahora || !dentroDeHorario(inicio, fin, area.horarios)
            ? 'FUERA_DE_HORARIO'
            : 'DISPONIBLE';
        return {
          inicio: `${String(hora).padStart(2, '0')}:00`,
          fin: `${String(hora + 1).padStart(2, '0')}:00`,
          estado,
        };
      });
      return { areaId: id, fecha, bloques };
    });
  }
  async crear(user: User, data: CrearReservaDto) {
    permitir(user.rol, 'RESIDENTE');
    return this.repo.transaccion(async (tx) => {
      await tx.bloquearUsuario(user.id);
      await tx.bloquearArea(data.areaId);
      const area = await tx.area(data.areaId);
      if (!area) throw new NotFoundException('Área inexistente');
      if (!area.activa) throw new BadRequestException('El área está inactiva');
      const ahora = new Date();
      const inicio = new Date(data.inicio);
      const fin = validarReserva(
        inicio,
        data.duracionHoras,
        data.asistentes,
        area.capacidad,
        area.horarios,
        ahora,
      );
      if ((await tx.futuras(user.id, ahora)) >= 2)
        throw new ConflictException('Ya tienes 2 reservas confirmadas futuras');
      if (
        (await tx.ocupadas(data.areaId, inicio, fin)).some((r) =>
          hayTraslape(inicio, fin, r.inicio, r.fin),
        )
      )
        throw new ConflictException(
          'Ese horario ya fue reservado. Elija otro.',
        );
      return tx.crear({
        areaId: area.id,
        userId: user.id,
        inicio,
        fin,
        asistentes: data.asistentes,
      });
    });
  }
  mias(user: User, query: ListarReservasDto) {
    permitir(user.rol, 'RESIDENTE');
    return this.repo.mias(user.id, query);
  }
  async cancelar(user: User, id: string) {
    permitir(user.rol, 'RESIDENTE');
    return this.repo.transaccion(async (tx) => {
      const reserva = await tx.reserva(id, user.id);
      if (!reserva) throw new NotFoundException('Reserva inexistente');
      await tx.bloquearUsuario(user.id);
      const ahora = new Date();
      if ((await tx.cancelar(id, user.id, ahora)).count !== 1)
        throw new ConflictException(
          'Solo se puede cancelar una reserva confirmada con 2 horas de anticipación',
        );
      return { id, estado: 'CANCELADA', canceladaAt: ahora };
    });
  }
  async guardarArea(
    user: User,
    data: CrearAreaDto | EditarAreaDto,
    id?: string,
  ) {
    permitir(user.rol, 'ADMINISTRADOR');
    if (data.horarios !== undefined) validarHorarios(data.horarios);
    try {
      return await this.repo.transaccion(async (tx) => {
        if (!id) return tx.crearArea(data as CrearAreaDto);
        await tx.bloquearArea(id);
        if (!(await tx.area(id)))
          throw new NotFoundException('Área inexistente');
        return tx.editarArea(id, data);
      });
    } catch (error) {
      return this.repo.traducirDuplicado(error);
    }
  }
}
