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

      this.logger.log(
        `Buscando cuentas sin envío de correo: encontradas ${resultado.rows.length} de ${resultado.count} totales`,
      );

      if (resultado.rows.length === 0) {
        this.logger.log('No hay más cuentas sin envío de correo');
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

          const tenant = await CuentaCobroRepository.buscarTenantPorId(
            cuentaCobro.tenantId,
          );

          const diasGracia =
            await CuentaCobroRepository.buscarDiasGraciaPorClientePaqueteId(
              cuentaCobro.clientePaqueteId,
            );

          const valorTotalFormateado = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
          }).format(Number(cuentaCobro.valorTotal));

          const fechaCobroFormateada = moment
            .tz(cuentaCobro.fechaCobro, 'America/Bogota')
            .format('DD [de] MMMM [de] YYYY');

          const fechaLimitePago = moment
            .utc(cuentaCobro.fechaCobro)
            .add(diasGracia || 0, 'days')
            .tz('America/Bogota')
            .format('DD [de] MMMM [de] YYYY');

          const cuerpo = ProcesarPlantillaHtml.procesar(
            plantilla.plantillaCorreo,
            {
              'cliente.nombre': cliente.nombreCompleto,
              'cliente.primer_nombre': cliente.primerNombre || '',
              'cliente.primer_apellido': cliente.primerApellido || '',
              'empresa.nombre': tenant?.nombre || '',
              'cuenta.valor': valorTotalFormateado,
              'cuenta.valor_total': valorTotalFormateado,
              'cuentaCobro.valorTotal': valorTotalFormateado,
              'cuenta.fecha_limite_pago': fechaLimitePago,
              'cuenta.fecha_cobro': fechaCobroFormateada,
              'cuentaCobro.fechaCobro': fechaCobroFormateada,
              'cuenta.link_pago': cuentaCobro.linkPago || '',
              'cuenta.linkPago': cuentaCobro.linkPago || '',
              'cuenta.url_pdf': cuentaCobro.urlPdf || '',
              urlPdf: cuentaCobro.urlPdf || '',
            },
          );

          let pdfAdjunto:
            | { nombreArchivo: string; contenidoBase64: string }
            | undefined;

          if (cuentaCobro.urlPdf) {
            try {
              this.logger.log(
                `Leyendo PDF para cuenta de cobro ${cuentaCobro.id} desde: ${cuentaCobro.urlPdf}`,
              );

              const bufferPdf = await this.storageService.leer(
                cuentaCobro.urlPdf,
              );

              this.logger.log(
                `PDF leído exitosamente para cuenta ${cuentaCobro.id}: buffer length = ${bufferPdf?.length || 0} bytes`,
              );

              if (!bufferPdf || bufferPdf.length === 0) {
                this.logger.warn(
                  `El archivo PDF ${cuentaCobro.urlPdf} está vacío para cuenta de cobro ${cuentaCobro.id}`,
                );
              } else {
                const contenidoBase64 = bufferPdf.toString('base64');

                if (!contenidoBase64 || contenidoBase64.length === 0) {
                  this.logger.warn(
                    `La conversión a base64 del PDF ${cuentaCobro.urlPdf} resultó vacía para cuenta de cobro ${cuentaCobro.id}`,
                  );
                } else {
                  const nombreArchivo = path.basename(cuentaCobro.urlPdf);

                  pdfAdjunto = {
                    nombreArchivo,
                    contenidoBase64,
                  };

                  this.logger.log(
                    `PDF adjunto preparado para cuenta ${cuentaCobro.id}: ${nombreArchivo} (${Math.round(contenidoBase64.length / 1024)} KB)`,
                  );
                  this.logger.debug(
                    `Tamaño del contenido base64: ${contenidoBase64.length} caracteres`,
                  );
                }
              }
            } catch (error) {
              this.logger.error(
                `No se pudo leer el archivo PDF ${cuentaCobro.urlPdf} para cuenta de cobro ${cuentaCobro.id}: ${(error as Error).message}`,
              );
              if (error instanceof Error && error.stack) {
                this.logger.error(`Stack trace: ${error.stack}`);
              }
            }
          } else {
            this.logger.warn(
              `Cuenta de cobro ${cuentaCobro.id} no tiene urlPdf definido`,
            );
          }

          const nombreEmpresa = tenant?.nombre || 'Empresa';
          const codigoCuentaCobro = cuentaCobro.id;

          const datosCorreo: IEnviarCorreoRequest = {
            destinatario: cliente.correo,
            asunto: `${nombreEmpresa}, cuenta de cobro ${codigoCuentaCobro}`,
            cuerpo,
            tipo: 'html',
            urlPdf: cuentaCobro.urlPdf,
            pdfAdjunto,
          };

          if (pdfAdjunto) {
            this.logger.log(
              `Enviando correo con PDF adjunto: ${pdfAdjunto.nombreArchivo} (${Math.round(pdfAdjunto.contenidoBase64.length / 1024)} KB)`,
            );
            this.logger.debug(
              `pdfAdjunto preparado - nombreArchivo: ${pdfAdjunto.nombreArchivo}, contenidoBase64 length: ${pdfAdjunto.contenidoBase64.length}`,
            );
          } else {
            this.logger.warn(
              `Enviando correo SIN PDF adjunto para cuenta de cobro ${cuentaCobro.id}. urlPdf: ${cuentaCobro.urlPdf || 'null'}`,
            );
          }

          this.logger.debug(
            `Datos del correo antes de enviar - pdfAdjunto: ${pdfAdjunto ? 'presente' : 'ausente'}`,
          );

          await this.enviarCorreo(datosCorreo);

          await CuentaCobroRepository.actualizarEnvioCorreo(
            cuentaCobro.id,
            new Date(),
          );

          totalEnviados++;
        } catch (error) {
          const errorObj = error as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          const mensajeError =
            errorObj?.response?.data?.message ||
            errorObj?.message ||
            'Error desconocido';
          this.logger.error(
            `Error al enviar correo para cuenta de cobro ${cuentaCobro.id}: ${mensajeError}`,
          );
          if (error instanceof Error) {
            this.logger.error(`Stack trace: ${error.stack}`);
          }
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

    this.logger.log(
      `Llamando a erika-back-notificaciones: ${url} para enviar correo a ${datos.destinatario}`,
    );

    this.logger.debug(
      `Request payload - pdfAdjunto: ${datos.pdfAdjunto ? `presente (${datos.pdfAdjunto.nombreArchivo}, ${Math.round(datos.pdfAdjunto.contenidoBase64.length / 1024)} KB)` : 'ausente'}`,
    );

    try {
      const respuesta = await firstValueFrom(
        this.httpService.post<{ enviado: boolean }>(url, datos),
      );

      this.logger.log(
        `Correo enviado exitosamente a: ${datos.destinatario}. Respuesta: ${JSON.stringify(respuesta.data)}`,
      );
    } catch (error) {
      this.logger.verbose({ error: JSON.stringify(error, null, 2) });
      this.logger.error(
        `Error al llamar a erika-back-notificaciones para ${datos.destinatario}:`,
      );
      this.logger.error(`URL: ${url}`);
      const errorObj = error as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      if (errorObj?.message) {
        this.logger.error(`Error: ${errorObj.message}`);
      }
      if (errorObj?.response) {
        this.logger.error(`Response status: ${errorObj.response.status}`);
        if (errorObj.response.data) {
          this.logger.error(
            `Response data: ${JSON.stringify(errorObj.response.data)}`,
          );
        }
      }
      throw error;
    }
  }
}
