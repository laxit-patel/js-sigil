import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Encoder } from '../src/encoder.js';

const load = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8'));

/**
 * The compliance check. Passing it is the whole definition of
 * "spec-compliant"; every language implementation runs the equivalent against
 * the same JSON.
 */
test('golden vectors', async (t) => {
  const { vectors } = load('vectors.json');
  const encoder = new Encoder();

  await t.test('the fixtures use the default geometry', () => {
    assert.equal(encoder.rows, 2);
    assert.equal(encoder.stemHeight, 200);
    assert.equal(encoder.quadrantWidth, 70);
    assert.equal(encoder.stemX, 100);
    assert.equal(encoder.stemTopY, 20);
    assert.equal(encoder.max, 9999);
  });

  for (const vector of vectors) {
    await t.test(`number ${vector.number}`, () => {
      assert.deepEqual(encoder.digitsOf(vector.number), vector.digits);
      assert.deepEqual(encoder.stem(), vector.stem);
      assert.deepEqual(
        encoder.segmentsFor(vector.number),
        vector.segments,
        `segmentsFor(${vector.number}) drifted from fixtures/vectors.json`,
      );
    });
  }
});

/**
 * The generalised contract. Without this an implementation could hardcode
 * four places, pass every vector above, and still be wrong about what the
 * model declares.
 */
test('wide vectors', async (t) => {
  for (const vector of load('vectors-wide.json').vectors) {
    await t.test(`${vector.rows} rows, number ${vector.number}`, () => {
      const encoder = new Encoder({ rows: vector.rows });

      assert.deepEqual(encoder.digitsOf(vector.number), vector.digits);
      assert.deepEqual(encoder.stem(), vector.stem);
      assert.deepEqual(encoder.segmentsFor(vector.number), vector.segments);
    });
  }
});
