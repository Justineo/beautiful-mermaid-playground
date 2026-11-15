<script setup lang="ts">
import beautifulMermaidLogo from "@/assets/beautiful-mermaid.svg";
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
      :src="renderer === 'pele' ? peleLogo : beautifulMermaidLogo"
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
  /* Balance the square mark's visual weight against Pele's wider silhouette. */
  width: 13px;
  height: 13px;
}

.unsupported {
  filter: grayscale(1);
  opacity: 0.3;
}
</style>
