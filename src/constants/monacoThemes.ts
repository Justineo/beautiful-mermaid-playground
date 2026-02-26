import { UNOFFICIAL_MONACO_SHIKI_THEMES } from "../generated/unofficialThemes";
import type { UnofficialDiagramThemeName } from "../generated/unofficialThemes";

const OFFICIAL_SHIKI_MONACO_THEME_VALUES = [
  "one-light",
  "one-dark-pro",
  "github-light",
  "github-dark",
  "dracula",
  "tokyo-night",
  "solarized-light",
  "solarized-dark",
  "nord",
  "catppuccin-latte",
  "catppuccin-mocha",
] as const;

export type MonacoShikiTheme =
  | (typeof OFFICIAL_SHIKI_MONACO_THEME_VALUES)[number]
  | (typeof UNOFFICIAL_MONACO_SHIKI_THEMES)[number];

const unofficialMonacoThemeMap = Object.fromEntries(
  UNOFFICIAL_MONACO_SHIKI_THEMES.map((theme) => [theme, theme]),
) as Record<UnofficialDiagramThemeName, MonacoShikiTheme>;

export const SHIKI_MONACO_THEMES: MonacoShikiTheme[] = [
  ...OFFICIAL_SHIKI_MONACO_THEME_VALUES,
  ...UNOFFICIAL_MONACO_SHIKI_THEMES,
];

export const DEFAULT_MONACO_THEME_BY_SCHEME: Record<"light" | "dark", MonacoShikiTheme> = {
  light: "one-light",
  dark: "one-dark-pro",
};

export const MONACO_THEME_BY_DIAGRAM_THEME: Record<string, MonacoShikiTheme> = {
  "github-light": "github-light",
  "github-dark": "github-dark",
  dracula: "dracula",
  "one-dark": "one-dark-pro",
  "tokyo-night": "tokyo-night",
  "tokyo-night-storm": "tokyo-night",
  "solarized-light": "solarized-light",
  "solarized-dark": "solarized-dark",
  nord: "nord",
  "catppuccin-latte": "catppuccin-latte",
  "catppuccin-mocha": "catppuccin-mocha",
  ...unofficialMonacoThemeMap,
};
