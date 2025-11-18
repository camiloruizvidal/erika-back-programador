import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiciosUrls } from '../../infrastructure/config/servicios-urls.config';

export interface IGenerarLinkPagoRequest {
  cuentaCobroId: number;
  valorTotal: number;
  referencia: string;
  descripcion: string;
  correoCliente: string;
  nombreCliente: string;
  fechaLimitePago: Date;
}

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(private readonly httpService: HttpService) {}

  async generarLinkPago(
    datos: IGenerarLinkPagoRequest,
  ): Promise<string> {
    try {
      const url = `${ServiciosUrls.pagosBaseUrl}/api/v1/pagos/generar-link-pago`;

      const respuesta = await firstValueFrom(
        this.httpService.post<{ linkPago: string }>(url, datos),
      );

      return respuesta.data.linkPago;
    } catch (error) {
      const mensajeError =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        'Error desconocido';
      this.logger.error(`Error al generar link de pago: ${mensajeError}`);
      throw error;
    }
  }
}

