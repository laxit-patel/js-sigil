/**
 * Typed wrappers over model.json.
 *
 * Neither class holds a table of its own. The segment shapes, the digit map,
 * and where each place sits around the stem all live in model.json, which
 * every language implementation loads rather than retyping -- that is the
 * whole mechanism keeping the ports from drifting apart.
 *
 * Renderers must not import from here. They consume Encoder output only.
 */

export const RIGHT = 'right';
export const LEFT = 'left';

/**
 * The `segments` and `digitMap` halves of the model.
 */
export class SegmentModel {
  /**
   * Segment keys in declaration order.
   *
   * This order is doubly load-bearing: it is both the bit position of each
   * segment in `digitMap` and the order the encoder emits them in. Reordering
   * the `segments` array in model.json silently changes what every digit
   * means -- it is not a cosmetic edit.
   *
   * @type {readonly string[]}
   */
  keys;

  /** @type {Readonly<Record<string, readonly [number, number, number, number]>>} */
  endpoints;

  /**
   * Digit -> bitmask over `keys`, one bit per candidate segment. The same
   * convention seven-segment display firmware has used for decades, applied
   * to five segments instead of seven.
   *
   * @type {readonly number[]}
   */
  digitMap;

  /** @param {Record<string, any>} model */
  constructor(model) {
    if (!Array.isArray(model?.segments) || !Array.isArray(model?.digitMap)) {
      throw new TypeError('model.json is missing "segments" or "digitMap".');
    }

    if (model.digitMap.length !== 10) {
      throw new RangeError('model.json "digitMap" must have exactly 10 entries, one per digit.');
    }

    const keys = [];
    const endpoints = Object.create(null);

    for (const segment of model.segments) {
      if (typeof segment?.key !== 'string' || !Array.isArray(segment?.coords)) {
        throw new TypeError('model.json segment needs a "key" and "coords".');
      }
      keys.push(segment.key);
      endpoints[segment.key] = Object.freeze([...segment.coords]);
    }

    const width = 1 << keys.length;
    for (const [digit, mask] of model.digitMap.entries()) {
      if (!Number.isInteger(mask) || mask < 0 || mask >= width) {
        throw new RangeError(`model.json digitMap[${digit}] is out of range for ${keys.length} segments.`);
      }
    }

    this.keys = Object.freeze(keys);
    this.endpoints = Object.freeze(endpoints);
    this.digitMap = Object.freeze([...model.digitMap]);
    Object.freeze(this);
  }

  /**
   * Active segment keys for one digit, in canonical order.
   *
   * @param {number} digit
   * @returns {string[]}
   */
  segmentsForDigit(digit) {
    const mask = this.digitMap[digit];
    const active = [];

    for (const [bit, key] of this.keys.entries()) {
      if (mask & (1 << bit)) active.push(key);
    }

    return active;
  }
}

/**
 * The `places` half of the model.
 *
 * A place is a position around the stem: which side of it, and which row down.
 * Row 0 is the top row. List order is the place value -- index 0 is ones,
 * index 1 tens -- so nothing declares 10^n separately and nothing can
 * contradict it.
 */
export class Quadrant {
  /** @type {readonly string[]} Place names, least significant first. */
  names;

  /** @type {Readonly<Record<string, {side: string, row: number}>>} */
  placements;

  /** @type {number} How many rows the stem is divided into. Derived, never declared. */
  rows;

  /** @param {Record<string, any>} model */
  constructor(model) {
    if (!Array.isArray(model?.places) || model.places.length === 0) {
      throw new TypeError('model.json is missing "places".');
    }

    const names = [];
    const placements = Object.create(null);
    let rows = 0;

    for (const [i, place] of model.places.entries()) {
      for (const key of ['name', 'side', 'row']) {
        if (place?.[key] === undefined) {
          throw new TypeError(`model.json place #${i} is missing "${key}".`);
        }
      }

      if (place.side !== RIGHT && place.side !== LEFT) {
        throw new TypeError(`model.json place "${place.name}" has side "${place.side}"; expected right or left.`);
      }

      if (place.name in placements) {
        throw new TypeError(`model.json declares place "${place.name}" twice.`);
      }

      // Two places in the same spot would draw on top of each other and one
      // digit would be unreadable.
      for (const [name, seen] of Object.entries(placements)) {
        if (seen.side === place.side && seen.row === place.row) {
          throw new TypeError(
            `model.json places "${name}" and "${place.name}" both sit ${place.side} of row ${place.row}.`,
          );
        }
      }

      names.push(place.name);
      placements[place.name] = Object.freeze({ side: place.side, row: Number(place.row) });
      rows = Math.max(rows, Number(place.row) + 1);
    }

    this.names = Object.freeze(names);
    this.placements = Object.freeze(placements);
    this.rows = rows;
    Object.freeze(this);
  }

  /** @param {string} name */
  placement(name) {
    return this.placements[name];
  }

  get count() {
    return this.names.length;
  }
}
