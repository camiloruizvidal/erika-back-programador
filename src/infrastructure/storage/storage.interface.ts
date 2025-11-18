export interface IStorage {
  guardar(
    buffer: Buffer,
    rutaBase: string,
    nombreArchivo: string,
  ): Promise<string>;

  leer(rutaCompleta: string): Promise<Buffer>;

  asegurarDirectorio(rutaBase: string): Promise<void>;
}

export const STORAGE_TOKEN = Symbol('IStorage');
