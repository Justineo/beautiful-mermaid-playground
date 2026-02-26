<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

type RgbaColor = {
  r: number
  g: number
  b: number
  a: number
}

type HsvColor = {
  h: number
  s: number
  v: number
}

const {
  modelValue,
  disabled = false,
  ariaLabel = 'Pick color',
  size = 'md',
  allowAlpha = true,
} = defineProps<{
  modelValue: string
  disabled?: boolean
  ariaLabel?: string
  size?: 'sm' | 'md'
  allowAlpha?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const svRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isDraggingSv = ref(false)

const rgba = ref<RgbaColor>(parseColor(modelValue) ?? { r: 0, g: 0, b: 0, a: 1 })
const hsv = ref<HsvColor>(rgbToHsv(rgba.value))

const triggerStyle = computed(() => ({
  background: toCssRgba(rgba.value),
}))
const hueColor = computed(() => `hsl(${Math.round(hsv.value.h)} 100% 50%)`)
const svCursorStyle = computed(() => ({
  left: `${Math.round(hsv.value.s * 100)}%`,
  top: `${Math.round((1 - hsv.value.v) * 100)}%`,
}))
const alphaTrackStyle = computed(() => ({
  '--alpha-start': `rgba(${rgba.value.r}, ${rgba.value.g}, ${rgba.value.b}, 0)`,
  '--alpha-end': `rgba(${rgba.value.r}, ${rgba.value.g}, ${rgba.value.b}, 1)`,
}))
const alphaInput = computed(() => Math.round(rgba.value.a * 100))
const valueLabel = computed(() => formatOutputColor(rgba.value, allowAlpha))
const valueInput = ref(valueLabel.value)
const isValueEditing = ref(false)

watch(
  () => modelValue,
  (nextValue) => {
    const parsed = parseColor(nextValue)
    if (!parsed) {
      return
    }

    rgba.value = parsed
    hsv.value = rgbToHsv(parsed)
  },
)

watch(valueLabel, (nextValue) => {
  if (isValueEditing.value) {
    return
  }

  valueInput.value = nextValue
})

onClickOutside(
  () => rootRef.value,
  () => {
    isOpen.value = false
  },
)

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function toHexByte(value: number): string {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
}

function toCssRgba(color: RgbaColor): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${clamp(color.a, 0, 1)})`
}

function parseHex(value: string): RgbaColor | null {
  const normalized = value.trim().replace('#', '')
  if (!/^[\da-f]{3,4}$|^[\da-f]{6}$|^[\da-f]{8}$/iu.test(normalized)) {
    return null
  }

  if (normalized.length === 3 || normalized.length === 4) {
    const [r, g, b, a] = normalized.split('')
    if (!r || !g || !b) {
      return null
    }

    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
      a: a ? Number.parseInt(a + a, 16) / 255 : 1,
    }
  }

  const hasAlpha = normalized.length === 8
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a: hasAlpha ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1,
  }
}

function parseRgbFunction(value: string): RgbaColor | null {
  const rgbRegex =
    /^rgba?\(\s*(-?\d+)\s*[, ]\s*(-?\d+)\s*[, ]\s*(-?\d+)(?:\s*[,/]\s*(\d*\.?\d+)\s*)?\)$/iu
  const matched = value.trim().match(rgbRegex)
  if (!matched) {
    return null
  }

  const r = Number.parseFloat(matched[1] ?? '0')
  const g = Number.parseFloat(matched[2] ?? '0')
  const b = Number.parseFloat(matched[3] ?? '0')
  const alpha = Number.parseFloat(matched[4] ?? '1')

  return {
    r: clamp(r, 0, 255),
    g: clamp(g, 0, 255),
    b: clamp(b, 0, 255),
    a: Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1,
  }
}

function parseColor(value: string): RgbaColor | null {
  return parseHex(value) ?? parseRgbFunction(value)
}

function formatOutputColor(color: RgbaColor, withAlpha: boolean): string {
  const alpha = clamp(color.a, 0, 1)
  if (!withAlpha || alpha >= 0.999) {
    return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`
  }

  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}${toHexByte(alpha * 255)}`
}

function rgbToHsv(color: RgbaColor): HsvColor {
  const r = clamp(color.r, 0, 255) / 255
  const g = clamp(color.g, 0, 255) / 255
  const b = clamp(color.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h *= 60
    if (h < 0) {
      h += 360
    }
  }

  const s = max === 0 ? 0 : delta / max
  const v = max
  return { h, s, v }
}

function hsvToRgb(color: HsvColor, alpha: number): RgbaColor {
  const h = ((color.h % 360) + 360) % 360
  const s = clamp(color.s, 0, 1)
  const v = clamp(color.v, 0, 1)
  const chroma = v * s
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - chroma

  let rgbPrime: [number, number, number] = [0, 0, 0]
  if (h < 60) {
    rgbPrime = [chroma, x, 0]
  } else if (h < 120) {
    rgbPrime = [x, chroma, 0]
  } else if (h < 180) {
    rgbPrime = [0, chroma, x]
  } else if (h < 240) {
    rgbPrime = [0, x, chroma]
  } else if (h < 300) {
    rgbPrime = [x, 0, chroma]
  } else {
    rgbPrime = [chroma, 0, x]
  }

  return {
    r: Math.round((rgbPrime[0] + m) * 255),
    g: Math.round((rgbPrime[1] + m) * 255),
    b: Math.round((rgbPrime[2] + m) * 255),
    a: clamp(alpha, 0, 1),
  }
}

function emitColor(nextRgba: RgbaColor): void {
  const normalized: RgbaColor = {
    r: clamp(nextRgba.r, 0, 255),
    g: clamp(nextRgba.g, 0, 255),
    b: clamp(nextRgba.b, 0, 255),
    a: allowAlpha ? clamp(nextRgba.a, 0, 1) : 1,
  }

  rgba.value = normalized
  hsv.value = rgbToHsv(normalized)
  emit('update:modelValue', formatOutputColor(normalized, allowAlpha))
}

function updateSvFromPointer(event: PointerEvent): void {
  const area = svRef.value
  if (!area) {
    return
  }

  const rect = area.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return
  }

  const s = clamp((event.clientX - rect.left) / rect.width, 0, 1)
  const v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1)
  const nextHsv: HsvColor = {
    ...hsv.value,
    s,
    v,
  }
  emitColor(hsvToRgb(nextHsv, rgba.value.a))
}

function onSvPointerDown(event: PointerEvent): void {
  if (disabled) {
    return
  }

  isDraggingSv.value = true
  svRef.value?.setPointerCapture(event.pointerId)
  updateSvFromPointer(event)
}

function onSvPointerMove(event: PointerEvent): void {
  if (!isDraggingSv.value) {
    return
  }

  updateSvFromPointer(event)
}

function onSvPointerUp(event: PointerEvent): void {
  if (!isDraggingSv.value) {
    return
  }

  isDraggingSv.value = false
  svRef.value?.releasePointerCapture(event.pointerId)
}

function onHueInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) {
    return
  }

  const nextHsv: HsvColor = {
    ...hsv.value,
    h: clamp(value, 0, 359),
  }
  emitColor(hsvToRgb(nextHsv, rgba.value.a))
}

function onAlphaInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) {
    return
  }

  emitColor({
    ...rgba.value,
    a: clamp(value / 100, 0, 1),
  })
}

function onRgbInput(channel: 'r' | 'g' | 'b', event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) {
    return
  }

  emitColor({
    ...rgba.value,
    [channel]: clamp(value, 0, 255),
  })
}

function onAlphaNumberInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) {
    return
  }

  emitColor({
    ...rgba.value,
    a: clamp(value / 100, 0, 1),
  })
}

function rollbackValueInput(): void {
  isValueEditing.value = false
  valueInput.value = valueLabel.value
}

function commitValueInput(): void {
  const parsed = parseHex(valueInput.value)
  if (!parsed) {
    rollbackValueInput()
    return
  }

  isValueEditing.value = false
  emitColor(parsed)
}

function onValueInput(event: Event): void {
  valueInput.value = (event.target as HTMLInputElement).value
}

function onValueFocus(): void {
  isValueEditing.value = true
}

function onValueBlur(): void {
  if (!isValueEditing.value) {
    return
  }

  commitValueInput()
}

function onValueChange(): void {
  if (!isValueEditing.value) {
    return
  }

  commitValueInput()
}

function onValueKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitValueInput()
    ;(event.target as HTMLInputElement).blur()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    rollbackValueInput()
    ;(event.target as HTMLInputElement).blur()
  }
}

function onTriggerClick(): void {
  if (disabled) {
    return
  }

  isOpen.value = !isOpen.value
}

function onRootKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}
</script>

<template>
  <div
    ref="rootRef"
    class="color-picker"
    :class="[`size-${size}`, { open: isOpen, disabled }]"
    @keydown="onRootKeydown"
  >
    <button
      type="button"
      class="ui-control-surface color-trigger"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      :title="valueLabel"
      @click="onTriggerClick"
    >
      <span class="swatch-bg" aria-hidden="true">
        <span class="swatch-color" :style="triggerStyle" />
      </span>
    </button>

    <div v-if="isOpen" class="picker-popover" role="dialog" aria-label="Color picker">
      <div
        ref="svRef"
        class="sv-area"
        :style="{ '--picker-hue': hueColor }"
        @pointerdown="onSvPointerDown"
        @pointermove="onSvPointerMove"
        @pointerup="onSvPointerUp"
        @pointercancel="onSvPointerUp"
      >
        <span class="sv-cursor" :style="svCursorStyle" />
      </div>

      <div class="slider-group">
        <input
          class="slider hue-slider"
          type="range"
          min="0"
          max="359"
          step="1"
          :value="Math.min(359, Math.round(hsv.h))"
          @input="onHueInput"
        />
        <input
          v-if="allowAlpha"
          class="slider alpha-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="alphaInput"
          :style="alphaTrackStyle"
          @input="onAlphaInput"
        />
      </div>

      <div class="inputs-grid">
        <label>
          <span>R</span>
          <input
            type="number"
            min="0"
            max="255"
            :value="Math.round(rgba.r)"
            @input="onRgbInput('r', $event)"
          />
        </label>
        <label>
          <span>G</span>
          <input
            type="number"
            min="0"
            max="255"
            :value="Math.round(rgba.g)"
            @input="onRgbInput('g', $event)"
          />
        </label>
        <label>
          <span>B</span>
          <input
            type="number"
            min="0"
            max="255"
            :value="Math.round(rgba.b)"
            @input="onRgbInput('b', $event)"
          />
        </label>
        <label v-if="allowAlpha">
          <span>A</span>
          <input type="number" min="0" max="100" :value="alphaInput" @input="onAlphaNumberInput" />
        </label>
      </div>

      <input
        type="text"
        class="value-input"
        :value="valueInput"
        :disabled="disabled"
        :placeholder="allowAlpha ? '#RRGGBB or #RRGGBBAA' : '#RRGGBB'"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        @input="onValueInput"
        @focus="onValueFocus"
        @change="onValueChange"
        @blur="onValueBlur"
        @keydown="onValueKeydown"
      />
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  position: relative;
  display: inline-flex;
  min-width: 0;
}

.color-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 0;
  overflow: hidden;
}

.color-picker.size-md .color-trigger {
  width: 28px;
  min-width: 28px;
  height: 18px;
  min-height: 18px;
  border-radius: 3px;
}

.color-picker.size-sm .color-trigger {
  width: 24px;
  min-width: 24px;
  height: 16px;
  min-height: 16px;
  border-radius: 3px;
}

.swatch-bg {
  width: 100%;
  height: 100%;
  padding: 1px;
  border-radius: inherit;
  background:
    linear-gradient(
      45deg,
      color-mix(in srgb, var(--border-color) 42%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      -45deg,
      color-mix(in srgb, var(--border-color) 42%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      45deg,
      transparent 75%,
      color-mix(in srgb, var(--border-color) 42%, transparent) 75%
    ),
    linear-gradient(
      -45deg,
      transparent 75%,
      color-mix(in srgb, var(--border-color) 42%, transparent) 75%
    ),
    var(--surface);
  background-size: 6px 6px;
  background-position:
    0 0,
    0 3px,
    3px -3px,
    -3px 0;
}

.swatch-color {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: calc(var(--ui-control-radius) - 3px);
}

.picker-popover {
  position: absolute;
  z-index: 24;
  top: calc(100% + 0.36rem);
  right: 0;
  width: 188px;
  display: grid;
  gap: 0.42rem;
  padding: 0.42rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--border-color) 56%, transparent);
  background: color-mix(in srgb, var(--surface) 98%, var(--surface-muted));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--t-fg) 10%, transparent);
}

.sv-area {
  position: relative;
  width: 100%;
  height: 98px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--border-color) 56%, transparent);
  background:
    linear-gradient(to top, #000, transparent),
    linear-gradient(to right, #fff, color-mix(in srgb, var(--picker-hue) 96%, transparent));
  background-clip: content-box;
  cursor: crosshair;
  touch-action: none;
}

.sv-cursor {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid #fff;
  box-shadow: 0 0 0 1px color-mix(in srgb, #000 36%, transparent);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.slider-group {
  display: grid;
  gap: 0.24rem;
}

.slider {
  width: 100%;
  margin: 0;
  appearance: none;
  height: 11px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-color) 56%, transparent);
  background: var(--surface);
}

.hue-slider {
  background: linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
}

.alpha-slider {
  padding: 1px;
  background:
    linear-gradient(90deg, var(--alpha-start), var(--alpha-end)),
    linear-gradient(
      45deg,
      color-mix(in srgb, var(--border-color) 36%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      -45deg,
      color-mix(in srgb, var(--border-color) 36%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      45deg,
      transparent 75%,
      color-mix(in srgb, var(--border-color) 36%, transparent) 75%
    ),
    linear-gradient(
      -45deg,
      transparent 75%,
      color-mix(in srgb, var(--border-color) 36%, transparent) 75%
    ),
    var(--surface);
  background-clip: content-box, content-box, content-box, content-box, content-box, padding-box;
  background-origin: content-box, content-box, content-box, content-box, content-box, padding-box;
  background-size:
    100% 100%,
    6px 6px,
    6px 6px,
    6px 6px,
    6px 6px,
    auto;
  background-position:
    0 0,
    0 0,
    0 3px,
    3px -3px,
    -3px 0,
    0 0;
  background-repeat: no-repeat, repeat, repeat, repeat, repeat, repeat;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  background: var(--surface);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--t-fg) 14%, transparent);
}

.slider::-moz-range-thumb {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  background: var(--surface);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--t-fg) 14%, transparent);
}

.inputs-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.2rem;
}

.inputs-grid label {
  display: grid;
  gap: 0.1rem;
}

.inputs-grid label > span {
  color: var(--text-muted);
  font-size: calc(var(--fs-meta) - 0.02rem);
  line-height: var(--lh-tight);
  text-align: center;
}

.inputs-grid input {
  width: 100%;
  min-height: 20px;
  padding: 0 0.22rem;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--border-color) 64%, transparent);
  background: color-mix(in srgb, var(--surface) 98%, var(--surface-muted));
  color: var(--text-secondary);
  font-size: calc(var(--fs-control) - 0.02rem);
  text-align: center;
}

.value-input {
  width: 100%;
  min-height: 20px;
  padding: 0 0.28rem;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--border-color) 64%, transparent);
  background: color-mix(in srgb, var(--surface) 98%, var(--surface-muted));
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'Geist Mono', monospace;
  font-size: calc(var(--fs-control) - 0.02rem);
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
  text-align: center;
}

.value-input::placeholder {
  color: color-mix(in srgb, var(--text-muted) 84%, transparent);
}

.value-input:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

@media (max-width: 959px) {
  .picker-popover {
    width: 182px;
    padding: 0.38rem;
  }

  .sv-area {
    height: 92px;
  }
}
</style>
