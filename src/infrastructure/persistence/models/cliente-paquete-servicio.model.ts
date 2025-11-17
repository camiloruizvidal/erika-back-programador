import {
  AllowNull,
  Column,
  DataType,
  Model,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'cliente_paquete_servicios',
  timestamps: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
})
export class ClientePaqueteServicioModel extends Model {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @AllowNull(false)
  @Column({ type: DataType.BIGINT, field: 'cliente_paquete_id' })
  clientePaqueteId!: number;

  @AllowNull(false)
  @Column({ type: DataType.STRING(150), field: 'nombre_servicio' })
  nombreServicio!: string;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'valor_original',
  })
  valorOriginal!: number;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL(12, 2),
    field: 'valor_acordado',
  })
  valorAcordado!: number;
}
