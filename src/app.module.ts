import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfPruebaController } from './presentation/controllers/pdf-prueba.controller';
import { PdfPruebaService } from './application/services/pdf-prueba.service';
import { CuentasCobroController } from './presentation/controllers/cuentas-cobro.controller';
import { CuentasCobroService } from './application/services/cuentas-cobro.service';
import { ManejadorError } from './utils/manejador-error/manejador-error';

@Module({
  imports: [HttpModule],
  controllers: [AppController, PdfPruebaController, CuentasCobroController],
  providers: [AppService, PdfPruebaService, CuentasCobroService, ManejadorError],
})
export class AppModule {}
