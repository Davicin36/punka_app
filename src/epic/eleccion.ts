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
  /** Variantes de Leman Russ: recargo de cada opción, máximos por opción y cuáles son raras */
  costes?: Record<string, number>;
  maxPor?: Record<string, number>;
  raras?: string[];
}

// ===== Variantes de Leman Russ (Minerva, Krieg) =====
// La lista vende «variantes» con un recargo cada una; las formaciones dicen cuántas llevan
// («Any six Leman Russ variants», «Add any three Leman Russ variants»). Se escogen en la formación.

/** Compras del ejército que son variantes de Leman Russ (no se compran sueltas). */
export const esVarianteLeman = (seccion: string) => seccion.startsWith('leman-russ');

function grupoVariantes(e: EjercitoEpic, texto: string, clave: string, origen: string): GrupoEleccion | null {
  const t = texto.replace(/\(.*\)/g, '');  // «(Add any four…)» es un extra aparte
  const m = t.match(/\b(\w+) Leman Russ variants/i);
  const n = m ? numero(m[1]) : undefined;
  if (n === undefined) return null;
  const variantes = e.compras.filter(c => esVarianteLeman(c.seccion));
  if (!variantes.length) return null;
  const sinVanquisher = /none of which may be a Leman Russ Vanquisher/i.test(t);
  const unoVanquisher = /up to one of which may be a Leman Russ Vanquisher/i.test(t);
  const opciones = variantes.map(c => c.nombre).filter(o => !(sinVanquisher && o === 'Leman Russ Vanquisher'));
  return {
    clave, origen, opciones, min: n, max: n, personaje: false,
    costes: Object.fromEntries(variantes.map(c => [c.nombre, c.coste])),
    maxPor: unoVanquisher ? { 'Leman Russ Vanquisher': 1 } : undefined,
    raras: variantes.filter(c => c.seccion.includes('rare')).map(c => c.nombre),
  };
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
      const base = escapar(f.nombre).replace(/['’]/g, "['’]");
      const plural = f.nombre.endsWith('y') ? `|${escapar(f.nombre.slice(0, -1))}ies`
        // «Grey Hunters» aparece en singular en los textos («Six Grey Hunter units»)
        : / [A-Z]\w+s$/.test(f.nombre) ? `|${escapar(f.nombre.slice(0, -1))}` : '';
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

/** Nombre en castellano de una unidad (según su perfil de atributos) */
export const nombreUnidad = (e: EjercitoEpic, nombre: string) => fichaDe(e, nombre)?.nombreEs ?? nombre;

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
        const personaje = opciones.every(o => ['CH', 'PJ'].includes(fichaDe(e, o)?.tipo ?? ''));
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
  const v0 = grupoVariantes(e, f.unidades, 'lr:u', 'Variantes de Leman Russ');
  if (v0) out.push(v0);
  (f.extras ?? []).forEach((x, j) => {
    const v = fe.extras[j] ? grupoVariantes(e, x.texto, `lr:x${j}`, `Variantes de Leman Russ (${es(x.textoEs, x.texto)})`) : null;
    if (v) out.push(v);
  });
  for (const [nombre, n] of Object.entries(fe.mejoras)) {
    const m = n ? mejoraDe(e, nombre) : undefined;
    const v = m ? grupoVariantes(e, m.texto, `lr:m:${nombre}`, `Variantes de Leman Russ (${nom(m)})`) : null;
    if (v) out.push(v);
  }
  const enTamanos = new Set((f.tamanos ?? []).map(t => t.nombre));
  gruposEnTexto(e, f.unidades).filter(g => !g.opciones.every(o => enTamanos.has(o))).forEach((g, k) =>
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
  out.push(...gruposArma(e, fe));
  return out;
}

// ===== Versiones de arma (Cabezamartillo con Acelerador lineal, Cañón iónico o Cañones de fusión) =====

/** Cuántas unidades de esta clase nombra el texto («Four Hammerheads» → 4). */
function cuantas(texto: string, u: Encontrada): number {
  const w = texto.slice(0, u.ini).trim().split(/\s+/).pop() ?? '';
  return numero(w) ?? 1;
}

/** Grupos para escoger el arma de cada unidad que tiene versiones, y versiones fijadas por la mejora. */
function gruposArma(e: EjercitoEpic, fe: FormacionElegida): GrupoEleccion[] {
  const f = formacionDe(e, fe.formacion);
  if (!f) return [];
  const out: GrupoEleccion[] = [];
  const conArmas = (texto: string) => unidadesEnTexto(e, texto)
    .map(u => ({ u, ficha: fichaDe(e, u.nombre) }))
    .filter(x => x.ficha?.variantesArma?.length);
  const titulo = (ficha: FichaEpic) => `Arma de ${nombreUnidad(e, ficha.nombre)}`;
  for (const { u, ficha } of conArmas(f.unidades).filter((x, i, a) => a.findIndex(y => y.ficha === x.ficha) === i)) {
    const n = cuantas(f.unidades, u);
    out.push({ clave: `ua:${ficha!.nombre}`, origen: titulo(ficha!), opciones: ficha!.variantesArma!, min: n, max: n, personaje: false });
  }
  (f.extras ?? []).forEach((x, j) => {
    const k = fe.extras[j] ?? 0;
    if (!k) return;
    for (const { u, ficha } of conArmas(x.texto).filter((y, i, a) => a.findIndex(z => z.ficha === y.ficha) === i)) {
      const n = x.porUnidad ? k : cuantas(x.texto, u);
      out.push({ clave: `x${j}.a:${ficha!.nombre}`, origen: titulo(ficha!), opciones: ficha!.variantesArma!, min: n, max: n, personaje: false });
    }
  });
  for (const [nombre, k] of Object.entries(fe.mejoras)) {
    const m = k ? mejoraDe(e, nombre) : undefined;
    if (!m) continue;
    const v = m.variantes?.[fe.variantes[nombre] ?? 0];
    const vista = new Set<string>();
    for (const { u, ficha } of conArmas(m.texto)) {
      if (vista.has(ficha!.nombre)) continue;
      vista.add(ficha!.nombre);
      const opciones = v?.unidades ?? ficha!.variantesArma!;
      if (opciones.length < 2) continue; // versión fija: la pone unidadesDeLista
      const n = (v ? v.porUnidad : m.porUnidad) ? k : cuantas(m.texto, u);
      out.push({ clave: `m:${nombre}.a:${ficha!.nombre}`, origen: titulo(ficha!), opciones, min: n, max: n, personaje: false });
    }
  }
  return out;
}

/** Versiones de arma que una mejora fija sin elección (dos Cabezamartillos con Cañones Iónicos). */
function armasFijas(e: EjercitoEpic, fe: FormacionElegida): string[] {
  return Object.entries(fe.mejoras).flatMap(([nombre, k]) => {
    const m = k ? mejoraDe(e, nombre) : undefined;
    const v = m?.variantes?.[fe.variantes[nombre] ?? 0];
    return v?.unidades?.length === 1 ? v.unidades : [];
  });
}

/** Recargo de la formación por llevar cierta versión (+25 si hay Cabezamartillos con Acelerador lineal). */
export function costeRecargo(e: EjercitoEpic, fe: FormacionElegida): number {
  const r = formacionDe(e, fe.formacion)?.recargo;
  if (!r) return 0;
  const lleva = Object.entries(fe.reparto ?? {}).some(([c, x]) => c.startsWith('ua:') && (x[r.unidad] ?? 0) > 0);
  return lleva ? r.coste : 0;
}

export const totalReparto = (fe: FormacionElegida, clave: string) =>
  Object.values(fe.reparto?.[clave] ?? {}).reduce((s, n) => s + n, 0);

/** Avisos de repartos sin completar o pasados. */
export function problemasReparto(e: EjercitoEpic, fe: FormacionElegida): string[] {
  return gruposEleccion(e, fe).flatMap(g => {
    const t = totalReparto(fe, g.clave);
    const que = g.personaje ? 'personaje' : 'unidades';
    const origen = g.origen === 'Unidades' ? 'Unidades de la formación' : g.origen;
    if (t < g.min) return [`${origen}: elige ${g.min === g.max ? g.min : `al menos ${g.min}`} ${que} (${g.opciones.map(o => nombreUnidad(e, o)).join(' / ')}); llevas ${t}.`];
    if (t > g.max) return [`${origen}: máximo ${g.max} ${que}; llevas ${t}.`];
    return Object.entries(g.maxPor ?? {}).flatMap(([o, max]) =>
      (fe.reparto?.[g.clave]?.[o] ?? 0) > max ? [`${origen}: como máximo ${max} ${nombreUnidad(e, o)}.`] : []);
  }).concat(problemasRaras(e, fe));
}

/** «En cada formación, una de cada cinco variantes de Leman Russ puede ser rara». */
function problemasRaras(e: EjercitoEpic, fe: FormacionElegida): string[] {
  const gs = gruposEleccion(e, fe).filter(g => g.raras?.length);
  if (!gs.length) return [];
  const total = gs.reduce((s, g) => s + totalReparto(fe, g.clave), 0);
  const raras = gs.reduce((s, g) => s + g.raras!.reduce((t, o) => t + (fe.reparto?.[g.clave]?.[o] ?? 0), 0), 0);
  const max = Math.floor(total / 5);
  return raras > max ? [`Variantes raras de Leman Russ: como máximo ${max} (una de cada cinco); llevas ${raras}.`] : [];
}

/** Recargo de las variantes de Leman Russ escogidas en una formación. */
export function costeVariantes(e: EjercitoEpic, fe: FormacionElegida): number {
  return gruposEleccion(e, fe).filter(g => g.costes).reduce((s, g) =>
    s + Object.entries(fe.reparto?.[g.clave] ?? {}).reduce((t, [o, n]) => t + (g.costes![o] ?? 0) * n, 0), 0);
}

/** Texto del reparto: «2 Predator Annihilator, 2 Predator Destructor». */
export function textoReparto(e: EjercitoEpic, fe: FormacionElegida): { origen: string; texto: string }[] {
  return gruposEleccion(e, fe).flatMap(g => {
    const r = Object.entries(fe.reparto?.[g.clave] ?? {}).filter(([o, n]) => n > 0 && g.opciones.includes(o));
    if (!r.length) return [];
    return [{ origen: g.origen, texto: r.map(([o, n]) => (g.max === 1 ? nombreUnidad(e, o) : `${n} ${nombreUnidad(e, o)}`)).join(', ') }];
  });
}

/** Unidades con hoja de datos que hay en la lista (para el PDF), en el orden de las hojas del ejército. */
export function unidadesDeLista(e: EjercitoEpic, formaciones: FormacionElegida[]): FichaEpic[] {
  const usadas = new Set<string>();
  const conGenerica = new Set<string>();
  for (const fe of formaciones) {
    const f = formacionDe(e, fe.formacion);
    if (!f) continue;
    const grupos = gruposEleccion(e, fe);
    const enGrupo = new Set(grupos.flatMap(g => g.opciones));
    const elegidas = new Set(grupos.flatMap(g => Object.entries(fe.reparto?.[g.clave] ?? {}).filter(([, n]) => n > 0).map(([o]) => o)));
    const elegido = f.tamanos?.[fe.tamano]?.nombre;
    const quitadas = new Set<string>();
    const deEsta = new Set<string>();
    const textos = [elegido && f.tamanos!.some(t => fichaDe(e, t.nombre) || fichaDe(e, t.nombre.replace(/^\d+ /, '').replace(/s$/, '')))
      ? elegido.replace(/^\d+ /, '') : f.unidades, ...(f.extras ?? []).filter((_, j) => fe.extras[j]).map(x => x.texto)];
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
      // «Replace one Shas’el character with a Shas’o character»: el sustituido ya no está
      const sust = /^Replace (?:one|an?) (.+?) with /.exec(m.texto);
      if (sust) unidadesEnTexto(e, sust[1]).forEach(u => quitadas.add(u.nombre));
      textos.push(...(sust ? [m.texto.slice(sust[0].length)] : [m.nombre, m.texto]));
    }
    for (const t of textos) for (const u of unidadesEnTexto(e, t)) {
      if (quitadas.has(u.nombre)) continue;
      // De las alternativas solo las escogidas (si aún no se ha escogido, todas)
      if (enGrupo.has(u.nombre) && elegidas.size && !elegidas.has(u.nombre)) continue;
      usadas.add(u.nombre);
      deEsta.add(u.nombre);
    }
    armasFijas(e, fe).forEach(u => elegidas.add(u));
    elegidas.forEach(u => usadas.add(u));
    // Con el arma ya escogida, la hoja genérica sobra (se ven solo las versiones)
    for (const u of deEsta) {
      if (!fichaDe(e, u)?.variantesArma?.length) continue;
      const gs = grupos.filter(g => g.clave.endsWith(`a:${u}`));
      if (!gs.length || gs.some(g => totalReparto(fe, g.clave) < g.min)) conGenerica.add(u);
    }
    transporteFormacion(e, fe).forEach(t => usadas.add(t.nombre));
  }
  return (e.fichas ?? []).filter(f => usadas.has(f.nombre) && (!f.variantesArma?.length || conGenerica.has(f.nombre)));
}

// ===== «Más transporte»: Rhinos (y Land Raiders para Exterminadores) por defecto =====
// En los Marines Espaciales (y la Deathwatch) las formaciones «plus transport» incluyen el mínimo de
// transportes necesario para llevar toda la formación una vez añadidas las mejoras (véase 6.3.1).

const conTransporte = (e: EjercitoEpic) => /^(space-marine|inquisition)/.test(e.id);

/** Unidades con número delante en un texto («Six Tactical units», «Add two Blood Claws»). */
function unidadesContadas(e: EjercitoEpic, texto: string): { nombre: string; n: number }[] {
  return unidadesEnTexto(e, texto).map(u => {
    const pal = texto.slice(0, u.ini).trim().split(/\s+/);
    return { nombre: u.nombre, n: numero(pal[pal.length - 1] ?? '') ?? 1 };
  });
}

const esExterminador = (f?: FichaEpic) => !!f && (/Terminator/.test(f.nombre) || /Exterminadores a efectos de transporte/.test(f.notas));

/** Transporte por defecto de la formación: [{ nombre: 'Rhino', cantidad: 3 }]. Vacío si no lleva. */
export function transporteFormacion(e: EjercitoEpic, fe: FormacionElegida): { nombre: string; cantidad: number }[] {
  const f = formacionDe(e, fe.formacion);
  if (!f || !conTransporte(e) || !/plus transport/i.test(f.unidades)) return [];
  let infanteria = 0, exterminadores = 0, landRaiders = 0, razorbacks = 0;
  const sumar = (nombre: string, n: number) => {
    const ficha = fichaDe(e, nombre);
    if (ficha?.tipo !== 'INF') return;
    if (esExterminador(ficha)) exterminadores += n; else infanteria += n;
  };
  for (const u of unidadesContadas(e, f.unidades.split(/plus transport/i)[0])) sumar(u.nombre, u.n);
  // Unidades elegidas en los repartos (p. ej. Land Raiders de la mejora)
  for (const g of gruposEleccion(e, fe)) {
    for (const [o, n] of Object.entries(fe.reparto?.[g.clave] ?? {})) {
      if (o.startsWith('Land Raider')) landRaiders += n; else sumar(o, n);
    }
  }
  for (const [nombre, n] of Object.entries(fe.mejoras)) {
    const m = n ? mejoraDe(e, nombre) : undefined;
    if (!m) continue;
    if (/Razorback/.test(m.nombre)) { razorbacks += n; continue; }
    if (/^Land Raiders?$/.test(m.nombre) && !gruposEleccion(e, fe).some(g => g.clave.startsWith(`m:${nombre}`))) { landRaiders += m.porUnidad ? n : 1; continue; }
    if (gruposEleccion(e, fe).some(g => g.clave.startsWith(`m:${nombre}`))) continue;
    for (const u of unidadesContadas(e, m.texto)) sumar(u.nombre, u.n * (m.porUnidad ? n : 1));
  }
  // Los Land Raiders añadidos llevan primero a los Exterminadores (1 unidad) y si no, 2 de infantería
  const lrParaExterminadores = Math.min(landRaiders, exterminadores);
  const lrLibres = landRaiders - lrParaExterminadores;
  const faltanExterminadores = exterminadores - lrParaExterminadores;
  const faltanInfanteria = Math.max(0, infanteria - lrLibres * 2 - razorbacks);
  const out: { nombre: string; cantidad: number }[] = [];
  const rhinos = Math.ceil(faltanInfanteria / 2);
  if (rhinos) out.push({ nombre: 'Rhino', cantidad: rhinos });
  if (faltanExterminadores) out.push({ nombre: 'Land Raider', cantidad: faltanExterminadores });
  return out;
}

/** «3 Rhinos» en castellano. */
export const textoTransporte = (e: EjercitoEpic, fe: FormacionElegida) =>
  transporteFormacion(e, fe).map(t => `${t.cantidad} ${nombreUnidad(e, t.nombre)}${t.cantidad > 1 ? 's' : ''}`).join(' y ');
