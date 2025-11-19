import type { Response } from 'express';
import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiNoContentResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CuentasCobroService } from '../../application/services/cuentas-cobro.service';
import { ManejadorError } from '../../utils/manejador-error/manejador-error';
import { GenerarCuentasCobroResponseDto } from '../dto/generar-cuentas-cobro.response.dto';

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
    type: GenerarCuentasCobroResponseDto,
  })
  async generarCuentasCobro(): Promise<GenerarCuentasCobroResponseDto> {
    Logger.verbose(
      '✅ PROGRAMADOR: Se recibió petición POST /api/v1/billing/generate',
      'CuentasCobroController',
    );
    try {
      const resultado =
        await this.cuentasCobroService.iniciarGeneracionCuentasCobro();
      return plainToInstance(GenerarCuentasCobroResponseDto, resultado);
    } catch (error) {
      this.logger.error({ error: JSON.stringify(error) });
      this.manejadorError.resolverErrorApi(error);
    }
  }

  @Post('actualizar-mora')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Actualizar cuentas de cobro a estado mora',
    description:
      'Inicia el proceso asíncrono de actualización de cuentas de cobro a estado mora. Busca todas las cuentas de cobro con estado pendiente cuya fecha de cobro ya pasó y las actualiza a estado mora. Este proceso se ejecuta en segundo plano y puede tomar tiempo dependiendo de la cantidad de cuentas a actualizar.',
  })
  @ApiNoContentResponse({
    description: 'Proceso de actualización iniciado exitosamente',
  })
  actualizarCuentasEnMora(@Res() response: Response): void {
    response.status(HttpStatus.NO_CONTENT).send();
    this.cuentasCobroService.actualizarCuentasEnMora().catch((error) => {
      this.logger.error({ error: JSON.stringify(error) });
    });
  }
}
