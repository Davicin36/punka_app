// ===== Habilidades especiales de unidades y armas (Edición Deluxe, capítulos 2–4) =====
// Se buscan en los perfiles de atributos de la lista para explicarlas en el PDF.
import HABILIDADES from '../data/epic/habilidades.json';
import type { FichaEpic } from './tipos';

export interface Habilidad { id: string; titulo: string; claves: string[]; parrafos: string[] }

const LISTA = HABILIDADES as Habilidad[];

/** Abreviaturas de potencia de fuego → clave del glosario */
function clavesDeArma(potencia: string): string[] {
  const out: string[] = [];
  for (const t of potencia.split(/[,;]\s*/).map(x => x.replace(/^\d+×\s*/, '').trim())) {
    if (/(^|\/)AA\d/.test(t)) out.push('AA');
    if (/^MA/.test(t)) out.push('MA');
    if (/^AE/.test(t)) out.push('AE');
    if (/^MT/.test(t)) out.push('MT');
    if (['D', 'DP', 'IC', 'DU', 'Baj', 'Ind', 'FT/S'].includes(t)) out.push(t);
  }
  return out;
}

const contiene = (texto: string, clave: string) =>
  new RegExp(`(^|[^\\p{L}])${clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu').test(texto);

/** Habilidades que aparecen en estos perfiles, con quién las tiene. */
export function habilidadesDe(fichas: FichaEpic[]): { habilidad: Habilidad; quien: string[] }[] {
  const usos = new Map<string, Set<string>>();
  for (const f of fichas) {
    const nombre = f.nombreEs ?? f.nombre;
    const claves = new Set<string>([f.tipo.split('/')[0] === 'PJ' ? 'PJ' : '', f.tipo === 'VL' ? 'VL' : ''].filter(Boolean));
    f.armas.forEach(a => clavesDeArma(a.potencia).forEach(c => claves.add(c)));
    for (const h of LISTA) {
      if (h.claves.some(c => claves.has(c) || (c.length > 3 && contiene(f.notas, c)))) {
        if (!usos.has(h.id)) usos.set(h.id, new Set());
        usos.get(h.id)!.add(nombre);
      }
    }
  }
  return LISTA.filter(h => usos.has(h.id)).map(h => ({ habilidad: h, quien: [...usos.get(h.id)!] }));
}
