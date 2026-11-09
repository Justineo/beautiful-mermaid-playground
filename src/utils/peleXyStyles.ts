const SVG_NS = "http://www.w3.org/2000/svg";
const SERIES_COLOR = "--playground-pele-series-color";

const PELE_XY_STYLES = `
  .pele-xychart .pele-grid {
    stroke: color-mix(in srgb, var(--pele-fg) 10%, var(--pele-bg));
    stroke-dasharray: 1 7;
    stroke-linecap: round;
  }
  .pele-xychart .pele-axis {
    stroke: var(--pele-border);
  }
  .pele-xychart .pele-bars > rect, .playground-pele-bar-key {
    fill: color-mix(in srgb, var(--pele-bg) 75%, var(${SERIES_COLOR}));
    stroke: var(${SERIES_COLOR});
    stroke-width: 1;
    rx: 5px;
  }
  .playground-pele-bar-key { rx: 2px; }
  .pele-xychart .pele-line > path { stroke-width: 2.5px; }
  .playground-pele-line-key {
    stroke: var(${SERIES_COLOR});
    stroke-width: 2;
    stroke-linecap: round;
  }
  .playground-pele-legend { fill: var(--pele-muted); font-size: 14px; }
`;

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  svg: SVGSVGElement,
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const element = svg.ownerDocument.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

export function stylePeleXyChart(svg: SVGSVGElement): string {
  if (!svg.classList.contains("pele-xychart")) {
    return "";
  }

  let bar = 0;
  let line = 0;
  const entries = [];
  for (const series of svg.querySelectorAll<SVGGElement>(".pele-plot > .pele-series")) {
    const color = series.getAttribute("fill");
    if (!color) {
      continue;
    }
    const isBar = series.classList.contains("pele-bars");
    series.style.setProperty(SERIES_COLOR, color);
    entries.push({ color, isBar, label: isBar ? `Bar ${++bar}` : `Line ${++line}` });
  }

  if (entries.length < 2) {
    return PELE_XY_STYLES;
  }

  const { x, y, width, height } = svg.viewBox.baseVal;
  const title = svg.querySelector(":scope > .pele-title");
  const titleBaseline = Number(
    title?.lastElementChild?.getAttribute("y") ?? title?.getAttribute("y"),
  );
  const legendTop = titleBaseline > y ? titleBaseline + 13 : y + 10;
  const itemWidth = 78;
  const columns = Math.min(entries.length, Math.max(1, Math.floor((width - 16) / itemWidth)));
  const rowHeight = 22;
  const bandHeight = Math.ceil(entries.length / columns) * rowHeight + 6;
  const legend = createSvgElement(svg, "g", {
    class: "playground-pele-legend",
    transform: `translate(0,${legendTop})`,
  });

  entries.forEach(({ color, isBar, label }, index) => {
    const row = Math.floor(index / columns);
    const rowSize = Math.min(columns, entries.length - row * columns);
    const left = x + (width - rowSize * itemWidth) / 2 + (index % columns) * itemWidth;
    const item = createSvgElement(svg, "g", { transform: `translate(${left},${row * rowHeight})` });
    item.style.setProperty(SERIES_COLOR, color);
    item.append(
      isBar
        ? createSvgElement(svg, "rect", {
            class: "playground-pele-bar-key",
            x: 0,
            y: 3,
            width: 13,
            height: 12,
          })
        : createSvgElement(svg, "line", {
            class: "playground-pele-line-key",
            x1: 0,
            x2: 13,
            y1: 9,
            y2: 9,
          }),
    );
    const text = createSvgElement(svg, "text", { x: 19, y: 14 });
    text.textContent = label;
    item.append(text);
    legend.append(item);
  });

  // Reserve a band for the legend without changing the plot's data scale.
  const plot = createSvgElement(svg, "g", { transform: `translate(0,${bandHeight})` });
  for (const element of Array.from(svg.children)) {
    if (element !== title && !["title", "desc", "defs", "style"].includes(element.localName)) {
      plot.append(element);
    }
  }
  svg.append(plot, legend);
  svg.setAttribute("viewBox", `${x} ${y} ${width} ${height + bandHeight}`);
  svg.setAttribute("height", String(height + bandHeight));
  return PELE_XY_STYLES;
}
