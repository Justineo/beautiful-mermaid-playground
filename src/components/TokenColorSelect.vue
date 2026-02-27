<script setup lang="ts">
import { computed } from "vue";
import BaseColorPicker from "@/components/BaseColorPicker.vue";
import BaseSelect from "@/components/BaseSelect.vue";

export type TokenColorOption = {
  label: string;
  value: string;
  isToken?: boolean;
  group?: "mode" | "token";
  disabled?: boolean;
};

const {
  modelValue,
  options,
  customValue = "#000000",
  customValueKey = "custom",
  defaultValueKey = "default",
  transparentValueKey = "transparent",
  disabled = false,
  swatchColorForValue,
} = defineProps<{
  modelValue: string;
  options: TokenColorOption[];
  customValue?: string;
  customValueKey?: string;
  defaultValueKey?: string;
  transparentValueKey?: string;
  disabled?: boolean;
  swatchColorForValue: (value: string) => string | null | undefined;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:customValue": [value: string];
}>();

const tokenValues = computed(() => {
  const values = new Set<string>();
  for (const option of options) {
    if (option.isToken) {
      values.add(option.value);
    }
  }
  return values;
});

const showCustomColorInput = computed(() => modelValue === customValueKey);
const groupedOptions = computed(() => {
  const groups = new Map<string, TokenColorOption[]>();

  for (const option of options) {
    const key = option.group ?? "default";
    const existing = groups.get(key);
    if (existing) {
      existing.push(option);
      continue;
    }

    groups.set(key, [option]);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    id: key,
    options: items,
  }));
});

function getSelectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}

function onValueChange(event: Event): void {
  const nextValue = getSelectValue(event);
  emit("update:modelValue", nextValue);

  if (nextValue !== defaultValueKey) {
    return;
  }

  const resetColor = normalizeHexColor(swatchColorForValue(defaultValueKey));
  if (!resetColor) {
    return;
  }

  emit("update:customValue", resetColor);
}

function onCustomColorInput(value: string): void {
  emit("update:customValue", value);
}

function isTokenValue(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return tokenValues.value.has(value);
}

function isTransparentValue(value: string | null | undefined): boolean {
  return value === transparentValueKey;
}

function getSwatchStyle(value: string | null | undefined): Record<string, string> {
  if (!value || isTransparentValue(value)) {
    return {};
  }

  const color = swatchColorForValue(value);
  if (!color || color === "transparent") {
    return {};
  }

  return {
    background: color,
  };
}

function getSelectedText(value: string | null | undefined, fallbackLabel: string): string {
  if (value !== customValueKey) {
    return fallbackLabel;
  }

  return customValue.trim().toUpperCase();
}

function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (/^#[\da-f]{6}$/iu.test(normalized) || /^#[\da-f]{8}$/iu.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (!/^#[\da-f]{3}$/iu.test(normalized) && !/^#[\da-f]{4}$/iu.test(normalized)) {
    return null;
  }

  const [r, g, b, a] = normalized.slice(1).split("");
  if (!r || !g || !b) {
    return null;
  }

  return `#${r}${r}${g}${g}${b}${b}${a ? a + a : ""}`.toUpperCase();
}
</script>

<template>
  <div class="token-color-select" :class="{ 'has-custom-swatch': showCustomColorInput }">
    <BaseSelect :value="modelValue" :disabled="disabled" @change="onValueChange">
      <optgroup v-for="group in groupedOptions" :key="group.id" label=" ">
        <option
          v-for="option in group.options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </optgroup>

      <template #selected="{ option, label }">
        <span class="token-color-option">
          <span
            class="token-color-swatch"
            :class="{ transparent: isTransparentValue(option?.value) }"
            :style="getSwatchStyle(option?.value)"
          />
          <span
            :class="{
              'token-key': isTokenValue(option?.value) || option?.value === customValueKey,
            }"
            >{{ getSelectedText(option?.value, label) }}</span
          >
        </span>
      </template>

      <template #option="{ option }">
        <span class="token-color-option">
          <span
            class="token-color-swatch"
            :class="{ transparent: isTransparentValue(option.value) }"
            :style="getSwatchStyle(option.value)"
          />
          <span :class="{ 'token-key': isTokenValue(option.value) }">{{ option.label }}</span>
        </span>
      </template>
    </BaseSelect>

    <BaseColorPicker
      v-if="showCustomColorInput"
      class="custom-picker"
      size="sm"
      :model-value="customValue"
      aria-label="Pick custom token color"
      @update:model-value="onCustomColorInput"
    />
  </div>
</template>

<style scoped>
.token-color-select {
  width: 132px;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-self: end;
  min-height: var(--ui-control-height);
  gap: 0;
  min-width: 0;
}

.token-color-select :deep(.ui-select-control) {
  width: auto;
  flex: 1 1 auto;
  min-width: 0;
}

.token-color-select :deep(.ui-select-trigger) {
  width: 100%;
}

.custom-picker {
  flex: 0 0 auto;
}

.token-color-select.has-custom-swatch {
  gap: 0.28rem;
}

.token-color-option {
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  min-width: 0;
}

.token-color-swatch {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  border: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
  background: var(--surface-muted);
  flex: 0 0 auto;
}

.token-color-swatch.transparent {
  background:
    linear-gradient(
      45deg,
      color-mix(in srgb, var(--border-color) 50%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      -45deg,
      color-mix(in srgb, var(--border-color) 50%, transparent) 25%,
      transparent 25%
    ),
    linear-gradient(
      45deg,
      transparent 75%,
      color-mix(in srgb, var(--border-color) 50%, transparent) 75%
    ),
    linear-gradient(
      -45deg,
      transparent 75%,
      color-mix(in srgb, var(--border-color) 50%, transparent) 75%
    ),
    var(--surface);
  background-size: 6px 6px;
  background-position:
    0 0,
    0 3px,
    3px -3px,
    -3px 0;
}

.token-key {
  font-family: "JetBrains Mono", "Geist Mono", monospace;
  font-size: calc(var(--fs-meta) - 0.01rem);
  letter-spacing: 0;
  text-transform: none;
}
</style>
