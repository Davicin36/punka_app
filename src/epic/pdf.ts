// Hoja de ejército de Epic Armageddon (NetEA) en PDF, con el mismo estilo que la de Punkapocalyptic.
import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { EjercitoEpic, ListaEpic } from './tipos';
import { comprasSueltas, costeAliados, costeFormacion, costeLista, detalleFormacion, formacionDe, problemasLista } from './logica';
import { nombreArchivo } from '../logic/descargar';
import { es, nom } from './texto';
import { anexoReglas } from '../logic/pdfReglas';
import { unidadesDeLista } from './eleccion';

type RGB = [number, number, number];
const PAPEL: RGB = [243, 234, 211];
const PAPEL2: RGB = [233, 220, 190];
const TINTA: RGB = [52, 40, 28];
const LINEA: RGB = [92, 74, 54];
const SUAVE: RGB = [120, 104, 84];
const OXIDO: RGB = [170, 62, 20];
type ConTabla = jsPDF & { lastAutoTable?: { finalY: number } };

export function crearPdfEpic(e: EjercitoEpic, l: ListaEpic): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as ConTabla;
  const W = 210, H = 297, M = 10;
  const total = costeLista(e, l);
  const maxAliados = e.fraccionAliados ? Math.floor(l.puntos * e.fraccionAliados) : null;

  // Cabecera
  doc.setFillColor(...PAPEL2); doc.setDrawColor(...LINEA); doc.setLineWidth(0.3);
  doc.rect(M, M, W - M * 2, 20, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...OXIDO);
  doc.text('EPIC ARMAGEDDON · NetEA', M + 3, M + 5.5);
  doc.setFontSize(15); doc.setTextColor(...TINTA);
  doc.text(l.nombre, M + 3, M + 12.5, { maxWidth: 120 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(`${e.nombreEs ?? e.nombre} (lista ${e.version})`, M + 3, M + 17.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text(`${total} / ${l.puntos} pts`, W - M - 3, M + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...SUAVE);
  doc.text(`Factor de estrategia ${e.estrategia ?? '-'}  ·  ${l.formaciones.length} formaciones`, W - M - 3, M + 13, { align: 'right' });
  if (maxAliados !== null) doc.text(`Aliados, aeronaves y titanes: ${costeAliados(e, l)} / ${maxAliados}`, W - M - 3, M + 17.5, { align: 'right' });

  // Tablas por sección
  let y = M + 25;
  let n = 0;
  for (const s of e.secciones) {
    const fs = l.formaciones.filter(fe => formacionDe(e, fe.formacion)?.seccion === s.id);
    if (!fs.length) continue;
    const cuerpo: RowInput[] = fs.map(fe => {
      n++;
      const d = detalleFormacion(e, fe);
      const lineas = [es(d.formacion.unidadesEs, d.formacion.unidades)];
      if (d.extras.length) lineas.push('Extras: ' + d.extras.join('; '));
      for (const r of d.reparto) lineas.push(`${r.origen === 'Unidades' ? 'Composición' : r.origen}: ${r.texto}`);
      if (d.mejoras.length) lineas.push('Mejoras: ' + d.mejoras.join(', '));
      if (fe.nota) lineas.push('Nota: ' + fe.nota);
      return [
        { content: String(n), styles: { textColor: OXIDO, fontStyle: 'bold', halign: 'center' } },
        { content: nom(d.formacion) + (d.tamano ? `\n[${d.tamano}]` : ''), styles: { fontStyle: 'bold' } },
        lineas.join('\n'),
        { content: String(costeFormacion(e, fe)), styles: { fontStyle: 'bold', halign: 'right' } },
      ];
    });
    const subtotal = fs.reduce((t, fe) => t + costeFormacion(e, fe), 0);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [[{ content: `${nom(s).toUpperCase()}`, colSpan: 3 }, { content: String(subtotal), styles: { halign: 'right' } }]],
      body: cuerpo,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.6, cellPadding: 1.6, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2, fillColor: PAPEL, valign: 'top' },
      headStyles: { fillColor: PAPEL2, textColor: OXIDO, fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 42 }, 3: { cellWidth: 14 } },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 4;
  }

  // Compras sueltas
  const compras = comprasSueltas(e).filter(c => l.compras[c.id]);
  if (compras.length) {
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [[{ content: 'COMPRAS DEL EJÉRCITO', colSpan: 2 }, { content: '', styles: { halign: 'right' } }]],
      body: compras.map(c => [nom(c), `×${l.compras[c.id]}`, { content: String(c.coste * l.compras[c.id]), styles: { halign: 'right', fontStyle: 'bold' } }]),
      theme: 'grid',
      styles: { fontSize: 8.6, cellPadding: 1.6, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2, fillColor: PAPEL },
      headStyles: { fillColor: PAPEL2, textColor: OXIDO, fontStyle: 'bold' },
      columnStyles: { 1: { cellWidth: 20 }, 2: { cellWidth: 14 } },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 4;
  }

  // Avisos e iniciativa
  const problemas = problemasLista(e, l);
  const bloques: [string, string[]][] = [
    ...(problemas.length ? [['Avisos', problemas.map(p => '- ' + p)] as [string, string[]]] : []),
    [`Factor de estrategia ${e.estrategia ?? '-'} · Iniciativa`, [es(e.iniciativaEs, e.iniciativa)]],
  ];
  doc.setFontSize(8.2);
  for (const [t, ls] of bloques) {
    const partes = ls.flatMap(x => doc.splitTextToSize(x, W - M * 2 - 4) as string[]);
    if (y + 6 + partes.length * 3.6 > H - 12) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...OXIDO); doc.text(t.toUpperCase(), M, y + 3); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...TINTA); doc.text(partes, M, y); y += partes.length * 3.6 + 3;
  }

  // Perfiles de atributos de las unidades de la lista
  const fichas = unidadesDeLista(e, l.formaciones);
  if (fichas.length) {
    if (y > H - 40) { doc.addPage(); y = M; }
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [
        [{ content: 'PERFILES DE ATRIBUTOS', colSpan: 10 }],
        ['Nombre', 'Tipo', 'Vel.', 'Blind.', 'CC', 'TT', 'Armas', 'Alc.', 'Potencia de fuego', 'Notas'],
      ],
      body: fichas.map(f => [
        { content: f.nombreEs ? `${f.nombreEs}\n(${f.nombre})` : f.nombre, styles: { fontStyle: 'bold' } },
        f.tipo, f.velocidad, f.blindaje, f.cc, f.ff,
        f.armas.map(a => a.nombre || '-').join('\n') || '-',
        f.armas.map(a => a.alcance || '-').join('\n'),
        f.armas.map(a => a.potencia || '-').join('\n'),
        f.notas,
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 6.8, cellPadding: 1.1, textColor: TINTA, lineColor: LINEA, lineWidth: 0.15, fillColor: PAPEL, valign: 'top', overflow: 'linebreak' },
      headStyles: { fillColor: PAPEL2, textColor: OXIDO, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 25 }, 1: { cellWidth: 9 }, 2: { cellWidth: 11 }, 3: { cellWidth: 9 }, 4: { cellWidth: 7 }, 5: { cellWidth: 8 },
        6: { cellWidth: 30 }, 7: { cellWidth: 12 }, 8: { cellWidth: 28 },
      },
      didParseCell: c => { if (c.section === 'head' && c.row.index === 0) c.cell.styles.fontSize = 9; },
    });
  }

  // Anexo: reglas especiales del ejército (Edición Deluxe en castellano)
  anexoReglas(doc, [{
    titulo: `Reglas especiales · ${e.nombreEs ?? e.nombre}`,
    reglas: (e.reglas ?? []).map(r => ({ nombre: `${r.id} ${r.titulo}`, parrafos: r.parrafos })),
  }], {
    margen: M, arriba: M, abajo: H - 12, colores: { tinta: TINTA, oxido: OXIDO, suave: SUAVE, linea: LINEA },
    nuevaPagina: () => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...SUAVE);
      doc.text(`${l.nombre} · ${e.nombreEs ?? e.nombre}`, W - M, M - 4, { align: 'right' });
    },
  });

  // Pie
  const paginas = doc.getNumberOfPages();
  const fecha = new Date().toLocaleDateString('es-ES');
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p); doc.setFontSize(7); doc.setTextColor(...SUAVE);
    doc.text(`Hoja de ejército · ${fecha}`, M, H - 6);
    doc.text(`${p} / ${paginas}`, W - M, H - 6, { align: 'right' });
  }
  return doc;
}

export function descargarPdfEpic(e: EjercitoEpic, l: ListaEpic) {
  crearPdfEpic(e, l).save(`${nombreArchivo(l.nombre)}.pdf`);
}
