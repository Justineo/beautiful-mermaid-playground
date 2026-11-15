import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { Resvg } from "@resvg/resvg-js";

export const SLOT_SIZE = 16;
const REFERENCE_SIZE = 14;
const SAMPLE_SCALE = 64;
const OUTPUT_URL = new URL("../src/generated/rendererLogoCalibration.json", import.meta.url);
const LOGOS = [
  // Optical correction, reviewed in the menu and preview after area normalization.
  { name: "beautiful-mermaid", opticalScale: 0.97 },
  { name: "pele", opticalScale: 1 },
] as const;

export interface LogoPlacement {
  size: number;
  offsetX: number;
  offsetY: number;
}

export interface LogoMetrics {
  area: number;
  centerX: number;
  centerY: number;
  radius: number;
  bounds: { left: number; top: number; right: number; bottom: number };
}

export function measureLogo(svg: string, placement: LogoPlacement): LogoMetrics {
  const { size, offsetX, offsetY } = placement;
  if (![size, offsetX, offsetY].every(Number.isFinite) || size <= 0) {
    throw new Error("Logo placement must have a positive size and finite offsets.");
  }

  // Measure outside the slot too, so centering cannot silently crop the artwork.
  const padding = Math.ceil(
    Math.max(0, (size - SLOT_SIZE) / 2) + Math.max(Math.abs(offsetX), Math.abs(offsetY)) + 2,
  );
  const canvasSize = SLOT_SIZE + padding * 2;
  const x = padding + (SLOT_SIZE - size) / 2 + offsetX;
  const y = padding + (SLOT_SIZE - size) / 2 + offsetY;
  const nested = svg.replace(
    /<svg\b([^>]*?)(\/?)>/u,
    (_match, attributes: string, closing: string) => {
      const preserved = attributes.replace(
        /\s(?:width|height|x|y)\s*=\s*(?:"[^"]*"|'[^']*')/gu,
        "",
      );
      return `<svg${preserved} x="${x}" y="${y}" width="${size}" height="${size}"${closing}>`;
    },
  );
  const image = new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}">${nested}</svg>`,
    {
      fitTo: { mode: "width", value: canvasSize * SAMPLE_SCALE },
      font: { loadSystemFonts: false },
    },
  ).render();
  const pixels = image.pixels;
  let mass = 0;
  let sumX = 0;
  let sumY = 0;
  let sumSquared = 0;
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };

  for (let py = 0; py < image.height; py += 1) {
    for (let px = 0; px < image.width; px += 1) {
      const alpha = pixels[(py * image.width + px) * 4 + 3]! / 255;
      if (alpha === 0) continue;

      const cx = (px + 0.5) / SAMPLE_SCALE - padding;
      const cy = (py + 0.5) / SAMPLE_SCALE - padding;
      mass += alpha;
      sumX += alpha * cx;
      sumY += alpha * cy;
      sumSquared += alpha * (cx * cx + cy * cy);
      bounds.left = Math.min(bounds.left, px / SAMPLE_SCALE - padding);
      bounds.top = Math.min(bounds.top, py / SAMPLE_SCALE - padding);
      bounds.right = Math.max(bounds.right, (px + 1) / SAMPLE_SCALE - padding);
      bounds.bottom = Math.max(bounds.bottom, (py + 1) / SAMPLE_SCALE - padding);
    }
  }

  if (mass === 0) throw new Error("Logo SVG has no visible artwork.");
  const centerX = sumX / mass;
  const centerY = sumY / mass;
  return {
    area: mass / SAMPLE_SCALE ** 2,
    centerX,
    centerY,
    radius: Math.sqrt(Math.max(0, sumSquared / mass - centerX ** 2 - centerY ** 2)),
    bounds,
  };
}

function snap(value: number): number {
  return Math.round(value * 4) / 4 || 0;
}

export function calibrateLogo(svg: string, targetArea: number, opticalScale = 1) {
  if (![targetArea, opticalScale].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Target area and optical scale must be positive finite numbers.");
  }
  const before = measureLogo(svg, { size: REFERENCE_SIZE, offsetX: 0, offsetY: 0 });
  const size = snap(REFERENCE_SIZE * Math.sqrt(targetArea / before.area) * opticalScale);
  const placement = {
    size,
    offsetX: snap(((SLOT_SIZE / 2 - before.centerX) * size) / REFERENCE_SIZE),
    offsetY: snap(((SLOT_SIZE / 2 - before.centerY) * size) / REFERENCE_SIZE),
  };
  const after = measureLogo(svg, placement);
  const { left, top, right, bottom } = after.bounds;
  if (left < 0 || top < 0 || right > SLOT_SIZE || bottom > SLOT_SIZE) {
    throw new Error("Calibrated artwork does not fit inside the logo slot.");
  }
  return { placement, before, after };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--check")) {
    throw new Error("Usage: pnpm calibrate:logos [--check]");
  }
  const sources = await Promise.all(
    LOGOS.map(async (logo) => ({
      ...logo,
      svg: await readFile(new URL(`../src/assets/${logo.name}.svg`, import.meta.url), "utf8"),
    })),
  );
  const reference = sources.find((logo) => logo.name === "pele")!;
  const targetArea = measureLogo(reference.svg, {
    size: REFERENCE_SIZE,
    offsetX: 0,
    offsetY: 0,
  }).area;
  const results = sources.map((logo) => ({
    ...logo,
    ...calibrateLogo(logo.svg, targetArea, logo.opticalScale),
  }));
  const calibration = {
    slotSize: SLOT_SIZE,
    logos: Object.fromEntries(results.map(({ name, placement }) => [name, placement])),
    sourceHashes: Object.fromEntries(
      sources.map(({ name, svg }) => [name, createHash("sha256").update(svg).digest("hex")]),
    ),
  };

  console.table(
    results.map(({ name, placement, after }) => ({
      renderer: name,
      ...placement,
      area: Number(after.area.toFixed(2)),
      centerX: Number(after.centerX.toFixed(2)),
      centerY: Number(after.centerY.toFixed(2)),
      radius: Number(after.radius.toFixed(2)),
    })),
  );

  if (args.includes("--check")) {
    const saved: unknown = JSON.parse(await readFile(OUTPUT_URL, "utf8"));
    if (!isDeepStrictEqual(saved, calibration)) {
      throw new Error("Renderer logo calibration is stale. Run pnpm calibrate:logos.");
    }
    console.log("Renderer logo calibration is up to date.");
  } else {
    await writeFile(OUTPUT_URL, `${JSON.stringify(calibration, null, 2)}\n`);
    console.log("Updated src/generated/rendererLogoCalibration.json");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
