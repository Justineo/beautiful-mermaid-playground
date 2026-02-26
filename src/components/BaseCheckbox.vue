<script setup lang="ts">
import { Check } from 'lucide-vue-next'

const {
  modelValue = false,
  disabled = false,
  id = '',
  ariaLabel = 'Toggle option',
} = defineProps<{
  modelValue?: boolean
  disabled?: boolean
  id?: string
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

function onInputChange(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', checked)
  emit('change', checked)
}
</script>

<template>
  <span class="ui-checkbox-wrap">
    <input
      :id="id"
      class="ui-checkbox-native"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @change="onInputChange"
    />
    <span class="ui-checkbox-visual" aria-hidden="true">
      <Check class="ui-checkbox-icon" :size="11" :stroke-width="1.8" />
    </span>
  </span>
</template>

<style scoped>
.ui-checkbox-wrap {
  position: relative;
  display: inline-grid;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.ui-checkbox-native {
  position: absolute;
  inset: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  z-index: 2;
  cursor: pointer;
}

.ui-checkbox-visual {
  width: 16px;
  height: 16px;
  min-height: 16px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
  background: color-mix(in srgb, var(--surface) 96%, var(--surface-muted));
  color: transparent;
  display: grid;
  place-items: center;
  pointer-events: none;
  transition:
    border-color 120ms ease,
    background-color 120ms ease,
    color 120ms ease,
    box-shadow 120ms ease,
    opacity 120ms ease;
}

.ui-checkbox-native:hover:enabled + .ui-checkbox-visual {
  border-color: color-mix(in srgb, var(--border-strong) 88%, transparent);
  background: color-mix(in srgb, var(--surface-elevated) 84%, var(--surface));
}

.ui-checkbox-native:checked + .ui-checkbox-visual {
  color: var(--surface);
  border-color: color-mix(in srgb, var(--text-primary) 62%, var(--border-color));
  background: color-mix(in srgb, var(--text-primary) 88%, var(--surface));
}

.ui-checkbox-native:checked:hover:enabled + .ui-checkbox-visual {
  background: color-mix(in srgb, var(--text-primary) 92%, var(--surface));
}

.ui-checkbox-native:focus-visible + .ui-checkbox-visual {
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--surface) 92%, transparent),
    inset 0 0 0 2px var(--focus-outline);
}

.ui-checkbox-native:disabled + .ui-checkbox-visual {
  opacity: 0.46;
}

.ui-checkbox-native:disabled {
  cursor: not-allowed;
}

.ui-checkbox-icon {
  transform: translateY(-0.4px);
}
</style>
