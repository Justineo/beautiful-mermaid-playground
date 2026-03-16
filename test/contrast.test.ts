import assert from "node:assert/strict";
import test from "node:test";
import {
  calcUiContrastLc,
  resolveUiPaletteWithFallback,
  resolveUiPaletteWithStickyFallback,
} from "../src/utils/contrast.ts";

test("leaves safe palettes untouched", () => {
  const result = resolveUiPaletteWithFallback({
    bg: "#ffffff",
    fg: "#111111",
    accent: "#3b82f6",
    editedToken: null,
  });

  assert.equal(result.adjusted, false);
  assert.equal(result.adjustedToken, null);
  assert.deepEqual(result.palette, {
    bg: "#ffffff",
    fg: "#111111",
    accent: "#3b82f6",
  });
  assert.ok(Math.abs(result.lc) >= 30);
});

test("preserves bg input and adjusts fg when bg was edited into a disaster state", () => {
  const bg = "#1f2328";
  const fg = "#202428";
  const rawLc = calcUiContrastLc(bg, fg);
  const result = resolveUiPaletteWithFallback({
    bg,
    fg,
    accent: "#3b82f6",
    editedToken: "bg",
  });

  assert.ok(Math.abs(rawLc) < 30);
  assert.equal(result.adjusted, true);
  assert.equal(result.adjustedToken, "fg");
  assert.equal(result.palette.bg, bg);
  assert.notEqual(result.palette.fg, fg);
  assert.ok(Math.abs(result.lc) >= 30);
});

test("preserves fg input and adjusts bg when fg was edited into a disaster state", () => {
  const bg = "#f6f7f8";
  const fg = "#f4f5f6";
  const rawLc = calcUiContrastLc(bg, fg);
  const result = resolveUiPaletteWithFallback({
    bg,
    fg,
    accent: "#3b82f6",
    editedToken: "fg",
  });

  assert.ok(Math.abs(rawLc) < 30);
  assert.equal(result.adjusted, true);
  assert.equal(result.adjustedToken, "bg");
  assert.equal(result.palette.fg, fg);
  assert.notEqual(result.palette.bg, bg);
  assert.ok(Math.abs(result.lc) >= 30);
});

test("defaults to adjusting fg when no edit source is available", () => {
  const result = resolveUiPaletteWithFallback({
    bg: "#fafafa",
    fg: "#d9dee2",
    accent: "#3b82f6",
    editedToken: null,
  });

  assert.equal(result.adjusted, true);
  assert.equal(result.adjustedToken, "fg");
  assert.equal(result.palette.bg, "#fafafa");
  assert.ok(Math.abs(result.lc) >= 30);
});

test("handles semi-transparent colors when computing APCA fallback", () => {
  const bg = "#11223380";
  const fg = "#11223380";
  const rawLc = calcUiContrastLc(bg, fg);
  const result = resolveUiPaletteWithFallback({
    bg,
    fg,
    accent: "#3b82f6",
    editedToken: "bg",
  });

  assert.ok(Number.isFinite(rawLc));
  assert.equal(result.adjusted, true);
  assert.equal(result.adjustedToken, "fg");
  assert.ok(Math.abs(result.lc) >= 30);
});

test("falls back to tinted rescue colors when reverse APCA cannot provide a match", () => {
  const bg = "#f7f7f8";
  const fg = "#f6f6f7";
  const rawLc = calcUiContrastLc(bg, fg);
  const result = resolveUiPaletteWithFallback({
    bg,
    fg,
    accent: "#3b82f6",
    editedToken: "bg",
    reverseFn: () => false,
  });

  assert.ok(Math.abs(rawLc) < 30);
  assert.equal(result.adjusted, true);
  assert.equal(result.adjustedToken, "fg");
  assert.notEqual(result.palette.fg, fg);
  assert.notEqual(result.palette.fg.toLowerCase(), "#000000");
  assert.notEqual(result.palette.fg.toLowerCase(), "#ffffff");
  assert.ok(Math.abs(result.lc) > Math.abs(rawLc));
});

test("reuses the previous rescue color while it still keeps the palette above the floor", () => {
  const first = resolveUiPaletteWithStickyFallback({
    bg: "#f7f7f8",
    fg: "#f6f6f7",
    accent: "#3b82f6",
    editedToken: "fg",
  });
  const second = resolveUiPaletteWithStickyFallback({
    bg: "#f7f7f8",
    fg: "#f5f5f6",
    accent: "#3b82f6",
    editedToken: "fg",
    previousAdjustment: first.nextAdjustment,
  });

  assert.equal(first.adjustedToken, "bg");
  assert.deepEqual(second.nextAdjustment, first.nextAdjustment);
  assert.equal(second.palette.bg, first.palette.bg);
  assert.ok(Math.abs(second.lc) >= 30);
});

test("keeps fallback active briefly above the floor to avoid threshold chatter", () => {
  const sticky = resolveUiPaletteWithStickyFallback({
    bg: "#f7f7f8",
    fg: "#f6f6f7",
    accent: "#3b82f6",
    editedToken: "fg",
  });
  const nearRelease = resolveUiPaletteWithStickyFallback({
    bg: "#f7f7f8",
    fg: "#b8b8bc",
    accent: "#3b82f6",
    editedToken: "fg",
    previousAdjustment: sticky.nextAdjustment,
  });

  assert.ok(Math.abs(nearRelease.rawLc) >= 30);
  assert.ok(Math.abs(nearRelease.rawLc) < 34);
  assert.equal(nearRelease.adjusted, true);
  assert.equal(nearRelease.palette.bg, sticky.palette.bg);
});
