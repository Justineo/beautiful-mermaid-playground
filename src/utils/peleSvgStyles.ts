import { PELE_FONT_SIZE } from "@/types/playground";
import type {
  BeautifulRenderConfig,
  ElementColorRole,
  PeleSvgControl,
  ThemeToken,
} from "@/types/playground";
import { stylePeleXyChart } from "@/utils/peleXyStyles";
import {
  BORDER_DASH,
  BORDER_WIDTH_MULTIPLIER,
  CORNER_RADIUS_SET,
  EDGE_DASH,
  EDGE_LABEL_FONT_SIZE,
  EDGE_WIDTH_MULTIPLIER,
  subgraphPresetRules,
} from "@/utils/svgRenderStyles";

export type PeleElementColors = Partial<Record<ElementColorRole, string>>;
export type PeleSvgConfig = Pick<
  BeautifulRenderConfig,
  | "borderPattern"
  | "borderWeight"
  | "cornerStyle"
  | "edgeLabelStyle"
  | "edgePattern"
  | "edgeWeight"
  | "lineGeometry"
  | "peleFontSize"
  | "subgraphStyle"
  | "transparent"
>;

const SVG_NS = "http://www.w3.org/2000/svg";
const EDGE = ".pele-edge > :is(path, line, polyline):not(.pele-marker), .pele-lifeline";
const BORDER =
  '.pele-node > :is(rect, path, circle, ellipse, polygon, polyline)[stroke]:not([stroke="none"], .pele-divider, .pele-er-divider), .pele-activation, .pele-cluster > rect';
const SUBGRAPH = {
  group: ".pele-cluster",
  body: ".pele-cluster > rect",
  header: ".playground-pele-cluster-header",
  label: ".pele-cluster-label",
};
const EDGE_LABEL = ".pele-edge-label > text, text.pele-edge-label";
const EDGE_LABEL_BACKGROUND = ".pele-edge-label > rect";
const SECONDARY_TEXT =
  ".pele-er-type, .pele-annotation, .pele-member, .pele-cluster-label, .pele-frame-label";
const FAINT_TEXT =
  ".pele-er-keys, .pele-axis-labels text, .pele-frame-kind, .playground-pele-legend text";
const INNER_STROKES = ".pele-divider, .pele-er-divider";
const MARKER_FILL = '.pele-marker[fill]:not([fill="none"], [fill="var(--_bg)"])';
const MARKER_STROKE = '.pele-marker:not([stroke="none"])';
const CORNERS = {
  node: ".pele-node > rect",
  classNode: ".pele-node.pele-class > rect",
  entity: ".pele-node.pele-entity > rect",
  actor: ".pele-actor > rect",
  subgraphOuter: SUBGRAPH.body,
  activation: ".pele-activation",
} as const;

function roundedTopPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.min(radius, w / 2, h);
  return `M${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}H${x}V${y + r}Q${x},${y} ${x + r},${y}Z`;
}

function clusterHeaders(svg: SVGSVGElement) {
  const clusters = [];
  const floatingLabels = new Map(
    Array.from(svg.querySelectorAll(".pele-cluster-title[data-id]")).map((group) => [
      group.getAttribute("data-id"),
      group.querySelector(".pele-cluster-label"),
    ]),
  );

  for (const group of svg.querySelectorAll(".pele-cluster")) {
    const body = group.querySelector(":scope > rect");
    const label =
      group.querySelector(".pele-cluster-label") ??
      floatingLabels.get(group.getAttribute("data-id"));
    if (!body || !label) {
      continue;
    }
    const [x, y, width, height] = ["x", "y", "width", "height"].map((name) =>
      Number.parseFloat(body.getAttribute(name) ?? ""),
    ) as [number, number, number, number];
    const labelY = Number.parseFloat(label.getAttribute("y") ?? "");
    const headerHeight = Math.min(height, labelY - y + 7);
    if (![x, y, width, headerHeight].every(Number.isFinite) || width <= 0 || headerHeight <= 0) {
      continue;
    }

    clusters.push({ body, x, y, width, headerHeight });
  }
  return clusters;
}

function addClusterHeaders(svg: SVGSVGElement, radius: number): void {
  for (const { body, x, y, width, headerHeight } of clusterHeaders(svg)) {
    const header = svg.ownerDocument.createElementNS(SVG_NS, "path");
    header.setAttribute("class", "playground-pele-cluster-header");
    header.setAttribute("d", roundedTopPath(x, y, width, headerHeight, radius));
    header.setAttribute("fill", "var(--pele-surface-alt)");
    body.after(header);
  }
}

function applyCorners(svg: SVGSVGElement, style: PeleSvgConfig["cornerStyle"]): number {
  if (style === "default") {
    return 4; // Pele's default rectangular radius, in pixels.
  }

  const radii = CORNER_RADIUS_SET[style];
  for (const key of Object.keys(CORNERS) as (keyof typeof CORNERS)[]) {
    const selector = CORNERS[key];
    const radius = radii[key];
    for (const rect of svg.querySelectorAll<SVGRectElement>(selector)) {
      const value = radius < 0 ? Number(rect.getAttribute("height")) / 2 : radius;
      // Pele uses an inline CSS rx, which would win over an SVG radius attribute.
      rect.style.setProperty("rx", `${value}px`);
      rect.style.setProperty("ry", `${value}px`);
    }
  }
  return radii.subgraphOuter;
}

function addMissingLabelBackgrounds(svg: SVGSVGElement): void {
  const labels = Array.from(svg.querySelectorAll(".pele-edge-label")).filter(
    (group) => !group.querySelector(":scope > rect") && group.querySelector(":scope > text"),
  );
  if (!labels.length) {
    return;
  }

  // Sequence messages have no backplate. Measure the already laid-out text
  // in an isolated tree so the exported SVG has the same background as preview.
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
  host.setAttribute("aria-hidden", "true");
  host.attachShadow({ mode: "open" }).append(svg);
  document.body.append(host);
  try {
    for (const group of labels) {
      const text = group.querySelector("text");
      if (!text) {
        continue;
      }
      const { x, y, width, height } = text.getBBox();
      if (width <= 0 || height <= 0) {
        continue;
      }
      const plate = svg.ownerDocument.createElementNS(SVG_NS, "rect");
      plate.setAttribute("x", String(x - 4));
      plate.setAttribute("y", String(y - 1));
      plate.setAttribute("width", String(width + 8));
      plate.setAttribute("height", String(height + 2));
      group.prepend(plate);
    }
  } finally {
    svg.remove();
    host.remove();
  }
}

function squareStepCorners(svg: SVGSVGElement): void {
  // Pele's step router emits rounded Q corners. Its control point is the
  // orthogonal elbow; retaining both endpoints preserves routing and markers.
  const stepCorner = /Q(-?[\d.]+,-?[\d.]+)\s+(-?[\d.]+,-?[\d.]+)/gu;
  for (const path of svg.querySelectorAll(".pele-edge > path:not(.pele-marker)")) {
    const d = path.getAttribute("d");
    if (d?.includes("Q")) {
      path.setAttribute("d", d.replace(stepCorner, "L$1L$2"));
    }
  }
}

function labelRules(style: PeleSvgConfig["edgeLabelStyle"]): string {
  const bg = "var(--pele-bg)";
  const fg = "var(--pele-fg)";
  const accent = "var(--pele-accent)";
  if (style === "default") {
    return "";
  }
  if (style === "minimal") {
    return `
      ${EDGE_LABEL_BACKGROUND} { display: none; }
      ${EDGE_LABEL} {
        fill: ${fg}; stroke: color-mix(in srgb, ${bg} 86%, transparent);
        stroke-width: 2.4; stroke-linejoin: round; paint-order: stroke fill;
      }`;
  }
  const radius = { subtle: 5, pill: 999, contrast: 4, accent: 6 }[style];
  const text =
    style === "contrast"
      ? bg
      : style === "accent"
        ? `color-mix(in srgb, ${accent} 72%, ${fg})`
        : "var(--pele-muted)";
  const fill =
    style === "contrast"
      ? fg
      : style === "accent"
        ? `color-mix(in srgb, ${accent} 14%, ${bg})`
        : bg;
  const stroke =
    style === "contrast"
      ? "none"
      : style === "accent"
        ? `color-mix(in srgb, ${accent} 45%, ${bg})`
        : `color-mix(in srgb, ${fg} 14%, ${bg})`;
  return `
    ${EDGE_LABEL} { fill: ${text}; }
    ${EDGE_LABEL_BACKGROUND} { rx: ${radius}px; ry: ${radius}px; fill: ${fill}; stroke: ${stroke}; }`;
}

function elementRules(colors: PeleElementColors): string {
  const rules = [
    [colors.secondaryText, SECONDARY_TEXT, "fill"],
    [colors.faintText, FAINT_TEXT, "fill"],
    [colors.edgeLabels, EDGE_LABEL, "fill"],
    [colors.connectors, EDGE, "stroke"],
    [colors.groupHeader, SUBGRAPH.header, "fill"],
    [colors.innerStrokes, INNER_STROKES, "stroke"],
    [colors.nodeStroke, BORDER, "stroke"],
  ];
  return rules
    .filter(([value]) => value !== undefined)
    .map(([value, selector, property]) => `${selector} { ${property}: ${value} !important; }`)
    .join("\n");
}

export function stylePeleSvg(
  svg: SVGSVGElement,
  tokens: Record<ThemeToken, string>,
  config: PeleSvgConfig,
  colors: PeleElementColors,
): string {
  for (const [key, value] of Object.entries(tokens)) {
    svg.style.setProperty(`--pele-${key}`, value);
  }
  svg.style.setProperty("--pele-surface-alt", `color-mix(in srgb, ${tokens.fg} 8%, ${tokens.bg})`);
  for (const key of ["bg", "fg", "line", "accent"] as const) {
    svg.style.setProperty(`--${key}`, tokens[key]);
  }
  if (colors.text !== undefined) {
    svg.style.setProperty("--pele-fg", colors.text);
  }
  if (colors.nodeFill !== undefined) {
    svg.style.setProperty("--pele-surface", colors.nodeFill);
  }
  svg.style.setProperty("--playground-pele-arrow", colors.arrowHeads ?? tokens.accent);

  // Palette fallbacks in the chart's source (e.g. themeVariables) retain
  // priority. Only the series that reference Pele's theme tokens inherit this.
  const seriesColors = [
    tokens.accent,
    ...[80, 62, 42, 26].map(
      (amount) => `color-mix(in srgb, var(--pele-accent) ${amount}%, var(--fg))`,
    ),
    ...[80, 65, 50].map((amount) => `color-mix(in srgb, var(--pele-accent) ${amount}%, var(--bg))`),
  ];
  seriesColors.forEach((color, index) => {
    const property = `--pele-series-${index + 1}`;
    if (!svg.style.getPropertyValue(property)) {
      svg.style.setProperty(property, color);
    }
  });
  if (!config.transparent) {
    svg.style.backgroundColor = "var(--pele-bg)";
  }

  const radius = applyCorners(svg, config.cornerStyle);
  if (config.subgraphStyle !== "default" || colors.groupHeader !== undefined) {
    addClusterHeaders(svg, radius);
  }
  if (config.lineGeometry === "orthogonal" && svg.classList.contains("pele-flowchart")) {
    squareStepCorners(svg);
  }
  const fontScale = config.peleFontSize / PELE_FONT_SIZE.default;
  if (config.edgeLabelStyle !== "default") {
    const fontSize = String(Math.round(EDGE_LABEL_FONT_SIZE * fontScale));
    for (const label of svg.querySelectorAll(EDGE_LABEL)) {
      label.setAttribute("font-size", fontSize);
    }
    if (config.edgeLabelStyle !== "minimal") {
      addMissingLabelBackgrounds(svg);
    }
  }

  const arrow = "var(--playground-pele-arrow)";
  const markerFill =
    colors.arrowHeads === undefined ? '.pele-marker[fill="var(--_l)"]' : MARKER_FILL;
  const markerStroke =
    colors.arrowHeads === undefined
      ? '.pele-marker:not([stroke]), .pele-marker[stroke="var(--_l)"]'
      : MARKER_STROKE;
  const edgeWidth =
    config.edgeWeight === "default"
      ? ""
      : `
    ${EDGE} { stroke-width: ${EDGE_WIDTH_MULTIPLIER[config.edgeWeight]} !important; }
    .pele-edge > path[stroke-width="2.5"]:not(.pele-marker) { stroke-width: ${2.5 * EDGE_WIDTH_MULTIPLIER[config.edgeWeight]} !important; }`;
  const borderWidth =
    config.borderWeight === "default"
      ? ""
      : `${BORDER} { stroke-width: ${BORDER_WIDTH_MULTIPLIER[config.borderWeight]} !important; }`;
  const edgeDash =
    config.edgePattern === "default"
      ? ""
      : `${EDGE} { stroke-dasharray: ${EDGE_DASH[config.edgePattern]} !important; }`;
  const borderDash =
    config.borderPattern === "default"
      ? ""
      : `${BORDER} { stroke-dasharray: ${BORDER_DASH[config.borderPattern]} !important; }`;
  const chartRules = stylePeleXyChart(svg, fontScale);
  const style = svg.ownerDocument.createElementNS(SVG_NS, "style");
  style.setAttribute("data-playground-pele-style", "");
  style.textContent = `
    ${markerFill} { fill: ${arrow} !important; }
    ${markerStroke} { stroke: ${arrow} !important; }
    ${edgeWidth} ${borderWidth} ${edgeDash} ${borderDash}
    ${subgraphPresetRules(config.subgraphStyle, SUBGRAPH)}
    ${labelRules(config.edgeLabelStyle)}
    ${chartRules}
    ${elementRules(colors)}
  `;
  svg.append(style);
  return new XMLSerializer().serializeToString(svg);
}

export function getPeleSvgControls(
  svg: SVGSVGElement,
  canOverrideDirection: boolean,
): PeleSvgControl[] {
  // Keep the control gates tied to the selectors the overrides actually use.
  const targets: Partial<Record<PeleSvgControl, string>> = {
    text: "text",
    secondaryText: SECONDARY_TEXT,
    faintText: FAINT_TEXT,
    edgeLabels: EDGE_LABEL,
    connectors: EDGE,
    arrowHeads: `${MARKER_FILL}, ${MARKER_STROKE}`,
    nodeFill: '[fill="var(--_s)"], [style*="fill:var(--_s)"]',
    innerStrokes: INNER_STROKES,
    nodeStroke: BORDER,
    subgraphStyle: SUBGRAPH.body,
    cornerStyle: Object.values(CORNERS).join(", "),
    monoFont: '[font-family="var(--_fm)"], [style*="font-family:var(--_fm)"]',
  };
  const controls = Object.entries(targets)
    .filter(([, selector]) => selector && svg.querySelector(selector))
    .map(([key]) => key as PeleSvgControl);
  if (clusterHeaders(svg).length) controls.push("groupHeader");
  if (canOverrideDirection) controls.push("direction");
  if (svg.classList.contains("pele-flowchart") && svg.querySelector(EDGE)) controls.push("routing");
  if (svg.matches(".pele-flowchart, .pele-state, .pele-class, .pele-er")) controls.push("spacing");
  return controls;
}
