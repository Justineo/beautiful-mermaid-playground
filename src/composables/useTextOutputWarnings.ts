import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Ref } from "vue";
import type { RenderOutputMode, TextOutputWarning } from "@/types/playground";

const MEASURE_FONT_SIZE_PX = 64;
const STRICT_CELL_EPSILON_RATIO = 0.04;
const STRICT_MONO_EPSILON_RATIO = 0.03;
const MAX_WARNING_EXAMPLES = 6;
const ASCII_MONO_TEST_CHARS = Array.from({ length: 95 }, (_, index) =>
  String.fromCodePoint(32 + index),
);

const ASCII_STRUCTURAL_CHARS = new Set([
  "+",
  "-",
  "=",
  "|",
  ":",
  ".",
  "<",
  ">",
  "^",
  "v",
  "(",
  ")",
  "'",
  '"',
  "/",
  "\\",
  "#",
  "*",
  "o",
  "@",
  "~",
  "_",
  "[",
  "]",
  "{",
  "}",
  "‖",
]);

const UNICODE_STRUCTURAL_CHARS = new Set([
  "·",
  "⌜",
  "⌝",
  "⌞",
  "⌟",
  "─",
  "━",
  "│",
  "┃",
  "┄",
  "┆",
  "┊",
  "┌",
  "┐",
  "└",
  "┘",
  "├",
  "┤",
  "┬",
  "┴",
  "┼",
  "╌",
  "═",
  "║",
  "╔",
  "╗",
  "╚",
  "╝",
  "╟",
  "╢",
  "╭",
  "╮",
  "╯",
  "╰",
  "╱",
  "╲",
  "╴",
  "╵",
  "╶",
  "╷",
  "█",
  "▲",
  "△",
  "▶",
  "▷",
  "►",
  "▼",
  "▽",
  "◀",
  "◁",
  "◄",
  "◆",
  "◇",
  "○",
  "◎",
  "●",
  "◉",
  "◯",
]);

let measurementContext: CanvasRenderingContext2D | null = null;
let signatureContext: CanvasRenderingContext2D | null = null;
let graphemeSegmenter:
  | {
      segment: (input: string) => Iterable<{ segment: string }>;
    }
  | null
  | undefined = undefined;
const cellWidthCache = new Map<string, number>();
const widthRatioCache = new Map<string, number>();
const strictMonoCache = new Map<
  string,
  {
    strict: boolean;
    offenders: string[];
  }
>();
const primaryGlyphMissingCache = new Map<string, boolean>();
const fallbackDetectionCapabilityCache = new Map<string, boolean>();
const glyphSignatureCache = new Map<string, string>();
let fontCacheInvalidationHookInstalled = false;
const fontChangeListeners = new Set<() => void>();

function clearMeasurementCaches(): void {
  cellWidthCache.clear();
  widthRatioCache.clear();
  strictMonoCache.clear();
  primaryGlyphMissingCache.clear();
  fallbackDetectionCapabilityCache.clear();
  glyphSignatureCache.clear();
}

function ensureFontCacheInvalidationHook(): void {
  if (fontCacheInvalidationHookInstalled || !("fonts" in document)) {
    return;
  }

  document.fonts.addEventListener("loadingdone", () => {
    clearMeasurementCaches();
    for (const listener of fontChangeListeners) {
      listener();
    }
  });
  fontCacheInvalidationHookInstalled = true;
}

function getMeasurementContext(): CanvasRenderingContext2D | null {
  ensureFontCacheInvalidationHook();

  if (measurementContext) {
    return measurementContext;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  measurementContext = context;
  return measurementContext;
}

function getSignatureContext(): CanvasRenderingContext2D | null {
  if (signatureContext) {
    return signatureContext;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.textBaseline = "top";
  context.textAlign = "left";
  signatureContext = context;
  return signatureContext;
}

function getGraphemeSegmenter(): {
  segment: (input: string) => Iterable<{ segment: string }>;
} | null {
  if (graphemeSegmenter !== undefined) {
    return graphemeSegmenter;
  }

  const intlWithSegmenter = Intl as unknown as {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity: "grapheme" },
    ) => {
      segment: (input: string) => Iterable<{ segment: string }>;
    };
  };

  graphemeSegmenter = intlWithSegmenter.Segmenter
    ? new intlWithSegmenter.Segmenter(undefined, { granularity: "grapheme" })
    : null;

  return graphemeSegmenter;
}

function splitGraphemes(text: string): string[] {
  const segmenter = getGraphemeSegmenter();
  if (segmenter) {
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }

  return Array.from(text);
}

function toPlainText(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent ?? "";
}

function resolvePrimaryFontFamily(fontFamily: string): string {
  const first = fontFamily
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  if (!first) {
    return "monospace";
  }

  return first.replace(/^["']|["']$/gu, "");
}

function isWhitespace(grapheme: string): boolean {
  return grapheme.trim().length === 0;
}

function buildDisplayExample(grapheme: string): string {
  if (grapheme === " ") {
    return "SPACE (U+0020)";
  }

  const codePoints = Array.from(grapheme).map(
    (char) => `U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0") ?? "0000"}`,
  );
  return `${grapheme} (${codePoints.join(" + ")})`;
}

function glyphLabel(grapheme: string): string {
  return buildDisplayExample(grapheme);
}

function summarizeGlyphs(glyphs: Set<string>): string {
  const ordered = Array.from(glyphs).sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
  const visibleThreshold = 3;
  const visible = ordered.slice(0, visibleThreshold).map(glyphLabel);
  const remaining = ordered.length - visible.length;
  if (remaining < 3) {
    return ordered.map(glyphLabel).join(", ");
  }

  return `${visible.join(", ")}, ... (${remaining} more)`;
}

function measureCellWidth(context: CanvasRenderingContext2D, fontFamily: string): number {
  const cached = cellWidthCache.get(fontFamily);
  if (cached !== undefined) {
    return cached;
  }

  context.font = `${MEASURE_FONT_SIZE_PX}px ${fontFamily}`;
  const measured = Math.max(1, context.measureText("M").width);
  cellWidthCache.set(fontFamily, measured);
  return measured;
}

function measureWidthRatio(
  context: CanvasRenderingContext2D,
  fontFamily: string,
  grapheme: string,
): number {
  const cacheKey = `${fontFamily}\u0000${grapheme}`;
  const cached = widthRatioCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  context.font = `${MEASURE_FONT_SIZE_PX}px ${fontFamily}`;
  const cellWidth = measureCellWidth(context, fontFamily);
  const graphemeWidth = context.measureText(grapheme).width;
  const ratio = graphemeWidth / cellWidth;
  widthRatioCache.set(cacheKey, ratio);
  return ratio;
}

function isStrictSingleCell(widthRatio: number): boolean {
  return Math.abs(widthRatio - 1) <= STRICT_CELL_EPSILON_RATIO;
}

function isLikelyMissingInPrimaryFont(primaryFont: string, grapheme: string): boolean {
  if (!("fonts" in document)) {
    return false;
  }

  const cacheKey = `${primaryFont}\u0000${grapheme}`;
  const cached = primaryGlyphMissingCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const fontFaceSet = document.fonts;
  const missing = !fontFaceSet.check(`${MEASURE_FONT_SIZE_PX}px "${primaryFont}"`, grapheme);
  primaryGlyphMissingCache.set(cacheKey, missing);
  return missing;
}

function buildGlyphSignature(fontSpec: string, glyph: string): string {
  const context = getSignatureContext();
  if (!context) {
    return "";
  }

  const cacheKey = `${fontSpec}\u0000${glyph}`;
  const cached = glyphSignatureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const canvas = context.canvas;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000";
  context.font = `${MEASURE_FONT_SIZE_PX}px ${fontSpec}`;
  context.fillText(glyph, 8, 8);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  let hash = 2166136261;
  for (let index = 3; index < image.data.length; index += 4) {
    hash ^= image.data[index] ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  const signature = hash.toString(16);
  glyphSignatureCache.set(cacheKey, signature);
  return signature;
}

function canDetectFallbackWithSignature(fontFamily: string): boolean {
  const cached = fallbackDetectionCapabilityCache.get(fontFamily);
  if (cached !== undefined) {
    return cached;
  }

  const calibrationGlyphs = ["A", "M", "W", "0", "8", "x", "@", "#"];
  let differentCount = 0;

  for (const glyph of calibrationGlyphs) {
    const primarySignature = buildGlyphSignature(fontFamily, glyph);
    const fallbackSignature = buildGlyphSignature("monospace", glyph);
    if (primarySignature.length === 0 || fallbackSignature.length === 0) {
      continue;
    }

    if (primarySignature !== fallbackSignature) {
      differentCount += 1;
    }
  }

  const capable = differentCount >= 2;
  fallbackDetectionCapabilityCache.set(fontFamily, capable);
  return capable;
}

function isLikelyFallbackGlyph(fontFamily: string, grapheme: string): boolean {
  if (!canDetectFallbackWithSignature(fontFamily)) {
    return false;
  }

  const primarySignature = buildGlyphSignature(fontFamily, grapheme);
  const monospaceSignature = buildGlyphSignature("monospace", grapheme);
  if (primarySignature.length === 0 || monospaceSignature.length === 0) {
    return false;
  }

  return primarySignature === monospaceSignature;
}

function assessStrictMonospace(
  context: CanvasRenderingContext2D,
  fontFamily: string,
): { strict: boolean; offenders: string[] } {
  const cached = strictMonoCache.get(fontFamily);
  if (cached) {
    return cached;
  }

  const offenders = ASCII_MONO_TEST_CHARS.filter((char) => {
    if (char === " ") {
      return false;
    }

    const ratio = measureWidthRatio(context, fontFamily, char);
    return Math.abs(ratio - 1) > STRICT_MONO_EPSILON_RATIO;
  });

  const next = {
    strict: offenders.length === 0,
    offenders,
  };
  strictMonoCache.set(fontFamily, next);
  return next;
}

function getStructuralSet(outputMode: Exclude<RenderOutputMode, "svg">): Set<string> {
  return outputMode === "ascii" ? ASCII_STRUCTURAL_CHARS : UNICODE_STRUCTURAL_CHARS;
}

function collectWarnings(
  plainText: string,
  outputMode: Exclude<RenderOutputMode, "svg">,
  monoFontFamily: string,
): TextOutputWarning[] {
  const context = getMeasurementContext();
  if (!context) {
    return [];
  }

  const structuralSet = getStructuralSet(outputMode);
  const uniqueGraphemes = new Set(splitGraphemes(plainText));
  const structuralGraphemesInOutput = new Set(
    Array.from(uniqueGraphemes).filter((grapheme) => structuralSet.has(grapheme)),
  );
  const unstableText = new Set<string>();
  const unstableStructure = new Set<string>();
  const primaryFont = resolvePrimaryFontFamily(monoFontFamily);
  const strictMonospace = assessStrictMonospace(context, monoFontFamily);

  for (const grapheme of structuralGraphemesInOutput) {
    const widthRatio = measureWidthRatio(context, monoFontFamily, grapheme);
    const widthMismatch = !isStrictSingleCell(widthRatio);
    const fallbackGlyph = isLikelyFallbackGlyph(monoFontFamily, grapheme);
    const missingGlyph = isLikelyMissingInPrimaryFont(primaryFont, grapheme);
    if (widthMismatch || fallbackGlyph || missingGlyph) {
      unstableStructure.add(grapheme);
    }
  }

  for (const grapheme of uniqueGraphemes) {
    if (grapheme.length === 0 || isWhitespace(grapheme)) {
      continue;
    }

    if (structuralSet.has(grapheme)) {
      continue;
    }

    const widthRatio = measureWidthRatio(context, monoFontFamily, grapheme);
    const widthMismatch = !isStrictSingleCell(widthRatio);
    const fallbackGlyph = isLikelyFallbackGlyph(monoFontFamily, grapheme);
    const missingGlyph = isLikelyMissingInPrimaryFont(primaryFont, grapheme);

    if (widthMismatch || fallbackGlyph || missingGlyph) {
      unstableText.add(grapheme);
    }
  }

  const warnings: TextOutputWarning[] = [];
  const warningKeyPrefix = `${outputMode}\u0000${primaryFont}`;

  if (!strictMonospace.strict) {
    warnings.push({
      key: `${warningKeyPrefix}\u0000text-font-not-strict-mono\u0000${strictMonospace.offenders.join("")}`,
      id: "text-font-not-strict-mono",
      tone: "warning",
      message: `"${primaryFont}" is not strictly monospaced. Text layout may drift.`,
      examples: strictMonospace.offenders.slice(0, MAX_WARNING_EXAMPLES).map(buildDisplayExample),
    });
  }

  if (strictMonospace.strict && unstableText.size > 0) {
    const unstableTextList = Array.from(unstableText).sort();
    warnings.push({
      key: `${warningKeyPrefix}\u0000text-cell-width\u0000${unstableTextList.join("")}`,
      id: "text-cell-width",
      tone: "warning",
      message: `The following glyphs are not single-cell in "${primaryFont}": ${summarizeGlyphs(unstableText)}. Text alignment may drift.`,
      examples: unstableTextList.slice(0, MAX_WARNING_EXAMPLES).map(buildDisplayExample),
    });
  }

  if (unstableStructure.size > 0) {
    const unstableStructureList = Array.from(unstableStructure).sort();
    warnings.push({
      key: `${warningKeyPrefix}\u0000text-structure-glyphs\u0000${unstableStructureList.join("")}`,
      id: "text-structure-glyphs",
      tone: "info",
      message: `The following glyphs are not supported by "${primaryFont}": ${summarizeGlyphs(unstableStructure)}. Connectors and borders may look slightly off.`,
      examples: unstableStructureList.slice(0, MAX_WARNING_EXAMPLES).map(buildDisplayExample),
    });
  }

  return warnings;
}

export function useTextOutputWarnings(
  asciiHtml: Ref<string | null>,
  selectedOutputMode: Ref<RenderOutputMode>,
  renderedTextOutputMode: Ref<Exclude<RenderOutputMode, "svg"> | null>,
  monoFontFamily: Ref<string>,
) {
  const fontRevision = ref(0);
  const listener = () => {
    fontRevision.value += 1;
  };

  onMounted(() => {
    ensureFontCacheInvalidationHook();
    fontChangeListeners.add(listener);
    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        listener();
      });
    }
  });

  onUnmounted(() => {
    fontChangeListeners.delete(listener);
  });

  return computed<TextOutputWarning[]>(() => {
    void fontRevision.value;

    if (selectedOutputMode.value === "svg") {
      return [];
    }

    if (renderedTextOutputMode.value !== selectedOutputMode.value) {
      return [];
    }

    const ascii = asciiHtml.value;
    if (!ascii || ascii.length === 0) {
      return [];
    }

    const plainText = toPlainText(ascii);
    if (plainText.length === 0) {
      return [];
    }

    return collectWarnings(plainText, renderedTextOutputMode.value, monoFontFamily.value);
  });
}
