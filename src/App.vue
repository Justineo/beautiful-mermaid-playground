<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import MermaidEditor from "@/components/MermaidEditor.vue";
import MermaidPreview from "@/components/MermaidPreview.vue";
import PlaygroundControlsRow from "@/components/PlaygroundControlsRow.vue";
import PlaygroundHeader from "@/components/PlaygroundHeader.vue";
import PlaygroundOptionsPanel from "@/components/PlaygroundOptionsPanel.vue";
import { preloadRenderer, useBeautifulRenderer } from "@/composables/useBeautifulRenderer";
import { usePlaygroundState } from "@/composables/usePlaygroundState";
import { useSplitPane } from "@/composables/useSplitPane";
import { useTextOutputWarnings } from "@/composables/useTextOutputWarnings";
import { OFFICIAL_SAMPLES } from "@/data/officialSamples";
import { BASE_FONT_OPTIONS, TEXT_COLOR_MODE_OPTIONS } from "@/types/playground";
import { resolveDiagramThemeTokens } from "@/utils/diagramTheme";
import { parseGoogleFontsInput } from "@/utils/googleFonts";
import type {
  ActiveMobilePane,
  BorderPattern,
  BorderWeight,
  CornerStyle,
  DesktopPaneKey,
  BaseFont,
  DiagramTheme,
  DirectionOverride,
  EdgeLabelStylePreset,
  EdgeWeight,
  ElementColorRole,
  ElementColorSource,
  LineGeometry,
  RenderOutputMode,
  StrokePattern,
  SubgraphStylePreset,
  TextColorMode,
  MonoFont,
  ThemeToken,
} from "@/types/playground";

type NoticeTone = "info" | "success" | "warning" | "error";
type NoticeState = {
  message: string;
  tone: NoticeTone;
};

type NetworkInformationLike = {
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
};

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;
type IdleRequestOptions = { timeout?: number };
type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: IdleCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const { state, defaultState } = usePlaygroundState();
const notice = ref<NoticeState | null>(null);
let noticeTimer: ReturnType<typeof setTimeout> | null = null;

const mobileMedia = window.matchMedia("(max-width: 959px)");
const isMobile = ref(mobileMedia.matches);
const selectedSampleId = ref<number | null>(
  OFFICIAL_SAMPLES.find((sample) => sample.source === state.value.code)?.id ?? null,
);

function formatSampleOptionTitle(title: string): string {
  const trimmed = title.trim();
  const withoutPrefix = trimmed.includes(":")
    ? trimmed.split(":").slice(1).join(":").trim()
    : trimmed;
  const base = withoutPrefix || trimmed;

  return base.replace(/\b([A-Z][a-z]+)\b/g, (word, _capture, offset) =>
    offset === 0 ? word : word.toLowerCase(),
  );
}

const officialSampleItems = OFFICIAL_SAMPLES.map((sample) => ({
  id: sample.id,
  title: formatSampleOptionTitle(sample.title),
  category: sample.category,
}));

function syncIsMobile(event: MediaQueryListEvent): void {
  isMobile.value = event.matches;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace("#", "");
  if (!/^[\da-f]{3,8}$/i.test(normalized)) {
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

  if (normalized.length === 6 || normalized.length === 8) {
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }

  return null;
}

function isDarkHex(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return false;
  }

  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.53;
}

type PresetBaseFont = Exclude<BaseFont, "Custom">;
type PresetMonoFont = Exclude<MonoFont, "Custom">;

const BASE_FONT_GOOGLE_FAMILY: Record<PresetBaseFont, string> = {
  Inter: "Inter:wght@400;500;600;700",
  Geist: "Geist:wght@400;500;600;700",
  "Geist Mono": "Geist+Mono:wght@400;500;700",
  "Fira Sans": "Fira+Sans:wght@400;500;600;700",
  "Fira Code": "Fira+Code:wght@400;500;700",
  "IBM Plex Sans": "IBM+Plex+Sans:wght@400;500;600;700",
  "IBM Plex Mono": "IBM+Plex+Mono:wght@400;500;700",
  Roboto: "Roboto:wght@400;500;700",
  "Roboto Mono": "Roboto+Mono:wght@400;500;700",
  "Google Sans": "Google+Sans:wght@400;500;700",
  "Google Sans Code": "Google+Sans+Code:wght@400;500;700",
  Lato: "Lato:wght@400;700",
  "JetBrains Mono": "JetBrains+Mono:wght@400;500;700",
};
const MONO_FONT_FAMILY: Record<PresetMonoFont, string> = {
  "JetBrains Mono": '"JetBrains Mono", monospace',
  "Geist Mono": '"Geist Mono", monospace',
  "Fira Code": '"Fira Code", monospace',
  "IBM Plex Mono": '"IBM Plex Mono", monospace',
  "Roboto Mono": '"Roboto Mono", monospace',
  "Google Sans Code": '"Google Sans Code", monospace',
};
const MONO_FONT_GOOGLE_FAMILY: Record<PresetMonoFont, string> = {
  "JetBrains Mono": "JetBrains+Mono:wght@400;500;700",
  "Geist Mono": "Geist+Mono:wght@400;500;700",
  "Fira Code": "Fira+Code:wght@400;500;700",
  "IBM Plex Mono": "IBM+Plex+Mono:wght@400;500;700",
  "Roboto Mono": "Roboto+Mono:wght@400;500;700",
  "Google Sans Code": "Google+Sans+Code:wght@400;500;700",
};
const BASE_PRESET_FONT_SET = new Set<PresetBaseFont>(
  BASE_FONT_OPTIONS.map((option) => option.value).filter(
    (value): value is PresetBaseFont => value !== "Custom",
  ),
);
const BASE_FONT_GOOGLE_QUERY = Object.values(BASE_FONT_GOOGLE_FAMILY)
  .map((fontQuery) => `family=${fontQuery}`)
  .join("&");
let hasScheduledBaseFontWarmup = false;
const EDITOR_FONT_FAMILY = '"Geist Mono"';
const EDITOR_FONT_SIZE = 12;
const EDITOR_FONT_GOOGLE_FAMILY = "Geist+Mono:wght@400;500;700";

function warmupBaseFontsInBackground(): void {
  if (hasScheduledBaseFontWarmup) {
    return;
  }

  hasScheduledBaseFontWarmup = true;

  const warmup = (): void => {
    for (const fontName of Object.keys(BASE_FONT_GOOGLE_FAMILY) as PresetBaseFont[]) {
      void document.fonts.load(`12px "${fontName}"`);
    }
  };

  const requestIdle = (
    globalThis as {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    }
  ).requestIdleCallback;
  if (requestIdle) {
    requestIdle(warmup, { timeout: 1200 });
    return;
  }

  setTimeout(warmup, 0);
}

function ensureStylesheetLoaded(dataAttribute: string, href: string): void {
  const selector = `link[${dataAttribute}]`;
  let linkElement = document.head.querySelector<HTMLLinkElement>(selector);

  if (!linkElement) {
    linkElement = document.createElement("link");
    linkElement.rel = "stylesheet";
    linkElement.setAttribute(dataAttribute, "true");
    document.head.append(linkElement);
  }

  if (linkElement.href !== href) {
    linkElement.href = href;
  }
}

function ensureAdditionalStylesheetLoaded(dataAttribute: string, href: string): void {
  const absoluteHref = new URL(href, window.location.href).href;
  const existingStylesheet = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).find((stylesheet) => stylesheet.href === absoluteHref);

  if (existingStylesheet) {
    existingStylesheet.setAttribute(dataAttribute, "true");
    return;
  }

  const linkElement = document.createElement("link");
  linkElement.rel = "stylesheet";
  linkElement.setAttribute(dataAttribute, "true");
  linkElement.href = href;
  document.head.append(linkElement);
}

function ensurePresetBaseFontLoaded(font: PresetBaseFont): void {
  const href = `https://fonts.googleapis.com/css2?${BASE_FONT_GOOGLE_QUERY}&display=swap`;
  ensureStylesheetLoaded("data-base-font-loader", href);
  warmupBaseFontsInBackground();
  void document.fonts.load(`12px "${font}"`);
}

function ensureEditorFontLoaded(): void {
  const href = `https://fonts.googleapis.com/css2?family=${EDITOR_FONT_GOOGLE_FAMILY}&display=swap`;
  ensureStylesheetLoaded("data-editor-font-loader", href);
  void document.fonts.load('12px "Geist Mono"');
}

async function ensureCustomFontLoaded(
  dataAttribute: string,
  urlValue: string,
  family: string,
): Promise<boolean> {
  const parsed = parseGoogleFontsInput(urlValue);
  if (!parsed) {
    return false;
  }

  ensureAdditionalStylesheetLoaded(dataAttribute, parsed.cssUrl);
  if (family.trim().length > 0) {
    await document.fonts.load(`12px "${family}"`);
  }

  return true;
}

function resolveMonoFontFamily(font: MonoFont, customFamily: string): string {
  if (font !== "Custom") {
    return MONO_FONT_FAMILY[font];
  }

  const trimmed = customFamily.trim().replace(/"/g, "");
  return trimmed.length > 0 ? `"${trimmed}", monospace` : "monospace";
}

function resolveMonoFontCssUrl(font: MonoFont, customUrl: string): string | null {
  if (font !== "Custom") {
    return `https://fonts.googleapis.com/css2?family=${MONO_FONT_GOOGLE_FAMILY[font]}&display=swap`;
  }

  return parseGoogleFontsInput(customUrl)?.cssUrl ?? null;
}

type UiPalette = {
  bg: string;
  fg: string;
  accent: string;
};

function resolveUiPalette(config = state.value.config): UiPalette {
  const theme = resolveDiagramThemeTokens(config.diagramTheme);
  const accentCandidate = (theme as { accent?: unknown }).accent;
  const themeAccent = typeof accentCandidate === "string" ? accentCandidate : "#3b82f6";

  return {
    bg: config.useCustomBg ? config.customBg : theme.bg,
    fg: config.useCustomFg ? config.customFg : theme.fg,
    accent: config.useCustomAccent ? config.customAccent : themeAccent,
  };
}

const appliedUiPalette = ref<UiPalette>(resolveUiPalette());

const resolvedColorScheme = computed<"light" | "dark">(() =>
  isDarkHex(appliedUiPalette.value.bg) ? "dark" : "light",
);
const editorFontFamily = EDITOR_FONT_FAMILY;
const monoFontFamily = computed(() =>
  resolveMonoFontFamily(state.value.config.monoFont, state.value.config.customMonoFontFamily),
);
const monoFontCssUrl = computed(() =>
  resolveMonoFontCssUrl(state.value.config.monoFont, state.value.config.customMonoFontUrl),
);

const codeRef = computed({
  get: () => state.value.code,
  set: (value: string) => {
    state.value.code = value;
  },
});

const configRef = computed({
  get: () => state.value.config,
  set: (value) => {
    state.value.config = value;
  },
});

const splitRatio = computed({
  get: () => state.value.splitRatio,
  set: (value: number) => {
    state.value.splitRatio = value;
  },
});

const splitPaneRef = ref<HTMLElement | null>(null);
const DESKTOP_EDITOR_MIN_WIDTH = 240;
// Recalculated after moving "Transparent background" to bottom controls.
const DESKTOP_PREVIEW_MIN_WIDTH = 344;
type MermaidEditorExpose = { focus: () => void; focusToEnd: () => void };
const editorRef = ref<MermaidEditorExpose | null>(null);
const editorFocusToEndToken = ref(0);
const shouldFitPreviewAfterRender = ref(false);
const previewFitRequestId = ref(0);
const appliedPreviewTransparency = ref(false);
const isBaseCustomFontLoading = ref(false);
const isMonoCustomFontLoading = ref(false);
let baseCustomFontLoadToken = 0;
let monoCustomFontLoadToken = 0;
const { isDragging, handleDividerPointerDown } = useSplitPane(splitPaneRef, splitRatio, {
  minLeftPx: DESKTOP_EDITOR_MIN_WIDTH,
  minRightPx: DESKTOP_PREVIEW_MIN_WIDTH,
});
const { isRendering, renderState, renderNow, renderTextByColorMode, scheduleRender } =
  useBeautifulRenderer(codeRef, configRef, 300);
const textOutputWarnings = useTextOutputWarnings(
  computed(() => renderState.value.asciiHtml),
  computed(() => state.value.config.outputMode),
  computed(() => renderState.value.textOutputMode),
  monoFontFamily,
  monoFontCssUrl,
);
type EditorFocusMode = "focus" | "focusToEnd";
const pendingEditorFocusMode = ref<EditorFocusMode | null>(null);

let idlePrefetchHandle: number | null = null;
let idlePrefetchTimer: ReturnType<typeof setTimeout> | null = null;

function flushPendingEditorFocus(): void {
  const mode = pendingEditorFocusMode.value;
  const editor = editorRef.value;
  if (!mode || !editor) {
    return;
  }

  if (mode === "focusToEnd") {
    editor.focusToEnd();
  } else {
    editor.focus();
  }
  pendingEditorFocusMode.value = null;
}

function queueEditorFocus(mode: EditorFocusMode): void {
  pendingEditorFocusMode.value = mode;
  flushPendingEditorFocus();
}

function shouldSkipIdlePrefetch(): boolean {
  return Boolean((navigator as NavigatorWithConnection).connection?.saveData);
}

function runIdlePrefetch(): void {
  if (shouldSkipIdlePrefetch()) {
    return;
  }

  void preloadRenderer().catch(() => {});
}

function scheduleIdlePrefetch(): void {
  if (shouldSkipIdlePrefetch()) {
    return;
  }

  const windowWithIdle = window as WindowWithIdleCallback;
  if (windowWithIdle.requestIdleCallback) {
    idlePrefetchHandle = windowWithIdle.requestIdleCallback(
      () => {
        idlePrefetchHandle = null;
        runIdlePrefetch();
      },
      { timeout: 1500 },
    );
    return;
  }

  idlePrefetchTimer = setTimeout(() => {
    idlePrefetchTimer = null;
    runIdlePrefetch();
  }, 280);
}

function clearIdlePrefetchSchedule(): void {
  const windowWithIdle = window as WindowWithIdleCallback;
  if (idlePrefetchHandle !== null && windowWithIdle.cancelIdleCallback) {
    windowWithIdle.cancelIdleCallback(idlePrefetchHandle);
    idlePrefetchHandle = null;
  }

  if (idlePrefetchTimer) {
    clearTimeout(idlePrefetchTimer);
    idlePrefetchTimer = null;
  }
}

function applyUiPalette(palette: UiPalette): void {
  const root = document.documentElement;
  root.style.setProperty("--t-bg", palette.bg);
  root.style.setProperty("--t-fg", palette.fg);
  root.style.setProperty("--t-accent", palette.accent);
  root.dataset.theme = isDarkHex(palette.bg) ? "dark" : "light";
}

watch(
  () => appliedUiPalette.value,
  (palette) => {
    applyUiPalette(palette);
  },
  { immediate: true },
);

watch(
  () => ({
    font: state.value.config.baseFont,
    customFontUrl: state.value.config.customBaseFontUrl,
    customFontFamily: state.value.config.customBaseFontFamily,
  }),
  ({ font, customFontUrl, customFontFamily }) => {
    baseCustomFontLoadToken += 1;
    const currentToken = baseCustomFontLoadToken;

    if (font === "Custom") {
      isBaseCustomFontLoading.value = true;
      void ensureCustomFontLoaded(
        "data-base-custom-font-loader",
        customFontUrl,
        customFontFamily,
      ).finally(() => {
        if (currentToken !== baseCustomFontLoadToken) {
          return;
        }

        isBaseCustomFontLoading.value = false;
      });
      return;
    }

    isBaseCustomFontLoading.value = false;
    if (BASE_PRESET_FONT_SET.has(font)) {
      ensurePresetBaseFontLoaded(font);
    }
  },
  { immediate: true },
);

watch(
  () => ({
    font: state.value.config.monoFont,
    customFontUrl: state.value.config.customMonoFontUrl,
    customFontFamily: state.value.config.customMonoFontFamily,
  }),
  ({ font, customFontUrl, customFontFamily }) => {
    monoCustomFontLoadToken += 1;
    const currentToken = monoCustomFontLoadToken;

    if (font !== "Custom") {
      isMonoCustomFontLoading.value = false;
      return;
    }

    isMonoCustomFontLoading.value = true;
    void ensureCustomFontLoaded(
      "data-mono-custom-font-loader",
      customFontUrl,
      customFontFamily,
    ).finally(() => {
      if (currentToken !== monoCustomFontLoadToken) {
        return;
      }

      isMonoCustomFontLoading.value = false;
    });
  },
  { immediate: true },
);

watch(
  () => renderState.value.renderId,
  () => {
    if (renderState.value.error) {
      return;
    }

    if (state.value.config.outputMode === "svg" && renderState.value.svg) {
      appliedPreviewTransparency.value = state.value.config.transparent;
    }

    appliedUiPalette.value = resolveUiPalette();

    if (!shouldFitPreviewAfterRender.value) {
      return;
    }
    previewFitRequestId.value += 1;
    shouldFitPreviewAfterRender.value = false;
  },
);

const canExportCurrentOutput = computed(() =>
  state.value.config.outputMode === "svg"
    ? Boolean(renderState.value.svg)
    : Boolean(renderState.value.asciiHtml),
);
const isEditorVisible = computed(() =>
  isMobile.value ? state.value.mobilePane === "editor" : state.value.desktopPanes.editor,
);
const isPreviewVisible = computed(() =>
  isMobile.value ? state.value.mobilePane === "preview" : state.value.desktopPanes.preview,
);
const hasDesktopEditorPreview = computed(
  () => state.value.desktopPanes.editor || state.value.desktopPanes.preview,
);
const showDesktopDivider = computed(
  () => state.value.desktopPanes.editor && state.value.desktopPanes.preview,
);
function stripPreviewOnlyConfig(
  config: typeof state.value.config,
): Omit<typeof state.value.config, "transparent"> {
  const { transparent, ...panelConfig } = config;
  void transparent;
  return panelConfig;
}
const optionsPanelConfig = computed(() => stripPreviewOnlyConfig(state.value.config));
const editorSplitStyle = computed(() =>
  showDesktopDivider.value
    ? { flex: `0 0 ${(state.value.splitRatio * 100).toFixed(2)}%` }
    : undefined,
);

const optionsPanelListeners = {
  "update:useCustomBg": updateUseCustomBg,
  "update:customBg": updateCustomBg,
  "update:useCustomFg": updateUseCustomFg,
  "update:customFg": updateCustomFg,
  "update:useCustomLine": updateUseCustomLine,
  "update:customLine": updateCustomLine,
  "update:useCustomAccent": updateUseCustomAccent,
  "update:customAccent": updateCustomAccent,
  "update:useCustomMuted": updateUseCustomMuted,
  "update:customMuted": updateCustomMuted,
  "update:useCustomSurface": updateUseCustomSurface,
  "update:customSurface": updateCustomSurface,
  "update:useCustomBorder": updateUseCustomBorder,
  "update:customBorder": updateCustomBorder,
  "update:baseFont": updateBaseFont,
  "update:customBaseFontUrl": updateCustomBaseFontUrl,
  "update:monoFont": updateMonoFont,
  "update:customMonoFontUrl": updateCustomMonoFontUrl,
  "update:directionOverride": updateDirectionOverride,
  "update:subgraphStyle": updateSubgraphStyle,
  "update:lineGeometry": updateLineGeometry,
  "update:cornerStyle": updateCornerStyle,
  "update:elementColorSource": updateElementColorSource,
  "update:elementColorToken": updateElementColorToken,
  "update:elementColorCustom": updateElementColorCustom,
  "update:edgeLabelStyle": updateEdgeLabelStyle,
  "update:edgePattern": updateEdgePattern,
  "update:edgeWeight": updateEdgeWeight,
  "update:borderPattern": updateBorderPattern,
  "update:borderWeight": updateBorderWeight,
  "update:textPaddingX": updateTextPaddingX,
  "update:textPaddingY": updateTextPaddingY,
  "update:textBoxBorderPadding": updateTextBoxBorderPadding,
  "update:padding": updatePadding,
  "update:nodeSpacing": updateNodeSpacing,
  "update:layerSpacing": updateLayerSpacing,
  "update:componentSpacing": updateComponentSpacing,
  "reset:all": resetAllOptions,
  "reset:palette": resetPaletteOptions,
  "reset:layout": resetLayoutOptions,
  "reset:nodes": resetNodeOptions,
  "reset:edges": resetEdgeOptions,
  "reset:system": resetSystemOptions,
  "invalid:google-font-url": notifyInvalidGoogleFontsUrl,
} as const;

watch(
  () => [state.value.code, state.value.config],
  () => {
    scheduleRender();
  },
  { deep: true },
);

watch(isPreviewVisible, (visible, previous) => {
  if (visible && !previous) {
    void renderNow();
  }
});

watch(isMobile, () => {
  if (isPreviewVisible.value) {
    void renderNow();
  }
});

watch(isEditorVisible, (visible, previous) => {
  if (visible && !previous) {
    queueEditorFocus("focus");
  }
});

watch(editorRef, () => {
  flushPendingEditorFocus();
});

watch(
  () => state.value.code,
  (nextCode) => {
    if (selectedSampleId.value === null) {
      return;
    }

    const selected = OFFICIAL_SAMPLES.find((sample) => sample.id === selectedSampleId.value);
    if (!selected || selected.source !== nextCode) {
      selectedSampleId.value = null;
    }
  },
);

function setNotice(message: string, tone: NoticeTone = "info", durationMs = 2200): void {
  notice.value = { message, tone };
  if (noticeTimer) {
    clearTimeout(noticeTimer);
  }

  noticeTimer = setTimeout(() => {
    notice.value = null;
    noticeTimer = null;
  }, durationMs);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getSvgSize(svg: string): { width: number; height: number } {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const node = doc.querySelector("svg");

  if (!node) {
    return { width: 1200, height: 800 };
  }

  const width = Number.parseFloat(node.getAttribute("width") ?? "");
  const height = Number.parseFloat(node.getAttribute("height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }

  const viewBox = node.getAttribute("viewBox");
  if (!viewBox) {
    return { width: 1200, height: 800 };
  }

  const parts = viewBox
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseFloat(part));

  const widthFromViewBox = parts[2];
  const heightFromViewBox = parts[3];
  if (
    parts.length === 4 &&
    widthFromViewBox !== undefined &&
    heightFromViewBox !== undefined &&
    Number.isFinite(widthFromViewBox) &&
    Number.isFinite(heightFromViewBox) &&
    widthFromViewBox > 0 &&
    heightFromViewBox > 0
  ) {
    return { width: widthFromViewBox, height: heightFromViewBox };
  }

  return { width: 1200, height: 800 };
}

function exportSvg(): void {
  const svg = renderState.value.svg;
  if (!svg) {
    return;
  }

  downloadBlob("diagram.svg", new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  setNotice("SVG exported", "success");
}

async function exportPng(): Promise<void> {
  const svg = renderState.value.svg;
  if (!svg) {
    return;
  }

  try {
    const pngBlob = await renderSvgToPngBlob(svg);
    downloadBlob("diagram.png", pngBlob);
    setNotice("PNG exported", "success");
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "PNG export failed", "error");
  }
}

async function copyPng(): Promise<void> {
  const svg = renderState.value.svg;
  if (!svg) {
    return;
  }

  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Clipboard image copy is unavailable in this browser");
    }

    const pngBlob = await renderSvgToPngBlob(svg);
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);
    setNotice("PNG copied to clipboard", "success");
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "Copy failed", "error");
  }
}

async function copySvg(): Promise<void> {
  const svg = renderState.value.svg;
  if (!svg) {
    return;
  }

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable in this browser");
    }

    await navigator.clipboard.writeText(svg);
    setNotice("SVG copied to clipboard", "success");
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "Copy failed", "error");
  }
}

async function renderSvgToPngBlob(svg: string): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to decode SVG image"));
      image.src = url;
    });

    const fallbackSize = getSvgSize(svg);
    const width = Math.max(1, Math.round(image.naturalWidth || fallbackSize.width));
    const height = Math.max(1, Math.round(image.naturalHeight || fallbackSize.height));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to create canvas context");
    }

    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!pngBlob) {
      throw new Error("Failed to convert image to PNG");
    }

    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type TextCopyPayload = {
  mode: Exclude<RenderOutputMode, "svg">;
  colorMode: TextColorMode;
};

function getTextColorModeLabel(colorMode: TextColorMode): string {
  return TEXT_COLOR_MODE_OPTIONS.find((option) => option.value === colorMode)?.label ?? "text";
}

async function copyTextOutput(payload: TextCopyPayload): Promise<void> {
  const text = await renderTextByColorMode(payload.colorMode, payload.mode);
  if (!text) {
    return;
  }

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API unavailable in this browser");
    }

    await navigator.clipboard.writeText(text);
    const outputLabel = payload.mode === "unicode" ? "Unicode" : "ASCII";
    setNotice(`${outputLabel} ${getTextColorModeLabel(payload.colorMode)} copied`, "success");
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "Copy failed", "error");
  }
}

function notifyInvalidGoogleFontsUrl(): void {
  setNotice("Invalid Google Fonts URL", "error");
}

function updateCode(value: string): void {
  codeRef.value = value;
}

function updateOutputMode(value: RenderOutputMode): void {
  state.value.config.outputMode = value;
}

function applySample(sampleId: number): void {
  const sample = OFFICIAL_SAMPLES.find((item) => item.id === sampleId);
  if (!sample) {
    return;
  }

  state.value.code = sample.source;
  selectedSampleId.value = sampleId;

  const transparentOption = sample.options.transparent;
  if (typeof transparentOption === "boolean") {
    state.value.config.transparent = transparentOption;
  }

  requestPreviewFitAfterRender();
  editorFocusToEndToken.value += 1;
  void renderNow();
}

function updateDiagramTheme(value: DiagramTheme): void {
  state.value.config.diagramTheme = value;
  resetAllColorSections();
}

function updateUseCustomBg(value: boolean): void {
  state.value.config.useCustomBg = value;
}

function updateCustomBg(value: string): void {
  state.value.config.customBg = value;
}

function updateUseCustomFg(value: boolean): void {
  state.value.config.useCustomFg = value;
}

function updateCustomFg(value: string): void {
  state.value.config.customFg = value;
}

function updateUseCustomLine(value: boolean): void {
  state.value.config.useCustomLine = value;
}

function updateCustomLine(value: string): void {
  state.value.config.customLine = value;
}

function updateUseCustomAccent(value: boolean): void {
  state.value.config.useCustomAccent = value;
}

function updateCustomAccent(value: string): void {
  state.value.config.customAccent = value;
}

function updateUseCustomMuted(value: boolean): void {
  state.value.config.useCustomMuted = value;
}

function updateCustomMuted(value: string): void {
  state.value.config.customMuted = value;
}

function updateUseCustomSurface(value: boolean): void {
  state.value.config.useCustomSurface = value;
}

function updateCustomSurface(value: string): void {
  state.value.config.customSurface = value;
}

function updateUseCustomBorder(value: boolean): void {
  state.value.config.useCustomBorder = value;
}

function updateCustomBorder(value: string): void {
  state.value.config.customBorder = value;
}

function updateBaseFont(value: BaseFont): void {
  state.value.config.baseFont = value;
}

function updateCustomBaseFontUrl(value: string): void {
  const parsed = parseGoogleFontsInput(value);
  state.value.config.customBaseFontUrl = parsed?.sourceUrl ?? "";
  state.value.config.customBaseFontFamily = parsed?.primaryFamily ?? "";
}

function updateMonoFont(value: MonoFont): void {
  state.value.config.monoFont = value;
}

function updateCustomMonoFontUrl(value: string): void {
  const parsed = parseGoogleFontsInput(value);
  state.value.config.customMonoFontUrl = parsed?.sourceUrl ?? "";
  state.value.config.customMonoFontFamily = parsed?.primaryFamily ?? "";
}

function requestPreviewFitAfterRender(): void {
  shouldFitPreviewAfterRender.value = true;
}

function updateDirectionOverride(value: DirectionOverride): void {
  state.value.config.directionOverride = value;
  requestPreviewFitAfterRender();
}

function updateSubgraphStyle(value: SubgraphStylePreset): void {
  state.value.config.subgraphStyle = value;
}

function updateLineGeometry(value: LineGeometry): void {
  state.value.config.lineGeometry = value;
}

function updateCornerStyle(value: CornerStyle): void {
  state.value.config.cornerStyle = value;
}

function updateElementColorSource(payload: {
  role: ElementColorRole;
  source: ElementColorSource;
}): void {
  state.value.config.elementColors[payload.role].source = payload.source;
}

function updateElementColorToken(payload: { role: ElementColorRole; token: ThemeToken }): void {
  state.value.config.elementColors[payload.role].token = payload.token;
}

function updateElementColorCustom(payload: { role: ElementColorRole; custom: string }): void {
  state.value.config.elementColors[payload.role].custom = payload.custom;
}

function updateEdgeLabelStyle(value: EdgeLabelStylePreset): void {
  state.value.config.edgeLabelStyle = value;
}

function updateEdgePattern(value: StrokePattern): void {
  state.value.config.edgePattern = value;
}

function updateEdgeWeight(value: EdgeWeight): void {
  state.value.config.edgeWeight = value;
}

function updateBorderPattern(value: BorderPattern): void {
  state.value.config.borderPattern = value;
}

function updateBorderWeight(value: BorderWeight): void {
  state.value.config.borderWeight = value;
}

function updateTextPaddingX(value: number): void {
  state.value.config.textPaddingX = clamp(value, 0, 60);
  requestPreviewFitAfterRender();
}

function updateTextPaddingY(value: number): void {
  state.value.config.textPaddingY = clamp(value, 0, 60);
  requestPreviewFitAfterRender();
}

function updateTextBoxBorderPadding(value: number): void {
  state.value.config.textBoxBorderPadding = clamp(value, 0, 24);
  requestPreviewFitAfterRender();
}

function updateTransparent(value: boolean): void {
  state.value.config.transparent = value;
}

function updatePadding(value: number): void {
  state.value.config.padding = clamp(value, 0, 240);
  requestPreviewFitAfterRender();
}

function updateNodeSpacing(value: number): void {
  state.value.config.nodeSpacing = clamp(value, 4, 200);
  requestPreviewFitAfterRender();
}

function updateLayerSpacing(value: number): void {
  state.value.config.layerSpacing = clamp(value, 4, 240);
  requestPreviewFitAfterRender();
}

function updateComponentSpacing(value: number): void {
  state.value.config.componentSpacing = clamp(value, 4, 260);
  requestPreviewFitAfterRender();
}

function resetLayoutOptions(): void {
  const defaults = defaultState.config;
  state.value.config.directionOverride = defaults.directionOverride;
  state.value.config.padding = defaults.padding;
  state.value.config.nodeSpacing = defaults.nodeSpacing;
  state.value.config.layerSpacing = defaults.layerSpacing;
  state.value.config.componentSpacing = defaults.componentSpacing;
  state.value.config.textPaddingX = defaults.textPaddingX;
  state.value.config.textPaddingY = defaults.textPaddingY;
  state.value.config.textBoxBorderPadding = defaults.textBoxBorderPadding;
  requestPreviewFitAfterRender();
}

function resetNodeOptions(): void {
  const defaults = defaultState.config;
  state.value.config.subgraphStyle = defaults.subgraphStyle;
  state.value.config.cornerStyle = defaults.cornerStyle;
  state.value.config.borderPattern = defaults.borderPattern;
  state.value.config.borderWeight = defaults.borderWeight;
}

function resetEdgeOptions(): void {
  const defaults = defaultState.config;
  state.value.config.lineGeometry = defaults.lineGeometry;
  state.value.config.edgePattern = defaults.edgePattern;
  state.value.config.edgeWeight = defaults.edgeWeight;
  state.value.config.edgeLabelStyle = defaults.edgeLabelStyle;
  requestPreviewFitAfterRender();
}

function resetSystemOptions(): void {
  const defaults = defaultState.config;
  state.value.config.baseFont = defaults.baseFont;
  state.value.config.customBaseFontUrl = defaults.customBaseFontUrl;
  state.value.config.customBaseFontFamily = defaults.customBaseFontFamily;
  state.value.config.monoFont = defaults.monoFont;
  state.value.config.customMonoFontUrl = defaults.customMonoFontUrl;
  state.value.config.customMonoFontFamily = defaults.customMonoFontFamily;
  state.value.config.transparent = defaults.transparent;
}

function resetFoundationColors(): void {
  const defaults = defaultState.config;
  state.value.config.useCustomBg = defaults.useCustomBg;
  state.value.config.customBg = defaults.customBg;
  state.value.config.useCustomFg = defaults.useCustomFg;
  state.value.config.customFg = defaults.customFg;
}

function resetEnrichedColors(): void {
  const defaults = defaultState.config;
  state.value.config.useCustomLine = defaults.useCustomLine;
  state.value.config.customLine = defaults.customLine;
  state.value.config.useCustomAccent = defaults.useCustomAccent;
  state.value.config.customAccent = defaults.customAccent;
  state.value.config.useCustomMuted = defaults.useCustomMuted;
  state.value.config.customMuted = defaults.customMuted;
  state.value.config.useCustomSurface = defaults.useCustomSurface;
  state.value.config.customSurface = defaults.customSurface;
  state.value.config.useCustomBorder = defaults.useCustomBorder;
  state.value.config.customBorder = defaults.customBorder;
}

function resetElementColors(): void {
  state.value.config.elementColors = structuredClone(defaultState.config.elementColors);
}

function resetAllColorSections(): void {
  resetFoundationColors();
  resetEnrichedColors();
  resetElementColors();
}

function resetPaletteOptions(): void {
  resetAllColorSections();
}

function resetAllOptions(): void {
  resetPaletteOptions();
  resetLayoutOptions();
  resetNodeOptions();
  resetEdgeOptions();
  resetSystemOptions();
}

function updateMobilePane(value: ActiveMobilePane): void {
  state.value.mobilePane = value;
}

function toggleDesktopPane(key: DesktopPaneKey): void {
  const current = state.value.desktopPanes[key];
  if (current) {
    const visibleCount = Object.values(state.value.desktopPanes).filter(Boolean).length;
    if (visibleCount <= 1) {
      setNotice("At least one panel must stay open", "warning");
      return;
    }
  }

  state.value.desktopPanes[key] = !current;
}

onMounted(() => {
  ensureEditorFontLoaded();
  mobileMedia.addEventListener("change", syncIsMobile);
  editorFocusToEndToken.value += 1;
  scheduleIdlePrefetch();
  void renderNow();
});

onUnmounted(() => {
  mobileMedia.removeEventListener("change", syncIsMobile);
  clearIdlePrefetchSchedule();

  if (noticeTimer) {
    clearTimeout(noticeTimer);
  }
});
</script>

<template>
  <div class="app-shell">
    <PlaygroundHeader />

    <PlaygroundControlsRow
      :diagram-theme="state.config.diagramTheme"
      :is-mobile="isMobile"
      :mobile-pane="state.mobilePane"
      :desktop-panes="state.desktopPanes"
      :selected-sample-id="selectedSampleId"
      :samples="officialSampleItems"
      @update:diagram-theme="updateDiagramTheme"
      @update:mobile-pane="updateMobilePane"
      @toggle:desktop-pane="toggleDesktopPane"
      @apply:sample="applySample"
    />

    <main class="playground-main">
      <section v-if="!isMobile" class="desktop-workspace">
        <div
          v-if="state.desktopPanes.options"
          class="pane options-pane"
          :class="{ 'options-pane-full': !hasDesktopEditorPreview }"
        >
          <PlaygroundOptionsPanel
            v-bind="optionsPanelConfig"
            :is-base-custom-font-loading="isBaseCustomFontLoading"
            :is-mono-custom-font-loading="isMonoCustomFontLoading"
            v-on="optionsPanelListeners"
          />
        </div>

        <section
          v-if="hasDesktopEditorPreview"
          ref="splitPaneRef"
          class="editor-preview-workspace"
          :class="{ single: !showDesktopDivider, 'with-options': state.desktopPanes.options }"
        >
          <div v-if="state.desktopPanes.editor" class="pane editor-pane" :style="editorSplitStyle">
            <MermaidEditor
              ref="editorRef"
              :model-value="state.code"
              :font-size="EDITOR_FONT_SIZE"
              :font-family="editorFontFamily"
              :color-scheme="resolvedColorScheme"
              :diagram-theme="state.config.diagramTheme"
              :surface-color="appliedUiPalette.bg"
              :focus-to-end-token="editorFocusToEndToken"
              @update:model-value="updateCode"
            />
          </div>

          <div
            v-if="showDesktopDivider"
            class="divider"
            :class="{ dragging: isDragging }"
            role="separator"
            aria-label="Resize editor and preview panes"
            @pointerdown="handleDividerPointerDown"
          />

          <div v-if="state.desktopPanes.preview" class="pane preview-pane">
            <MermaidPreview
              :output-mode="state.config.outputMode"
              :fit-request-id="previewFitRequestId"
              :mono-font-family="monoFontFamily"
              :text-warnings="textOutputWarnings"
              :svg="renderState.svg"
              :ascii-html="renderState.asciiHtml"
              :error="renderState.error"
              :duration-ms="renderState.durationMs"
              :is-rendering="isRendering"
              :can-export="canExportCurrentOutput"
              :transparent="state.config.transparent"
              :transparent-applied="appliedPreviewTransparency"
              @update:output-mode="updateOutputMode"
              @update:transparent="updateTransparent"
              @export:copy-svg="copySvg"
              @export:copy-png="copyPng"
              @export:download-svg="exportSvg"
              @export:download-png="exportPng"
              @export:copy-text="copyTextOutput"
            />
          </div>
        </section>
      </section>

      <section v-else class="mobile-workspace">
        <div v-if="state.mobilePane === 'options'" class="pane mobile-pane">
          <PlaygroundOptionsPanel
            v-bind="optionsPanelConfig"
            :is-base-custom-font-loading="isBaseCustomFontLoading"
            :is-mono-custom-font-loading="isMonoCustomFontLoading"
            v-on="optionsPanelListeners"
          />
        </div>

        <div v-else-if="state.mobilePane === 'editor'" class="pane mobile-pane">
          <MermaidEditor
            ref="editorRef"
            :model-value="state.code"
            :font-size="EDITOR_FONT_SIZE"
            :font-family="editorFontFamily"
            :color-scheme="resolvedColorScheme"
            :diagram-theme="state.config.diagramTheme"
            :surface-color="appliedUiPalette.bg"
            :focus-to-end-token="editorFocusToEndToken"
            @update:model-value="updateCode"
          />
        </div>

        <div v-else class="pane mobile-pane">
          <MermaidPreview
            :output-mode="state.config.outputMode"
            :fit-request-id="previewFitRequestId"
            :mono-font-family="monoFontFamily"
            :text-warnings="textOutputWarnings"
            :svg="renderState.svg"
            :ascii-html="renderState.asciiHtml"
            :error="renderState.error"
            :duration-ms="renderState.durationMs"
            :is-rendering="isRendering"
            :can-export="canExportCurrentOutput"
            :transparent="state.config.transparent"
            :transparent-applied="appliedPreviewTransparency"
            @update:output-mode="updateOutputMode"
            @update:transparent="updateTransparent"
            @export:copy-svg="copySvg"
            @export:copy-png="copyPng"
            @export:download-svg="exportSvg"
            @export:download-png="exportPng"
            @export:copy-text="copyTextOutput"
          />
        </div>
      </section>
    </main>

    <p v-if="notice" class="toast" :class="`tone-${notice.tone}`" role="status" aria-live="polite">
      {{ notice.message }}
    </p>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.playground-main {
  position: relative;
  flex: 1;
  min-height: 0;
}

.desktop-workspace {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
}

.mobile-workspace {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  padding: 0;
}

.options-pane {
  width: fit-content;
  flex: 0 0 auto;
  border-right: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
}

.options-pane.options-pane-full {
  width: auto;
  flex: 1;
  border-right: 0;
}

.editor-preview-workspace {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.editor-preview-workspace.with-options {
  border-left: 0;
}

.editor-preview-workspace.single {
  display: block;
}

.pane {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.editor-pane,
.preview-pane,
.mobile-pane {
  flex: 1 1 auto;
  border: 0;
  border-radius: 0;
  overflow: hidden;
  background: var(--surface);
  box-shadow: none;
}

.editor-pane {
  border-right: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
}

.editor-preview-workspace:not(.single) .editor-pane {
  border-right: 0;
  min-width: 240px;
}

.editor-preview-workspace:not(.single) .preview-pane {
  flex: 1 1 0;
  min-width: 344px;
}

.editor-preview-workspace.single .editor-pane,
.editor-preview-workspace.single .preview-pane,
.mobile-pane {
  border-right: 0;
}

.divider {
  position: relative;
  cursor: col-resize;
  width: 10px;
  flex: 0 0 10px;
  margin-inline: -5px;
  z-index: 4;
  background: transparent;
  touch-action: none;
}

.divider::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--border-subtle) 84%, transparent);
}

.divider::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1px;
  height: 20px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: color-mix(in srgb, var(--border-color) 70%, transparent);
  opacity: 0.52;
  transition:
    opacity 120ms ease,
    height 120ms ease;
}

.divider:hover::after,
.divider.dragging::after {
  opacity: 0.86;
  height: 30px;
}

.toast {
  position: fixed;
  left: 50%;
  top: calc(env(safe-area-inset-top, 0px) + 3.85rem);
  transform: translateX(-50%);
  max-width: min(80vw, 440px);
  margin: 0;
  padding: 0.36rem 0.58rem;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  backdrop-filter: blur(8px);
  color: var(--text-primary);
  font-size: var(--fs-toast);
  line-height: var(--lh-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--t-fg) 8%, transparent);
  z-index: 40;
  pointer-events: none;
}

.toast.tone-success {
  border-color: color-mix(in srgb, #1f9d55 34%, var(--border-subtle));
}

.toast.tone-warning {
  border-color: color-mix(in srgb, #f59e0b 46%, var(--border-subtle));
}

.toast.tone-error {
  border-color: color-mix(in srgb, var(--danger-text) 46%, var(--border-subtle));
}

@media (max-width: 959px) {
  .toast {
    top: calc(env(safe-area-inset-top, 0px) + 6.5rem);
    max-width: min(92vw, 420px);
  }
}

@media (max-width: 959px) {
  .playground-main {
    overflow: hidden;
  }
}
</style>
