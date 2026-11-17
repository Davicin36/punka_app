/// <reference types="vite/client" />
// Carga de los ejércitos de NetEA. Cada JSON se descarga solo cuando se abre (code splitting).
import type { EjercitoEpic, EntradaIndice } from './tipos';
import indiceJson from '../data/epic/indice.json';

export const INDICE_EPIC = indiceJson as EntradaIndice[];
export const nombreEjercito = (id: string) => {
  const e = INDICE_EPIC.find(x => x.id === id);
  return e ? e.nombreEs ?? e.nombre : id;
};

const cargadores = import.meta.glob('../data/epic/ejercitos/*.json', { import: 'default' });
const cache = new Map<string, EjercitoEpic>();

export async function cargarEjercito(id: string): Promise<EjercitoEpic> {
  const hit = cache.get(id);
  if (hit) return hit;
  const cargar = cargadores[`../data/epic/ejercitos/${id}.json`];
  if (!cargar) throw new Error(`No existe el ejército ${id}`);
  const e = (await cargar()) as EjercitoEpic;
  cache.set(id, e);
  return e;
}

/** Para las listas guardadas: ejército ya cargado (o undefined si aún no). */
export const ejercitoEnCache = (id: string) => cache.get(id);
