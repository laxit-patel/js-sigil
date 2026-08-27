/**
 * The whole API from Node, in one file.
 *
 *   node examples/node-basics.js 7323
 */

import { Encoder, toAscii, toSvg } from '../src/index.js';

const input = process.argv[2] ?? '7323';
const encoder = Encoder.fitting(input);

console.log(`number:   ${input}`);
console.log(`digits:   ${JSON.stringify(encoder.digitsOf(input))}`);
console.log(`stem:     ${JSON.stringify(encoder.stem())}`);
console.log(`rows:     ${encoder.rows} (range 0-${encoder.max})\n`);

console.log('--- segments ---');
for (const s of encoder.segmentsFor(input)) {
  console.log(`  ${s.quadrant.padEnd(16)} ${s.segment.padEnd(9)} (${s.x1},${s.y1}) -> (${s.x2},${s.y2})`);
}

console.log(`\n--- ascii ---\n${toAscii(encoder, input)}`);
console.log(`\n--- svg ---\n${toSvg(encoder, input)}`);
