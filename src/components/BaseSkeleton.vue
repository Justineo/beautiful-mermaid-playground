<script setup lang="ts">
const {
  rows = [52, 68, 44, 60],
  rowHeight = "0.56rem",
  gap = "0.4rem",
} = defineProps<{
  rows?: number[];
  rowHeight?: string;
  gap?: string;
}>();

function normalizeWidth(width: number): string {
  const clamped = Math.max(8, Math.min(100, width));
  return `${clamped}%`;
}
</script>

<template>
  <div class="ui-skeleton" :style="{ '--skeleton-row-height': rowHeight, '--skeleton-gap': gap }">
    <span
      v-for="(width, index) in rows"
      :key="index"
      class="ui-skeleton-row"
      :style="{ width: normalizeWidth(width) }"
    />
  </div>
</template>

<style scoped>
.ui-skeleton {
  display: grid;
  gap: var(--skeleton-gap);
}

.ui-skeleton-row {
  display: block;
  height: var(--skeleton-row-height);
  border-radius: 999px;
  background: color-mix(in srgb, var(--border-subtle) 68%, transparent);
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.58;
  }

  50% {
    opacity: 1;
  }
}
</style>
