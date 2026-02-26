import { BEAUTIFUL_THEME_TOKENS, DEFAULT_THEME_TOKENS } from "@/generated/beautifulThemes";
import type { DiagramTheme, UnofficialDiagramTheme } from "@/types/playground";

export type ThemeChannels = {
  bg: string;
  fg: string;
  line?: string;
  accent?: string;
  muted?: string;
  surface?: string;
  border?: string;
};

type BuiltInDiagramTheme = keyof typeof BEAUTIFUL_THEME_TOKENS;
const UNOFFICIAL_THEME_TOKENS: Record<UnofficialDiagramTheme, ThemeChannels> = {
  "ayu-light": {
    bg: "#fcfcfc",
    fg: "#5c6166",
    line: "#8a9199",
    accent: "#f29718",
    muted: "#8a9199",
  },
  "ayu-dark": {
    bg: "#10141c",
    fg: "#bfbdb6",
    line: "#6c7380",
    accent: "#e6b450",
    muted: "#6c7380",
  },
  "everforest-light": {
    bg: "#fdf6e3",
    fg: "#5c6a72",
    line: "#a4ad9e",
    accent: "#93b259",
    muted: "#7f897d",
  },
  "everforest-dark": {
    bg: "#2d353b",
    fg: "#d3c6aa",
    line: "#7f897d",
    accent: "#a7c080",
    muted: "#7f897d",
  },
  "gruvbox-light-medium": {
    bg: "#fbf1c7",
    fg: "#3c3836",
    line: "#bdae93",
    accent: "#458588",
    muted: "#7c6f64",
  },
  "gruvbox-dark-medium": {
    bg: "#282828",
    fg: "#ebdbb2",
    line: "#665c54",
    accent: "#458588",
    muted: "#7c6f64",
  },
  "material-theme-lighter": {
    bg: "#fafafa",
    fg: "#455a64",
    line: "#b0bec5",
    accent: "#39adb5",
    muted: "#90a4ae",
  },
  "material-theme": {
    bg: "#263238",
    fg: "#eeffff",
    line: "#465a64",
    accent: "#80cbc4",
    muted: "#6b8792",
  },
  "night-owl-light": {
    bg: "#fbfbfb",
    fg: "#403f53",
    line: "#90a7b2",
    accent: "#2aa298",
    muted: "#90a7b2",
  },
  "night-owl": {
    bg: "#011627",
    fg: "#d6deeb",
    line: "#4b6479",
    accent: "#82aaff",
    muted: "#4b6479",
  },
  "rose-pine-dawn": {
    bg: "#faf4ed",
    fg: "#575279",
    line: "#797593",
    accent: "#d7827e",
    muted: "#9893a5",
  },
  "rose-pine-moon": {
    bg: "#232136",
    fg: "#e0def4",
    line: "#908caa",
    accent: "#ea9a97",
    muted: "#6e6a86",
  },
};

function isBuiltInDiagramTheme(theme: DiagramTheme): theme is BuiltInDiagramTheme {
  return theme in BEAUTIFUL_THEME_TOKENS;
}

function isUnofficialDiagramTheme(theme: DiagramTheme): theme is UnofficialDiagramTheme {
  return theme in UNOFFICIAL_THEME_TOKENS;
}

export function resolveDiagramThemeTokens(theme: DiagramTheme): ThemeChannels {
  if (isBuiltInDiagramTheme(theme)) {
    return BEAUTIFUL_THEME_TOKENS[theme];
  }

  if (isUnofficialDiagramTheme(theme)) {
    return UNOFFICIAL_THEME_TOKENS[theme];
  }

  return DEFAULT_THEME_TOKENS;
}
