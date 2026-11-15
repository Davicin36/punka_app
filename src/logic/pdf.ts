// Hoja de control de banda en PDF (A4), al estilo de la ficha de Punkapocalyptic:
// una ficha por miniatura (4 por página) con atributos "base (modificado)", armadura,
// casillas de balas, equipo, recuadros de armas y columna de reglas especiales.
import { jsPDF } from 'jspdf';
import type { Ajustes, Banda, Miniatura } from '../types';
import { COMUN, faccionPorId, unidadPorId } from '../data';
import { costeBanda, costeMiniatura, detalleMiniatura, extrasBandaTexto, maxMiniaturas, numMiniaturas, problemasBanda } from './banda';
import { armasDeMiniatura, blindajeEfectivo, llevaArmaDeFuego, nombreBlindaje, perfilEfectivo, perfilesArmaTexto, textoAtributo } from './perfil';
import { nombreArchivo } from './descargar';

type RGB = [number, number, number];
const PAPEL: RGB = [243, 234, 211];
const PAPEL2: RGB = [233, 220, 190];
const TINTA: RGB = [52, 40, 28];
const LINEA: RGB = [92, 74, 54];
const SUAVE: RGB = [120, 104, 84];
const OXIDO: RGB = [170, 62, 20];

const A4 = { w: 210, h: 297 };
const M = 8; // margen
const CAB = 14; // alto de la cabecera de página
const PIE = 7;
const FICHAS_POR_PAGINA = 4;
const ALTO_FICHA = (A4.h - M * 2 - CAB - PIE) / FICHAS_POR_PAGINA - 2;

export function crearPdfBanda(b: Banda, ajustes: Ajustes): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const f = faccionPorId[b.faccion];
  const total = costeBanda(b, ajustes);

  const fuente = (estilo: 'normal' | 'bold', tam: number, color: RGB = TINTA) => {
    doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...color);
  };
  const caja = (x: number, y: number, w: number, h: number, relleno?: RGB) => {
    doc.setDrawColor(...LINEA); doc.setLineWidth(0.3);
    if (relleno) { doc.setFillColor(...relleno); doc.rect(x, y, w, h, 'FD'); } else doc.rect(x, y, w, h);
  };
  /** Etiqueta en negrita + valor normal en la misma línea; devuelve la x final. */
  const etiquetaValor = (x: number, y: number, etiqueta: string, valor: string, tam = 8.5, maxW?: number) => {
    fuente('bold', tam); doc.text(etiqueta, x, y);
    const w = doc.getTextWidth(etiqueta) + 1.5;
    fuente('normal', tam - 0.5);
    const txt = maxW ? recortar(valor, maxW - w) : valor;
    doc.text(txt, x + w, y);
    return x + w + doc.getTextWidth(txt);
  };
  const recortar = (t: string, ancho: number) => {
    if (doc.getTextWidth(t) <= ancho) return t;
    let s = t;
    while (s.length > 1 && doc.getTextWidth(s + '…') > ancho) s = s.slice(0, -1);
    return s + '…';
  };

  const cabecera = () => {
    caja(M, M, A4.w - M * 2, CAB - 3, PAPEL2);
    fuente('bold', 13, OXIDO); doc.text('PUNKAPOCALYPTIC', M + 3, M + 7.2);
    const x0 = M + 3 + doc.getTextWidth('PUNKAPOCALYPTIC') + 6;
    etiquetaValor(x0, M + 7, 'Banda:', `${b.nombre}  ·  ${f.nombre}`, 10, 115);
    fuente('bold', 10);
    const t = `Total puntos: ${total} / ${b.puntos}`;
    doc.text(t, A4.w - M - 3, M + 5.3, { align: 'right' });
    fuente('normal', 7.5, SUAVE);
    doc.text(`${numMiniaturas(b)} / ${maxMiniaturas(b.puntos)} miniaturas`, A4.w - M - 3, M + 9.2, { align: 'right' });
  };

  const ficha = (m: Miniatura, y: number) => {
    const u = unidadPorId[m.unidad];
    const x = M, W = A4.w - M * 2, H = ALTO_FICHA;
    const wR = 50, wL = W - wR; // columna derecha: puntos y reglas
    caja(x, y, W, H, PAPEL);

    // --- Fila 1: unidad y puntos ---
    const h1 = 6.5;
    caja(x, y, wL, h1);
    const nombre = m.apodo ? `${u.nombre} (${m.apodo})` : u.nombre;
    etiquetaValor(x + 2, y + 4.6, 'Unidad:', nombre + (u.grupo ? ` · grupo de ${m.grupo}` : ''), 9.5, wL - 4);
    caja(x + wL, y, wR, h1);
    etiquetaValor(x + wL + 2, y + 4.6, 'Puntos:', String(costeMiniatura(m, b, ajustes)), 9.5);

    // --- Fila 2: atributos ---
    const h2 = 11, yA = y + h1;
    const p = perfilEfectivo(m);
    const wA = wL / COMUN.atributos.length;
    COMUN.atributos.forEach((a, i) => {
      const xa = x + i * wA;
      caja(xa, yA, wA, h2, PAPEL2);
      fuente('bold', 7.5); doc.text(a.nombre.charAt(0), xa + 1.3, yA + 3.4);
      const w0 = doc.getTextWidth(a.nombre.charAt(0));
      fuente('normal', 5.8); doc.text(a.nombre.slice(1).toLowerCase(), xa + 1.3 + w0, yA + 3.4);
      const v = p ? textoAtributo(p[a.clave]) : '-';
      fuente('normal', v.length > 4 ? 10.5 : 12.5); doc.text(v, xa + wA / 2, yA + 9.2, { align: 'center' });
    });

    // --- Fila 3: armadura, Bli. y casillas de balas ---
    const h3 = 5.6, yB = yA + h2;
    const bl = blindajeEfectivo(m);
    const wBalas = 52, wBli = 18, wArm = wL - wBalas - wBli;
    caja(x, yB, wArm, h3);
    etiquetaValor(x + 2, yB + 4, 'Armadura:', nombreBlindaje(m) + (bl.nota ? ` (${bl.nota})` : ''), 8.5, wArm - 4);
    caja(x + wArm, yB, wBli, h3);
    etiquetaValor(x + wArm + 2, yB + 4, 'Bli.:', bl.valor === '-' ? '-' : `+${bl.valor}`, 8.5);
    caja(x + wArm + wBli, yB, wBalas, h3);
    const balas = llevaArmaDeFuego(m) || m.balas ? Math.max(m.balas, 0) : 0;
    const casillas = Math.max(balas, llevaArmaDeFuego(m) ? 10 : 0);
    for (let i = 0; i < Math.min(casillas, 12); i++) {
      const bx = x + wArm + wBli + 2 + i * 4.1, by = yB + 1;
      doc.setDrawColor(...LINEA); doc.setLineWidth(0.25);
      if (i < balas) { doc.setFillColor(...TINTA); doc.roundedRect(bx, by, 2.8, 3.6, 1.2, 1.2, 'FD'); }
      else doc.roundedRect(bx, by, 2.8, 3.6, 1.2, 1.2);
    }
    if (!casillas) { fuente('normal', 7, SUAVE); doc.text('Sin armas de fuego', x + wArm + wBli + 2, yB + 4); }

    // --- Fila 4: equipo ---
    const h4 = 5.6, yE = yB + h3;
    caja(x, yE, wL, h4);
    const d = detalleMiniatura(m);
    etiquetaValor(x + 2, yE + 4, 'Equipo:', d.equipo.replace(/,?\s*\d+ balas/, '') || '-', 8.5, wL - 4);

    // --- Recuadros de armas ---
    const yW = yE + h4, hW = y + H - yW;
    const armas = armasDeMiniatura(m);
    const columnas = Math.max(2, Math.min(3, armas.length));
    const wW = wL / columnas;
    for (let c = 0; c < columnas; c++) {
      const xw = x + c * wW;
      caja(xw, yW, wW, hW);
      const a = armas[c];
      fuente('bold', 9); doc.text('Arma', xw + 2, yW + 4.2);
      if (!a) {
        ['Comb.:', 'Fue.:', 'Pen.:', 'Distancia (    /    /    )', 'Reglas Esp.:'].forEach((t, i) => { fuente('normal', 8); doc.text(t, xw + 4, yW + 8.4 + i * 3.9); });
        continue;
      }
      fuente('normal', 8.5);
      doc.text(recortar(a.nombre + (a.cantidad > 1 ? ` ×${a.cantidad}` : ''), wW - 14), xw + 11, yW + 4.2);
      if (!a.arma) {
        fuente('normal', 7.5, SUAVE); doc.text('Perfil en las reglas de la miniatura.', xw + 4, yW + 8.4);
        continue;
      }
      const perfiles = perfilesArmaTexto(a.arma, m);
      const ps = perfiles.length > 1 ? perfiles : [perfiles[0]];
      // Si tiene dos modos (p. ej. tomahawk) se muestran en dos subcolumnas
      const wSub = (wW - 4) / ps.length;
      ps.forEach((pf, k) => {
        const xs = xw + 4 + k * wSub;
        let yy = yW + 8.4;
        if (ps.length > 1) { fuente('bold', 6.5, OXIDO); doc.text(pf.modo === 'Distancia' ? 'A DISTANCIA' : 'CUERPO A CUERPO', xs, yy - 0.2); yy += 3.4; }
        const dist = pf.distancia.includes('/') ? `( ${pf.distancia.split('/').join(' / ')} )` : `( ${pf.distancia} )`;
        ([['Comb.:', pf.combate], ['Fue.:', pf.fuerza], ['Pen.:', pf.penetracion], ['Distancia', dist]] as const).forEach(([t, v]) => {
          fuente('normal', 8); doc.text(t, xs, yy);
          fuente('normal', 7.5); doc.text(recortar(v, wSub - doc.getTextWidth(t) - 3), xs + doc.getTextWidth(t) + 1.5, yy);
          yy += 3.6;
        });
      });
      const yReg = yW + 8.4 + 4 * 3.6 + (ps.length > 1 ? 3.4 : 0);
      fuente('normal', 8); doc.text('Reglas Esp.:', xw + 4, yReg);
      const reglas = [...a.arma.reglas, a.arma.nota ?? ''].filter(Boolean).join(', ');
      fuente('normal', 6.5);
      const lineas = doc.splitTextToSize(reglas, wW - 6) as string[];
      const caben = Math.max(1, Math.floor((yW + hW - yReg - 2) / 2.7));
      doc.text(lineas.slice(0, caben), xw + 4, yReg + 3.2);
    }

    // --- Columna derecha: reglas especiales y mutaciones ---
    const yR = y + h1;
    caja(x + wL, yR, wR, H - h1);
    fuente('bold', 8.5); doc.text('Reglas Esp./Mutaciones:', x + wL + 2, yR + 4.2);
    const reglasCol = [
      ...u.reglasEspeciales,
      ...m.mutaciones.map(n => `Mutación: ${n}`),
      ...(m.reliquias ?? []).map(n => `Reliquia: ${n}`),
      ...m.articulos.map(n => `Coña: ${n}`),
      ...(u.fieras && m.fieras ? [`${m.fieras} fiera(s)`] : []),
    ];
    fuente('normal', 7.2);
    let yy = yR + 8.2;
    for (const r of reglasCol) {
      const l = doc.splitTextToSize(`• ${r}`, wR - 4) as string[];
      if (yy + l.length * 3 > y + H - 1.5) { doc.text('…', x + wL + 2, yy); break; }
      doc.text(l, x + wL + 2, yy);
      yy += l.length * 3 + 0.6;
    }
  };

  // --- Páginas de fichas ---
  const yInicio = M + CAB;
  cabecera();
  if (!b.miniaturas.length) { fuente('normal', 10, SUAVE); doc.text('La banda no tiene miniaturas.', A4.w / 2, yInicio + 20, { align: 'center' }); }
  b.miniaturas.forEach((m, i) => {
    const pos = i % FICHAS_POR_PAGINA;
    if (i > 0 && pos === 0) { doc.addPage(); cabecera(); }
    ficha(m, yInicio + pos * (ALTO_FICHA + 2));
  });

  // --- Resumen: extras, avisos y restricciones ---
  const usadas = b.miniaturas.length % FICHAS_POR_PAGINA || (b.miniaturas.length ? FICHAS_POR_PAGINA : 0);
  let y = yInicio + usadas * (ALTO_FICHA + 2) + 2;
  const extras = extrasBandaTexto(b), problemas = problemasBanda(b, ajustes);
  const bloques: [string, string[]][] = [
    ...(extras.length ? [['Extras de la banda', [extras.join('  ·  ')]] as [string, string[]]] : []),
    ...(problemas.length ? [['Avisos', problemas.map(p => `- ${p}`)] as [string, string[]]] : []),
    [`Restricciones de ${f.nombre}`, f.restricciones.map(r => `- ${r}`)],
  ];
  const altoResumen = bloques.reduce((s, [, ls]) => s + 6 + ls.length * 4, 4);
  if (y + altoResumen > A4.h - M - PIE) { doc.addPage(); cabecera(); y = yInicio; }
  caja(M, y, A4.w - M * 2, Math.min(altoResumen, A4.h - M - PIE - y), PAPEL);
  y += 5;
  for (const [t, ls] of bloques) {
    fuente('bold', 9, OXIDO); doc.text(t.toUpperCase(), M + 3, y); y += 4.5;
    fuente('normal', 8);
    for (const l of ls) {
      const partes = doc.splitTextToSize(l, A4.w - M * 2 - 6) as string[];
      doc.text(partes, M + 3, y); y += partes.length * 3.8;
    }
    y += 1.5;
  }

  // --- Pie de página ---
  const paginas = doc.getNumberOfPages();
  const fecha = new Date().toLocaleDateString('es-ES');
  for (let pg = 1; pg <= paginas; pg++) {
    doc.setPage(pg);
    fuente('normal', 7, SUAVE);
    doc.text(`Hoja de control de banda · ${fecha}`, M, A4.h - M + 1);
    doc.text(`${pg} / ${paginas}`, A4.w - M, A4.h - M + 1, { align: 'right' });
  }
  return doc;
}

export function descargarPdfBanda(b: Banda, ajustes: Ajustes) {
  crearPdfBanda(b, ajustes).save(`${nombreArchivo(b.nombre)}.pdf`);
}