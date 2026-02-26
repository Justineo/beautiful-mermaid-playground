<script setup lang="ts">
const {
  type = 'button',
  variant = 'text',
  size = 'xs',
  iconOnly = false,
  disabled = false,
} = defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: 'text' | 'ghost' | 'solid'
  size?: 'xs' | 'sm'
  iconOnly?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <button
    :type="type"
    class="base-button"
    :class="[`variant-${variant}`, `size-${size}`, { 'icon-only': iconOnly }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.24rem;
  margin: 0;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  line-height: var(--lh-tight);
  white-space: nowrap;
  padding: 0 0.38rem;
  min-height: 22px;
}

.base-button.size-xs {
  font-size: var(--fs-meta);
  min-height: 20px;
  padding: 0 0.34rem;
}

.base-button.size-sm {
  font-size: var(--fs-control);
  min-height: var(--ui-control-height);
  padding: 0 0.42rem;
}

.base-button.icon-only {
  aspect-ratio: 1 / 1;
  padding: 0;
}

.base-button.size-xs.icon-only {
  width: 20px;
  min-width: 20px;
  min-height: 20px;
}

.base-button.size-sm.icon-only {
  width: var(--ui-control-height);
  min-width: var(--ui-control-height);
  min-height: var(--ui-control-height);
}

.base-button.variant-text {
  border-color: transparent;
  background: transparent;
}

.base-button.variant-text:hover:enabled {
  background: var(--button-hover);
}

.base-button.variant-text:active:enabled {
  background: var(--button-active);
}

.base-button.variant-ghost {
  border-color: color-mix(in srgb, var(--border-color) 88%, transparent);
  background: color-mix(in srgb, var(--surface) 96%, var(--surface-muted));
  color: var(--text-secondary);
}

.base-button.variant-ghost:hover:enabled {
  border-color: color-mix(in srgb, var(--border-strong) 88%, transparent);
  background: color-mix(in srgb, var(--surface-elevated) 86%, var(--surface));
}

.base-button.variant-solid {
  border-color: color-mix(in srgb, var(--border-color) 90%, transparent);
  background: var(--surface);
  color: var(--text-secondary);
}

.base-button.variant-solid:hover:enabled {
  border-color: color-mix(in srgb, var(--border-strong) 92%, transparent);
  background: color-mix(in srgb, var(--surface-elevated) 84%, var(--surface));
}
</style>
