<script setup lang="ts">
const props = defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="panel-shell">
    <header class="panel-header">
      <div class="panel-heading">
        <h2>{{ props.title }}</h2>
        <p v-if="props.description">{{ props.description }}</p>
      </div>
      <div class="panel-info">
        <slot name="info" />
      </div>
    </header>
    <div class="panel-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--surface);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.52rem;
  padding: 0.5rem 0.64rem;
  min-height: 40px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 78%, transparent);
}

.panel-heading {
  min-width: 0;
}

.panel-heading h2 {
  margin: 0;
  font-size: var(--fs-section);
  font-weight: 560;
  line-height: var(--lh-tight);
}

.panel-heading p {
  margin: 0.2rem 0 0;
  font-size: var(--fs-meta);
  color: var(--text-muted);
  line-height: var(--lh-normal);
}

.panel-info {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.24rem;
  min-height: var(--ui-control-height);
  min-width: 0;
}

.panel-body {
  min-height: 0;
  overflow: hidden;
}
</style>
