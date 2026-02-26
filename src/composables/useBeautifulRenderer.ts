import { computed, onUnmounted, ref } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { RenderOptions as BeautifulRenderOptions } from "beautiful-mermaid";
import type { Ref } from "vue";
import { ELEMENT_COLOR_ROLES } from "@/types/playground";
import { resolveDiagramThemeTokens } from "@/utils/diagramTheme";
import type {
  BeautifulRenderConfig,
  ElementColorRole,
  ElementColorRule,
  RenderState,
  ThemeToken,
} from "@/types/playground";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isRendererLoadError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror")
  );
}

type BeautifulMermaidRuntime = typeof import("beautiful-mermaid");
type RenderOptions = BeautifulRenderOptions;

type Point = {
  x: number;
  y: number;
};

type ThemeChannels = {
  bg: string;
  fg: string;
  line?: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
};

type ThemeTokenValues = Record<ThemeToken, string>;

type MermaidOptionTokenValues = {
  line?: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
};

type SvgRenderResult = {
  svg: string;
  usedFallback: boolean;
};

let beautifulMermaidRuntimePromise: Promise<BeautifulMermaidRuntime> | null = null;

function loadBeautifulMermaid(): Promise<BeautifulMermaidRuntime> {
  if (!beautifulMermaidRuntimePromise) {
    beautifulMermaidRuntimePromise = import("beautiful-mermaid");
  }

  return beautifulMermaidRuntimePromise;
}

export async function preloadRenderer(): Promise<void> {
  await loadBeautifulMermaid();
}

const SUBGRAPH_HEADER_SELECTOR =
  ".subgraph > rect:nth-of-type(2), .subgraph > .subgraph-header-shape";

const ELEMENT_ROLE_CSS_VAR: Record<ElementColorRole, string> = {
  text: "--_text",
  secondaryText: "--_text-sec",
  edgeLabels: "--_text-muted",
  faintText: "--_text-faint",
  connectors: "--_line",
  nodeFill: "--_node-fill",
  groupHeader: "--_group-hdr",
  innerStrokes: "--_inner-stroke",
  nodeStroke: "--_node-stroke",
};

const ELEMENT_ROLE_TOKEN_BRIDGE: Partial<Record<ElementColorRole, keyof MermaidOptionTokenValues>> =
  {
    edgeLabels: "muted",
    connectors: "line",
    nodeFill: "surface",
    nodeStroke: "border",
  };

const EDGE_WIDTH_MULTIPLIER = {
  normal: 1,
  bold: 1.5,
  heavy: 2,
} as const;

const BORDER_WIDTH_MULTIPLIER = {
  normal: 1,
  bold: 1.35,
  heavy: 1.8,
} as const;

const EDGE_DASH = {
  solid: "none",
  dashed: "8 5",
  dotted: "2.25 4.25",
} as const;

const BORDER_DASH = {
  solid: "none",
  dashed: "9 4",
  dotted: "2 3.5",
} as const;

const CORNER_RADIUS_SET = {
  sharp: {
    node: 0,
    classNode: 0,
    entity: 0,
    subgraphOuter: 0,
    subgraphHeader: 0,
    actor: 0,
    activation: 0,
  },
  soft: {
    node: 5,
    classNode: 4,
    entity: 5,
    subgraphOuter: 7,
    subgraphHeader: 6,
    actor: 6,
    activation: 4,
  },
  rounded: {
    node: 10,
    classNode: 8,
    entity: 10,
    subgraphOuter: 14,
    subgraphHeader: 11,
    actor: 10,
    activation: 8,
  },
  pill: {
    node: -1,
    classNode: 16,
    entity: 14,
    subgraphOuter: 22,
    subgraphHeader: 16,
    actor: -1,
    activation: 10,
  },
} as const;

const EDGE_LABEL_FONT_SIZE = 11;

function mixFrom(base: ThemeChannels, percent: number): string {
  return `color-mix(in srgb, ${base.fg} ${percent}%, ${base.bg})`;
}

function normalizeThemeChannels(base: ThemeChannels): ThemeChannels {
  return {
    ...base,
    line: base.line ?? mixFrom(base, 50),
    accent: base.accent ?? mixFrom(base, 85),
    muted: base.muted ?? mixFrom(base, 40),
    surface: base.surface ?? mixFrom(base, 3),
    border: base.border ?? mixFrom(base, 20),
  };
}

function forceDirection(
  source: string,
  directionOverride: BeautifulRenderConfig["directionOverride"],
): string {
  if (directionOverride === "default") {
    return source;
  }

  const lines = source.split("\n");
  const firstMeaningfulIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("%%");
  });

  if (firstMeaningfulIndex < 0) {
    return source;
  }

  const header = lines[firstMeaningfulIndex] ?? "";
  const flowHeader = header.match(/^\s*(graph|flowchart)\s+(TD|TB|LR|RL|BT)\b/i);
  if (flowHeader) {
    lines[firstMeaningfulIndex] = header.replace(/\b(TD|TB|LR|RL|BT)\b/i, directionOverride);
    return lines.join("\n");
  }

  const stateHeader = header.match(/^\s*stateDiagram(?:-v2)?\s*$/i);
  if (stateHeader) {
    const directionLineRegex = /^\s*direction\s+(TD|TB|LR|RL|BT)\s*$/i;
    for (let index = firstMeaningfulIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) {
        continue;
      }

      if (directionLineRegex.test(line.trim())) {
        lines[index] = `  direction ${directionOverride}`;
        return lines.join("\n");
      }
    }

    lines.splice(firstMeaningfulIndex + 1, 0, `  direction ${directionOverride}`);
    return lines.join("\n");
  }

  return source;
}

function toThemeTokenValues(theme: ThemeChannels): ThemeTokenValues {
  return {
    bg: theme.bg,
    fg: theme.fg,
    line: theme.line ?? mixFrom(theme, 50),
    accent: theme.accent ?? mixFrom(theme, 85),
    muted: theme.muted ?? mixFrom(theme, 40),
    surface: theme.surface ?? mixFrom(theme, 3),
    border: theme.border ?? mixFrom(theme, 20),
  };
}

function resolveThemeTokenValues(config: BeautifulRenderConfig): ThemeTokenValues {
  const baseTheme = resolveDiagramThemeTokens(config.diagramTheme);
  const normalizedBaseTheme = normalizeThemeChannels({
    ...baseTheme,
    bg: config.useCustomBg ? config.customBg : baseTheme.bg,
    fg: config.useCustomFg ? config.customFg : baseTheme.fg,
  });

  const resolved = toThemeTokenValues(normalizedBaseTheme);
  return {
    ...resolved,
    line: config.useCustomLine ? config.customLine : resolved.line,
    accent: config.useCustomAccent ? config.customAccent : resolved.accent,
    muted: config.useCustomMuted ? config.customMuted : resolved.muted,
    surface: config.useCustomSurface ? config.customSurface : resolved.surface,
    border: config.useCustomBorder ? config.customBorder : resolved.border,
  };
}

function resolveElementCustomColor(
  role: ElementColorRole,
  rule: ElementColorRule,
  tokens: ThemeTokenValues,
): string {
  if (rule.source === "none") {
    return "transparent";
  }

  if (rule.source === "custom") {
    return rule.custom;
  }

  if (rule.source === "token") {
    return tokens[rule.token];
  }

  if (role === "text") {
    return tokens.fg;
  }

  if (role === "secondaryText") {
    return mixFrom(tokens, 60);
  }

  if (role === "edgeLabels") {
    return mixFrom(tokens, 40);
  }

  if (role === "faintText") {
    return mixFrom(tokens, 25);
  }

  if (role === "connectors") {
    return mixFrom(tokens, 50);
  }

  if (role === "nodeFill") {
    return mixFrom(tokens, 3);
  }

  if (role === "groupHeader") {
    return mixFrom(tokens, 5);
  }

  if (role === "innerStrokes") {
    return mixFrom(tokens, 12);
  }

  return mixFrom(tokens, 20);
}

function resolveMermaidOptionTokenOverrides(
  config: BeautifulRenderConfig,
  tokens: ThemeTokenValues,
): MermaidOptionTokenValues {
  const overrides: MermaidOptionTokenValues = {};

  if (config.useCustomLine) {
    overrides.line = config.customLine;
  }
  if (config.useCustomAccent) {
    overrides.accent = config.customAccent;
  }
  if (config.useCustomMuted) {
    overrides.muted = config.customMuted;
  }
  if (config.useCustomSurface) {
    overrides.surface = config.customSurface;
  }
  if (config.useCustomBorder) {
    overrides.border = config.customBorder;
  }

  for (const roleMeta of ELEMENT_COLOR_ROLES) {
    const bridge = ELEMENT_ROLE_TOKEN_BRIDGE[roleMeta.role];
    if (!bridge) {
      continue;
    }

    const rule = config.elementColors[roleMeta.role];
    if (rule.source === "default") {
      continue;
    }

    overrides[bridge] = resolveElementCustomColor(roleMeta.role, rule, tokens);
  }

  return overrides;
}

function applyOptionTokenOverrides(
  tokens: ThemeTokenValues,
  overrides: MermaidOptionTokenValues,
): ThemeTokenValues {
  return {
    ...tokens,
    line: overrides.line ?? tokens.line,
    accent: overrides.accent ?? tokens.accent,
    muted: overrides.muted ?? tokens.muted,
    surface: overrides.surface ?? tokens.surface,
    border: overrides.border ?? tokens.border,
  };
}

function stripCommonLeadingIndent(source: string): string {
  const lines = source.split("\n");
  let minIndent = Number.POSITIVE_INFINITY;

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const indent = line.match(/^ */u)?.[0].length ?? 0;
    minIndent = Math.min(minIndent, indent);
  }

  if (!Number.isFinite(minIndent) || minIndent <= 0) {
    return source;
  }

  return lines.map((line) => line.slice(minIndent)).join("\n");
}

function resolveBaseFont(config: BeautifulRenderConfig): string {
  if (config.baseFont !== "Custom") {
    return config.baseFont;
  }

  const customFamily = config.customBaseFontFamily.trim();
  return customFamily.length > 0 ? customFamily : "Inter";
}

function resolveMonoFont(config: BeautifulRenderConfig): string {
  if (config.monoFont !== "Custom") {
    return config.monoFont;
  }

  const customFamily = config.customMonoFontFamily.trim();
  return customFamily.length > 0 ? customFamily : "JetBrains Mono";
}

function toCssSingleQuotedFont(fontFamily: string): string {
  return `'${fontFamily.replace(/\\/gu, "\\\\").replace(/'/gu, "\\'")}'`;
}

export function buildBeautifulMermaidOptions(config: BeautifulRenderConfig): RenderOptions {
  const resolvedTokens = resolveThemeTokenValues(config);
  const tokenOverrides = resolveMermaidOptionTokenOverrides(config, resolvedTokens);
  const effectiveTokens = applyOptionTokenOverrides(resolvedTokens, tokenOverrides);

  return {
    bg: effectiveTokens.bg,
    fg: effectiveTokens.fg,
    line: effectiveTokens.line,
    accent: effectiveTokens.accent,
    muted: effectiveTokens.muted,
    surface: effectiveTokens.surface,
    border: effectiveTokens.border,
    font: resolveBaseFont(config),
    transparent: config.transparent,
    padding: config.padding,
    nodeSpacing: config.nodeSpacing,
    layerSpacing: config.layerSpacing,
    componentSpacing: config.componentSpacing,
  };
}

function isRetryableLayoutError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /scanline constraint|invalid hitboxes/i.test(message);
}

function buildSafeLayoutOptions(base: RenderOptions): RenderOptions {
  return {
    ...base,
    padding: Math.max(base.padding ?? 0, 36),
    nodeSpacing: Math.max(base.nodeSpacing ?? 0, 24),
    layerSpacing: Math.max(base.layerSpacing ?? 0, 48),
    componentSpacing: Math.max(base.componentSpacing ?? 0, 32),
  };
}

function renderSvgWithFallback(
  runtime: BeautifulMermaidRuntime,
  source: string,
  originalSource: string,
  renderOptions: RenderOptions,
): SvgRenderResult {
  try {
    return {
      svg: runtime.renderMermaidSVG(source, renderOptions),
      usedFallback: false,
    };
  } catch (error: unknown) {
    if (!isRetryableLayoutError(error)) {
      throw error;
    }
  }

  const safeOptions = buildSafeLayoutOptions(renderOptions);

  try {
    return {
      svg: runtime.renderMermaidSVG(source, safeOptions),
      usedFallback: true,
    };
  } catch (error: unknown) {
    if (!isRetryableLayoutError(error) || source === originalSource) {
      throw error;
    }
  }

  return {
    svg: runtime.renderMermaidSVG(originalSource, safeOptions),
    usedFallback: true,
  };
}

function subgraphPresetRules(preset: BeautifulRenderConfig["subgraphStyle"]): string {
  if (preset === "default") {
    return "";
  }

  if (preset === "minimal") {
    return `
  .subgraph > rect:nth-of-type(1) {
    fill: transparent;
    stroke-width: 1 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: transparent;
    stroke-width: 0 !important;
  }
  .subgraph > text {
    font-weight: 560;
  }`;
  }

  if (preset === "soft") {
    return `
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--fg) 2.5%, var(--bg));
    fill-opacity: 0.96;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--fg) 9%, var(--bg));
  }
  .subgraph > text {
    font-weight: 600;
  }`;
  }

  if (preset === "outlined") {
    return `
  .subgraph > rect:nth-of-type(1) {
    fill: transparent;
    stroke-dasharray: 6 3 !important;
    stroke-width: 1.05 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--fg) 6%, var(--bg));
  }
  .subgraph > text {
    letter-spacing: 0.01em;
    font-weight: 580;
  }`;
  }

  if (preset === "elevated") {
    return `
  .subgraph {
    filter: drop-shadow(0 7px 16px color-mix(in srgb, var(--fg) 12%, transparent));
  }
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--fg) 4%, var(--bg));
    fill-opacity: 0.98;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--fg) 12%, var(--bg));
  }
  .subgraph > text {
    font-weight: 620;
  }`;
  }

  if (preset === "accent") {
    return `
  .subgraph {
    filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--accent, var(--_arrow)) 40%, transparent));
  }
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 14%, var(--bg)) !important;
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 72%, var(--bg)) !important;
    stroke-width: 1.25 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 22%, var(--bg)) !important;
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 82%, var(--bg)) !important;
    stroke-width: 1.25 !important;
  }
  .subgraph > text {
    fill: var(--accent, var(--_arrow)) !important;
    font-weight: 650;
  }`;
  }

  if (preset === "brutalist") {
    return `
  .subgraph {
    filter: drop-shadow(4px 4px 0 color-mix(in srgb, var(--fg) 76%, var(--bg)));
  }
  .subgraph > rect:nth-of-type(1) {
    fill: var(--bg);
    stroke: var(--fg) !important;
    stroke-width: 2.2 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: var(--fg);
    stroke: var(--fg) !important;
    stroke-width: 2.2 !important;
  }
  .subgraph > text {
    fill: var(--bg) !important;
    font-weight: 700;
    letter-spacing: 0.02em;
  }`;
  }

  if (preset === "neon") {
    return `
  .subgraph {
    filter: drop-shadow(0 0 16px color-mix(in srgb, var(--accent, var(--_arrow)) 55%, transparent));
  }
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 8%, var(--bg));
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 95%, var(--bg)) !important;
    stroke-width: 1.4 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 22%, var(--bg));
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 98%, var(--bg)) !important;
    stroke-width: 1.4 !important;
  }
  .subgraph > text {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 96%, var(--bg)) !important;
    font-weight: 660;
    letter-spacing: 0.012em;
  }`;
  }

  if (preset === "signal") {
    return `
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--line, var(--_line)) 8%, var(--bg));
    stroke: color-mix(in srgb, var(--line, var(--_line)) 78%, var(--bg)) !important;
    stroke-width: 1.3 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 34%, var(--bg));
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 90%, var(--bg)) !important;
    stroke-width: 1.3 !important;
  }
  .subgraph > text {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 96%, var(--bg)) !important;
    font-weight: 640;
  }`;
  }

  if (preset === "contrast") {
    return `
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--fg) 10%, var(--bg));
    stroke-width: 1.35 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--fg) 82%, var(--bg));
    stroke: color-mix(in srgb, var(--fg) 88%, var(--bg)) !important;
    stroke-width: 1.35 !important;
  }
  .subgraph > text {
    fill: var(--bg) !important;
    font-weight: 650;
    letter-spacing: 0.015em;
  }`;
  }

  if (preset === "glass") {
    return `
  .subgraph {
    filter: drop-shadow(0 8px 18px color-mix(in srgb, var(--fg) 10%, transparent));
  }
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--fg) 10%, var(--bg));
    fill-opacity: 0.62;
    stroke: color-mix(in srgb, var(--fg) 30%, var(--bg)) !important;
    stroke-width: 1.15 !important;
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--fg) 24%, var(--bg));
    fill-opacity: 0.78;
    stroke: color-mix(in srgb, var(--fg) 36%, var(--bg)) !important;
    stroke-width: 1.15 !important;
  }
  .subgraph > text {
    fill: color-mix(in srgb, var(--fg) 82%, var(--bg)) !important;
    font-weight: 620;
  }`;
  }

  return `
  .subgraph > rect:nth-of-type(1) {
    fill: color-mix(in srgb, var(--fg) 2.5%, var(--bg));
  }
  ${SUBGRAPH_HEADER_SELECTOR} {
    fill: color-mix(in srgb, var(--fg) 9%, var(--bg));
  }
  .subgraph > text {
    font-weight: 600;
  }`;
}

function parsePoints(pointsAttr: string): Point[] {
  return pointsAttr
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [xPart, yPart] = pair.split(",");
      const x = Number.parseFloat(xPart ?? "");
      const y = Number.parseFloat(yPart ?? "");
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    })
    .filter((point): point is Point => point !== null);
}

function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function toFixedPoint(point: Point): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
}

function roundedPolylinePath(points: Point[], radius = 12): string {
  if (points.length === 0) {
    return "";
  }

  if (points.length <= 2) {
    return `M ${points.map(toFixedPoint).join(" L ")}`;
  }

  let path = `M ${toFixedPoint(points[0]!)}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1]!;
    const current = points[index]!;
    const next = points[index + 1]!;

    const prevLength = distance(prev, current);
    const nextLength = distance(current, next);
    if (prevLength < 0.001 || nextLength < 0.001) {
      path += ` L ${toFixedPoint(current)}`;
      continue;
    }

    const inRadius = Math.min(radius, prevLength / 2);
    const outRadius = Math.min(radius, nextLength / 2);

    const inPoint: Point = {
      x: current.x - ((current.x - prev.x) / prevLength) * inRadius,
      y: current.y - ((current.y - prev.y) / prevLength) * inRadius,
    };
    const outPoint: Point = {
      x: current.x + ((next.x - current.x) / nextLength) * outRadius,
      y: current.y + ((next.y - current.y) / nextLength) * outRadius,
    };

    path += ` L ${toFixedPoint(inPoint)} Q ${toFixedPoint(current)} ${toFixedPoint(outPoint)}`;
  }

  path += ` L ${toFixedPoint(points[points.length - 1]!)} `;
  return path.trim();
}

function copyAttributes(from: Element, to: Element, skip: string[] = []): void {
  for (const attribute of Array.from(from.attributes)) {
    if (skip.includes(attribute.name)) {
      continue;
    }

    to.setAttribute(attribute.name, attribute.value);
  }
}

function topRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r <= 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }

  return [
    `M ${x + r} ${y}`,
    `H ${x + width - r}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `V ${y + height}`,
    `H ${x}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

function convertPolylineElement(doc: XMLDocument, polyline: SVGPolylineElement): void {
  const points = parsePoints(polyline.getAttribute("points") ?? "");
  if (points.length < 2) {
    return;
  }

  const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  copyAttributes(polyline, path, ["points"]);

  const d = roundedPolylinePath(points, 12);
  if (!d) {
    return;
  }

  path.setAttribute("d", d);
  if (!path.hasAttribute("fill")) {
    path.setAttribute("fill", "none");
  }
  polyline.replaceWith(path);
}

function applyLineGeometry(doc: XMLDocument, mode: BeautifulRenderConfig["lineGeometry"]): void {
  if (mode === "default" || mode === "orthogonal") {
    return;
  }

  const polylines = doc.querySelectorAll<SVGPolylineElement>(
    "polyline.edge, polyline.class-relationship, polyline.er-relationship, g.message > polyline",
  );

  for (const polyline of Array.from(polylines)) {
    convertPolylineElement(doc, polyline);
  }
}

function applyCornerStyle(
  doc: XMLDocument,
  cornerStyle: BeautifulRenderConfig["cornerStyle"],
): void {
  if (cornerStyle === "default") {
    return;
  }

  const set = CORNER_RADIUS_SET[cornerStyle];
  const scale = 1;

  const applyRadius = (selector: string, baseRadius: number): void => {
    const rects = doc.querySelectorAll<SVGRectElement>(selector);
    for (const rect of Array.from(rects)) {
      const height = Number.parseFloat(rect.getAttribute("height") ?? "");
      const radius =
        baseRadius < 0 && Number.isFinite(height)
          ? Math.max(8, Math.floor((height / 2) * scale))
          : Math.max(0, Math.round(baseRadius * scale));

      rect.setAttribute("rx", String(radius));
      rect.setAttribute("ry", String(radius));
    }
  };

  const applyTopOnlyRadius = (selector: string, baseRadius: number, className: string): void => {
    const rects = doc.querySelectorAll<SVGRectElement>(selector);
    for (const rect of Array.from(rects)) {
      const x = Number.parseFloat(rect.getAttribute("x") ?? "");
      const y = Number.parseFloat(rect.getAttribute("y") ?? "");
      const width = Number.parseFloat(rect.getAttribute("width") ?? "");
      const height = Number.parseFloat(rect.getAttribute("height") ?? "");

      if (
        ![x, y, width, height].every((value) => Number.isFinite(value)) ||
        width <= 0 ||
        height <= 0
      ) {
        continue;
      }

      const rawRadius =
        baseRadius < 0
          ? Math.max(8, Math.floor((height / 2) * scale))
          : Math.max(0, Math.round(baseRadius * scale));
      const radius = Math.max(0, Math.min(rawRadius, Math.floor(width / 2), Math.floor(height)));

      if (radius <= 0) {
        rect.setAttribute("rx", "0");
        rect.setAttribute("ry", "0");
        continue;
      }

      const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      copyAttributes(rect, path, ["x", "y", "width", "height", "rx", "ry"]);
      const existingClassName = path.getAttribute("class");
      path.setAttribute(
        "class",
        existingClassName ? `${existingClassName} ${className}` : className,
      );
      path.setAttribute("d", topRoundedRectPath(x, y, width, height, radius));
      if (!path.hasAttribute("fill")) {
        path.setAttribute("fill", "none");
      }
      rect.replaceWith(path);
    }
  };

  applyRadius(".node > rect", set.node);
  applyRadius(".class-node > rect", set.classNode);
  applyRadius(".entity > rect", set.entity);
  applyRadius(".subgraph > rect:nth-of-type(1)", set.subgraphOuter);
  applyTopOnlyRadius(
    ".subgraph > rect:nth-of-type(2)",
    set.subgraphHeader,
    "subgraph-header-shape",
  );
  applyTopOnlyRadius(".entity > rect:nth-of-type(2)", set.entity, "entity-header-shape");
  applyTopOnlyRadius(".class-node > rect:nth-of-type(2)", set.classNode, "class-header-shape");
  applyRadius(".actor > rect", set.actor);
  applyRadius(".activation", set.activation);
}

function applyEdgeLabelStyle(doc: XMLDocument, config: BeautifulRenderConfig): void {
  if (config.edgeLabelStyle === "default") {
    return;
  }

  const groups = doc.querySelectorAll<SVGGElement>("g.edge-label");
  for (const group of Array.from(groups)) {
    const textNodes = group.querySelectorAll<SVGTextElement>("text");
    for (const textNode of Array.from(textNodes)) {
      textNode.setAttribute("font-size", String(EDGE_LABEL_FONT_SIZE));
      textNode.setAttribute("stroke", "none");
      textNode.setAttribute("paint-order", "normal");
      textNode.setAttribute("stroke-width", "0");
      textNode.setAttribute("fill", "var(--_text-muted)");
    }

    const backgroundRect = group.querySelector<SVGRectElement>("rect");
    if (config.edgeLabelStyle === "minimal") {
      for (const textNode of Array.from(textNodes)) {
        textNode.setAttribute("fill", "var(--_text)");
        textNode.setAttribute("stroke", "color-mix(in srgb, var(--bg) 86%, transparent)");
        textNode.setAttribute("stroke-width", "2.4");
        textNode.setAttribute("stroke-linejoin", "round");
        textNode.setAttribute("paint-order", "stroke fill");
      }
      backgroundRect?.remove();
      continue;
    }

    if (!backgroundRect) {
      continue;
    }

    if (config.edgeLabelStyle === "subtle") {
      backgroundRect.setAttribute("rx", "5");
      backgroundRect.setAttribute("ry", "5");
      backgroundRect.setAttribute("fill", "var(--bg)");
      backgroundRect.setAttribute("stroke", "color-mix(in srgb, var(--fg) 14%, var(--bg))");
      backgroundRect.setAttribute("stroke-width", "1");
      continue;
    }

    if (config.edgeLabelStyle === "pill") {
      const height = Number.parseFloat(backgroundRect.getAttribute("height") ?? "");
      const radius = Number.isFinite(height) ? Math.max(8, Math.round(height / 2)) : 999;
      backgroundRect.setAttribute("rx", String(radius));
      backgroundRect.setAttribute("ry", String(radius));
      backgroundRect.setAttribute("fill", "var(--bg)");
      backgroundRect.setAttribute("stroke", "color-mix(in srgb, var(--fg) 14%, var(--bg))");
      backgroundRect.setAttribute("stroke-width", "1");
      continue;
    }

    if (config.edgeLabelStyle === "contrast") {
      for (const textNode of Array.from(textNodes)) {
        textNode.setAttribute("fill", "var(--bg)");
      }
      backgroundRect.setAttribute("rx", "4");
      backgroundRect.setAttribute("ry", "4");
      backgroundRect.setAttribute("fill", "var(--fg)");
      backgroundRect.setAttribute("stroke", "none");
      backgroundRect.setAttribute("stroke-width", "0");
      continue;
    }

    if (config.edgeLabelStyle === "accent") {
      for (const textNode of Array.from(textNodes)) {
        textNode.setAttribute("fill", "color-mix(in srgb, var(--accent) 72%, var(--fg))");
      }
      backgroundRect.setAttribute("rx", "6");
      backgroundRect.setAttribute("ry", "6");
      backgroundRect.setAttribute("fill", "color-mix(in srgb, var(--accent) 14%, var(--bg))");
      backgroundRect.setAttribute("stroke", "color-mix(in srgb, var(--accent) 45%, var(--bg))");
      backgroundRect.setAttribute("stroke-width", "1");
    }
  }
}

function buildElementCssVariableBlock(
  config: BeautifulRenderConfig,
  tokens: ThemeTokenValues,
): string {
  const declarations: string[] = [];

  for (const roleMeta of ELEMENT_COLOR_ROLES) {
    const rule = config.elementColors[roleMeta.role];
    if (rule.source === "default") {
      continue;
    }

    const cssVar = ELEMENT_ROLE_CSS_VAR[roleMeta.role];
    const color = resolveElementCustomColor(roleMeta.role, rule, tokens);
    declarations.push(`${cssVar}: ${color};`);
  }

  if (declarations.length === 0) {
    return "";
  }

  return `
  svg {
    ${declarations.join("\n    ")}
  }
`;
}

function buildVisualCss(config: BeautifulRenderConfig): string {
  const edgeWidthMultiplier =
    config.edgeWeight === "default" ? null : EDGE_WIDTH_MULTIPLIER[config.edgeWeight];
  const borderWidthMultiplier =
    config.borderWeight === "default" ? null : BORDER_WIDTH_MULTIPLIER[config.borderWeight];
  const baseTokens = resolveThemeTokenValues(config);
  const tokenOverrides = resolveMermaidOptionTokenOverrides(config, baseTokens);
  const effectiveTokens = applyOptionTokenOverrides(baseTokens, tokenOverrides);
  const cssVariableBlock = buildElementCssVariableBlock(config, effectiveTokens);
  const monoFontFamily = toCssSingleQuotedFont(resolveMonoFont(config));

  const edgeWidthCss = edgeWidthMultiplier
    ? `stroke-width: ${(1 * edgeWidthMultiplier).toFixed(2)}px !important;`
    : "";
  const thickEdgeWidthCss = edgeWidthMultiplier
    ? `stroke-width: ${(2 * edgeWidthMultiplier).toFixed(2)}px !important;`
    : "";
  const lifelineWidthCss = edgeWidthMultiplier
    ? `stroke-width: ${Math.max(0.7, 0.75 * edgeWidthMultiplier).toFixed(2)}px !important;`
    : "";

  const borderWidthCss = borderWidthMultiplier
    ? `stroke-width: ${borderWidthMultiplier.toFixed(2)}px !important;`
    : "";
  const borderLineWidthCss = borderWidthMultiplier
    ? `stroke-width: ${Math.max(0.8, borderWidthMultiplier * 0.75).toFixed(2)}px !important;`
    : "";

  const edgeDash =
    config.edgePattern === "default"
      ? ""
      : `stroke-dasharray: ${EDGE_DASH[config.edgePattern]} !important;`;
  const borderDash =
    config.borderPattern === "default"
      ? ""
      : `stroke-dasharray: ${BORDER_DASH[config.borderPattern]} !important;`;

  return `${cssVariableBlock}

  .mono {
    font-family: ${monoFontFamily}, 'SF Mono', 'Fira Code', ui-monospace, monospace !important;
  }

  .edge,
  .class-relationship,
  .er-relationship,
  .message > line,
  .message > polyline,
  .message > path {
    stroke: var(--_line) !important;
    ${edgeWidthCss}
    ${edgeDash}
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .lifeline {
    stroke: var(--_line) !important;
    ${lifelineWidthCss}
    ${edgeDash}
  }

  .edge[data-style='thick'] {
    ${thickEdgeWidthCss}
  }

  .node > rect,
  .node > ellipse,
  .node > polygon,
  .node > path,
  .class-node > rect,
  .class-node > .class-header-shape,
  .entity > rect,
  .entity > .entity-header-shape,
  .actor > rect,
  .activation,
  .subgraph > .subgraph-header-shape,
  .subgraph > rect {
    stroke: var(--_node-stroke) !important;
    ${borderWidthCss}
    ${borderDash}
  }

  .node > line,
  .class-node > line,
  .entity > line {
    stroke: var(--_node-stroke) !important;
    ${borderLineWidthCss}
    ${borderDash}
  }

  ${subgraphPresetRules(config.subgraphStyle)}`;
}

function applyVisualOverrides(svg: string, config: BeautifulRenderConfig): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(svg, "image/svg+xml");
  if (document.querySelector("parsererror")) {
    return svg;
  }

  const root = document.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    return svg;
  }

  applyLineGeometry(document, config.lineGeometry);
  applyCornerStyle(document, config.cornerStyle);
  applyEdgeLabelStyle(document, config);

  const existingStyle = root.querySelector("style[data-playground-visual-overrides]");
  existingStyle?.remove();

  const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.setAttribute("data-playground-visual-overrides", "");
  styleElement.textContent = buildVisualCss(config);
  root.append(styleElement);

  return new XMLSerializer().serializeToString(document);
}

export function useBeautifulRenderer(
  code: Ref<string>,
  config: Ref<BeautifulRenderConfig>,
  delayMs = 300,
) {
  const renderState = ref<RenderState>({
    svg: null,
    ascii: null,
    asciiHtml: null,
    error: null,
    durationMs: null,
    renderId: 0,
  });

  const isRendering = ref(false);
  let latestRenderToken = 0;
  let latestScheduleToken = 0;

  async function renderNow(): Promise<void> {
    const renderToken = latestRenderToken + 1;
    latestRenderToken = renderToken;

    const startedAt = performance.now();
    const originalSource = stripCommonLeadingIndent(code.value.trim());
    const source = stripCommonLeadingIndent(
      forceDirection(originalSource, config.value.directionOverride),
    );

    if (!source) {
      if (renderToken !== latestRenderToken) {
        return;
      }

      renderState.value = {
        svg: null,
        ascii: null,
        asciiHtml: null,
        error: null,
        durationMs: Math.round(performance.now() - startedAt),
        renderId: renderToken,
      };
      return;
    }

    const previousSvg = renderState.value.svg;
    const previousAscii = renderState.value.ascii;
    const previousAsciiHtml = renderState.value.asciiHtml;

    try {
      isRendering.value = true;
      const runtime = await loadBeautifulMermaid();
      if (renderToken !== latestRenderToken) {
        return;
      }

      const renderOptions = buildBeautifulMermaidOptions(config.value);

      if (config.value.outputMode === "svg") {
        const result = renderSvgWithFallback(runtime, source, originalSource, renderOptions);
        const rawSvg = result.svg;
        const styledSvg = applyVisualOverrides(rawSvg, config.value);

        if (result.usedFallback) {
          // Keep this visible in devtools without interrupting successful output.
          console.warn("[playground] layout fallback applied after ELK scanline hitbox failure");
        }

        renderState.value = {
          svg: styledSvg,
          ascii: previousAscii,
          asciiHtml: previousAsciiHtml,
          error: null,
          durationMs: Math.round(performance.now() - startedAt),
          renderId: renderToken,
        };
      } else {
        const asciiTheme = {
          fg: renderOptions.fg ?? "#27272A",
          border: renderOptions.border ?? renderOptions.line ?? renderOptions.fg ?? "#27272A",
          line: renderOptions.line ?? renderOptions.fg ?? "#27272A",
          arrow: renderOptions.accent ?? renderOptions.line ?? renderOptions.fg ?? "#27272A",
          accent: renderOptions.accent,
          bg: renderOptions.bg,
          corner: renderOptions.line ?? renderOptions.fg ?? "#27272A",
          junction: renderOptions.border ?? renderOptions.line ?? renderOptions.fg ?? "#27272A",
        };
        const ascii = stripCommonLeadingIndent(
          runtime.renderMermaidASCII(source, {
            useAscii: config.value.outputMode === "ascii",
            colorMode: "none",
            theme: asciiTheme,
          }),
        );
        const asciiHtml = runtime.renderMermaidASCII(source, {
          useAscii: config.value.outputMode === "ascii",
          colorMode: "html",
          theme: asciiTheme,
        });

        renderState.value = {
          svg: previousSvg,
          ascii,
          asciiHtml,
          error: null,
          durationMs: Math.round(performance.now() - startedAt),
          renderId: renderToken,
        };
      }
    } catch (error: unknown) {
      if (renderToken !== latestRenderToken) {
        return;
      }

      const errorMessage = isRendererLoadError(error)
        ? `Failed to load renderer runtime: ${getErrorMessage(error)}`
        : getErrorMessage(error);
      renderState.value = {
        svg: previousSvg,
        ascii: previousAscii,
        asciiHtml: previousAsciiHtml,
        error: errorMessage,
        durationMs: Math.round(performance.now() - startedAt),
        renderId: renderToken,
      };
    } finally {
      if (renderToken === latestRenderToken) {
        isRendering.value = false;
      }
    }
  }

  const scheduleDebouncedRender = useDebounceFn((scheduleToken: number) => {
    if (scheduleToken !== latestScheduleToken) {
      return;
    }

    void renderNow();
  }, delayMs);

  function cancelScheduledRender(): void {
    latestScheduleToken += 1;
  }

  function scheduleRender(): void {
    const scheduleToken = latestScheduleToken + 1;
    latestScheduleToken = scheduleToken;
    void scheduleDebouncedRender(scheduleToken);
  }

  onUnmounted(() => {
    cancelScheduledRender();
    latestRenderToken += 1;
    isRendering.value = false;
  });

  return {
    isRendering: computed(() => isRendering.value),
    renderState,
    renderNow,
    scheduleRender,
    cancelScheduledRender,
  };
}
