import assert from "node:assert/strict";
import test from "node:test";
import { calibrateLogo, measureLogo, SLOT_SIZE } from "../scripts/calibrate-renderer-logos.ts";

const paddedSquare =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="4" y="4" width="8" height="8"/></svg>';

test("measures painted area rather than transparent SVG padding", () => {
  const metrics = measureLogo(paddedSquare, { size: 16, offsetX: 0, offsetY: 0 });
  assert.ok(Math.abs(metrics.area - 64) < 0.05);
  assert.ok(Math.abs(metrics.centerX - 8) < 0.01);
  assert.ok(Math.abs(metrics.centerY - 8) < 0.01);
  assert.deepEqual(metrics.bounds, { left: 4, top: 4, right: 12, bottom: 12 });
});

test("normalizes padded artwork to the requested area", () => {
  const { placement, after } = calibrateLogo(paddedSquare, 81);
  assert.equal(placement.size, 18);
  assert.ok(Math.abs(after.area - 81) < 0.05);
});

test("moves asymmetric artwork to its alpha-weighted center", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="8" width="4" height="4"/></svg>';
  const { placement, after } = calibrateLogo(svg, 16);
  assert.equal(placement.size, 16);
  assert.equal(placement.offsetX, 4);
  assert.equal(placement.offsetY, -2);
  assert.ok(Math.abs(after.centerX - SLOT_SIZE / 2) < 0.01);
  assert.ok(Math.abs(after.centerY - SLOT_SIZE / 2) < 0.01);
  assert.ok(Math.abs(after.area - 16) < 0.05);
});

test("preserves aspect ratio while normalizing a wide logo", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect width="20" height="10"/></svg>';
  const { placement, after } = calibrateLogo(svg, 98);
  assert.equal(placement.size, 14);
  assert.ok(Math.abs(after.area - 98) < 0.05);
  assert.equal(after.bounds.right - after.bounds.left, 14);
  assert.equal(after.bounds.bottom - after.bounds.top, 7);
});

test("rejects invisible artwork and adjustments that would crop a logo", () => {
  assert.throws(
    () => calibrateLogo('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"/>', 100),
    /no visible artwork/u,
  );
  assert.throws(() => calibrateLogo(paddedSquare, 400), /does not fit/u);
  assert.throws(() => calibrateLogo(paddedSquare, 64, 0), /positive finite/u);
});
