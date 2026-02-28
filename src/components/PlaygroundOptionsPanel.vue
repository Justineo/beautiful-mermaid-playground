<script setup lang="ts">
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CircleSlash } from "lucide-vue-next";
import { computed, nextTick, ref, watch } from "vue";
import type { Component } from "vue";
import BaseCheckbox from "@/components/BaseCheckbox.vue";
import BaseColorPicker from "@/components/BaseColorPicker.vue";
import BaseDropdownMenu from "@/components/BaseDropdownMenu.vue";
import BasePanel from "@/components/BasePanel.vue";
import BaseSegmentedControl from "@/components/BaseSegmentedControl.vue";
import BaseSelect from "@/components/BaseSelect.vue";
import TokenColorSelect from "@/components/TokenColorSelect.vue";
import { useOverlayScrollbars } from "@/composables/useOverlayScrollbars";
import { resolveDiagramThemeTokens } from "@/utils/diagramTheme";
import { parseGoogleFontsInput } from "@/utils/googleFonts";
import {
  BASE_FONT_OPTIONS,
  EDGE_LABEL_STYLE_OPTIONS,
  ELEMENT_COLOR_ROLES,
  SUBGRAPH_STYLE_OPTIONS,
  MONO_FONT_OPTIONS,
} from "@/types/playground";
import type { TokenColorOption } from "@/components/TokenColorSelect.vue";
import type {
  BorderPattern,
  BorderWeight,
  CornerStyle,
  BaseFont,
  DiagramTheme,
  DirectionOverride,
  EdgeLabelStylePreset,
  EdgeWeight,
  ElementColorConfig,
  ElementColorRole,
  ElementColorScope,
  ElementColorSource,
  LineGeometry,
  RenderOutputMode,
  StrokePattern,
  SubgraphStylePreset,
  MonoFont,
  ThemeToken,
} from "@/types/playground";

type OptionsTab = "palette" | "layout" | "nodes" | "edges" | "system";
type OptionsTabScope = "svg" | "text" | "mixed";
const tabs: Array<{ key: OptionsTab; label: string }> = [
  { key: "palette", label: "Theme" },
  { key: "layout", label: "Layout" },
  { key: "nodes", label: "Nodes" },
  { key: "edges", label: "Edges" },
  { key: "system", label: "Fonts" },
];
const OPTIONS_TAB_SCOPE: Record<OptionsTab, OptionsTabScope> = {
  palette: "mixed",
  layout: "mixed",
  nodes: "svg",
  edges: "svg",
  system: "mixed",
};
// Hidden for now: beautiful-mermaid currently doesn't produce reliable visual changes
// from this control in our playground. Keep it easy to re-enable later.
const SHOW_COMPONENT_GAP_CONTROL = false;
const RESET_MENU_ITEMS = [
  { key: "reset-all", label: "Reset all" },
  { key: "reset-current-tab", label: "Reset current tab" },
];
const PREVIEW_STROKE_COLOR = "color-mix(in srgb, var(--text-primary) 34%, var(--border-color))";
const cornerStyleItems: Array<{
  key: string;
  label: string;
  icon?: Component;
  iconOnly: true;
  previewStyle?: Record<string, string>;
}> = [
  {
    key: "default",
    label: "Default",
    icon: CircleSlash,
    iconOnly: true,
  },
  {
    key: "sharp",
    label: "Sharp",
    iconOnly: true,
    previewStyle: { width: "10px", height: "10px", borderRadius: "0px" },
  },
  {
    key: "soft",
    label: "Soft",
    iconOnly: true,
    previewStyle: { width: "10px", height: "10px", borderRadius: "3px" },
  },
  {
    key: "rounded",
    label: "Rounded",
    iconOnly: true,
    previewStyle: { width: "10px", height: "10px", borderRadius: "4px" },
  },
  {
    key: "pill",
    label: "Pill",
    iconOnly: true,
    previewStyle: { width: "10px", height: "10px", borderRadius: "999px" },
  },
];
const borderPatternItems: Array<{
  key: string;
  label: string;
  icon?: Component;
  iconOnly: true;
  previewStyle?: Record<string, string>;
}> = [
  {
    key: "default",
    label: "Default",
    icon: CircleSlash,
    iconOnly: true,
  },
  {
    key: "solid",
    label: "Solid",
    iconOnly: true,
    previewStyle: { width: "12px", height: "8px", borderStyle: "solid" },
  },
  {
    key: "dashed",
    label: "Dashed",
    iconOnly: true,
    previewStyle: { width: "12px", height: "8px", borderStyle: "dashed" },
  },
  {
    key: "dotted",
    label: "Dotted",
    iconOnly: true,
    previewStyle: { width: "12px", height: "8px", borderStyle: "dotted" },
  },
];
const borderWeightItems: Array<{
  key: string;
  label: string;
  icon?: Component;
  iconOnly: true;
  previewStyle?: Record<string, string>;
}> = [
  {
    key: "default",
    label: "Default",
    icon: CircleSlash,
    iconOnly: true,
  },
  {
    key: "normal",
    label: "Normal",
    iconOnly: true,
    previewStyle: { width: "12px", height: "8px", borderWidth: "1px" },
  },
  {
    key: "bold",
    label: "Bold",
    iconOnly: true,
    previewStyle: { width: "12px", height: "8px", borderWidth: "1.5px" },
  },
  {
    key: "heavy",
    label: "Heavy",
    iconOnly: true,
    previewStyle: { width: "12px", height: "8px", borderWidth: "2px" },
  },
];
const edgeGeometryItems: Array<{
  key: string;
  label: string;
  icon?: Component;
  iconOnly: true;
  previewStyle?: Record<string, string>;
}> = [
  {
    key: "default",
    label: "Default",
    icon: CircleSlash,
    iconOnly: true,
  },
  {
    key: "orthogonal",
    label: "Orthogonal",
    iconOnly: true,
    previewStyle: {
      width: "10px",
      height: "8px",
      border: "0",
      background: "transparent",
      boxShadow: "none",
      borderLeft: `1.35px solid ${PREVIEW_STROKE_COLOR}`,
      borderBottom: `1.35px solid ${PREVIEW_STROKE_COLOR}`,
      borderBottomLeftRadius: "0px",
    },
  },
  {
    key: "rounded",
    label: "Rounded",
    iconOnly: true,
    previewStyle: {
      width: "10px",
      height: "8px",
      border: "0",
      background: "transparent",
      boxShadow: "none",
      borderLeft: `1.35px solid ${PREVIEW_STROKE_COLOR}`,
      borderBottom: `1.35px solid ${PREVIEW_STROKE_COLOR}`,
      borderBottomLeftRadius: "4px",
    },
  },
];
const edgePatternItems: Array<{
  key: string;
  label: string;
  icon?: Component;
  iconOnly: true;
  previewStyle?: Record<string, string>;
}> = [
  {
    key: "default",
    label: "Default",
    icon: CircleSlash,
    iconOnly: true,
  },
  {
    key: "solid",
    label: "Solid",
    iconOnly: true,
    previewStyle: {
      width: "10px",
      height: "0",
      border: "0",
      background: "transparent",
      boxShadow: "none",
      borderTop: `1.2px solid ${PREVIEW_STROKE_COLOR}`,
    },
  },
  {
    key: "dashed",
    label: "Dashed",
    iconOnly: true,
    previewStyle: {
      width: "10px",
      height: "0",
      border: "0",
      background: "transparent",
      boxShadow: "none",
      borderTop: `1.2px dashed ${PREVIEW_STROKE_COLOR}`,
    },
  },
  {
    key: "dotted",
    label: "Dotted",
    iconOnly: true,
    previewStyle: {
      width: "10px",
      height: "0",
      border: "0",
      background: "transparent",
      boxShadow: "none",
      borderTop: `1.2px dotted ${PREVIEW_STROKE_COLOR}`,
    },
  },
];
const edgeWeightItems: Array<{
  key: string;
  label: string;
  icon?: Component;
  iconOnly: true;
  previewStyle?: Record<string, string>;
}> = [
  {
    key: "default",
    label: "Default",
    icon: CircleSlash,
    iconOnly: true,
  },
  {
    key: "normal",
    label: "Normal",
    iconOnly: true,
    previewStyle: {
      width: "12px",
      height: "1.25px",
      border: "0",
      background: PREVIEW_STROKE_COLOR,
      boxShadow: "none",
      borderRadius: "999px",
    },
  },
  {
    key: "bold",
    label: "Bold",
    iconOnly: true,
    previewStyle: {
      width: "12px",
      height: "2.2px",
      border: "0",
      background: PREVIEW_STROKE_COLOR,
      boxShadow: "none",
      borderRadius: "999px",
    },
  },
  {
    key: "heavy",
    label: "Heavy",
    iconOnly: true,
    previewStyle: {
      width: "12px",
      height: "3.2px",
      border: "0",
      background: PREVIEW_STROKE_COLOR,
      boxShadow: "none",
      borderRadius: "999px",
    },
  },
];
type DirectionSegmentKey = "default" | "TB" | "LR" | "RL" | "BT";
const directionSegmentItems: Array<{
  key: DirectionSegmentKey;
  label: string;
  icon: Component;
  iconOnly: true;
}> = [
  { key: "default", label: "Default", icon: CircleSlash, iconOnly: true },
  { key: "TB", label: "Top to bottom", icon: ArrowDown, iconOnly: true },
  { key: "LR", label: "Left to right", icon: ArrowRight, iconOnly: true },
  { key: "RL", label: "Right to left", icon: ArrowLeft, iconOnly: true },
  { key: "BT", label: "Bottom to top", icon: ArrowUp, iconOnly: true },
];

const THEME_TOKENS: ThemeToken[] = ["bg", "fg", "line", "accent", "muted", "surface", "border"];
const ELEMENT_COLOR_ROLE_DISPLAY_ORDER: ElementColorRole[] = [
  "text",
  "secondaryText",
  "edgeLabels",
  "faintText",
  "connectors",
  "arrowHeads",
  "nodeFill",
  "groupHeader",
  "innerStrokes",
  "nodeStroke",
];
const props = defineProps<{
  diagramTheme: DiagramTheme;
  outputMode: RenderOutputMode;
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
  isBaseCustomFontLoading: boolean;
  monoFont: MonoFont;
  customMonoFontUrl: string;
  customMonoFontFamily: string;
  isMonoCustomFontLoading: boolean;
  monoFontOptionRemovalTarget: MonoFontOptionRemovalTarget | null;
  directionOverride: DirectionOverride;
  subgraphStyle: SubgraphStylePreset;
  lineGeometry: LineGeometry;
  cornerStyle: CornerStyle;
  edgeLabelStyle: EdgeLabelStylePreset;
  edgePattern: StrokePattern;
  edgeWeight: EdgeWeight;
  borderPattern: BorderPattern;
  borderWeight: BorderWeight;
  textPaddingX: number;
  textPaddingY: number;
  textBoxBorderPadding: number;
  padding: number;
  nodeSpacing: number;
  layerSpacing: number;
  componentSpacing: number;
}>();

const emit = defineEmits<{
  "update:useCustomBg": [value: boolean];
  "update:customBg": [value: string];
  "update:useCustomFg": [value: boolean];
  "update:customFg": [value: string];
  "update:useCustomLine": [value: boolean];
  "update:customLine": [value: string];
  "update:useCustomAccent": [value: boolean];
  "update:customAccent": [value: string];
  "update:useCustomMuted": [value: boolean];
  "update:customMuted": [value: string];
  "update:useCustomSurface": [value: boolean];
  "update:customSurface": [value: string];
  "update:useCustomBorder": [value: boolean];
  "update:customBorder": [value: string];
  "update:elementColorSource": [payload: { role: ElementColorRole; source: ElementColorSource }];
  "update:elementColorToken": [payload: { role: ElementColorRole; token: ThemeToken }];
  "update:elementColorCustom": [payload: { role: ElementColorRole; custom: string }];
  "update:baseFont": [value: BaseFont];
  "update:customBaseFontUrl": [value: string];
  "update:monoFont": [value: MonoFont];
  "update:customMonoFontUrl": [value: string];
  "update:directionOverride": [value: DirectionOverride];
  "update:subgraphStyle": [value: SubgraphStylePreset];
  "update:lineGeometry": [value: LineGeometry];
  "update:cornerStyle": [value: CornerStyle];
  "update:edgeLabelStyle": [value: EdgeLabelStylePreset];
  "update:edgePattern": [value: StrokePattern];
  "update:edgeWeight": [value: EdgeWeight];
  "update:borderPattern": [value: BorderPattern];
  "update:borderWeight": [value: BorderWeight];
  "update:textPaddingX": [value: number];
  "update:textPaddingY": [value: number];
  "update:textBoxBorderPadding": [value: number];
  "update:padding": [value: number];
  "update:nodeSpacing": [value: number];
  "update:layerSpacing": [value: number];
  "update:componentSpacing": [value: number];
  "reset:all": [];
  "reset:palette": [];
  "reset:layout": [];
  "reset:nodes": [];
  "reset:edges": [];
  "reset:system": [];
  "invalid:google-font-url": [];
}>();

const activeTab = ref<OptionsTab>("palette");
const optionsScrollHostRef = ref<HTMLElement | null>(null);
const optionsTabItems = computed(() =>
  tabs.map((tab) => {
    const scope = OPTIONS_TAB_SCOPE[tab.key];
    let inactive = false;
    let title = tab.label;
    if (scope !== "mixed" && !isScopeActive(scope)) {
      inactive = true;
      title = getScopeOnlyTitle(scope);
    }
    return {
      key: tab.key,
      label: tab.label,
      title,
      labelClass: inactive ? "inactive" : undefined,
    };
  }),
);
const directionSegmentActiveKey = computed<DirectionSegmentKey>(() =>
  props.directionOverride === "TD" ? "TB" : props.directionOverride,
);
const orderedElementColorRoles = computed(() => {
  const orderIndex = new Map(
    ELEMENT_COLOR_ROLE_DISPLAY_ORDER.map((role, index) => [role, index] as const),
  );
  const ordered = [...ELEMENT_COLOR_ROLES].sort((left, right) => {
    const leftOrder = orderIndex.get(left.role) ?? Number.POSITIVE_INFINITY;
    const rightOrder = orderIndex.get(right.role) ?? Number.POSITIVE_INFINITY;
    return leftOrder - rightOrder;
  });
  return ordered;
});

const BASE_FONT_FAMILY: Record<BaseFont, string> = {
  Inter: '"Inter", sans-serif',
  Geist: '"Geist", sans-serif',
  "Geist Mono": '"Geist Mono", monospace',
  "IBM Plex Sans": '"IBM Plex Sans", sans-serif',
  "IBM Plex Mono": '"IBM Plex Mono", monospace',
  Roboto: '"Roboto", sans-serif',
  "Roboto Mono": '"Roboto Mono", monospace',
  "Google Sans": '"Google Sans", sans-serif',
  "Google Sans Code": '"Google Sans Code", monospace',
  Lato: '"Lato", sans-serif',
  "JetBrains Mono": '"JetBrains Mono", monospace',
  Custom: "inherit",
};
const MONO_FONT_FAMILY: Record<MonoFont, string> = {
  "JetBrains Mono": '"JetBrains Mono", monospace',
  "Geist Mono": '"Geist Mono", monospace',
  "IBM Plex Mono": '"IBM Plex Mono", monospace',
  "Roboto Mono": '"Roboto Mono", monospace',
  "Google Sans Code": '"Google Sans Code", monospace',
  Custom: "monospace",
};
type CustomFontOption = {
  value: string;
  label: string;
  family: string;
  url: string;
};
type MonoFontOptionRemovalTarget = {
  token: number;
  url: string;
  family: string;
};
const CUSTOM_FONT_OPTION_VALUE = "__add_custom_font__";

const baseCustomInputRef = ref<HTMLInputElement | null>(null);
const monoCustomInputRef = ref<HTMLInputElement | null>(null);
const isBaseCustomInputMode = ref(false);
const isMonoCustomInputMode = ref(false);
const baseCustomInputValue = ref("");
const monoCustomInputValue = ref("");
const baseCustomFontOptions = ref<CustomFontOption[]>([]);
const monoCustomFontOptions = ref<CustomFontOption[]>([]);

const PRESET_BASE_FONT_OPTIONS = BASE_FONT_OPTIONS.filter((option) => option.value !== "Custom");
const PRESET_MONO_FONT_OPTIONS = MONO_FONT_OPTIONS.filter((option) => option.value !== "Custom");

function customFontOptionValue(url: string): string {
  return `custom:${encodeURIComponent(url)}`;
}

function normalizeFontKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function findPresetBaseFontByFamily(family: string): BaseFont | null {
  const key = normalizeFontKey(family);
  const matched = PRESET_BASE_FONT_OPTIONS.find((option) => {
    return normalizeFontKey(option.label) === key || normalizeFontKey(option.value) === key;
  });
  return (matched?.value as BaseFont | undefined) ?? null;
}

function findPresetMonoFontByFamily(family: string): MonoFont | null {
  const key = normalizeFontKey(family);
  const matched = PRESET_MONO_FONT_OPTIONS.find((option) => {
    return normalizeFontKey(option.label) === key || normalizeFontKey(option.value) === key;
  });
  return (matched?.value as MonoFont | undefined) ?? null;
}

function upsertCustomFontOption(target: CustomFontOption[], option: CustomFontOption): void {
  const normalizedFamily = option.family.trim().toLowerCase();
  const existingIndex = target.findIndex((item) => {
    const sameFamily = item.family.trim().toLowerCase() === normalizedFamily;
    const sameUrl = item.url === option.url;
    return sameFamily || sameUrl;
  });
  if (existingIndex >= 0) {
    target.splice(existingIndex, 1);
  }
  target.unshift(option);
}

function removeCustomFontOption(
  target: CustomFontOption[],
  urlValue: string,
  familyValue: string,
): void {
  const url = urlValue.trim();
  const family = familyValue.trim().toLowerCase();
  if (!url && !family) {
    return;
  }

  const targetIndex = target.findIndex((item) => {
    const sameUrl = url.length > 0 && item.url === url;
    const sameFamily = family.length > 0 && item.family.trim().toLowerCase() === family;
    return sameUrl || sameFamily;
  });
  if (targetIndex >= 0) {
    target.splice(targetIndex, 1);
  }
}

function createCustomFontOption(url: string, family: string): CustomFontOption {
  const normalizedFamily = family.trim();
  return {
    value: customFontOptionValue(url),
    label: normalizedFamily,
    family: normalizedFamily,
    url,
  };
}

function syncCustomFontOption(
  target: CustomFontOption[],
  urlValue: string,
  familyValue: string,
  options: "base" | "mono",
): void {
  const url = urlValue.trim();
  const family = familyValue.trim();
  if (!url || !family) {
    return;
  }

  if (options === "base" && findPresetBaseFontByFamily(family)) {
    return;
  }

  if (options === "mono" && findPresetMonoFontByFamily(family)) {
    return;
  }

  upsertCustomFontOption(target, createCustomFontOption(url, family));
}

const baseFontOptions = computed(() => [
  ...PRESET_BASE_FONT_OPTIONS,
  ...baseCustomFontOptions.value,
]);

const monoFontOptions = computed(() => [
  ...PRESET_MONO_FONT_OPTIONS,
  ...monoCustomFontOptions.value,
]);

const baseFontSelectValue = computed(() => {
  if (props.baseFont !== "Custom") {
    return props.baseFont;
  }

  const matchedOption =
    baseCustomFontOptions.value.find((option) => option.url === props.customBaseFontUrl) ??
    baseCustomFontOptions.value.find(
      (option) => option.family === props.customBaseFontFamily.trim(),
    );
  return matchedOption?.value ?? CUSTOM_FONT_OPTION_VALUE;
});

const monoFontSelectValue = computed(() => {
  if (props.monoFont !== "Custom") {
    return props.monoFont;
  }

  const matchedOption =
    monoCustomFontOptions.value.find((option) => option.url === props.customMonoFontUrl) ??
    monoCustomFontOptions.value.find(
      (option) => option.family === props.customMonoFontFamily.trim(),
    );
  return matchedOption?.value ?? CUSTOM_FONT_OPTION_VALUE;
});

type ThemeChannels = {
  bg: string;
  fg: string;
  line?: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

function parseHexColor(color: string): RgbColor | null {
  const normalized = color.trim().replace("#", "");
  if (!/^[\da-f]{3}([\da-f]{3})?$/iu.test(normalized)) {
    return null;
  }

  if (normalized.length === 3) {
    const [r, g, b] = normalized.split("");
    if (!r || !g || !b) {
      return null;
    }

    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
    };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function formatHexColor(rgb: RgbColor): string {
  const toHex = (value: number): string => value.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixFrom(base: ThemeChannels, percent: number): string {
  const fg = parseHexColor(base.fg);
  const bg = parseHexColor(base.bg);
  if (!fg || !bg) {
    return `color-mix(in srgb, ${base.fg} ${percent}%, ${base.bg})`;
  }

  const alpha = percent / 100;
  const mixed: RgbColor = {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  };

  return formatHexColor(mixed);
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

const resolvedRolePalette = computed(() => {
  const theme = resolveDiagramThemeTokens(props.diagramTheme);
  const effectiveTheme: ThemeChannels = {
    ...theme,
    bg: props.useCustomBg ? props.customBg : theme.bg,
    fg: props.useCustomFg ? props.customFg : theme.fg,
  };
  const normalized = normalizeThemeChannels(effectiveTheme);

  const baseLine = normalized.line ?? mixFrom(normalized, 50);
  const baseAccent = normalized.accent ?? mixFrom(normalized, 85);
  const baseMuted = normalized.muted ?? mixFrom(normalized, 40);
  const baseSurface = normalized.surface ?? mixFrom(normalized, 3);
  const baseBorder = normalized.border ?? mixFrom(normalized, 20);

  return {
    background: normalized.bg,
    foreground: normalized.fg,
    baseLine,
    baseAccent,
    baseMuted,
    baseSurface,
    baseBorder,
    line: props.useCustomLine ? props.customLine : baseLine,
    accent: props.useCustomAccent ? props.customAccent : baseAccent,
    muted: props.useCustomMuted ? props.customMuted : baseMuted,
    surface: props.useCustomSurface ? props.customSurface : baseSurface,
    border: props.useCustomBorder ? props.customBorder : baseBorder,
  };
});

useOverlayScrollbars(optionsScrollHostRef, {
  overflow: {
    x: "hidden",
    y: "scroll",
  },
});

function getSelectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}

function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function updateCustomBgColor(value: string): void {
  emit("update:customBg", value);
}

function updateCustomFgColor(value: string): void {
  emit("update:customFg", value);
}

function toggleCustomBg(enabled: boolean): void {
  if (enabled) {
    emit("update:customBg", resolvedRolePalette.value.background);
  }
  emit("update:useCustomBg", enabled);
}

function toggleCustomFg(enabled: boolean): void {
  if (enabled) {
    emit("update:customFg", resolvedRolePalette.value.foreground);
  }
  emit("update:useCustomFg", enabled);
}

function toggleCustomLine(enabled: boolean): void {
  if (enabled) {
    emit("update:customLine", resolvedRolePalette.value.baseLine);
  }
  emit("update:useCustomLine", enabled);
}

function toggleCustomAccent(enabled: boolean): void {
  if (enabled) {
    emit("update:customAccent", resolvedRolePalette.value.baseAccent);
  }
  emit("update:useCustomAccent", enabled);
}

function toggleCustomMuted(enabled: boolean): void {
  if (enabled) {
    emit("update:customMuted", resolvedRolePalette.value.baseMuted);
  }
  emit("update:useCustomMuted", enabled);
}

function toggleCustomSurface(enabled: boolean): void {
  if (enabled) {
    emit("update:customSurface", resolvedRolePalette.value.baseSurface);
  }
  emit("update:useCustomSurface", enabled);
}

function toggleCustomBorder(enabled: boolean): void {
  if (enabled) {
    emit("update:customBorder", resolvedRolePalette.value.baseBorder);
  }
  emit("update:useCustomBorder", enabled);
}

function lookupCustomFontOption(
  value: string,
  options: CustomFontOption[],
): CustomFontOption | null {
  return options.find((option) => option.value === value) ?? null;
}

function resolveBaseFontPreviewFamily(value: string): string {
  const customOption = lookupCustomFontOption(value, baseCustomFontOptions.value);
  if (customOption) {
    return `"${customOption.family.replace(/"/g, "")}", sans-serif`;
  }

  if (value === "Custom") {
    const family = props.customBaseFontFamily.trim().replace(/"/g, "");
    return family ? `"${family}", sans-serif` : "inherit";
  }

  return BASE_FONT_FAMILY[value as BaseFont] ?? "inherit";
}

function resolveMonoFontPreviewFamily(value: string): string {
  const customOption = lookupCustomFontOption(value, monoCustomFontOptions.value);
  if (customOption) {
    return `"${customOption.family.replace(/"/g, "")}", monospace`;
  }

  if (value === "Custom") {
    const family = props.customMonoFontFamily.trim().replace(/"/g, "");
    return family ? `"${family}", monospace` : "monospace";
  }

  return MONO_FONT_FAMILY[value as MonoFont] ?? "monospace";
}

function getBaseFontStyle(value: string): { fontFamily: string } {
  return { fontFamily: resolveBaseFontPreviewFamily(value) };
}

function getMonoFontStyle(value: string): { fontFamily: string } {
  return { fontFamily: resolveMonoFontPreviewFamily(value) };
}

function getBaseFontLabel(optionValue: string, fallback: string): string {
  const customOption = lookupCustomFontOption(optionValue, baseCustomFontOptions.value);
  if (customOption) {
    return customOption.label;
  }

  if (optionValue === "Custom" && props.customBaseFontFamily.trim().length > 0) {
    return props.customBaseFontFamily.trim();
  }

  return fallback;
}

function getMonoFontLabel(optionValue: string, fallback: string): string {
  const customOption = lookupCustomFontOption(optionValue, monoCustomFontOptions.value);
  if (customOption) {
    return customOption.label;
  }

  if (optionValue === "Custom" && props.customMonoFontFamily.trim().length > 0) {
    return props.customMonoFontFamily.trim();
  }

  return fallback;
}

function finishBaseCustomInputMode(): void {
  isBaseCustomInputMode.value = false;
  baseCustomInputValue.value = "";
}

function finishMonoCustomInputMode(): void {
  isMonoCustomInputMode.value = false;
  monoCustomInputValue.value = "";
}

function tryApplyCustomBaseFont(rawValue: string): boolean {
  const parsed = parseGoogleFontsInput(rawValue);
  const family = parsed?.primaryFamily?.trim() ?? "";
  if (!parsed || !family) {
    return false;
  }

  const preset = findPresetBaseFontByFamily(family);
  if (preset) {
    emit("update:customBaseFontUrl", "");
    emit("update:baseFont", preset);
    finishBaseCustomInputMode();
    return true;
  }

  upsertCustomFontOption(
    baseCustomFontOptions.value,
    createCustomFontOption(parsed.sourceUrl, family),
  );
  emit("update:customBaseFontUrl", parsed.sourceUrl);
  emit("update:baseFont", "Custom");
  finishBaseCustomInputMode();
  return true;
}

function tryApplyCustomMonoFont(rawValue: string): boolean {
  const parsed = parseGoogleFontsInput(rawValue);
  const family = parsed?.primaryFamily?.trim() ?? "";
  if (!parsed || !family) {
    return false;
  }

  const preset = findPresetMonoFontByFamily(family);
  if (preset) {
    emit("update:customMonoFontUrl", "");
    emit("update:monoFont", preset);
    finishMonoCustomInputMode();
    return true;
  }

  upsertCustomFontOption(
    monoCustomFontOptions.value,
    createCustomFontOption(parsed.sourceUrl, family),
  );
  emit("update:customMonoFontUrl", parsed.sourceUrl);
  emit("update:monoFont", "Custom");
  finishMonoCustomInputMode();
  return true;
}

function notifyInvalidGoogleFontsUrl(): void {
  emit("invalid:google-font-url");
}

function beginBaseCustomInputMode(): void {
  if (props.isBaseCustomFontLoading) {
    return;
  }

  isBaseCustomInputMode.value = true;
  baseCustomInputValue.value = "";
  nextTick(() => baseCustomInputRef.value?.focus());
}

function beginMonoCustomInputMode(): void {
  if (props.isMonoCustomFontLoading) {
    return;
  }

  isMonoCustomInputMode.value = true;
  monoCustomInputValue.value = "";
  nextTick(() => monoCustomInputRef.value?.focus());
}

function onBaseFontChange(event: Event): void {
  if (props.isBaseCustomFontLoading) {
    return;
  }

  const value = getSelectValue(event);
  if (value === CUSTOM_FONT_OPTION_VALUE) {
    beginBaseCustomInputMode();
    return;
  }

  const customOption = lookupCustomFontOption(value, baseCustomFontOptions.value);
  if (customOption) {
    emit("update:customBaseFontUrl", customOption.url);
    emit("update:baseFont", "Custom");
    return;
  }

  if (value in BASE_FONT_FAMILY) {
    emit("update:baseFont", value as BaseFont);
  }
}

function onMonoFontChange(event: Event): void {
  if (props.isMonoCustomFontLoading) {
    return;
  }

  const value = getSelectValue(event);
  if (value === CUSTOM_FONT_OPTION_VALUE) {
    beginMonoCustomInputMode();
    return;
  }

  const customOption = lookupCustomFontOption(value, monoCustomFontOptions.value);
  if (customOption) {
    emit("update:customMonoFontUrl", customOption.url);
    emit("update:monoFont", "Custom");
    return;
  }

  if (value in MONO_FONT_FAMILY) {
    emit("update:monoFont", value as MonoFont);
  }
}

function onBaseCustomFontInput(event: Event): void {
  if (props.isBaseCustomFontLoading) {
    return;
  }

  const value = getInputValue(event).trim();
  baseCustomInputValue.value = value;
  if (!value) {
    return;
  }

  if (!tryApplyCustomBaseFont(value)) {
    notifyInvalidGoogleFontsUrl();
    baseCustomInputValue.value = "";
  }
}

function onMonoCustomFontInput(event: Event): void {
  if (props.isMonoCustomFontLoading) {
    return;
  }

  const value = getInputValue(event).trim();
  monoCustomInputValue.value = value;
  if (!value) {
    return;
  }

  if (!tryApplyCustomMonoFont(value)) {
    notifyInvalidGoogleFontsUrl();
    monoCustomInputValue.value = "";
  }
}

function onBaseCustomFontKeydown(event: KeyboardEvent): void {
  if (props.isBaseCustomFontLoading) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const value = baseCustomInputValue.value.trim();
    if (!value) {
      return;
    }

    if (!tryApplyCustomBaseFont(value)) {
      notifyInvalidGoogleFontsUrl();
      baseCustomInputValue.value = "";
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    finishBaseCustomInputMode();
  }
}

function onMonoCustomFontKeydown(event: KeyboardEvent): void {
  if (props.isMonoCustomFontLoading) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const value = monoCustomInputValue.value.trim();
    if (!value) {
      return;
    }

    if (!tryApplyCustomMonoFont(value)) {
      notifyInvalidGoogleFontsUrl();
      monoCustomInputValue.value = "";
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    finishMonoCustomInputMode();
  }
}

function onBaseCustomFontPaste(event: ClipboardEvent): void {
  if (props.isBaseCustomFontLoading) {
    return;
  }

  const text = event.clipboardData?.getData("text") ?? "";
  if (!text.trim()) {
    return;
  }

  event.preventDefault();
  if (!tryApplyCustomBaseFont(text)) {
    notifyInvalidGoogleFontsUrl();
    baseCustomInputValue.value = "";
  }
}

function onMonoCustomFontPaste(event: ClipboardEvent): void {
  if (props.isMonoCustomFontLoading) {
    return;
  }

  const text = event.clipboardData?.getData("text") ?? "";
  if (!text.trim()) {
    return;
  }

  event.preventDefault();
  if (!tryApplyCustomMonoFont(text)) {
    notifyInvalidGoogleFontsUrl();
    monoCustomInputValue.value = "";
  }
}

function onBaseCustomFontBlur(): void {
  if (props.isBaseCustomFontLoading) {
    return;
  }

  if (baseCustomInputValue.value.trim().length === 0) {
    finishBaseCustomInputMode();
  }
}

function onMonoCustomFontBlur(): void {
  if (props.isMonoCustomFontLoading) {
    return;
  }

  if (monoCustomInputValue.value.trim().length === 0) {
    finishMonoCustomInputMode();
  }
}

watch(
  () => [props.customBaseFontUrl, props.customBaseFontFamily],
  ([url = "", family = ""]) => {
    syncCustomFontOption(baseCustomFontOptions.value, url, family, "base");
  },
  { immediate: true },
);

watch(
  () => [props.customMonoFontUrl, props.customMonoFontFamily],
  ([url = "", family = ""]) => {
    syncCustomFontOption(monoCustomFontOptions.value, url, family, "mono");
  },
  { immediate: true },
);

watch(
  () => props.monoFontOptionRemovalTarget?.token,
  () => {
    const removalTarget = props.monoFontOptionRemovalTarget;
    if (!removalTarget) {
      return;
    }

    removeCustomFontOption(monoCustomFontOptions.value, removalTarget.url, removalTarget.family);
  },
  { immediate: true },
);

watch(
  () => props.baseFont,
  (nextFont) => {
    if (nextFont !== "Custom" && isBaseCustomInputMode.value) {
      finishBaseCustomInputMode();
    }
  },
);

watch(
  () => props.monoFont,
  (nextFont) => {
    if (nextFont !== "Custom" && isMonoCustomInputMode.value) {
      finishMonoCustomInputMode();
    }
  },
);

function onNumberInput(
  event: Event,
  key:
    | "padding"
    | "nodeSpacing"
    | "layerSpacing"
    | "componentSpacing"
    | "textPaddingX"
    | "textPaddingY"
    | "textBoxBorderPadding",
): void {
  const next = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(next)) {
    return;
  }

  if (key === "padding") {
    emit("update:padding", next);
    return;
  }

  if (key === "nodeSpacing") {
    emit("update:nodeSpacing", next);
    return;
  }

  if (key === "layerSpacing") {
    emit("update:layerSpacing", next);
    return;
  }

  if (key === "componentSpacing") {
    emit("update:componentSpacing", next);
    return;
  }

  if (key === "textPaddingX") {
    emit("update:textPaddingX", next);
    return;
  }

  if (key === "textPaddingY") {
    emit("update:textPaddingY", next);
    return;
  }

  if (key === "textBoxBorderPadding") {
    emit("update:textBoxBorderPadding", next);
  }
}

function onOptionsTabSelect(value: string): void {
  activeTab.value = value as OptionsTab;
}

function isDirectionSegmentKey(value: string): value is DirectionSegmentKey {
  return (
    value === "default" || value === "TB" || value === "LR" || value === "RL" || value === "BT"
  );
}

function onDirectionSegmentSelect(value: string): void {
  if (!isDirectionSegmentKey(value)) {
    return;
  }

  emit("update:directionOverride", value);
}

function onCornerStyleSelect(value: string): void {
  if (
    value !== "default" &&
    value !== "sharp" &&
    value !== "soft" &&
    value !== "rounded" &&
    value !== "pill"
  ) {
    return;
  }

  emit("update:cornerStyle", value as CornerStyle);
}

function onBorderPatternSelect(value: string): void {
  if (value !== "default" && value !== "solid" && value !== "dashed" && value !== "dotted") {
    return;
  }

  emit("update:borderPattern", value as BorderPattern);
}

function onBorderWeightSelect(value: string): void {
  if (value !== "default" && value !== "normal" && value !== "bold" && value !== "heavy") {
    return;
  }

  emit("update:borderWeight", value as BorderWeight);
}

function onLineGeometrySelect(value: string): void {
  if (value !== "default" && value !== "orthogonal" && value !== "rounded") {
    return;
  }

  emit("update:lineGeometry", value as LineGeometry);
}

function onEdgePatternSelect(value: string): void {
  if (value !== "default" && value !== "solid" && value !== "dashed" && value !== "dotted") {
    return;
  }

  emit("update:edgePattern", value as StrokePattern);
}

function onEdgeWeightSelect(value: string): void {
  if (value !== "default" && value !== "normal" && value !== "bold" && value !== "heavy") {
    return;
  }

  emit("update:edgeWeight", value as EdgeWeight);
}

function onEdgeLabelStyleChange(event: Event): void {
  const value = getSelectValue(event);
  if (
    value !== "default" &&
    value !== "minimal" &&
    value !== "subtle" &&
    value !== "pill" &&
    value !== "contrast" &&
    value !== "accent"
  ) {
    return;
  }

  emit("update:edgeLabelStyle", value as EdgeLabelStylePreset);
}

function resetAllOptions(): void {
  emit("reset:all");
}

function resetActiveTab(): void {
  if (activeTab.value === "palette") {
    emit("reset:palette");
    return;
  }

  if (activeTab.value === "layout") {
    emit("reset:layout");
    return;
  }

  if (activeTab.value === "nodes") {
    emit("reset:nodes");
    return;
  }

  if (activeTab.value === "edges") {
    emit("reset:edges");
    return;
  }

  emit("reset:system");
}

function onResetMenuSelect(value: string): void {
  if (value === "reset-all") {
    resetAllOptions();
    return;
  }

  if (value === "reset-current-tab") {
    resetActiveTab();
  }
}

function isThemeToken(value: string): value is ThemeToken {
  return THEME_TOKENS.includes(value as ThemeToken);
}

function getTokenValue(token: ThemeToken): string {
  if (token === "bg") {
    return resolvedRolePalette.value.background;
  }
  if (token === "fg") {
    return resolvedRolePalette.value.foreground;
  }
  if (token === "line") {
    return resolvedRolePalette.value.line;
  }
  if (token === "accent") {
    return resolvedRolePalette.value.accent;
  }
  if (token === "muted") {
    return resolvedRolePalette.value.muted;
  }
  if (token === "surface") {
    return resolvedRolePalette.value.surface;
  }
  return resolvedRolePalette.value.border;
}

function getElementAutoColor(role: ElementColorRole): string {
  const base: ThemeChannels = {
    bg: resolvedRolePalette.value.background,
    fg: resolvedRolePalette.value.foreground,
  };

  if (role === "text") {
    return resolvedRolePalette.value.foreground;
  }
  if (role === "arrowHeads") {
    return resolvedRolePalette.value.accent;
  }
  if (role === "secondaryText") {
    return mixFrom(base, 60);
  }
  if (role === "edgeLabels") {
    return mixFrom(base, 40);
  }
  if (role === "faintText") {
    return mixFrom(base, 25);
  }
  if (role === "connectors") {
    return mixFrom(base, 50);
  }
  if (role === "nodeFill") {
    return mixFrom(base, 3);
  }
  if (role === "groupHeader") {
    return mixFrom(base, 5);
  }
  if (role === "innerStrokes") {
    return mixFrom(base, 12);
  }
  if (role === "nodeStroke") {
    return mixFrom(base, 20);
  }
  return resolvedRolePalette.value.foreground;
}

function getElementRuleSelectValue(role: ElementColorRole): string {
  const rule = props.elementColors[role];
  if (rule.source === "none") {
    return "default";
  }
  return rule.source === "token" ? rule.token : rule.source;
}

function getElementOptionSwatchColor(role: ElementColorRole, value: string): string {
  if (value === "default") {
    return getElementAutoColor(role);
  }

  if (value === "custom") {
    return props.elementColors[role].custom;
  }

  if (value === "none") {
    return "transparent";
  }

  if (isThemeToken(value)) {
    return getTokenValue(value);
  }

  return getElementAutoColor(role);
}

function getElementColorOptions(): TokenColorOption[] {
  return [
    { label: "Default", value: "default", group: "mode" },
    { label: "Custom", value: "custom", group: "mode" },
    ...THEME_TOKENS.map((token) => ({
      label: token,
      value: token,
      isToken: true,
      group: "token" as const,
    })),
  ];
}

function onElementSelectValueChange(role: ElementColorRole, value: string): void {
  if (isThemeToken(value)) {
    emit("update:elementColorSource", { role, source: "token" });
    emit("update:elementColorToken", { role, token: value });
    return;
  }

  if (value === "custom") {
    emit("update:elementColorSource", { role, source: "custom" });
    return;
  }

  emit("update:elementColorSource", { role, source: "default" });
}

function onElementCustomColorChange(role: ElementColorRole, custom: string): void {
  emit("update:elementColorCustom", { role, custom });
}

function getElementSwatchColorGetter(role: ElementColorRole): (value: string) => string {
  return (value: string) => getElementOptionSwatchColor(role, value);
}

function isScopeActive(scope: ElementColorScope): boolean {
  if (scope === "both") {
    return true;
  }

  if (scope === "svg") {
    return props.outputMode === "svg";
  }

  return props.outputMode !== "svg";
}

function getScopeOnlyTitle(scope: Exclude<ElementColorScope, "both">): string {
  return scope === "svg" ? "Applies to SVG output only" : "Applies to Unicode/ASCII output only";
}

function getScopeInactiveTitle(scope: ElementColorScope): string | undefined {
  if (scope === "both" || isScopeActive(scope)) {
    return undefined;
  }

  return getScopeOnlyTitle(scope);
}
</script>

<template>
  <BasePanel class="options-panel" title="Options" aria-label="Options panel">
    <template #info>
      <BaseDropdownMenu
        aria-label="Reset options"
        menu-label="Reset options menu"
        :items="RESET_MENU_ITEMS"
        :icon-only="true"
        trigger-icon="ellipsis"
        @select="onResetMenuSelect"
      />
    </template>

    <div class="options-layout">
      <div class="options-tabs-wrap">
        <BaseSegmentedControl
          class="options-tabs"
          :items="optionsTabItems"
          :active-key="activeTab"
          :as-tabs="true"
          aria-label="Options groups"
          @select="onOptionsTabSelect"
        />
      </div>

      <div ref="optionsScrollHostRef" class="options-content" data-overlayscrollbars-initialize>
        <div v-if="activeTab === 'palette'" class="setting-list">
          <section class="setting-section">
            <header class="section-header">
              <p class="section-title">Tokens</p>
            </header>

            <div class="channel-row">
              <label for="bg-token-toggle" class="token-key">bg</label>
              <BaseCheckbox
                id="bg-token-toggle"
                :model-value="props.useCustomBg"
                aria-label="Toggle bg token override"
                @update:model-value="toggleCustomBg"
              />
              <BaseColorPicker
                class="channel-picker"
                :model-value="props.useCustomBg ? props.customBg : resolvedRolePalette.background"
                :disabled="!props.useCustomBg"
                aria-label="Pick bg color"
                @update:model-value="updateCustomBgColor"
              />
            </div>

            <div class="channel-row">
              <label for="fg-token-toggle" class="token-key">fg</label>
              <BaseCheckbox
                id="fg-token-toggle"
                :model-value="props.useCustomFg"
                aria-label="Toggle fg token override"
                @update:model-value="toggleCustomFg"
              />
              <BaseColorPicker
                class="channel-picker"
                :model-value="props.useCustomFg ? props.customFg : resolvedRolePalette.foreground"
                :disabled="!props.useCustomFg"
                aria-label="Pick fg color"
                @update:model-value="updateCustomFgColor"
              />
            </div>
            <div class="channel-row">
              <label for="line-channel-toggle" class="token-key">line</label>
              <BaseCheckbox
                id="line-channel-toggle"
                :model-value="props.useCustomLine"
                aria-label="Toggle line token override"
                @update:model-value="toggleCustomLine"
              />
              <BaseColorPicker
                class="channel-picker"
                :model-value="props.useCustomLine ? props.customLine : resolvedRolePalette.baseLine"
                :disabled="!props.useCustomLine"
                aria-label="Pick line color"
                @update:model-value="emit('update:customLine', $event)"
              />
            </div>

            <div class="channel-row">
              <label for="accent-channel-toggle" class="token-key">accent</label>
              <BaseCheckbox
                id="accent-channel-toggle"
                :model-value="props.useCustomAccent"
                aria-label="Toggle accent token override"
                @update:model-value="toggleCustomAccent"
              />
              <BaseColorPicker
                class="channel-picker"
                :model-value="
                  props.useCustomAccent ? props.customAccent : resolvedRolePalette.baseAccent
                "
                :disabled="!props.useCustomAccent"
                aria-label="Pick accent color"
                @update:model-value="emit('update:customAccent', $event)"
              />
            </div>

            <div class="channel-row">
              <label
                for="muted-channel-toggle"
                class="token-label"
                :class="{ 'scope-inactive': !isScopeActive('svg') }"
                :title="getScopeInactiveTitle('svg')"
              >
                <span class="token-key">muted</span>
              </label>
              <BaseCheckbox
                id="muted-channel-toggle"
                :model-value="props.useCustomMuted"
                aria-label="Toggle muted token override"
                @update:model-value="toggleCustomMuted"
              />
              <BaseColorPicker
                class="channel-picker"
                :model-value="
                  props.useCustomMuted ? props.customMuted : resolvedRolePalette.baseMuted
                "
                :disabled="!props.useCustomMuted"
                aria-label="Pick muted color"
                @update:model-value="emit('update:customMuted', $event)"
              />
            </div>

            <div class="channel-row">
              <label
                for="surface-channel-toggle"
                class="token-label"
                :class="{ 'scope-inactive': !isScopeActive('svg') }"
                :title="getScopeInactiveTitle('svg')"
              >
                <span class="token-key">surface</span>
              </label>
              <BaseCheckbox
                id="surface-channel-toggle"
                :model-value="props.useCustomSurface"
                aria-label="Toggle surface token override"
                @update:model-value="toggleCustomSurface"
              />
              <BaseColorPicker
                class="channel-picker"
                :model-value="
                  props.useCustomSurface ? props.customSurface : resolvedRolePalette.baseSurface
                "
                :disabled="!props.useCustomSurface"
                aria-label="Pick surface color"
                @update:model-value="emit('update:customSurface', $event)"
              />
            </div>

            <div class="channel-row">
              <label for="border-channel-toggle" class="token-key">border</label>
              <BaseCheckbox
                id="border-channel-toggle"
                :model-value="props.useCustomBorder"
                aria-label="Toggle border token override"
                @update:model-value="toggleCustomBorder"
              />
              <BaseColorPicker
                class="channel-picker"
                :model-value="
                  props.useCustomBorder ? props.customBorder : resolvedRolePalette.baseBorder
                "
                :disabled="!props.useCustomBorder"
                aria-label="Pick border color"
                @update:model-value="emit('update:customBorder', $event)"
              />
            </div>
          </section>

          <section class="setting-section">
            <header class="section-header">
              <p class="section-title">Elements</p>
            </header>
            <label
              v-for="roleMeta in orderedElementColorRoles"
              :key="roleMeta.role"
              class="setting-row element-setting-row"
            >
              <span
                class="setting-row-label"
                :class="{ 'scope-inactive': !isScopeActive(roleMeta.scope) }"
                :title="getScopeInactiveTitle(roleMeta.scope)"
              >
                <span>{{ roleMeta.label }}</span>
              </span>
              <TokenColorSelect
                :model-value="getElementRuleSelectValue(roleMeta.role)"
                :custom-value="props.elementColors[roleMeta.role].custom"
                :options="getElementColorOptions()"
                :swatch-color-for-value="getElementSwatchColorGetter(roleMeta.role)"
                @update:model-value="onElementSelectValueChange(roleMeta.role, $event)"
                @update:custom-value="onElementCustomColorChange(roleMeta.role, $event)"
              />
            </label>
          </section>
        </div>

        <div v-else-if="activeTab === 'layout'" class="setting-list">
          <div class="setting-row direction-row">
            <span>Direction</span>
            <BaseSegmentedControl
              class="direction-control"
              :items="directionSegmentItems"
              :active-key="directionSegmentActiveKey"
              aria-label="Diagram direction"
              @select="onDirectionSegmentSelect"
            />
          </div>

          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Padding</span>
            </span>
            <input
              type="number"
              min="0"
              max="240"
              step="2"
              :value="props.padding"
              @input="onNumberInput($event, 'padding')"
            />
          </label>

          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Node gap</span>
            </span>
            <input
              type="number"
              min="4"
              max="200"
              step="2"
              :value="props.nodeSpacing"
              @input="onNumberInput($event, 'nodeSpacing')"
            />
          </label>

          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Layer gap</span>
            </span>
            <input
              type="number"
              min="4"
              max="240"
              step="2"
              :value="props.layerSpacing"
              @input="onNumberInput($event, 'layerSpacing')"
            />
          </label>

          <label v-if="SHOW_COMPONENT_GAP_CONTROL" class="setting-row">
            <span>Component gap</span>
            <input
              type="number"
              min="4"
              max="260"
              step="2"
              :value="props.componentSpacing"
              @input="onNumberInput($event, 'componentSpacing')"
            />
          </label>

          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('text') }"
              :title="getScopeInactiveTitle('text')"
            >
              <span>Padding X</span>
            </span>
            <input
              type="number"
              min="0"
              max="60"
              step="1"
              :value="props.textPaddingX"
              @input="onNumberInput($event, 'textPaddingX')"
            />
          </label>

          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('text') }"
              :title="getScopeInactiveTitle('text')"
            >
              <span>Padding Y</span>
            </span>
            <input
              type="number"
              min="0"
              max="60"
              step="1"
              :value="props.textPaddingY"
              @input="onNumberInput($event, 'textPaddingY')"
            />
          </label>

          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('text') }"
              :title="getScopeInactiveTitle('text')"
            >
              <span>Box padding</span>
            </span>
            <input
              type="number"
              min="0"
              max="24"
              step="1"
              :value="props.textBoxBorderPadding"
              @input="onNumberInput($event, 'textBoxBorderPadding')"
            />
          </label>
        </div>

        <div v-else-if="activeTab === 'nodes'" class="setting-list">
          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Subgraph</span>
            </span>
            <BaseSelect
              :value="props.subgraphStyle"
              @change="emit('update:subgraphStyle', getSelectValue($event) as SubgraphStylePreset)"
            >
              <option v-for="item in SUBGRAPH_STYLE_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </BaseSelect>
          </label>

          <div class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Corner</span>
            </span>
            <BaseSegmentedControl
              class="corner-control"
              :items="cornerStyleItems"
              :active-key="props.cornerStyle"
              aria-label="Corner style"
              @select="onCornerStyleSelect"
            />
          </div>

          <div class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Border pattern</span>
            </span>
            <BaseSegmentedControl
              class="border-pattern-control"
              :items="borderPatternItems"
              :active-key="props.borderPattern"
              aria-label="Node border pattern"
              @select="onBorderPatternSelect"
            />
          </div>

          <div class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Border weight</span>
            </span>
            <BaseSegmentedControl
              class="border-weight-control"
              :items="borderWeightItems"
              :active-key="props.borderWeight"
              aria-label="Node border weight"
              @select="onBorderWeightSelect"
            />
          </div>
        </div>

        <div v-else-if="activeTab === 'edges'" class="setting-list">
          <div class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Routing</span>
            </span>
            <BaseSegmentedControl
              class="edge-geometry-control"
              :items="edgeGeometryItems"
              :active-key="props.lineGeometry"
              aria-label="Edge geometry"
              @select="onLineGeometrySelect"
            />
          </div>

          <div class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Pattern</span>
            </span>
            <BaseSegmentedControl
              class="edge-pattern-control"
              :items="edgePatternItems"
              :active-key="props.edgePattern"
              aria-label="Edge pattern"
              @select="onEdgePatternSelect"
            />
          </div>

          <div class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Weight</span>
            </span>
            <BaseSegmentedControl
              class="edge-weight-control"
              :items="edgeWeightItems"
              :active-key="props.edgeWeight"
              aria-label="Edge weight"
              @select="onEdgeWeightSelect"
            />
          </div>

          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Label</span>
            </span>
            <BaseSelect :value="props.edgeLabelStyle" @change="onEdgeLabelStyleChange">
              <option
                v-for="item in EDGE_LABEL_STYLE_OPTIONS"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </BaseSelect>
          </label>
        </div>

        <div v-else class="setting-list">
          <label class="setting-row">
            <span
              class="setting-row-label"
              :class="{ 'scope-inactive': !isScopeActive('svg') }"
              :title="getScopeInactiveTitle('svg')"
            >
              <span>Base font</span>
            </span>
            <BaseSelect
              v-if="!isBaseCustomInputMode"
              :value="baseFontSelectValue"
              :disabled="props.isBaseCustomFontLoading"
              @change="onBaseFontChange"
            >
              <option v-for="item in baseFontOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
              <option :value="CUSTOM_FONT_OPTION_VALUE">Custom</option>
              <template #selected="{ option, label }">
                <span :style="option ? getBaseFontStyle(option.value) : undefined">
                  {{ option ? getBaseFontLabel(option.value, label) : label }}
                </span>
              </template>
              <template #option="{ option }">
                <span :style="getBaseFontStyle(option.value)">
                  {{ getBaseFontLabel(option.value, option.label) }}
                </span>
              </template>
            </BaseSelect>
            <input
              v-else
              ref="baseCustomInputRef"
              type="text"
              class="font-custom-input"
              :value="baseCustomInputValue"
              :disabled="props.isBaseCustomFontLoading"
              placeholder="Paste Google Fonts URL..."
              @input="onBaseCustomFontInput"
              @keydown="onBaseCustomFontKeydown"
              @paste="onBaseCustomFontPaste"
              @blur="onBaseCustomFontBlur"
            />
          </label>

          <label class="setting-row">
            <span>Mono font</span>
            <BaseSelect
              v-if="!isMonoCustomInputMode"
              :value="monoFontSelectValue"
              :disabled="props.isMonoCustomFontLoading"
              @change="onMonoFontChange"
            >
              <option v-for="item in monoFontOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
              <option :value="CUSTOM_FONT_OPTION_VALUE">Custom</option>
              <template #selected="{ option, label }">
                <span :style="option ? getMonoFontStyle(option.value) : undefined">
                  {{ option ? getMonoFontLabel(option.value, label) : label }}
                </span>
              </template>
              <template #option="{ option }">
                <span :style="getMonoFontStyle(option.value)">
                  {{ getMonoFontLabel(option.value, option.label) }}
                </span>
              </template>
            </BaseSelect>
            <input
              v-else
              ref="monoCustomInputRef"
              type="text"
              class="font-custom-input"
              :value="monoCustomInputValue"
              :disabled="props.isMonoCustomFontLoading"
              placeholder="Paste Google Fonts URL..."
              @input="onMonoCustomFontInput"
              @keydown="onMonoCustomFontKeydown"
              @paste="onMonoCustomFontPaste"
              @blur="onMonoCustomFontBlur"
            />
          </label>
        </div>
      </div>
    </div>
  </BasePanel>
</template>

<style scoped>
.options-panel {
  width: 100%;
  height: 100%;
}

.options-layout {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.options-tabs-wrap {
  margin: 0.56rem 0.64rem 0.34rem;
  width: max-content;
  max-width: calc(100% - 1.28rem);
  justify-self: start;
}

.options-tabs {
  margin: 0;
}

.options-content {
  min-height: 0;
  overflow: auto;
  padding: 0.02rem 0.64rem 0.9rem;
}

.setting-list {
  display: grid;
  gap: 0.5rem;
}

.setting-section {
  display: grid;
  gap: 0.24rem;
  padding: 0.32rem 0 1.02rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 78%, transparent);
}

.setting-section:last-of-type {
  border-bottom: 0;
  padding-bottom: 0.5rem;
}

.section-title {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--text-muted);
  letter-spacing: 0;
  text-transform: none;
  font-weight: 540;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  margin: 0 0 0.16rem;
}

.section-reset {
  color: var(--text-muted);
}

.setting-row,
.channel-row {
  min-height: 29px;
  display: grid;
  align-items: center;
  gap: 0.5rem;
  padding: 0.08rem 0;
}

.setting-row {
  grid-template-columns: minmax(0, 1fr) max-content;
  cursor: default;
}

.element-setting-row {
  grid-template-columns: max-content minmax(0, 1fr);
}

.direction-control {
  justify-self: end;
}

.corner-control {
  justify-self: end;
}

.border-pattern-control,
.border-weight-control {
  justify-self: end;
}

.edge-geometry-control,
.edge-pattern-control,
.edge-weight-control {
  justify-self: end;
}

.setting-row :deep(.ui-select-control),
.setting-row input[type="number"],
.setting-row input[type="text"],
.setting-row input[type="url"] {
  width: 156px;
  max-width: 100%;
  justify-self: end;
}

.setting-row :deep(.ui-select-trigger) {
  width: 100%;
}

.element-setting-row :deep(.ui-select-control) {
  justify-self: end;
}

.channel-row {
  grid-template-columns: minmax(0, 1fr) auto 40px;
}

.channel-row :deep(.ui-checkbox-wrap) {
  justify-self: end;
}

.channel-picker {
  justify-self: end;
}

.setting-row > span,
.channel-row > label {
  display: inline-flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: var(--fs-meta);
  line-height: var(--lh-tight);
}

.setting-row-label {
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  min-width: 0;
}

.scope-inactive {
  text-decoration-line: line-through;
  text-decoration-color: color-mix(in srgb, var(--text-primary) 72%, currentColor);
  text-decoration-thickness: 1px;
}

.token-key {
  font-family: "JetBrains Mono", "Geist Mono", monospace;
  font-size: calc(var(--fs-meta) - 0.01rem);
  letter-spacing: 0;
  text-transform: none;
}

.token-label {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}

.channel-row > label {
  cursor: default;
}

.setting-row.switch-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.options-panel input[type="number"] {
  width: 100%;
  min-height: 26px;
  padding: 0 0.38rem;
  border-radius: 6px;
  font-size: var(--fs-control);
  line-height: var(--lh-tight);
  border-color: color-mix(in srgb, var(--border-color) 56%, transparent);
}

.font-custom-input {
  width: 100%;
  min-height: var(--ui-control-height);
  padding: 0 0.38rem;
  border-radius: var(--ui-control-radius);
  font-size: var(--fs-control);
  line-height: var(--lh-tight);
  border-color: color-mix(in srgb, var(--border-color) 56%, transparent);
}

.options-panel input[type="url"] {
  width: 100%;
  min-height: 26px;
  padding: 0 0.38rem;
  border-radius: 6px;
  font-size: var(--fs-control);
  line-height: var(--lh-tight);
  border-color: color-mix(in srgb, var(--border-color) 56%, transparent);
}

@media (max-width: 959px) {
  .options-tabs-wrap {
    margin: 0.46rem auto 0.3rem;
    width: calc(100% - 1.04rem);
    max-width: calc(100% - 1.04rem);
  }

  .options-tabs {
    width: 100%;
    justify-content: center;
  }

  .setting-list {
    gap: 0.44rem;
  }

  .setting-section {
    padding: 0.26rem 0 0.9rem;
  }

  .setting-row {
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    gap: 0.34rem;
  }

  .element-setting-row {
    grid-template-columns: max-content minmax(0, 1fr);
  }

  .channel-row {
    grid-template-columns: minmax(0, 1fr) auto 40px;
    align-items: center;
    gap: 0.34rem;
  }

  .setting-row.switch-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .setting-row :deep(.ui-select-control),
  .setting-row input[type="number"],
  .setting-row input[type="text"],
  .setting-row input[type="url"] {
    width: 156px;
    max-width: 100%;
  }

  .options-panel input[type="number"] {
    min-height: 30px;
    font-size: var(--fs-section);
  }

  .font-custom-input {
    min-height: 30px;
    font-size: var(--fs-section);
  }

  .options-panel input[type="url"] {
    min-height: 30px;
    font-size: var(--fs-section);
  }
}
</style>
