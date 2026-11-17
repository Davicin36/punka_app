// ===== Tipos de los datos del libro (src/data/*.json) =====

export type TipoUnidad = 'tropa' | 'personalidad' | 'mercenario' | 'personaje';
export type ClaveAtributo = 'acciones' | 'combate' | 'precision' | 'agilidad' | 'fuerza' | 'dureza' | 'tecnica';
export type Perfil = Record<ClaveAtributo, string>;

export interface Opcion {
  nombre: string;
  coste: number;
  /** Se compra por unidades (bombas, granadas, balas apañadas…) */
  porUnidad?: boolean;
  nota?: string;
}

export interface Unidad {
  id: string;
  nombre: string;
  coste: number;
  tipo: TipoUnidad;
  perfil: Perfil | null;
  armas?: { min: number; max: number; opciones: Opcion[] };
  armasFijas?: string | null;
  blindaje: { base: string; opciones: Opcion[] };
  equipo?: { incluido?: string; opciones?: Opcion[] };
  reglasEspeciales: string[];
  /** Texto de cada regla especial (del libro) */
  reglasTexto?: Record<string, string>;
  opcionesExtra?: Opcion[];
  mutaciones?: { min: number; max: number; permitidas?: string[] };
  articulosDeCona?: number;
  fieras?: { max: number; coste: number };
  grupo?: { min: number; max: number };
  cuentaComo?: string;
  sinEquipoGenerico?: boolean;
  noPuedeUnirseA?: string[];
  armaIncrustada?: { coste: number };
  /** Nº máximo de Reliquias abisales (Craabianos) */
  reliquias?: number;
  /** Ignora el -1 a Agilidad de Armatoste (Forzudo) */
  ignoraArmatoste?: boolean;
  nota?: string;
}

export type Limite =
  | { tipo: 'maxTipo'; tipos: TipoUnidad[]; max: number }
  | { tipo: 'maxUnidad'; unidades: string[]; max: number }
  | { tipo: 'noMasQueResto'; unidad: string }
  | { tipo: 'porPuntos'; unidad: string; cada: number }
  | { tipo: 'porUnidad'; unidad: string; referencia: string; factor: number }
  | { tipo: 'sumaNoMasQue'; unidades: string[]; referencia: string }
  | { tipo: 'repeticionMutacion'; max: number }
  | { tipo: 'repeticionArticulo'; max: number }
  | { tipo: 'reliquiaUnica' }
  | { tipo: 'unicos' }
  | { tipo: 'excluyentes'; unidades: string[] };

export interface Faccion {
  id: string;
  nombre: string;
  equipoGenerico: Opcion[];
  restricciones: string[];
  limites: Limite[];
  admiteMercenarios: boolean;
  invitados?: string[];
  equipoFaccion?: Opcion[];
  extrasBanda?: (Opcion & { max: number })[];
  reliquias?: Opcion[];
  reglasFaccion?: string[];
  reglasFaccionTexto?: Record<string, string>;
  unidades: Unidad[];
}

export type Modificadores = Partial<Record<ClaveAtributo, number>>;

export interface Mutacion extends Opcion {
  modificadores?: Modificadores;
  /** Valor de Blindaje que otorga (Piel dura) */
  blindaje?: string;
  /** Nombre del arma del catálogo que otorga (Garras, Espinas…) */
  arma?: string;
}

export interface Comun {
  atributos: { clave: ClaveAtributo; abreviatura: string; nombre: string }[];
  miniaturasPorCada100Puntos: number;
  costeBala: number;
  gatoParameno: Opcion & { max: number };
  mutaciones: Mutacion[];
  articulosDeCona: Opcion[];
  /** Glosario de reglas especiales genéricas (Reglas_punka) */
  reglasGenericas: Record<string, string>;
}

// ===== Catálogo de equipo (src/data/equipo.json) =====

export interface PerfilArma {
  modo: 'cc' | 'distancia';
  /** Modificador al Combate (solo cuerpo a cuerpo) */
  combate?: number;
  /** "+2" = se suma a la Fuerza; "6" o "5/4/3" = valor fijo; "L" = Fuerza del lanzador */
  fuerza: string;
  penetracion: string;
  /** "30/60/90", "L×5" (Fuerza del lanzador × 5 cm), "Lágrima"… */
  distancia?: string;
  nota?: string;
}

export interface Arma {
  nombre: string;
  perfiles: PerfilArma[];
  reglas: string[];
  nota?: string;
  fuente: 'reglamento' | 'libro';
}

export interface BlindajeInfo {
  nombre: string;
  blindaje: string;
  reglas: string[];
  nota?: string;
}

export interface EquipoInfo {
  nombre: string;
  modificadores?: Modificadores;
  reglas: string[];
  nota?: string;
}

export interface Catalogo {
  armas: Arma[];
  blindajes: BlindajeInfo[];
  equipo: EquipoInfo[];
}

// ===== Tipos de las bandas que crea el usuario =====

export interface Miniatura {
  uid: string;
  unidad: string; // id de Unidad
  apodo: string;
  armas: Record<string, number>; // nombre -> cantidad
  blindaje: number; // -1 = base, n = índice de opción
  equipo: Record<string, number>;
  equipoGenerico: Record<string, number>;
  equipoFaccion: Record<string, number>;
  extras: Record<string, number>;
  balas: number;
  armasIncrustadas: number;
  mutaciones: string[];
  articulos: string[];
  fieras: number;
  grupo: number;
  reliquias: string[];
}

export interface Banda {
  id: string;
  nombre: string;
  faccion: string;
  puntos: number;
  miniaturas: Miniatura[];
  gato: boolean;
  extrasBanda: Record<string, boolean>;
  actualizada: number;
}

export interface Ajustes {
  costeBala: number;
}
