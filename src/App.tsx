import { useCallback, useEffect, useState } from 'react';
import type { Banda } from './types';
import { cargar, guardar, type Estado } from './logic/almacen';
import { nuevaBanda, nuevoId } from './logic/banda';
import { Inicio } from './components/Inicio';
import { EditorBanda } from './components/EditorBanda';

export default function App() {
  const [estado, setEstado] = useState<Estado>(cargar);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => { guardar(estado); }, [estado]);

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

  const banda = estado.bandas.find(b => b.id === abierta);

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

  return (
    <Inicio
      bandas={estado.bandas}
      ajustes={estado.ajustes}
      onAbrir={setAbierta}
      onCrear={(nombre, faccion, puntos) => {
        const b = nuevaBanda(nombre, faccion, puntos);
        setEstado(e => ({ ...e, bandas: [...e.bandas, b] }));
        setAbierta(b.id);
      }}
      onImportar={bs => setEstado(e => ({ ...e, bandas: [...e.bandas, ...bs] }))}
    />
  );
}