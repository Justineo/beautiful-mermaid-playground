import { ref, watch } from "vue";
import {
  BORDER_PATTERN_OPTIONS,
  BORDER_WEIGHT_OPTIONS,
  CORNER_STYLE_OPTIONS,
  BASE_FONT_OPTIONS,
  DIAGRAM_THEME_OPTIONS,
  DIRECTION_OPTIONS,
  EDGE_LABEL_STYLE_OPTIONS,
  EDGE_WEIGHT_OPTIONS,
  ELEMENT_COLOR_ROLES,
  LINE_GEOMETRY_OPTIONS,
  RENDER_OUTPUT_MODE_OPTIONS,
  TEXT_COLOR_MODE_OPTIONS,
  STROKE_PATTERN_OPTIONS,
  SUBGRAPH_STYLE_OPTIONS,
  MONO_FONT_OPTIONS,
  type ActiveMobilePane,
  type BorderPattern,
  type BorderWeight,
  type CornerStyle,
  type BaseFont,
  type DiagramTheme,
  type DirectionOverride,
  type EdgeLabelStylePreset,
  type EdgeWeight,
  type ElementColorConfig,
  type ElementColorRole,
  type ElementColorRule,
  type ElementColorSource,
  type LineGeometry,
  type PlaygroundState,
  type RenderOutputMode,
  type StrokePattern,
  type SubgraphStylePreset,
  type TextColorMode,
  type MonoFont,
  type ThemeToken,
} from "@/types/playground";
import { OFFICIAL_SAMPLES } from "@/data/officialSamples";
import { parseGoogleFontsInput } from "@/utils/googleFonts";

const STORAGE_KEY = "beautiful-mermaid-playground";

const DEFAULT_CODE = OFFICIAL_SAMPLES.find((sample) => sample.category === "Basic")?.source ?? "";

const DEFAULT_ELEMENT_COLORS: ElementColorConfig = {
  text: { source: "default", token: "fg", custom: "#111111" },
  arrowHeads: { source: "default", token: "accent", custom: "#3b82f6" },
  secondaryText: { source: "default", token: "muted", custom: "#6b7280" },
  edgeLabels: { source: "default", token: "muted", custom: "#6b7280" },
  faintText: { source: "default", token: "muted", custom: "#9ca3af" },
  connectors: { source: "default", token: "line", custom: "#3b82f6" },
  nodeFill: { source: "default", token: "surface", custom: "#f8fafc" },
  groupHeader: { source: "default", token: "surface", custom: "#f1f5f9" },
  innerStrokes: { source: "default", token: "border", custom: "#d4d4d8" },
  nodeStroke: { source: "default", token: "border", custom: "#d4d4d8" },
};

const DEFAULT_STATE: PlaygroundState = {
  code: DEFAULT_CODE,
  config: {
    outputMode: "svg",
    diagramTheme: "github-light",
    useCustomBg: false,
    customBg: "#ffffff",
    useCustomFg: false,
    customFg: "#111111",
    useCustomLine: false,
    customLine: "#3b82f6",
    useCustomAccent: false,
    customAccent: "#111111",
    useCustomMuted: false,
    customMuted: "#6b7280",
    useCustomSurface: false,
    customSurface: "#f8fafc",
    useCustomBorder: false,
    customBorder: "#d4d4d8",
    elementColors: structuredClone(DEFAULT_ELEMENT_COLORS),
    baseFont: "Inter",
    customBaseFontUrl: "",
    customBaseFontFamily: "",
    monoFont: "JetBrains Mono",
    customMonoFontUrl: "",
    customMonoFontFamily: "",
    directionOverride: "default",
    subgraphStyle: "soft",
    lineGeometry: "default",
    cornerStyle: "default",
    edgeLabelStyle: "subtle",
    edgePattern: "default",
    edgeWeight: "default",
    borderPattern: "default",
    borderWeight: "default",
    textColorMode: "none",
    textPaddingX: 5,
    textPaddingY: 5,
    textBoxBorderPadding: 1,
    transparent: true,
    padding: 40,
    nodeSpacing: 24,
    layerSpacing: 40,
    componentSpacing: 24,
    editorFontSize: 12,
  },
  splitRatio: 0.5,
  desktopPanes: {
    options: true,
    editor: true,
    preview: true,
  },
  mobilePane: "editor",
};

const diagramThemeSet = new Set<DiagramTheme>(
  DIAGRAM_THEME_OPTIONS.map((themeOption) => themeOption.value),
);
const outputModeSet = new Set<RenderOutputMode>(
  RENDER_OUTPUT_MODE_OPTIONS.map((outputModeOption) => outputModeOption.value),
);
const textColorModeSet = new Set<TextColorMode>(
  TEXT_COLOR_MODE_OPTIONS.map((colorModeOption) => colorModeOption.value),
);
const baseFontSet = new Set<BaseFont>(BASE_FONT_OPTIONS.map((fontOption) => fontOption.value));
const monoFontSet = new Set<MonoFont>(MONO_FONT_OPTIONS.map((fontOption) => fontOption.value));
const directionSet = new Set<DirectionOverride>(
  DIRECTION_OPTIONS.map((directionOption) => directionOption.value),
);
const edgeWeightSet = new Set<EdgeWeight>(
  EDGE_WEIGHT_OPTIONS.map((weightOption) => weightOption.value),
);
const subgraphStyleSet = new Set<SubgraphStylePreset>(
  SUBGRAPH_STYLE_OPTIONS.map((styleOption) => styleOption.value),
);
const lineGeometrySet = new Set<LineGeometry>(
  LINE_GEOMETRY_OPTIONS.map((lineOption) => lineOption.value),
);
const cornerStyleSet = new Set<CornerStyle>(
  CORNER_STYLE_OPTIONS.map((cornerOption) => cornerOption.value),
);
const edgeLabelStyleSet = new Set<EdgeLabelStylePreset>(
  EDGE_LABEL_STYLE_OPTIONS.map((shapeOption) => shapeOption.value),
);
const strokePatternSet = new Set<StrokePattern>(
  STROKE_PATTERN_OPTIONS.map((patternOption) => patternOption.value),
);
const borderPatternSet = new Set<BorderPattern>(
  BORDER_PATTERN_OPTIONS.map((patternOption) => patternOption.value),
);
const borderWeightSet = new Set<BorderWeight>(
  BORDER_WEIGHT_OPTIONS.map((weightOption) => weightOption.value),
);

const elementColorSourceSet = new Set<ElementColorSource>(["default", "token", "custom", "none"]);
const themeTokenSet = new Set<ThemeToken>([
  "bg",
  "fg",
  "line",
  "accent",
  "muted",
  "surface",
  "border",
]);
const elementRoleSupportMap = Object.fromEntries(
  ELEMENT_COLOR_ROLES.map((item) => [item.role, item.supportsNone]),
) as Record<ElementColorRole, boolean>;

function isDiagramTheme(value: unknown): value is DiagramTheme {
  return typeof value === "string" && diagramThemeSet.has(value as DiagramTheme);
}

function isDirectionOverride(value: unknown): value is DirectionOverride {
  return typeof value === "string" && directionSet.has(value as DirectionOverride);
}

function isRenderOutputMode(value: unknown): value is RenderOutputMode {
  return typeof value === "string" && outputModeSet.has(value as RenderOutputMode);
}

function isBaseFont(value: unknown): value is BaseFont {
  return typeof value === "string" && baseFontSet.has(value as BaseFont);
}

function isTextColorMode(value: unknown): value is TextColorMode {
  return typeof value === "string" && textColorModeSet.has(value as TextColorMode);
}

function isMonoFont(value: unknown): value is MonoFont {
  return typeof value === "string" && monoFontSet.has(value as MonoFont);
}

function isEdgeWeight(value: unknown): value is EdgeWeight {
  return typeof value === "string" && edgeWeightSet.has(value as EdgeWeight);
}

function isSubgraphStyle(value: unknown): value is SubgraphStylePreset {
  return typeof value === "string" && subgraphStyleSet.has(value as SubgraphStylePreset);
}

function isLineGeometry(value: unknown): value is LineGeometry {
  return typeof value === "string" && lineGeometrySet.has(value as LineGeometry);
}

function isCornerStyle(value: unknown): value is CornerStyle {
  return typeof value === "string" && cornerStyleSet.has(value as CornerStyle);
}

function isEdgeLabelStyle(value: unknown): value is EdgeLabelStylePreset {
  return typeof value === "string" && edgeLabelStyleSet.has(value as EdgeLabelStylePreset);
}

function isStrokePattern(value: unknown): value is StrokePattern {
  return typeof value === "string" && strokePatternSet.has(value as StrokePattern);
}

function isBorderPattern(value: unknown): value is BorderPattern {
  return typeof value === "string" && borderPatternSet.has(value as BorderPattern);
}

function isBorderWeight(value: unknown): value is BorderWeight {
  return typeof value === "string" && borderWeightSet.has(value as BorderWeight);
}

function isMobilePane(value: unknown): value is ActiveMobilePane {
  return value === "options" || value === "editor" || value === "preview";
}

function isElementColorSource(value: unknown): value is ElementColorSource {
  return typeof value === "string" && elementColorSourceSet.has(value as ElementColorSource);
}

function isThemeToken(value: unknown): value is ThemeToken {
  return typeof value === "string" && themeTokenSet.has(value as ThemeToken);
}

function sanitizeDesktopPanes(source: unknown): PlaygroundState["desktopPanes"] {
  if (!source || typeof source !== "object") {
    return structuredClone(DEFAULT_STATE.desktopPanes);
  }

  const raw = source as Partial<PlaygroundState["desktopPanes"]>;
  const next = {
    options: typeof raw.options === "boolean" ? raw.options : DEFAULT_STATE.desktopPanes.options,
    editor: typeof raw.editor === "boolean" ? raw.editor : DEFAULT_STATE.desktopPanes.editor,
    preview: typeof raw.preview === "boolean" ? raw.preview : DEFAULT_STATE.desktopPanes.preview,
  };

  if (!next.options && !next.editor && !next.preview) {
    return structuredClone(DEFAULT_STATE.desktopPanes);
  }

  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(Math.round(value), min, max);
}

function sanitizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (
    /^#[\da-f]{6}$/i.test(normalized) ||
    /^#[\da-f]{3}$/i.test(normalized) ||
    /^#[\da-f]{8}$/i.test(normalized) ||
    /^#[\da-f]{4}$/i.test(normalized)
  ) {
    return normalized;
  }

  return fallback;
}

function sanitizeFontFamily(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().replace(/"/g, "");
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, 120);
}

function sanitizeElementColorRule(role: ElementColorRole, source: unknown): ElementColorRule {
  const fallback = DEFAULT_ELEMENT_COLORS[role];
  if (!source || typeof source !== "object") {
    return { ...fallback };
  }

  const raw = source as Partial<ElementColorRule>;
  const supportsNone = elementRoleSupportMap[role];

  let nextSource = isElementColorSource(raw.source) ? raw.source : fallback.source;
  if (nextSource === "none" && !supportsNone) {
    nextSource = "default";
  }

  return {
    source: nextSource,
    token: isThemeToken(raw.token) ? raw.token : fallback.token,
    custom: sanitizeHexColor(raw.custom, fallback.custom),
  };
}

function sanitizeElementColors(source: unknown): ElementColorConfig {
  if (!source || typeof source !== "object") {
    return structuredClone(DEFAULT_ELEMENT_COLORS);
  }

  const raw = source as Partial<Record<ElementColorRole, unknown>>;
  const next = {} as ElementColorConfig;

  for (const roleConfig of ELEMENT_COLOR_ROLES) {
    const role = roleConfig.role;
    next[role] = sanitizeElementColorRule(role, raw[role]);
  }

  return next;
}

function sanitizeState(source: unknown): PlaygroundState {
  if (!source || typeof source !== "object") {
    return structuredClone(DEFAULT_STATE);
  }

  const raw = source as Partial<PlaygroundState>;
  const rawConfig: Partial<PlaygroundState["config"]> = raw.config ?? {};
  const parsedCustomBaseFont = parseGoogleFontsInput(
    typeof rawConfig.customBaseFontUrl === "string" ? rawConfig.customBaseFontUrl : "",
  );
  const parsedCustomMonoFont = parseGoogleFontsInput(
    typeof rawConfig.customMonoFontUrl === "string" ? rawConfig.customMonoFontUrl : "",
  );

  return {
    code: typeof raw.code === "string" ? raw.code : DEFAULT_STATE.code,
    config: {
      outputMode: isRenderOutputMode(rawConfig.outputMode)
        ? rawConfig.outputMode
        : DEFAULT_STATE.config.outputMode,
      diagramTheme: isDiagramTheme(rawConfig.diagramTheme)
        ? rawConfig.diagramTheme
        : DEFAULT_STATE.config.diagramTheme,
      useCustomBg:
        typeof rawConfig.useCustomBg === "boolean"
          ? rawConfig.useCustomBg
          : DEFAULT_STATE.config.useCustomBg,
      customBg: sanitizeHexColor(rawConfig.customBg, DEFAULT_STATE.config.customBg),
      useCustomFg:
        typeof rawConfig.useCustomFg === "boolean"
          ? rawConfig.useCustomFg
          : DEFAULT_STATE.config.useCustomFg,
      customFg: sanitizeHexColor(rawConfig.customFg, DEFAULT_STATE.config.customFg),
      useCustomLine:
        typeof rawConfig.useCustomLine === "boolean"
          ? rawConfig.useCustomLine
          : DEFAULT_STATE.config.useCustomLine,
      customLine: sanitizeHexColor(rawConfig.customLine, DEFAULT_STATE.config.customLine),
      useCustomAccent:
        typeof rawConfig.useCustomAccent === "boolean"
          ? rawConfig.useCustomAccent
          : DEFAULT_STATE.config.useCustomAccent,
      customAccent: sanitizeHexColor(rawConfig.customAccent, DEFAULT_STATE.config.customAccent),
      useCustomMuted:
        typeof rawConfig.useCustomMuted === "boolean"
          ? rawConfig.useCustomMuted
          : DEFAULT_STATE.config.useCustomMuted,
      customMuted: sanitizeHexColor(rawConfig.customMuted, DEFAULT_STATE.config.customMuted),
      useCustomSurface:
        typeof rawConfig.useCustomSurface === "boolean"
          ? rawConfig.useCustomSurface
          : DEFAULT_STATE.config.useCustomSurface,
      customSurface: sanitizeHexColor(rawConfig.customSurface, DEFAULT_STATE.config.customSurface),
      useCustomBorder:
        typeof rawConfig.useCustomBorder === "boolean"
          ? rawConfig.useCustomBorder
          : DEFAULT_STATE.config.useCustomBorder,
      customBorder: sanitizeHexColor(rawConfig.customBorder, DEFAULT_STATE.config.customBorder),
      elementColors: sanitizeElementColors(rawConfig.elementColors),
      baseFont: isBaseFont(rawConfig.baseFont) ? rawConfig.baseFont : DEFAULT_STATE.config.baseFont,
      customBaseFontUrl: parsedCustomBaseFont?.sourceUrl ?? DEFAULT_STATE.config.customBaseFontUrl,
      customBaseFontFamily: sanitizeFontFamily(
        rawConfig.customBaseFontFamily,
        parsedCustomBaseFont?.primaryFamily ?? DEFAULT_STATE.config.customBaseFontFamily,
      ),
      monoFont: isMonoFont(rawConfig.monoFont) ? rawConfig.monoFont : DEFAULT_STATE.config.monoFont,
      customMonoFontUrl: parsedCustomMonoFont?.sourceUrl ?? DEFAULT_STATE.config.customMonoFontUrl,
      customMonoFontFamily: sanitizeFontFamily(
        rawConfig.customMonoFontFamily,
        parsedCustomMonoFont?.primaryFamily ?? DEFAULT_STATE.config.customMonoFontFamily,
      ),
      directionOverride: isDirectionOverride(rawConfig.directionOverride)
        ? rawConfig.directionOverride
        : DEFAULT_STATE.config.directionOverride,
      subgraphStyle: isSubgraphStyle(rawConfig.subgraphStyle)
        ? rawConfig.subgraphStyle
        : DEFAULT_STATE.config.subgraphStyle,
      lineGeometry: isLineGeometry(rawConfig.lineGeometry)
        ? rawConfig.lineGeometry
        : DEFAULT_STATE.config.lineGeometry,
      cornerStyle: isCornerStyle(rawConfig.cornerStyle)
        ? rawConfig.cornerStyle
        : DEFAULT_STATE.config.cornerStyle,
      edgeLabelStyle: isEdgeLabelStyle(rawConfig.edgeLabelStyle)
        ? rawConfig.edgeLabelStyle
        : DEFAULT_STATE.config.edgeLabelStyle,
      edgePattern: isStrokePattern(rawConfig.edgePattern)
        ? rawConfig.edgePattern
        : DEFAULT_STATE.config.edgePattern,
      edgeWeight: isEdgeWeight(rawConfig.edgeWeight)
        ? rawConfig.edgeWeight
        : DEFAULT_STATE.config.edgeWeight,
      borderPattern: isBorderPattern(rawConfig.borderPattern)
        ? rawConfig.borderPattern
        : DEFAULT_STATE.config.borderPattern,
      borderWeight: isBorderWeight(rawConfig.borderWeight)
        ? rawConfig.borderWeight
        : DEFAULT_STATE.config.borderWeight,
      textColorMode: isTextColorMode(rawConfig.textColorMode)
        ? rawConfig.textColorMode
        : DEFAULT_STATE.config.textColorMode,
      textPaddingX: sanitizeNumber(
        rawConfig.textPaddingX,
        DEFAULT_STATE.config.textPaddingX,
        0,
        60,
      ),
      textPaddingY: sanitizeNumber(
        rawConfig.textPaddingY,
        DEFAULT_STATE.config.textPaddingY,
        0,
        60,
      ),
      textBoxBorderPadding: sanitizeNumber(
        rawConfig.textBoxBorderPadding,
        DEFAULT_STATE.config.textBoxBorderPadding,
        0,
        24,
      ),
      transparent:
        typeof rawConfig.transparent === "boolean"
          ? rawConfig.transparent
          : DEFAULT_STATE.config.transparent,
      padding: sanitizeNumber(rawConfig.padding, DEFAULT_STATE.config.padding, 0, 240),
      nodeSpacing: sanitizeNumber(rawConfig.nodeSpacing, DEFAULT_STATE.config.nodeSpacing, 4, 200),
      layerSpacing: sanitizeNumber(
        rawConfig.layerSpacing,
        DEFAULT_STATE.config.layerSpacing,
        4,
        240,
      ),
      componentSpacing: sanitizeNumber(
        rawConfig.componentSpacing,
        DEFAULT_STATE.config.componentSpacing,
        4,
        260,
      ),
      editorFontSize: sanitizeNumber(
        rawConfig.editorFontSize,
        DEFAULT_STATE.config.editorFontSize,
        10,
        20,
      ),
    },
    splitRatio:
      typeof raw.splitRatio === "number" && Number.isFinite(raw.splitRatio)
        ? clamp(raw.splitRatio, 0.25, 0.75)
        : DEFAULT_STATE.splitRatio,
    desktopPanes: sanitizeDesktopPanes(raw.desktopPanes),
    mobilePane: isMobilePane(raw.mobilePane) ? raw.mobilePane : DEFAULT_STATE.mobilePane,
  };
}

function loadState(): PlaygroundState {
  if (typeof window === "undefined") {
    return structuredClone(DEFAULT_STATE);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(DEFAULT_STATE);
  }

  try {
    return sanitizeState(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function persistState(state: PlaygroundState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function sanitizePlaygroundConfig(source: unknown): PlaygroundState["config"] {
  return sanitizeState({ config: source }).config;
}

export function usePlaygroundState() {
  const state = ref<PlaygroundState>(loadState());

  watch(
    state,
    (value) => {
      persistState(value);
    },
    { deep: true },
  );

  return {
    state,
    defaultState: structuredClone(DEFAULT_STATE),
  };
}
