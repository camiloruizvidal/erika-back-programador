import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Config } from '../../config/config';
import { CuentaCobroModel } from '../models/cuenta-cobro.model';
import { CuentaCobroServicioModel } from '../models/cuenta-cobro-servicio.model';
import { ConceptoAdicionalModel } from '../models/concepto-adicional.model';
import { ClientePaqueteModel } from '../models/cliente-paquete.model';
import { ClientePaqueteServicioModel } from '../models/cliente-paquete-servicio.model';
import { ProcesoGeneracionModel } from '../models/proceso-generacion.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: Config.dbDialect,
      host: Config.dbHost,
      port: Config.dbPuerto,
      username: Config.dbUsuario,
      password: Config.dbContrasena,
      database: Config.dbBaseDatos,
      models: [
        CuentaCobroModel,
        CuentaCobroServicioModel,
        ConceptoAdicionalModel,
        ClientePaqueteModel,
        ClientePaqueteServicioModel,
        ProcesoGeneracionModel,
      ],
      logging: Config.dbLogging,
      define: {
        underscored: true,
      },
    }),
  ],
})
export class DatabaseModule {}
