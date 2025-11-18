import { Controller, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { CuentasCobroService } from '../../application/services/cuentas-cobro.service';
import { ManejadorError } from '../../utils/manejador-error/manejador-error';

@ApiTags('Cuentas de Cobro')
@Controller('api/v1/billing')
export class CuentasCobroController {
  private readonly logger = new Logger(CuentasCobroController.name);

  constructor(
    private readonly cuentasCobroService: CuentasCobroService,
    private readonly manejadorError: ManejadorError,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generar cuentas de cobro',
    description:
      'Inicia el proceso asíncrono de generación de cuentas de cobro. Este endpoint llama a erika-back-cobros para comenzar el proceso completo.',
  })
  @ApiCreatedResponse({
    description: 'Proceso de generación iniciado exitosamente',
    schema: {
      type: 'object',
      properties: {
        mensaje: {
          type: 'string',
          example: 'Proceso de generación de cuentas de cobro iniciado',
        },
      },
    },
  })
  async generarCuentasCobro(): Promise<{ mensaje: string }> {
    Logger.verbose(
      '✅ PROGRAMADOR: Se recibió petición POST /api/v1/billing/generate',
      'CuentasCobroController',
    );
    try {
      return await this.cuentasCobroService.iniciarGeneracionCuentasCobro();
    } catch (error) {
      this.logger.error({ error: JSON.stringify(error) });
      this.manejadorError.resolverErrorApi(error);
    }
  }
}
