export class ProcesarPlantillaHtml {
  static procesar(
    html: string,
    valores: Record<string, any>,
  ): string {
    let resultado = html;

    for (const [clave, valor] of Object.entries(valores)) {
      const patron = new RegExp(`\\{\\{${clave}\\}\\}`, 'g');
      resultado = resultado.replace(patron, String(valor || ''));
    }

    return resultado;
  }
}

