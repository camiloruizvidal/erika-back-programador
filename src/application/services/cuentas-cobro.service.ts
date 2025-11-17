import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiciosUrls } from '../../infrastructure/config/servicios-urls.config';

@Injectable()
export class CuentasCobroService {
  private readonly logger = new Logger(CuentasCobroService.name);

  constructor(private readonly httpService: HttpService) {}

  async iniciarGeneracionCuentasCobro(): Promise<{ mensaje: string }> {
    try {
      this.logger.log(
        'Iniciando proceso de generación de cuentas de cobro...',
      );

      const url = `${ServiciosUrls.cobrosBaseUrl}/api/v1/billing/generate`;

      const respuesta = await firstValueFrom(
        this.httpService.post<{ mensaje: string }>(url),
      );

      this.logger.log(
        `Proceso de generación de cuentas de cobro iniciado exitosamente: ${respuesta.data.mensaje}`,
      );

      return respuesta.data;
    } catch (error) {
      this.logger.error(
        'Error al iniciar proceso de generación de cuentas de cobro:',
        error,
      );
      throw error;
    }
  }
}

