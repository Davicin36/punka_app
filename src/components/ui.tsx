import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { Unidad } from '../types';
import { COMUN } from '../data';

export function Contador({ valor, min = 0, max = 99, onChange }: { valor: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <span className="step">
      <button type="button" disabled={valor <= min} onClick={() => onChange(valor - 1)} aria-label="Menos">−</button>
      <b>{valor}</b>
      <button type="button" disabled={valor >= max} onClick={() => onChange(valor + 1)} aria-label="Más">+</button>
    </span>
  );
}

export function Check({ activo, nombre, coste, nota, onChange, radio, grupo }: {
  activo: boolean; nombre: ReactNode; coste: string; nota?: string; onChange: (v: boolean) => void; radio?: boolean; grupo?: string;
}) {
  return (
    <label className={`opt ${activo ? 'on' : ''}`}>
      <input type={radio ? 'radio' : 'checkbox'} name={grupo} checked={activo} onChange={e => onChange(e.target.checked)} />
      <span>{nombre}{nota && <small> {nota}</small>}</span>
      <em>{coste}</em>
    </label>
  );
}

export function FilaContador({ nombre, nota, valor, min, max, onChange }: {
  nombre: ReactNode; nota?: string; valor: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
  return (
    <div className={`opt ${valor ? 'on' : ''}`}>
      <span>{nombre}{nota && <small> {nota}</small>}</span>
      <Contador valor={valor} min={min} max={max} onChange={onChange} />
    </div>
  );
}

export function PerfilUnidad({ unidad }: { unidad: Unidad }) {
  if (!unidad.perfil) return null;
  return (
    <div className="stats">
      {COMUN.atributos.map(a => (
        <div key={a.clave} title={a.nombre}><span>{a.abreviatura}</span><b>{unidad.perfil![a.clave]}</b></div>
      ))}
    </div>
  );
}

export function Modal({ titulo, onClose, children, alto }: { titulo: string; onClose: () => void; children: ReactNode; alto?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal" onClick={onClose}>
      <div className={`sheet ${alto ? 'tall' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="shead"><h3>{titulo}</h3><button className="x" onClick={onClose} aria-label="Cerrar">×</button></div>
        {children}
      </div>
    </div>
  );
}

/** Regla especial desplegable: el nombre siempre visible y el texto al pulsar. */
export function Regla({ nombre, nota, children }: { nombre: ReactNode; nota?: string; children: ReactNode }) {
  return (
    <details className="regla">
      <summary><b>{nombre}</b>{nota && <small> {nota}</small>}</summary>
      <div className="rtexto">{children}</div>
    </details>
  );
}
