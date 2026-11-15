// Guardado local (sin base de datos): las bandas viven en el navegador
// y se pueden exportar / importar como archivo JSON.
import type { Ajustes, Banda } from '../types';
import { COMUN, faccionPorId, unidadPorId } from '../data';
import { nuevoId } from './banda';

const CLAVE = 'punka-bandas-v1';

export interface Estado {
  bandas: Banda[];
  ajustes: Ajustes;
}

export const estadoInicial: Estado = { bandas: [], ajustes: { costeBala: COMUN.costeBala } };

export function cargar(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return estadoInicial;
    const d = JSON.parse(raw) as Partial<Estado>;
    // El coste de la bala viene del reglamento (comun.json), no de lo guardado
    return { bandas: (d.bandas ?? []).filter(esBandaValida).map(normalizar), ajustes: estadoInicial.ajustes };
  } catch {
    return estadoInicial;
  }
}

export function guardar(e: Estado) {
  try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch { /* almacenamiento no disponible */ }
}

/** Completa campos añadidos en versiones posteriores (bandas guardadas o importadas antes). */
function normalizar(b: Banda): Banda {
  return { ...b, extrasBanda: b.extrasBanda ?? {}, miniaturas: b.miniaturas.map(m => ({ ...m, reliquias: m.reliquias ?? [], mutaciones: m.mutaciones ?? [], articulos: m.articulos ?? [] })) };
}

function esBandaValida(b: unknown): b is Banda {
  const x = b as Banda;
  return !!x && typeof x.id === 'string' && !!faccionPorId[x.faccion] && Array.isArray(x.miniaturas)
    && x.miniaturas.every(m => !!unidadPorId[m?.unidad]);
}

export function exportarBanda(b: Banda): string {
  return JSON.stringify({ formato: 'punka-banda', version: 1, banda: b }, null, 2);
}

/** Acepta el JSON exportado (una banda o una lista de bandas). */
export function importarBandas(texto: string): Banda[] {
  const d = JSON.parse(texto);
  const brutas: unknown[] = Array.isArray(d) ? d : d?.banda ? [d.banda] : Array.isArray(d?.bandas) ? d.bandas : [d];
  const ok = brutas.filter(esBandaValida);
  if (!ok.length) throw new Error('El archivo no contiene ninguna banda válida.');
  return ok.map(b => ({ ...normalizar(b), id: nuevoId(), actualizada: Date.now() }));
}