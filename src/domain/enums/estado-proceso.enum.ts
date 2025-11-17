export enum EEstadoProceso {
  EN_PROCESO = 'en_proceso',
  EXITOSO = 'exitoso',
  FALLIDO = 'fallido',
}

export type EstadoProceso = `${EEstadoProceso}`;

