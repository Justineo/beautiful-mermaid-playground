import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundledThemes } from "shiki";

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "src/generated/unofficialThemes.ts");

const CURATED_UNOFFICIAL_THEMES = [
  { label: "Ayu Light", value: "ayu-light" },
  { label: "Ayu Dark", value: "ayu-dark" },
  { label: "Everforest Light", value: "everforest-light" },
  { label: "Everforest Dark", value: "everforest-dark" },
  { label: "Gruvbox Light", value: "gruvbox-light-medium" },
  { label: "Gruvbox Dark", value: "gruvbox-dark-medium" },
  { label: "Material Light", value: "material-theme-lighter" },
  { label: "Material Dark", value: "material-theme" },
  { label: "Night Owl Light", value: "night-owl-light" },
  { label: "Night Owl Dark", value: "night-owl" },
  { label: "Rose Pine Dawn", value: "rose-pine-dawn" },
  { label: "Rose Pine Moon", value: "rose-pine-moon" },
  { label: "Vitesse Light", value: "vitesse-light" },
  { label: "Vitesse Dark", value: "vitesse-dark" },
] as const;

type CuratedThemeName = (typeof CURATED_UNOFFICIAL_THEMES)[number]["value"];
type ThemeChannels = {
  bg: string;
  fg: string;
  line: string;
  accent: string;
  muted: string;
};
type RGB = { r: number; g: number; b: number; a: number };
type ThemeLike = {
  default?: {
    colors?: Record<string, string>;
  };
  colors?: Record<string, string>;
};

const DEFAULT_BG = "#ffffff";
const DEFAULT_FG = "#111827";
const WHITE: RGB = { r: 255, g: 255, b: 255, a: 1 };

function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(input: string | undefined): RGB | null {
  if (typeof input !== "string") {
    return null;
  }

  const value = input.trim();
  if (!value.startsWith("#")) {
    return null;
  }

  const hex = value.slice(1);

  if (hex.length === 3 || hex.length === 4) {
    const [r, g, b, a = "f"] = hex.split("");
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
      a: Number.parseInt(`${a}${a}`, 16) / 255,
    };
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return null;
}

function toOpaqueHex(color: RGB): string {
  const parts = [color.r, color.g, color.b].map((channel) =>
    clampChannel(channel).toString(16).padStart(2, "0"),
  );
  return `#${parts.join("")}`;
}

function mixColors(bg: RGB, fg: RGB, fgWeight: number): RGB {
  const weight = Math.max(0, Math.min(1, fgWeight));
  return {
    r: bg.r * (1 - weight) + fg.r * weight,
    g: bg.g * (1 - weight) + fg.g * weight,
    b: bg.b * (1 - weight) + fg.b * weight,
    a: 1,
  };
}

function flattenAlpha(color: RGB, background: RGB): RGB {
  const alpha = Math.max(0, Math.min(1, color.a));
  return {
    r: background.r * (1 - alpha) + color.r * alpha,
    g: background.g * (1 - alpha) + color.g * alpha,
    b: background.b * (1 - alpha) + color.b * alpha,
    a: 1,
  };
}

function normalizeThemeColor(input: string | undefined, fallback: RGB, background?: RGB): string {
  const parsed = parseHexColor(input);
  if (!parsed) {
    return toOpaqueHex(fallback);
  }

  if (parsed.a < 1) {
    return toOpaqueHex(flattenAlpha(parsed, background ?? WHITE));
  }

  return toOpaqueHex(parsed);
}

function getFirstDefined(
  colors: Record<string, string>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = colors[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function unwrapTheme(theme: ThemeLike): { colors: Record<string, string> } {
  if (theme.default && typeof theme.default === "object") {
    return {
      colors: theme.default.colors ?? {},
    };
  }

  return {
    colors: theme.colors ?? {},
  };
}

async function writeIfChanged(filePath: string, content: string): Promise<boolean> {
  let previous: string | null = null;
  try {
    previous = await readFile(filePath, "utf8");
  } catch {
    previous = null;
  }

  if (previous === content) {
    return false;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return true;
}

async function buildThemeTokens(themeName: CuratedThemeName): Promise<ThemeChannels> {
  const loader = bundledThemes[themeName];
  if (!loader) {
    throw new Error(`Unsupported Shiki theme in curated list: ${themeName}`);
  }

  const rawTheme = (await loader()) as ThemeLike;
  const { colors } = unwrapTheme(rawTheme);

  const fallbackBg = parseHexColor(DEFAULT_BG) ?? WHITE;
  const fallbackFg = parseHexColor(DEFAULT_FG) ?? { r: 17, g: 24, b: 39, a: 1 };

  const bgHex = normalizeThemeColor(colors["editor.background"], fallbackBg, WHITE);
  const bg = parseHexColor(bgHex) ?? fallbackBg;
  const fgHex = normalizeThemeColor(colors["editor.foreground"], fallbackFg, bg);
  const fg = parseHexColor(fgHex) ?? fallbackFg;

  const fallbackLine = mixColors(bg, fg, 0.42);
  const fallbackMuted = mixColors(bg, fg, 0.56);
  const fallbackAccent = mixColors(bg, fg, 0.8);

  const lineHex = normalizeThemeColor(
    getFirstDefined(colors, [
      "editorLineNumber.foreground",
      "editorIndentGuide.background",
      "editorWhitespace.foreground",
    ]),
    fallbackLine,
    bg,
  );
  const mutedHex = normalizeThemeColor(
    getFirstDefined(colors, ["editorLineNumber.inactiveForeground", "editorLineNumber.foreground"]),
    fallbackMuted,
    bg,
  );
  const accentHex = normalizeThemeColor(
    getFirstDefined(colors, ["button.background", "terminal.ansiBlue", "editorCursor.foreground"]),
    fallbackAccent,
    bg,
  );

  return {
    bg: bgHex,
    fg: fgHex,
    line: lineHex,
    accent: accentHex,
    muted: mutedHex,
  };
}

async function main(): Promise<void> {
  const themeTokenEntries = await Promise.all(
    CURATED_UNOFFICIAL_THEMES.map(
      async ({ value }) => [value, await buildThemeTokens(value)] as const,
    ),
  );

  const unofficialThemeTokens = Object.fromEntries(themeTokenEntries);
  const unofficialThemeOptions = CURATED_UNOFFICIAL_THEMES.map(({ label, value }) => ({
    label,
    value,
  }));
  const monacoThemes = CURATED_UNOFFICIAL_THEMES.map(({ value }) => value);

  const fileContent = `// Generated by scripts/generate-unofficial-themes.ts. Do not edit manually.\n\nexport const UNOFFICIAL_THEME_TOKENS = ${toPrettyJson(unofficialThemeTokens)} as const\n\nexport const UNOFFICIAL_THEME_OPTIONS = ${toPrettyJson(unofficialThemeOptions)} as const\n\nexport const UNOFFICIAL_MONACO_SHIKI_THEMES = ${toPrettyJson(monacoThemes)} as const\n\nexport type UnofficialDiagramThemeName = keyof typeof UNOFFICIAL_THEME_TOKENS\n`;

  const written = await writeIfChanged(OUTPUT_PATH, fileContent);
  const verb = written ? "Generated" : "Up-to-date";
  console.log(`${verb} ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
