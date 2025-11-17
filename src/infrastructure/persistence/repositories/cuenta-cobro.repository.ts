import { QueryTypes } from 'sequelize';
import { Transformador } from '../../../utils/transformador.util';
import { CuentaCobroModel } from '../models/cuenta-cobro.model';
import { CuentaCobroServicioModel } from '../models/cuenta-cobro-servicio.model';
import { EEstadoCuentaCobro } from '../../../domain/enums/estado-cuenta-cobro.enum';

export interface ICrearCuentaCobro {
  tenantId: number;
  clienteId: number;
  clientePaqueteId: number;
  fechaCobro: Date;
  valorTotal: number;
  valorPaquete: number;
  valorConceptosAdicionales: number;
  estado: EEstadoCuentaCobro;
  observaciones?: string | null;
}

export interface ICuentaCobro {
  id: number;
  tenantId: number;
  clienteId: number;
  clientePaqueteId: number;
  fechaCobro: Date;
  valorTotal: number;
  valorPaquete: number;
  valorConceptosAdicionales: number;
  estado: string;
  urlPdf: string | null;
  siEnvioCorreo: boolean;
  fechaEnvioCorreo: Date | null;
  observaciones: string | null;
}

export interface ICrearCuentaCobroServicio {
  cuentaCobroId: number;
  clientePaqueteServicioId: number;
  nombreServicio: string;
  valorOriginal: number;
  valorAcordado: number;
}

export class CuentaCobroRepository {
  static async crearCuentaCobro(
    datos: ICrearCuentaCobro,
  ): Promise<ICuentaCobro> {
    const cuentaCobro = await CuentaCobroModel.create({
      tenantId: datos.tenantId,
      clienteId: datos.clienteId,
      clientePaqueteId: datos.clientePaqueteId,
      fechaCobro: datos.fechaCobro,
      valorTotal: datos.valorTotal,
      valorPaquete: datos.valorPaquete,
      valorConceptosAdicionales: datos.valorConceptosAdicionales,
      estado: datos.estado,
      observaciones: datos.observaciones || null,
    });

    return Transformador.extraerDataValues<ICuentaCobro>(cuentaCobro);
  }

  static async crearServicios(
    servicios: ICrearCuentaCobroServicio[],
  ): Promise<void> {
    await CuentaCobroServicioModel.bulkCreate(
      servicios.map((servicio) => ({
        cuentaCobroId: servicio.cuentaCobroId,
        clientePaqueteServicioId: servicio.clientePaqueteServicioId,
        nombreServicio: servicio.nombreServicio,
        valorOriginal: servicio.valorOriginal,
        valorAcordado: servicio.valorAcordado,
      })),
    );
  }

  static async contarCuentasCobroGeneradas(fechaCobro: Date): Promise<number> {
    const sequelize = CuentaCobroModel.sequelize;
    if (!sequelize) {
      throw new Error('Sequelize instance not available');
    }

    const fechaCobroISO = fechaCobro.toISOString();

    const query = `
      SELECT COUNT(*) as cantidad
      FROM cuentas_cobro
      WHERE fecha_cobro = :fechaCobro::timestamp
        AND deleted_at IS NULL;
    `;

    const resultado = await sequelize.query(query, {
      replacements: {
        fechaCobro: fechaCobroISO,
      },
      type: QueryTypes.SELECT,
    });

    const cantidad =
      Array.isArray(resultado) && resultado.length > 0
        ? Number((resultado[0] as { cantidad: string }).cantidad)
        : 0;

    return cantidad;
  }

  static async generarCuentasCobroMasivo(
    diaCobro: number,
    fechaCobro: Date,
    inicioDia: Date,
    finDia: Date,
  ): Promise<boolean> {
    const sequelize = CuentaCobroModel.sequelize;
    if (!sequelize) {
      throw new Error('Sequelize instance not available');
    }

    const fechaCobroISO = fechaCobro.toISOString();
    const inicioDiaISO = inicioDia.toISOString();
    const finDiaISO = finDia.toISOString();
    const estadoPendiente = EEstadoCuentaCobro.PENDIENTE;
    const mesActual = fechaCobro.getUTCMonth() + 1;
    const anioActual = fechaCobro.getUTCFullYear();

    const transaction = await sequelize.transaction();

    try {
      const queryCompleta = `
        WITH paquetes_elegibles AS (
          SELECT
            cliente_paquete.id AS cliente_paquete_id,
            cliente_paquete.tenant_id,
            cliente_paquete.cliente_id,
            cliente_paquete.valor_acordado AS valor_paquete,
            COALESCE(SUM(concepto_adicional.valor), 0) AS valor_conceptos_adicionales
          FROM
            cliente_paquetes cliente_paquete
          LEFT JOIN conceptos_adicionales concepto_adicional ON
            concepto_adicional.cliente_id = cliente_paquete.cliente_id
            AND concepto_adicional.tenant_id = cliente_paquete.tenant_id
            AND concepto_adicional.aplicado = false
            AND concepto_adicional.siguiente_cuenta_cobro = true
            AND concepto_adicional.deleted_at IS NULL
          WHERE
            cliente_paquete.estado = 'activo'
            AND cliente_paquete.dia_cobro = :diaCobro
            AND cliente_paquete.deleted_at IS NULL
            AND cliente_paquete.id NOT IN (
              SELECT DISTINCT cuenta_cobro_existente.cliente_paquete_id
              FROM cuentas_cobro cuenta_cobro_existente
              WHERE cuenta_cobro_existente.fecha_cobro >= :inicioDia::timestamp
                AND cuenta_cobro_existente.fecha_cobro <= :finDia::timestamp
                AND cuenta_cobro_existente.deleted_at IS NULL
            )
          GROUP BY
            cliente_paquete.id,
            cliente_paquete.tenant_id,
            cliente_paquete.cliente_id,
            cliente_paquete.valor_acordado
        ),
        cuentas_cobro_insertadas AS (
          INSERT INTO cuentas_cobro (
            tenant_id,
            cliente_id,
            cliente_paquete_id,
            fecha_cobro,
            valor_total,
            valor_paquete,
            valor_conceptos_adicionales,
            estado,
            created_at,
            updated_at
          )
          SELECT
            paquetes_elegibles.tenant_id,
            paquetes_elegibles.cliente_id,
            paquetes_elegibles.cliente_paquete_id,
            :fechaCobro::timestamp,
            paquetes_elegibles.valor_paquete + paquetes_elegibles.valor_conceptos_adicionales,
            paquetes_elegibles.valor_paquete,
            paquetes_elegibles.valor_conceptos_adicionales,
            :estadoPendiente,
            NOW(),
            NOW()
          FROM
            paquetes_elegibles
        ),
        servicios_cuentas_cobro_insertados AS (
          INSERT INTO cuentas_cobro_servicios (
            cuenta_cobro_id,
            cliente_paquete_servicio_id,
            nombre_servicio,
            valor_original,
            valor_acordado,
            created_at,
            updated_at
          )
          SELECT
            cuenta_cobro_insertada.id,
            cliente_paquete_servicio.id,
            cliente_paquete_servicio.nombre_servicio,
            cliente_paquete_servicio.valor_original,
            cliente_paquete_servicio.valor_acordado,
            NOW(),
            NOW()
          FROM
            cuentas_cobro_insertadas cuenta_cobro_insertada
          INNER JOIN cliente_paquete_servicios cliente_paquete_servicio ON
            cliente_paquete_servicio.cliente_paquete_id = cuenta_cobro_insertada.cliente_paquete_id
            AND cliente_paquete_servicio.deleted_at IS NULL
        )
        UPDATE conceptos_adicionales concepto_adicional
        SET
          aplicado = true,
          cuenta_cobro_id = cuenta_cobro_nueva.id,
          fecha_aplicacion = NOW(),
          mes_aplicacion = :mesActual,
          anio_aplicacion = :anioActual,
          updated_at = NOW()
        FROM
          cuentas_cobro cuenta_cobro_nueva
        WHERE
          concepto_adicional.cliente_id = cuenta_cobro_nueva.cliente_id
          AND concepto_adicional.tenant_id = cuenta_cobro_nueva.tenant_id
          AND concepto_adicional.aplicado = false
          AND concepto_adicional.siguiente_cuenta_cobro = true
          AND concepto_adicional.deleted_at IS NULL
          AND cuenta_cobro_nueva.fecha_cobro = :fechaCobro::timestamp
          AND cuenta_cobro_nueva.deleted_at IS NULL;
      `;

      await sequelize.query(queryCompleta, {
        replacements: {
          diaCobro,
          fechaCobro: fechaCobroISO,
          inicioDia: inicioDiaISO,
          finDia: finDiaISO,
          estadoPendiente,
          mesActual,
          anioActual,
        },
        type: QueryTypes.RAW,
        transaction,
      });

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
