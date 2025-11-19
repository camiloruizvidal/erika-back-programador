import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class GenerarPdfPruebaResponseDto {
  @ApiProperty({
    description: 'URL o ruta del PDF generado',
    type: String,
    example: 'https://storage.erika.com/cuentas-cobro/1_6265642.pdf',
  })
  @Expose()
  urlPdf!: string;
}
