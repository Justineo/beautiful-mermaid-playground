import type { ThemeName } from "beautiful-mermaid";
import { UNOFFICIAL_THEME_OPTIONS } from "@/generated/unofficialThemes";
import type { UnofficialDiagramThemeName } from "@/generated/unofficialThemes";

export type UnofficialDiagramTheme = UnofficialDiagramThemeName;
export type DiagramTheme = ThemeName | UnofficialDiagramTheme;
export type RenderOutputMode = "svg" | "unicode" | "ascii";
export type TextColorMode = "none" | "auto" | "ansi16" | "ansi256" | "truecolor" | "html";

export type ActiveMobilePane = "options" | "editor" | "preview";
export type DesktopPaneKey = "options" | "editor" | "preview";
export type DirectionOverride = "default" | "TD" | "TB" | "LR" | "RL" | "BT";
export type BaseFont =
  | "Inter"
  | "Geist"
  | "Geist Mono"
  | "IBM Plex Sans"
  | "IBM Plex Mono"
  | "Roboto"
  | "Roboto Mono"
  | "Google Sans"
  | "Google Sans Code"
  | "Lato"
  | "JetBrains Mono"
  | "Custom";
export type MonoFont =
  | "JetBrains Mono"
  | "Geist Mono"
  | "IBM Plex Mono"
  | "Roboto Mono"
  | "Google Sans Code"
  | "Custom";
export type EdgeWeight = "default" | "normal" | "bold" | "heavy";
export type SubgraphStylePreset =
  | "default"
  | "minimal"
  | "soft"
  | "outlined"
  | "elevated"
  | "accent"
  | "brutalist"
  | "neon"
  | "signal"
  | "contrast"
  | "glass";
export type StrokePattern = "default" | "solid" | "dashed" | "dotted";
export type BorderPattern = "default" | "solid" | "dashed" | "dotted";
export type BorderWeight = "default" | "normal" | "bold" | "heavy";
export type LineGeometry = "default" | "orthogonal" | "rounded";
export type CornerStyle = "default" | "sharp" | "soft" | "rounded" | "pill";
export type EdgeLabelStylePreset =
  | "default"
  | "minimal"
  | "subtle"
  | "pill"
  | "contrast"
  | "accent";

export type ThemeToken = "bg" | "fg" | "line" | "accent" | "muted" | "surface" | "border";
export type ElementColorSource = "default" | "token" | "custom" | "none";
export type ElementColorScope = "both" | "svg" | "text";
export type ElementColorRole =
  | "text"
  | "arrowHeads"
  | "secondaryText"
  | "edgeLabels"
  | "faintText"
  | "connectors"
  | "nodeFill"
  | "groupHeader"
  | "innerStrokes"
  | "nodeStroke";

export interface ElementColorRule {
  source: ElementColorSource;
  token: ThemeToken;
  custom: string;
}

export type ElementColorConfig = Record<ElementColorRole, ElementColorRule>;

export const ELEMENT_COLOR_ROLES: Array<{
  role: ElementColorRole;
  label: string;
  scope: ElementColorScope;
  supportsNone: boolean;
  tokenBridge: ThemeToken | null;
}> = [
  {
    role: "text",
    label: "Text",
    scope: "both",
    supportsNone: false,
    tokenBridge: "fg",
  },
  {
    role: "arrowHeads",
    label: "Arrow heads",
    scope: "both",
    supportsNone: true,
    tokenBridge: "accent",
  },
  {
    role: "secondaryText",
    label: "Secondary text",
    scope: "svg",
    supportsNone: false,
    tokenBridge: "muted",
  },
  {
    role: "edgeLabels",
    label: "Edge labels",
    scope: "svg",
    supportsNone: true,
    tokenBridge: "muted",
  },
  {
    role: "faintText",
    label: "Faint text",
    scope: "svg",
    supportsNone: false,
    tokenBridge: "muted",
  },
  {
    role: "connectors",
    label: "Connectors",
    scope: "both",
    supportsNone: true,
    tokenBridge: "line",
  },
  {
    role: "nodeFill",
    label: "Node fill",
    scope: "svg",
    supportsNone: true,
    tokenBridge: "surface",
  },
  {
    role: "groupHeader",
    label: "Group header",
    scope: "svg",
    supportsNone: true,
    tokenBridge: "surface",
  },
  {
    role: "innerStrokes",
    label: "Inner strokes",
    scope: "svg",
    supportsNone: true,
    tokenBridge: "border",
  },
  {
    role: "nodeStroke",
    label: "Node stroke",
    scope: "both",
    supportsNone: true,
    tokenBridge: "border",
  },
];

export interface BeautifulRenderConfig {
  outputMode: RenderOutputMode;
  diagramTheme: DiagramTheme;
  useCustomBg: boolean;
  customBg: string;
  useCustomFg: boolean;
  customFg: string;
  useCustomLine: boolean;
  customLine: string;
  useCustomAccent: boolean;
  customAccent: string;
  useCustomMuted: boolean;
  customMuted: string;
  useCustomSurface: boolean;
  customSurface: string;
  useCustomBorder: boolean;
  customBorder: string;
  elementColors: ElementColorConfig;
  baseFont: BaseFont;
  customBaseFontUrl: string;
  customBaseFontFamily: string;
  monoFont: MonoFont;
  customMonoFontUrl: string;
  customMonoFontFamily: string;
  directionOverride: DirectionOverride;
  subgraphStyle: SubgraphStylePreset;
  lineGeometry: LineGeometry;
  cornerStyle: CornerStyle;
  edgeLabelStyle: EdgeLabelStylePreset;
  edgePattern: StrokePattern;
  edgeWeight: EdgeWeight;
  borderPattern: BorderPattern;
  borderWeight: BorderWeight;
  textColorMode: TextColorMode;
  textPaddingX: number;
  textPaddingY: number;
  textBoxBorderPadding: number;
  transparent: boolean;
  padding: number;
  nodeSpacing: number;
  layerSpacing: number;
  componentSpacing: number;
  editorFontSize: number;
}

export interface PlaygroundState {
  code: string;
  config: BeautifulRenderConfig;
  splitRatio: number;
  desktopPanes: Record<DesktopPaneKey, boolean>;
  mobilePane: ActiveMobilePane;
}

export interface RenderState {
  svg: string | null;
  ascii: string | null;
  asciiHtml: string | null;
  error: string | null;
  durationMs: number | null;
  renderId: number;
}

export const RENDER_OUTPUT_MODE_OPTIONS: Array<{ label: string; value: RenderOutputMode }> = [
  { label: "SVG", value: "svg" },
  { label: "Unicode", value: "unicode" },
  { label: "ASCII", value: "ascii" },
];

export const TEXT_COLOR_MODE_OPTIONS: Array<{ label: string; value: TextColorMode }> = [
  { label: "None", value: "none" },
  { label: "Default", value: "auto" },
  { label: "ANSI 16", value: "ansi16" },
  { label: "ANSI 256", value: "ansi256" },
  { label: "Truecolor", value: "truecolor" },
  { label: "HTML", value: "html" },
];

export const OFFICIAL_DIAGRAM_THEME_OPTIONS: Array<{ label: string; value: ThemeName }> = [
  { label: "Zinc Light", value: "zinc-light" },
  { label: "Zinc Dark", value: "zinc-dark" },
  { label: "GitHub Light", value: "github-light" },
  { label: "GitHub Dark", value: "github-dark" },
  { label: "Dracula", value: "dracula" },
  { label: "One Dark", value: "one-dark" },
  { label: "Tokyo Night", value: "tokyo-night" },
  { label: "Tokyo Storm", value: "tokyo-night-storm" },
  { label: "Tokyo Light", value: "tokyo-night-light" },
  { label: "Solarized Light", value: "solarized-light" },
  { label: "Solarized Dark", value: "solarized-dark" },
  { label: "Nord", value: "nord" },
  { label: "Nord Light", value: "nord-light" },
  { label: "Catppuccin Mocha", value: "catppuccin-mocha" },
  { label: "Catppuccin Latte", value: "catppuccin-latte" },
];

export const UNOFFICIAL_DIAGRAM_THEME_OPTIONS: Array<{
  label: string;
  value: UnofficialDiagramTheme;
}> = [...UNOFFICIAL_THEME_OPTIONS];

export const DIAGRAM_THEME_OPTIONS: Array<{ label: string; value: DiagramTheme }> = [
  ...OFFICIAL_DIAGRAM_THEME_OPTIONS,
  ...UNOFFICIAL_DIAGRAM_THEME_OPTIONS,
];

export const DIRECTION_OPTIONS: Array<{ label: string; value: DirectionOverride }> = [
  { label: "Default", value: "default" },
  { label: "Top down (TD)", value: "TD" },
  { label: "Top to bottom (TB)", value: "TB" },
  { label: "Left to right (LR)", value: "LR" },
  { label: "Right to left (RL)", value: "RL" },
  { label: "Bottom to top (BT)", value: "BT" },
];

export const BASE_FONT_OPTIONS: Array<{ label: string; value: BaseFont }> = [
  { label: "Inter", value: "Inter" },
  { label: "Geist", value: "Geist" },
  { label: "Geist Mono", value: "Geist Mono" },
  { label: "IBM Plex Sans", value: "IBM Plex Sans" },
  { label: "IBM Plex Sans Mono", value: "IBM Plex Mono" },
  { label: "Roboto", value: "Roboto" },
  { label: "Roboto Mono", value: "Roboto Mono" },
  { label: "Google Sans", value: "Google Sans" },
  { label: "Google Sans Code", value: "Google Sans Code" },
  { label: "Lato", value: "Lato" },
  { label: "JetBrains Mono", value: "JetBrains Mono" },
  { label: "Custom", value: "Custom" },
];

export const MONO_FONT_OPTIONS: Array<{ label: string; value: MonoFont }> = [
  { label: "JetBrains Mono", value: "JetBrains Mono" },
  { label: "Geist Mono", value: "Geist Mono" },
  { label: "IBM Plex Sans Mono", value: "IBM Plex Mono" },
  { label: "Roboto Mono", value: "Roboto Mono" },
  { label: "Google Sans Code", value: "Google Sans Code" },
  { label: "Custom", value: "Custom" },
];

export const EDGE_WEIGHT_OPTIONS: Array<{ label: string; value: EdgeWeight }> = [
  { label: "Default", value: "default" },
  { label: "Normal", value: "normal" },
  { label: "Bold", value: "bold" },
  { label: "Heavy", value: "heavy" },
];

export const SUBGRAPH_STYLE_OPTIONS: Array<{ label: string; value: SubgraphStylePreset }> = [
  { label: "Default", value: "default" },
  { label: "Minimal", value: "minimal" },
  { label: "Soft", value: "soft" },
  { label: "Outlined", value: "outlined" },
  { label: "Elevated", value: "elevated" },
  { label: "Accent", value: "accent" },
  { label: "Brutalist", value: "brutalist" },
  { label: "Neon", value: "neon" },
  { label: "Signal", value: "signal" },
  { label: "Contrast", value: "contrast" },
  { label: "Glass", value: "glass" },
];

export const LINE_GEOMETRY_OPTIONS: Array<{ label: string; value: LineGeometry }> = [
  { label: "Default", value: "default" },
  { label: "Orthogonal (native)", value: "orthogonal" },
  { label: "Rounded (enhanced)", value: "rounded" },
];

export const EDGE_LABEL_STYLE_OPTIONS: Array<{ label: string; value: EdgeLabelStylePreset }> = [
  { label: "Default", value: "default" },
  { label: "Minimal", value: "minimal" },
  { label: "Subtle", value: "subtle" },
  { label: "Pill", value: "pill" },
  { label: "Contrast", value: "contrast" },
  { label: "Accent", value: "accent" },
];

export const STROKE_PATTERN_OPTIONS: Array<{ label: string; value: StrokePattern }> = [
  { label: "Default", value: "default" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
];

export const BORDER_PATTERN_OPTIONS: Array<{ label: string; value: BorderPattern }> = [
  { label: "Default", value: "default" },
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
];

export const BORDER_WEIGHT_OPTIONS: Array<{ label: string; value: BorderWeight }> = [
  { label: "Default", value: "default" },
  { label: "Normal", value: "normal" },
  { label: "Bold", value: "bold" },
  { label: "Heavy", value: "heavy" },
];

export const CORNER_STYLE_OPTIONS: Array<{ label: string; value: CornerStyle }> = [
  { label: "Default", value: "default" },
  { label: "Sharp", value: "sharp" },
  { label: "Soft", value: "soft" },
  { label: "Rounded", value: "rounded" },
  { label: "Pill", value: "pill" },
];
