<script setup lang="ts">
import { computed } from "vue";
import beautifulMermaidLogo from "@/assets/beautiful-mermaid.svg";
import peleLogo from "@/assets/pele.svg";
import calibration from "@/generated/rendererLogoCalibration.json";
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

const slotSize = `${calibration.slotSize}px`;
const imageStyle = computed(() => {
  const { size, offsetX, offsetY } = calibration.logos[renderer];
  return {
    width: `${size}px`,
    height: `${size}px`,
    transform: `translate(${offsetX}px, ${offsetY}px)`,
  };
});
</script>

<template>
  <span class="renderer-logo" :class="{ unsupported }">
    <img
      :src="renderer === 'pele' ? peleLogo : beautifulMermaidLogo"
      :style="imageStyle"
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
  width: v-bind(slotSize);
  height: v-bind(slotSize);
  flex: 0 0 auto;
  overflow: hidden;
}

img {
  display: block;
  object-fit: contain;
}

.unsupported {
  filter: grayscale(1);
  opacity: 0.3;
}
</style>
