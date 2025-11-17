import { ClientePaqueteModel } from '../models/cliente-paquete.model';
import { EEstado } from '../../../domain/enums/estado.enum';
import { Transformador } from '../../../utils/transformador.util';

export class ClientePaqueteRepository {
  static async buscarActivos(): Promise<ClientePaqueteModel[]> {
    const paquetes = await ClientePaqueteModel.findAll({
      where: {
        estado: EEstado.ACTIVO,
      },
    });

    const paquetesTransformados =
      Transformador.extraerDataValues<ClientePaqueteModel[]>(paquetes);

    return paquetesTransformados as ClientePaqueteModel[];
  }
}
