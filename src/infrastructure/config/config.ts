import * as dotenv from 'dotenv';

dotenv.config();

export class Config {
  static readonly puerto = Number(process.env.PORT);
  static readonly jwtKey = process.env.JWT_KEY;
  static readonly notificacionesBaseUrl = process.env.NOTIFICACIONES_BASE_URL;
  static readonly cobrosBaseUrl = process.env.COBROS_BASE_URL;
}
