import { useRef, useState } from 'react';
import type { Ajustes, Banda } from '../types';
import { FACCIONES, faccionPorId } from '../data';
import { costeBanda, numMiniaturas, problemasBanda } from '../logic/banda';
import { importarBandas } from '../logic/almacen';
import { Modal } from './ui';
import { descargar } from '../logic/descargar';

interface Props {
  bandas: Banda[]; ajustes: Ajustes;
  onAbrir: (id: string) => void; onCrear: (nombre: string, faccion: string, puntos: number) => void;
  onImportar: (b: Banda[]) => void;
}

export function Inicio({ bandas, ajustes, onAbrir, onCrear, onImportar }: Props) {
  const [nueva, setNueva] = useState(false);
  const [aviso, setAviso] = useState('');
  const fichero = useRef<HTMLInputElement>(null);
  const ordenadas = [...bandas].sort((a, b) => b.actualizada - a.actualizada);

  const importar = async (f: File | undefined) => {
    if (!f) return;
    try { const bs = importarBandas(await f.text()); onImportar(bs); setAviso(`Importada${bs.length > 1 ? 's' : ''} ${bs.length} banda${bs.length > 1 ? 's' : ''}.`); }
    catch (e) { setAviso(e instanceof Error ? e.message : 'No se pudo leer el archivo.'); }
    if (fichero.current) fichero.current.value = '';
  };

  return (
    <>
      <header className="top">
        <div className="brand"><span className="logo">☢</span><div><h1>Bandas del Páramo</h1><p>Constructor de listas · Punkapocalyptic</p></div></div>
      </header>
      <main className="wrap">
        <button className="big" onClick={() => setNueva(true)}>+ Nueva banda</button>

        {ordenadas.length ? <>
          <h2 className="sec">Tus bandas</h2>
          <div className="lists">
            {ordenadas.map(b => {
              const p = costeBanda(b, ajustes), mal = problemasBanda(b, ajustes).length;
              return (
                <button key={b.id} className="lcard" onClick={() => onAbrir(b.id)}>
                  <span className={`fac f-${b.faccion}`}>{faccionPorId[b.faccion].nombre}</span>
                  <b>{b.nombre}</b>
                  <span className="meta">{p}/{b.puntos} pts · {numMiniaturas(b)} minis {mal ? <i className="warn">⚠ {mal}</i> : <i className="ok">✔</i>}</span>
                </button>
              );
            })}
          </div>
        </> : <p className="empty">Aún no tienes ninguna banda. Crea una para empezar.</p>}

        <div className="actions">
          <button className="ghost" onClick={() => fichero.current?.click()}>Importar JSON</button>
          {bandas.length > 0 && <button className="ghost" onClick={() => descargar('bandas-punkapocalyptic.json', JSON.stringify({ formato: 'punka-banda', version: 1, bandas }, null, 2))}>Exportar todas</button>}
          <input ref={fichero} type="file" accept="application/json,.json" hidden onChange={e => importar(e.target.files?.[0])} />
        </div>
        {aviso && <p className="hint">{aviso}</p>}

        <p className="hint foot">Las bandas se guardan en este navegador. Usa «Exportar» para pasarlas a otro dispositivo.</p>
      </main>

      {nueva && (
        <Modal titulo="Nueva banda" onClose={() => setNueva(false)}>
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onCrear(String(fd.get('nombre')).trim() || 'Banda sin nombre', String(fd.get('faccion')), Math.max(50, Number(fd.get('puntos')) || 400));
          }}>
            <label>Nombre<input name="nombre" required maxLength={60} placeholder="Los Oxidados" autoFocus /></label>
            <label>Facción
              <select name="faccion">{FACCIONES.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
            </label>
            <label>Puntos de la partida<input name="puntos" type="number" min={50} step={10} defaultValue={400} inputMode="numeric" /></label>
            <p className="hint">Partida estándar: 350–500 puntos.</p>
            <div className="btns"><button type="button" className="ghost" onClick={() => setNueva(false)}>Cancelar</button><button className="primary">Crear</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}