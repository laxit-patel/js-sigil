import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Encoder } from '../src/encoder.js';
import { toSvg } from '../src/renderers/svg.js';
import { toAscii } from '../src/renderers/ascii.js';
import { drawGlyph } from '../src/renderers/canvas.js';

const encoder = new Encoder();

test('svg draws every segment plus the stem', () => {
  const svg = toSvg(encoder, 9999);
  assert.equal(svg.match(/<line /g).length, 13, '12 segments + the stem');
  assert.match(svg, /viewBox="16 6 168 228"/);
  assert.equal(toSvg(encoder, 0).match(/<line /g).length, 1, 'zero is the stem alone');
});

test('svg escapes what goes into attributes', () => {
  const svg = toSvg(encoder, 1, { label: 'a "quoted" <tag> & more' });
  assert.match(svg, /aria-label="a &quot;quoted&quot; &lt;tag&gt; &amp; more"/);
  assert.doesNotMatch(svg.split('\n')[0], /<tag>/);
});

test('ascii grid is square and centred on the stem', () => {
  const rows = toAscii(encoder, 9999).split('\n');
  assert.equal(rows.length, 9, '2 rows * 4 cells + 1');
  for (const row of rows) {
    assert.equal(row.padEnd(9)[4], '|', 'the stem holds the centre column');
  }
});

/**
 * A mirrored quadrant mirrors its diagonals. `diagUp` in the ones place rises
 * left-to-right and draws `/`; the same segment in the tens place is flipped
 * to the other side of the stem, so it descends and must draw `\`.
 *
 * Choosing the character from the segment's name instead of its slope gets
 * this wrong and renders the left half of the glyph un-mirrored.
 */
test('ascii mirrors diagonals across the stem', () => {
  const ones = toAscii(encoder, 4);
  assert.ok(ones.includes('/'));
  assert.ok(!ones.includes('\\'));

  const tens = toAscii(encoder, 40);
  assert.ok(tens.includes('\\'));
  assert.ok(!tens.includes('/'));

  assert.ok(!toAscii(encoder, 3).includes('/'));
  assert.ok(!toAscii(encoder, 30).includes('\\'));
});

test('ascii grows with the number of rows', () => {
  const tall = new Encoder({ rows: 4 });
  assert.equal(toAscii(tall, 12345678).split('\n').length, 17, '4 rows * 4 cells + 1');
});

test('canvas draws the stem and every segment, and restores the context', () => {
  const calls = [];
  const ctx = {
    canvas: { width: 200, height: 240 },
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    stroke: () => calls.push('stroke'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
  };

  drawGlyph(ctx, encoder, 9999);

  assert.equal(calls[0], 'save');
  assert.equal(calls.at(-1), 'restore', 'the context is left as it was found');
  assert.equal(calls.filter((c) => c === 'moveTo').length, 13, '12 segments + the stem');
  assert.equal(calls.filter((c) => c === 'stroke').length, 2, 'stem and segments differ in width');
});

/**
 * The architectural constraint from the spec: renderers consume
 * Encoder.segmentsFor()/stem() and nothing else. Reaching into SegmentModel or
 * Quadrant is what makes new formats and new language ports expensive, so it
 * fails the build rather than review.
 */
test('renderers do not reach into the number logic', () => {
  const dir = fileURLToPath(new URL('../src/renderers/', import.meta.url));

  for (const file of readdirSync(dir)) {
    const source = readFileSync(dir + file, 'utf8');
    assert.doesNotMatch(
      source,
      /from '\.\.\/model\.js'|\bSegmentModel\b|\bQuadrant\b/,
      `${file} must consume Encoder output only, never SegmentModel or Quadrant`,
    );
  }
});
