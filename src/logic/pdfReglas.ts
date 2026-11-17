// ===== Anexo de reglas especiales para los PDF (Punka y Epic) =====
import type { jsPDF } from 'jspdf';

type RGB = [number, number, number];

export interface ReglaPdf {
  nombre: string;
  /** Texto gris pequeño junto al nombre (quién la tiene) */
  nota?: string;
  parrafos: string[];
}
export interface GrupoPdf {
  titulo: string;
  reglas: ReglaPdf[];
}

interface Opciones {
  margen: number;
  /** Primera y última Y útiles de cada página */
  arriba: number;
  abajo: number;
  colores: { tinta: RGB; oxido: RGB; suave: RGB; linea: RGB };
  /** Se llama al crear cada página nueva (para pintar la cabecera) */
  nuevaPagina: () => void;
}

/** Añade páginas nuevas con todas las reglas, a dos columnas. */
export function anexoReglas(doc: jsPDF, grupos: GrupoPdf[], o: Opciones) {
  const g = grupos.filter(x => x.reglas.length);
  if (!g.length) return;
  const W = doc.internal.pageSize.getWidth();
  const hueco = 6;
  const anchoCol = (W - o.margen * 2 - hueco) / 2;
  const xCol = [o.margen, o.margen + anchoCol + hueco];
  let col = 0;
  let y = 0;
  const INT = 3.3; // interlineado del texto

  const pagina = () => {
    doc.addPage(); o.nuevaPagina();
    col = 0; y = o.arriba;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...o.colores.oxido);
    doc.text('REGLAS ESPECIALES', o.margen, y + 3);
    doc.setDrawColor(...o.colores.linea); doc.setLineWidth(0.3);
    doc.line(o.margen, y + 5, W - o.margen, y + 5);
    doc.line(xCol[1] - hueco / 2, y + 8, xCol[1] - hueco / 2, o.abajo);
    y += 10;
  };
  /** Asegura sitio para `alto` mm; si no cabe, pasa de columna o de página. */
  const sitio = (alto: number) => {
    if (y + alto <= o.abajo) return;
    if (col === 0) { col = 1; y = o.arriba + 10; } else pagina();
  };

  pagina();
  for (const grupo of g) {
    sitio(14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...o.colores.oxido);
    const tl = doc.splitTextToSize(grupo.titulo.toUpperCase(), anchoCol) as string[];
    doc.text(tl, xCol[col], y + 3); y += tl.length * 3.8 + 1.5;
    for (const r of grupo.reglas) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      const cab = doc.splitTextToSize(r.nombre, anchoCol) as string[];
      const wUlt = doc.getTextWidth(cab[cab.length - 1] + '  ');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8);
      const notaJunta = !!r.nota && wUlt + doc.getTextWidth(r.nota) <= anchoCol;
      const notaLineas = r.nota && !notaJunta ? doc.splitTextToSize(r.nota, anchoCol) as string[] : [];
      doc.setFontSize(7.4);
      const cuerpo = r.parrafos.map(p => doc.splitTextToSize(p, anchoCol) as string[]);
      // Nombre y primeras líneas siempre juntos
      sitio((cab.length + notaLineas.length) * 3.6 + Math.min(3, cuerpo[0]?.length ?? 0) * INT + 1);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...o.colores.tinta);
      cab.forEach((l, k) => doc.text(l, xCol[col], y + 3 + k * 3.6));
      y += (cab.length - 1) * 3.6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...o.colores.suave);
      if (notaJunta) doc.text(r.nota!, xCol[col] + wUlt, y + 3);
      for (const l of notaLineas) { y += 3.2; doc.text(l, xCol[col], y + 3); }
      y += 4.4;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...o.colores.tinta);
      for (const lineas of cuerpo) {
        for (const l of lineas) {
          sitio(INT);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...o.colores.tinta);
          doc.text(l, xCol[col], y + 2.4);
          y += INT;
        }
        y += 0.9;
      }
      y += 1.6;
    }
    y += 2;
  }
}
