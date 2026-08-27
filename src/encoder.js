import defaultModel from '../model.json' with { type: 'json' };
import { LEFT, Quadrant, SegmentModel } from './model.js';

/**
 * Beyond 18 places the maximum stops being an exact integer in the languages
 * this spec targets, so 18 is the cross-language contract.
 */
export const MAX_PLACES = 18;

/**
 * JavaScript's own, lower limit. A Number holds integers exactly only up to
 * 2^53-1, which runs out at 15 places -- 10^16-1 is already past it. Beyond
 * 15 places the encoder still works, but the number must arrive as a bigint
 * or a string, because a plain Number can no longer represent it.
 */
export const SAFE_NUMBER_PLACES = 15;

/** @type {readonly string[]} */
const PLACE_NAMES = [
  'ones', 'tens', 'hundreds', 'thousands',
  'tenThousands', 'hundredThousands', 'millions', 'tenMillions',
  'hundredMillions', 'billions', 'tenBillions', 'hundredBillions',
  'trillions', 'tenTrillions', 'hundredTrillions', 'quadrillions',
  'tenQuadrillions', 'hundredQuadrillions',
];

/**
 * Places for a given number of rows, following the model's own pattern:
 * right then left, top row down.
 *
 * @param {number} rows
 */
function placesFor(rows) {
  if (!Number.isInteger(rows) || rows < 1) {
    throw new RangeError(`A glyph needs at least one row, got ${rows}.`);
  }

  // Refuse rather than quietly hand back fewer places than asked for -- a
  // truncated model would encode a smaller number than the caller believes.
  if (2 * rows > MAX_PLACES) {
    throw new RangeError(
      `${rows} rows means ${2 * rows} places, and beyond ${MAX_PLACES} the maximum is no longer ` +
      `an exact integer. Use at most ${MAX_PLACES / 2} rows, or compose several glyphs.`,
    );
  }

  const places = [];

  for (let row = 0; row < rows; row++) {
    for (const [offset, side] of ['right', 'left'].entries()) {
      places.push({ name: PLACE_NAMES[2 * row + offset], side, row });
    }
  }

  return places;
}

/**
 * Accept a number, bigint or numeric string and return it as a bigint,
 * refusing anything that would silently lose precision on the way in.
 *
 * @param {number | bigint | string} value
 */
function toExactInteger(value) {
  if (typeof value === 'bigint') return value;

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new TypeError(`Sigil encodes whole numbers, got ${value}.`);
    }
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(
        `${value} is past Number.MAX_SAFE_INTEGER and is already inexact. ` +
        'Pass it as a bigint or a string instead.',
      );
    }
    return BigInt(value);
  }

  if (typeof value === 'string') {
    if (!/^[+-]?\d+$/.test(value.trim())) {
      throw new TypeError(`Sigil encodes whole numbers, got "${value}".`);
    }
    return BigInt(value.trim());
  }

  throw new TypeError(`Expected a number, bigint or numeric string, got ${typeof value}.`);
}

/** Narrow a bigint back to a Number when that is exact, for ergonomics. */
function friendly(value) {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
}

/**
 * The generic resolver: model.json (Tier 1) -> glyph objects (Tier 2).
 *
 * Knows no Cistercian-specific tables. Pure arithmetic and interpolation over
 * whatever the model declares.
 *
 * The range is derived from how many places the model has, never declared. A
 * declared range can disagree with the places, and when it does the encoder
 * drops the leading digits -- 12345 and 2345 would produce the same glyph.
 * Deriving it makes that unrepresentable.
 */
export class Encoder {
  /** @param {{model?: object, rows?: number, rowHeight?: number, quadrantWidth?: number, stemX?: number, stemTopY?: number, stemHeight?: number}} [options] */
  constructor(options = {}) {
    const {
      model = defaultModel,
      rows,
      rowHeight,
      quadrantWidth,
      stemX,
      stemTopY,
      stemHeight,
    } = options;

    if (rowHeight !== undefined && stemHeight !== undefined) {
      throw new TypeError('Pass rowHeight or stemHeight, not both.');
    }

    const resolved = rows === undefined ? model : { ...model, places: placesFor(rows) };

    this.segmentModel = new SegmentModel(resolved);
    this.quadrant = new Quadrant(resolved);

    const places = this.quadrant.count;

    if (places > MAX_PLACES) {
      throw new RangeError(
        `A model with ${places} places cannot be represented exactly: beyond ${MAX_PLACES} ` +
        'places the maximum is no longer an exact integer.',
      );
    }

    this.min = 0;
    this.maxExact = 10n ** BigInt(places) - 1n;
    this.max = friendly(this.maxExact);

    const geometry = resolved.geometryDefaults ?? {};
    this.rows = this.quadrant.rows;
    this.rowHeight = stemHeight !== undefined ? stemHeight / this.rows : (rowHeight ?? geometry.rowHeight);
    this.stemHeight = this.rowHeight * this.rows;
    this.quadrantWidth = quadrantWidth ?? geometry.quadrantWidth;
    this.stemX = stemX ?? geometry.stemX;
    this.stemTopY = stemTopY ?? geometry.stemTopY;

    Object.freeze(this);
  }

  /**
   * An encoder with just enough rows to hold `value`, never fewer than the
   * default model's. Explicit, because auto-sizing per call would make a set
   * of glyphs render at different heights.
   *
   * @param {number | bigint | string} value
   * @param {object} [options]
   */
  static fitting(value, options = {}) {
    const exact = toExactInteger(value);

    if (exact < 0n) {
      throw new RangeError(`Sigil encodes non-negative integers, got ${value}.`);
    }

    const base = new Encoder(options);
    if (exact <= base.maxExact) return base;

    const needed = Math.ceil(exact.toString().length / 2);
    return new Encoder({ ...options, rows: Math.max(needed, base.rows) });
  }

  /**
   * The largest number a given number of rows can hold.
   *
   * @param {number} rows
   */
  static maxFor(rows) {
    placesFor(rows);
    return friendly(10n ** BigInt(2 * rows) - 1n);
  }

  /**
   * @param {number | bigint | string} value
   * @returns {Record<string, number>}
   */
  digitsOf(value) {
    const exact = toExactInteger(value);

    if (exact < 0n || exact > this.maxExact) {
      throw new RangeError(
        `Sigil encodes 0-${this.maxExact} with ${this.quadrant.count} places ` +
        `(${this.rows} rows), got ${value}. Use more rows, or Encoder.fitting(${value}).`,
      );
    }

    /** @type {Record<string, number>} */
    const digits = {};
    let divisor = 1n;

    for (const place of this.quadrant.names) {
      digits[place] = Number((exact / divisor) % 10n);
      divisor *= 10n;
    }

    return digits;
  }

  /**
   * Active segments in global coordinates.
   *
   * Order is canonical and fixture-significant: places in model.json order,
   * segments within a place in `segments` order.
   *
   * @param {number | bigint | string} value
   * @returns {{quadrant: string, segment: string, x1: number, y1: number, x2: number, y2: number}[]}
   */
  segmentsFor(value) {
    const digits = this.digitsOf(value);
    const segments = [];

    for (const place of this.quadrant.names) {
      const active = this.segmentModel.segmentsForDigit(digits[place]);
      if (active.length === 0) continue;

      const { side, row } = this.quadrant.placement(place);

      const topY = this.stemTopY + row * this.rowHeight;
      const botY = topY + this.rowHeight;
      const outerX = side === LEFT
        ? this.stemX - this.quadrantWidth
        : this.stemX + this.quadrantWidth;

      for (const key of active) {
        const [lx1, ly1, lx2, ly2] = this.segmentModel.endpoints[key];

        segments.push({
          quadrant: place,
          segment: key,
          x1: this.stemX + lx1 * (outerX - this.stemX),
          y1: topY + ly1 * (botY - topY),
          x2: this.stemX + lx2 * (outerX - this.stemX),
          y2: topY + ly2 * (botY - topY),
        });
      }
    }

    return segments;
  }

  /**
   * The vertical stem every glyph shares, including zero.
   *
   * @returns {[number, number, number, number]}
   */
  stem() {
    return [this.stemX, this.stemTopY, this.stemX, this.stemTopY + this.stemHeight];
  }
}

export { defaultModel };
