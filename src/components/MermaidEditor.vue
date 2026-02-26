<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import BasePanel from "@/components/BasePanel.vue";
import BaseSkeleton from "@/components/BaseSkeleton.vue";
import {
  DEFAULT_MONACO_THEME_BY_SCHEME,
  MONACO_THEME_BY_DIAGRAM_THEME,
  SHIKI_MONACO_THEMES,
  type MonacoShikiTheme,
} from "@/constants/monacoThemes";
import type { DiagramTheme } from "@/types/playground";

import type { editor as MonacoEditorNs } from "monaco-editor";

const props = defineProps<{
  modelValue: string;
  fontSize: number;
  fontFamily: string;
  colorScheme: "light" | "dark";
  diagramTheme: DiagramTheme;
  surfaceColor: string;
  focusToEndToken: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const MERMAID_LANGUAGE_ID = "mermaid";

type MonacoModule = typeof import("monaco-editor");
type MonacoEditor = MonacoEditorNs.IStandaloneCodeEditor;
type ShikiHighlighter = Awaited<ReturnType<(typeof import("shiki"))["createHighlighter"]>>;

let monacoRuntimePromise: Promise<MonacoModule> | null = null;
let shikiHighlighter: ShikiHighlighter | null = null;
let isMermaidLanguageConfigured = false;

function getMonacoTheme(
  diagramTheme: DiagramTheme,
  colorScheme: "light" | "dark",
): MonacoShikiTheme {
  const mappedTheme = MONACO_THEME_BY_DIAGRAM_THEME[diagramTheme];
  return mappedTheme ?? DEFAULT_MONACO_THEME_BY_SCHEME[colorScheme];
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
    const [{ default: monacoInstance }, { createHighlighter }, { shikiToMonaco }, mermaidLang] =
      await Promise.all([
        import("monaco-editor"),
        import("shiki"),
        import("@shikijs/monaco"),
        import("@shikijs/langs/mermaid"),
      ]);

    ensureMermaidLanguageConfigured(monacoInstance);

    if (!shikiHighlighter) {
      const [shikiMermaidGrammar] = mermaidLang.default;
      const customMermaidLanguage = {
        ...shikiMermaidGrammar,
        scopeName: "source.mermaid",
        injectionSelector: undefined,
        patterns: [{ include: "#mermaid" }],
      };

      shikiHighlighter = await createHighlighter({
        themes: SHIKI_MONACO_THEMES,
        langs: [customMermaidLanguage as never],
      });
      shikiToMonaco(shikiHighlighter, monacoInstance);
    }

    return monacoInstance;
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
let lastHandledFocusToEndToken = -1;

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

function consumeFocusToEndToken(): void {
  if (!editorInstance.value) {
    return;
  }

  if (props.focusToEndToken === lastHandledFocusToEndToken) {
    return;
  }

  lastHandledFocusToEndToken = props.focusToEndToken;
  focusEditorToEnd();
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
      theme: getMonacoTheme(props.diagramTheme, props.colorScheme),
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

    consumeFocusToEndToken();
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
      consumeFocusToEndToken();
    }
  },
);

watch(
  () => props.focusToEndToken,
  () => {
    consumeFocusToEndToken();
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
  () => [props.diagramTheme, props.colorScheme] as const,
  ([nextTheme, nextScheme]) => {
    const monacoInstance = monacoModule.value;
    if (!monacoInstance) {
      return;
    }

    monacoInstance.editor.setTheme(getMonacoTheme(nextTheme, nextScheme));
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
      <div v-if="!isReady && !initError" class="editor-overlay" aria-busy="true" aria-live="polite">
        <div class="editor-skeleton-wrap" aria-hidden="true">
          <BaseSkeleton :rows="[44, 66, 52, 72, 58]" row-height="10px" gap="0.32rem" />
        </div>
      </div>
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
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0.88rem;
  font-size: var(--fs-body);
  line-height: var(--lh-normal);
  color: var(--text-muted);
  background: color-mix(in srgb, var(--editor-bg) 90%, transparent);
}

.editor-overlay.error {
  display: grid;
  place-items: center;
  padding: 1rem;
  color: var(--danger-text);
}

.editor-skeleton-wrap {
  width: min(92%, 560px);
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
