import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Encoder, MAX_PLACES, SAFE_NUMBER_PLACES } from '../src/encoder.js';
import defaultModel from '../model.json' with { type: 'json' };

test('the range is derived from the places, so it cannot contradict them', () => {
  for (const [rows, max] of [[1, 99], [2, 9999], [3, 999999], [4, 99999999]]) {
    const encoder = new Encoder({ rows });
    assert.equal(encoder.max, max, `rows: ${rows}`);
    assert.equal(encoder.quadrant.count, 2 * rows);
    assert.equal(Encoder.maxFor(rows), max);
  }
});

test('numbers that would lose their leading digits are rejected', () => {
  // 12345 in a 4-place glyph would render exactly like 2345.
  assert.throws(() => new Encoder().segmentsFor(12345), RangeError);
  assert.equal(12345 % 10000, 2345);
});

test('more rows hold more digits in one glyph', () => {
  const encoder = new Encoder({ rows: 3 });

  assert.deepEqual(encoder.digitsOf(123456), {
    ones: 6, tens: 5, hundreds: 4, thousands: 3, tenThousands: 2, hundredThousands: 1,
  });
  assert.deepEqual(encoder.stem(), [100, 20, 100, 320]);
});

test('fitting picks just enough rows', () => {
  assert.equal(Encoder.fitting(0).rows, 2, 'never fewer than the default');
  assert.equal(Encoder.fitting(9999).rows, 2);
  assert.equal(Encoder.fitting(10000).rows, 3);
  assert.equal(Encoder.fitting(999999).rows, 3);
  assert.equal(Encoder.fitting(1000000).rows, 4);

  assert.deepEqual(Encoder.fitting(12345678).digitsOf(12345678), {
    ones: 8, tens: 7, hundreds: 6, thousands: 5,
    tenThousands: 4, hundredThousands: 3, millions: 2, tenMillions: 1,
  });
});

test('refuses more places than can be held exactly, rather than truncating', () => {
  const widest = new Encoder({ rows: MAX_PLACES / 2 });
  assert.equal(widest.quadrant.count, MAX_PLACES);

  assert.throws(() => new Encoder({ rows: MAX_PLACES / 2 + 1 }), RangeError);
  assert.throws(() => Encoder.maxFor(MAX_PLACES / 2 + 1), RangeError);
});

/**
 * JavaScript's own limit, lower than the spec's. A Number is exact only to
 * 2^53-1, so past 15 places the value has to arrive as a bigint or a string.
 * Accepting an inexact Number would encode a different number than the caller
 * passed -- the same failure the derived range exists to prevent.
 */
test('past Number.MAX_SAFE_INTEGER a plain number is refused, bigint and string are not', () => {
  const wide = new Encoder({ rows: 9 });
  assert.equal(wide.quadrant.count, 18);
  assert.equal(typeof wide.max, 'bigint', 'beyond 15 places the max is a bigint');

  assert.throws(() => wide.digitsOf(10 ** 17), RangeError, 'an inexact Number must not be silently accepted');

  const exact = 123456789012345678n;
  const fromBigint = wide.digitsOf(exact);
  const fromString = wide.digitsOf('123456789012345678');

  assert.deepEqual(fromBigint, fromString);
  assert.equal(fromBigint.ones, 8);
  assert.equal(fromBigint.hundredQuadrillions, 1);

  // And the boundary is where it should be.
  assert.equal(typeof new Encoder({ rows: Math.floor(SAFE_NUMBER_PLACES / 2) }).max, 'number');
});

test('rejects non-integers and junk', () => {
  const encoder = new Encoder();
  assert.throws(() => encoder.digitsOf(12.5), TypeError);
  assert.throws(() => encoder.digitsOf('twelve'), TypeError);
  assert.throws(() => encoder.digitsOf(null), TypeError);
  assert.throws(() => encoder.digitsOf(-1), RangeError);
});

test('two places cannot occupy the same spot', () => {
  const model = structuredClone(defaultModel);
  model.places[1].side = model.places[0].side;
  model.places[1].row = model.places[0].row;

  assert.throws(() => new Encoder({ model }), TypeError);
});

/**
 * The point of the IR: the digit map is data, not code. If this passes with an
 * edited model and unchanged output, the tables have been hardcoded again and
 * the IR is decorative.
 */
test('the digit map is read from the model, not hardcoded', () => {
  const model = structuredClone(defaultModel);
  model.digitMap[1] = 1 << 2; // top -> outer

  const patched = new Encoder({ model }).segmentsFor(1);
  assert.equal(patched.length, 1);
  assert.equal(patched[0].segment, 'outer');
  assert.equal(new Encoder().segmentsFor(1)[0].segment, 'top');
});

test('segment and place order come from the model', () => {
  const encoder = new Encoder();
  assert.deepEqual([...encoder.segmentModel.keys], ['top', 'bottom', 'outer', 'diagDown', 'diagUp']);
  assert.deepEqual([...encoder.quadrant.names], ['ones', 'tens', 'hundreds', 'thousands']);
});

test('geometry is configurable', () => {
  const encoder = new Encoder({ stemHeight: 100, quadrantWidth: 35, stemX: 50, stemTopY: 10 });

  assert.deepEqual(encoder.stem(), [50, 10, 50, 110]);
  assert.deepEqual(encoder.segmentsFor(1), [
    { quadrant: 'ones', segment: 'top', x1: 50, y1: 10, x2: 85, y2: 10 },
  ]);
  assert.throws(() => new Encoder({ stemHeight: 100, rowHeight: 50 }), TypeError);
});
