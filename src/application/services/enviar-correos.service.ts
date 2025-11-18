import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import { ServiciosUrls } from '../../infrastructure/config/servicios-urls.config';
import * as moment from 'moment-timezone';
import { CuentaCobroRepository } from '../../infrastructure/persistence/repositories/cuenta-cobro.repository';
import { PlantillaRepository } from '../../infrastructure/persistence/repositories/plantilla.repository';
import { IEnviarCorreoRequest } from '../../domain/interfaces/notificaciones.interface';
import { ProcesarPlantillaHtml } from '../../utils/functions/procesar-plantilla-html.util';
import type { IStorage } from '../../infrastructure/storage/storage.interface';
import { STORAGE_TOKEN } from '../../infrastructure/storage/storage.interface';

@Injectable()
export class EnviarCorreosService {
  private readonly logger = new Logger(EnviarCorreosService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(STORAGE_TOKEN) private readonly storageService: IStorage,
  ) {}

  async enviarCorreosPorBatch(
    fechaCobro: Date,
    batchSize: number = 500,
  ): Promise<number> {
    let offset = 0;
    let totalEnviados = 0;
    let tieneMasRegistros = true;

    this.logger.log(
      `Iniciando envío de correos por batches de ${batchSize} para fecha: ${fechaCobro.toISOString()}`,
    );

    const inicioDia = moment.utc(fechaCobro).startOf('day').toDate();
    const finDia = moment.utc(fechaCobro).endOf('day').toDate();

    while (tieneMasRegistros) {
      const resultado =
        await CuentaCobroRepository.buscarSinEnvioCorreoConRelaciones(
          inicioDia,
          finDia,
          batchSize,
          offset,
        );

      if (resultado.rows.length === 0) {
        tieneMasRegistros = false;
        break;
      }

      this.logger.log(
        `Procesando batch de correos: ${offset} - ${offset + resultado.rows.length} de ${resultado.count} cuentas sin enviar correo`,
      );

      for (const cuentaCobro of resultado.rows) {
        try {
          if (!cuentaCobro.urlPdf) {
            this.logger.warn(
              `La cuenta de cobro ${cuentaCobro.id} no tiene PDF generado, omitiendo`,
            );
            continue;
          }

          const cliente = await CuentaCobroRepository.buscarClientePorId(
            cuentaCobro.clienteId,
          );

          if (!cliente) {
            this.logger.warn(
              `No se encontró cliente con ID ${cuentaCobro.clienteId} para cuenta de cobro ${cuentaCobro.id}`,
            );
            continue;
          }

          const plantilla = await PlantillaRepository.buscarPorTenantYTipo(
            cuentaCobro.tenantId,
            'cuenta_cobro',
          );

          if (!plantilla) {
            this.logger.warn(
              `No se encontró plantilla para tenant ${cuentaCobro.tenantId} tipo cuenta_cobro`,
            );
            continue;
          }

          if (!plantilla.plantillaCorreo) {
            this.logger.warn(
              `No se encontró plantilla de correo para tenant ${cuentaCobro.tenantId}`,
            );
            continue;
          }

          const valorTotalFormateado = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
          }).format(Number(cuentaCobro.valorTotal));

          const fechaCobroFormateada = moment
            .tz(cuentaCobro.fechaCobro, 'America/Bogota')
            .format('DD [de] MMMM [de] YYYY');

          const cuerpoHtml = ProcesarPlantillaHtml.procesar(
            plantilla.plantillaCorreo,
            {
              'cliente.nombre': cliente.nombreCompleto,
              'cliente.primer_nombre': cliente.primerNombre || '',
              'cliente.primer_apellido': cliente.primerApellido || '',
              'cuentaCobro.valorTotal': valorTotalFormateado,
              'cuentaCobro.fechaCobro': fechaCobroFormateada,
              urlPdf: cuentaCobro.urlPdf || '',
            },
          );

          let pdfAdjunto:
            | { nombreArchivo: string; contenidoBase64: string }
            | undefined;

          if (cuentaCobro.urlPdf) {
            try {
              const bufferPdf = await this.storageService.leer(
                cuentaCobro.urlPdf,
              );
              const contenidoBase64 = bufferPdf.toString('base64');
              const nombreArchivo = path.basename(cuentaCobro.urlPdf);

              pdfAdjunto = {
                nombreArchivo,
                contenidoBase64,
              };
            } catch (error) {
              this.logger.warn(
                `No se pudo leer el archivo PDF ${cuentaCobro.urlPdf} para cuenta de cobro ${cuentaCobro.id}: ${(error as Error).message}`,
              );
            }
          }

          const datosCorreo: IEnviarCorreoRequest = {
            destinatario: cliente.correo,
            asunto: `Cuenta de Cobro - ${fechaCobroFormateada}`,
            cuerpoHtml,
            urlPdf: cuentaCobro.urlPdf,
            pdfAdjunto,
          };

          await this.enviarCorreo(datosCorreo);

          await CuentaCobroRepository.actualizarEnvioCorreo(
            cuentaCobro.id,
            new Date(),
          );

          totalEnviados++;
        } catch (error) {
          this.logger.verbose({ error: JSON.stringify(error, null, 2) });
          this.logger.error(`Error al enviar correo para cuenta de cobro`);
        }
      }

      offset += batchSize;
      tieneMasRegistros = resultado.rows.length === batchSize;
    }

    this.logger.log(
      `Envío de correos completado. Total enviados: ${totalEnviados}`,
    );

    return totalEnviados;
  }

  private async enviarCorreo(datos: IEnviarCorreoRequest): Promise<void> {
    const url = `${ServiciosUrls.notificacionesBaseUrl}/api/v1/notificaciones/enviar-correo`;

    await firstValueFrom(
      this.httpService.post<{ mensaje: string }>(url, datos),
    );

    this.logger.log(`Correo enviado exitosamente a: ${datos.destinatario}`);
  }
}
