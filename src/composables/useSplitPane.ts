import { onMounted, onUnmounted, ref } from "vue";
import type { Ref } from "vue";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useSplitPane(
  containerRef: Ref<HTMLElement | null>,
  ratio: Ref<number>,
  options?: {
    min?: number;
    max?: number;
  },
) {
  const min = options?.min ?? 0.25;
  const max = options?.max ?? 0.75;
  const isDragging = ref(false);
  const activePointerId = ref<number | null>(null);
  let captureElement: HTMLElement | null = null;

  function updateRatio(clientX: number): void {
    const container = containerRef.value;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const nextRatio = (clientX - rect.left) / rect.width;
    ratio.value = clamp(nextRatio, min, max);
  }

  function handleDividerPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    isDragging.value = true;
    activePointerId.value = event.pointerId;
    captureElement = target;
    updateRatio(event.clientX);

    target?.setPointerCapture?.(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!isDragging.value) {
      return;
    }

    if (activePointerId.value !== null && activePointerId.value !== event.pointerId) {
      return;
    }

    updateRatio(event.clientX);
    event.preventDefault();
  }

  function stopDragging(event: PointerEvent): void {
    if (!isDragging.value) {
      return;
    }

    if (activePointerId.value !== null && activePointerId.value !== event.pointerId) {
      return;
    }

    captureElement?.releasePointerCapture?.(event.pointerId);
    captureElement = null;
    isDragging.value = false;
    activePointerId.value = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  onMounted(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  });

  onUnmounted(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("pointercancel", stopDragging);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  return {
    isDragging,
    handleDividerPointerDown,
  };
}
