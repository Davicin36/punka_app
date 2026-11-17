// ===== Reglas especiales con su texto, para consultarlas en el editor y en el PDF =====
import type { Banda, Unidad } from '../types';
import { COMUN, faccionPorId, unidadPorId } from '../data';
import { objetosConReglas } from './perfil';

export interface ReglaTexto {
  nombre: string;
  texto: string;
  /** Quién la tiene (miniaturas u objetos) */
  quien: string[];
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const base = (s: string) => sinTildes(s.replace(/\s*\(.*\)\s*$/, '')).replace(/[^a-z0-9 ]/g, '').trim();

const GENERICAS = new Map(Object.entries(COMUN.reglasGenericas ?? {}).map(([n, t]) => [base(n), t]));

/** Texto de una regla genérica (Raudo, Escasa, Retraso (2)…), con la X sustituida. */
export function textoGenerico(regla: string): string | undefined {
  const t = GENERICAS.get(base(regla));
  const x = regla.match(/\((\d+)\)/)?.[1];
  return t && x ? t.replace(/\(X\)/g, `(${x})`) : t;
}

/** Texto de una regla de una unidad: la suya propia o la genérica. */
export const textoReglaUnidad = (u: Unidad, regla: string) => u.reglasTexto?.[regla] ?? textoGenerico(regla) ?? '';

/** Reglas de la facción + las de cada miniatura + las de sus armas y blindajes, sin repetir. */
export function reglasDeBanda(b: Banda): { faccion: ReglaTexto[]; miniaturas: ReglaTexto[]; equipo: ReglaTexto[] } {
  const f = faccionPorId[b.faccion];
  const faccion = (f?.reglasFaccion ?? []).map(r => ({ nombre: r, texto: f.reglasFaccionTexto?.[r] ?? '', quien: [] }));
  const porClave = new Map<string, ReglaTexto>();
  const equipo = new Map<string, ReglaTexto>();
  for (const m of b.miniaturas) {
    const u = unidadPorId[m.unidad];
    if (!u) continue;
    for (const r of u.reglasEspeciales) {
      const texto = textoReglaUnidad(u, r);
      const k = `${r}|${texto}`;
      const e = porClave.get(k) ?? { nombre: r, texto, quien: [] };
      if (!e.quien.includes(u.nombre)) e.quien.push(u.nombre);
      porClave.set(k, e);
    }
    for (const o of objetosConReglas(m)) {
      for (const r of o.reglas) {
        const texto = textoGenerico(r);
        if (!texto) continue;
        const e = equipo.get(r) ?? { nombre: r, texto, quien: [] };
        if (!e.quien.includes(o.nombre)) e.quien.push(o.nombre);
        equipo.set(r, e);
      }
    }
  }
  const orden = (a: ReglaTexto, z: ReglaTexto) => a.nombre.localeCompare(z.nombre, 'es');
  return { faccion, miniaturas: [...porClave.values()].sort(orden), equipo: [...equipo.values()].sort(orden) };
}
