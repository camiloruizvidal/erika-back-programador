import { Transformador } from '../../../utils/transformador.util';
import { ConceptoAdicionalModel } from '../models/concepto-adicional.model';

export interface IConceptoAdicional {
  id: number;
  tenantId: number;
  clienteId: number;
  concepto: string;
  descripcion: string | null;
  valor: number;
  aplicado: boolean;
  siguienteCuentaCobro: boolean;
  cuentaCobroId: number | null;
  fechaAplicacion: Date | null;
  mesAplicacion: number | null;
  anioAplicacion: number | null;
  observaciones: string | null;
}

export class ConceptoAdicionalRepository {
  static async buscarPendientesParaSiguienteCuenta(
    tenantId: number,
    clienteId: number,
  ): Promise<IConceptoAdicional[]> {
    const conceptos = await ConceptoAdicionalModel.findAll({
      where: {
        tenantId,
        clienteId,
        aplicado: false,
        siguienteCuentaCobro: true,
      },
    });

    return conceptos.map((concepto) =>
      Transformador.extraerDataValues<IConceptoAdicional>(concepto),
    );
  }

  static async marcarComoAplicado(
    conceptoId: number,
    cuentaCobroId: number,
    mes: number,
    anio: number,
  ): Promise<void> {
    await ConceptoAdicionalModel.update(
      {
        aplicado: true,
        cuentaCobroId,
        fechaAplicacion: new Date(),
        mesAplicacion: mes,
        anioAplicacion: anio,
      },
      {
        where: {
          id: conceptoId,
        },
      },
    );
  }
}
