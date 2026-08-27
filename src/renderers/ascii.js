/**
 * Segment list -> monospace text glyph.
 *
 * Works on its own small integer grid rather than reusing the continuous
 * coordinates: at 4 cells per quadrant a 200-unit stem would be meaningless.
 *
 * It holds no tables. Grid cells come from normalising each coordinate
 * against the encoder's geometry, and the character to draw with comes from
 * the line's own slope -- so any number of rows, and any segment shape a
 * future model declares, render without touching this file.
 *
 * Deriving the character from the segment's *name* instead is a trap: a
 * `diagUp` mirrored to the left of the stem descends left-to-right and must
 * draw `\`, not `/`.
 */

const HORIZONTAL = '-';
const VERTICAL = '|';
const DIAG_DOWN = '\\';
const DIAG_UP = '/';

/**
 * @param {import('../encoder.js').Encoder} encoder
 * @param {number | bigint | string} value
 * @param {{cells?: number, blank?: string}} [options]
 */
export function toAscii(encoder, value, options = {}) {
  const { cells = 4, blank = ' ' } = options;

  const width = 2 * cells + 1;
  const height = encoder.rows * cells + 1;
  const grid = Array.from({ length: height }, () => new Array(width).fill(blank));

  const left = encoder.stemX - encoder.quadrantWidth;
  const col = (x) => Math.round(((x - left) / encoder.quadrantWidth) * cells);
  const row = (y) => Math.round(((y - encoder.stemTopY) / encoder.rowHeight) * cells);

  for (const s of encoder.segmentsFor(value)) {
    line(grid, col(s.x1), row(s.y1), col(s.x2), row(s.y2), character(s));
  }

  // Stem last so it stays unbroken where horizontals meet it.
  line(grid, cells, 0, cells, height - 1, VERTICAL);

  return grid.map((r) => r.join('').replace(/\s+$/, '')).join('\n');
}

/** Which character a segment draws with, from its slope alone. */
function character(s) {
  if (s.x1 === s.x2) return VERTICAL;
  if (s.y1 === s.y2) return HORIZONTAL;

  // Y grows downward, so a positive slope descends to the right.
  return (s.y2 - s.y1) / (s.x2 - s.x1) > 0 ? DIAG_DOWN : DIAG_UP;
}

/** Bresenham-style integer stepping; horizontals and verticals fall out of it. */
function line(grid, col1, row1, col2, row2, char) {
  const dCol = Math.abs(col2 - col1);
  const dRow = -Math.abs(row2 - row1);
  const stepCol = col1 < col2 ? 1 : -1;
  const stepRow = row1 < row2 ? 1 : -1;

  let error = dCol + dRow;
  let col = col1;
  let row = row1;

  for (;;) {
    grid[row][col] = char;
    if (col === col2 && row === row2) return;

    const doubled = 2 * error;
    if (doubled >= dRow) { error += dRow; col += stepCol; }
    if (doubled <= dCol) { error += dCol; row += stepRow; }
  }
}
