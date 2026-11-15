import { Injectable } from '@nestjs/common';
import { resolverPasarela, type ResultadoPasarela } from './pagos.rules.js';

/**
 * H2: pasarela de pago simulada. No llama a ningún servicio externo; responde
 * según la tarjeta de prueba después de una espera fija, para imitar la
 * latencia de una pasarela real.
 */
@Injectable()
export class PasarelaSimuladaService {
  /** Espera simulada en milisegundos. Las pruebas la ponen en 0. */
  esperaMs = 2000;

  async cobrar(numeroTarjeta: string): Promise<ResultadoPasarela> {
    await new Promise((resolve) => setTimeout(resolve, this.esperaMs));
    return resolverPasarela(numeroTarjeta);
  }
}
