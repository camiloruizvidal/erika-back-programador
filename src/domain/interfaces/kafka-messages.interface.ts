export interface IGeneracionCuentasCobroCompletada {
  fechaCobro: string;
  cantidadGenerada: number;
  timestamp: string;
}

export interface IPdfsCuentasCobroGenerados {
  fechaCobro: string;
  cantidadPdfsGenerados: number;
  cantidadCorreosEnviados: number;
  timestamp: string;
}

