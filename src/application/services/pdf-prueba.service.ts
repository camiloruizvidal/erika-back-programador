import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiciosUrls } from '../../infrastructure/config/servicios-urls.config';

@Injectable()
export class PdfPruebaService {
  private readonly logger = new Logger(PdfPruebaService.name);

  constructor(private readonly httpService: HttpService) {}

  async probarGeneracionPdf(
    cuentaCobroId: number,
  ): Promise<{ urlPdf: string }> {
    try {
      this.logger.log(
        `Solicitando generación de PDF para cuenta de cobro ID: ${cuentaCobroId}`,
      );

      const url = `${ServiciosUrls.notificacionesBaseUrl}/api/v1/notificaciones/probar-pdf/${cuentaCobroId}`;

      const respuesta = await firstValueFrom(
        this.httpService.get<{ urlPdf: string }>(url),
      );

      this.logger.log(`PDF generado exitosamente: ${respuesta.data.urlPdf}`);

      return respuesta.data;
    } catch (error) {
      this.logger.error(
        `Error al solicitar generación de PDF para cuenta de cobro ${cuentaCobroId}:`,
        error,
      );
      throw error;
    }
  }
}
