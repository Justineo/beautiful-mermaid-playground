import type { BeautifulRenderConfig } from "@/types/playground";

export const EDGE_LABEL_FONT_SIZE = 11;

export const EDGE_WIDTH_MULTIPLIER = {
  normal: 1,
  bold: 1.5,
  heavy: 2,
} as const;

export const BORDER_WIDTH_MULTIPLIER = {
  normal: 1,
  bold: 1.35,
  heavy: 1.8,
} as const;

export const EDGE_DASH = {
  solid: "none",
  dashed: "8 5",
  dotted: "2.25 4.25",
} as const;

export const BORDER_DASH = {
  solid: "none",
  dashed: "9 4",
  dotted: "2 3.5",
} as const;

export const CORNER_RADIUS_SET = {
  sharp: {
    node: 0,
    classNode: 0,
    entity: 0,
    subgraphOuter: 0,
    subgraphHeader: 0,
    actor: 0,
    activation: 0,
  },
  soft: {
    node: 5,
    classNode: 4,
    entity: 5,
    subgraphOuter: 7,
    subgraphHeader: 6,
    actor: 6,
    activation: 4,
  },
  rounded: {
    node: 10,
    classNode: 8,
    entity: 10,
    subgraphOuter: 14,
    subgraphHeader: 11,
    actor: 10,
    activation: 8,
  },
  pill: {
    node: -1,
    classNode: 16,
    entity: 14,
    subgraphOuter: 22,
    subgraphHeader: 16,
    actor: -1,
    activation: 10,
  },
} as const;

interface SubgraphSelectors {
  group: string;
  body: string;
  header: string;
  label: string;
}

const beautifulSubgraphSelectors: SubgraphSelectors = {
  group: ".subgraph",
  body: ".subgraph > rect:nth-of-type(1)",
  header: ".subgraph > rect:nth-of-type(2), .subgraph > .subgraph-header-shape",
  label: ".subgraph > text",
};

export function subgraphPresetRules(
  preset: BeautifulRenderConfig["subgraphStyle"],
  { group, body, header, label }: SubgraphSelectors = beautifulSubgraphSelectors,
): string {
  if (preset === "default") {
    return "";
  }

  if (preset === "minimal") {
    return `
  ${body} {
    fill: transparent;
    stroke-width: 1 !important;
  }
  ${header} {
    fill: transparent;
    stroke-width: 0 !important;
  }
  ${label} {
    font-weight: 560;
  }`;
  }

  if (preset === "soft") {
    return `
  ${body} {
    fill: color-mix(in srgb, var(--fg) 2.5%, var(--bg));
    fill-opacity: 0.96;
  }
  ${header} {
    fill: color-mix(in srgb, var(--fg) 9%, var(--bg));
  }
  ${label} {
    font-weight: 600;
  }`;
  }

  if (preset === "outlined") {
    return `
  ${body} {
    fill: transparent;
    stroke-dasharray: 6 3 !important;
    stroke-width: 1.05 !important;
  }
  ${header} {
    fill: color-mix(in srgb, var(--fg) 6%, var(--bg));
  }
  ${label} {
    letter-spacing: 0.01em;
    font-weight: 580;
  }`;
  }

  if (preset === "elevated") {
    return `
  ${group} {
    filter: drop-shadow(0 7px 16px color-mix(in srgb, var(--fg) 12%, transparent));
  }
  ${body} {
    fill: color-mix(in srgb, var(--fg) 4%, var(--bg));
    fill-opacity: 0.98;
  }
  ${header} {
    fill: color-mix(in srgb, var(--fg) 12%, var(--bg));
  }
  ${label} {
    font-weight: 620;
  }`;
  }

  if (preset === "accent") {
    return `
  ${group} {
    filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--accent, var(--_arrow)) 40%, transparent));
  }
  ${body} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 14%, var(--bg)) !important;
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 72%, var(--bg)) !important;
    stroke-width: 1.25 !important;
  }
  ${header} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 22%, var(--bg)) !important;
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 82%, var(--bg)) !important;
    stroke-width: 1.25 !important;
  }
  ${label} {
    fill: var(--accent, var(--_arrow)) !important;
    font-weight: 650;
  }`;
  }

  if (preset === "brutalist") {
    return `
  ${group} {
    filter: drop-shadow(4px 4px 0 color-mix(in srgb, var(--fg) 76%, var(--bg)));
  }
  ${body} {
    fill: var(--bg);
    stroke: var(--fg) !important;
    stroke-width: 2.2 !important;
  }
  ${header} {
    fill: var(--fg);
    stroke: var(--fg) !important;
    stroke-width: 2.2 !important;
  }
  ${label} {
    fill: var(--bg) !important;
    font-weight: 700;
    letter-spacing: 0.02em;
  }`;
  }

  if (preset === "neon") {
    return `
  ${group} {
    filter: drop-shadow(0 0 16px color-mix(in srgb, var(--accent, var(--_arrow)) 55%, transparent));
  }
  ${body} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 8%, var(--bg));
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 95%, var(--bg)) !important;
    stroke-width: 1.4 !important;
  }
  ${header} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 22%, var(--bg));
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 98%, var(--bg)) !important;
    stroke-width: 1.4 !important;
  }
  ${label} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 96%, var(--bg)) !important;
    font-weight: 660;
    letter-spacing: 0.012em;
  }`;
  }

  if (preset === "signal") {
    return `
  ${body} {
    fill: color-mix(in srgb, var(--line, var(--_line)) 8%, var(--bg));
    stroke: color-mix(in srgb, var(--line, var(--_line)) 78%, var(--bg)) !important;
    stroke-width: 1.3 !important;
  }
  ${header} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 34%, var(--bg));
    stroke: color-mix(in srgb, var(--accent, var(--_arrow)) 90%, var(--bg)) !important;
    stroke-width: 1.3 !important;
  }
  ${label} {
    fill: color-mix(in srgb, var(--accent, var(--_arrow)) 96%, var(--bg)) !important;
    font-weight: 640;
  }`;
  }

  if (preset === "contrast") {
    return `
  ${body} {
    fill: color-mix(in srgb, var(--fg) 10%, var(--bg));
    stroke-width: 1.35 !important;
  }
  ${header} {
    fill: color-mix(in srgb, var(--fg) 82%, var(--bg));
    stroke: color-mix(in srgb, var(--fg) 88%, var(--bg)) !important;
    stroke-width: 1.35 !important;
  }
  ${label} {
    fill: var(--bg) !important;
    font-weight: 650;
    letter-spacing: 0.015em;
  }`;
  }

  if (preset === "glass") {
    return `
  ${group} {
    filter: drop-shadow(0 8px 18px color-mix(in srgb, var(--fg) 10%, transparent));
  }
  ${body} {
    fill: color-mix(in srgb, var(--fg) 10%, var(--bg));
    fill-opacity: 0.62;
    stroke: color-mix(in srgb, var(--fg) 30%, var(--bg)) !important;
    stroke-width: 1.15 !important;
  }
  ${header} {
    fill: color-mix(in srgb, var(--fg) 24%, var(--bg));
    fill-opacity: 0.78;
    stroke: color-mix(in srgb, var(--fg) 36%, var(--bg)) !important;
    stroke-width: 1.15 !important;
  }
  ${label} {
    fill: color-mix(in srgb, var(--fg) 82%, var(--bg)) !important;
    font-weight: 620;
  }`;
  }

  return `
  ${body} {
    fill: color-mix(in srgb, var(--fg) 2.5%, var(--bg));
  }
  ${header} {
    fill: color-mix(in srgb, var(--fg) 9%, var(--bg));
  }
  ${label} {
    font-weight: 600;
  }`;
}
