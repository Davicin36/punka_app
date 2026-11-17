/** Texto en castellano con el original en inglés entre paréntesis, en gris. */
export default function Bi({ es, en }: { es?: string; en: string }) {
  if (!es || es === en) return <>{en}</>;
  return <>{es} <span className="en">({en})</span></>;
}
