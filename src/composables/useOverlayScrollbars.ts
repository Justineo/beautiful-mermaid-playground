import { OverlayScrollbars } from 'overlayscrollbars'
import { onBeforeUnmount, watch } from 'vue'
import type {
  PartialInitialization,
  OverlayScrollbars as OverlayScrollbarsInstance,
  PartialOptions,
} from 'overlayscrollbars'
import type { Ref } from 'vue'

const DEFAULT_OPTIONS: PartialOptions = {
  scrollbars: {
    theme: 'os-theme-playground',
    autoHide: 'leave',
    autoHideDelay: 320,
    dragScroll: true,
    clickScroll: 'instant',
  },
  overflow: {
    x: 'scroll',
    y: 'scroll',
  },
}

const DEFAULT_INITIALIZATION: PartialInitialization = {
  cancel: {
    nativeScrollbarsOverlaid: false,
    body: null,
  },
}

function mergeOptions(options?: PartialOptions): PartialOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    scrollbars: {
      ...DEFAULT_OPTIONS.scrollbars,
      ...options?.scrollbars,
    },
    overflow: {
      ...DEFAULT_OPTIONS.overflow,
      ...options?.overflow,
    },
  }
}

export function useOverlayScrollbars(
  hostRef: Ref<HTMLElement | null>,
  options?: PartialOptions,
): { update: (force?: boolean) => void } {
  let instance: OverlayScrollbarsInstance | null = null
  let updateFrameId = 0

  const stop = watch(
    hostRef,
    (host) => {
      instance?.destroy()
      instance = null
      if (updateFrameId) {
        cancelAnimationFrame(updateFrameId)
        updateFrameId = 0
      }

      if (!host) {
        return
      }

      instance = OverlayScrollbars(
        {
          ...DEFAULT_INITIALIZATION,
          target: host,
        },
        mergeOptions(options),
      )

      // Popovers often get their max-height after mount; force a late re-measure.
      updateFrameId = requestAnimationFrame(() => {
        instance?.update(true)
        updateFrameId = 0
      })
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => {
    stop()
    if (updateFrameId) {
      cancelAnimationFrame(updateFrameId)
      updateFrameId = 0
    }
    instance?.destroy()
    instance = null
  })

  return {
    update(force = false): void {
      instance?.update(force)
    },
  }
}
