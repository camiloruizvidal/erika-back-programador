import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiciosUrls } from '../../infrastructure/config/servicios-urls.config';
import * as moment from 'moment-timezone';
import { CuentaCobroRepository } from '../../infrastructure/persistence/repositories/cuenta-cobro.repository';
import { PlantillaRepository } from '../../infrastructure/persistence/repositories/plantilla.repository';
import { PagosService } from './pagos.service';
import { CuentaCobroModel } from '../../infrastructure/persistence/models/cuenta-cobro.model';
import { ClienteModel } from '../../infrastructure/persistence/models/cliente.model';
import { TenantModel } from '../../infrastructure/persistence/models/tenant.model';
import { IPdfGeneratorRequest } from '../../domain/interfaces/pdf-generator.interface';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly pagosService: PagosService,
  ) {}

  async generarPdfsPorBatch(
    fechaCobro: Date,
    batchSize: number = 500,
  ): Promise<number> {
    let offset = 0;
    let totalGenerados = 0;
    let tieneMasRegistros = true;

    this.logger.verbose(
      `Iniciando generación de PDFs por batches de ${batchSize} para fecha: ${fechaCobro.toISOString()}`,
    );

    while (tieneMasRegistros) {
      const resultado =
        await CuentaCobroRepository.buscarPorFechaCobroConRelaciones(
          batchSize,
          offset,
          true,
        );

      if (resultado.rows.length === 0) {
        tieneMasRegistros = false;
        break;
      }

      this.logger.verbose(
        `Procesando batch: ${offset} - ${offset + resultado.rows.length} de ${resultado.count} cuentas de cobro sin PDF`,
      );

      for (const cuentaCobro of resultado.rows) {
        try {
          const cliente = await CuentaCobroRepository.buscarClientePorId(
            cuentaCobro.clienteId,
          );

          if (!cliente) {
            this.logger.verbose(
              `No se encontró cliente con ID ${cuentaCobro.clienteId} para cuenta de cobro ${cuentaCobro.id}`,
            );
            continue;
          } else {
            this.logger.verbose(
              `Se encontró cliente con ID ${cuentaCobro.clienteId} para cuenta de cobro ${cuentaCobro.id}`,
            );
          }

          const plantilla = await PlantillaRepository.buscarPorTenantYTipo(
            cuentaCobro.tenantId,
            'cuenta_cobro',
          );

          if (!plantilla) {
            this.logger.verbose(
              `No se encontró plantilla para tenant ${cuentaCobro.tenantId} tipo cuenta_cobro`,
            );
            continue;
          }

          const diasGracia =
            await CuentaCobroRepository.buscarDiasGraciaPorClientePaqueteId(
              cuentaCobro.clientePaqueteId,
            );

          const fechaLimitePago = this.calcularFechaLimitePago(
            cuentaCobro.fechaCobro,
            diasGracia,
          );

          let linkPago = cuentaCobro.linkPago;

          if (!linkPago) {
            this.logger.verbose(
              `Generando link de pago Woompi para cuenta de cobro ID ->: ${cuentaCobro.id}`,
            );

            linkPago = await this.pagosService.generarLinkPago({
              cuentaCobroId: cuentaCobro.id,
              valorTotal: Number(cuentaCobro.valorTotal),
              referencia: `CC-${cuentaCobro.id}`,
              descripcion: `Cuenta de cobro #${cuentaCobro.id}`,
              correoCliente: cliente.correo,
              nombreCliente: cliente.nombreCompleto,
              fechaLimitePago,
              identificacionCliente: cliente.identificacion || undefined,
              telefonoCliente: cliente.telefono || undefined,
              tipoDocumentoCliente: cliente.identificacion || 'CC',
            });

            await CuentaCobroRepository.actualizarLinkPago(
              cuentaCobro.id,
              linkPago,
            );
          }

          if (!linkPago) {
            this.logger.verbose(
              `No se pudo generar el link de pago para cuenta de cobro ${cuentaCobro.id}, omitiendo`,
            );
            continue;
          }

          const tenant = await CuentaCobroRepository.buscarTenantPorId(
            cuentaCobro.tenantId,
          );

          if (!plantilla.plantillaPdf) {
            this.logger.verbose(
              `No se encontró ruta de plantilla PDF para cuenta de cobro ${cuentaCobro.id}`,
            );
            continue;
          }

          if (!plantilla.rutaPdf) {
            this.logger.verbose(
              `No se encontró ruta base para guardar PDF para cuenta de cobro ${cuentaCobro.id}`,
            );
            continue;
          }

          const datosPdf: IPdfGeneratorRequest = {
            plantilla: plantilla.plantillaPdf,
            datos: this.mapearDatosParaPlantilla(
              cuentaCobro,
              cliente,
              tenant,
              fechaLimitePago,
              linkPago,
            ),
            rutaSalida: plantilla.rutaPdf,
            nombreArchivo: `${cuentaCobro.id}_${cliente.identificacion || ''}.pdf`,
            tieneContrasena: false,
          };

          const urlPdf = await this.llamarPdfGenerico(datosPdf);

          await CuentaCobroRepository.actualizarUrlPdf(cuentaCobro.id, urlPdf);

          totalGenerados++;
        } catch (error) {
          console.trace();
          this.logger.error(
            `Error al generar PDF para cuenta de cobro ${cuentaCobro.id}: ${JSON.stringify(error, null, 2)}`,
          );
        }
      }

      offset += batchSize;
      tieneMasRegistros = resultado.rows.length === batchSize;
    }

    this.logger.verbose(
      `Generación de PDFs completada. Total generados: ${totalGenerados}`,
    );

    return totalGenerados;
  }

  private async llamarPdfGenerico(
    datos: IPdfGeneratorRequest,
  ): Promise<string> {
    const url = `${ServiciosUrls.pdfGenericoBaseUrl}/api/v1/pdf/generar`;

    const respuesta = await firstValueFrom(
      this.httpService.post<{ urlPdf: string }>(url, datos),
    );

    return respuesta.data.urlPdf;
  }

  private mapearDatosParaPlantilla(
    cuentaCobro: CuentaCobroModel,
    cliente: ClienteModel,
    tenant: TenantModel | null,
    fechaLimitePago: Date,
    linkPago: string,
  ): Record<string, any> {
    const valorTotalFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(Number(cuentaCobro.valorTotal));

    const fechaLimiteFormateada = moment
      .tz(fechaLimitePago, 'America/Bogota')
      .format('DD [de] MMMM [de] YYYY');

    return {
      'cliente.primer_nombre': cliente.primerNombre || '',
      'cliente.primer_apellido': cliente.primerApellido || '',
      'empresa.nombre': tenant?.nombre || '',
      'cuenta.valor_total': valorTotalFormateado,
      'cuenta.fecha_limite_pago': fechaLimiteFormateada,
      'cuenta.link_pago': linkPago,
    };
  }

  private calcularFechaLimitePago(
    fechaCobro: Date,
    diasGracia: number | null,
  ): Date {
    const fecha = moment.utc(fechaCobro);
    if (diasGracia && diasGracia > 0) {
      fecha.add(diasGracia, 'days');
    }
    return fecha.toDate();
  }
}
