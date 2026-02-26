<script setup lang="ts">
import { init } from "modern-monaco";
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import BasePanel from "@/components/BasePanel.vue";

const props = defineProps<{
  modelValue: string;
  fontSize: number;
  fontFamily: string;
  colorScheme: "light" | "dark";
  surfaceColor: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

type MonacoModule = Awaited<ReturnType<typeof init>>;
type MonacoEditor = ReturnType<MonacoModule["editor"]["create"]>;

const rootRef = ref<HTMLElement | null>(null);
const isReady = ref(false);
const initError = ref<string | null>(null);
const monacoModule = shallowRef<MonacoModule | null>(null);
const editorInstance = shallowRef<MonacoEditor | null>(null);
let modelDisposable: { dispose: () => void } | null = null;
let unmounted = false;
let fontLoadingDoneHandler: (() => void) | null = null;
let pendingFocusToEnd = false;

function getMonacoTheme(colorScheme: "light" | "dark"): "one-light" | "one-dark-pro" {
  return colorScheme === "dark" ? "one-dark-pro" : "one-light";
}

function focusEditor(): void {
  editorInstance.value?.focus();
}

function focusEditorToEnd(): void {
  const editor = editorInstance.value;
  if (!editor) {
    pendingFocusToEnd = true;
    return;
  }
  pendingFocusToEnd = false;

  const model = editor.getModel();
  if (!model) {
    focusEditor();
    return;
  }

  const lineNumber = model.getLineCount();
  const column = model.getLineMaxColumn(lineNumber);
  editor.focus();
  editor.setPosition({ lineNumber, column });
  editor.revealPositionInCenterIfOutsideViewport({ lineNumber, column });
}

function remeasureEditor(): void {
  if (unmounted) {
    return;
  }

  const monaco = monacoModule.value;
  const editor = editorInstance.value;
  if (!monaco || !editor) {
    return;
  }

  monaco.editor.remeasureFonts();
  editor.layout();
}

function scheduleRemeasure(): void {
  requestAnimationFrame(remeasureEditor);
}

function handleRootPointerDown(event: PointerEvent): void {
  if (event.button !== 0) {
    return;
  }

  // Ensure Monaco gets keyboard focus on first interaction.
  requestAnimationFrame(focusEditor);
}

onMounted(async () => {
  if (!rootRef.value) {
    return;
  }

  try {
    const monaco = await init({
      themes: ["one-light", "one-dark-pro"],
      langs: ["mermaid"],
      defaultTheme: getMonacoTheme(props.colorScheme),
    });

    if (unmounted || !rootRef.value) {
      return;
    }

    monacoModule.value = monaco;
    const editor = monaco.editor.create(rootRef.value, {
      value: props.modelValue,
      language: "mermaid",
      theme: getMonacoTheme(props.colorScheme),
      automaticLayout: true,
      editContext: false,
      fontSize: props.fontSize,
      fontFamily: props.fontFamily,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbersMinChars: 3,
      wordWrap: "on",
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      padding: {
        top: 14,
        bottom: 14,
      },
    });

    editorInstance.value = editor;
    modelDisposable = editor.onDidChangeModelContent(() => {
      emit("update:modelValue", editor.getValue());
    });
    isReady.value = true;
    scheduleRemeasure();

    const fontSet = document.fonts;
    fontLoadingDoneHandler = () => {
      scheduleRemeasure();
    };
    fontSet.addEventListener("loadingdone", fontLoadingDoneHandler);
    void fontSet.ready.then(() => {
      scheduleRemeasure();
    });

    nextTick(() => {
      if (pendingFocusToEnd) {
        focusEditorToEnd();
        return;
      }

      focusEditorToEnd();
    });
  } catch (error) {
    initError.value = error instanceof Error ? error.message : String(error);
  }
});

watch(
  () => props.modelValue,
  (nextValue) => {
    const editor = editorInstance.value;
    if (!editor) {
      return;
    }

    if (editor.getValue() !== nextValue) {
      editor.setValue(nextValue);
    }
  },
);

watch(
  () => props.fontSize,
  (nextSize) => {
    const editor = editorInstance.value;
    if (!editor) {
      return;
    }

    editor.updateOptions({ fontSize: nextSize });
    scheduleRemeasure();
  },
);

watch(
  () => props.fontFamily,
  (nextFamily) => {
    const editor = editorInstance.value;
    if (!editor) {
      return;
    }

    editor.updateOptions({ fontFamily: nextFamily });
    scheduleRemeasure();
  },
);

watch(
  () => props.colorScheme,
  (nextScheme) => {
    const monaco = monacoModule.value;
    if (!monaco) {
      return;
    }

    monaco.editor.setTheme(getMonacoTheme(nextScheme));
  },
);

onBeforeUnmount(() => {
  unmounted = true;
  if (fontLoadingDoneHandler) {
    document.fonts.removeEventListener("loadingdone", fontLoadingDoneHandler);
    fontLoadingDoneHandler = null;
  }

  modelDisposable?.dispose();
  modelDisposable = null;
  editorInstance.value?.dispose();
  editorInstance.value = null;
});

defineExpose<{ focus: () => void; focusToEnd: () => void }>({
  focus: focusEditor,
  focusToEnd: focusEditorToEnd,
});
</script>

<template>
  <BasePanel title="Editor" aria-label="Mermaid source editor">
    <section
      class="editor-shell"
      :style="{ '--editor-bg': props.surfaceColor }"
      tabindex="-1"
      @pointerdown.capture="handleRootPointerDown"
    >
      <div ref="rootRef" class="editor-root" />
      <div v-if="!isReady && !initError" class="editor-overlay">Loading editor...</div>
      <div v-if="initError" class="editor-overlay error">
        Failed to load Monaco: {{ initError }}
      </div>
    </section>
  </BasePanel>
</template>

<style scoped>
.editor-shell {
  --editor-bg: var(--surface);
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--editor-bg);
}

.editor-root {
  width: 100%;
  height: 100%;
}

.editor-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  font-size: var(--fs-body);
  line-height: var(--lh-normal);
  color: var(--text-muted);
  background: color-mix(in srgb, var(--editor-bg) 90%, transparent);
}

.editor-overlay.error {
  color: var(--danger-text);
}

:deep(.monaco-editor),
:deep(.monaco-editor-background),
:deep(.monaco-editor .margin),
:deep(.monaco-editor .glyph-margin),
:deep(.monaco-editor .margin-view-overlays),
:deep(.monaco-editor .monaco-scrollable-element) {
  background-color: var(--editor-bg) !important;
}

:deep(.monaco-editor .view-overlays .current-line),
:deep(.monaco-editor .margin-view-overlays .current-line-margin) {
  background-color: color-mix(in srgb, var(--editor-bg) 94%, var(--text-primary)) !important;
  border: 0 !important;
}
</style>
