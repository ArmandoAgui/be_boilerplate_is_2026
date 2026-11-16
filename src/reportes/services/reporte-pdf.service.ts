import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { User } from '@PrismaClient';
import { soloRoles } from '../../cuotas/services/cuotas.rules.js';
import {
  contenidoReporte,
  nombreArchivo,
  type ContenidoReporte,
} from './reporte-pdf.contenido.js';
import type { Rango } from './reportes.rules.js';
import { ReportesService } from './reportes.service.js';

const COLOR_TEXTO = '#23382d';
const COLOR_SUAVE = '#506458';
const COLOR_LINEA = '#bdcbbf';

/**
 * H30: reporte descargable. Usa ReportesService.calcular (el mismo cálculo
 * del panel de H29), así los valores del PDF son iguales a los del panel.
 * El archivo se arma en memoria y no se guarda en el servidor.
 */
@Injectable()
export class ReportePdfService {
  constructor(private readonly reportes: ReportesService) {}

  async generar(
    user: User,
    rango: Rango,
    ahora = new Date(),
  ): Promise<{ archivo: Buffer; nombre: string }> {
    soloRoles(user.rol, 'ADMINISTRADOR');
    const resumen = await this.reportes.calcular(rango, ahora);
    const archivo = await dibujarPdf(
      contenidoReporte(resumen, user.nombre),
      ahora,
    );
    return { archivo, nombre: nombreArchivo(rango) };
  }
}

/** Dibuja el contenido con pdfkit y junta el resultado en un Buffer. */
export function dibujarPdf(c: ContenidoReporte, ahora: Date): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 56,
    info: {
      Title: `${c.titulo} (${c.periodo})`,
      Author: c.generadoPor,
      CreationDate: ahora,
    },
  });
  const partes: Buffer[] = [];
  const listo = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (parte: Buffer) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });

  const ancho = doc.page.width - 2 * 56;

  doc
    .fillColor(COLOR_SUAVE)
    .font('Helvetica')
    .fontSize(10)
    .text('Nuestra comunidad');
  doc.moveDown(0.2);
  doc.fillColor(COLOR_TEXTO).font('Helvetica-Bold').fontSize(18).text(c.titulo);
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(10);
  for (const [etiqueta, valor] of [
    ['Período', c.periodo],
    ['Generado', c.generado],
    ['Generado por', c.generadoPor],
  ])
    doc
      .fillColor(COLOR_SUAVE)
      .text(`${etiqueta}: `, { continued: true })
      .fillColor(COLOR_TEXTO)
      .text(valor);

  for (const ind of c.indicadores) {
    doc.moveDown(0.8);
    const y = doc.y;
    doc
      .moveTo(56, y)
      .lineTo(56 + ancho, y)
      .strokeColor(COLOR_LINEA)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.6);
    doc.fillColor(COLOR_SUAVE).font('Helvetica').fontSize(11).text(ind.titulo);
    doc
      .fillColor(COLOR_TEXTO)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(ind.valor);
    doc.font('Helvetica').fontSize(10).text(ind.detalle, { width: ancho });
    doc.moveDown(0.3);
    doc
      .fillColor(COLOR_SUAVE)
      .fontSize(9)
      .text(`Fórmula: ${ind.formula}`, { width: ancho })
      .text(`Origen: ${ind.origen}`, { width: ancho });
  }

  doc.moveDown(1.2);
  doc.fillColor(COLOR_SUAVE).fontSize(8).text(c.nota, { width: ancho });
  doc.end();
  return listo;
}
