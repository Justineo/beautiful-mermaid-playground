<script setup lang="ts">
import BasePanel from "@/components/BasePanel.vue";

const { title } = defineProps<{
  title: string;
}>();
</script>

<template>
  <BasePanel :title="title" :aria-label="`${title} loading panel`">
    <div class="skeleton" aria-busy="true" aria-live="polite">
      <span class="skeleton-row w-52" />
      <span class="skeleton-row w-68" />
      <span class="skeleton-row w-44" />
      <span class="skeleton-row w-60" />
    </div>
  </BasePanel>
</template>

<style scoped>
.skeleton {
  display: grid;
  gap: 0.4rem;
  padding: 0.64rem;
}

.skeleton-row {
  display: block;
  height: 0.56rem;
  border-radius: 5px;
  background: color-mix(in srgb, var(--border-subtle) 68%, transparent);
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}

.skeleton-row.w-44 {
  width: 44%;
}

.skeleton-row.w-52 {
  width: 52%;
}

.skeleton-row.w-60 {
  width: 60%;
}

.skeleton-row.w-68 {
  width: 68%;
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
