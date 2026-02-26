const SHIKI_MONACO_THEME_VALUES = [
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

export type MonacoShikiTheme = (typeof SHIKI_MONACO_THEME_VALUES)[number];

export const SHIKI_MONACO_THEMES: MonacoShikiTheme[] = [...SHIKI_MONACO_THEME_VALUES];

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
  "solarized-light": "solarized-light",
  "solarized-dark": "solarized-dark",
  nord: "nord",
  "catppuccin-latte": "catppuccin-latte",
  "catppuccin-mocha": "catppuccin-mocha",
};
