import { useEffect, useRef, useState } from 'react';
import type { Ajustes, Banda } from '../types';
import type { EjercitoEpic, ListaEpic } from '../epic/tipos';
import { FACCIONES, faccionPorId } from '../data';
import { costeBanda, numMiniaturas, problemasBanda } from '../logic/banda';
import { exportarTodo, importar, type Estado } from '../logic/almacen';
import { INDICE_EPIC, cargarEjercito, nombreEjercito } from '../epic/datos';
import { costeLista, problemasLista } from '../epic/logica';
import { Modal } from './ui';
import { descargar } from '../logic/descargar';
import logo from '../assets/logoTacticode.webp';

type Juego = 'punka' | 'epic';

interface Props {
  bandas: Banda[]; ejercitos: ListaEpic[]; ajustes: Ajustes; estado: Estado;
  onAbrir: (id: string) => void;
  onCrear: (nombre: string, faccion: string, puntos: number) => void;
  onCrearEpic: (nombre: string, ejercito: string, puntos: number) => void;
  onImportar: (b: Banda[], e: ListaEpic[]) => void;
  onBorrar: (id: string) => void;
}

const familias = [...new Set(INDICE_EPIC.map(e => e.familia))];

export function Inicio({ bandas, ejercitos, ajustes, estado, onAbrir, onCrear, onCrearEpic, onImportar, onBorrar }: Props) {
  const [nueva, setNueva] = useState(false);
  const [juego, setJuego] = useState<Juego>('punka');
  const [aviso, setAviso] = useState('');
  const [borrar, setBorrar] = useState<{ id: string; nombre: string } | null>(null);
  const [datosEpic, setDatosEpic] = useState<Record<string, EjercitoEpic>>({});
  const [ejSel, setEjSel] = useState(INDICE_EPIC[0]?.id ?? '');
  const sel = INDICE_EPIC.find(e => e.id === ejSel);
  const fichero = useRef<HTMLInputElement>(null);

  // Carga los ejércitos de Epic que se usan en las listas guardadas, para mostrar sus puntos
  useEffect(() => {
    const ids = [...new Set(ejercitos.map(l => l.ejercito))].filter(id => !datosEpic[id]);
    if (!ids.length) return;
    Promise.all(ids.map(id => cargarEjercito(id).then(e => [id, e] as const)))
      .then(pares => setDatosEpic(d => ({ ...d, ...Object.fromEntries(pares) })))
      .catch(() => {});
  }, [ejercitos, datosEpic]);

  const todas = [
    ...bandas.map(b => ({ tipo: 'punka' as const, id: b.id, actualizada: b.actualizada, b })),
    ...ejercitos.map(l => ({ tipo: 'epic' as const, id: l.id, actualizada: l.actualizada, l })),
  ].sort((a, b) => b.actualizada - a.actualizada);

  const leerArchivo = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = importar(await f.text());
      onImportar(r.bandas, r.ejercitos);
      const n = r.bandas.length + r.ejercitos.length;
      setAviso(`Importada${n > 1 ? 's' : ''} ${n} lista${n > 1 ? 's' : ''}.`);
    } catch (e) { setAviso(e instanceof Error ? e.message : 'No se pudo leer el archivo.'); }
    if (fichero.current) fichero.current.value = '';
  };

  return (
    <>
      <header className="top">
        <div className="brand">
          <img src={logo} alt="TacticoDE" className="logo-img" />
          <div><h1>Creador de listas</h1><p>Punkapocalyptic · Epic Armageddon</p></div>
        </div>
      </header>
      <main className="wrap">
        <button className="big" onClick={() => setNueva(true)}>+ Nueva lista</button>

        {todas.length ? <>
          <h2 className="sec">Tus listas</h2>
          <div className="lists">
            {todas.map(x => {
              if (x.tipo === 'punka') {
                const b = x.b, p = costeBanda(b, ajustes), mal = problemasBanda(b, ajustes).length;
                return (
                  <div key={b.id} className="lcwrap">
                  <button className="lcard" onClick={() => onAbrir(b.id)}>
                    <span className="juego">Punkapocalyptic</span>
                    <span className={`fac f-${b.faccion}`}>{faccionPorId[b.faccion].nombre}</span>
                    <b>{b.nombre}</b>
                    <span className="meta">{p}/{b.puntos} pts · {numMiniaturas(b)} minis {mal ? <i className="warn">⚠ {mal}</i> : <i className="ok">✔</i>}</span>
                  </button>
                  <button className="lcdel" aria-label={`Borrar ${b.nombre}`} title="Borrar lista" onClick={() => setBorrar({ id: b.id, nombre: b.nombre })}>✕</button>
                  </div>
                );
              }
              const l = x.l, d = datosEpic[l.ejercito];
              const p = d ? costeLista(d, l) : null, mal = d ? problemasLista(d, l).length : 0;
              return (
                <div key={l.id} className="lcwrap">
                <button className="lcard epic" onClick={() => onAbrir(l.id)}>
                  <span className="juego">Epic Armageddon</span>
                  <span className="fac f-epic">{nombreEjercito(l.ejercito)}</span>
                  <b>{l.nombre}</b>
                  <span className="meta">{p ?? '…'}/{l.puntos} pts · {l.formaciones.length} formaciones {d && (mal ? <i className="warn">⚠ {mal}</i> : <i className="ok">✔</i>)}</span>
                </button>
                <button className="lcdel" aria-label={`Borrar ${l.nombre}`} title="Borrar lista" onClick={() => setBorrar({ id: l.id, nombre: l.nombre })}>✕</button>
                </div>
              );
            })}
          </div>
        </> : <p className="empty">Aún no tienes ninguna lista. Crea una para empezar.</p>}

        <div className="actions">
          <button className="ghost" onClick={() => fichero.current?.click()}>Importar JSON</button>
          {todas.length > 0 && <button className="ghost" onClick={() => descargar('listas-punka-epic.json', exportarTodo(estado))}>Exportar todas</button>}
          <input ref={fichero} type="file" accept="application/json,.json" hidden onChange={e => leerArchivo(e.target.files?.[0])} />
        </div>
        {aviso && <p className="hint">{aviso}</p>}

        <p className="hint foot">Las listas se guardan en este navegador. Usa «Exportar» para pasarlas a otro dispositivo.</p>
      </main>

      {borrar && (
        <Modal titulo="¿Borrar esta lista?" onClose={() => setBorrar(null)}>
          <p>Se borrará «{borrar.nombre}» de este navegador. No se puede deshacer (salvo que la tengas exportada).</p>
          <div className="btns">
            <button className="ghost" onClick={() => setBorrar(null)}>Cancelar</button>
            <button className="primary danger" onClick={() => { onBorrar(borrar.id); setBorrar(null); }}>Borrar</button>
          </div>
        </Modal>
      )}

      {nueva && (
        <Modal titulo="Nueva lista" onClose={() => setNueva(false)}>
          <form key={juego} onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const nombre = String(fd.get('nombre')).trim() || (juego === 'punka' ? 'Banda sin nombre' : 'Ejército sin nombre');
            if (juego === 'punka') onCrear(nombre, String(fd.get('faccion')), Math.max(50, Number(fd.get('puntos')) || 400));
            else onCrearEpic(nombre, String(fd.get('ejercito')), Math.max(250, Number(fd.get('puntos')) || 3000));
          }}>
            <div className="seg" role="radiogroup" aria-label="Juego">
              <button type="button" className={juego === 'punka' ? 'on' : ''} onClick={() => setJuego('punka')}>Punkapocalyptic</button>
              <button type="button" className={juego === 'epic' ? 'on' : ''} onClick={() => setJuego('epic')}>Epic Armageddon</button>
            </div>
            <label>Nombre<input name="nombre" required maxLength={60} placeholder={juego === 'punka' ? 'Los Oxidados' : 'Cruzada de Armageddon'} autoFocus /></label>
            {juego === 'punka' ? (
              <label>Facción
                <select name="faccion">{FACCIONES.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select>
              </label>
            ) : (
              <label>Ejército (NetEA)
                <select name="ejercito" value={ejSel} onChange={ev => setEjSel(ev.target.value)}>
                  {familias.map(fam => (
                    <optgroup key={fam} label={INDICE_EPIC.find(e => e.familia === fam)?.familiaEs ?? fam}>
                      {INDICE_EPIC.filter(e => e.familia === fam).map(e => <option key={e.id} value={e.id}>{e.nombreEs ? `${e.nombreEs} (${e.nombre})` : e.nombre}</option>)}
                    </optgroup>
                  ))}
                </select>
                {sel && (
                  <span className="ejinfo">
                    <span><small>Factor de estrategia</small><b>{sel.estrategia ?? '–'}</b></span>
                    <span><small>Iniciativa</small>{sel.iniciativaEs}</span>
                  </span>
                )}
              </label>
            )}
            <label>Puntos de la partida
              <input name="puntos" type="number" min={juego === 'punka' ? 50 : 250} step={juego === 'punka' ? 10 : 25} defaultValue={juego === 'punka' ? 400 : 3000} inputMode="numeric" />
            </label>
            <p className="hint">{juego === 'punka' ? 'Partida estándar: 350–500 puntos.' : 'Torneo estándar: 3000 puntos.'}</p>
            <div className="btns"><button type="button" className="ghost" onClick={() => setNueva(false)}>Cancelar</button><button className="primary">Crear</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
