import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiciosUrls } from '../../infrastructure/config/servicios-urls.config';
import { CuentaCobroRepository } from '../../infrastructure/persistence/repositories/cuenta-cobro.repository';

@Injectable()
export class CuentasCobroService {
  private readonly logger = new Logger(CuentasCobroService.name);

  constructor(private readonly httpService: HttpService) {}

  async iniciarGeneracionCuentasCobro(): Promise<{ mensaje: string }> {
    try {
      this.logger.log('Iniciando proceso de generación de cuentas de cobro...');

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

  async actualizarCuentasEnMora(): Promise<{
    cuentasActualizadas: number;
    mensaje: string;
  }> {
    try {
      this.logger.log('Iniciando proceso de actualización de cuentas en mora...');

      const cuentasPendientesConFechaPasada =
        await CuentaCobroRepository.buscarCuentasPendientesConFechaPasada();

      if (cuentasPendientesConFechaPasada.length === 0) {
        this.logger.log('No se encontraron cuentas pendientes con fecha pasada');
        return {
          cuentasActualizadas: 0,
          mensaje: 'No se encontraron cuentas pendientes con fecha pasada',
        };
      }

      const ids = cuentasPendientesConFechaPasada.map((cuenta) => cuenta.id);

      const cuentasActualizadas =
        await CuentaCobroRepository.actualizarEstadoAMora(ids);

      this.logger.log(
        `Se actualizaron ${cuentasActualizadas} cuentas de cobro a estado mora`,
      );

      return {
        cuentasActualizadas,
        mensaje: `Se actualizaron ${cuentasActualizadas} cuentas de cobro a estado mora`,
      };
    } catch (error) {
      this.logger.error(
        'Error al actualizar cuentas en mora:',
        error,
      );
      throw error;
    }
  }
}
