import { computed, ref, watch } from "vue";
import type { Ref } from "vue";
import type { RenderOutputMode, TextOutputWarning } from "@/types/playground";

type TextMode = Exclude<RenderOutputMode, "svg">;

type UnicodeRange = {
  start: number;
  end: number;
};

const MAX_WARNING_EXAMPLES = 6;

const STRUCTURAL_CHARS: Record<TextMode, Set<string>> = {
  ascii: new Set([
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
  ]),
  unicode: new Set([
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
  ]),
};

let graphemeSegmenter:
  | {
      segment: (input: string) => Iterable<{ segment: string }>;
    }
  | null
  | undefined = undefined;

const unicodeRangesByCssUrl = new Map<string, UnicodeRange[] | null>();
const unicodeRangesPromiseByCssUrl = new Map<string, Promise<UnicodeRange[] | null>>();

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
  if (!segmenter) {
    return Array.from(text);
  }

  return Array.from(segmenter.segment(text), (entry) => entry.segment);
}

function htmlToText(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent ?? "";
}

function resolvePrimaryFontName(fontFamily: string): string {
  const primary = fontFamily
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  if (!primary) {
    return "monospace";
  }

  return primary.replace(/^["']|["']$/gu, "");
}

function parseUnicodeRangeToken(token: string): UnicodeRange | null {
  const match = token.trim().match(/^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/iu);
  if (!match) {
    return null;
  }

  const [, startToken, endToken] = match;
  if (!startToken) {
    return null;
  }

  if (endToken) {
    const start = Number.parseInt(startToken, 16);
    const end = Number.parseInt(endToken, 16);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      return null;
    }

    return { start, end };
  }

  if (startToken.includes("?")) {
    const start = Number.parseInt(startToken.replace(/\?/gu, "0"), 16);
    const end = Number.parseInt(startToken.replace(/\?/gu, "F"), 16);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      return null;
    }

    return { start, end };
  }

  const codePoint = Number.parseInt(startToken, 16);
  if (!Number.isFinite(codePoint)) {
    return null;
  }

  return { start: codePoint, end: codePoint };
}

function parseUnicodeRanges(cssText: string): UnicodeRange[] {
  const ranges: UnicodeRange[] = [];
  const regex = /unicode-range\s*:\s*([^;]+);/giu;
  let match = regex.exec(cssText);

  while (match) {
    const [, list] = match;
    if (list) {
      for (const token of list.split(",")) {
        const range = parseUnicodeRangeToken(token);
        if (range) {
          ranges.push(range);
        }
      }
    }

    match = regex.exec(cssText);
  }

  return ranges;
}

async function loadUnicodeRanges(cssUrl: string): Promise<UnicodeRange[] | null> {
  const cached = unicodeRangesByCssUrl.get(cssUrl);
  if (cached !== undefined) {
    return cached;
  }

  const pending = unicodeRangesPromiseByCssUrl.get(cssUrl);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const response = await fetch(cssUrl);
      if (!response.ok) {
        return null;
      }

      const cssText = await response.text();
      const ranges = parseUnicodeRanges(cssText);
      return ranges.length > 0 ? ranges : null;
    } catch {
      return null;
    }
  })();

  unicodeRangesPromiseByCssUrl.set(cssUrl, promise);
  const ranges = await promise;
  unicodeRangesPromiseByCssUrl.delete(cssUrl);
  unicodeRangesByCssUrl.set(cssUrl, ranges);
  return ranges;
}

function isCodePointCovered(codePoint: number, ranges: UnicodeRange[]): boolean {
  for (const range of ranges) {
    if (codePoint >= range.start && codePoint <= range.end) {
      return true;
    }
  }

  return false;
}

function isGraphemeCovered(grapheme: string, ranges: UnicodeRange[] | null): boolean {
  if (!ranges) {
    return true;
  }

  for (const char of Array.from(grapheme)) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    if (!isCodePointCovered(codePoint, ranges)) {
      return false;
    }
  }

  return true;
}

function glyphLabel(grapheme: string): string {
  if (grapheme === " ") {
    return "SPACE (U+0020)";
  }

  const codePoints = Array.from(grapheme).map(
    (char) => `U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0") ?? "0000"}`,
  );

  return `${grapheme} (${codePoints.join(" + ")})`;
}

function summarizeGlyphs(glyphs: Set<string>): string {
  const ordered = Array.from(glyphs).sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
  const visible = ordered.slice(0, 3).map(glyphLabel);
  const remaining = ordered.length - visible.length;

  if (remaining < 3) {
    return ordered.map(glyphLabel).join(", ");
  }

  return `${visible.join(", ")}, ... (${remaining} more)`;
}

function collectUnsupportedGlyphs(
  graphemes: Set<string>,
  include: (grapheme: string) => boolean,
  ranges: UnicodeRange[] | null,
): Set<string> {
  const unsupported = new Set<string>();

  for (const grapheme of graphemes) {
    if (!include(grapheme)) {
      continue;
    }

    if (!isGraphemeCovered(grapheme, ranges)) {
      unsupported.add(grapheme);
    }
  }

  return unsupported;
}

function collectWarnings(
  plainText: string,
  mode: TextMode,
  monoFontFamily: string,
  ranges: UnicodeRange[] | null,
): TextOutputWarning[] {
  const structuralSet = STRUCTURAL_CHARS[mode];
  const graphemes = new Set(splitGraphemes(plainText));
  const primaryFont = resolvePrimaryFontName(monoFontFamily);
  const keyPrefix = `${mode}\u0000${primaryFont}`;

  const unsupportedStructure = collectUnsupportedGlyphs(
    graphemes,
    (grapheme) => structuralSet.has(grapheme),
    ranges,
  );

  const unsupportedText = collectUnsupportedGlyphs(
    graphemes,
    (grapheme) => grapheme.length > 0 && grapheme.trim().length > 0 && !structuralSet.has(grapheme),
    ranges,
  );

  const warnings: TextOutputWarning[] = [];

  if (unsupportedText.size > 0) {
    const unsupportedTextList = Array.from(unsupportedText).sort();
    warnings.push({
      key: `${keyPrefix}\u0000text-unsupported-glyphs\u0000${unsupportedTextList.join("")}`,
      id: "text-unsupported-glyphs",
      tone: "warning",
      message: `The following glyphs are not supported by "${primaryFont}": ${summarizeGlyphs(unsupportedText)}. Glyph width may differ; labels can shift.`,
      examples: unsupportedTextList.slice(0, MAX_WARNING_EXAMPLES).map(glyphLabel),
    });
  }

  if (unsupportedStructure.size > 0) {
    const unsupportedStructureList = Array.from(unsupportedStructure).sort();
    warnings.push({
      key: `${keyPrefix}\u0000text-structure-glyphs\u0000${unsupportedStructureList.join("")}`,
      id: "text-structure-glyphs",
      tone: "info",
      message: `The following glyphs are not supported by "${primaryFont}": ${summarizeGlyphs(unsupportedStructure)}. Fallback glyphs can alter connector and border shapes.`,
      examples: unsupportedStructureList.slice(0, MAX_WARNING_EXAMPLES).map(glyphLabel),
    });
  }

  return warnings;
}

export function useTextOutputWarnings(
  asciiHtml: Ref<string | null>,
  selectedOutputMode: Ref<RenderOutputMode>,
  renderedTextOutputMode: Ref<TextMode | null>,
  monoFontFamily: Ref<string>,
  monoFontCssUrl: Ref<string | null>,
) {
  const rangesVersion = ref(0);

  watch(
    monoFontCssUrl,
    async (nextCssUrl) => {
      if (nextCssUrl) {
        await loadUnicodeRanges(nextCssUrl);
      }

      rangesVersion.value += 1;
    },
    { immediate: true },
  );

  return computed<TextOutputWarning[]>(() => {
    void rangesVersion.value;

    if (selectedOutputMode.value === "svg") {
      return [];
    }

    const mode = renderedTextOutputMode.value;
    if (!mode || mode !== selectedOutputMode.value) {
      return [];
    }

    const ascii = asciiHtml.value;
    if (!ascii) {
      return [];
    }

    const plainText = htmlToText(ascii);
    if (!plainText) {
      return [];
    }

    const cssUrl = monoFontCssUrl.value;
    const ranges = cssUrl ? (unicodeRangesByCssUrl.get(cssUrl) ?? null) : null;
    return collectWarnings(plainText, mode, monoFontFamily.value, ranges);
  });
}
