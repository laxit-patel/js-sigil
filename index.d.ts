/**
 * Sigil — turn an integer into one recognizable Cistercian-style glyph.
 *
 * Hand-written rather than generated: the package has no build step, and a
 * declaration file small enough to read is worth more than a toolchain.
 */

/** A number Sigil can encode. Past 15 places a Number is no longer exact, so pass a bigint or a numeric string. */
export type SigilValue = number | bigint | string;

/** One resolved line segment — the Tier 2 wire format. */
export interface Segment {
  quadrant: string;
  segment: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The stem, as [x1, y1, x2, y2]. */
export type Stem = [number, number, number, number];

export interface Place {
  name: string;
  side: 'left' | 'right';
  row: number;
}

export interface SigilModel {
  version: string;
  places: Place[];
  geometryDefaults: {
    rowHeight: number;
    quadrantWidth: number;
    stemX: number;
    stemTopY: number;
  };
  segments: { key: string; coords: [number, number, number, number] }[];
  digitMap: number[];
}

export interface EncoderOptions {
  /** Defaults to the bundled model.json. */
  model?: SigilModel;
  /** More rows than the model declares means more places, and a larger range. */
  rows?: number;
  rowHeight?: number;
  quadrantWidth?: number;
  stemX?: number;
  stemTopY?: number;
  /** Convenience for `rowHeight * rows`; pass one or the other, not both. */
  stemHeight?: number;
}

export declare class SegmentModel {
  constructor(model: SigilModel);
  readonly keys: readonly string[];
  readonly endpoints: Readonly<Record<string, readonly [number, number, number, number]>>;
  readonly digitMap: readonly number[];
  segmentsForDigit(digit: number): string[];
}

export declare class Quadrant {
  constructor(model: SigilModel);
  readonly names: readonly string[];
  readonly placements: Readonly<Record<string, { side: string; row: number }>>;
  readonly rows: number;
  readonly count: number;
  placement(name: string): { side: string; row: number };
}

export declare class Encoder {
  constructor(options?: EncoderOptions);

  readonly segmentModel: SegmentModel;
  readonly quadrant: Quadrant;

  readonly min: 0;
  /** Derived as `10^places - 1`. A bigint past 15 places, where a Number stops being exact. */
  readonly max: number | bigint;
  /** The same value, always a bigint. */
  readonly maxExact: bigint;

  readonly rows: number;
  readonly rowHeight: number;
  readonly stemHeight: number;
  readonly quadrantWidth: number;
  readonly stemX: number;
  readonly stemTopY: number;

  digitsOf(value: SigilValue): Record<string, number>;
  segmentsFor(value: SigilValue): Segment[];
  stem(): Stem;

  /** An encoder with just enough rows to hold `value`, never fewer than the default. */
  static fitting(value: SigilValue, options?: EncoderOptions): Encoder;
  /** The largest number a given number of rows can hold. */
  static maxFor(rows: number): number | bigint;
}

/** The cross-language ceiling: beyond this the maximum stops being an exact integer. */
export declare const MAX_PLACES: 18;
/** JavaScript's own, lower limit — past this a value must arrive as a bigint or string. */
export declare const SAFE_NUMBER_PLACES: 15;
export declare const defaultModel: SigilModel;
export declare const LEFT: 'left';
export declare const RIGHT: 'right';

export interface SvgOptions {
  stroke?: string;
  strokeWidth?: number;
  stemStrokeWidth?: number;
  padding?: number;
  label?: string;
}

export declare function toSvg(encoder: Encoder, value: SigilValue, options?: SvgOptions): string;

export interface AsciiOptions {
  /** Grid cells per quadrant, in each direction. */
  cells?: number;
  blank?: string;
}

export declare function toAscii(encoder: Encoder, value: SigilValue, options?: AsciiOptions): string;

export interface CanvasOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  stemStrokeWidth?: number;
  padding?: number;
}

export declare function drawGlyph(
  ctx: CanvasRenderingContext2D,
  encoder: Encoder,
  value: SigilValue,
  options?: CanvasOptions,
): void;
