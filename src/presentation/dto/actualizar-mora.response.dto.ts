import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ActualizarMoraResponseDto {
  @ApiProperty({
    description: 'Número de cuentas actualizadas a estado mora',
    type: Number,
    example: 5,
  })
  @Expose({ name: 'cuentasActualizadas' })
  cuentasActualizadas!: number;

  @ApiProperty({
    description: 'Mensaje descriptivo del resultado',
    type: String,
    example: 'Se actualizaron 5 cuentas de cobro a estado mora',
  })
  @Expose({ name: 'mensaje' })
  mensaje!: string;
}

