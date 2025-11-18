export interface IEnviarCorreoRequest {
  destinatario: string;
  asunto: string;
  cuerpoHtml: string;
  urlPdf?: string;
  pdfAdjunto?: {
    nombreArchivo: string;
    contenidoBase64: string;
  };
}
