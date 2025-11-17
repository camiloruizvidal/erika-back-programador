import { Controller, Get, HttpCode, HttpStatus, Logger, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PdfPruebaService } from '../../application/services/pdf-prueba.service';
import { ManejadorError } from '../../utils/manejador-error/manejador-error';

@ApiTags('Pruebas PDF')
@Controller('api/v1/pruebas')
export class PdfPruebaController {
  private readonly logger = new Logger(PdfPruebaController.name);

  constructor(
    private readonly pdfPruebaService: PdfPruebaService,
    private readonly manejadorError: ManejadorError,
  ) {}

  @Get('generar-pdf/:cuentaCobroId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Probar generación de PDF',
    description:
      'Endpoint de prueba que llama a erika-back-notificaciones para generar un PDF de una cuenta de cobro específica',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF generado exitosamente',
    schema: {
      type: 'object',
      properties: {
        urlPdf: {
          type: 'string',
          example: 'https://storage.erika.com/cuentas-cobro/1_6265642.pdf',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cuenta de cobro no encontrada',
  })
  async probarGeneracionPdf(
    @Param('cuentaCobroId') cuentaCobroId: string,
  ): Promise<{ urlPdf: string }> {
    try {
      const id = parseInt(cuentaCobroId, 10);
      return await this.pdfPruebaService.probarGeneracionPdf(id);
    } catch (error) {
      this.logger.error({ error: JSON.stringify(error) });
      this.manejadorError.resolverErrorApi(error);
    }
  }
}

