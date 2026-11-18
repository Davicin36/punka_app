import type { Ajustes, Banda, Miniatura } from '../types';
import { COMUN, blindajePorNombre, faccionPorId, unidadPorId } from '../data';
import { costeMiniatura, equipoFaccionDisponible, equipoGenericoDisponible, problemasMiniatura } from '../logic/banda';
import { armasDeMiniatura, blindajeEfectivo, llevaArmaDeFuego, perfilEfectivo, perfilesArmaTexto } from '../logic/perfil';
import { Check, FilaContador, Regla } from './ui';
import { textoReglaUnidad } from '../logic/reglas';

const TIPO: Record<string, string> = { personalidad: 'Personalidad', mercenario: 'Mercenario', personaje: 'Personaje' };

interface Props {
  m: Miniatura; i: number; banda: Banda; ajustes: Ajustes; abierta: boolean;
  onToggle: () => void; onChange: (fn: (m: Miniatura) => void) => void; onDuplicar: () => void; onQuitar: () => void;
}

const marcar = (r: Record<string, number>, k: string, v: number) => { if (v > 0) r[k] = v; else delete r[k]; };
const elegidas = (r: Record<string, number>) => Object.entries(r).filter(([, q]) => q > 0).map(([n, q]) => (q > 1 ? `${n} ×${q}` : n));
const alternar = (arr: string[], k: string) => { const i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); else arr.push(k); };

/** Atributos con modificadores: valor final grande y el base pequeño debajo, como "4 (6)" en el libro. */
function PerfilMiniatura({ m }: { m: Miniatura }) {
  const p = perfilEfectivo(m);
  if (!p) return null;
  const bl = blindajeEfectivo(m);
  return (
    <div className="stats stats8">
      {COMUN.atributos.map(a => {
        const v = p[a.clave];
        return (
          <div key={a.clave} title={v.cambia ? `${a.nombre}: ${v.base} sin modificar` : a.nombre} className={v.cambia ? 'mod' : ''}>
            <span>{a.abreviatura}</span><b>{v.valor}</b>{v.cambia && <i>{v.base}</i>}
          </div>
        );
      })}
      <div className="bli" title={bl.nota ? `Blindaje · ${bl.nota}` : 'Blindaje'}><span>Bli</span><b>{bl.valor}</b>{bl.nota && <i>*</i>}</div>
      {bl.nota && <p className="blinota">* Blindaje: {bl.nota}</p>}
    </div>
  );
}

/** Tabla de perfiles de las armas equipadas (Comb., Fue., Pen., Distancia). */
function TablaArmas({ m }: { m: Miniatura }) {
  const armas = armasDeMiniatura(m);
  if (!armas.length) return null;
  return (
    <table className="armas">
      <thead><tr><th>Arma</th><th>Com</th><th>Fue</th><th>Pen</th><th>Dist.</th></tr></thead>
      <tbody>
        {armas.flatMap(a => {
          if (!a.arma) return [<tr key={a.nombre}><td colSpan={5}>{a.nombre} <small>(ver reglas de la miniatura)</small></td></tr>];
          const perfiles = perfilesArmaTexto(a.arma, m);
          return perfiles.map((p, j) => (
            <tr key={a.nombre + j}>
              <td>
                {j === 0 && <b>{a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}</b>}
                {perfiles.length > 1 && <small> {p.modo === 'Distancia' ? 'a distancia' : 'cuerpo a cuerpo'}</small>}
                {j === perfiles.length - 1 && a.arma!.reglas.length > 0 && <small className="reg">{a.arma!.reglas.join(', ')}</small>}
              </td>
              <td>{p.combate}</td><td>{p.fuerza}</td><td>{p.penetracion}</td><td>{p.distancia}</td>
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
}

export function TarjetaMiniatura({ m, i, banda, ajustes, abierta, onToggle, onChange, onDuplicar, onQuitar }: Props) {
  const u = unidadPorId[m.unidad];
  const f = faccionPorId[banda.faccion];
  const coste = costeMiniatura(m, banda, ajustes);
  const problemas = problemasMiniatura(m);
  const gen = equipoGenericoDisponible(u, banda);
  const fac = equipoFaccionDisponible(u, banda);
  const reliquias = u.reliquias ? f.reliquias ?? [] : [];
  const usadas = new Set(banda.miniaturas.filter(x => x.uid !== m.uid).flatMap(x => x.reliquias ?? []));
  const mostrarBalas = llevaArmaDeFuego(m) || !u.armas || m.balas > 0;

  const resumen = [
    ...(u.armas ? elegidas(m.armas) : u.armasFijas ? [u.armasFijas] : []),
    m.blindaje >= 0 ? u.blindaje.opciones[m.blindaje].nombre : u.blindaje.base !== 'Ninguno' ? u.blindaje.base : '',
    ...elegidas(m.equipo), ...elegidas(m.equipoGenerico), ...elegidas(m.equipoFaccion), ...elegidas(m.extras),
    ...m.mutaciones, ...m.articulos, ...(m.reliquias ?? []),
    m.fieras ? `${m.fieras} fiera${m.fieras > 1 ? 's' : ''}` : '',
    m.armasIncrustadas ? `${m.armasIncrustadas} incrustada${m.armasIncrustadas > 1 ? 's' : ''}` : '',
    m.balas ? `${m.balas} bala${m.balas > 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const reglaArmas = u.armas
    ? u.armas.min === 1 && u.armas.max === 2 ? 'mín. 1, máx. 2 (nunca dos A dos manos)'
      : u.armas.max === 1 ? (u.armas.min ? 'elige una' : 'opcional, máx. una') : ''
    : '';
  const poolMut = u.mutaciones?.permitidas ? COMUN.mutaciones.filter(x => u.mutaciones!.permitidas!.includes(x.nombre)) : COMUN.mutaciones;
  const bli = (n: string) => (blindajePorNombre[n] ? ` (Bli. ${blindajePorNombre[n].blindaje})` : '');

  return (
    <article className={`model ${abierta ? 'open' : ''} ${problemas.length ? 'bad' : ''}`}>
      <button className="mhead" onClick={onToggle}>
        <span className="idx">{i + 1}</span>
        <span className="mt">
          <b>{m.apodo || u.nombre}{u.grupo ? ` ×${m.grupo}` : ''}</b>
          {m.apodo && <small>{u.nombre}</small>}
          {TIPO[u.tipo] && <i className={`kt k-${u.tipo}`}>{TIPO[u.tipo]}</i>}
          <span className="sum">{resumen.length ? resumen.join(' · ') : <i>Sin equipar</i>}</span>
          {problemas.length > 0 && <span className="perr">⚠ {problemas.join(' ')}</span>}
        </span>
        <span className="mc">{coste}<small>pts</small></span>
      </button>

      {abierta && (
        <div className="mbody">
          <PerfilMiniatura m={m} />
          <TablaArmas m={m} />

          <h4>Armas {reglaArmas && <small>{reglaArmas}</small>}</h4>
          {u.armas ? (
            <div className="opts">
              {u.armas.opciones.map(o => o.porUnidad
                ? <FilaContador key={o.nombre} nombre={o.nombre} nota={`(${o.coste} c/u, máx. 3)`} valor={m.armas[o.nombre] ?? 0} max={3}
                    onChange={v => onChange(x => marcar(x.armas, o.nombre, v))} />
                : <Check key={o.nombre} nombre={o.nombre} coste={`${o.coste} pts`} activo={!!m.armas[o.nombre]}
                    onChange={v => onChange(x => marcar(x.armas, o.nombre, v ? 1 : 0))} />)}
            </div>
          ) : <p className="fixed">{u.armasFijas ?? 'Ninguna'}</p>}

          <h4>Blindaje</h4>
          {u.blindaje.opciones.length ? (
            <div className="opts">
              <Check radio grupo={`bl-${m.uid}`} nombre={u.blindaje.base + bli(u.blindaje.base)} coste="incl." activo={m.blindaje < 0} onChange={() => onChange(x => { x.blindaje = -1; })} />
              {u.blindaje.opciones.map((o, j) => (
                <Check key={o.nombre} radio grupo={`bl-${m.uid}`} nombre={o.nombre + bli(o.nombre)} coste={`+${o.coste} pts`} activo={m.blindaje === j}
                  onChange={() => onChange(x => { x.blindaje = j; })} />
              ))}
            </div>
          ) : <p className="fixed">{u.blindaje.base + bli(u.blindaje.base)}</p>}

          {u.equipo?.incluido && <><h4>Equipo incluido</h4><p className="fixed">{u.equipo.incluido}</p></>}

          {(u.equipo?.opciones?.length || gen.length || fac.length || u.opcionesExtra?.length || u.armaIncrustada || mostrarBalas) ? <h4>Equipo</h4> : null}
          <div className="opts">
            {u.equipo?.opciones?.map(o => <Check key={o.nombre} nombre={o.nombre} coste={`${o.coste} pts`} activo={!!m.equipo[o.nombre]}
              onChange={v => onChange(x => marcar(x.equipo, o.nombre, v ? 1 : 0))} />)}
            {gen.map(o => <Check key={o.nombre} nombre={o.nombre} coste={`${o.coste} pts`} activo={!!m.equipoGenerico[o.nombre]}
              onChange={v => onChange(x => marcar(x.equipoGenerico, o.nombre, v ? 1 : 0))} />)}
            {u.opcionesExtra?.map(o => <Check key={o.nombre} nombre={o.nombre} coste={`${o.coste} pts`} activo={!!m.extras[o.nombre]}
              onChange={v => onChange(x => marcar(x.extras, o.nombre, v ? 1 : 0))} />)}
            {fac.map(o => o.porUnidad
              ? <FilaContador key={o.nombre} nombre={o.nombre} nota={`(${o.coste} c/u${o.nota ? ' · ' + o.nota : ''})`} valor={m.equipoFaccion[o.nombre] ?? 0} max={20}
                  onChange={v => onChange(x => marcar(x.equipoFaccion, o.nombre, v))} />
              : <Check key={o.nombre} nombre={o.nombre} nota={o.nota} coste={`${o.coste} pts`} activo={!!m.equipoFaccion[o.nombre]}
                  onChange={v => onChange(x => marcar(x.equipoFaccion, o.nombre, v ? 1 : 0))} />)}
            {u.armaIncrustada && <FilaContador nombre="Arma incrustada" nota={`(+${u.armaIncrustada.coste} por hoz o filo)`} valor={m.armasIncrustadas} max={2}
              onChange={v => onChange(x => { x.armasIncrustadas = v; })} />}
            {mostrarBalas && <FilaContador nombre="Balas" nota={`(${ajustes.costeBala} c/u)`} valor={m.balas} max={30}
              onChange={v => onChange(x => { x.balas = v; })} />}
          </div>

          {reliquias.length > 0 && <>
            <h4>Reliquias abisales <small>máx. {u.reliquias} · cada una solo una vez en la banda</small></h4>
            <div className="chips">{reliquias.map(o => {
              const on = (m.reliquias ?? []).includes(o.nombre);
              return (
                <button key={o.nombre} className={`chip ${on ? 'on' : ''}`} disabled={!on && usadas.has(o.nombre)}
                  onClick={() => onChange(x => { x.reliquias = x.reliquias ?? []; alternar(x.reliquias, o.nombre); })}>{o.nombre} <small>{o.coste}</small></button>
              );
            })}</div>
          </>}

          {u.grupo && <>
            <h4>Tamaño del grupo</h4>
            <div className="opts"><FilaContador nombre="Pochos en el grupo" nota={`(${u.coste} c/u · cuenta como 1 miniatura)`} valor={m.grupo}
              min={u.grupo.min} max={u.grupo.max} onChange={v => onChange(x => { x.grupo = v; })} /></div>
          </>}

          {u.fieras && <>
            <h4>Fieras</h4>
            <div className="opts"><FilaContador nombre="Fieras" nota={`(+${u.fieras.coste} c/u · cuentan como miniaturas)`} valor={m.fieras}
              max={u.fieras.max} onChange={v => onChange(x => { x.fieras = v; })} /></div>
          </>}

          {u.mutaciones && <>
            <h4>Mutaciones <small>{u.mutaciones.min ? `mín. ${u.mutaciones.min}, ` : ''}máx. {u.mutaciones.max}</small></h4>
            <div className="chips">{poolMut.map(o => (
              <button key={o.nombre} className={`chip ${m.mutaciones.includes(o.nombre) ? 'on' : ''}`}
                onClick={() => onChange(x => alternar(x.mutaciones, o.nombre))}>{o.nombre} <small>{o.coste}</small></button>
            ))}</div>
          </>}

          {u.articulosDeCona && <>
            <h4>Artículos de coña <small>máx. {u.articulosDeCona}</small></h4>
            <div className="chips">{COMUN.articulosDeCona.map(o => (
              <button key={o.nombre} className={`chip ${m.articulos.includes(o.nombre) ? 'on' : ''}`}
                onClick={() => onChange(x => alternar(x.articulos, o.nombre))}>{o.nombre} <small>{o.coste}</small></button>
            ))}</div>
          </>}

          {u.reglasEspeciales.length > 0 && <>
            <h4>Reglas especiales</h4>
            <p className="hint">Pulsa una regla para leerla.</p>
            <div className="reglas">{u.reglasEspeciales.map(r => {
              const t = textoReglaUnidad(u, r);
              return t ? <Regla key={r} nombre={r}><p>{t}</p></Regla> : <span key={r} className="tag">{r}</span>;
            })}</div>
          </>}
          {u.nota && <p className="hint">{u.nota}</p>}

          <div className="mfoot">
            <input className="nick" placeholder="Apodo (opcional)" maxLength={40} value={m.apodo}
              onChange={e => onChange(x => { x.apodo = e.target.value; })} />
            <button className="ghost sm" onClick={onDuplicar}>Duplicar</button>
            <button className="ghost sm danger" onClick={onQuitar}>Quitar</button>
          </div>
        </div>
      )}
    </article>
  );
}
