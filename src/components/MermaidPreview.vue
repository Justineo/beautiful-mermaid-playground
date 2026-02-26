<script setup lang="ts">
import { Scan } from "lucide-vue-next";
import { useResizeObserver } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import BaseDropdownMenu from "@/components/BaseDropdownMenu.vue";
import BasePanel from "@/components/BasePanel.vue";
import BaseSegmentedControl from "@/components/BaseSegmentedControl.vue";
import { RENDER_OUTPUT_MODE_OPTIONS } from "@/types/playground";
import type { RenderOutputMode } from "@/types/playground";

type ViewportPoint = {
  x: number;
  y: number;
};

type ContentSize = {
  width: number;
  height: number;
};

type ColoredAsciiSegment = {
  text: string;
  color: string | null;
};

type ColoredAsciiLine = ColoredAsciiSegment[];

const props = defineProps<{
  outputMode: RenderOutputMode;
  fitRequestId: number;
  monoFontFamily: string;
  svg: string | null;
  ascii: string | null;
  asciiHtml: string | null;
  error: string | null;
  durationMs: number | null;
  isRendering: boolean;
  canExport: boolean;
}>();

type TextOutputMode = Exclude<RenderOutputMode, "svg">;

const emit = defineEmits<{
  "export:copy-svg": [];
  "export:copy-png": [];
  "export:download-svg": [];
  "export:download-png": [];
  "export:copy-text": [mode: TextOutputMode];
  "export:download-text": [mode: TextOutputMode];
  "update:outputMode": [value: RenderOutputMode];
}>();

const viewportRef = ref<HTMLElement | null>(null);
const svgHostRef = ref<HTMLElement | null>(null);
const textCanvasRef = ref<HTMLElement | null>(null);

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const FIT_MAX_SCALE = 1;
const WHEEL_ZOOM_SPEED = 0.0018;
const FIT_PADDING = 36;

const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const activePointerIds = ref<Set<number>>(new Set());
let pointerPositions = new Map<number, ViewportPoint>();
let isDragging = false;
let dragStartPointer: ViewportPoint | null = null;
let dragStartOffset: ViewportPoint | null = null;
let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchStartWorldAnchor: ViewportPoint | null = null;
const autoFit = ref(true);
const needsFit = ref(false);

function snapToDevicePixel(value: number): number {
  const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const step = 1 / devicePixelRatio;
  return Math.round(value / step) * step;
}

const renderedOffsetX = computed(() =>
  props.outputMode === "svg" ? snapToDevicePixel(offsetX.value) : offsetX.value,
);
const renderedOffsetY = computed(() =>
  props.outputMode === "svg" ? snapToDevicePixel(offsetY.value) : offsetY.value,
);

const canvasTransformStyle = computed(() => ({
  transform: `translate(${renderedOffsetX.value}px, ${renderedOffsetY.value}px) scale(${scale.value})`,
}));

const zoomLabel = computed(() => `${Math.round(scale.value * 100)}%`);

const hasCurrentOutput = computed(() =>
  props.outputMode === "svg" ? Boolean(props.svg) : Boolean(props.ascii),
);

const statusText = computed(() => {
  if (props.isRendering) {
    return "Rendering...";
  }

  if (props.error) {
    return "Render failed";
  }

  if (props.durationMs !== null) {
    return `Rendered in ${props.durationMs}ms`;
  }

  return "Ready";
});

const graphExportItems = computed<Array<{ key: string; label: string }>>(() => {
  if (props.outputMode === "svg") {
    return [
      { key: "copy-svg", label: "Copy SVG" },
      { key: "copy-png", label: "Copy PNG" },
      { key: "download-svg", label: "Download SVG" },
      { key: "download-png", label: "Download PNG" },
    ];
  }

  const label = props.outputMode === "unicode" ? "Unicode text" : "ASCII text";
  return [
    { key: "copy-text", label: `Copy ${label}` },
    { key: "download-text", label: `Download ${label}` },
  ];
});
const outputModeItems: Array<{ key: string; label: string }> = RENDER_OUTPUT_MODE_OPTIONS.map(
  (item) => ({
    key: item.value,
    label: item.label,
  }),
);

function appendColoredText(
  lines: ColoredAsciiLine[],
  rawText: string,
  color: string | null,
): ColoredAsciiLine[] {
  let nextLines = lines;
  const parts = rawText.split("\n");
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    if (part.length > 0) {
      const lineIndex = nextLines.length - 1;
      const currentLine = nextLines[lineIndex];
      if (currentLine) {
        currentLine.push({ text: part, color });
      }
    }

    if (index < parts.length - 1) {
      nextLines = [...nextLines, []];
    }
  }

  return nextLines;
}

function parseAsciiHtmlToLines(html: string): ColoredAsciiLine[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<pre>${html}</pre>`, "text/html");
  const root = document.body.querySelector("pre");
  if (!root) {
    return [];
  }

  let lines: ColoredAsciiLine[] = [[]];

  function walk(node: Node, inheritedColor: string | null): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? "";
      lines = appendColoredText(lines, text, inheritedColor);
      return;
    }

    if (!(node instanceof Element)) {
      return;
    }

    const color = node
      .getAttribute("style")
      ?.match(/color:\s*([^;]+)/u)?.[1]
      ?.trim();
    const resolvedColor = color && color.length > 0 ? color : inheritedColor;
    for (const child of Array.from(node.childNodes)) {
      walk(child, resolvedColor);
    }
  }

  for (const child of Array.from(root.childNodes)) {
    walk(child, null);
  }

  return lines;
}

const coloredAsciiLines = computed<ColoredAsciiLine[]>(() => {
  if (props.asciiHtml && props.asciiHtml.length > 0) {
    const parsed = parseAsciiHtmlToLines(props.asciiHtml);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  const fallback = props.ascii ?? "";
  return fallback.split("\n").map((line) => [{ text: line, color: null }]);
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSvgIntrinsicSize(svgElement: SVGSVGElement): ContentSize {
  const viewBox = svgElement.viewBox?.baseVal;
  if (
    viewBox &&
    Number.isFinite(viewBox.width) &&
    Number.isFinite(viewBox.height) &&
    viewBox.width > 0 &&
    viewBox.height > 0
  ) {
    return {
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  const width = Number.parseFloat(svgElement.getAttribute("width") ?? "");
  const height = Number.parseFloat(svgElement.getAttribute("height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }

  const rect = svgElement.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return {
      width: rect.width,
      height: rect.height,
    };
  }

  return {
    width: 1200,
    height: 800,
  };
}

function readCurrentContentSize(outputMode: RenderOutputMode): ContentSize | null {
  if (outputMode === "svg") {
    const svgElement = svgHostRef.value?.querySelector("svg");
    if (!(svgElement instanceof SVGSVGElement)) {
      return null;
    }

    return getSvgIntrinsicSize(svgElement);
  }

  const textElement = textCanvasRef.value;
  if (!textElement) {
    return null;
  }

  const width = Math.max(1, Math.ceil(textElement.scrollWidth));
  const height = Math.max(1, Math.ceil(textElement.scrollHeight));
  if (width <= 1 && height <= 1 && !props.ascii) {
    return null;
  }

  return { width, height };
}

function centerAtScale(nextScale: number, size: ContentSize): boolean {
  const viewport = viewportRef.value;
  if (!viewport) {
    return false;
  }

  const viewportRect = viewport.getBoundingClientRect();
  if (viewportRect.width <= 0 || viewportRect.height <= 0) {
    return false;
  }

  offsetX.value = (viewportRect.width - size.width * nextScale) / 2;
  offsetY.value = (viewportRect.height - size.height * nextScale) / 2;
  return true;
}

function zoomToFit(outputMode: RenderOutputMode = props.outputMode): boolean {
  const viewport = viewportRef.value;
  const size = readCurrentContentSize(outputMode);
  if (!viewport || !size) {
    return false;
  }

  const viewportRect = viewport.getBoundingClientRect();
  if (viewportRect.width <= 0 || viewportRect.height <= 0) {
    return false;
  }
  const availableWidth = Math.max(1, viewportRect.width - FIT_PADDING * 2);
  const availableHeight = Math.max(1, viewportRect.height - FIT_PADDING * 2);
  const fitScale = clamp(
    Math.min(availableWidth / size.width, availableHeight / size.height),
    MIN_SCALE,
    FIT_MAX_SCALE,
  );

  scale.value = fitScale;
  if (!centerAtScale(fitScale, size)) {
    return false;
  }
  autoFit.value = true;
  return true;
}

function zoomToOneHundredPercent(): void {
  const size = readCurrentContentSize(props.outputMode);
  if (!size) {
    return;
  }

  const nextScale = 1;
  scale.value = nextScale;
  if (!centerAtScale(nextScale, size)) {
    return;
  }
  autoFit.value = false;
}

function clearPointerState(): void {
  pointerPositions = new Map();
  activePointerIds.value = new Set();
  isDragging = false;
  dragStartPointer = null;
  dragStartOffset = null;
  pinchStartDistance = 0;
  pinchStartScale = scale.value;
  pinchStartWorldAnchor = null;
}

function getLocalPoint(event: PointerEvent | WheelEvent): ViewportPoint | null {
  const viewport = viewportRef.value;
  if (!viewport) {
    return null;
  }

  const rect = viewport.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function zoomAt(localX: number, localY: number, nextScale: number): void {
  const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
  if (Math.abs(clampedScale - scale.value) < 0.0001) {
    return;
  }

  const worldX = (localX - offsetX.value) / scale.value;
  const worldY = (localY - offsetY.value) / scale.value;
  scale.value = clampedScale;
  offsetX.value = localX - worldX * clampedScale;
  offsetY.value = localY - worldY * clampedScale;
}

function getPointerPairMidpoint(): ViewportPoint | null {
  const entries = Array.from(pointerPositions.values());
  if (entries.length < 2) {
    return null;
  }

  const first = entries[0];
  const second = entries[1];
  if (!first || !second) {
    return null;
  }

  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function getPointerPairDistance(): number {
  const entries = Array.from(pointerPositions.values());
  if (entries.length < 2) {
    return 0;
  }

  const first = entries[0];
  const second = entries[1];
  if (!first || !second) {
    return 0;
  }

  return Math.hypot(second.x - first.x, second.y - first.y);
}

function beginPinch(): void {
  if (pointerPositions.size < 2) {
    return;
  }

  const midpoint = getPointerPairMidpoint();
  const distance = getPointerPairDistance();
  if (!midpoint || distance <= 0) {
    return;
  }

  pinchStartDistance = distance;
  pinchStartScale = scale.value;
  pinchStartWorldAnchor = {
    x: (midpoint.x - offsetX.value) / scale.value,
    y: (midpoint.y - offsetY.value) / scale.value,
  };
}

function onViewportPointerDown(event: PointerEvent): void {
  if (!hasCurrentOutput.value) {
    return;
  }

  autoFit.value = false;
  const localPoint = getLocalPoint(event);
  if (!localPoint) {
    return;
  }

  viewportRef.value?.setPointerCapture(event.pointerId);
  pointerPositions.set(event.pointerId, localPoint);
  const nextIds = new Set(activePointerIds.value);
  nextIds.add(event.pointerId);
  activePointerIds.value = nextIds;

  if (pointerPositions.size >= 2) {
    isDragging = false;
    dragStartPointer = null;
    dragStartOffset = null;
    beginPinch();
    return;
  }

  isDragging = true;
  dragStartPointer = localPoint;
  dragStartOffset = {
    x: offsetX.value,
    y: offsetY.value,
  };
}

function onViewportPointerMove(event: PointerEvent): void {
  if (!hasCurrentOutput.value) {
    return;
  }

  if (!activePointerIds.value.has(event.pointerId)) {
    return;
  }

  const localPoint = getLocalPoint(event);
  if (!localPoint) {
    return;
  }

  pointerPositions.set(event.pointerId, localPoint);

  if (pointerPositions.size >= 2) {
    const midpoint = getPointerPairMidpoint();
    const distance = getPointerPairDistance();
    if (!midpoint || distance <= 0 || pinchStartDistance <= 0 || !pinchStartWorldAnchor) {
      return;
    }

    const nextScale = clamp(
      (pinchStartScale * distance) / pinchStartDistance,
      MIN_SCALE,
      MAX_SCALE,
    );
    scale.value = nextScale;
    offsetX.value = midpoint.x - pinchStartWorldAnchor.x * nextScale;
    offsetY.value = midpoint.y - pinchStartWorldAnchor.y * nextScale;
    return;
  }

  if (!isDragging || !dragStartPointer || !dragStartOffset) {
    return;
  }

  offsetX.value = dragStartOffset.x + (localPoint.x - dragStartPointer.x);
  offsetY.value = dragStartOffset.y + (localPoint.y - dragStartPointer.y);
}

function onViewportPointerUp(event: PointerEvent): void {
  if (!activePointerIds.value.has(event.pointerId)) {
    return;
  }

  pointerPositions.delete(event.pointerId);
  const nextIds = new Set(activePointerIds.value);
  nextIds.delete(event.pointerId);
  activePointerIds.value = nextIds;

  if (pointerPositions.size >= 2) {
    beginPinch();
    return;
  }

  isDragging = false;
  dragStartPointer = null;
  dragStartOffset = null;
  pinchStartDistance = 0;
  pinchStartWorldAnchor = null;
}

function onViewportPointerCancel(event: PointerEvent): void {
  if (!activePointerIds.value.has(event.pointerId)) {
    return;
  }

  onViewportPointerUp(event);
}

function onViewportWheel(event: WheelEvent): void {
  if (!hasCurrentOutput.value) {
    return;
  }

  event.preventDefault();
  autoFit.value = false;

  const localPoint = getLocalPoint(event);
  if (!localPoint) {
    return;
  }

  if (event.metaKey || event.ctrlKey) {
    const nextScale = scale.value * Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED);
    zoomAt(localPoint.x, localPoint.y, nextScale);
    return;
  }

  offsetX.value -= event.deltaX;
  offsetY.value -= event.deltaY;
}

function onGraphExportSelect(key: string): void {
  if (key === "copy-svg") {
    emit("export:copy-svg");
    return;
  }

  if (key === "download-svg") {
    emit("export:download-svg");
    return;
  }

  if (key === "copy-png") {
    emit("export:copy-png");
    return;
  }

  if (key === "download-png") {
    emit("export:download-png");
    return;
  }

  if (key === "copy-text" && props.outputMode !== "svg") {
    emit("export:copy-text", props.outputMode);
    return;
  }

  if (key === "download-text" && props.outputMode !== "svg") {
    emit("export:download-text", props.outputMode);
  }
}

function updateOutputMode(value: RenderOutputMode): void {
  emit("update:outputMode", value);
}

function onOutputModeSelect(value: string): void {
  updateOutputMode(value as RenderOutputMode);
}

function syncFitWithLayout(outputMode: RenderOutputMode = props.outputMode): void {
  if (!needsFit.value && !autoFit.value) {
    return;
  }

  if (!zoomToFit(outputMode)) {
    return;
  }

  needsFit.value = false;
}

defineExpose<{
  zoomToFit: () => void;
  zoomToOneHundredPercent: () => void;
}>({
  zoomToFit: () => {
    needsFit.value = true;
    syncFitWithLayout();
  },
  zoomToOneHundredPercent,
});

watch(
  () => ({
    svg: props.svg,
    ascii: props.ascii,
    outputMode: props.outputMode,
    fitRequestId: props.fitRequestId,
  }),
  (newValue, oldValue) => {
    const { svg, ascii, outputMode, fitRequestId } = newValue;
    const previousMode = oldValue?.outputMode;
    const currentContent = outputMode === "svg" ? svg : ascii;
    const previousContent = oldValue
      ? oldValue.outputMode === "svg"
        ? oldValue.svg
        : oldValue.ascii
      : null;
    const contentBecameRenderable = Boolean(currentContent) && !previousContent;
    const modeChanged = previousMode !== undefined && previousMode !== outputMode;
    const fitRequested = fitRequestId !== (oldValue?.fitRequestId ?? 0);

    if (!currentContent) {
      clearPointerState();
      needsFit.value = false;
      autoFit.value = true;
      return;
    }

    if (!oldValue || contentBecameRenderable || modeChanged || fitRequested) {
      needsFit.value = true;
      syncFitWithLayout(outputMode);
    }
  },
  { immediate: true, flush: "post" },
);

useResizeObserver(viewportRef, () => {
  if (!hasCurrentOutput.value) {
    return;
  }

  syncFitWithLayout(props.outputMode);
});

useResizeObserver(svgHostRef, () => {
  if (props.outputMode !== "svg") {
    return;
  }

  syncFitWithLayout("svg");
});

useResizeObserver(textCanvasRef, () => {
  if (props.outputMode === "svg") {
    return;
  }

  syncFitWithLayout(props.outputMode);
});
</script>

<template>
  <BasePanel title="Preview" aria-label="Diagram preview">
    <template #info>
      <div class="preview-info">
        <span class="preview-status">{{ statusText }}</span>
        <BaseDropdownMenu
          aria-label="Preview export"
          menu-label="Preview export menu"
          :items="graphExportItems"
          :disabled="!props.canExport"
          :icon-only="true"
          trigger-icon="download"
          @select="onGraphExportSelect"
        />
      </div>
    </template>
    <div class="preview-stage">
      <div class="preview-toolbar-left">
        <BaseButton
          variant="solid"
          size="sm"
          :icon-only="true"
          class="zoom-toolbar-button"
          :disabled="!hasCurrentOutput"
          aria-label="Zoom to fit"
          title="Zoom to fit"
          @click="zoomToFit"
        >
          <Scan :size="14" :stroke-width="1.7" />
        </BaseButton>
        <BaseButton
          variant="solid"
          size="sm"
          class="zoom-toolbar-button zoom-percent-button"
          :disabled="!hasCurrentOutput"
          aria-label="Zoom to 100%"
          title="Zoom to 100%"
          @click="zoomToOneHundredPercent"
        >
          {{ zoomLabel }}
        </BaseButton>
      </div>

      <div class="preview-floating-controls">
        <BaseSegmentedControl
          class="output-toggles"
          :items="outputModeItems"
          :active-key="props.outputMode"
          :as-tabs="true"
          aria-label="Output mode"
          @select="onOutputModeSelect"
        />
      </div>

      <div
        ref="viewportRef"
        class="preview-viewport"
        @pointerdown="onViewportPointerDown"
        @pointermove="onViewportPointerMove"
        @pointerup="onViewportPointerUp"
        @pointercancel="onViewportPointerCancel"
        @wheel="onViewportWheel"
      >
        <div class="content-canvas" :style="canvasTransformStyle">
          <div
            v-if="props.outputMode === 'svg'"
            ref="svgHostRef"
            class="svg-host"
            :innerHTML="props.svg ?? ''"
          />

          <pre
            v-else
            ref="textCanvasRef"
            class="ascii-canvas"
            :style="{ fontFamily: props.monoFontFamily }"
          >
            <template v-for="(line, lineIndex) in coloredAsciiLines" :key="lineIndex">
              <template v-for="(segment, segmentIndex) in line" :key="`${lineIndex}-${segmentIndex}`">
                <span v-if="segment.color" :style="{ color: segment.color }">{{ segment.text }}</span>
                <template v-else>{{ segment.text }}</template>
              </template>
              <br v-if="lineIndex < coloredAsciiLines.length - 1" />
            </template>
          </pre>
        </div>

        <p v-if="!hasCurrentOutput && !props.error && !props.isRendering" class="placeholder">
          Preview will appear here.
        </p>

        <pre v-if="props.error" class="error-block">{{ props.error }}</pre>
      </div>
    </div>
  </BasePanel>
</template>

<style scoped>
.preview-info {
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
}

.preview-status {
  color: var(--text-muted);
  font-size: var(--fs-meta);
  line-height: var(--lh-tight);
  white-space: nowrap;
}

.preview-stage {
  position: relative;
  height: 100%;
  min-height: 0;
}

.preview-floating-controls {
  position: absolute;
  top: 0.58rem;
  right: 0.6rem;
  z-index: 6;
  pointer-events: none;
  display: grid;
  justify-items: end;
  gap: 0;
}

.output-toggles {
  pointer-events: auto;
}

.preview-toolbar-left {
  position: absolute;
  top: 0.58rem;
  left: 0.6rem;
  z-index: 6;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  pointer-events: auto;
}

.zoom-toolbar-button {
  min-height: var(--ui-control-height);
}

.zoom-percent-button {
  box-sizing: content-box;
  width: 4ch;
  min-width: 4ch;
  justify-content: center;
  padding-inline: 0.2rem;
  font-variant-numeric: tabular-nums;
  font-feature-settings:
    "tnum" 1,
    "lnum" 1;
}

.preview-viewport {
  position: relative;
  min-height: 100%;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  background:
    radial-gradient(
        circle at 1px 1px,
        color-mix(in srgb, var(--border-subtle) 40%, transparent) 1px,
        transparent 0
      )
      0 0 / 20px 20px,
    color-mix(in srgb, var(--surface) 96%, transparent);
}

.preview-viewport:active {
  cursor: grabbing;
}

.content-canvas {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}

.svg-host :deep(svg) {
  display: block;
  width: auto;
  height: auto;
  max-width: none;
  shape-rendering: geometricPrecision;
  text-rendering: geometricPrecision;
}

.svg-host :deep(text) {
  text-rendering: geometricPrecision;
}

.ascii-canvas {
  margin: 0;
  font-size: var(--fs-code);
  line-height: 1.38;
  color: var(--text-primary);
  white-space: pre;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: var(--text-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-normal);
}

.error-block {
  margin: 0.35rem 0 0;
  padding: 0.6rem 0.68rem;
  border: 0;
  border-radius: 8px;
  background: var(--danger-bg);
  color: var(--danger-text);
  font-size: var(--fs-meta);
  line-height: var(--lh-normal);
  white-space: pre-wrap;
}

.preview-viewport > .error-block {
  position: absolute;
  left: 0.84rem;
  right: 0.84rem;
  bottom: 0.84rem;
  margin: 0;
  z-index: 4;
}
</style>
