import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { PdfPruebaService } from '../../application/services/pdf-prueba.service';
import { ManejadorError } from '../../utils/manejador-error/manejador-error';
import { GenerarPdfPruebaResponseDto } from '../dto/generar-pdf-prueba.response.dto';

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
    type: GenerarPdfPruebaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cuenta de cobro no encontrada',
  })
  async probarGeneracionPdf(
    @Param('cuentaCobroId', ParseIntPipe) cuentaCobroId: number,
  ): Promise<GenerarPdfPruebaResponseDto> {
    try {
      const resultado =
        await this.pdfPruebaService.probarGeneracionPdf(cuentaCobroId);
      return plainToInstance(GenerarPdfPruebaResponseDto, resultado);
    } catch (error) {
      this.logger.error({ error: JSON.stringify(error) });
      this.manejadorError.resolverErrorApi(error);
    }
  }
}
