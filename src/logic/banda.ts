import type { Ajustes, Banda, Faccion, Miniatura, Opcion, Unidad } from '../types';
import { COMUN, armaPorNombre, costeArticulo, costeMutacion, faccionDeUnidad, faccionPorId, unidadPorId } from '../data';
import { armasDeMiniatura, llevaEscudo, tieneRegla } from './perfil';

export const nuevoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function nuevaMiniatura(u: Unidad): Miniatura {
  const m: Miniatura = {
    uid: nuevoId(), unidad: u.id, apodo: '', armas: {}, blindaje: -1, equipo: {}, equipoGenerico: {},
    equipoFaccion: {}, extras: {}, balas: 0, armasIncrustadas: 0, mutaciones: [], articulos: [],
    fieras: 0, grupo: u.grupo?.min ?? 0, reliquias: [],
  };
  // Si solo hay un arma posible y es obligatoria, se equipa directamente
  if (u.armas && u.armas.min >= 1 && u.armas.opciones.length === 1) m.armas[u.armas.opciones[0].nombre] = 1;
  return m;
}

export function nuevaBanda(nombre: string, faccion: string, puntos: number): Banda {
  return { id: nuevoId(), nombre, faccion, puntos, miniaturas: [], gato: false, extrasBanda: {}, actualizada: Date.now() };
}

/** ¿La unidad es "de la casa" (no mercenario ni invitado) y puede usar el equipo de la facción? */
const esPropia = (u: Unidad, b: Banda) =>
  faccionDeUnidad[u.id] === b.faccion && (u.tipo === 'tropa' || u.tipo === 'personalidad');

export function equipoGenericoDisponible(u: Unidad, b: Banda): Opcion[] {
  return esPropia(u, b) && !u.sinEquipoGenerico ? faccionPorId[b.faccion].equipoGenerico : [];
}

export function equipoFaccionDisponible(u: Unidad, b: Banda): Opcion[] {
  if (!esPropia(u, b)) return [];
  const propios = new Set((u.equipo?.opciones ?? []).map(o => o.nombre));
  return (faccionPorId[b.faccion].equipoFaccion ?? []).filter(o => !propios.has(o.nombre));
}

const suma = (opciones: Opcion[] | undefined, elegidas: Record<string, number>) =>
  (opciones ?? []).reduce((s, o) => s + (elegidas[o.nombre] ? o.coste * (o.porUnidad ? elegidas[o.nombre] : 1) : 0), 0);

export function costeMiniatura(m: Miniatura, b: Banda, ajustes: Ajustes): number {
  const u = unidadPorId[m.unidad];
  if (!u) return 0;
  let c = u.grupo ? u.coste * (m.grupo || u.grupo.min) : u.coste;
  c += suma(u.armas?.opciones, m.armas);
  if (m.blindaje >= 0) c += u.blindaje.opciones[m.blindaje]?.coste ?? 0;
  c += suma(u.equipo?.opciones, m.equipo);
  c += suma(equipoGenericoDisponible(u, b), m.equipoGenerico);
  c += suma(equipoFaccionDisponible(u, b), m.equipoFaccion);
  c += suma(u.opcionesExtra, m.extras);
  c += m.balas * ajustes.costeBala;
  if (u.armaIncrustada) c += m.armasIncrustadas * u.armaIncrustada.coste;
  c += m.mutaciones.reduce((s, n) => s + (costeMutacion[n] ?? 0), 0);
  c += m.articulos.reduce((s, n) => s + (costeArticulo[n] ?? 0), 0);
  if (u.fieras) c += m.fieras * u.fieras.coste;
  const reliquias = faccionPorId[b.faccion]?.reliquias ?? [];
  c += (m.reliquias ?? []).reduce((s, n) => s + (reliquias.find(r => r.nombre === n)?.coste ?? 0), 0);
  return c;
}

export function costeBanda(b: Banda, ajustes: Ajustes): number {
  const f = faccionPorId[b.faccion];
  let c = b.miniaturas.reduce((s, m) => s + costeMiniatura(m, b, ajustes), 0);
  if (b.gato) c += COMUN.gatoParameno.coste;
  for (const e of f?.extrasBanda ?? []) if (b.extrasBanda[e.nombre]) c += e.coste;
  return c;
}

export const maxMiniaturas = (puntos: number) => Math.ceil(puntos / 100) * COMUN.miniaturasPorCada100Puntos;

/** Los grupos de Pochos cuentan como 1; las fieras del Domador cuentan aparte. */
export const numMiniaturas = (b: Banda) =>
  b.miniaturas.reduce((s, m) => s + 1 + (unidadPorId[m.unidad]?.fieras ? m.fieras : 0), 0);

export const etiqueta = (m: Miniatura) => {
  const u = unidadPorId[m.unidad];
  return m.apodo ? `${m.apodo} (${u.nombre})` : u.nombre;
};

export function problemasMiniatura(m: Miniatura): string[] {
  const u = unidadPorId[m.unidad];
  const out: string[] = [];
  if (u.armas) {
    const n = Object.values(m.armas).filter(q => q > 0).length;
    if (n < u.armas.min) out.push(u.armas.max === 1 ? 'Elige un arma.' : 'Debe llevar al menos un arma.');
    if (n > u.armas.max) out.push(`Máximo ${u.armas.max} arma${u.armas.max > 1 ? 's' : ''}.`);
    if (m.armasIncrustadas > n) out.push('Más armas incrustadas que armas.');
  }
  if (u.mutaciones) {
    if (m.mutaciones.length < u.mutaciones.min) out.push('Debe elegir al menos una mutación.');
    if (m.mutaciones.length > u.mutaciones.max) out.push(`Máximo ${u.mutaciones.max} mutaciones.`);
  }
  if (u.articulosDeCona && m.articulos.length > u.articulosDeCona) out.push(`Máximo ${u.articulosDeCona} artículo(s) de coña.`);
  if (u.armas) {
    const dosManos = tieneRegla(m, 'A dos manos');
    if (dosManos.length > 1) out.push(`Solo puede llevar un objeto A dos manos (${dosManos.map(o => o.nombre).join(', ')}).`);
    if (dosManos.length && llevaEscudo(m)) out.push('El escudo no se puede combinar con armas A dos manos.');
    const armatoste = tieneRegla(m, 'Armatoste');
    if (armatoste.length > 1) out.push(`Solo puede llevar un objeto Armatoste (${armatoste.map(o => o.nombre).join(', ')}).`);
    const bombas = Object.entries(m.armas).filter(([n, q]) => q > 3 && armaPorNombre[n]);
    if (bombas.length) out.push(`Máximo 3 unidades de ${bombas.map(([n]) => n).join(', ')}.`);
  }
  if ((m.reliquias ?? []).length > (u.reliquias ?? 0)) out.push(`Máximo ${u.reliquias ?? 0} Reliquia(s) abisal(es).`);
  return out;
}

function nombreUnidad(id: string) { return unidadPorId[id]?.nombre ?? id; }

/** Comprueba la banda contra los límites declarados en el JSON de su facción. */
export function problemasBanda(b: Banda, ajustes: Ajustes): string[] {
  const f: Faccion = faccionPorId[b.faccion];
  const out: string[] = [];
  const ids = b.miniaturas.map(m => {
    const u = unidadPorId[m.unidad];
    return u.cuentaComo ? [u.id, u.cuentaComo] : [u.id];
  });
  const cuenta = (id: string) => ids.filter(x => x.includes(id)).length;
  const total = b.miniaturas.length;

  const pts = costeBanda(b, ajustes);
  if (pts > b.puntos) out.push(`Te pasas ${pts - b.puntos} puntos del límite (${b.puntos}).`);
  const max = maxMiniaturas(b.puntos), n = numMiniaturas(b);
  if (n > max) out.push(`Tienes ${n} miniaturas; el máximo para ${b.puntos} puntos es ${max}.`);

  for (const l of f.limites) {
    switch (l.tipo) {
      case 'maxTipo': {
        const c = b.miniaturas.filter(m => l.tipos.includes(unidadPorId[m.unidad].tipo)).length;
        if (c > l.max) out.push('Solo puede haber una Personalidad o Mercenario.');
        break;
      }
      case 'maxUnidad': {
        const c = b.miniaturas.filter(m => {
          const u = unidadPorId[m.unidad];
          return l.unidades.includes(u.id) || (u.cuentaComo !== undefined && l.unidades.includes(u.cuentaComo));
        }).length;
        if (c > l.max) out.push(`Máximo ${l.max} ${l.unidades.map(nombreUnidad).join(' / ')}.`);
        break;
      }
      case 'noMasQueResto': {
        const c = cuenta(l.unidad);
        if (c > total - c) out.push(`Hay ${c}x ${nombreUnidad(l.unidad)} y solo ${total - c} miniatura${total - c === 1 ? '' : 's'} más: no pueden superar al resto de la banda.`);
        break;
      }
      case 'porPuntos': {
        const mx = Math.ceil(b.puntos / l.cada);
        if (cuenta(l.unidad) > mx) out.push(`Máximo ${mx} ${nombreUnidad(l.unidad)} para ${b.puntos} puntos.`);
        break;
      }
      case 'porUnidad': {
        const c = cuenta(l.unidad), r = cuenta(l.referencia);
        if (c > r * l.factor) out.push(`Máximo ${l.factor} ${nombreUnidad(l.unidad)} por cada ${nombreUnidad(l.referencia)} (tienes ${c} y ${r}).`);
        break;
      }
      case 'sumaNoMasQue': {
        const c = l.unidades.reduce((s, id) => s + cuenta(id), 0), r = cuenta(l.referencia);
        if (c > r) out.push(`${l.unidades.map(nombreUnidad).join(' + ')} (${c}) no pueden superar a ${nombreUnidad(l.referencia)} (${r}).`);
        break;
      }
      case 'repeticionMutacion':
      case 'repeticionArticulo': {
        const veces: Record<string, number> = {};
        b.miniaturas.forEach(m => (l.tipo === 'repeticionMutacion' ? m.mutaciones : m.articulos).forEach(x => (veces[x] = (veces[x] ?? 0) + 1)));
        for (const [k, v] of Object.entries(veces)) if (v > l.max) out.push(`${k} aparece ${v} veces (máx. ${l.max}).`);
        break;
      }
      case 'reliquiaUnica': {
        const veces: Record<string, number> = {};
        b.miniaturas.forEach(m => (m.reliquias ?? []).forEach(x => (veces[x] = (veces[x] ?? 0) + 1)));
        for (const [k, v] of Object.entries(veces)) if (v > 1) out.push(`La reliquia ${k} solo puede llevarse una vez en la banda.`);
        break;
      }
      case 'unicos': {
        const vistos = new Set<string>();
        if (b.miniaturas.some(m => (vistos.has(m.unidad) ? true : (vistos.add(m.unidad), false)))) out.push('Ningún personaje puede repetirse.');
        break;
      }
      case 'excluyentes':
        if (l.unidades.every(id => cuenta(id) > 0)) out.push(`No puedes llevar a la vez ${l.unidades.map(nombreUnidad).join(' y ')}.`);
        break;
    }
  }
  // Escasa: cada arma con esta regla, máximo 3 veces en la banda (las bombas de una miniatura cuentan como una)
  const escasas: Record<string, number> = {};
  b.miniaturas.forEach(m => {
    if (!unidadPorId[m.unidad].armas) return;
    armasDeMiniatura(m).forEach(a => { if (a.arma?.reglas.includes('Escasa')) escasas[a.nombre] = (escasas[a.nombre] ?? 0) + 1; });
  });
  for (const [k, v] of Object.entries(escasas)) if (v > 3) out.push(`${k} es Escasa: aparece en ${v} miniaturas (máx. 3 en la banda).`);

  for (const m of b.miniaturas) {
    const u = unidadPorId[m.unidad];
    if (u.noPuedeUnirseA?.includes(b.faccion)) out.push(`${u.nombre} no puede unirse a ${f.nombre}.`);
    const p = problemasMiniatura(m);
    if (p.length) out.push(`${etiqueta(m)}: ${p.join(' ')}`);
  }
  return out;
}

const listaElegidas = (r: Record<string, number>) => Object.entries(r).filter(([, q]) => q > 0).map(([n, q]) => (q > 1 ? `${q}x ${n}` : n));

/** Equipo de una miniatura en texto legible (lo usan la vista de texto y el PDF). */
export function detalleMiniatura(m: Miniatura) {
  const u = unidadPorId[m.unidad];
  return {
    armas: u.armas ? listaElegidas(m.armas).join(', ') : u.armasFijas ?? '',
    blindaje: m.blindaje >= 0 ? u.blindaje.opciones[m.blindaje].nombre : u.blindaje.base,
    equipo: [u.equipo?.incluido, ...listaElegidas(m.equipo), ...listaElegidas(m.equipoGenerico), ...listaElegidas(m.equipoFaccion),
      ...listaElegidas(m.extras), m.armasIncrustadas ? `${m.armasIncrustadas}x Arma incrustada` : '',
      ...(m.reliquias ?? []), m.balas ? `${m.balas} balas` : '', m.fieras ? `${m.fieras} fieras` : ''].filter(Boolean).join(', '),
    mutaciones: m.mutaciones.join(', '),
    articulos: m.articulos.join(', '),
    reglas: u.reglasEspeciales.join(', '),
  };
}

export function extrasBandaTexto(b: Banda): string[] {
  const f = faccionPorId[b.faccion];
  return [b.gato ? `${COMUN.gatoParameno.nombre} (${COMUN.gatoParameno.coste} pts)` : '',
    ...(f.extrasBanda ?? []).filter(e => b.extrasBanda[e.nombre]).map(e => `${e.nombre} (${e.coste} pts)`)].filter(Boolean);
}

export function bandaComoTexto(b: Banda, ajustes: Ajustes): string {
  const f = faccionPorId[b.faccion];
  const lines = [`${b.nombre} — ${f.nombre}`, `${costeBanda(b, ajustes)}/${b.puntos} puntos · ${numMiniaturas(b)} miniaturas`, ''];
  for (const m of b.miniaturas) {
    const u = unidadPorId[m.unidad], d = detalleMiniatura(m);
    lines.push(`• ${etiqueta(m)}${u.grupo ? ` (grupo de ${m.grupo})` : ''} — ${costeMiniatura(m, b, ajustes)} pts`);
    if (d.armas) lines.push(`   Armas: ${d.armas}`);
    lines.push(`   Blindaje: ${d.blindaje}`);
    if (d.equipo) lines.push(`   Equipo: ${d.equipo}`);
    if (d.mutaciones) lines.push(`   Mutaciones: ${d.mutaciones}`);
    if (d.articulos) lines.push(`   Artículos de coña: ${d.articulos}`);
  }
  const extras = extrasBandaTexto(b);
  if (extras.length) lines.push('', `Extras: ${extras.join(', ')}`);
  return lines.join('\n');
}
