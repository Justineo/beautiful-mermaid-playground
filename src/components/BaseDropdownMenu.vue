<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ChevronDown, Copy, Download, MoreHorizontal } from "lucide-vue-next";
import { useOverlayScrollbars } from "@/composables/useOverlayScrollbars";
import { POPOVER_ROOT_SELECTOR } from "@/constants/overlay";
import type { ComponentPublicInstance } from "vue";

interface DropdownMenuItem {
  key: string;
  label: string;
  disabled?: boolean;
  separator?: boolean;
}

const {
  label = "",
  ariaLabel = "Open menu",
  menuLabel = "Dropdown menu",
  items,
  disabled = false,
  align = "right",
  iconOnly = false,
  triggerIcon = "chevron-down",
} = defineProps<{
  label?: string;
  ariaLabel?: string;
  menuLabel?: string;
  items: DropdownMenuItem[];
  disabled?: boolean;
  align?: "left" | "right";
  iconOnly?: boolean;
  triggerIcon?: "chevron-down" | "ellipsis" | "download" | "copy";
}>();

const emit = defineEmits<{
  select: [key: string];
}>();

const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const itemRefs = ref<Array<HTMLButtonElement | null>>([]);
const isOpen = ref(false);
const activeIndex = ref(-1);
const isKeyboardNavigation = ref(false);
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

const hasEnabledItem = computed(() => items.some((item) => !item.disabled && !item.separator));
const triggerIconComponent = computed(() =>
  triggerIcon === "ellipsis"
    ? MoreHorizontal
    : triggerIcon === "download"
      ? Download
      : triggerIcon === "copy"
        ? Copy
        : ChevronDown,
);

function findFirstEnabledIndex(): number {
  return items.findIndex((item) => !item.disabled && !item.separator);
}

function findLastEnabledIndex(): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!items[index]?.disabled && !items[index]?.separator) {
      return index;
    }
  }

  return -1;
}

function findNextEnabledIndex(startIndex: number, direction: 1 | -1): number {
  const total = items.length;
  if (total === 0 || !hasEnabledItem.value) {
    return -1;
  }

  let index = startIndex;
  for (let step = 0; step < total; step += 1) {
    index = (index + direction + total) % total;
    if (!items[index]?.disabled && !items[index]?.separator) {
      return index;
    }
  }

  return -1;
}

function setItemRef(index: number, element: Element | ComponentPublicInstance | null): void {
  itemRefs.value[index] = element instanceof HTMLButtonElement ? element : null;
}

function focusItem(index: number, keyboard = true): void {
  if (index < 0 || !items[index] || items[index]?.disabled || items[index]?.separator) {
    return;
  }

  activeIndex.value = index;
  isKeyboardNavigation.value = keyboard;
  nextTick(() => {
    itemRefs.value[index]?.focus();
  });
}

function openMenu(initialIndex?: number, keyboard = false): void {
  if (disabled || !hasEnabledItem.value) {
    return;
  }

  isOpen.value = true;
  if (!keyboard) {
    activeIndex.value = -1;
    isKeyboardNavigation.value = false;
    return;
  }

  const nextIndex =
    initialIndex !== undefined && initialIndex >= 0 ? initialIndex : findFirstEnabledIndex();
  focusItem(nextIndex, true);
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

  const alignRight = align === "right";
  let left = alignRight ? rect.right - width : rect.left;
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

function closeMenu(): void {
  isOpen.value = false;
  activeIndex.value = -1;
  isKeyboardNavigation.value = false;
}

function selectItem(item: DropdownMenuItem): void {
  if (disabled || item.disabled || item.separator) {
    return;
  }

  emit("select", item.key);
  closeMenu();
  triggerRef.value?.focus();
}

function onTriggerClick(): void {
  if (isOpen.value) {
    closeMenu();
    return;
  }

  openMenu();
}

function focusAdjacent(direction: 1 | -1): void {
  if (activeIndex.value < 0) {
    focusItem(direction === 1 ? findFirstEnabledIndex() : findLastEnabledIndex(), true);
    return;
  }

  focusItem(findNextEnabledIndex(activeIndex.value, direction), true);
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (disabled) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!isOpen.value) {
      openMenu(findFirstEnabledIndex(), true);
      return;
    }

    focusAdjacent(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!isOpen.value) {
      openMenu(findLastEnabledIndex(), true);
      return;
    }

    focusAdjacent(-1);
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (isOpen.value) {
      closeMenu();
    } else {
      openMenu(findFirstEnabledIndex(), true);
    }
    return;
  }

  if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    closeMenu();
  }
}

function onMenuKeydown(event: KeyboardEvent): void {
  if (!isOpen.value) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusAdjacent(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    focusAdjacent(-1);
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    focusItem(findFirstEnabledIndex(), true);
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    focusItem(findLastEnabledIndex(), true);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu();
    triggerRef.value?.focus();
    return;
  }

  if (event.key === "Tab") {
    closeMenu();
  }
}

function onItemMouseenter(index: number): void {
  activeIndex.value = index;
  isKeyboardNavigation.value = false;
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
  <div ref="rootRef" class="ui-dropdown" :class="`align-${align}`">
    <button
      ref="triggerRef"
      type="button"
      class="ui-control-surface ui-menu-trigger"
      :class="{ disabled, 'icon-only': iconOnly }"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-haspopup="'menu'"
      :aria-expanded="isOpen"
      @click="onTriggerClick"
      @keydown="onTriggerKeydown"
    >
      <span v-if="!iconOnly">{{ label }}</span>
      <component :is="triggerIconComponent" class="trigger-icon" :size="12" :stroke-width="1.5" />
    </button>

    <Teleport :to="POPOVER_ROOT_SELECTOR">
      <div
        v-if="isOpen"
        ref="popoverRef"
        class="ui-menu-popover"
        data-overlayscrollbars-initialize
        :style="popoverStyle"
        role="menu"
        :aria-label="menuLabel"
        @keydown="onMenuKeydown"
      >
        <template v-for="(item, index) in items" :key="item.key">
          <div
            v-if="item.separator"
            class="ui-menu-separator"
            role="separator"
            aria-hidden="true"
          />
          <button
            v-else
            :ref="(element) => setItemRef(index, element)"
            type="button"
            role="menuitem"
            class="ui-menu-item"
            :class="{ active: isKeyboardNavigation && activeIndex === index }"
            :disabled="disabled || item.disabled"
            :tabindex="activeIndex === index ? 0 : -1"
            @focus="activeIndex = index"
            @mouseenter="onItemMouseenter(index)"
            @click="selectItem(item)"
          >
            <span class="ui-menu-item-label">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ui-dropdown {
  position: relative;
}

.ui-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  white-space: nowrap;
}

.ui-menu-trigger.icon-only {
  width: 22px;
  justify-content: center;
  padding: 0;
}

.trigger-icon {
  color: currentColor;
}

.ui-menu-trigger.disabled {
  opacity: 0.46;
  cursor: not-allowed;
}

.ui-menu-popover {
  position: fixed;
  z-index: 10;
  pointer-events: auto;
  min-width: 120px;
  width: max-content;
  max-width: min(88vw, 520px);
  max-height: min(56vh, 360px);
  overflow: hidden;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--border-color) 58%, transparent);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--t-fg) 9%, transparent);
}

.ui-menu-item {
  min-height: var(--ui-control-height);
  width: 100%;
  display: flex;
  align-items: center;
  border: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 0.44rem;
  gap: 0.4rem;
  text-align: left;
  font-size: var(--fs-control);
  line-height: var(--lh-tight);
  color: var(--text-secondary);
  background: transparent;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.ui-menu-item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-menu-item:hover:enabled,
.ui-menu-item.active:enabled {
  border-color: color-mix(in srgb, var(--border-subtle) 74%, transparent);
  background: color-mix(in srgb, var(--surface-muted) 72%, transparent);
}

.ui-menu-item:active:enabled {
  background: color-mix(in srgb, var(--surface-muted) 72%, transparent);
}

.ui-menu-separator {
  height: 1px;
  margin: 0.12rem 0.2rem;
  background: color-mix(in srgb, var(--border-subtle) 74%, transparent);
}
</style>
