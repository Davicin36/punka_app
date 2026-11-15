# Bandas del Páramo · Constructor de listas para Punkapocalyptic

App web (React + TypeScript + Vite) para crear y validar listas de banda a partir del libro de bandas.
No usa base de datos: **toda la información del libro está en archivos JSON** y las bandas que creas se guardan
en el navegador (localStorage), con exportación/importación a JSON.

## Arrancar

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # genera dist/ (estático, se puede subir a Render como Static Site)
```

## Estructura

```
src/
  data/
    comun.json              # atributos, coste de la bala, mutaciones (con sus modificadores), artículos de coña…
    equipo.json             # catálogo de armas y blindajes con su perfil (Comb., Fue., Pen., Distancia, reglas)
    facciones/*.json        # una facción por archivo (+ mercenarios.json)
    index.ts                # carga y tipa los JSON; añade aquí una facción nueva
  logic/
    banda.ts                # costes, conteo de miniaturas y validación de restricciones
    perfil.ts               # atributos con modificadores ("4 (6)"), blindaje y perfiles de armas
    pdf.ts                  # hoja de control de banda en PDF
    almacen.ts              # localStorage + exportar/importar JSON
  components/               # Inicio, EditorBanda, TarjetaMiniatura, ui
  types.ts                  # tipos de los JSON y de las bandas del usuario
```

## Formato de una facción (`src/data/facciones/<id>.json`)

| Campo | Qué es |
|---|---|
| `equipoGenerico` | Equipo que puede comprar cualquier tropa de la facción (p. ej. Protección contra la contaminación). |
| `equipoFaccion` | Equipo especial de la facción (balas apañadas, mira telescópica…). `porUnidad: true` = se compra por unidades. |
| `extrasBanda` | Compras a nivel de banda (cañón lanzador, coche de Pachachos). |
| `restricciones` | Texto de las restricciones, tal cual se muestra. |
| `limites` | Las restricciones en forma de datos, que es lo que valida la app (ver abajo). |
| `unidades` | Las tropas, personalidades o personajes. |

Cada unidad: `id`, `nombre`, `coste`, `tipo` (`tropa` / `personalidad` / `mercenario` / `personaje`), `perfil`
(los 7 atributos), `armas` (`min`, `max`, `opciones`) **o** `armasFijas`, `blindaje` (`base` + `opciones` que lo sustituyen),
`equipo` (`incluido`, `opciones`), `reglasEspeciales` (solo los nombres) y extras opcionales:
`mutaciones`, `articulosDeCona`, `fieras`, `grupo` (Pochos), `cuentaComo`, `armaIncrustada`, `opcionesExtra`,
`sinEquipoGenerico`, `noPuedeUnirseA`, `nota`.

### Tipos de `limites`

| `tipo` | Ejemplo |
|---|---|
| `maxTipo` | Máx. 1 Personalidad o Mercenario |
| `maxUnidad` | Máx. 1 Mariscal (tiene en cuenta `cuentaComo`, p. ej. Lord Homoeroticus = Jefe) |
| `noMasQueResto` | No más Dinamos que el resto de la banda |
| `porPuntos` | 1 Cosechador por cada fracción de 200 pts |
| `porUnidad` | 2 grupos de Pochos por Cabezón |
| `sumaNoMasQue` | Domadores + Forzudos + Acróbatas ≤ Pachachos |
| `repeticionMutacion` / `repeticionArticulo` | Máx. 3 repeticiones en la banda |
| `unicos` / `excluyentes` | Banda del Cómic |

## Notas

## Perfil con modificadores

Como en el libro, los atributos se muestran como `base (modificado)`:
- Combate y Fuerza: el mejor modificador de las armas cuerpo a cuerpo equipadas.
- Agilidad: −1 si lleva algo con *Armatoste* (salvo el Forzudo).
- Precisión: −1 si lleva un arma *Difícil de usar*.
- Mutaciones: Cachas, Miembros extra, Resistente, Sentidos aguzados, Capacitado; Piel dura fija el Blindaje.
- En las fuerzas que dependen del lanzador (`L` en `equipo.json`) se usa la Fuerza de la miniatura.

Validaciones del reglamento: un solo objeto *A dos manos*, un solo *Armatoste*, escudo incompatible con *A dos manos*,
máximo 3 bombas/arpones/tomahawks por miniatura y cada arma *Escasa* en un máximo de 3 miniaturas de la banda.

## Notas

- Coste de la bala: 15 puntos (`comun.json`, sección Equipo del reglamento).
- Los JSON se extrajeron automáticamente del PDF y se revisaron; si ves un coste raro, corrígelo directamente en el JSON.