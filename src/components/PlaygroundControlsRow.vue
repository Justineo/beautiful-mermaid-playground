<script setup lang="ts">
import { computed } from "vue";
import BaseSegmentedControl from "@/components/BaseSegmentedControl.vue";
import BaseSelect from "@/components/BaseSelect.vue";
import { DIAGRAM_THEME_OPTIONS } from "@/types/playground";
import type { ActiveMobilePane, DesktopPaneKey, DiagramTheme } from "@/types/playground";

const PANEL_ITEMS: Array<{ key: DesktopPaneKey; label: string }> = [
  { key: "options", label: "Options" },
  { key: "editor", label: "Editor" },
  { key: "preview", label: "Preview" },
];

const props = defineProps<{
  diagramTheme: DiagramTheme;
  isMobile: boolean;
  mobilePane: ActiveMobilePane;
  desktopPanes: Record<DesktopPaneKey, boolean>;
  selectedSampleId: number | null;
  samples: Array<{ id: number; title: string; category: string }>;
}>();

const emit = defineEmits<{
  "update:diagramTheme": [value: DiagramTheme];
  "update:mobilePane": [value: ActiveMobilePane];
  "toggle:desktop-pane": [pane: DesktopPaneKey];
  "apply:sample": [sampleId: number];
}>();

const groupedSamples = computed(() => {
  const groups = new Map<string, Array<{ id: number; title: string }>>();

  for (const sample of props.samples) {
    if (sample.category === "Basic") {
      continue;
    }

    const bucket = groups.get(sample.category);
    if (bucket) {
      bucket.push({ id: sample.id, title: sample.title });
    } else {
      groups.set(sample.category, [{ id: sample.id, title: sample.title }]);
    }
  }

  return [...groups.entries()].map(([category, items]) => ({ category, items }));
});

const ungroupedSamples = computed(() =>
  props.samples
    .filter((sample) => sample.category === "Basic")
    .map((sample) => ({ id: sample.id, title: sample.title })),
);
const desktopActivePaneKeys = computed(() =>
  PANEL_ITEMS.filter((pane) => props.desktopPanes[pane.key]).map((pane) => pane.key),
);

function getSelectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value;
}

function onSampleSelect(event: Event): void {
  const value = Number.parseInt(getSelectValue(event), 10);
  if (!Number.isFinite(value)) {
    return;
  }

  emit("apply:sample", value);
}

function onPanelSelect(key: string): void {
  if (props.isMobile) {
    emit("update:mobilePane", key as ActiveMobilePane);
    return;
  }

  emit("toggle:desktop-pane", key as DesktopPaneKey);
}
</script>

<template>
  <section class="controls-row">
    <div class="toolbar-main" aria-label="Top controls">
      <div class="toolbar-context" aria-label="Context controls">
        <div class="inline-control control-sample">
          <span class="control-label">Example</span>
          <BaseSelect
            :value="props.selectedSampleId ?? ''"
            placeholder="Choose an example"
            @change="onSampleSelect"
          >
            <option v-for="sample in ungroupedSamples" :key="sample.id" :value="sample.id">
              {{ sample.title }}
            </option>
            <optgroup v-for="group in groupedSamples" :key="group.category" :label="group.category">
              <option v-for="sample in group.items" :key="sample.id" :value="sample.id">
                {{ sample.title }}
              </option>
            </optgroup>
          </BaseSelect>
        </div>

        <label class="inline-control control-theme">
          <span class="control-label">Theme</span>
          <BaseSelect
            :value="props.diagramTheme"
            @change="emit('update:diagramTheme', getSelectValue($event) as DiagramTheme)"
          >
            <option v-for="item in DIAGRAM_THEME_OPTIONS" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </BaseSelect>
        </label>
      </div>

      <div class="toolbar-panels" aria-label="Panels">
        <span class="control-label">Panels</span>
        <BaseSegmentedControl
          class="panel-toggles"
          :items="PANEL_ITEMS"
          :active-key="props.isMobile ? props.mobilePane : undefined"
          :active-keys="props.isMobile ? undefined : desktopActivePaneKeys"
          :multiple="!props.isMobile"
          :as-tabs="props.isMobile"
          :aria-label="props.isMobile ? 'Mobile panels' : 'Desktop panels'"
          @select="onPanelSelect"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.controls-row {
  display: flex;
  align-items: center;
  padding: 0.22rem 0.68rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 82%, transparent);
  background: var(--surface);
  min-width: 0;
}

.toolbar-main {
  --toolbar-gap: 0.42rem;
  display: flex;
  align-items: center;
  gap: var(--toolbar-gap);
  width: 100%;
  min-height: var(--ui-control-height);
  min-width: 0;
}

.toolbar-context {
  display: flex;
  align-items: center;
  gap: var(--toolbar-gap);
  min-height: var(--ui-control-height);
  min-width: 0;
  flex: 1 1 auto;
}

.inline-control {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 0.34rem;
  min-width: 0;
}

.control-label {
  display: inline-flex;
  align-items: center;
  font-size: var(--fs-meta);
  color: var(--text-muted);
  white-space: nowrap;
  line-height: var(--lh-tight);
}

.control-sample .ui-select-control {
  width: 176px;
  max-width: 100%;
}

.control-theme .ui-select-control {
  width: 148px;
  max-width: 100%;
}

.toolbar-panels {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex: 0 0 auto;
  min-width: 0;
  margin-left: auto;
}

.panel-toggles {
  margin-right: 0.1rem;
}

@media (max-width: 959px) {
  .controls-row {
    padding: 0.22rem 0.42rem;
  }

  .toolbar-main {
    --toolbar-gap: 0.34rem;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--toolbar-gap);
  }

  .toolbar-panels {
    width: auto;
    justify-content: flex-start;
  }

  .inline-control {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .toolbar-context {
    gap: var(--toolbar-gap);
  }

  .control-sample .ui-select-control {
    width: 176px;
    max-width: 100%;
  }

  .control-theme .ui-select-control {
    width: 148px;
    max-width: 100%;
  }

  .panel-toggles {
    margin-right: 0;
  }
}
</style>
