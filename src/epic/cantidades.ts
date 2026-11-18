// ===== Cantidades con número: «Diez Leman Russ» → «10x Leman Russ» =====
// Se aplica al mostrar los textos de unidades, extras y mejoras (pantalla, PDF y texto), en castellano e inglés.

const NUMEROS: Record<string, number> = {
  un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciséis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veinticuatro: 24, treinta: 30,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, eighteen: 18, twenty: 20, thirty: 30,
};

/** Palabras tras las que el número no es una cantidad de unidades («seis cualesquiera de», «uno por»). */
const NO = new Set(['de', 'del', 'por', 'o', 'y', 'a', 'al', 'en', 'con', 'cada', 'cualesquiera', 'cualquiera', 'más', 'vez',
  'veces', 'tercio', 'mitad', 'puntos', 'opción', 'opciones', 'of', 'or', 'and', 'per', 'more', 'time', 'times', 'third',
  'half', 'points', 'option', 'options', 'any', 'formación', 'formaciones', 'formation', 'formations', 'mejora', 'mejoras',
  'upgrade', 'upgrades', 'turno', 'turnos', 'turn', 'turns', 'with', 'to', 'for', 'plus', 'from', 'that', 'may', 'can',
  'puede', 'pueden', 'que', 'sin', 'para', 'hasta', 'up']);

const RE = new RegExp(`(?<![\\p{L}\\d])(${Object.keys(NUMEROS).join('|')})\\s+(?:(?:unidad(?:es)?|units?)\\s+(?:de|of)\\s+)?(?=(\\p{L}[\\p{L}'’-]*))`, 'giu');

export function cantidades(texto: string): string;
export function cantidades(texto: string | undefined): string | undefined;
export function cantidades(texto: string | undefined) {
  if (!texto) return texto;
  // Rangos: «dos o cuatro Marines» → «2x o 4x Marines», «two to three Bombers» → «2-3x Bombers»
  const pal = Object.keys(NUMEROS).join('|');
  texto = texto
    .replace(new RegExp(`(?<![\\p{L}])(${pal})\\s+(o|or)\\s+(${pal})\\s+(?=\\p{L})`, 'giu'),
      (_t, a: string, o: string, b: string) => `${NUMEROS[a.toLowerCase()]}x ${o} ${NUMEROS[b.toLowerCase()]}x `)
    .replace(new RegExp(`(?<![\\p{L}])(?:(?:entre|between|de|from)\\s+)?(${pal})\\s+(?:a|to|y|and)\\s+(${pal})\\s+(?=\\p{L})`, 'giu'),
      (_t, a: string, b: string) => `${NUMEROS[a.toLowerCase()]}-${NUMEROS[b.toLowerCase()]}x `);
  return texto.replace(RE, (todo, palabra: string, siguiente: string, pos: number, entero: string) => {
    const p = palabra.toLowerCase();
    // «Añade hasta tres Guardianes» → «Añade hasta 3 Guardianes» (un máximo, no una cantidad)
    if (/(?:hasta|up to)\s+$/i.test(entero.slice(0, pos))) return /unidad|units?/i.test(todo) ? todo : `${NUMEROS[p]} `;
    if (NO.has(siguiente.toLowerCase())) return todo;
    // «un/una» solo delante de un nombre propio de unidad o de «unidad de» (no «un tercio», «una vez»)
    if ((p === 'un' || p === 'una') && !/^\p{Lu}/u.test(siguiente) && !/unidad|units?/i.test(todo)
      && !['personaje', 'escuadrón', 'pelotón'].includes(siguiente.toLowerCase())) return todo;
    return `${NUMEROS[p]}x `;
  });
}

/** «3x Escuadrón Hellhound»: la cantidad delante, con x. */
export const porCantidad = (n: number, nombre: string) => (n > 1 ? `${n}x ${nombre}` : nombre);
