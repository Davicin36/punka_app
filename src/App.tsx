import { useCallback, useEffect, useState } from 'react';
import type { Banda } from './types';
import type { ListaEpic } from './epic/tipos';
import { cargar, guardar, type Estado } from './logic/almacen';
import { nuevaBanda, nuevoId } from './logic/banda';
import { nuevaListaEpic } from './epic/logica';
import { Inicio } from './components/Inicio';
import { EditorBanda } from './components/EditorBanda';
import { EditorEpic } from './epic/EditorEpic';

export default function App() {
  const [estado, setEstado] = useState<Estado>(cargar);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => { guardar(estado); }, [estado]);
  // Pide al navegador que no borre los datos guardados por falta de espacio
  useEffect(() => { navigator.storage?.persist?.().catch(() => {}); }, []);

  /** Aplica un cambio a una copia de la banda (estilo "mutable" pero inmutable para React). */
  const cambiarBanda = useCallback((id: string, fn: (b: Banda) => void) => {
    setEstado(e => ({
      ...e,
      bandas: e.bandas.map(b => {
        if (b.id !== id) return b;
        const c = structuredClone(b);
        fn(c);
        c.actualizada = Date.now();
        return c;
      }),
    }));
  }, []);

  const cambiarEjercito = useCallback((id: string, fn: (l: ListaEpic) => void) => {
    setEstado(e => ({
      ...e,
      ejercitos: e.ejercitos.map(l => {
        if (l.id !== id) return l;
        const c = structuredClone(l);
        fn(c);
        c.actualizada = Date.now();
        return c;
      }),
    }));
  }, []);

  const banda = estado.bandas.find(b => b.id === abierta);
  const lista = estado.ejercitos.find(l => l.id === abierta);

  if (banda) {
    return (
      <EditorBanda
        banda={banda}
        ajustes={estado.ajustes}
        onCambiar={fn => cambiarBanda(banda.id, fn)}
        onVolver={() => setAbierta(null)}
        onBorrar={() => { setEstado(e => ({ ...e, bandas: e.bandas.filter(b => b.id !== banda.id) })); setAbierta(null); }}
        onDuplicar={() => {
          const c: Banda = { ...structuredClone(banda), id: nuevoId(), nombre: `${banda.nombre} (copia)`, actualizada: Date.now() };
          c.miniaturas.forEach(m => { m.uid = nuevoId(); });
          setEstado(e => ({ ...e, bandas: [...e.bandas, c] }));
          setAbierta(c.id);
        }}
      />
    );
  }

  if (lista) {
    return (
      <EditorEpic
        lista={lista}
        onCambiar={fn => cambiarEjercito(lista.id, fn)}
        onVolver={() => setAbierta(null)}
        onBorrar={() => { setEstado(e => ({ ...e, ejercitos: e.ejercitos.filter(l => l.id !== lista.id) })); setAbierta(null); }}
        onDuplicar={() => {
          const c: ListaEpic = { ...structuredClone(lista), id: nuevoId(), nombre: `${lista.nombre} (copia)`, actualizada: Date.now() };
          c.formaciones.forEach(f => { f.uid = nuevoId(); });
          setEstado(e => ({ ...e, ejercitos: [...e.ejercitos, c] }));
          setAbierta(c.id);
        }}
      />
    );
  }

  return (
    <Inicio
      bandas={estado.bandas}
      ejercitos={estado.ejercitos}
      ajustes={estado.ajustes}
      estado={estado}
      onAbrir={setAbierta}
      onCrear={(nombre, faccion, puntos) => {
        const b = nuevaBanda(nombre, faccion, puntos);
        setEstado(e => ({ ...e, bandas: [...e.bandas, b] }));
        setAbierta(b.id);
      }}
      onCrearEpic={(nombre, ejercito, puntos) => {
        const l = nuevaListaEpic(nombre, ejercito, puntos);
        setEstado(e => ({ ...e, ejercitos: [...e.ejercitos, l] }));
        setAbierta(l.id);
      }}
      onImportar={(bs, es) => setEstado(e => ({ ...e, bandas: [...e.bandas, ...bs], ejercitos: [...e.ejercitos, ...es] }))}
    />
  );
}
