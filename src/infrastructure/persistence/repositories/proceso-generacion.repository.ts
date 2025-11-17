import { ProcesoGeneracionModel } from '../models/proceso-generacion.model';
import { EProcesoGeneracion } from '../../../domain/enums/proceso-generacion.enum';
import { EEstadoProceso } from '../../../domain/enums/estado-proceso.enum';
import { Transformador } from '../../../utils/transformador.util';

export interface ICrearProcesoGeneracion {
  proceso: EProcesoGeneracion;
  diaProceso: number;
}

export interface IActualizarProcesoGeneracion {
  estado: EEstadoProceso;
  fechaFin: Date;
  procesosCreados: number;
  observaciones?: string | null;
}

export class ProcesoGeneracionRepository {
  static async crearProceso(
    datos: ICrearProcesoGeneracion,
  ): Promise<ProcesoGeneracionModel> {
    const proceso = await ProcesoGeneracionModel.create({
      proceso: datos.proceso,
      diaProceso: datos.diaProceso,
      estado: EEstadoProceso.EN_PROCESO,
      fechaInicio: new Date(),
    });

    return Transformador.extraerDataValues<ProcesoGeneracionModel>(proceso);
  }

  static async actualizarProceso(
    procesoId: number,
    datos: IActualizarProcesoGeneracion,
  ): Promise<void> {
    await ProcesoGeneracionModel.update(
      {
        estado: datos.estado,
        fechaFin: datos.fechaFin,
        procesosCreados: datos.procesosCreados,
        observaciones: datos.observaciones || null,
      },
      {
        where: { id: procesoId },
      },
    );
  }
}

