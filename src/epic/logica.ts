// Costes y validación de listas de NetEA. Funciones puras: reciben el ejército ya cargado.
import type { EjercitoEpic, ExtraEpic, FormacionElegida, FormacionEpic, ListaEpic, MejoraEpic, SeccionEpic } from './tipos';
import { es, nom } from './texto';
import { cantidades, porCantidad } from './cantidades';
import { costeRecargo, costeVariantes, esVarianteLeman, problemasReparto, textoReparto, textoTransporte } from './eleccion';

export const nuevoUid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function nuevaListaEpic(nombre: string, ejercito: string, puntos: number): ListaEpic {
  return { id: nuevoUid(), juego: 'epic', nombre, ejercito, puntos, formaciones: [], compras: {}, actualizada: Date.now() };
}

export function nuevaFormacion(f: FormacionEpic): FormacionElegida {
  return { uid: nuevoUid(), formacion: f.id, tamano: 0, extras: {}, mejoras: {}, variantes: {}, nota: '' };
}

const indices = new WeakMap<EjercitoEpic, { f: Map<string, FormacionEpic>; m: Map<string, MejoraEpic>; s: Map<string, SeccionEpic> }>();
function idx(e: EjercitoEpic) {
  let x = indices.get(e);
  if (!x) {
    x = { f: new Map(e.formaciones.map(f => [f.id, f])), m: new Map(e.mejoras.map(m => [m.nombre, m])), s: new Map(e.secciones.map(s => [s.id, s])) };
    indices.set(e, x);
  }
  return x;
}
export const formacionDe = (e: EjercitoEpic, id: string) => idx(e).f.get(id);
export const mejoraDe = (e: EjercitoEpic, nombre: string) => idx(e).m.get(nombre);
export const seccionDe = (e: EjercitoEpic, id: string) => idx(e).s.get(id);

/** Coste de n unidades a precio por parejas: cada dos van al precio de pareja y la suelta al de una. */
export const costeParejas = (cada: number, pareja: number, n: number) => Math.floor(n / 2) * pareja + (n % 2) * cada;

/**
 * Coste de una mejora. `aparte` son las unidades escogidas que tienen precio propio
 * (p. ej. Land Raider Helios de los Vástagos del Hierro), que no entran en las parejas.
 */
export function costeMejora(m: MejoraEpic, cantidad: number, variante = 0, aparte: Record<string, number> = {}): number {
  if (!cantidad) return 0;
  if (m.parejas) {
    let sueltas = 0, coste = 0;
    for (const [u, precio] of Object.entries(m.parejas.aparte ?? {})) {
      const k = Math.min(aparte[u] ?? 0, cantidad - sueltas);
      sueltas += k; coste += k * precio;
    }
    return coste + costeParejas(m.parejas.cada, m.parejas.pareja, cantidad - sueltas);
  }
  const v = m.variantes?.[variante];
  const coste = v ? v.coste : m.coste;
  const porUnidad = v ? v.porUnidad : m.porUnidad;
  return porUnidad ? coste * cantidad : coste;
}

/** Unidades escogidas en los repartos de una mejora (suma de sus grupos). */
export function repartoDeMejora(fe: FormacionElegida, nombre: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [clave, r] of Object.entries(fe.reparto ?? {})) {
    if (!clave.startsWith(`m:${nombre}.`)) continue;
    for (const [u, n] of Object.entries(r)) out[u] = (out[u] ?? 0) + n;
  }
  return out;
}

export function costeFormacion(e: EjercitoEpic, fe: FormacionElegida): number {
  const f = formacionDe(e, fe.formacion);
  if (!f) return 0;
  let c = f.tamanos?.length ? f.tamanos[fe.tamano]?.coste ?? f.coste : f.coste;
  (f.extras ?? []).forEach((x, i) => { c += costeExtra(x, fe.extras[i] ?? 0); });
  for (const [nombre, n] of Object.entries(fe.mejoras)) {
    const m = mejoraDe(e, nombre);
    if (m) c += costeMejora(m, n, fe.variantes[nombre], repartoDeMejora(fe, nombre));
  }
  return c + costeVariantes(e, fe) + costeRecargo(e, fe);
}

/** Compras sueltas del ejército (las variantes de Leman Russ se eligen dentro de cada formación). */
export const comprasSueltas = (e: EjercitoEpic) => e.compras.filter(c => !esVarianteLeman(c.seccion));

export const costeCompras = (e: EjercitoEpic, l: ListaEpic) =>
  comprasSueltas(e).reduce((s, c) => s + c.coste * (l.compras[c.id] ?? 0), 0);

export const costeLista = (e: EjercitoEpic, l: ListaEpic) =>
  l.formaciones.reduce((s, f) => s + costeFormacion(e, f), 0) + costeCompras(e, l);

/** Puntos gastados en aliados, aeronaves, titanes… (secciones "tercio"). */
export function costeAliados(e: EjercitoEpic, l: ListaEpic): number {
  return l.formaciones.reduce((s, fe) => {
    const f = formacionDe(e, fe.formacion);
    return f && seccionDe(e, f.seccion)?.tipo === 'tercio' ? s + costeFormacion(e, fe) : s;
  }, 0);
}

/** Mejoras que puede llevar una formación. */
export function mejorasPermitidas(e: EjercitoEpic, f: FormacionEpic): MejoraEpic[] {
  if (f.mejoras) return f.mejoras.map(n => mejoraDe(e, n)).filter((m): m is MejoraEpic => !!m);
  // Sin columna de mejoras: las formaciones principales pueden llevar las mejoras del ejército (p. ej. compañías de la Guardia)
  const sec = seccionDe(e, f.seccion);
  return sec?.tipo === 'nucleo' ? e.mejoras.filter(m => !/weapon|titan/i.test(seccionDe(e, m.seccion)?.nombre ?? '')) : [];
}

const raiz = (s: string) => s.toLowerCase().replace(/ies$/, '').replace(/y$/, '').replace(/es$/, '').replace(/s$/, '');

/** Cuántas formaciones "base" hay para una regla de apoyo ("per each company", "per each retinue"…). */
function cuentaBase(e: EjercitoEpic, l: ListaEpic, base: string): number {
  const r = raiz(base.replace(/\s+formations?$/, ' formation'));
  return l.formaciones.filter(fe => {
    const f = formacionDe(e, fe.formacion);
    const s = f && seccionDe(e, f.seccion);
    if (!f || !s || s.tipo === 'apoyo' || s.tipo === 'tercio') return false;
    // «core formation» es cualquier formación principal (los Cuerpos tau, por ejemplo)
    if (r.startsWith('core formation')) return s.tipo === 'nucleo';
    return s.nombre.toLowerCase().includes(r) || f.nombre.toLowerCase().includes(r);
  }).length;
}

/** Coste de un extra con n unidades (las Levas se pagan cada dos). */
export function costeExtra(x: ExtraEpic, n: number): number {
  if (!n) return 0;
  if (!x.porUnidad) return x.coste;
  return x.coste * (x.porCada ? Math.ceil(n / x.porCada) : n);
}

/** Máximo de un extra en esta formación: las sustituciones no pueden pasar de las unidades que hay. */
export function maxExtra(f: FormacionEpic, fe: FormacionElegida, j: number): number {
  const x = f.extras![j];
  if (!x.sustituye) return x.max ?? 1;
  return x.sustituye.base + x.sustituye.extras.reduce((s, k) => s + (fe.extras[k] ?? 0) * (f.extras![k]?.anade ?? 1), 0);
}

/** Armas de Titán elegidas frente a las monturas de la formación. */
export function monturasFormacion(e: EjercitoEpic, fe: FormacionElegida) {
  const f = formacionDe(e, fe.formacion);
  if (!f?.monturas) return null;
  let armas = 0, soloCaparazon = 0;
  for (const [nombre, n] of Object.entries(fe.mejoras)) {
    const m = mejoraDe(e, nombre);
    if (!m?.arma || !n) continue;
    armas += n;
    if (m.montura === 'caparazon') soloCaparazon += n;
  }
  const total = f.monturas.brazo + f.monturas.caparazon;
  return { ...f.monturas, total, armas, soloCaparazon };
}

export function problemasFormacion(e: EjercitoEpic, fe: FormacionElegida): string[] {
  const f = formacionDe(e, fe.formacion);
  if (!f) return ['Formación desconocida.'];
  const out: string[] = [];
  (f.extras ?? []).forEach((x, i) => {
    const n = fe.extras[i] ?? 0;
    const max = maxExtra(f, fe, i);
    if (n > max) out.push(`Máximo ${max} en «${es(x.textoEs, x.texto).slice(0, 40)}…».`);
  });
  const mo = monturasFormacion(e, fe);
  if (mo) {
    if (mo.armas > mo.total) out.push(`Demasiadas armas: ${mo.armas} para ${mo.total} monturas.`);
    else if (mo.armas < mo.total) out.push(`Faltan armas: equipa las ${mo.total} monturas (${mo.caparazon} de caparazón y ${mo.brazo} de brazo); llevas ${mo.armas}.`);
    if (mo.soloCaparazon > mo.caparazon) out.push(`Solo ${mo.caparazon} monturas de caparazón: llevas ${mo.soloCaparazon} armas que solo van en el caparazón.`);
  }
  const elegidas = Object.entries(fe.mejoras).filter(([, n]) => n > 0);
  const porSeccion = new Map<string, number>();
  for (const [nombre, n] of elegidas) {
    const m = mejoraDe(e, nombre);
    if (!m) continue;
    porSeccion.set(m.seccion, (porSeccion.get(m.seccion) ?? 0) + 1);
    const sec = seccionDe(e, m.seccion);
    const porUnidad = m.variantes?.[fe.variantes[nombre] ?? 0]?.porUnidad ?? m.porUnidad;
    if (!porUnidad && sec?.unaVez && n > 1) out.push(`${nom(m)}: solo una vez por formación.`);
    if (m.porUnidad && m.max && n > m.max) out.push(`${nom(m)}: máximo ${m.max}.`);
  }
  for (const [sid, n] of porSeccion) {
    const sec = seccionDe(e, sid);
    if (sec?.maxPorFormacion && n > sec.maxPorFormacion) out.push(`Máximo ${sec.maxPorFormacion} mejoras distintas por formación (${nom(sec)}).`);
  }
  out.push(...problemasReparto(e, fe));
  return out;
}

/** Comprueba la lista contra las reglas de composición del ejército. */
export function problemasLista(e: EjercitoEpic, l: ListaEpic): string[] {
  const out: string[] = [];
  const total = costeLista(e, l);
  if (total > l.puntos) out.push(`Te pasas ${total - l.puntos} puntos del límite (${l.puntos}).`);

  // Formaciones limitadas por unidades elegidas (un Lysander por cada Warmonger)
  for (const f of e.formaciones.filter(x => x.porCadaUnidad)) {
    const n = l.formaciones.filter(fe => fe.formacion === f.id).length;
    const hay = l.formaciones.filter(fe => formacionDe(e, fe.formacion)?.tamanos?.[fe.tamano]?.nombre === f.porCadaUnidad).length;
    if (n > hay) out.push(`${nom(f)}: llevas ${n} y solo puedes ${hay} (uno por cada Titán elegido de ese tipo).`);
  }

  // Extras de uno por ejército (Barón)
  const porEjercito = new Map<string, { n: number; nombre: string }>();
  for (const fe of l.formaciones) (formacionDe(e, fe.formacion)?.extras ?? []).forEach((x, j) => {
    if (!x.porEjercito || !fe.extras[j]) return;
    const k = x.texto; const g = porEjercito.get(k) ?? { n: 0, nombre: es(x.textoEs, x.texto) };
    g.n += fe.extras[j]; porEjercito.set(k, g);
  });
  for (const g of porEjercito.values()) if (g.n > 1) out.push(`«${g.nombre}»: solo uno por ejército; llevas ${g.n}.`);

  // Extras que comparten máximo
  l.formaciones.forEach((fe, i) => {
    const f = formacionDe(e, fe.formacion);
    const grupos = new Map<string, { n: number; max: number }>();
    (f?.extras ?? []).forEach((x, j) => {
      if (!x.juntos) return;
      const g = grupos.get(x.juntos) ?? { n: 0, max: x.juntos === 'vehiculos' ? (x.max ?? 99) : 1 };
      g.n += fe.extras[j] ?? 0; grupos.set(x.juntos, g);
    });
    for (const [, g] of grupos) if (g.n > g.max)
      out.push(`${i + 1}. ${f ? nom(f) : fe.formacion}: ${g.max === 1 ? 'elige solo una de las opciones de extra' : `como máximo ${g.max} unidades adicionales en total`}; llevas ${g.n}.`);
  });

  // Aliados / aeronaves / titanes: 1/3 (o 1/4) de los puntos
  if (e.fraccionAliados) {
    const max = Math.floor(l.puntos * e.fraccionAliados);
    const gastado = costeAliados(e, l);
    const frac = e.fraccionAliados < 0.3 ? 'un cuarto' : 'un tercio';
    if (gastado > max) out.push(`Aliados, aeronaves y titanes: ${gastado} pts; el máximo es ${frac} de los puntos (${max}).`);
  }

  // Máximos por formación (0–1, individuos) y por sección (0–2)
  const veces = new Map<string, number>();
  const porSeccion = new Map<string, number>();
  for (const fe of l.formaciones) {
    const f = formacionDe(e, fe.formacion);
    if (!f) continue;
    veces.set(f.id, (veces.get(f.id) ?? 0) + 1);
    porSeccion.set(f.seccion, (porSeccion.get(f.seccion) ?? 0) + 1);
  }
  for (const [id, n] of veces) {
    const f = formacionDe(e, id)!;
    if (f.max && n > f.max) out.push(`${nom(f)}: máximo ${f.max} por ejército.`);
  }
  for (const [sid, n] of porSeccion) {
    const s = seccionDe(e, sid);
    if (s?.maxFormaciones && n > s.maxFormaciones) out.push(`${nom(s)}: máximo ${s.maxFormaciones} formaciones.`);
  }

  // Apoyo: N por cada formación base (las secciones con el mismo "grupo" comparten cupo)
  const grupos = new Map<string, { secciones: SeccionEpic[]; n: number }>();
  for (const s of e.secciones) {
    if (s.tipo !== 'apoyo' || !s.porCada) continue;
    const clave = s.grupo ?? s.id;
    const g = grupos.get(clave) ?? { secciones: [], n: 0 };
    g.secciones.push(s);
    g.n += porSeccion.get(s.id) ?? 0;
    grupos.set(clave, g);
  }
  for (const { secciones, n } of grupos.values()) {
    if (!n) continue;
    const { cantidad, base } = secciones[0].porCada!;
    const bases = cuentaBase(e, l, base);
    const max = bases * cantidad;
    if (n > max) {
      const nombres = secciones.map(s => nom(s)).join(' / ');
      out.push(`${nombres}: tienes ${n} y el máximo es ${max} (${cantidad} por cada ${base}; tienes ${bases}).`);
    }
  }

  // Mejoras con límite por ejército (0–1 Supreme Commander, Legate…)
  const usoMejora = new Map<string, number>();
  for (const fe of l.formaciones) for (const [nombre, n] of Object.entries(fe.mejoras)) if (n > 0) usoMejora.set(nombre, (usoMejora.get(nombre) ?? 0) + 1);
  for (const [nombre, n] of usoMejora) {
    const m = mejoraDe(e, nombre);
    if (m?.maxEjercito && n > m.maxEjercito) out.push(`${nom(m)}: máximo ${m.maxEjercito} por ejército.`);
  }

  // «0–1 Supreme Commander per army»: las variantes de Comandante supremo cuentan juntas
  const supremos = l.formaciones.filter(fe => Object.entries(fe.mejoras).some(([nombre, n]) => {
    const m = mejoraDe(e, nombre);
    return n > 0 && !!m && /0–1 (of one of the following options|Supreme Commander) per army/.test(m.texto) && (fe.variantes[nombre] ?? 0) > 0;
  })).length;
  if (supremos > 1) out.push(`Comandante en jefe (Supreme Commander): máximo 1 por ejército; tienes ${supremos}.`);

  // Problemas de cada formación
  l.formaciones.forEach((fe, i) => {
    const p = problemasFormacion(e, fe);
    if (p.length) out.push(`${i + 1}. ${nom(formacionDe(e, fe.formacion) ?? { nombre: '?' })}: ${p.join(' ')}`);
  });
  return out;
}

/** Detalle legible de una formación elegida (para texto y PDF). */
export function detalleFormacion(e: EjercitoEpic, fe: FormacionElegida) {
  const f = formacionDe(e, fe.formacion)!;
  const extras = (f.extras ?? []).flatMap((x, i) => {
    const n = fe.extras[i] ?? 0;
    if (!n) return [];
    const t = es(x.textoEs, x.texto);
    // «Añade hasta tres Guardianes por +85 puntos c/u» elegido 2 veces → «2x Guardianes»
    const m = /^(?:Añade|Add)\s+(?:hasta|up to)\s+\S+\s+(.+?)\s+(?:por|for)\s+\+/i.exec(t);
    if (m && x.porUnidad) return [`${n}x ${m[1]}`];
    // «Sustituye cualquier número de Paladines por el mismo número de Errantes» → «2x Errantes (en lugar de Paladines)»
    const s = /^(?:Sustituye|Replace)\s+(?:cualquier número de|any number of|hasta \S+)\s+(.+?)\s+(?:por|with)\s+(?:el mismo número de|an equal number of)\s+(.+?)(?:\s+(?:por|for)\s+\+.*|\s+(?:gratis|for free).*)?$/i.exec(t);
    if (s) return [`${n}x ${s[2]} (en lugar de ${s[1]})`];
    if (/^(?:Añade|Add)\s+/i.test(t) && !x.porUnidad) return [cantidades(t.replace(/^(?:Añade|Add)\s+/i, ''))];
    return [x.porUnidad ? porCantidad(n, cantidades(t)) : cantidades(t)];
  });
  const mejoras = Object.entries(fe.mejoras).filter(([, n]) => n > 0).map(([nombre, n]) => {
    const m = mejoraDe(e, nombre);
    const v = m?.variantes?.[fe.variantes[nombre] ?? 0];
    const nombreM = m ? nom(m) : nombre;
    return `${m?.porUnidad || m?.arma ? porCantidad(n, nombreM) : nombreM}${v && (m?.variantes?.length ?? 0) > 1 ? ` [${cantidades(es(v.textoEs, v.texto))}]` : ''}`;
  });
  const t = f.tamanos?.[fe.tamano];
  const tamano = t ? cantidades(nom(t)) : undefined;
  const reparto = textoReparto(e, fe);
  const transporte = textoTransporte(e, fe);
  return { formacion: f, tamano, extras, mejoras, reparto, transporte };
}

export function listaComoTexto(e: EjercitoEpic, l: ListaEpic): string {
  const lineas = [`${l.nombre} — ${nom(e)} (NetEA ${e.version})`, `${costeLista(e, l)}/${l.puntos} puntos · Factor de estrategia ${e.estrategia ?? '-'}`, `Iniciativa: ${es(e.iniciativaEs, e.iniciativa)}`, ''];
  for (const s of e.secciones) {
    const fs = l.formaciones.filter(fe => formacionDe(e, fe.formacion)?.seccion === s.id);
    if (!fs.length) continue;
    lineas.push(nom(s).toUpperCase());
    for (const fe of fs) {
      const d = detalleFormacion(e, fe);
      lineas.push(`• ${nom(d.formacion)}${d.tamano ? ` [${d.tamano}]` : ''} — ${costeFormacion(e, fe)} pts`);
      lineas.push(`   ${cantidades(es(d.formacion.unidadesEs, d.formacion.unidades))}`);
      if (d.extras.length) lineas.push(`   Extras: ${d.extras.join('; ')}`);
      if (d.mejoras.length) lineas.push(`   Mejoras: ${d.mejoras.join(', ')}`);
      for (const r of d.reparto) lineas.push(`   ${r.origen === 'Unidades' ? 'Composición' : r.origen}: ${r.texto}`);
      if (d.transporte) lineas.push(`   Transporte: ${d.transporte}`);
      if (fe.nota) lineas.push(`   Nota: ${fe.nota}`);
    }
    lineas.push('');
  }
  const compras = comprasSueltas(e).filter(c => l.compras[c.id]);
  if (compras.length) lineas.push('COMPRAS: ' + compras.map(c => `${l.compras[c.id]}x ${nom(c)}`).join(', '));
  return lineas.join('\n').trim();
}
