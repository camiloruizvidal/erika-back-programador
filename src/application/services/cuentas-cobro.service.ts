import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { CuentaCobroRepository } from '../../infrastructure/persistence/repositories/cuenta-cobro.repository';
import { ClientePaqueteRepository } from '../../infrastructure/persistence/repositories/cliente-paquete.repository';
import { ProcesoGeneracionRepository } from '../../infrastructure/persistence/repositories/proceso-generacion.repository';
import { EProcesoGeneracion } from '../../domain/enums/proceso-generacion.enum';
import { EEstadoProceso } from '../../domain/enums/estado-proceso.enum';
import { EFrecuenciaTipo } from '../../domain/enums/frecuencia-tipo.enum';
import { ClientePaqueteModel } from '../../infrastructure/persistence/models/cliente-paquete.model';

@Injectable()
export class CuentasCobroService {
  private readonly logger = new Logger(CuentasCobroService.name);

  async generarCuentasCobro(dias: number = 5): Promise<void> {
    this.logger.log(
      `Iniciando generación de cuentas de cobro para ${dias} días`,
    );

    const fechaObjetivo = moment.utc().add(dias, 'days');
    const inicioDia = fechaObjetivo.clone().startOf('day').toDate();
    const finDia = fechaObjetivo.clone().endOf('day').toDate();
    const fechaCobro = fechaObjetivo.clone().startOf('day').toDate();

    const proceso = await ProcesoGeneracionRepository.crearProceso({
      proceso: EProcesoGeneracion.GENERACION_CUENTAS_COBRO,
      diaProceso: fechaObjetivo.date(),
    });

    try {
      const paquetesActivos = await ClientePaqueteRepository.buscarActivos();

      const idsPaquetesElegibles = this.filtrarPaquetesElegibles(
        paquetesActivos,
        fechaObjetivo,
      );

      if (idsPaquetesElegibles.length === 0) {
        this.logger.log(
          'No se encontraron paquetes elegibles para generar cuentas de cobro',
        );
        await ProcesoGeneracionRepository.actualizarProceso(proceso.id, {
          estado: EEstadoProceso.EXITOSO,
          fechaFin: new Date(),
          procesosCreados: 0,
          observaciones: 'No se encontraron paquetes elegibles',
        });
        return;
      }

      const exito = await CuentaCobroRepository.generarCuentasCobroMasivo(
        idsPaquetesElegibles,
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

  private filtrarPaquetesElegibles(
    paquetes: ClientePaqueteModel[],
    fechaObjetivo: moment.Moment,
  ): number[] {
    const idsElegibles: number[] = [];

    for (const paquete of paquetes) {
      const fechaInicio = moment.utc(paquete.fechaInicio);
      const fechaFin = paquete.fechaFin ? moment.utc(paquete.fechaFin) : null;

      if (fechaInicio.isAfter(fechaObjetivo)) {
        continue;
      }

      if (fechaFin && fechaFin.isBefore(fechaObjetivo)) {
        continue;
      }

      let esElegible = false;

      const frecuenciaTipo = paquete.frecuenciaTipo;

      if (frecuenciaTipo === EFrecuenciaTipo.MENSUAL) {
        if (paquete.diaCobro === fechaObjetivo.date()) {
          esElegible = true;
        }
      } else if (frecuenciaTipo === EFrecuenciaTipo.SEMANAS) {
        if (paquete.frecuenciaValor && paquete.frecuenciaValor > 0) {
          const semanasDesdeInicio = fechaObjetivo.diff(
            fechaInicio,
            'weeks',
            true,
          );
          const numeroCiclo = Math.floor(
            semanasDesdeInicio / paquete.frecuenciaValor,
          );
          const fechaCicloEsperado = fechaInicio
            .clone()
            .add(numeroCiclo * paquete.frecuenciaValor, 'weeks');

          const diaSemanaInicio = fechaInicio.day();
          const diaSemanaObjetivo = fechaObjetivo.day();

          if (
            diaSemanaInicio === diaSemanaObjetivo &&
            fechaCicloEsperado.isSame(fechaObjetivo, 'day')
          ) {
            esElegible = true;
          }
        }
      }

      if (esElegible) {
        idsElegibles.push(paquete.id);
      }
    }

    return idsElegibles;
  }
}
