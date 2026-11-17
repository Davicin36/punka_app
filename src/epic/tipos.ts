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
}

export interface MejoraEpic {
  id: string;
  nombre: string;
  nombreEs?: string;
  seccion: string;
  texto: string;
  textoEs?: string;
  coste: number;
  costeTexto: string;
  porUnidad?: boolean;
  max?: number;
  maxEjercito?: number;
  variantes?: { coste: number; porUnidad: boolean; texto: string; textoEs?: string }[];
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
