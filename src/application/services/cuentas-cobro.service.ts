import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { CuentaCobroRepository } from '../../infrastructure/persistence/repositories/cuenta-cobro.repository';
import { ProcesoGeneracionRepository } from '../../infrastructure/persistence/repositories/proceso-generacion.repository';
import { EProcesoGeneracion } from '../../domain/enums/proceso-generacion.enum';
import { EEstadoProceso } from '../../domain/enums/estado-proceso.enum';

@Injectable()
export class CuentasCobroService {
  private readonly logger = new Logger(CuentasCobroService.name);

  async generarCuentasCobro(dias: number = 5): Promise<void> {
    this.logger.log(
      `Iniciando generación de cuentas de cobro para ${dias} días`,
    );

    const fechaObjetivo = moment.utc().add(dias, 'days');
    const diaCobro = fechaObjetivo.date();
    const inicioDia = fechaObjetivo.clone().startOf('day').toDate();
    const finDia = fechaObjetivo.clone().endOf('day').toDate();
    const fechaCobro = fechaObjetivo.clone().startOf('day').toDate();

    const proceso = await ProcesoGeneracionRepository.crearProceso({
      proceso: EProcesoGeneracion.GENERACION_CUENTAS_COBRO,
      diaProceso: diaCobro,
    });

    try {
      const exito = await CuentaCobroRepository.generarCuentasCobroMasivo(
        diaCobro,
        fechaCobro,
        inicioDia,
        finDia,
      );

      if (exito) {
        const cantidadGenerada =
          await CuentaCobroRepository.contarCuentasCobroGeneradas(fechaCobro);

        await ProcesoGeneracionRepository.actualizarProceso(proceso.id, {
          estado: EEstadoProceso.EXITOSO,
          fechaFin: new Date(),
          procesosCreados: cantidadGenerada,
          observaciones: null,
        });

        this.logger.log(
          `Generación de cuentas de cobro completada. Se generaron ${cantidadGenerada} cuentas de cobro`,
        );

        // TODO: Generar PDF y enviar correo
      } else {
        throw new Error(
          'El proceso de generación no se completó correctamente',
        );
      }
    } catch (error) {
      this.logger.error(error);
      const mensajeError =
        error instanceof Error ? error.message : JSON.stringify(error);

      await ProcesoGeneracionRepository.actualizarProceso(proceso.id, {
        estado: EEstadoProceso.FALLIDO,
        fechaFin: new Date(),
        procesosCreados: 0,
        observaciones: mensajeError,
      });

      this.logger.error(`Error al generar cuentas de cobro: ${mensajeError}`);
      throw error;
    }
  }
}
