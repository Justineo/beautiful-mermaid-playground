# Beautiful Mermaid Playground

A minimal live playground for Mermaid diagrams, built with Vue 3.6 + Vite 8.

## Run

```bash
pnpm install
pnpm dev
```

## Scripts

```bash
pnpm lint
pnpm type-check
pnpm build
pnpm preview
```

## Build notes

- Theme tokens are generated before `dev`, `type-check`, and `build` via
  `scripts/generate-beautiful-themes.ts`.
- Vite chunk warnings are tuned to `1500kB` because Monaco and diagram runtime
  are intentionally split into dedicated async chunks.

## Renderer compatibility

Beautiful Mermaid is the default SVG renderer and handles ASCII and Unicode
output. The two `SVG` tabs in Preview use the Luki Labs and Pele logos, with
tooltips that name each renderer. Both use the same theme settings. Pele applies
the Playground's element colors, chart accents, node and edge styles, and
subgraph presets to its SVG. It also adds the multi-series XY legend, rounded
bar styling, and dotted grid. These styles are included in SVG and PNG exports.

The Example menu includes the [Pele gallery](https://pele.run/examples),
grouped by topic, with the diagram type in each example's name. Unsupported
examples have a strikethrough and a short tooltip. If Beautiful Mermaid cannot
render a diagram that Pele can render, the preview suggests switching to Pele.

In Pele SVG mode, a strikethrough marks settings that do not apply to the
current diagram, including the tab label when all its settings are inactive.
These settings stay editable and take effect when the diagram or renderer
supports them.

Fonts includes a base font weight and size for Pele SVG. The size defaults to
13 px, matching Beautiful Mermaid's flowchart node labels. Both settings
affect layout, preview, and exports. Explicitly styled labels retain their
own weight.

| Area | Remaining difference in Pele 1.13.0 |
| --- | --- |
| Layout | Node positions, edge routes, label wrapping, and diagram dimensions can differ with identical settings. For example, a subgraph's `direction LR` can be overridden by the top-level direction when an edge connects to a node inside it. |
| Layout controls | Node gap and Layer gap use Pele's node and rank spacing for flowcharts, state, class, and ER diagrams. The routing preset applies to flowcharts with edges. Direction override requires a supported flowchart or state diagram header. There is no equivalent Component gap setting. Mermaid configuration in the source can override the layout defaults. |
| SVG styles | Controls style the corresponding elements when the diagram has them. The faint text role applies to axis ticks, ER keys and sequence frame captions, for example. Corner presets round rectangular shapes; custom paths and non-rectangular shapes keep their native geometry. Subgraph headers and edge label backgrounds use Pele's layout measurements. |
| XY charts | Series colors follow the theme accent unless the source supplies a palette. The Playground styles the grid and adds a legend without changing Pele's scale, ticks, baseline, or data geometry. |
| ER syntax | Quote reserved words in relationship labels, e.g. `A \|\|--\|\| B : "one-to-one"`. The Playground does not rewrite Mermaid source. |
| Text output | Pele only produces SVG. ASCII and Unicode continue to use Beautiful Mermaid, including when Pele is selected for SVG. |

## Acknowledgements

- [Mermaid](https://github.com/mermaid-js/mermaid)
- [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid)
- [Pele](https://pele.run/)
