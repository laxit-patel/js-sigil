/**
 * Not a test — a type-check fixture.
 *
 * index.d.ts is hand-written, so nothing keeps it honest on its own. This file
 * exercises the public surface and is compiled with `tsc --noEmit --strict` in
 * CI; if the declarations drift from the implementation, it stops compiling.
 */

import {
  Encoder,
  toSvg,
  toAscii,
  drawGlyph,
  MAX_PLACES,
  SAFE_NUMBER_PLACES,
  defaultModel,
  type Segment,
  type Stem,
  type SigilValue,
} from '../index.js';

const encoder = new Encoder();

const digits: Record<string, number> = encoder.digitsOf(7323);
const segments: Segment[] = encoder.segmentsFor(7323);
const stem: Stem = encoder.stem();

// The three input shapes the encoder accepts.
const values: SigilValue[] = [7323, 7323n, '7323'];
for (const value of values) encoder.segmentsFor(value);

// max is a union: a Number while that is exact, a bigint past 15 places.
const max: number | bigint = encoder.max;
const exact: bigint = encoder.maxExact;

const wide: Encoder = new Encoder({ rows: 3 });
const fitted: Encoder = Encoder.fitting(12345678);
const ceiling: number | bigint = Encoder.maxFor(4);

const svg: string = toSvg(encoder, 7323, { stroke: 'currentColor', strokeWidth: 8 });
const ascii: string = toAscii(encoder, 7323, { cells: 6 });

declare const ctx: CanvasRenderingContext2D;
drawGlyph(ctx, encoder, 7323, { width: 120, height: 140 });

// Model shape.
const places: number = defaultModel.places.length;
const rowHeight: number = defaultModel.geometryDefaults.rowHeight;

// Constants are narrowed to their literal values.
const places18: 18 = MAX_PLACES;
const places15: 15 = SAFE_NUMBER_PLACES;

// Read-only collections stay read-only.
const keys: readonly string[] = encoder.segmentModel.keys;
const names: readonly string[] = encoder.quadrant.names;
const rows: number = encoder.quadrant.rows;

export {
  digits, segments, stem, max, exact, wide, fitted, ceiling,
  svg, ascii, places, rowHeight, places18, places15, keys, names, rows,
};
