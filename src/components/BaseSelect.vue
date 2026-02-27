<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ChevronDown } from "lucide-vue-next";
import { useOverlayScrollbars } from "@/composables/useOverlayScrollbars";
import { POPOVER_ROOT_SELECTOR } from "@/constants/overlay";
import type { ComponentPublicInstance, VNode } from "vue";

type SelectOptionItem = {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
};

type SelectOptionGroup = {
  id: string;
  label: string | null;
  options: SelectOptionItem[];
};

type SelectIndexedOption = SelectOptionItem & {
  flatIndex: number;
};

type SelectIndexedGroup = {
  id: string;
  label: string | null;
  options: SelectIndexedOption[];
};

const props = defineProps<{
  value?: string | number | null;
  disabled?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  change: [event: Event];
}>();

const slots = defineSlots<{
  default?: () => VNode[];
  selected?: (props: { option: SelectIndexedOption | undefined; label: string }) => unknown;
  option?: (props: { option: SelectIndexedOption }) => unknown;
}>();
const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Array<HTMLButtonElement | null>>([]);
const isOpen = ref(false);
const activeIndex = ref(-1);
const popoverStyle = ref<Record<string, string>>({});
let viewportListenerAttached = false;
let pointerListenerAttached = false;
let rafId = 0;
const MIN_MENU_WIDTH = 120;

useOverlayScrollbars(popoverRef, {
  overflow: {
    x: "hidden",
    y: "scroll",
  },
});

function normalizeNodeText(node: VNode | string): string {
  if (typeof node === "string") {
    return node;
  }

  if (typeof node.children === "string") {
    return node.children;
  }

  if (Array.isArray(node.children)) {
    return node.children
      .map((child) => normalizeNodeText(child as VNode | string))
      .join("")
      .trim();
  }

  return "";
}

function extractOptions(
  nodes: VNode[],
  sourceIndexRef: { value: number },
  groupLabel: string | null = null,
): SelectOptionGroup[] {
  const standaloneOptions: SelectOptionItem[] = [];
  const nestedGroups: SelectOptionGroup[] = [];

  for (const node of nodes) {
    if (typeof node.type !== "string") {
      if (Array.isArray(node.children)) {
        nestedGroups.push(...extractOptions(node.children as VNode[], sourceIndexRef, groupLabel));
      }
      continue;
    }

    if (node.type === "optgroup") {
      const nextLabel =
        typeof node.props?.label === "string" && node.props.label.trim().length > 0
          ? node.props.label.trim()
          : null;
      const children = Array.isArray(node.children) ? (node.children as VNode[]) : [];
      nestedGroups.push(...extractOptions(children, sourceIndexRef, nextLabel));
      continue;
    }

    if (node.type !== "option") {
      if (Array.isArray(node.children)) {
        nestedGroups.push(...extractOptions(node.children as VNode[], sourceIndexRef, groupLabel));
      }
      continue;
    }

    const rawLabel = normalizeNodeText(node).trim();
    const rawValue =
      node.props?.value !== undefined
        ? String(node.props.value)
        : rawLabel.length > 0
          ? rawLabel
          : "";

    standaloneOptions.push({
      id: `option-${sourceIndexRef.value}`,
      label: rawLabel,
      value: rawValue,
      disabled: Boolean(node.props?.disabled),
    });
    sourceIndexRef.value += 1;
  }

  if (standaloneOptions.length === 0) {
    return nestedGroups;
  }

  return [
    {
      id: `group-${sourceIndexRef.value}-${groupLabel ?? "root"}`,
      label: groupLabel,
      options: standaloneOptions,
    },
    ...nestedGroups,
  ];
}

const optionGroups = computed<SelectOptionGroup[]>(() => {
  const nodes = slots.default?.() ?? [];
  return extractOptions(nodes, { value: 0 });
});

const indexedGroups = computed<SelectIndexedGroup[]>(() => {
  let flatIndex = 0;
  return optionGroups.value.map((group) => ({
    id: group.id,
    label: group.label,
    options: group.options.map((option) => ({
      ...option,
      flatIndex: flatIndex++,
    })),
  }));
});

const flatOptions = computed<SelectIndexedOption[]>(() =>
  indexedGroups.value.flatMap((group) => group.options),
);

const selectedValue = computed(() => (props.value ?? "") + "");
const selectedOption = computed(() =>
  flatOptions.value.find((option) => option.value === selectedValue.value),
);
const selectedLabel = computed(
  () => selectedOption.value?.label ?? props.placeholder ?? "Select an option",
);
const hasEnabledOption = computed(() => flatOptions.value.some((option) => !option.disabled));

function setItemRef(index: number, element: Element | ComponentPublicInstance | null): void {
  itemRefs.value[index] = element instanceof HTMLButtonElement ? element : null;
}

function findFirstEnabledIndex(): number {
  return flatOptions.value.findIndex((option) => !option.disabled);
}

function findLastEnabledIndex(): number {
  for (let index = flatOptions.value.length - 1; index >= 0; index -= 1) {
    if (!flatOptions.value[index]?.disabled) {
      return index;
    }
  }

  return -1;
}

function findSelectedIndex(): number {
  return flatOptions.value.findIndex(
    (option) => option.value === selectedValue.value && !option.disabled,
  );
}

function findNextEnabledIndex(startIndex: number, direction: 1 | -1): number {
  const total = flatOptions.value.length;
  if (total === 0 || !hasEnabledOption.value) {
    return -1;
  }

  let index = startIndex;
  for (let step = 0; step < total; step += 1) {
    index = (index + direction + total) % total;
    if (!flatOptions.value[index]?.disabled) {
      return index;
    }
  }

  return -1;
}

function focusItem(index: number): void {
  if (index < 0 || !flatOptions.value[index] || flatOptions.value[index]?.disabled) {
    return;
  }

  activeIndex.value = index;
  nextTick(() => {
    itemRefs.value[index]?.focus();
  });
}

function updatePopoverPosition(): void {
  if (!isOpen.value || !triggerRef.value || !popoverRef.value) {
    return;
  }

  const margin = 8;
  const gap = 6;
  const rect = triggerRef.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxWidth = Math.max(MIN_MENU_WIDTH, viewportWidth - margin * 2);
  const minWidth = Math.min(Math.max(MIN_MENU_WIDTH, Math.round(rect.width)), maxWidth);
  const currentWidth = popoverRef.value.offsetWidth > 0 ? popoverRef.value.offsetWidth : minWidth;
  const width = Math.min(Math.max(minWidth, currentWidth), maxWidth);
  const currentHeight = popoverRef.value.offsetHeight;
  const naturalHeight = popoverRef.value.scrollHeight;
  const spaceBelow = viewportHeight - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const preferTop =
    currentHeight > 0 ? spaceBelow < currentHeight && spaceAbove > spaceBelow : false;
  const maxHeight = Math.max(120, Math.floor(preferTop ? spaceAbove : spaceBelow));
  const height = currentHeight > 0 ? Math.min(currentHeight, maxHeight) : maxHeight;
  const shouldClampHeight = naturalHeight > maxHeight + 1;

  let left = rect.left;
  if (left + width > viewportWidth - margin) {
    left = viewportWidth - margin - width;
  }
  left = Math.max(margin, left);

  let top = preferTop ? rect.top - gap - height : rect.bottom + gap;
  if (top < margin) {
    top = margin;
  }
  if (top + height > viewportHeight - margin) {
    top = Math.max(margin, viewportHeight - margin - height);
  }

  popoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    minWidth: `${Math.round(minWidth)}px`,
    maxWidth: `${Math.round(maxWidth)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    height: shouldClampHeight ? `${Math.round(maxHeight)}px` : "",
  };
}

function schedulePopoverPosition(): void {
  if (!isOpen.value) {
    return;
  }

  updatePopoverPosition();
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  rafId = requestAnimationFrame(() => {
    updatePopoverPosition();
    rafId = 0;
  });
}

function handleViewportChange(): void {
  updatePopoverPosition();
}

function handleDocumentPointerDown(event: PointerEvent): void {
  const target = event.target as Node | null;
  if (!target) {
    return;
  }

  if (rootRef.value?.contains(target) || popoverRef.value?.contains(target)) {
    return;
  }

  closeMenu();
}

function attachOpenListeners(): void {
  if (!viewportListenerAttached) {
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    viewportListenerAttached = true;
  }

  if (!pointerListenerAttached) {
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    pointerListenerAttached = true;
  }
}

function detachOpenListeners(): void {
  if (viewportListenerAttached) {
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("scroll", handleViewportChange, true);
    viewportListenerAttached = false;
  }

  if (pointerListenerAttached) {
    document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    pointerListenerAttached = false;
  }
}

function openMenu(initialIndex?: number): void {
  if (props.disabled || !hasEnabledOption.value) {
    return;
  }

  isOpen.value = true;
  const selectedIndex = findSelectedIndex();
  const fallbackIndex = selectedIndex >= 0 ? selectedIndex : findFirstEnabledIndex();
  const nextIndex = initialIndex !== undefined && initialIndex >= 0 ? initialIndex : fallbackIndex;
  focusItem(nextIndex);
}

function closeMenu(restoreFocus = false): void {
  isOpen.value = false;
  activeIndex.value = -1;
  if (restoreFocus) {
    triggerRef.value?.focus();
  }
}

function emitChange(value: string): void {
  emit("change", { target: { value } } as unknown as Event);
}

function selectByIndex(index: number): void {
  const option = flatOptions.value[index];
  if (!option || option.disabled || props.disabled) {
    return;
  }

  emitChange(option.value);
  closeMenu(true);
}

function onTriggerClick(): void {
  if (isOpen.value) {
    closeMenu();
    return;
  }

  openMenu();
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (props.disabled) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!isOpen.value) {
      openMenu(findSelectedIndex());
      return;
    }

    focusItem(findNextEnabledIndex(activeIndex.value, 1));
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!isOpen.value) {
      openMenu(findSelectedIndex() >= 0 ? findSelectedIndex() : findLastEnabledIndex());
      return;
    }

    focusItem(findNextEnabledIndex(activeIndex.value, -1));
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (isOpen.value) {
      if (activeIndex.value >= 0) {
        selectByIndex(activeIndex.value);
      } else {
        closeMenu();
      }
    } else {
      openMenu();
    }
    return;
  }

  if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    closeMenu(true);
  }
}

function onMenuKeydown(event: KeyboardEvent): void {
  if (!isOpen.value) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusItem(findNextEnabledIndex(activeIndex.value, 1));
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    focusItem(findNextEnabledIndex(activeIndex.value, -1));
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    focusItem(findFirstEnabledIndex());
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    focusItem(findLastEnabledIndex());
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (activeIndex.value >= 0) {
      selectByIndex(activeIndex.value);
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu(true);
    return;
  }

  if (event.key === "Tab") {
    closeMenu();
  }
}

watch(
  isOpen,
  (open) => {
    if (open) {
      attachOpenListeners();
      schedulePopoverPosition();
      return;
    }

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    detachOpenListeners();
  },
  { flush: "post" },
);

onBeforeUnmount(() => {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  detachOpenListeners();
});
</script>

<template>
  <div ref="rootRef" class="ui-select-control">
    <button
      ref="triggerRef"
      type="button"
      class="ui-control-surface ui-select-trigger"
      :disabled="props.disabled"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="onTriggerClick"
      @keydown="onTriggerKeydown"
    >
      <span class="ui-select-value">
        <slot name="selected" :option="selectedOption" :label="selectedLabel">
          {{ selectedLabel }}
        </slot>
      </span>
      <ChevronDown class="ui-select-icon" :size="12" :stroke-width="1.5" />
    </button>

    <Teleport :to="POPOVER_ROOT_SELECTOR">
      <div
        v-if="isOpen"
        ref="popoverRef"
        class="ui-select-popover"
        data-overlayscrollbars-initialize
        :style="popoverStyle"
        role="listbox"
        @keydown="onMenuKeydown"
      >
        <section v-for="group in indexedGroups" :key="group.id" class="ui-select-group-block">
          <p v-if="group.label" class="ui-select-group">{{ group.label }}</p>
          <button
            v-for="option in group.options"
            :key="option.id"
            :ref="(element) => setItemRef(option.flatIndex, element)"
            type="button"
            role="option"
            class="ui-select-option"
            :class="{
              active: activeIndex === option.flatIndex,
              selected: selectedValue === option.value,
            }"
            :aria-selected="selectedValue === option.value"
            :disabled="option.disabled"
            :tabindex="activeIndex === option.flatIndex ? 0 : -1"
            @focus="activeIndex = option.flatIndex"
            @mouseenter="activeIndex = option.flatIndex"
            @click="selectByIndex(option.flatIndex)"
          >
            <span class="ui-select-option-label">
              <slot name="option" :option="option">
                {{ option.label }}
              </slot>
            </span>
            <span v-if="selectedValue === option.value" aria-hidden="true">✓</span>
          </button>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ui-select-control {
  position: relative;
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
}

.ui-select-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  padding-right: 1.3rem;
  text-align: left;
}

.ui-select-value {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.22;
}

.ui-select-icon {
  position: absolute;
  right: 0.36rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.ui-select-trigger:focus-visible .ui-select-icon {
  color: var(--text-primary);
}

.ui-select-popover {
  position: fixed;
  z-index: 10;
  pointer-events: auto;
  min-width: 120px;
  width: max-content;
  overflow: hidden;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 58%, transparent);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--t-fg) 9%, transparent);
}

.ui-select-group {
  margin: 0;
  padding: 0.18rem 0.42rem 0.16rem;
  color: var(--text-muted);
  font-size: var(--fs-label);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--lh-tight);
}

.ui-select-group-block + .ui-select-group-block {
  margin-top: 0.08rem;
  padding-top: 0.14rem;
  border-top: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
}

.ui-select-option {
  min-height: var(--ui-control-height);
  width: 100%;
  border: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 0.44rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: var(--fs-control);
  line-height: var(--lh-tight);
  background: transparent;
  text-align: left;
  white-space: nowrap;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.ui-select-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.22;
}

.ui-select-option-label :deep(span) {
  line-height: 1.22;
}

.ui-select-option:hover:enabled,
.ui-select-option.active:enabled {
  border-color: color-mix(in srgb, var(--border-subtle) 74%, transparent);
  background: color-mix(in srgb, var(--surface-muted) 72%, transparent);
}

.ui-select-option.selected:enabled {
  color: var(--text-primary);
  font-weight: 540;
}

.ui-select-option:active:enabled {
  background: color-mix(in srgb, var(--surface-muted) 72%, transparent);
}

.ui-select-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
