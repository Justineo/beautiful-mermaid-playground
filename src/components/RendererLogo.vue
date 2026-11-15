<script setup lang="ts">
import lukilabsLogo from "@/assets/lukilabs-avatar.png";
import peleLogo from "@/assets/pele.svg";
import type { SvgRenderer } from "@/types/playground";

const {
  renderer,
  alt = "",
  unsupported = false,
} = defineProps<{
  renderer: SvgRenderer;
  alt?: string;
  unsupported?: boolean;
}>();
</script>

<template>
  <span class="renderer-logo" :class="{ unsupported }">
    <img
      :src="renderer === 'pele' ? peleLogo : lukilabsLogo"
      :class="{ 'beautiful-mermaid': renderer === 'beautiful-mermaid' }"
      :alt="alt"
      width="14"
      height="14"
    />
  </span>
</template>

<style scoped>
.renderer-logo {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  overflow: hidden;
}

img {
  display: block;
  object-fit: contain;
}

.beautiful-mermaid {
  /* Compensate for the avatar's whitespace to match Pele's visible weight. */
  transform: translateX(0.5px) scale(1.65);
}

.unsupported {
  filter: grayscale(1);
  opacity: 0.3;
}
</style>
