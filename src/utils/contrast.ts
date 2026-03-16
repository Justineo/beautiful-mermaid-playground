import { APCAcontrast, reverseAPCA, sRGBtoY } from "apca-w3";

type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type OpaqueColor = Omit<RgbaColor, "a"> & {
  a: 1;
};

type UiPalette = {
  bg: string;
  fg: string;
  accent: string;
};

export type EditedUiToken = "bg" | "fg" | null;

type ReverseContrastFn = typeof reverseAPCA;

type UiPaletteFallbackInput = UiPalette & {
  editedToken: EditedUiToken;
  minimumLc?: number;
  reverseFn?: ReverseContrastFn;
};

type UiPaletteFallbackResult = {
  palette: UiPalette;
  adjusted: boolean;
  adjustedToken: Exclude<EditedUiToken, null> | null;
  lc: number;
};

export type StickyUiPaletteAdjustment = {
  adjustedToken: Exclude<EditedUiToken, null>;
  color: string;
};

type UiPaletteStickyFallbackInput = UiPalette & {
  editedToken: EditedUiToken;
  previousAdjustment?: StickyUiPaletteAdjustment | null;
  minimumLc?: number;
  releaseLc?: number;
  reverseFn?: ReverseContrastFn;
};

export type UiPaletteStickyFallbackResult = UiPaletteFallbackResult & {
  nextAdjustment: StickyUiPaletteAdjustment | null;
  rawLc: number;
};

const DEFAULT_CANVAS: OpaqueColor = { r: 255, g: 255, b: 255, a: 1 };
const DARK_FALLBACK_TARGET: OpaqueColor = { r: 16, g: 20, b: 24, a: 1 };
const LIGHT_FALLBACK_TARGET: OpaqueColor = { r: 245, g: 247, b: 250, a: 1 };
const DEFAULT_MINIMUM_UI_LC = 30;
const DEFAULT_RELEASE_UI_LC = 34;
const DARK_BACKGROUND_Y_THRESHOLD = 0.24;
const FALLBACK_BLEND_RATIOS = [0.96, 0.9, 0.82, 1];

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampAlpha(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toHexChannel(value: number): string {
  return clampByte(value).toString(16).padStart(2, "0");
}

function toOpaqueHex(color: OpaqueColor): string {
  return `#${toHexChannel(color.r)}${toHexChannel(color.g)}${toHexChannel(color.b)}`;
}

function toOpaqueTuple(color: OpaqueColor): [number, number, number, number] {
  return [color.r, color.g, color.b, color.a];
}

function parseHexColor(input: string): RgbaColor | null {
  const normalized = input.trim().replace("#", "");
  if (!/^[\da-f]{3}$|^[\da-f]{4}$|^[\da-f]{6}$|^[\da-f]{8}$/iu.test(normalized)) {
    return null;
  }

  if (normalized.length === 3 || normalized.length === 4) {
    const [r, g, b, a] = normalized.split("");
    if (!r || !g || !b) {
      return null;
    }

    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
      a: a ? Number.parseInt(a + a, 16) / 255 : 1,
    };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a: normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1,
  };
}

function blendColor(foreground: RgbaColor, background: OpaqueColor): OpaqueColor {
  const alpha = clampAlpha(foreground.a);
  return {
    r: clampByte(foreground.r * alpha + background.r * (1 - alpha)),
    g: clampByte(foreground.g * alpha + background.g * (1 - alpha)),
    b: clampByte(foreground.b * alpha + background.b * (1 - alpha)),
    a: 1,
  };
}

function mixOpaqueColors(base: OpaqueColor, target: OpaqueColor, ratio: number): OpaqueColor {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return {
    r: clampByte(base.r * (1 - clampedRatio) + target.r * clampedRatio),
    g: clampByte(base.g * (1 - clampedRatio) + target.g * clampedRatio),
    b: clampByte(base.b * (1 - clampedRatio) + target.b * clampedRatio),
    a: 1,
  };
}

function toOpaqueColor(input: string, background = DEFAULT_CANVAS): OpaqueColor | null {
  const parsed = parseHexColor(input);
  if (!parsed) {
    return null;
  }

  if (parsed.a >= 0.999) {
    return {
      r: parsed.r,
      g: parsed.g,
      b: parsed.b,
      a: 1,
    };
  }

  return blendColor(parsed, background);
}

function resolveVisibleUiColors(
  bg: string,
  fg: string,
): { background: OpaqueColor; text: OpaqueColor } | null {
  const background = toOpaqueColor(bg);
  if (!background) {
    return null;
  }

  const text = toOpaqueColor(fg, background);
  if (!text) {
    return null;
  }

  return { background, text };
}

function getColorY(color: OpaqueColor): number {
  return sRGBtoY(toOpaqueTuple(color));
}

function isDarkColor(color: OpaqueColor): boolean {
  return getColorY(color) < DARK_BACKGROUND_Y_THRESHOLD;
}

function getDesiredContrast(
  knownColor: OpaqueColor,
  knownType: "bg" | "text",
  minimumLc: number,
): number {
  if (knownType === "bg") {
    return isDarkColor(knownColor) ? -minimumLc : minimumLc;
  }

  return isDarkColor(knownColor) ? minimumLc : -minimumLc;
}

function getAdjustedTone(knownType: "bg" | "text", desiredContrast: number): "dark" | "light" {
  if (knownType === "bg") {
    return desiredContrast < 0 ? "light" : "dark";
  }

  return desiredContrast < 0 ? "dark" : "light";
}

function buildFallbackCandidates(
  knownColor: OpaqueColor,
  knownType: "bg" | "text",
  desiredContrast: number,
): string[] {
  const target =
    getAdjustedTone(knownType, desiredContrast) === "dark"
      ? DARK_FALLBACK_TARGET
      : LIGHT_FALLBACK_TARGET;

  return FALLBACK_BLEND_RATIOS.map((ratio) =>
    toOpaqueHex(mixOpaqueColors(knownColor, target, ratio)),
  );
}

function measureCandidateContrast(
  knownType: "bg" | "text",
  knownColor: string,
  candidateColor: string,
): number {
  return knownType === "bg"
    ? calcUiContrastLc(knownColor, candidateColor)
    : calcUiContrastLc(candidateColor, knownColor);
}

function resolveAdjustedColor(
  knownColor: string,
  knownType: "bg" | "text",
  minimumLc: number,
  reverseFn: ReverseContrastFn,
): string | null {
  const opaqueKnownColor = toOpaqueColor(knownColor);
  if (!opaqueKnownColor) {
    return null;
  }

  const desiredContrast = getDesiredContrast(opaqueKnownColor, knownType, minimumLc);
  const knownY = getColorY(opaqueKnownColor);
  const reversed = reverseFn(desiredContrast, knownY, knownType, "hex");
  const candidates: string[] = [];

  if (typeof reversed === "string") {
    candidates.push(reversed);
  }

  candidates.push(...buildFallbackCandidates(opaqueKnownColor, knownType, desiredContrast));

  const seen = new Set<string>();
  let bestCandidate: string | null = null;
  let bestContrast = 0;

  for (const candidate of candidates) {
    const normalized = candidate.trim().toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);

    const lc = Math.abs(measureCandidateContrast(knownType, knownColor, candidate));
    if (lc >= minimumLc) {
      return candidate;
    }

    if (lc > bestContrast) {
      bestContrast = lc;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

export function calcUiContrastLc(bg: string, fg: string): number {
  const visibleColors = resolveVisibleUiColors(bg, fg);
  if (!visibleColors) {
    return 0;
  }

  return APCAcontrast(getColorY(visibleColors.text), getColorY(visibleColors.background));
}

export function isDarkUiBackground(color: string): boolean {
  const background = toOpaqueColor(color);
  if (!background) {
    return false;
  }

  return isDarkColor(background);
}

export function resolveUiPaletteWithFallback({
  bg,
  fg,
  accent,
  editedToken,
  minimumLc = DEFAULT_MINIMUM_UI_LC,
  reverseFn = reverseAPCA,
}: UiPaletteFallbackInput): UiPaletteFallbackResult {
  const rawLc = calcUiContrastLc(bg, fg);
  if (Math.abs(rawLc) >= minimumLc) {
    return {
      palette: { bg, fg, accent },
      adjusted: false,
      adjustedToken: null,
      lc: rawLc,
    };
  }

  const adjustedToken: Exclude<EditedUiToken, null> = editedToken === "fg" ? "bg" : "fg";
  const adjustedColor =
    adjustedToken === "fg"
      ? resolveAdjustedColor(bg, "bg", minimumLc, reverseFn)
      : resolveAdjustedColor(fg, "text", minimumLc, reverseFn);

  if (!adjustedColor) {
    return {
      palette: { bg, fg, accent },
      adjusted: false,
      adjustedToken: null,
      lc: rawLc,
    };
  }

  const palette =
    adjustedToken === "fg" ? { bg, fg: adjustedColor, accent } : { bg: adjustedColor, fg, accent };

  return {
    palette,
    adjusted: true,
    adjustedToken,
    lc: calcUiContrastLc(palette.bg, palette.fg),
  };
}

function applyStickyAdjustment(
  palette: UiPalette,
  adjustment: StickyUiPaletteAdjustment,
): UiPalette {
  return adjustment.adjustedToken === "bg"
    ? { ...palette, bg: adjustment.color }
    : { ...palette, fg: adjustment.color };
}

export function resolveUiPaletteWithStickyFallback({
  bg,
  fg,
  accent,
  editedToken,
  previousAdjustment = null,
  minimumLc = DEFAULT_MINIMUM_UI_LC,
  releaseLc = DEFAULT_RELEASE_UI_LC,
  reverseFn = reverseAPCA,
}: UiPaletteStickyFallbackInput): UiPaletteStickyFallbackResult {
  const rawPalette = { bg, fg, accent };
  const rawLc = calcUiContrastLc(bg, fg);
  const desiredAdjustedToken: Exclude<EditedUiToken, null> = editedToken === "fg" ? "bg" : "fg";
  const releaseThreshold = previousAdjustment ? releaseLc : minimumLc;

  if (Math.abs(rawLc) >= releaseThreshold) {
    return {
      palette: rawPalette,
      adjusted: false,
      adjustedToken: null,
      lc: rawLc,
      nextAdjustment: null,
      rawLc,
    };
  }

  if (previousAdjustment && previousAdjustment.adjustedToken === desiredAdjustedToken) {
    const stickyPalette = applyStickyAdjustment(rawPalette, previousAdjustment);
    const stickyLc = calcUiContrastLc(stickyPalette.bg, stickyPalette.fg);

    if (Math.abs(stickyLc) >= minimumLc) {
      return {
        palette: stickyPalette,
        adjusted: true,
        adjustedToken: previousAdjustment.adjustedToken,
        lc: stickyLc,
        nextAdjustment: previousAdjustment,
        rawLc,
      };
    }
  }

  const nextState = resolveUiPaletteWithFallback({
    ...rawPalette,
    editedToken,
    minimumLc,
    reverseFn,
  });
  const nextAdjustment =
    nextState.adjusted && nextState.adjustedToken
      ? {
          adjustedToken: nextState.adjustedToken,
          color: nextState.adjustedToken === "bg" ? nextState.palette.bg : nextState.palette.fg,
        }
      : null;

  return {
    ...nextState,
    nextAdjustment,
    rawLc,
  };
}
