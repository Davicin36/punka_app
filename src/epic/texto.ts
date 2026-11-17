// ===== Textos bilingües: castellano con el original en inglés entre paréntesis =====

/** "Tácticos (Tactical)"; si no hay traducción o es igual, solo el original. */
export function bi(es: string | undefined, en: string): string {
  return es && es !== en ? `${es} (${en})` : en;
}

/** Nombre bilingüe de cualquier elemento con nombre/nombreEs */
export const nom = (x: { nombre: string; nombreEs?: string }) => bi(x.nombreEs, x.nombre);

/** Solo el castellano (o el inglés si no hay traducción) */
export const es = (traducido: string | undefined, en: string) => traducido || en;
