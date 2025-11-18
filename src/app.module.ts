import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfPruebaController } from './presentation/controllers/pdf-prueba.controller';
import { PdfPruebaService } from './application/services/pdf-prueba.service';
import { CuentasCobroController } from './presentation/controllers/cuentas-cobro.controller';
import { CuentasCobroService } from './application/services/cuentas-cobro.service';
import { ManejadorError } from './utils/manejador-error/manejador-error';
import { DatabaseModule } from './infrastructure/persistence/database/database.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { KafkaService } from './infrastructure/messaging/kafka/kafka.service';
import { PdfService } from './application/services/pdf.service';
import { PdfConsumerService } from './application/services/pdf-consumer.service';
import { PagosService } from './application/services/pagos.service';
import { EnviarCorreosService } from './application/services/enviar-correos.service';

@Module({
  imports: [HttpModule, DatabaseModule, StorageModule],
  controllers: [AppController, PdfPruebaController, CuentasCobroController],
  providers: [
    AppService,
    PdfPruebaService,
    CuentasCobroService,
    ManejadorError,
    KafkaService,
    PdfService,
    PdfConsumerService,
    PagosService,
    EnviarCorreosService,
  ],
})
export class AppModule {}
