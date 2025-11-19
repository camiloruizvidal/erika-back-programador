import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class GenerarCuentasCobroResponseDto {
  @ApiProperty({
    description: 'Mensaje de confirmación del proceso iniciado',
    type: String,
    example: 'Proceso de generación de cuentas de cobro iniciado',
  })
  @Expose()
  mensaje!: string;
}
