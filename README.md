<p align="center">
  <img src="https://raw.githubusercontent.com/laxit-patel/sigil/main/art/umbral_sigilstone.png" alt="Umbral Sigilstone" width="400">
</p>

# 💜 Umbral Sigilstone — JavaScript

**@laxit-patel/sigil** — turns an integer into one recognizable Cistercian-style
glyph, rendered as SVG, Canvas, ASCII, or a `<sigil-glyph>` element. Four
digits by default, more on request.

> *The Umbral Sigilstone presses a number into a single struck mark: one stem
> and a handful of strokes, identical everywhere it is struck — in pixels, in
> ink, or in cut metal.*

[![npm](https://img.shields.io/npm/v/%40laxit-patel%2Fsigil?logo=npm&logoColor=white&color=6f5fc0)](https://www.npmjs.com/package/@laxit-patel/sigil)
[![CI](https://github.com/laxit-patel/js-sigil/actions/workflows/ci.yml/badge.svg)](https://github.com/laxit-patel/js-sigil/actions/workflows/ci.yml)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-6f5fc0)](package.json)
[![Bundle](https://img.shields.io/bundlephobia/minzip/%40laxit-patel%2Fsigil?color=6f5fc0&label=min%2Bgzip)](https://bundlephobia.com/package/@laxit-patel/sigil)
[![License](https://img.shields.io/badge/license-MIT-6f5fc0)](LICENSE)

---

```text
7323  →  💜  →  svg · canvas · ascii · <sigil-glyph>
```

<p align="center">
  <img src="https://raw.githubusercontent.com/laxit-patel/sigil/main/art/showcase-anatomy.svg" alt="7323 built from 7000 + 300 + 20 + 3, one quadrant per digit" width="760">
</p>

This is the JavaScript implementation, one of several in the
[Sigil](https://github.com/laxit-patel/sigil) project; the spec it implements
is [`SPEC.md`](https://github.com/laxit-patel/sigil/blob/main/SPEC.md).

```bash
npm install @laxit-patel/sigil
```

ESM, Node 20.10+ and modern browsers. **No dependencies, and no
devDependencies either** — the tests run on `node:test`, which ships with Node.
The package includes `model.json`, the declarative definition it loads, so it
works with nothing else installed.

## Use it

One `Encoder` resolves a number into a list of line segments. Each renderer
draws that same list — so the sections below differ only in which one you call.

```js
import { Encoder } from '@laxit-patel/sigil';

const encoder = new Encoder();

encoder.digitsOf(7323);    // { ones: 3, tens: 2, hundreds: 3, thousands: 7 }
encoder.stem();            // [100, 20, 100, 220]
encoder.segmentsFor(7323); // [{ quadrant, segment, x1, y1, x2, y2 }, ...]
```

### `<sigil-glyph>` — one call site

The whole library as an element. It inherits the surrounding text colour, so it
themes itself, and it sizes to the number without being told.

```js
import '@laxit-patel/sigil/element';
```

```html
<sigil-glyph value="7323"></sigil-glyph>
<sigil-glyph value="12345678"></sigil-glyph>   <!-- 4 rows, automatically -->
<sigil-glyph value="42" stroke="#6f5fc0" stroke-width="8"></sigil-glyph>
<sigil-glyph value="999999" rows="3"></sigil-glyph>  <!-- pin the height -->
```

Attributes are reflected: change `value` and it redraws. A value it cannot
encode empties the element and fires a `sigil-error` event rather than
throwing into the page.

### Canvas — many glyphs at once

The renderer the browser actually wanted. Drawing an avatar grid costs one path
per glyph instead of a DOM node per line.

```js
import { Encoder, drawGlyph } from '@laxit-patel/sigil';

const encoder = new Encoder();
const ctx = canvas.getContext('2d');

drawGlyph(ctx, encoder, 7323, { x: 0, y: 0, width: 96, height: 112 });
```

The context is saved and restored around everything, so you can keep drawing
after.

### SVG — a string you can inline or cache

```js
import { Encoder, toSvg } from '@laxit-patel/sigil';

toSvg(new Encoder(), 7323, { stroke: 'currentColor', strokeWidth: 8 });
```

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="16 6 168 228" role="img" aria-label="Sigil glyph for 7323">
  <g stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none">
  <line x1="100" y1="20" x2="100" y2="220" stroke-width="8"/>
  <line x1="100" y1="20" x2="170" y2="120"/><!-- ones.diagDown -->
  ...
  </g>
</svg>
```

### ASCII — terminals and logs

```js
import { Encoder, toAscii } from '@laxit-patel/sigil';

console.log(toAscii(new Encoder(), 7323));
```

```text
    |
    |\
    | \
    |  \
|---|   \
|   |\
|   | \
|   |  \
|   |   \
```

Read it by quadrant: top-right is ones, top-left tens, bottom-right hundreds,
bottom-left thousands.

## Numbers past 9999

Four places is the *historical* Cistercian system, not a limit of the geometry.
A place is a side of the stem and a row down it, so a taller stem holds more
digits — as **one mark**, not several glyphs side by side.

<p align="center">
  <img src="https://raw.githubusercontent.com/laxit-patel/sigil/main/art/showcase-rows.svg" alt="9999 at two rows through 1234567890 at five rows, each taller than the last" width="740">
</p>

```js
new Encoder({ rows: 3 });     // 6 places, 0-999999
Encoder.fitting(12345678);    // picks the 4 rows it needs
Encoder.maxFor(4);            // 99999999
```

The range is **derived** from the number of places, never declared, so it
cannot disagree with them. On a four-place glyph `12345` would render
identically to `2345`, silently losing its leading digit — so:

```js
new Encoder().segmentsFor(12345);   // RangeError, not a wrong glyph
```

### Where JavaScript's limit actually is

The spec's ceiling is 18 places. JavaScript's is lower: a `Number` is exact
only to 2^53−1, which runs out at **15 places**. Past that the value has to
arrive as a `bigint` or a numeric string, because a Number can no longer hold
it — and accepting an inexact one would encode a different number than you
passed.

```js
const wide = new Encoder({ rows: 9 });   // 18 places

wide.digitsOf(10 ** 17);                 // RangeError — already inexact as a Number
wide.digitsOf(123456789012345678n);      // fine
wide.digitsOf('123456789012345678');     // also fine
typeof wide.max;                         // 'bigint' past 15 places, 'number' below
```

## Compliance

`test/vectors.test.js` replays
[`fixtures/vectors.json`](fixtures/vectors.json) and
[`fixtures/vectors-wide.json`](fixtures/vectors-wide.json) and asserts this
implementation reproduces every vector exactly. That is the whole definition of
"spec-compliant", and every language implementation runs the equivalent against
the same JSON.

```bash
npm test
```

Both files are vendored copies. The canonical pair lives in the
[spec repo](https://github.com/laxit-patel/sigil), whose CI diffs them against
every implementation's copies so a copy cannot quietly drift.

## Architecture

```
model.json    the definition — segments, digit map, places, geometry
SegmentModel  typed wrapper over model.json's segments + digitMap
Quadrant      typed wrapper over model.json's places
Encoder       the generic resolver: model.json -> segment list
renderers/*   segment list -> one output format
```

None of these hold the digit map. They read `model.json`, which is what keeps
this package from drifting away from the PHP implementation — the two produce
byte-identical SVG and ASCII for the same input.

Renderers consume `Encoder` output and **nothing else**; a test greps
`src/renderers/` for `SegmentModel` and `Quadrant` to keep it that way, because
that constraint is what makes new output formats and new language ports cheap.

## Releasing

Publishing is driven by a tag, so what ships is exactly what was tagged:

```bash
npm version patch          # or minor / major — writes package.json and tags
git push --follow-tags
```

`.github/workflows/release.yml` then runs the suite, refuses to publish if the
tag and `package.json` disagree, and publishes with
[provenance](https://docs.npmjs.com/generating-provenance-statements) so the
package can be traced back to this commit. It needs one repository secret,
`NPM_TOKEN` — an npm **automation** token, which bypasses 2FA for CI.

## License

MIT — see [`LICENSE`](LICENSE).
