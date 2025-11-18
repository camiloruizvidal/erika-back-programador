export class ProcesarPlantillaHtml {
  static procesar(html: string, valores: Record<string, any>): string {
    let resultado = html;

    for (const [clave, valor] of Object.entries(valores)) {
      const claveEscapada = clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const valorStr = String(valor || '');

      const patronDobleLlave = new RegExp(`\\{\\{${claveEscapada}\\}\\}`, 'g');
      const patronSimpleLlave = new RegExp(`\\{${claveEscapada}\\}`, 'g');
      const patronTemplateString = new RegExp(`\\$\\{${claveEscapada}\\}`, 'g');

      resultado = resultado.replace(patronDobleLlave, valorStr);
      resultado = resultado.replace(patronSimpleLlave, valorStr);
      resultado = resultado.replace(patronTemplateString, valorStr);
    }

    return resultado;
  }
}
