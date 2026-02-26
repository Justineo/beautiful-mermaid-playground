<script setup lang="ts">
import shikiMermaidGrammars from "@shikijs/langs/mermaid";
import { shikiToMonaco } from "@shikijs/monaco";
import monaco from "monaco-editor";
import { createHighlighter } from "shiki";
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import BasePanel from "@/components/BasePanel.vue";

import type { editor as MonacoEditorNs } from "monaco-editor";

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

const MERMAID_LANGUAGE_ID = "mermaid";
const MONACO_THEME_BY_SCHEME = {
  light: "one-light",
  dark: "one-dark-pro",
} as const;

type MonacoModule = typeof monaco;
type MonacoEditor = MonacoEditorNs.IStandaloneCodeEditor;
type ShikiHighlighter = Awaited<ReturnType<typeof createHighlighter>>;

let monacoRuntimePromise: Promise<MonacoModule> | null = null;
let shikiHighlighter: ShikiHighlighter | null = null;
let isMermaidLanguageConfigured = false;

const shikiMermaidGrammar = shikiMermaidGrammars[0];
const customMermaidLanguage = {
  ...shikiMermaidGrammar,
  scopeName: "source.mermaid",
  injectionSelector: undefined,
  patterns: [{ include: "#mermaid" }],
};

function getMonacoTheme(
  colorScheme: "light" | "dark",
): (typeof MONACO_THEME_BY_SCHEME)[keyof typeof MONACO_THEME_BY_SCHEME] {
  return MONACO_THEME_BY_SCHEME[colorScheme];
}

function ensureMermaidLanguageConfigured(monacoModule: MonacoModule): void {
  if (!isMermaidLanguageConfigured) {
    if (!monacoModule.languages.getLanguages().some(({ id }) => id === MERMAID_LANGUAGE_ID)) {
      monacoModule.languages.register({ id: MERMAID_LANGUAGE_ID });
    }

    monacoModule.languages.setLanguageConfiguration(MERMAID_LANGUAGE_ID, {
      comments: { lineComment: "%%" },
      brackets: [
        ["[", "]"],
        ["(", ")"],
        ["{", "}"],
      ],
      autoClosingPairs: [
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "{", close: "}" },
        { open: '"', close: '"' },
      ],
      surroundingPairs: [
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "{", close: "}" },
        { open: '"', close: '"' },
      ],
    });

    isMermaidLanguageConfigured = true;
  }
}

async function ensureMonacoRuntime(): Promise<MonacoModule> {
  if (monacoRuntimePromise) {
    return monacoRuntimePromise;
  }

  monacoRuntimePromise = (async () => {
    ensureMermaidLanguageConfigured(monaco);

    if (!shikiHighlighter) {
      shikiHighlighter = await createHighlighter({
        themes: [MONACO_THEME_BY_SCHEME.light, MONACO_THEME_BY_SCHEME.dark],
        langs: [customMermaidLanguage as never],
      });
      shikiToMonaco(shikiHighlighter, monaco);
    }

    return monaco;
  })().catch((error) => {
    monacoRuntimePromise = null;
    throw error;
  });

  return monacoRuntimePromise;
}

const rootRef = ref<HTMLElement | null>(null);
const isReady = ref(false);
const initError = ref<string | null>(null);
const monacoModule = shallowRef<MonacoModule | null>(null);
const editorInstance = shallowRef<MonacoEditor | null>(null);

let modelDisposable: { dispose: () => void } | null = null;
let unmounted = false;
let fontLoadingDoneHandler: (() => void) | null = null;

function focusEditor(): void {
  editorInstance.value?.focus();
}

function focusEditorToEnd(): void {
  const editor = editorInstance.value;
  if (!editor) {
    return;
  }

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

  const monacoInstance = monacoModule.value;
  const editor = editorInstance.value;
  if (!monacoInstance || !editor) {
    return;
  }

  monacoInstance.editor.remeasureFonts();
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
    const monacoInstance = await ensureMonacoRuntime();

    if (unmounted || !rootRef.value) {
      return;
    }

    monacoModule.value = monacoInstance;
    const editor = monacoInstance.editor.create(rootRef.value, {
      value: props.modelValue,
      language: MERMAID_LANGUAGE_ID,
      theme: getMonacoTheme(props.colorScheme),
      automaticLayout: true,
      editContext: false,
      detectIndentation: false,
      insertSpaces: true,
      tabSize: 2,
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

    const model = editor.getModel();
    if (model) {
      model.updateOptions({
        insertSpaces: true,
        indentSize: 2,
        tabSize: 2,
      });
      monacoInstance.editor.setModelLanguage(model, MERMAID_LANGUAGE_ID);
    }

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
    const monacoInstance = monacoModule.value;
    if (!monacoInstance) {
      return;
    }

    monacoInstance.editor.setTheme(getMonacoTheme(nextScheme));
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
