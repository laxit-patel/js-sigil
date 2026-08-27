/**
 * Segment list -> SVG string.
 *
 * One <line> per segment plus the stem, drawn slightly heavier. The viewBox is
 * derived from the returned coordinates, so it stays correct for any geometry
 * and any number of rows.
 */

/**
 * @param {import('../encoder.js').Encoder} encoder
 * @param {number | bigint | string} value
 * @param {{stroke?: string, strokeWidth?: number, stemStrokeWidth?: number, padding?: number, label?: string}} [options]
 */
export function toSvg(encoder, value, options = {}) {
  const {
    stroke = '#111111',
    strokeWidth = 6,
    stemStrokeWidth = 8,
    padding = 10,
    label = `Sigil glyph for ${value}`,
  } = options;

  const stem = encoder.stem();
  const segments = encoder.segmentsFor(value);

  const xs = [stem[0], stem[2]];
  const ys = [stem[1], stem[3]];
  for (const s of segments) {
    xs.push(s.x1, s.x2);
    ys.push(s.y1, s.y2);
  }

  const pad = padding + Math.max(strokeWidth, stemStrokeWidth) / 2;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) + pad - minX;
  const height = Math.max(...ys) + pad - minY;

  const lines = [
    `  <line x1="${n(stem[0])}" y1="${n(stem[1])}" x2="${n(stem[2])}" y2="${n(stem[3])}" stroke-width="${n(stemStrokeWidth)}"/>`,
    ...segments.map(
      (s) => `  <line x1="${n(s.x1)}" y1="${n(s.y1)}" x2="${n(s.x2)}" y2="${n(s.y2)}"/><!-- ${s.quadrant}.${s.segment} -->`,
    ),
  ];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(minX)} ${n(minY)} ${n(width)} ${n(height)}" role="img" aria-label="${escapeAttribute(label)}">`,
    `  <g stroke="${escapeAttribute(stroke)}" stroke-width="${n(strokeWidth)}" stroke-linecap="round" fill="none">`,
    ...lines,
    '  </g>',
    '</svg>',
  ].join('\n');
}

/** Trim the float noise SVG does not need, without turning 170 into "170.0000". */
function n(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
