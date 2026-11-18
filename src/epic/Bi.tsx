import { cantidades } from './cantidades';

/** Texto en castellano con el original en inglés entre paréntesis, en gris.
 *  Con «n», las cantidades de unidades salen con número: «10x Leman Russ». */
export default function Bi({ es, en, n }: { es?: string; en: string; n?: boolean }) {
  if (n) { es = cantidades(es); en = cantidades(en); }
  if (!es || es === en) return <>{en}</>;
  return <>{es} <span className="en">({en})</span></>;
}
