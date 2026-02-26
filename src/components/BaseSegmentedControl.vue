<script setup lang="ts">
import { ref } from "vue";
import type { Component } from "vue";
import type { CSSProperties } from "vue";
import type { ComponentPublicInstance } from "vue";

type SegmentedControlItem = {
  key: string;
  label: string;
  disabled?: boolean;
  icon?: Component;
  iconOnly?: boolean;
  previewStyle?: CSSProperties;
  previewClass?: string;
  previewInnerStyle?: CSSProperties;
  previewInnerClass?: string;
};

const props = defineProps<{
  items: SegmentedControlItem[];
  activeKey?: string;
  activeKeys?: string[];
  multiple?: boolean;
  asTabs?: boolean;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  select: [key: string];
}>();

const buttonRefs = ref<Array<HTMLButtonElement | null>>([]);

function isActive(key: string): boolean {
  if (props.multiple) {
    return props.activeKeys?.includes(key) ?? false;
  }

  return props.activeKey === key;
}

function onSelect(item: SegmentedControlItem): void {
  if (item.disabled) {
    return;
  }

  emit("select", item.key);
}

function setButtonRef(index: number, element: Element | ComponentPublicInstance | null): void {
  buttonRefs.value[index] = element instanceof HTMLButtonElement ? element : null;
}

function findFirstEnabledIndex(): number {
  return props.items.findIndex((item) => !item.disabled);
}

function findLastEnabledIndex(): number {
  for (let index = props.items.length - 1; index >= 0; index -= 1) {
    if (!props.items[index]?.disabled) {
      return index;
    }
  }

  return -1;
}

function findActiveIndex(): number {
  const index = props.items.findIndex((item) => isActive(item.key) && !item.disabled);
  if (index >= 0) {
    return index;
  }

  return findFirstEnabledIndex();
}

function findNextEnabledIndex(startIndex: number, direction: 1 | -1): number {
  const total = props.items.length;
  if (total === 0) {
    return -1;
  }

  let index = startIndex;
  for (let step = 0; step < total; step += 1) {
    index = (index + direction + total) % total;
    if (!props.items[index]?.disabled) {
      return index;
    }
  }

  return -1;
}

function focusButton(index: number): void {
  if (index < 0) {
    return;
  }

  buttonRefs.value[index]?.focus();
}

function selectByIndex(index: number): void {
  const item = props.items[index];
  if (!item || item.disabled) {
    return;
  }

  emit("select", item.key);
}

function moveFocusAndMaybeSelect(currentKey: string, direction: 1 | -1): void {
  const currentIndex = props.items.findIndex((item) => item.key === currentKey);
  const startIndex = currentIndex >= 0 ? currentIndex : findActiveIndex();
  if (startIndex < 0) {
    return;
  }

  const nextIndex = findNextEnabledIndex(startIndex, direction);
  if (nextIndex < 0) {
    return;
  }

  focusButton(nextIndex);
  if (props.asTabs || !props.multiple) {
    selectByIndex(nextIndex);
  }
}

function onButtonKeydown(event: KeyboardEvent, currentKey: string): void {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    moveFocusAndMaybeSelect(currentKey, 1);
    return;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    moveFocusAndMaybeSelect(currentKey, -1);
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    const firstEnabledIndex = findFirstEnabledIndex();
    if (firstEnabledIndex < 0) {
      return;
    }

    focusButton(firstEnabledIndex);
    if (props.asTabs || !props.multiple) {
      selectByIndex(firstEnabledIndex);
    }
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    const lastEnabledIndex = findLastEnabledIndex();
    if (lastEnabledIndex < 0) {
      return;
    }

    focusButton(lastEnabledIndex);
    if (props.asTabs || !props.multiple) {
      selectByIndex(lastEnabledIndex);
    }
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const index = props.items.findIndex((item) => item.key === currentKey);
    if (index < 0) {
      return;
    }

    selectByIndex(index);
  }
}

function getTabIndex(item: SegmentedControlItem, index: number): number {
  if (!props.asTabs) {
    return 0;
  }

  if (item.disabled) {
    return -1;
  }

  const activeIndex = findActiveIndex();
  if (activeIndex < 0) {
    return -1;
  }

  return activeIndex === index ? 0 : -1;
}
</script>

<template>
  <div
    class="segmented-control"
    :role="props.asTabs ? 'tablist' : 'group'"
    :aria-label="props.ariaLabel"
  >
    <button
      v-for="(item, index) in props.items"
      :key="item.key"
      :ref="(element) => setButtonRef(index, element)"
      type="button"
      :role="props.asTabs ? 'tab' : undefined"
      :class="{ active: isActive(item.key), 'icon-only': item.iconOnly }"
      :disabled="item.disabled"
      :tabindex="getTabIndex(item, index)"
      :aria-selected="props.asTabs ? isActive(item.key) : undefined"
      :aria-pressed="!props.asTabs && props.multiple ? isActive(item.key) : undefined"
      :title="item.label"
      :aria-label="item.iconOnly ? item.label : undefined"
      @click="onSelect(item)"
      @keydown="onButtonKeydown($event, item.key)"
    >
      <component
        :is="item.icon"
        v-if="item.icon"
        class="segmented-icon"
        :size="12"
        :stroke-width="1.8"
      />
      <span
        v-if="item.previewStyle || item.previewClass"
        :class="['segmented-preview', item.previewClass]"
        :style="item.previewStyle"
        aria-hidden="true"
      >
        <span
          v-if="item.previewInnerStyle || item.previewInnerClass"
          :class="['segmented-preview-inner', item.previewInnerClass]"
          :style="item.previewInnerStyle"
        />
      </span>
      <span v-if="!item.iconOnly">{{ item.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented-control {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  padding: 1px;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 86%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-muted) 42%, var(--surface));
  min-height: var(--ui-control-height);
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.segmented-control::-webkit-scrollbar {
  display: none;
}

.segmented-control button {
  min-height: var(--ui-control-height);
  padding: 0 0.42rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: var(--fs-control);
  font-weight: 520;
  color: var(--text-muted);
  background: transparent;
  line-height: var(--lh-tight);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  transition:
    border-color 120ms ease,
    color 120ms ease,
    background-color 120ms ease,
    box-shadow 120ms ease;
}

.segmented-control button.icon-only {
  min-width: var(--ui-control-height);
  padding: 0;
}

.segmented-icon {
  flex: 0 0 auto;
}

.segmented-preview {
  position: relative;
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1px solid color-mix(in srgb, var(--text-primary) 34%, var(--border-color));
  background: color-mix(in srgb, var(--surface-elevated) 90%, var(--surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--surface) 74%, transparent);
  flex: 0 0 auto;
}

.segmented-preview-inner {
  position: absolute;
  pointer-events: none;
}

.segmented-control button.active {
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--t-accent) 40%, var(--border-subtle));
  background: color-mix(in srgb, var(--t-accent) 18%, var(--surface));
}

.segmented-control button:hover:not(.active):not(:disabled) {
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--border-subtle) 84%, transparent);
  background: color-mix(in srgb, var(--surface-elevated) 74%, var(--surface));
}

.segmented-control button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.segmented-control button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}
</style>
