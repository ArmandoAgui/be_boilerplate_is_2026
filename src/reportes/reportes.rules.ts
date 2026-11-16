import { BadRequestException } from '@nestjs/common';
export const DIA = 86400000;
export function rangoReporte(desde: string, hasta: string) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!fecha.test(desde) || !fecha.test(hasta))
    throw new BadRequestException('Indica fechas AAAA-MM-DD');
  const a = new Date(desde + 'T00:00:00Z'),
    b = new Date(hasta + 'T00:00:00Z');
  if (
    !Number.isFinite(a.getTime()) ||
    !Number.isFinite(b.getTime()) ||
    a.toISOString().slice(0, 10) !== desde ||
    b.toISOString().slice(0, 10) !== hasta ||
    b < a ||
    (b.getTime() - a.getTime()) / DIA + 1 > 366
  )
    throw new BadRequestException(
      'El rango debe ser válido, ordenado y de hasta 366 días incluidos',
    );
  return {
    desde,
    hasta,
    inicio: new Date(a.getTime() + 6 * 3600000),
    fin: new Date(b.getTime() + DIA + 6 * 3600000),
    fechaDesde: a,
    fechaHasta: b,
  };
}
export function horasHabilitadas(
  desde: string,
  hasta: string,
  areas: {
    horarios: { diaSemana: number; horaInicio: string; horaFin: string }[];
  }[],
) {
  const r = rangoReporte(desde, hasta);
  let horas = 0;
  for (let d = r.fechaDesde.getTime(); d <= r.fechaHasta.getTime(); d += DIA) {
    const dia = new Date(d).getUTCDay();
    for (const a of areas)
      for (const h of a.horarios)
        if (h.diaSemana === dia) {
          const minutos = (s: string) =>
            Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
          horas += (minutos(h.horaFin) - minutos(h.horaInicio)) / 60;
        }
  }
  return horas;
}
export const redondear = (n: number) => Math.round(n * 10) / 10;
// Small self-contained PDF: fixed font, escaping, page overflow and byte-accurate xref.
export function pdfTexto(entrada: string[]): Buffer {
  const lineas = entrada.flatMap((linea) => {
    if (!linea) return [''];
    const resultado: string[] = [];
    let actual = '';
    for (const palabra of linea.split(/\s+/)) {
      if (actual.length + palabra.length + 1 > 85) {
        resultado.push(actual);
        actual = palabra;
      } else actual += (actual ? ' ' : '') + palabra;
    }
    if (actual) resultado.push(actual);
    return resultado;
  });
  const clean = (s: string) =>
    Array.from(s)
      .map((c) => {
        const n = c.codePointAt(0)!;
        if (c === '\\' || c === '(' || c === ')') return '\\' + c;
        if (n >= 32 && n <= 126) return c;
        if (n >= 160 && n <= 255) return '\\' + n.toString(8).padStart(3, '0');
        return ' ';
      })
      .join('');
  const paginas: string[][] = [];
  for (let i = 0; i < lineas.length; i += 42)
    paginas.push(lineas.slice(i, i + 42));
  const objetos: string[] = [
    '',
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  const ids: number[] = [];
  for (const l of paginas) {
    const pagina = objetos.length,
      contenido = pagina + 1;
    ids.push(pagina);
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contenido} 0 R >>`,
    );
    const stream = `BT /F1 11 Tf 48 744 Td 16 TL\n${l.map((x, i) => (i ? 'T* ' : '') + `(${clean(x)}) Tj`).join('\n')}\nET`;
    objetos.push(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  objetos[2] = `<< /Type /Pages /Count ${ids.length} /Kids [${ids.map((id) => id + ' 0 R').join(' ')}] >>`;
  let out = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objetos.length; i++) {
    offsets[i] = Buffer.byteLength(out);
    out += `${i} 0 obj\n${objetos[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out);
  out +=
    `xref\n0 ${objetos.length}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
      .join('') +
    `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}
