import { useState } from 'react';
import type { Ajustes, Banda, Miniatura, Unidad } from '../types';
import { COMUN, MERCENARIOS, faccionPorId, unidadPorId } from '../data';
import { bandaComoTexto, costeBanda, maxMiniaturas, nuevaMiniatura, nuevoId, numMiniaturas, problemasBanda } from '../logic/banda';
import { exportarBanda } from '../logic/almacen';
import { descargar, nombreArchivo } from '../logic/descargar';
import { Check, Modal, PerfilUnidad } from './ui';
import { TarjetaMiniatura } from './TarjetaMiniatura';

interface Props {
  banda: Banda; ajustes: Ajustes;
  onCambiar: (fn: (b: Banda) => void) => void; onVolver: () => void; onBorrar: () => void; onDuplicar: () => void;
}
type ModalAbierto = null | 'anadir' | 'editar' | 'texto' | 'borrar';

export function EditorBanda({ banda, ajustes, onCambiar, onVolver, onBorrar, onDuplicar }: Props) {
  const f = faccionPorId[banda.faccion];
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [copiado, setCopiado] = useState('');
  const [generando, setGenerando] = useState(false);

  const exportarPdf = async () => {
    setGenerando(true);
    try {
      const { descargarPdfBanda } = await import('../logic/pdf');
      descargarPdfBanda(banda, ajustes);
    } finally {
      setGenerando(false);
    }
  };

  const pts = costeBanda(banda, ajustes), max = maxMiniaturas(banda.puntos), n = numMiniaturas(banda);
  const problemas = problemasBanda(banda, ajustes);
  const quedan = banda.puntos - pts;

  const cambiarMini = (uid: string, fn: (m: Miniatura) => void) =>
    onCambiar(b => { const m = b.miniaturas.find(x => x.uid === uid); if (m) fn(m); });

  const anadir = (u: Unidad) => {
    const m = nuevaMiniatura(u);
    onCambiar(b => { b.miniaturas.push(m); });
    setAbiertas({ [m.uid]: true });
    setModal(null);
    requestAnimationFrame(() => document.getElementById(`m-${m.uid}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };

  const grupos: [string, Unidad[]][] = banda.faccion === 'comic'
    ? [['Personajes', f.unidades], ['Invitados', (f.invitados ?? []).map(id => unidadPorId[id])]]
    : [['Tropas', f.unidades.filter(u => u.tipo === 'tropa')], ['Personalidades', f.unidades.filter(u => u.tipo === 'personalidad')],
       ...(f.admiteMercenarios ? [['Mercenarios', MERCENARIOS.filter(u => !u.noPuedeUnirseA?.includes(f.id))] as [string, Unidad[]]] : [])];

  return (
    <>
      <header className="top sticky">
        <div className="bar">
          <button className="back" onClick={onVolver} aria-label="Volver">‹</button>
          <div className="ttl"><b>{banda.nombre}</b><span className={`fac f-${f.id}`}>{f.nombre}</span></div>
          <button className="ghost sm" onClick={() => setModal('editar')}>Editar</button>
        </div>
        <div className={`meter ${pts > banda.puntos ? 'over' : ''}`}><div style={{ width: `${Math.min(100, (pts / banda.puntos) * 100)}%` }} /></div>
        <div className="nums">
          <span><b>{pts}</b>/{banda.puntos} pts</span>
          <span>Quedan <b className={quedan < 0 ? 'red' : ''}>{quedan}</b></span>
          <span><b className={n > max ? 'red' : ''}>{n}</b>/{max} minis</span>
        </div>
      </header>

      <main className="wrap">
        {problemas.length > 0
          ? <div className="issues"><b>⚠ Revisa la banda</b><ul>{problemas.map(p => <li key={p}>{p}</li>)}</ul></div>
          : banda.miniaturas.length > 0 && <div className="okbox">✔ Banda válida</div>}

        <div className="models">
          {banda.miniaturas.length === 0 && <p className="empty">Añade tu primera miniatura.</p>}
          {banda.miniaturas.map((m, i) => (
            <div id={`m-${m.uid}`} key={m.uid}>
              <TarjetaMiniatura m={m} i={i} banda={banda} ajustes={ajustes} abierta={!!abiertas[m.uid]}
                onToggle={() => setAbiertas(a => ({ ...a, [m.uid]: !a[m.uid] }))}
                onChange={fn => cambiarMini(m.uid, fn)}
                onDuplicar={() => onCambiar(b => { const c: Miniatura = { ...structuredClone(m), uid: nuevoId() }; b.miniaturas.splice(i + 1, 0, c); })}
                onQuitar={() => onCambiar(b => { b.miniaturas = b.miniaturas.filter(x => x.uid !== m.uid); })} />
            </div>
          ))}
        </div>
        <button className="big" onClick={() => setModal('anadir')}>+ Añadir miniatura</button>

        <section className="bandx">
          <h4>Extras de la banda</h4>
          <div className="opts">
            <Check nombre={COMUN.gatoParameno.nombre} nota="(máx. 1)" coste={`${COMUN.gatoParameno.coste} pts`} activo={banda.gato}
              onChange={v => onCambiar(b => { b.gato = v; })} />
            {(f.extrasBanda ?? []).map(e => (
              <Check key={e.nombre} nombre={e.nombre} nota={`(máx. ${e.max})`} coste={`${e.coste} pts`} activo={!!banda.extrasBanda[e.nombre]}
                onChange={v => onCambiar(b => { b.extrasBanda[e.nombre] = v; })} />
            ))}
          </div>
        </section>

        <details className="rules">
          <summary>Restricciones de {f.nombre}</summary>
          <ul>{f.restricciones.map(r => <li key={r}>{r}</li>)}</ul>
          <p className="hint">Máximo de miniaturas: {COMUN.miniaturasPorCada100Puntos} por cada fracción de 100 puntos.</p>
        </details>

        <div className="actions">
          <button className="ghost" onClick={() => setModal('texto')}>Ver como texto</button>
          <button className="ghost" onClick={exportarPdf} disabled={generando}>{generando ? 'Generando…' : 'Exportar PDF'}</button>
          <button className="ghost" onClick={() => descargar(`${nombreArchivo(banda.nombre)}.json`, exportarBanda(banda))}>Exportar JSON</button>
          <button className="ghost" onClick={onDuplicar}>Duplicar banda</button>
          <button className="ghost danger" onClick={() => setModal('borrar')}>Borrar banda</button>
        </div>
      </main>

      {modal === 'anadir' && (
        <Modal titulo="Añadir miniatura" alto onClose={() => setModal(null)}>
          <p className="hint">Te quedan {quedan} puntos.</p>
          {grupos.filter(([, us]) => us.length).map(([t, us]) => (
            <section key={t}>
              <h4>{t}</h4>
              <div className="picks">
                {us.map(u => (
                  <button key={u.id} className={`pick ${u.coste > quedan ? 'dim' : ''}`} onClick={() => anadir(u)}>
                    <span className="pn"><b>{u.nombre}</b><em>{u.grupo ? `${u.coste} c/u` : `${u.coste} pts`}</em></span>
                    <PerfilUnidad unidad={u} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </Modal>
      )}

      {modal === 'editar' && (
        <Modal titulo="Editar banda" onClose={() => setModal(null)}>
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onCambiar(b => { b.nombre = String(fd.get('nombre')).trim() || b.nombre; b.puntos = Math.max(50, Number(fd.get('puntos')) || b.puntos); });
            setModal(null);
          }}>
            <label>Nombre<input name="nombre" required maxLength={60} defaultValue={banda.nombre} /></label>
            <label>Puntos de la partida<input name="puntos" type="number" min={50} step={10} inputMode="numeric" defaultValue={banda.puntos} /></label>
            <p className="hint">La facción no se puede cambiar; duplica la banda si quieres probar otra.</p>
            <div className="btns"><button type="button" className="ghost" onClick={() => setModal(null)}>Cancelar</button><button className="primary">Guardar</button></div>
          </form>
        </Modal>
      )}

      {modal === 'texto' && (
        <Modal titulo="Lista en texto" onClose={() => { setModal(null); setCopiado(''); }}>
          <textarea className="exp" readOnly value={bandaComoTexto(banda, ajustes)} />
          <div className="btns">
            <button className="primary" onClick={() => navigator.clipboard?.writeText(bandaComoTexto(banda, ajustes))
              .then(() => setCopiado('¡Copiado!')).catch(() => setCopiado('Selecciona el texto y cópialo a mano.'))}>Copiar</button>
          </div>
          {copiado && <p className="hint">{copiado}</p>}
        </Modal>
      )}

      {modal === 'borrar' && (
        <Modal titulo="¿Borrar esta banda?" onClose={() => setModal(null)}>
          <p className="hint">No se puede deshacer. Si quieres conservarla, expórtala antes a JSON.</p>
          <div className="btns"><button className="ghost" onClick={() => setModal(null)}>Cancelar</button><button className="primary danger" onClick={onBorrar}>Borrar</button></div>
        </Modal>
      )}
    </>
  );
}