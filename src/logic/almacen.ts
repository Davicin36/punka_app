// Guardado local (sin base de datos): las bandas de Punkapocalyptic y los ejércitos de Epic
// viven en el navegador y se pueden exportar / importar como archivo JSON.
import type { Ajustes, Banda } from '../types';
import type { ListaEpic } from '../epic/tipos';
import { COMUN, faccionPorId, unidadPorId } from '../data';
import { INDICE_EPIC } from '../epic/datos';
import { nuevoId } from './banda';

const CLAVE = 'punka-bandas-v1';

export interface Estado {
  bandas: Banda[];
  ejercitos: ListaEpic[];
  ajustes: Ajustes;
}

export const estadoInicial: Estado = { bandas: [], ejercitos: [], ajustes: { costeBala: COMUN.costeBala } };

export function cargar(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return estadoInicial;
    const d = JSON.parse(raw) as Partial<Estado>;
    // El coste de la bala viene del reglamento (comun.json), no de lo guardado
    return {
      bandas: (d.bandas ?? []).filter(esBandaValida).map(normalizar),
      ejercitos: (d.ejercitos ?? []).filter(esListaEpicValida).map(migrarLista),
      ajustes: estadoInicial.ajustes,
    };
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

/** Nombres de mejora que cambiaron: se traducen en las listas guardadas o importadas. */
const MEJORAS_RENOMBRADAS: Record<string, string> = {
  'Tank Squadron * These upgrades may add up to one Chimera per each of their units for +25 points each. All infantry units in the formation must be transported in Chimera if any are taken but you may not take more than one Chimera per unit in the formation.': 'Tank Squadron*',
};
function migrarLista(l: ListaEpic): ListaEpic {
  // Lobos Espaciales: «Space Wolves» y «Dreadnoughts» pasaron de variantes a opciones separadas
  if (l.ejercito === 'space-marine-space-wolves') for (const fe of l.formaciones) {
    const sw = ['Grey Hunters', 'Blood Claws', 'Long Fangs', 'Wolf Guard Terminators'];
    if (fe.mejoras['Space Wolves']) {
      const v = fe.variantes['Space Wolves'] ?? 0;
      fe.mejoras[`Space Wolves: ${sw[v]}`] = fe.mejoras['Space Wolves'];
      delete fe.mejoras['Space Wolves']; delete fe.variantes['Space Wolves'];
    }
    if (fe.mejoras['Dreadnoughts']) {
      const v = fe.variantes['Dreadnoughts'] ?? 0;
      fe.mejoras[v ? 'Dreadnoughts: Venerable Dreadnought' : 'Dreadnoughts: Dreadnoughts'] = fe.mejoras['Dreadnoughts'];
      delete fe.mejoras['Dreadnoughts']; delete fe.variantes['Dreadnoughts'];
    }
  }
  for (const fe of l.formaciones) {
    for (const [viejo, nuevo] of Object.entries(MEJORAS_RENOMBRADAS)) {
      for (const r of [fe.mejoras, fe.variantes] as Record<string, number>[]) {
        if (r && viejo in r) { r[nuevo] = r[viejo]; delete r[viejo]; }
      }
      if (fe.reparto) for (const k of Object.keys(fe.reparto)) {
        if (k.includes(viejo)) { fe.reparto[k.replace(viejo, nuevo)] = fe.reparto[k]; delete fe.reparto[k]; }
      }
    }
  }
  return l;
}

function esListaEpicValida(l: unknown): l is ListaEpic {
  const x = l as ListaEpic;
  return !!x && x.juego === 'epic' && typeof x.id === 'string' && INDICE_EPIC.some(e => e.id === x.ejercito) && Array.isArray(x.formaciones);
}

export function exportarBanda(b: Banda): string {
  return JSON.stringify({ formato: 'punka-banda', version: 1, banda: b }, null, 2);
}

export function exportarListaEpic(l: ListaEpic): string {
  return JSON.stringify({ formato: 'punka-banda', version: 1, ejercito: l }, null, 2);
}

export function exportarTodo(e: Estado): string {
  return JSON.stringify({ formato: 'punka-banda', version: 1, bandas: e.bandas, ejercitos: e.ejercitos }, null, 2);
}

/** Acepta cualquier JSON exportado por la app (una banda, un ejército o todo). */
export function importar(texto: string): { bandas: Banda[]; ejercitos: ListaEpic[] } {
  const d = JSON.parse(texto);
  const brutas: unknown[] = Array.isArray(d) ? d : [
    ...(d?.banda ? [d.banda] : []), ...(Array.isArray(d?.bandas) ? d.bandas : []),
    ...(d?.ejercito ? [d.ejercito] : []), ...(Array.isArray(d?.ejercitos) ? d.ejercitos : []),
  ];
  if (!brutas.length) brutas.push(d);
  const bandas = brutas.filter(esBandaValida).map(b => ({ ...normalizar(b), id: nuevoId(), actualizada: Date.now() }));
  const ejercitos = brutas.filter(esListaEpicValida).map(migrarLista).map(l => ({ ...l, id: nuevoId(), actualizada: Date.now() }));
  if (!bandas.length && !ejercitos.length) throw new Error('El archivo no contiene ninguna banda ni ejército válido.');
  return { bandas, ejercitos };
}
