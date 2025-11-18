export interface IPdfGeneratorRequest {
  plantilla: Buffer | string;
  datos: Record<string, any>;
  rutaSalida: string;
  nombreArchivo: string;
  tieneContrasena?: boolean;
  contrasena?: string;
}

