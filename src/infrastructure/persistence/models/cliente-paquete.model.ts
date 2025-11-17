import {
  AllowNull,
  Column,
  DataType,
  Default,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { ClientePaqueteServicioModel } from './cliente-paquete-servicio.model';
import { EEstado } from '../../../domain/enums/estado.enum';
import { EFrecuenciaTipo } from '../../../domain/enums/frecuencia-tipo.enum';

@Table({
  tableName: 'cliente_paquetes',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export class ClientePaqueteModel extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @AllowNull(false)
  @Column({ type: DataType.BIGINT, field: 'tenant_id' })
  tenantId!: number;

  @AllowNull(false)
  @Column({ type: DataType.BIGINT, field: 'cliente_id' })
  clienteId!: number;

  @AllowNull(false)
  @Column({ type: DataType.BIGINT, field: 'paquete_original_id' })
  paqueteOriginalId!: number;

  @AllowNull(false)
  @Column({ type: DataType.STRING(150), field: 'nombre_paquete' })
  nombrePaquete!: string;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'valor_acordado',
  })
  valorAcordado!: number;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER, field: 'dia_cobro' })
  diaCobro!: number | null;

  @AllowNull(false)
  @Column({ type: DataType.STRING(20), field: 'frecuencia_tipo' })
  frecuenciaTipo!: EFrecuenciaTipo;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER, field: 'frecuencia_valor' })
  frecuenciaValor!: number | null;

  @AllowNull(false)
  @Column({ type: DataType.DATE, field: 'fecha_inicio' })
  fechaInicio!: Date;

  @AllowNull(true)
  @Column({ type: DataType.DATE, field: 'fecha_fin' })
  fechaFin!: Date | null;

  @Default(EEstado.ACTIVO)
  @AllowNull(false)
  @Column({ type: DataType.STRING(20) })
  estado!: EEstado;

  @HasMany(() => ClientePaqueteServicioModel, 'cliente_paquete_id')
  servicios?: ClientePaqueteServicioModel[];
}
