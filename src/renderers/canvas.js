/**
 * Segment list -> a Canvas 2D context.
 *
 * This is the renderer the browser actually wanted: drawing hundreds of
 * glyphs at once (an avatar list, a grid) costs one path per glyph instead of
 * a DOM node per line.
 *
 * The context is left as it was found -- save/restore around everything -- so
 * callers can keep drawing after.
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../encoder.js').Encoder} encoder
 * @param {number | bigint | string} value
 * @param {{x?: number, y?: number, width?: number, height?: number, stroke?: string, strokeWidth?: number, stemStrokeWidth?: number, padding?: number}} [options]
 */
export function drawGlyph(ctx, encoder, value, options = {}) {
  const {
    x = 0,
    y = 0,
    width = ctx.canvas?.width ?? 200,
    height = ctx.canvas?.height ?? 240,
    stroke = '#111111',
    strokeWidth = 6,
    stemStrokeWidth = 8,
    padding = 10,
  } = options;

  const stem = encoder.stem();
  const segments = encoder.segmentsFor(value);

  // Fit the glyph's own coordinate space into the box, preserving aspect.
  const spanX = 2 * encoder.quadrantWidth;
  const spanY = encoder.stemHeight;
  const scale = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);

  const left = encoder.stemX - encoder.quadrantWidth;
  const offsetX = x + (width - spanX * scale) / 2 - left * scale;
  const offsetY = y + (height - spanY * scale) / 2 - encoder.stemTopY * scale;

  const px = (gx) => offsetX + gx * scale;
  const py = (gy) => offsetY + gy * scale;

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineCap = 'round';

  ctx.lineWidth = stemStrokeWidth * scale;
  ctx.beginPath();
  ctx.moveTo(px(stem[0]), py(stem[1]));
  ctx.lineTo(px(stem[2]), py(stem[3]));
  ctx.stroke();

  ctx.lineWidth = strokeWidth * scale;
  ctx.beginPath();
  for (const s of segments) {
    ctx.moveTo(px(s.x1), py(s.y1));
    ctx.lineTo(px(s.x2), py(s.y2));
  }
  ctx.stroke();

  ctx.restore();
}
