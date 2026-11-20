import { ApiProperty } from '@nestjs/swagger';

export class EvidenciaIncidenciaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'URL relativa de lectura autenticada de esta evidencia.',
    example:
      '/api/v1/incidencias/6cbf93f1-8d6d-49c2-9fea-7192cf79f242/evidencias/57e40f29-08b1-46c5-a68f-93e1f1d2c93c',
  })
  url!: string;

  static fromId(incidenciaId: string, evidenciaId: string): EvidenciaIncidenciaDto {
    return {
      id: evidenciaId,
      url: `/api/v1/incidencias/${incidenciaId}/evidencias/${evidenciaId}`,
    };
  }
}
