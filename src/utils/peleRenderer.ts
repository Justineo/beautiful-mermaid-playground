import { render } from "pele";
import type { BeautifulRenderConfig, PeleSvgControl, ThemeToken } from "@/types/playground";
import {
  getPeleSvgControls,
  stylePeleSvg,
  type PeleElementColors,
  type PeleSvgConfig,
} from "@/utils/peleSvgStyles";

interface PelePreviewOptions {
  fontFamily: string;
  fontFamilyMono: string;
  config: PeleSvgConfig & Pick<BeautifulRenderConfig, "padding" | "nodeSpacing" | "layerSpacing">;
  elementColors: PeleElementColors;
  canOverrideDirection: boolean;
}

export function renderPeleSvg(
  source: string,
  tokens: Record<ThemeToken, string>,
  { fontFamily, fontFamilyMono, config, elementColors, canOverrideDirection }: PelePreviewOptions,
): { svg: string; controls: PeleSvgControl[] } {
  const spacing = { nodeSpacing: config.nodeSpacing, rankSpacing: config.layerSpacing };
  const { svg } = render(source, {
    fontFamily,
    fontFamilyMono,
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

  const styledSvg = stylePeleSvg(root, tokens, config, elementColors);
  return { svg: styledSvg, controls: getPeleSvgControls(root, canOverrideDirection) };
}
