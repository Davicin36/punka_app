// Punto único de acceso a los JSON del libro de bandas.
// Para añadir una facción nueva: crea su .json en ./facciones y añádelo a FACCIONES.
import type { Arma, BlindajeInfo, Catalogo, Comun, EquipoInfo, Faccion, Mutacion, Unidad } from '../types';
import comunJson from './comun.json';
import chatarreros from './facciones/chatarreros.json';
import sangreNegra from './facciones/sangre-negra.json';
import idos from './facciones/idos.json';
import irradiados from './facciones/irradiados.json';
import mutardos from './facciones/mutardos.json';
import pandilleros from './facciones/pandilleros.json';
import troupe from './facciones/troupe.json';
import vReich from './facciones/v-reich.json';
import comic from './facciones/comic.json';
import craabianos from './facciones/craabianos.json';
import unami from './facciones/unami.json';
import equipoJson from './equipo.json';
import mercenariosJson from './facciones/mercenarios.json';

export const COMUN = comunJson as Comun;

export const FACCIONES = [
  chatarreros, sangreNegra, idos, irradiados, mutardos, pandilleros, troupe, vReich, craabianos, unami, comic,
] as unknown as Faccion[];

export const MERCENARIOS = (mercenariosJson as unknown as { unidades: Unidad[] }).unidades;

export const faccionPorId: Record<string, Faccion> = Object.fromEntries(FACCIONES.map(f => [f.id, f]));

export const unidadPorId: Record<string, Unidad> = Object.fromEntries(
  [...FACCIONES.flatMap(f => f.unidades), ...MERCENARIOS].map(u => [u.id, u]),
);

/** Facción a la que pertenece una unidad (undefined para mercenarios). */
export const faccionDeUnidad: Record<string, string> = Object.fromEntries(
  FACCIONES.flatMap(f => f.unidades.map(u => [u.id, f.id])),
);

export const costeMutacion = Object.fromEntries(COMUN.mutaciones.map(m => [m.nombre, m.coste]));
export const costeArticulo = Object.fromEntries(COMUN.articulosDeCona.map(m => [m.nombre, m.coste]));

export const CATALOGO = equipoJson as unknown as Catalogo;
export const armaPorNombre: Record<string, Arma> = Object.fromEntries(CATALOGO.armas.map(a => [a.nombre, a]));
export const blindajePorNombre: Record<string, BlindajeInfo> = Object.fromEntries(CATALOGO.blindajes.map(b => [b.nombre, b]));
export const equipoPorNombre: Record<string, EquipoInfo> = Object.fromEntries(CATALOGO.equipo.map(e => [e.nombre, e]));
export const mutacionPorNombre: Record<string, Mutacion> = Object.fromEntries(COMUN.mutaciones.map(m => [m.nombre, m]));
