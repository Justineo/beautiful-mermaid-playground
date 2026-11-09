import { render } from "pele";
import type { TextMeasurer } from "pele";
import { DEFAULT_PELE_FONT_WEIGHT } from "@/types/playground";
import type {
  BeautifulRenderConfig,
  PeleFontWeight,
  PeleSvgControl,
  ThemeToken,
} from "@/types/playground";
import {
  getPeleSvgControls,
  stylePeleSvg,
  type PeleElementColors,
  type PeleSvgConfig,
} from "@/utils/peleSvgStyles";

interface PelePreviewOptions {
  fontFamily: string;
  fontFamilyMono: string;
  config: PeleSvgConfig &
    Pick<BeautifulRenderConfig, "padding" | "nodeSpacing" | "layerSpacing" | "peleFontWeight">;
  elementColors: PeleElementColors;
  canOverrideDirection: boolean;
}

const TEXT_STYLE = { bold: 1, italic: 2, mono: 4, script: 8 | 16 } as const;
let textMeasurementContext: CanvasRenderingContext2D | null | undefined;

function createWeightedMeasurer(
  fontFamily: string,
  monoFamily: string,
  baseWeight: PeleFontWeight,
): TextMeasurer | undefined {
  textMeasurementContext ??= document.createElement("canvas").getContext("2d");
  const context = textMeasurementContext;
  if (!context) return undefined;

  const widths = new Map<string, number>();
  return {
    width(text, size, style) {
      const italic = style & TEXT_STYLE.italic ? "italic " : "";
      const weight = style & TEXT_STYLE.bold ? 700 : baseWeight;
      const family = style & TEXT_STYLE.mono ? monoFamily : fontFamily;
      // Match Pele's smaller size for subscript and superscript.
      const fontSize = style & TEXT_STYLE.script ? size / 1.2 : size;
      const font = `${italic}${weight} ${fontSize}px ${family}`;
      const key = `${font}\n${text}`;
      const cached = widths.get(key);
      if (cached !== undefined) return cached;

      context.font = font;
      const width = context.measureText(text).width;
      widths.set(key, width);
      return width;
    },
  };
}

export function canRenderWithPele(source: string): boolean {
  try {
    return Boolean(render(source, { links: false, images: false }).svg);
  } catch {
    return false;
  }
}

export function renderPeleSvg(
  source: string,
  tokens: Record<ThemeToken, string>,
  { fontFamily, fontFamilyMono, config, elementColors, canOverrideDirection }: PelePreviewOptions,
): { svg: string; controls: PeleSvgControl[] } {
  const spacing = { nodeSpacing: config.nodeSpacing, rankSpacing: config.layerSpacing };
  const fontWeight = config.peleFontWeight;
  const useCustomWeight = fontWeight !== DEFAULT_PELE_FONT_WEIGHT;
  const { svg } = render(source, {
    fontFamily,
    fontFamilyMono,
    fontSize: config.peleFontSize,
    measurer: useCustomWeight
      ? createWeightedMeasurer(fontFamily, fontFamilyMono, fontWeight)
      : undefined,
    monospace: ["members", "attributes"],
    padding: config.padding,
    responsive: false,
    autoDirection: false,
    links: false,
    images: false,
    config: {
      flowchart: {
        ...spacing,
        ...(config.lineGeometry === "default" ? {} : { curve: "step" }),
      },
      state: spacing,
      class: spacing,
      er: spacing,
    },
  });

  // Keep the theme on the SVG so it survives download and PNG conversion.
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = document.querySelector("svg");
  if (!root) {
    throw new Error("Pele returned invalid SVG.");
  }
  if (useCustomWeight) {
    root.style.fontWeight = String(fontWeight);
  }

  const styledSvg = stylePeleSvg(root, tokens, config, elementColors);
  return { svg: styledSvg, controls: getPeleSvgControls(root, canOverrideDirection) };
}
