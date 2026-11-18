// ===== Tipos de las listas de ejército de NetEA (Epic Armageddon) =====
// Los datos están en src/data/epic/ejercitos/<id>.json (un archivo por ejército).

export type TipoSeccion = 'nucleo' | 'apoyo' | 'tercio' | 'individuos' | 'mejoras' | 'compras';

export interface SeccionEpic {
  id: string;
  nombre: string;
  nombreEs?: string;
  tipo: TipoSeccion;
  /** Texto de la regla tal cual viene en el PDF */
  nota: string;
  notaEs?: string;
  /** Apoyo: cuántas formaciones de esta sección por cada formación "base" */
  porCada?: { cantidad: number; base: string };
  /** Secciones de apoyo que comparten el mismo cupo */
  grupo?: string;
  /** "0–2 Imperial Navy Aircraft" */
  maxFormaciones?: number;
  /** Mejoras: máximo de mejoras distintas por formación */
  maxPorFormacion?: number;
  /** Mejoras: cada una una sola vez por formación */
  unaVez?: boolean;
}

export interface ExtraEpic {
  texto: string;
  textoEs?: string;
  coste: number;
  porUnidad?: boolean;
  max?: number;
  /** Extras que comparten el máximo (Predators y Land Raiders adicionales: 4 entre los dos) */
  juntos?: string;
}

export interface FormacionEpic {
  id: string;
  nombre: string;
  nombreEs?: string;
  seccion: string;
  unidades: string;
  unidadesEs?: string;
  coste: number;
  costeTexto: string;
  /** Máximo por ejército (0–1, individuos…) */
  max?: number;
  /** Tamaños o variantes con distinto coste (Orkos, Tiránidos, Squats…) */
  tamanos?: { nombre: string; nombreEs?: string; coste: number }[];
  extras?: ExtraEpic[];
  /** Nombres de las mejoras que puede llevar */
  mejoras?: string[];
  nota?: string;
  notaEs?: string;
  /** Recargo si alguna unidad de la formación es de esta versión («Hammerheads with Railguns cost +25») */
  recargo?: { unidad: string; coste: number; texto: string };
}

export interface MejoraEpic {
  id: string;
  nombre: string;
  /** Precio por parejas que la app aplica sola: +cada c/u o +pareja por cada dos (y unidades con precio aparte) */
  parejas?: { cada: number; pareja: number; aparte?: Record<string, number> };
  nombreEs?: string;
  seccion: string;
  texto: string;
  textoEs?: string;
  coste: number;
  costeTexto: string;
  porUnidad?: boolean;
  max?: number;
  maxEjercito?: number;
  variantes?: { coste: number; porUnidad: boolean; texto: string; textoEs?: string; /** Versiones de arma permitidas a las unidades que añade */ unidades?: string[] }[];
}

export interface CompraEpic {
  id: string;
  nombre: string;
  nombreEs?: string;
  seccion: string;
  texto: string;
  textoEs?: string;
  coste: number;
  costeTexto: string;
}

export interface EjercitoEpic {
  id: string;
  nombre: string;
  nombreEs?: string;
  version: string;
  estrategia: number | null;
  iniciativa: string;
  iniciativaEs?: string;
  /** Parte máxima de los puntos para aliados, aeronaves y titanes (1/3 o 1/4) */
  fraccionAliados: number | null;
  secciones: SeccionEpic[];
  formaciones: FormacionEpic[];
  mejoras: MejoraEpic[];
  compras: CompraEpic[];
  /** Reglas especiales del ejército (NetEA Edición Deluxe en castellano) */
  reglas?: ReglaEjercito[];
  /** Hojas de datos (estadísticas) de las unidades */
  fichas?: FichaEpic[];
}

export interface ArmaEpic {
  nombre: string;
  alcance: string;
  potencia: string;
}

export interface FichaEpic {
  nombre: string;
  /** Nombre en castellano (compendio) */
  nombreEs?: string;
  tipo: string;
  velocidad: string;
  blindaje: string;
  cc: string;
  ff: string;
  armas: ArmaEpic[];
  notas: string;
  /** Versiones de la unidad según el arma que lleva (se elige cuál en cada formación) */
  variantesArma?: string[];
}

export interface ReglaEjercito {
  /** Apartado del reglamento: «5.1.1», «6.3»… */
  id: string;
  titulo: string;
  parrafos: string[];
}

export interface EntradaIndice {
  id: string;
  nombre: string;
  nombreEs?: string;
  familia: string;
  familiaEs?: string;
  /** Factor de estrategia */
  estrategia?: number | null;
  /** Texto de iniciativa en castellano */
  iniciativaEs?: string;
  version: string;
}

// ===== Listas que crea el usuario =====

export interface FormacionElegida {
  uid: string;
  formacion: string; // id de FormacionEpic
  /** Índice del tamaño elegido (si la formación tiene tamaños) */
  tamano: number;
  /** Índice del extra → cantidad */
  extras: Record<number, number>;
  /** Nombre de la mejora → cantidad */
  mejoras: Record<string, number>;
  /** Nombre de la mejora → índice de la variante elegida */
  variantes: Record<string, number>;
  /** Reparto elegido en cada grupo de opciones («2 Predator Annihilator y 2 Destructor», «Chaplain»…): clave del grupo → unidad → cantidad */
  reparto?: Record<string, Record<string, number>>;
  nota: string;
}

export interface ListaEpic {
  id: string;
  juego: 'epic';
  nombre: string;
  ejercito: string; // id de EjercitoEpic
  puntos: number;
  formaciones: FormacionElegida[];
  /** Compras sueltas del ejército (Daemon Pool, variantes de Leman Russ…) → cantidad */
  compras: Record<string, number>;
  actualizada: number;
}
