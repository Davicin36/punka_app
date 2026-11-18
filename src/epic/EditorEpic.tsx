import { useEffect, useState } from 'react';
import type { EjercitoEpic, FormacionElegida, FormacionEpic, ListaEpic } from './tipos';
import { cargarEjercito, nombreEjercito } from './datos';
import { comprasSueltas, costeAliados, costeLista, formacionDe, listaComoTexto, nuevaFormacion, nuevoUid, problemasLista } from './logica';
import { exportarListaEpic } from '../logic/almacen';
import { descargar, nombreArchivo } from '../logic/descargar';
import { FilaContador, Modal, Regla } from '../components/ui';
import { TarjetaFormacion } from './TarjetaFormacion';
import Bi from './Bi';
import { nom } from './texto';

interface Props {
  lista: ListaEpic;
  onCambiar: (fn: (l: ListaEpic) => void) => void; onVolver: () => void; onBorrar: () => void; onDuplicar: () => void;
}
type ModalAbierto = null | 'anadir' | 'editar' | 'texto' | 'borrar';

const TIPO: Record<string, string> = {
  nucleo: 'Principal', apoyo: 'Apoyo', tercio: 'Aliados / aeronaves / titanes', individuos: 'Individuos (0–1 cada uno)',
};

export function EditorEpic({ lista, onCambiar, onVolver, onBorrar, onDuplicar }: Props) {
  const [e, setE] = useState<EjercitoEpic | null>(null);
  const [error, setError] = useState('');
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [copiado, setCopiado] = useState('');
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarEjercito(lista.ejercito).then(x => vivo && setE(x)).catch(err => vivo && setError(String(err)));
    return () => { vivo = false; };
  }, [lista.ejercito]);

  if (!e) {
    return (
      <main className="wrap">
        <button className="ghost" onClick={onVolver}>‹ Volver</button>
        <p className="empty">{error || `Cargando ${nombreEjercito(lista.ejercito)}…`}</p>
      </main>
    );
  }

  const pts = costeLista(e, lista), quedan = lista.puntos - pts;
  const problemas = problemasLista(e, lista);
  const maxAliados = e.fraccionAliados ? Math.floor(lista.puntos * e.fraccionAliados) : null;
  const aliados = costeAliados(e, lista);

  const cambiarF = (uid: string, fn: (f: FormacionElegida) => void) =>
    onCambiar(l => { const f = l.formaciones.find(x => x.uid === uid); if (f) fn(f); });

  const anadir = (f: FormacionEpic) => {
    const nf = nuevaFormacion(f);
    onCambiar(l => { l.formaciones.push(nf); });
    setAbiertas({ [nf.uid]: true });
    setModal(null);
    requestAnimationFrame(() => document.getElementById(`f-${nf.uid}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };

  const exportarPdf = async () => {
    setGenerando(true);
    try {
      const { descargarPdfEpic } = await import('./pdf');
      descargarPdfEpic(e, lista);
    } finally {
      setGenerando(false);
    }
  };

  const seccionesFormacion = e.secciones.filter(s => s.tipo !== 'mejoras' && s.tipo !== 'compras');
  const usos = (id: string) => lista.formaciones.filter(f => f.formacion === id).length;

  return (
    <>
      <header className="top sticky">
        <div className="bar">
          <button className="back" onClick={onVolver} aria-label="Volver">‹</button>
          <div className="ttl"><b>{lista.nombre}</b><span className="fac f-epic">{e.nombreEs ?? e.nombre}</span></div>
          <button className="ghost sm" onClick={() => setModal('editar')}>Editar</button>
        </div>
        <div className={`meter ${pts > lista.puntos ? 'over' : ''}`}><div style={{ width: `${Math.min(100, (pts / lista.puntos) * 100)}%` }} /></div>
        <div className="nums">
          <span><b>{pts}</b>/{lista.puntos} pts</span>
          <span>Quedan <b className={quedan < 0 ? 'red' : ''}>{quedan}</b></span>
          {maxAliados !== null && <span>Aliados <b className={aliados > maxAliados ? 'red' : ''}>{aliados}</b>/{maxAliados}</span>}
        </div>
      </header>

      <main className="wrap">
        {problemas.length > 0
          ? <div className="issues"><b>⚠ Revisa el ejército</b><ul>{problemas.map(p => <li key={p}>{p}</li>)}</ul></div>
          : lista.formaciones.length > 0 && <div className="okbox">✔ Ejército válido</div>}

        <div className="ejinfo">
          <span><small>Factor de estrategia</small><b>{e.estrategia ?? '–'}</b></span>
          <span><small>Iniciativa</small>{e.iniciativaEs ?? e.iniciativa}</span>
        </div>

        <details className="rules">
          <summary>Notas de la lista de <Bi es={e.nombreEs} en={e.nombre} /></summary>
          <p className="hint">Lista NetEA versión {e.version}</p>
          <ul>{e.secciones.filter(s => s.nota).map(s => <li key={s.id}><b><Bi es={s.nombreEs} en={s.nombre} />:</b> <Bi es={s.notaEs} en={s.nota} /></li>)}</ul>
        </details>

        {(e.reglas?.length ?? 0) > 0 && (
          <details className="rules">
            <summary>Reglas especiales del ejército</summary>
            <p className="hint">Del reglamento NetEA (Edición Deluxe en castellano). Pulsa una regla para leerla.</p>
            {e.reglas!.map(r => (
              <Regla key={r.id} nombre={r.titulo} nota={r.id}>
                {r.parrafos.map((p, k) => <p key={k} className={/^(P|R):/.test(p) ? 'faq' : p === 'FAQ' ? 'faqt' : ''}>{p}</p>)}
              </Regla>
            ))}
          </details>
        )}

        {lista.formaciones.length === 0 && <p className="empty">Añade tu primera formación.</p>}
        {seccionesFormacion.map(s => {
          const fs = lista.formaciones.map((fe, i) => ({ fe, i })).filter(({ fe }) => formacionDe(e, fe.formacion)?.seccion === s.id);
          if (!fs.length) return null;
          return (
            <section key={s.id} className="seccion-epic">
              <h2 className="sec"><Bi es={s.nombreEs} en={s.nombre} /> <small>{TIPO[s.tipo] ?? ''}</small></h2>
              <div className="models">
                {fs.map(({ fe, i }) => (
                  <div id={`f-${fe.uid}`} key={fe.uid}>
                    <TarjetaFormacion e={e} fe={fe} i={i} abierta={!!abiertas[fe.uid]}
                      onToggle={() => setAbiertas(a => ({ ...a, [fe.uid]: !a[fe.uid] }))}
                      onChange={fn => cambiarF(fe.uid, fn)}
                      onDuplicar={() => onCambiar(l => { const c = { ...structuredClone(fe), uid: nuevoUid() }; l.formaciones.splice(i + 1, 0, c); })}
                      onQuitar={() => onCambiar(l => { l.formaciones = l.formaciones.filter(x => x.uid !== fe.uid); })} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <button className="big" onClick={() => setModal('anadir')}>+ Añadir formación</button>

        {comprasSueltas(e).length > 0 && (
          <section className="bandx">
            <h4>Compras del ejército</h4>
            <div className="opts">
              {comprasSueltas(e).map(c => (
                <FilaContador key={c.id} nombre={<Bi es={c.nombreEs} en={c.nombre} />} nota={`(${c.costeTexto || `+${c.coste}`}${c.texto ? ' · ' + (c.textoEs ?? c.texto) : ''} · ${nom(e.secciones.find(s => s.id === c.seccion) ?? { nombre: '' })})`}
                  valor={lista.compras[c.id] ?? 0} max={20}
                  onChange={v => onCambiar(l => { if (v > 0) l.compras[c.id] = v; else delete l.compras[c.id]; })} />
              ))}
            </div>
          </section>
        )}

        <div className="actions">
          <button className="ghost" onClick={() => setModal('texto')}>Ver como texto</button>
          <button className="ghost" onClick={exportarPdf} disabled={generando}>{generando ? 'Generando…' : 'Exportar PDF'}</button>
          <button className="ghost" onClick={() => descargar(`${nombreArchivo(lista.nombre)}.json`, exportarListaEpic(lista))}>Exportar JSON</button>
          <button className="ghost" onClick={onDuplicar}>Duplicar</button>
          <button className="ghost danger" onClick={() => setModal('borrar')}>Borrar</button>
        </div>
      </main>

      {modal === 'anadir' && (
        <Modal titulo="Añadir formación" alto onClose={() => setModal(null)}>
          <p className="hint">Te quedan {quedan} puntos{maxAliados !== null ? ` · aliados ${aliados}/${maxAliados}` : ''}.</p>
          {seccionesFormacion.map(s => {
            const fs = e.formaciones.filter(f => f.seccion === s.id);
            if (!fs.length) return null;
            return (
              <section key={s.id}>
                <h4><Bi es={s.nombreEs} en={s.nombre} /> <small>{TIPO[s.tipo] ?? ''}</small></h4>
                {s.nota && <p className="hint"><Bi es={s.notaEs} en={s.nota} /></p>}
                <div className="picks">
                  {fs.map(f => {
                    const agotada = !!f.max && usos(f.id) >= f.max;
                    const precio = f.tamanos?.length ? f.tamanos.map(t => t.coste).join(' / ') : f.coste;
                    return (
                      <button key={f.id} className={`pick ${agotada || f.coste > quedan ? 'dim' : ''}`} onClick={() => anadir(f)}>
                        <span className="pn"><b><Bi es={f.nombreEs} en={f.nombre} />{f.max ? ` (0–${f.max})` : ''}</b><em>{precio} pts</em></span>
                        <span className="sum"><Bi n es={f.unidadesEs} en={f.unidades} /></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </Modal>
      )}

      {modal === 'editar' && (
        <Modal titulo="Editar ejército" onClose={() => setModal(null)}>
          <form onSubmit={ev => {
            ev.preventDefault();
            const fd = new FormData(ev.currentTarget);
            onCambiar(l => { l.nombre = String(fd.get('nombre')).trim() || l.nombre; l.puntos = Math.max(250, Number(fd.get('puntos')) || l.puntos); });
            setModal(null);
          }}>
            <label>Nombre<input name="nombre" required maxLength={60} defaultValue={lista.nombre} /></label>
            <label>Puntos de la partida<input name="puntos" type="number" min={250} step={25} inputMode="numeric" defaultValue={lista.puntos} /></label>
            <p className="hint">El ejército no se puede cambiar; duplica la lista si quieres probar otro.</p>
            <div className="btns"><button type="button" className="ghost" onClick={() => setModal(null)}>Cancelar</button><button className="primary">Guardar</button></div>
          </form>
        </Modal>
      )}

      {modal === 'texto' && (
        <Modal titulo="Lista en texto" onClose={() => { setModal(null); setCopiado(''); }}>
          <textarea className="exp" readOnly value={listaComoTexto(e, lista)} />
          <div className="btns">
            <button className="primary" onClick={() => navigator.clipboard?.writeText(listaComoTexto(e, lista))
              .then(() => setCopiado('¡Copiado!')).catch(() => setCopiado('Selecciona el texto y cópialo a mano.'))}>Copiar</button>
          </div>
          {copiado && <p className="hint">{copiado}</p>}
        </Modal>
      )}

      {modal === 'borrar' && (
        <Modal titulo="¿Borrar este ejército?" onClose={() => setModal(null)}>
          <p className="hint">No se puede deshacer. Si quieres conservarlo, expórtalo antes a JSON.</p>
          <div className="btns"><button className="ghost" onClick={() => setModal(null)}>Cancelar</button><button className="primary danger" onClick={onBorrar}>Borrar</button></div>
        </Modal>
      )}
    </>
  );
}
