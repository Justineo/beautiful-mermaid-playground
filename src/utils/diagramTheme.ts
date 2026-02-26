import { BEAUTIFUL_THEME_TOKENS, DEFAULT_THEME_TOKENS } from "@/generated/beautifulThemes";
import type { DiagramTheme } from "@/types/playground";

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

function isBuiltInDiagramTheme(theme: DiagramTheme): theme is BuiltInDiagramTheme {
  return theme in BEAUTIFUL_THEME_TOKENS;
}

export function resolveDiagramThemeTokens(theme: DiagramTheme): ThemeChannels {
  if (isBuiltInDiagramTheme(theme)) {
    return BEAUTIFUL_THEME_TOKENS[theme];
  }

  return DEFAULT_THEME_TOKENS;
}
