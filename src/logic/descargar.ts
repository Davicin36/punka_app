/** Descarga un texto como archivo (JSON). */
export function descargar(nombre: string, contenido: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nombre de archivo seguro a partir del nombre de la banda. */
export const nombreArchivo = (nombre: string) =>
  nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_').replace(/^_|_$/g, '') || 'banda';
