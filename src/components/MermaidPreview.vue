<script setup lang="ts">
import { AlertTriangle, CircleX, Info, Scan } from "lucide-vue-next";
import { useResizeObserver } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import BaseCheckbox from "@/components/BaseCheckbox.vue";
import BaseDropdownMenu from "@/components/BaseDropdownMenu.vue";
import BasePanel from "@/components/BasePanel.vue";
import BaseSegmentedControl from "@/components/BaseSegmentedControl.vue";
import { RENDER_OUTPUT_MODE_OPTIONS, TEXT_COLOR_MODE_OPTIONS } from "@/types/playground";
import type { RenderOutputMode, TextColorMode, TextOutputWarning } from "@/types/playground";

type ViewportPoint = {
  x: number;
  y: number;
};

type ContentSize = {
  width: number;
  height: number;
};

const props = defineProps<{
  outputMode: RenderOutputMode;
  fitRequestId: number;
  monoFontFamily: string;
  textWarnings: TextOutputWarning[];
  svg: string | null;
  asciiHtml: string | null;
  error: string | null;
  durationMs: number | null;
  isRendering: boolean;
  canExport: boolean;
  transparent: boolean;
  transparentApplied: boolean;
}>();

type TextOutputMode = Exclude<RenderOutputMode, "svg">;

const emit = defineEmits<{
  "export:copy-svg": [];
  "export:copy-png": [];
  "export:download-svg": [];
  "export:download-png": [];
  "export:copy-text": [payload: { mode: TextOutputMode; colorMode: TextColorMode }];
  "update:outputMode": [value: RenderOutputMode];
  "update:transparent": [value: boolean];
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
  props.outputMode === "svg" ? Boolean(props.svg) : Boolean(props.asciiHtml),
);
const isTransparentPreview = computed(() => props.outputMode === "svg" && props.transparentApplied);
const renderDurationText = computed(() => {
  if (props.isRendering || props.error || props.durationMs === null) {
    return null;
  }

  return `Rendered in ${props.durationMs}ms`;
});
const visibleWarnings = computed(() => {
  if (props.outputMode === "svg" || props.error) {
    return [];
  }

  return props.textWarnings;
});
const graphExportItems = computed<Array<{ key: string; label: string }>>(() => {
  if (props.outputMode === "svg") {
    return [
      { key: "copy-svg", label: "Copy SVG" },
      { key: "copy-png", label: "Copy PNG (@2x)" },
      { key: "download-svg", label: "Download SVG" },
      { key: "download-png", label: "Download PNG (@2x)" },
    ];
  }

  return TEXT_COLOR_MODE_OPTIONS.map((option) => ({
    key: `copy-text-${option.value}`,
    label: `Copy ${option.label}`,
  }));
});
const exportTriggerIcon = "copy" as const;
const outputModeItems: Array<{ key: string; label: string }> = RENDER_OUTPUT_MODE_OPTIONS.map(
  (item) => ({
    key: item.value,
    label: item.label,
  }),
);

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
  if (width <= 1 && height <= 1 && !props.asciiHtml) {
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

function isFeedbackEvent(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest(".feedback-layer"));
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
  if (isFeedbackEvent(event)) {
    return;
  }

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
  if (isFeedbackEvent(event)) {
    return;
  }

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

  if (key.startsWith("copy-text-") && props.outputMode !== "svg") {
    const colorMode = key.replace("copy-text-", "") as TextColorMode;
    if (!TEXT_COLOR_MODE_OPTIONS.some((option) => option.value === colorMode)) {
      return;
    }
    emit("export:copy-text", {
      mode: props.outputMode,
      colorMode,
    });
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
    asciiHtml: props.asciiHtml,
    outputMode: props.outputMode,
    fitRequestId: props.fitRequestId,
  }),
  (newValue, oldValue) => {
    const { svg, asciiHtml, outputMode, fitRequestId } = newValue;
    const previousMode = oldValue?.outputMode;
    const currentContent = outputMode === "svg" ? svg : asciiHtml;
    const previousContent = oldValue
      ? oldValue.outputMode === "svg"
        ? oldValue.svg
        : oldValue.asciiHtml
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
        <span v-if="renderDurationText" class="preview-duration">{{ renderDurationText }}</span>
        <BaseDropdownMenu
          aria-label="Preview export"
          menu-label="Preview export menu"
          :items="graphExportItems"
          :disabled="!props.canExport"
          :icon-only="true"
          :trigger-icon="exportTriggerIcon"
          @select="onGraphExportSelect"
        />
      </div>
    </template>
    <div class="preview-stage">
      <div class="preview-toolbar-row">
        <div class="preview-toolbar-left">
          <BaseButton
            variant="solid"
            size="sm"
            :icon-only="true"
            class="zoom-toolbar-button"
            :disabled="!hasCurrentOutput"
            aria-label="Zoom to fit"
            title="Zoom to fit"
            @click="zoomToFit()"
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

        <div class="preview-toolbar-right">
          <BaseSegmentedControl
            class="output-toggles"
            :items="outputModeItems"
            :active-key="props.outputMode"
            :as-tabs="true"
            aria-label="Output mode"
            @select="onOutputModeSelect"
          />
        </div>
      </div>

      <div
        ref="viewportRef"
        class="preview-viewport"
        :class="{ 'preview-viewport-transparent': isTransparentPreview }"
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
            v-html="props.asciiHtml ?? ''"
          />
        </div>
        <p v-if="props.error" class="feedback-layer feedback-block tone-error">
          <span class="feedback-label">
            <CircleX :size="12" :stroke-width="1.85" class="feedback-label-icon" />
          </span>
          <span class="feedback-message">{{ props.error }}</span>
        </p>
        <div v-else-if="visibleWarnings.length > 0" class="feedback-layer feedback-stack">
          <p
            v-for="warning in visibleWarnings"
            :key="warning.key"
            class="feedback-block"
            :class="`tone-${warning.tone}`"
          >
            <span class="feedback-label">
              <AlertTriangle
                v-if="warning.tone === 'warning'"
                :size="12"
                :stroke-width="1.85"
                class="feedback-label-icon"
              />
              <Info v-else :size="12" :stroke-width="1.85" class="feedback-label-icon" />
            </span>
            <span class="feedback-message">{{ warning.message }}</span>
          </p>
        </div>
      </div>

      <div v-if="props.outputMode === 'svg'" class="preview-bottom-controls">
        <label class="preview-transparent-toggle">
          <span>Transparent background</span>
          <BaseCheckbox
            id="preview-transparent-toggle"
            :model-value="props.transparent"
            aria-label="Toggle transparent background"
            @update:model-value="emit('update:transparent', $event)"
          />
        </label>
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

.preview-duration {
  color: var(--text-muted);
  font-size: var(--fs-meta);
  line-height: var(--lh-tight);
  font-variant-numeric: tabular-nums;
  font-feature-settings:
    "tnum" 1,
    "lnum" 1;
  white-space: nowrap;
}

.preview-transparent-toggle {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  color: var(--preview-toolbar-control-fg);
  font-size: var(--fs-control);
  line-height: var(--lh-tight);
  white-space: nowrap;
  pointer-events: auto;
  margin-left: 0;
  min-height: var(--ui-control-height);
  padding: 0 0.42rem;
  border-radius: 6px;
  background: var(--preview-toolbar-control-bg);
  border: 1px solid var(--preview-toolbar-control-border);
  transition:
    border-color 120ms ease,
    background-color 120ms ease;
}

.preview-transparent-toggle > span {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.preview-transparent-toggle:hover {
  border-color: var(--preview-toolbar-control-border-hover);
  background: var(--preview-toolbar-control-bg-hover);
}

.preview-bottom-controls {
  position: absolute;
  left: 50%;
  bottom: 0.58rem;
  transform: translateX(-50%);
  z-index: 6;
  pointer-events: none;
}

.preview-bottom-controls .preview-transparent-toggle {
  pointer-events: auto;
}

.preview-stage {
  --preview-toolbar-control-fg: var(--text-secondary);
  --preview-toolbar-control-border: color-mix(in srgb, var(--border-color) 90%, transparent);
  --preview-toolbar-control-border-hover: color-mix(in srgb, var(--border-strong) 92%, transparent);
  --preview-toolbar-control-bg: var(--surface);
  --preview-toolbar-control-bg-hover: color-mix(
    in srgb,
    var(--surface-elevated) 84%,
    var(--surface)
  );
  position: relative;
  height: 100%;
  min-height: 0;
}

.preview-toolbar-row {
  position: absolute;
  top: 0.58rem;
  left: 0.6rem;
  right: 0.6rem;
  z-index: 6;
  min-height: var(--ui-control-height);
  pointer-events: none;
}

.preview-toolbar-left {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  pointer-events: auto;
  min-width: max-content;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.preview-toolbar-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: auto;
  min-width: max-content;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.output-toggles {
  pointer-events: auto;
  max-width: 100%;
}

.zoom-toolbar-button {
  min-height: var(--ui-control-height);
  color: var(--preview-toolbar-control-fg);
  border-color: var(--preview-toolbar-control-border);
  background: var(--preview-toolbar-control-bg);
}

.zoom-toolbar-button:hover:enabled {
  border-color: var(--preview-toolbar-control-border-hover);
  background: var(--preview-toolbar-control-bg-hover);
}

.zoom-toolbar-button.zoom-percent-button {
  box-sizing: content-box;
  width: 4ch;
  min-width: 4ch;
  min-height: calc(var(--ui-control-height) - 2px);
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
  background: color-mix(in srgb, var(--surface) 96%, transparent);
}

.preview-viewport:not(.preview-viewport-transparent) {
  background:
    radial-gradient(
        circle at 1px 1px,
        color-mix(in srgb, var(--border-subtle) 40%, transparent) 1px,
        transparent 0
      )
      0 0 / 20px 20px,
    color-mix(in srgb, var(--surface) 96%, transparent);
}

.preview-viewport.preview-viewport-transparent {
  background:
    linear-gradient(
        45deg,
        color-mix(in srgb, var(--border-subtle) 36%, transparent) 25%,
        transparent 25%
      )
      0 0 / 16px 16px,
    linear-gradient(
        -45deg,
        color-mix(in srgb, var(--border-subtle) 36%, transparent) 25%,
        transparent 25%
      )
      0 8px / 16px 16px,
    linear-gradient(
        45deg,
        transparent 75%,
        color-mix(in srgb, var(--border-subtle) 36%, transparent) 75%
      )
      8px -8px / 16px 16px,
    linear-gradient(
        -45deg,
        transparent 75%,
        color-mix(in srgb, var(--border-subtle) 36%, transparent) 75%
      ) -8px
      0 / 16px 16px,
    color-mix(in srgb, var(--surface) 90%, var(--surface-muted));
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

.feedback-block {
  --feedback-border: color-mix(in srgb, var(--border-color) 64%, transparent);
  --feedback-bg: color-mix(in srgb, var(--surface-elevated) 94%, var(--surface));
  --feedback-fg: var(--text-secondary);
  --feedback-label-fg: var(--text-primary);
  margin: 0.35rem 0 0;
  padding: 0.6rem 0.68rem;
  border: 1px solid var(--feedback-border);
  border-radius: 8px;
  background: var(--feedback-bg);
  color: var(--feedback-fg);
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-normal);
  white-space: pre-wrap;
  cursor: default;
  pointer-events: auto;
  touch-action: auto;
}

.preview-viewport > .feedback-block {
  position: absolute;
  left: 0.84rem;
  right: 0.84rem;
  bottom: 0.84rem;
  margin: 0;
  z-index: 4;
}

.feedback-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin-top: calc((1em * var(--lh-normal) - 12px) / 2);
  line-height: 1;
  font-weight: 560;
  color: var(--feedback-label-fg);
  white-space: nowrap;
}

.feedback-label-icon {
  display: block;
  flex: 0 0 auto;
}

.feedback-message {
  flex: 1;
  min-width: 0;
  cursor: text;
  white-space: normal;
}

.feedback-layer,
.feedback-layer * {
  user-select: text;
  -webkit-user-select: text;
}

.feedback-stack {
  position: absolute;
  left: 0.84rem;
  right: 0.84rem;
  bottom: 0.84rem;
  z-index: 4;
  display: grid;
  gap: 0.36rem;
  pointer-events: auto;
  cursor: default;
  touch-action: auto;
}

.feedback-stack > .feedback-block {
  margin: 0;
}

.feedback-block.tone-error {
  --feedback-border: color-mix(in srgb, var(--danger-text) 16%, transparent);
  --feedback-bg: var(--danger-bg);
  --feedback-fg: var(--danger-text);
  --feedback-label-fg: var(--danger-text);
}

.feedback-block.tone-warning {
  --feedback-border: color-mix(in srgb, var(--warning-text) 14%, transparent);
  --feedback-bg: var(--warning-bg);
  --feedback-fg: var(--warning-text);
  --feedback-label-fg: var(--warning-text);
}

.feedback-block.tone-info {
  --feedback-border: color-mix(in srgb, var(--border-color) 64%, transparent);
  --feedback-bg: color-mix(in srgb, var(--surface-elevated) 94%, var(--surface));
  --feedback-fg: var(--text-secondary);
  --feedback-label-fg: var(--text-primary);
}
</style>
