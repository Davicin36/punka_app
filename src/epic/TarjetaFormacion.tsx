import type { EjercitoEpic, FormacionElegida } from './tipos';
import { costeFormacion, detalleFormacion, formacionDe, mejorasPermitidas, problemasFormacion } from './logica';
import { Check, FilaContador } from '../components/ui';
import Bi from './Bi';
import { gruposEleccion, totalReparto } from './eleccion';

interface Props {
  e: EjercitoEpic; fe: FormacionElegida; i: number; abierta: boolean;
  onToggle: () => void; onChange: (fn: (f: FormacionElegida) => void) => void; onDuplicar: () => void; onQuitar: () => void;
}

const fijar = (r: Record<string | number, number>, k: string | number, v: number) => { if (v > 0) r[k] = v; else delete r[k]; };

export function TarjetaFormacion({ e, fe, i, abierta, onToggle, onChange, onDuplicar, onQuitar }: Props) {
  const f = formacionDe(e, fe.formacion);
  if (!f) return null;
  const coste = costeFormacion(e, fe);
  const problemas = problemasFormacion(e, fe);
  const d = detalleFormacion(e, fe);
  const mejoras = mejorasPermitidas(e, f);
  const grupos = gruposEleccion(e, fe);
  const resumen = [d.tamano, ...d.reparto.map(r => r.texto), ...d.extras.map(x => x.length > 50 ? x.slice(0, 48) + '…' : x), ...d.mejoras].filter(Boolean);
  /** Cambia la cantidad de una opción dentro de un grupo de reparto */
  const repartir = (clave: string, unidad: string, valor: number, unico: boolean) => onChange(y => {
    const r = { ...(unico ? {} : y.reparto?.[clave] ?? {}) };
    if (valor > 0) r[unidad] = valor; else delete r[unidad];
    y.reparto = { ...(y.reparto ?? {}), [clave]: r };
  });

  return (
    <article className={`model ${abierta ? 'open' : ''} ${problemas.length ? 'bad' : ''}`}>
      <button className="mhead" onClick={onToggle}>
        <span className="idx">{i + 1}</span>
        <span className="mt">
          <b><Bi es={f.nombreEs} en={f.nombre} /></b>
          {f.max && <i className="kt">0–{f.max}</i>}
          <span className="sum"><Bi es={f.unidadesEs} en={f.unidades} /></span>
          {resumen.length > 0 && <span className="sum extra">{resumen.join(' · ')}</span>}
          {problemas.length > 0 && <span className="perr">⚠ {problemas.join(' ')}</span>}
        </span>
        <span className="mc">{coste}<small>pts</small></span>
      </button>

      {abierta && (
        <div className="mbody">
          {f.nota && <p className="hint"><Bi es={f.notaEs} en={f.nota} /></p>}

          {f.tamanos && f.tamanos.length > 1 && <>
            <h4>Tamaño</h4>
            <div className="opts">
              {f.tamanos.map((t, j) => (
                <Check key={t.nombre + j} radio grupo={`t-${fe.uid}`} nombre={<Bi es={t.nombreEs} en={t.nombre} />} coste={`${t.coste} pts`} activo={fe.tamano === j}
                  onChange={() => onChange(x => { x.tamano = j; })} />
              ))}
            </div>
          </>}

          {f.extras && f.extras.length > 0 && <>
            <h4>Extras</h4>
            <div className="opts">
              {f.extras.map((x, j) => (x.porUnidad && (x.max ?? 1) > 1)
                ? <FilaContador key={j} nombre={<Bi es={x.textoEs} en={x.texto} />} nota={`(${x.coste ? `+${x.coste} c/u` : 'gratis'}, máx. ${x.max})`} valor={fe.extras[j] ?? 0} max={x.max}
                    onChange={v => onChange(y => fijar(y.extras, j, v))} />
                : <Check key={j} nombre={<Bi es={x.textoEs} en={x.texto} />} coste={x.coste ? `+${x.coste}` : 'gratis'} activo={!!fe.extras[j]}
                    onChange={v => onChange(y => fijar(y.extras, j, v ? 1 : 0))} />)}
            </div>
          </>}

          {mejoras.length > 0 && <>
            <h4>Mejoras</h4>
            <div className="opts">
              {mejoras.map(m => {
                const n = fe.mejoras[m.nombre] ?? 0;
                const vIdx = fe.variantes[m.nombre] ?? 0;
                const v = m.variantes?.[vIdx];
                const porUnidad = v ? v.porUnidad : m.porUnidad;
                const precio = v ? v.coste : m.coste;
                const etiqueta = `${precio ? `+${precio}` : 'gratis'}${porUnidad ? ' c/u' : ''}`;
                return (
                  <div key={m.nombre} className="mejora">
                    {porUnidad
                      ? <FilaContador nombre={<Bi es={m.nombreEs} en={m.nombre} />} nota={`(${etiqueta}${m.max ? `, máx. ${m.max}` : ''})`} valor={n} max={m.max ?? 20}
                          onChange={val => onChange(y => fijar(y.mejoras, m.nombre, val))} />
                      : <Check nombre={<Bi es={m.nombreEs} en={m.nombre} />} coste={etiqueta} activo={n > 0} onChange={val => onChange(y => fijar(y.mejoras, m.nombre, val ? 1 : 0))} />}
                    {m.texto && <small className="mtexto"><Bi es={m.textoEs} en={m.texto} /></small>}
                    {m.variantes && m.variantes.length > 1 && n > 0 && (
                      <div className="chips">
                        {m.variantes.map((va, k) => (
                          <button key={k} className={`chip ${vIdx === k ? 'on' : ''}`} onClick={() => onChange(y => { y.variantes[m.nombre] = k; })}><Bi es={va.textoEs} en={va.texto} /></button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>}

          {grupos.length > 0 && <>
            <h4>Composición</h4>
            {grupos.map(g => {
              const t = totalReparto(fe, g.clave);
              const objetivo = g.min === g.max ? `${g.max}` : `${g.min}–${g.max}`;
              const ok = t >= g.min && t <= g.max;
              const unico = g.max === 1;
              return (
                <div key={g.clave} className="reparto">
                  <p className="rtit">
                    <span>{g.origen === 'Unidades' ? (g.personaje ? 'Personaje' : 'Unidades de la formación') : g.origen}</span>
                    <b className={ok ? 'ok' : 'falta'}>{unico ? (ok ? '✓' : 'elige 1') : `${t}/${objetivo}`}</b>
                  </p>
                  {unico
                    ? <div className="chips">{g.opciones.map(o => {
                        const on = (fe.reparto?.[g.clave]?.[o] ?? 0) > 0;
                        return <button key={o} className={`chip ${on ? 'on' : ''}`} onClick={() => repartir(g.clave, o, on ? 0 : 1, true)}>{o}</button>;
                      })}</div>
                    : <div className="opts">{g.opciones.map(o => {
                        const n = fe.reparto?.[g.clave]?.[o] ?? 0;
                        return <FilaContador key={o} nombre={o} valor={n} max={n + Math.max(0, g.max - t)} onChange={v => repartir(g.clave, o, v, false)} />;
                      })}</div>}
                </div>
              );
            })}
          </>}

          <div className="mfoot">
            <input className="nick" placeholder="Nota (opcional)" maxLength={80} value={fe.nota}
              onChange={ev => onChange(y => { y.nota = ev.target.value; })} />
            <button className="ghost sm" onClick={onDuplicar}>Duplicar</button>
            <button className="ghost sm danger" onClick={onQuitar}>Quitar</button>
          </div>
        </div>
      )}
    </article>
  );
}
