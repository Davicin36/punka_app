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

// ===== Abreviaturas de los perfiles (leyenda de la Edición Deluxe, 5.0) =====
const ABREVIATURAS: [string, string, RegExp][] = [
  ['INF', 'Infantería (Infantry)', /^INF$/],
  ['VL', 'Vehículo ligero (Light Vehicle)', /^VL$/],
  ['VB', 'Vehículo blindado (Armoured Vehicle)', /^VB$/],
  ['MG', 'Máquina de Guerra (War Engine)', /^(MG|WE)$/],
  ['AN', 'Aeronave (Aircraft)', /^AN$/],
  ['PJ', 'Personaje (Character)', /^(PJ|CH)$/],
  ['NE', 'Nave espacial (Spacecraft)', /^NE$/],
  ['Vel. / Blind. / CC / TT', 'Velocidad, Blindaje, Combate cuerpo a cuerpo (Close Combat), Tiroteo (Firefight)', /^$/],
  ['AP', 'Antipersonal: valor para impactar a infantería (Anti-personnel)', /^AP\d/],
  ['AT', 'Antitanque: valor para impactar a vehículos y Máquinas de Guerra (Anti-tank)', /^AT\d/],
  ['AA', 'Antiaéreo: valor para impactar a aeronaves (Anti-aircraft)', /^AA\d/],
  ['MA', 'Macro-arma (Macro-weapon)', /^MA/],
  ['PA', 'Puntos de Artillería, ataque con plantilla (Barrage Points)', /^\S*PA$/],
  ['AE(+x)', 'Ataques extra (+x) (Extra Attacks)', /^AE\(/],
  ['MT(x)', 'Matatitanes: cada impacto causa x puntos de daño (Titan Killer)', /^MT/],
  ['DP', 'Daña primero (First Strike)', /^DP$/],
  ['D', 'Disrupción (Disrupt)', /^D$/],
  ['IC', 'Ignora Cobertura (Ignore Cover)', /^IC$/],
  ['Ind', 'Fuego Indirecto (Indirect Fire)', /^Ind$/],
  ['DU', 'Disparo Único (Single Shot)', /^DU$/],
  ['Baj', 'Baja cadencia (Slow Firing)', /^Baj$/],
  ['L', 'Lanza (Lance)', /^L$/],
  ['S', 'Francotirador (Sniper)', /^S$/],
  ['Guía', 'Misil guiado (Guided Missile)', /^Guía$/],
  ['Fro', 'Arco de fuego frontal (Forward Fire Arc)', /^Fro$/],
  ['FxF', 'Arco de fuego fijo frontal (Fixed Forward)', /^FxF$/],
  ['Pos', 'Arco de fuego trasero (Rear Fire Arc)', /^Pos$/],
  ['Izq. / Der.', 'Arco de fuego izquierdo / derecho (Left / Right)', /^(Izq|Der)\.?$/],
  ['N×', 'El arma dispara N veces o la unidad lleva N armas iguales', /^\d+×$/],
  ['(15cm)', 'Alcance entre paréntesis: armas ligeras, solo en tiroteo (Small Arms)', /^Armas ligeras$/],
  ['(peana)', 'Armas de asalto: solo en combate cuerpo a cuerpo (Assault Weapons)', /^Armas de asalto$/],
];

/** Abreviaturas que aparecen en estos perfiles, en el orden de la leyenda. */
export function abreviaturasDe(fichas: FichaEpic[]): [string, string][] {
  const tokens = new Set<string>(['']);
  for (const f of fichas) {
    f.tipo.split('/').forEach(t => tokens.add(t.trim()));
    for (const a of f.armas) {
      for (const parte of a.potencia.split(/,\s*/)) {
        const p = parte.trim();
        tokens.add(p);
        p.split(/[\s/]+/).forEach(t => tokens.add(t));
      }
    }
  }
  const ts = [...tokens];
  return ABREVIATURAS.filter(([, , re]) => ts.some(t => re.test(t))).map(([a, s]) => [a, s]);
}
