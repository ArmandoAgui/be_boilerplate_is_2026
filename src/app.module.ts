import { ComunicadosModule } from './comunicados/comunicados.module.js';
import { ReservasModule } from './reservas/reservas.module.js';
import { VisitasModule } from './visitas/visitas.module.js';
import { CuotasModule } from './cuotas/cuotas.module.js';
import { PagosModule } from './pagos/pagos.module.js';
import { ReportesModule } from './reportes/reportes.module.js';
import { UnidadesModule } from './unidades/unidades.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@Auth';
import { JwtAuthGuard } from '@Auth/guards';
import { HealthModule } from '@Health';
import { PrismaModule } from '@Prisma';
import { UsersModule } from '@Users';
import { validateEnv } from '@Config';
import { IncidenciasModule } from '@Incidencias';
import { PaquetesModule } from './paquetes/paquetes.module.js';
import { AsambleasModule } from './asambleas/asambleas.module.js';
import { NotificacionesModule } from './notificaciones/notificaciones.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { DirectorioModule } from './directorio/directorio.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Si falta DATABASE_URL o JWT_SECRET, la app no arranca.
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ReservasModule,
    VisitasModule,
    CuotasModule,
    PagosModule,
    ReportesModule,
    ComunicadosModule,
    IncidenciasModule,
    AsambleasModule,
    UnidadesModule,
    PaquetesModule,
    NotificacionesModule,
    DirectorioModule,
  ],
  providers: [
    {
      // Todo cerrado por defecto: las rutas públicas se abren con @Public().
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
