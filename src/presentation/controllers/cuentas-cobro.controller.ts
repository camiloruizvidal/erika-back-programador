import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { JwtTenantGuard } from '../guards/jwt-tenant.guard';
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
  @UseGuards(JwtTenantGuard)
  @ApiOperation({
    summary: 'Generar cuentas de cobro',
    description:
      'Inicia el proceso asíncrono de generación de cuentas de cobro para paquetes activos con fecha de cobro en 5 días',
  })
  @ApiCreatedResponse({
    description: 'Proceso de generación iniciado exitosamente',
  })
  generarCuentasCobro(): { mensaje: string } {
    try {
      this.cuentasCobroService.generarCuentasCobro(5).catch((error) => {
        this.logger.error(
          `Error en proceso asíncrono de generación de cuentas de cobro: ${JSON.stringify(error)}`,
        );
      });

      return {
        mensaje: 'Proceso de generación de cuentas de cobro iniciado',
      };
    } catch (error) {
      this.logger.error({ error: JSON.stringify(error) });
      this.manejadorError.resolverErrorApi(error);
    }
  }
}
