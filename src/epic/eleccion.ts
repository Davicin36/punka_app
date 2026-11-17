// ===== Elecciones dentro de una formación =====
// Los textos de NetEA indican qué unidades pueden escogerse: «Any four of the following units: Predator Annihilator,
// Predator Destructor», «One Baneblade or Shadowsword», «Add any one of the following characters: Captain, Chaplain,
// Librarian»… Aquí se detectan esas opciones cruzando el texto con las hojas de datos del ejército.
import type { EjercitoEpic, FichaEpic, FormacionElegida } from './tipos';
import { formacionDe, mejoraDe } from './logica';
import { es, nom } from './texto';

export interface GrupoEleccion {
  /** Clave en FormacionElegida.reparto */
  clave: string;
  /** De dónde sale: «Unidades», el texto del extra o el nombre de la mejora */
  origen: string;
  opciones: string[];
  min: number;
  max: number;
  /** true si son personajes (se elige uno por cada personaje añadido) */
  personaje: boolean;
}

const NUM: Record<string, number> = {
  one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const numero = (w: string) => NUM[w.toLowerCase()] ?? (/^\d+$/.test(w) ? Number(w) : undefined);

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Encontrada { nombre: string; ini: number; fin: number }

const cacheRe = new WeakMap<EjercitoEpic, { nombre: string; re: RegExp }[]>();
function patrones(e: EjercitoEpic) {
  let p = cacheRe.get(e);
  if (!p) {
    // Más largos primero, para que «Land Raider Crusader» no se quede en «Land Raider»
    p = [...(e.fichas ?? [])].sort((a, b) => b.nombre.length - a.nombre.length).map(f => {
      const base = escapar(f.nombre);
      const plural = f.nombre.endsWith('y') ? `|${escapar(f.nombre.slice(0, -1))}ies` : '';
      return { nombre: f.nombre, re: new RegExp(`(?<![\\w-])(?:${base}(?:s|es)?${plural})(?![\\w-])`, 'g') };
    });
    cacheRe.set(e, p);
  }
  return p;
}

/** Unidades con hoja de datos que aparecen en un texto, en orden. */
export function unidadesEnTexto(e: EjercitoEpic, texto: string): Encontrada[] {
  const usadas: [number, number][] = [];
  const out: Encontrada[] = [];
  for (const { nombre, re } of patrones(e)) {
    re.lastIndex = 0;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      const ini = m.index, fin = m.index + m[0].length;
      if (usadas.some(([a, b]) => ini < b && fin > a)) continue;
      usadas.push([ini, fin]);
      out.push({ nombre, ini, fin });
    }
  }
  return out.sort((a, b) => a.ini - b.ini);
}

export const fichaDe = (e: EjercitoEpic, nombre: string): FichaEpic | undefined => e.fichas?.find(f => f.nombre === nombre);

/** Grupos de alternativas («A, B or C») dentro de un texto, con cuántas hay que escoger. */
function gruposEnTexto(e: EjercitoEpic, texto: string): { opciones: string[]; min: number; max: number; personaje: boolean }[] {
  const us = unidadesEnTexto(e, texto);
  const out: { opciones: string[]; min: number; max: number; personaje: boolean }[] = [];
  let i = 0;
  while (i < us.length) {
    let j = i;
    // Unidades seguidas separadas solo por «,» / «or» / «, or»
    while (j + 1 < us.length && /^\s*(,|or|,\s*or)\s*$/.test(texto.slice(us[j].fin, us[j + 1].ini))) j++;
    if (j > i) {
      const antes = texto.slice(0, us[i].ini);
      const opciones = [...new Set(us.slice(i, j + 1).map(u => u.nombre))];
      // «… to a Battlefortress, Big Gunz or Stompa»: es dónde se pone, no qué se escoge
      // «… to a Battlefortress, Big Gunz or Stompa» (dónde se pone) o «consisting only of Farseer, Guardians…» (requisito): no son elecciones
      if (!/\bto (a|an|the)\s*$|\bonly( of)?\s*$|consisting of\s*$/i.test(antes) && opciones.length > 1) {
        const tramo = /following/i.test(antes.slice(-80)) ? antes.slice(0, antes.toLowerCase().lastIndexOf('following')) : antes;
        const pal = tramo.split(/[^\w–-]+/).filter(Boolean);
        // Número que precede a las opciones («Any four of the following…», «Three Bombards or…»)
        let n: number | undefined, k = pal.length - 1;
        for (; k >= Math.max(0, pal.length - 6); k--) {
          const w = pal[k].toLowerCase();
          if ((w === 'a' || w === 'an') && k !== pal.length - 1) continue;
          n = numero(w);
          if (n !== undefined) break;
        }
        const previo = k >= 0 ? pal.slice(Math.max(0, k - 3), k).join(' ').toLowerCase() : '';
        const max = n ?? 1;
        let min = max;
        if (/up to/.test(previo)) min = 0;
        const entre = previo.match(/between (\w+) and$/);
        if (entre) { const a = numero(entre[1]); if (a !== undefined) min = a; }
        const personaje = opciones.every(o => fichaDe(e, o)?.tipo === 'CH');
        out.push({ opciones, min, max, personaje });
      }
    }
    i = j + 1;
  }
  return out;
}

/** Todos los grupos de elección de una formación elegida (según sus extras y mejoras actuales). */
export function gruposEleccion(e: EjercitoEpic, fe: FormacionElegida): GrupoEleccion[] {
  const f = formacionDe(e, fe.formacion);
  if (!f || !e.fichas?.length) return [];
  const out: GrupoEleccion[] = [];
  gruposEnTexto(e, f.unidades).forEach((g, k) =>
    out.push({ clave: `u${k}`, origen: 'Unidades', opciones: g.opciones, min: g.min, max: g.max, personaje: g.personaje }));
  (f.extras ?? []).forEach((x, j) => {
    const n = fe.extras[j] ?? 0;
    if (!n) return;
    gruposEnTexto(e, x.texto).forEach((g, k) => {
      const [min, max] = x.porUnidad ? [n, n] : [g.min, g.max];
      out.push({ clave: `x${j}.${k}`, origen: es(x.textoEs, x.texto), opciones: g.opciones, min, max, personaje: g.personaje });
    });
  });
  for (const [nombre, n] of Object.entries(fe.mejoras)) {
    if (!n) continue;
    const m = mejoraDe(e, nombre);
    if (!m) continue;
    const v = fe.variantes[nombre] ?? 0;
    // «0–1 Supreme Commander per army»: la segunda opción de precio es el Comandante supremo, sin elección
    if (v > 0 && /Supreme Commander/.test(m.texto) && (m.variantes?.length ?? 0) > 1) continue;
    const conSupremo = /Supreme Commander/.test(m.texto) && (m.variantes?.length ?? 0) > 1;
    gruposEnTexto(e, m.texto).forEach((g, k) => {
      if (conSupremo && !g.personaje) return;
      const opciones = g.personaje ? g.opciones.filter(o => o !== 'Supreme Commander') : g.opciones;
      if (opciones.length < 2) return;
      const [min, max] = m.porUnidad ? [n, n] : [g.min, g.max];
      out.push({ clave: `m:${nombre}.${k}`, origen: nom(m), opciones, min, max, personaje: g.personaje });
    });
  }
  return out;
}

export const totalReparto = (fe: FormacionElegida, clave: string) =>
  Object.values(fe.reparto?.[clave] ?? {}).reduce((s, n) => s + n, 0);

/** Avisos de repartos sin completar o pasados. */
export function problemasReparto(e: EjercitoEpic, fe: FormacionElegida): string[] {
  return gruposEleccion(e, fe).flatMap(g => {
    const t = totalReparto(fe, g.clave);
    const que = g.personaje ? 'personaje' : 'unidades';
    if (t < g.min) return [`${g.origen}: elige ${g.min === g.max ? g.min : `al menos ${g.min}`} ${que} (${g.opciones.join(' / ')}); llevas ${t}.`];
    if (t > g.max) return [`${g.origen}: máximo ${g.max} ${que}; llevas ${t}.`];
    return [];
  });
}

/** Texto del reparto: «2 Predator Annihilator, 2 Predator Destructor». */
export function textoReparto(e: EjercitoEpic, fe: FormacionElegida): { origen: string; texto: string }[] {
  return gruposEleccion(e, fe).flatMap(g => {
    const r = Object.entries(fe.reparto?.[g.clave] ?? {}).filter(([o, n]) => n > 0 && g.opciones.includes(o));
    if (!r.length) return [];
    return [{ origen: g.origen, texto: r.map(([o, n]) => (g.max === 1 ? o : `${n} ${o}`)).join(', ') }];
  });
}

/** Unidades con hoja de datos que hay en la lista (para el PDF), en el orden de las hojas del ejército. */
export function unidadesDeLista(e: EjercitoEpic, formaciones: FormacionElegida[]): FichaEpic[] {
  const usadas = new Set<string>();
  for (const fe of formaciones) {
    const f = formacionDe(e, fe.formacion);
    if (!f) continue;
    const grupos = gruposEleccion(e, fe);
    const enGrupo = new Set(grupos.flatMap(g => g.opciones));
    const elegidas = new Set(grupos.flatMap(g => Object.entries(fe.reparto?.[g.clave] ?? {}).filter(([, n]) => n > 0).map(([o]) => o)));
    const textos = [f.unidades, ...(f.extras ?? []).filter((_, j) => fe.extras[j]).map(x => x.texto)];
    for (const [nombre, n] of Object.entries(fe.mejoras)) {
      if (!n) continue;
      const m = mejoraDe(e, nombre);
      if (!m) continue;
      const conSupremo = /Supreme Commander/.test(m.texto) && (m.variantes?.length ?? 0) > 1;
      if (conSupremo) {
        // Comandante: o el personaje escogido (en el reparto) o el Comandante supremo
        if ((fe.variantes[nombre] ?? 0) > 0) usadas.add('Supreme Commander');
        continue;
      }
      textos.push(m.nombre, m.texto);
    }
    for (const t of textos) for (const u of unidadesEnTexto(e, t)) {
      // De las alternativas solo las escogidas (si aún no se ha escogido, todas)
      if (enGrupo.has(u.nombre) && elegidas.size && !elegidas.has(u.nombre)) continue;
      usadas.add(u.nombre);
    }
    elegidas.forEach(u => usadas.add(u));
  }
  return (e.fichas ?? []).filter(f => usadas.has(f.nombre));
}
