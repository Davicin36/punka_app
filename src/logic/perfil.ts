// Perfil "de juego" de una miniatura: atributos con los modificadores de su equipo,
// blindaje y perfiles de sus armas. Sigue la convención del libro: "base (modificado)".
import type { Arma, ClaveAtributo, Miniatura, PerfilArma, Unidad } from '../types';
import { COMUN, armaPorNombre, blindajePorNombre, equipoPorNombre, mutacionPorNombre, unidadPorId } from '../data';

export interface ArmaEquipada {
  arma: Arma | null;
  /** Nombre que se muestra (puede ser el nombre propio de un arma fija: "Lucy (pistola)") */
  nombre: string;
  cantidad: number;
}

export interface ValorAtributo {
  base: string;
  /** Valor con modificadores; igual a base si no cambia */
  valor: string;
  cambia: boolean;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const PLURALES: Record<string, string> = { 'filos medios': 'filo medio', pistolas: 'pistola', 'filos pequenos': 'filo pequeno', mazas: 'maza' };
const armaPorNorm = Object.fromEntries(Object.values(armaPorNombre).map(a => [norm(a.nombre), a]));

/** Intenta reconocer armas del catálogo en el texto de armas fijas de una personalidad. */
function armasDeTexto(texto: string): ArmaEquipada[] {
  if (!texto || norm(texto) === 'ninguna') return [];
  return texto.split(/,| y /).map(t => t.trim()).filter(Boolean).map(parte => {
    let cantidad = 1;
    let p = parte.replace(/^(\d+)\s+/, (_, n) => { cantidad = Number(n); return ''; });
    const dentro = p.match(/\(([^)]+)\)/)?.[1];
    p = p.replace(/\s*con mira tel[eé]sc[oó]pica/i, '');
    const candidatos = [dentro, p.replace(/\s*\(.*\)/, '')].filter(Boolean).map(x => norm(x!)).map(x => PLURALES[x] ?? x);
    const arma = candidatos.map(c => armaPorNorm[c]).find(Boolean) ?? null;
    return { arma, nombre: parte.charAt(0).toUpperCase() + parte.slice(1), cantidad };
  });
}

/** Armas que lleva la miniatura: elegidas, fijas (personalidades) y las que dan las mutaciones. */
export function armasDeMiniatura(m: Miniatura): ArmaEquipada[] {
  const u = unidadPorId[m.unidad];
  const out: ArmaEquipada[] = u.armas
    ? Object.entries(m.armas).filter(([, q]) => q > 0).map(([n, q]) => ({ arma: armaPorNombre[n] ?? null, nombre: n, cantidad: q }))
    : armasDeTexto(u.armasFijas ?? '');
  for (const n of m.mutaciones ?? []) {
    const a = mutacionPorNombre[n]?.arma;
    if (a && armaPorNombre[a]) out.push({ arma: armaPorNombre[a], nombre: a, cantidad: 1 });
  }
  return out;
}

export const nombreBlindaje = (m: Miniatura) => {
  const u = unidadPorId[m.unidad];
  return m.blindaje >= 0 ? u.blindaje.opciones[m.blindaje]?.nombre ?? u.blindaje.base : u.blindaje.base;
};

/** Objetos equipados con sus reglas (armas, blindaje, equipo), para validar A dos manos / Armatoste. */
export function objetosConReglas(m: Miniatura): { nombre: string; reglas: string[] }[] {
  const out = armasDeMiniatura(m).filter(a => a.arma).map(a => ({ nombre: a.nombre, reglas: a.arma!.reglas }));
  const bl = blindajePorNombre[nombreBlindaje(m)];
  if (bl?.reglas.length) out.push({ nombre: bl.nombre, reglas: bl.reglas });
  return out;
}

export const tieneRegla = (m: Miniatura, regla: string) => objetosConReglas(m).filter(o => o.reglas.includes(regla));
export const llevaEscudo = (m: Miniatura) => !!m.equipo?.['Escudo'];
export const llevaArmaDeFuego = (m: Miniatura) => armasDeMiniatura(m).some(a => a.arma?.reglas.includes('Arma de fuego'));

/** Unidades con equipo cerrado: su perfil del libro ya incluye los modificadores. */
export const perfilYaModificado = (u: Unidad) => !u.armas || Object.values(u.perfil ?? {}).some(v => v.includes('('));

const num = (v: string) => (/^-?\d+$/.test(v) ? Number(v) : null);

/** Atributos con modificadores, al estilo del libro: "4 (6)". */
export function perfilEfectivo(m: Miniatura): Record<ClaveAtributo, ValorAtributo> | null {
  const u = unidadPorId[m.unidad];
  if (!u.perfil) return null;
  const mods: Partial<Record<ClaveAtributo, number>> = {};
  const sumar = (k: ClaveAtributo, v: number) => { mods[k] = (mods[k] ?? 0) + v; };

  if (!perfilYaModificado(u)) {
    // Mutaciones con bonificadores fijos
    for (const n of m.mutaciones ?? []) for (const [k, v] of Object.entries(mutacionPorNombre[n]?.modificadores ?? {})) sumar(k as ClaveAtributo, v);
    // Armatoste: -1 Agilidad
    if (tieneRegla(m, 'Armatoste').length && !u.ignoraArmatoste) sumar('agilidad', -1);
    // Equipo con modificadores (Escudo: -1 Combate)
    for (const [n, q] of Object.entries(m.equipo ?? {})) if (q) for (const [k, v] of Object.entries(equipoPorNombre[n]?.modificadores ?? {})) sumar(k as ClaveAtributo, v);
    // Armas cuerpo a cuerpo: mejor modificador de Combate y de Fuerza
    const cc = armasDeMiniatura(m).flatMap(a => a.arma?.perfiles.filter(p => p.modo === 'cc') ?? []);
    if (cc.length) {
      const com = Math.max(...cc.map(p => p.combate ?? 0));
      const fue = Math.max(...cc.map(p => (/^[+-]\d+$/.test(p.fuerza) ? Number(p.fuerza) : 0)));
      if (com) sumar('combate', com);
      if (fue) sumar('fuerza', fue);
    }
    // Armas a distancia "Difícil de usar": -1 Precisión
    if (armasDeMiniatura(m).some(a => a.arma?.reglas.includes('Difícil de usar'))) sumar('precision', -1);
  }

  return Object.fromEntries(COMUN.atributos.map(({ clave }) => {
    const base = u.perfil![clave];
    const n = num(base), mod = mods[clave] ?? 0;
    const valor = n !== null && mod ? String(Math.max(1, n + mod)) : base;
    return [clave, { base, valor, cambia: valor !== base }];
  })) as Record<ClaveAtributo, ValorAtributo>;
}

/** Texto "4 (6)" para un atributo. */
export const textoAtributo = (v: ValorAtributo) => (v.cambia ? `${v.base} (${v.valor})` : v.base);

/** Fuerza base (sin modificadores) para las armas que dependen del lanzador. */
function fuerzaLanzador(m: Miniatura): number | null {
  const u = unidadPorId[m.unidad];
  const raw = u.perfil?.fuerza ?? '';
  const n = Number(raw.split(' ')[0]);
  if (!Number.isFinite(n)) return null;
  // Solo cuentan las mejoras permanentes (mutaciones), no el arma cuerpo a cuerpo
  return n + (m.mutaciones ?? []).reduce((s, x) => s + (mutacionPorNombre[x]?.modificadores?.fuerza ?? 0), 0);
}

/** Sustituye "L" (Fuerza del lanzador) por el número real: "L+1/L/L-1" → "5/4/3". */
function resolverLanzador(valor: string, f: number | null): string {
  if (!valor.includes('L') || f === null) return valor;
  return valor.replace(/L×5/g, `${f * 5} cm`).replace(/L([+-]\d+)?/g, (_, d) => String(f + (d ? Number(d) : 0)));
}

export interface PerfilArmaTexto {
  modo: 'Cuerpo a cuerpo' | 'Distancia';
  combate: string;
  fuerza: string;
  penetracion: string;
  distancia: string;
  nota?: string;
}

/** Perfil de un arma listo para mostrar (como en la hoja de control de banda). */
export function perfilesArmaTexto(arma: Arma, m: Miniatura): PerfilArmaTexto[] {
  const f = fuerzaLanzador(m);
  const fmtCom = (p: PerfilArma) => (p.modo !== 'cc' || !p.combate ? '-' : p.combate > 0 ? `+${p.combate}` : String(p.combate));
  return arma.perfiles.map(p => ({
    modo: p.modo === 'cc' ? 'Cuerpo a cuerpo' : 'Distancia',
    combate: fmtCom(p),
    fuerza: resolverLanzador(p.fuerza === '+0' ? '-' : p.fuerza, f),
    penetracion: p.penetracion,
    distancia: p.distancia ? resolverLanzador(p.distancia, f) : '-',
    nota: p.nota,
  }));
}

/** Valor de Blindaje: el de la armadura o el de la mutación Piel dura, el mayor. */
export function blindajeEfectivo(m: Miniatura): { valor: string; nota?: string } {
  const bl = blindajePorNombre[nombreBlindaje(m)];
  let valor = bl?.blindaje ?? '-';
  for (const n of m.mutaciones ?? []) {
    const b = mutacionPorNombre[n]?.blindaje;
    if (b && Number(b) > Number(valor)) valor = b;
  }
  const notas = [bl?.nota, llevaEscudo(m) ? '+2 en cuerpo a cuerpo con escudo' : '',
    armasDeMiniatura(m).some(a => a.nombre === 'Chasqueador y traje voltaico') ? 'Traje voltaico: Blindaje 2' : ''].filter(Boolean);
  return { valor, nota: notas.join(' · ') || undefined };
}
