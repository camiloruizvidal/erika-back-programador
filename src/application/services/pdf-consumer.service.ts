import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../../infrastructure/messaging/kafka/kafka.service';
import { EachMessagePayload } from 'kafkajs';
import { IGeneracionCuentasCobroCompletada } from '../../domain/interfaces/kafka-messages.interface';
import { IPdfsCuentasCobroGenerados } from '../../domain/interfaces/kafka-messages.interface';
import { Config } from '../../infrastructure/config/config';
import { PdfService } from './pdf.service';

@Injectable()
export class PdfConsumerService implements OnModuleInit {
  private readonly logger = new Logger(PdfConsumerService.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly pdfService: PdfService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!Config.kafkaBroker || !Config.kafkaGroupId) {
      this.logger.warn(
        'Kafka no configurado. Consumer de PDFs no se iniciará.',
      );
      return;
    }
    await this.suscribirAGeneracionCompletada();
  }

  private async suscribirAGeneracionCompletada(): Promise<void> {
    await this.kafkaService.crearConsumer(
      Config.kafkaGroupId,
      'generacion_cuentas_cobro_completada',
      this.procesarGeneracionCompletada.bind(this),
    );
  }

  private async procesarGeneracionCompletada(
    payload: EachMessagePayload,
  ): Promise<void> {
    this.logger.log('=== MENSAJE KAFKA RECIBIDO EN PROGRAMADOR ===');
    this.logger.log(`Topic: generacion_cuentas_cobro_completada`);
    this.logger.log(`Partition: ${payload.partition}`);
    this.logger.log(`Offset: ${payload.message.offset}`);
    this.logger.log(`Value: ${payload.message.value?.toString()}`);

    try {
      const mensaje = JSON.parse(
        payload.message.value?.toString() || '{}',
      ) as IGeneracionCuentasCobroCompletada;

      this.logger.log(
        `Procesando generación completada para fecha: ${mensaje.fechaCobro}, cantidad: ${mensaje.cantidadGenerada}`,
      );

      const fechaCobro = new Date(mensaje.fechaCobro);

      const cantidadPdfsGenerados =
        await this.pdfService.generarPdfsPorBatch(fechaCobro, 500);

      this.logger.log(
        `Generación de PDFs completada. Total generados: ${cantidadPdfsGenerados}`,
      );

      const producer = await this.kafkaService.crearProducer();

      await this.kafkaService.enviarMensaje(
        producer,
        'pdfs_cuentas_cobro_generados',
        {
          fechaCobro: mensaje.fechaCobro,
          cantidadPdfsGenerados,
          timestamp: new Date().toISOString(),
        } as IPdfsCuentasCobroGenerados,
      );

      await producer.disconnect();

      this.logger.log(
        `Evento pdfs_cuentas_cobro_generados publicado. Total: ${cantidadPdfsGenerados}`,
      );
    } catch (error) {
      const mensajeError =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        'Error desconocido';
      this.logger.error(
        `Error al procesar mensaje de generación completada: ${mensajeError}`,
      );
      throw error;
    }
  }
}

