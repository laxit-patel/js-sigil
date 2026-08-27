# AGENTS.md

The JavaScript implementation of Sigil, published as `@laxit-patel/sigil`. This is a
standalone repo: it installs, tests and runs with nothing else checked out.

**The spec lives in a separate repo**, [laxit-patel/sigil][spec] — read its
`SPEC.md` and `AGENTS.md` before changing anything under `src/`. When this repo
is checked out as a submodule of it, that is `../SPEC.md`.

[spec]: https://github.com/laxit-patel/sigil

## The rule that outranks everything else

`model.json` and `fixtures/*.json` in this repo are **vendored copies**. The
canonical set lives in the [spec repo][spec], whose CI diffs them against this
repo's copies on every build — so editing them here without editing them there
turns the build red, by design.

This package is correct exactly when `test/vectors.test.js` passes against both
fixture files.

To change the definition:

1. Edit `model.json` in the [spec repo][spec] first. That is a breaking change
   for **every** implementation — JS, PHP, everything planned.
2. Copy it here, run `npm test`.
3. Copy the regenerated fixtures here too (PHP's `bin/vectors.php` generates
   them; this repo does not, deliberately — two generators would be two things
   to keep in step).
4. Commit together, push, and update the submodule pointer in the spec repo.

Never reorder `model.json`'s `segments` array: that order is both the bit
position of each segment in `digitMap` and the emit order. Append only.

## Architecture constraints

- `SegmentModel` and `Quadrant` are **typed wrappers over `model.json`**, not
  tables. A segment or digit literal in either of them means that data has been
  copied out of the JSON, which is the drift this design exists to prevent.
- **Nothing derivable is stored.** The range is `10^places - 1`, rows is
  `max(row) + 1`, place value is the list index, stem height is
  `rowHeight * rows`.
- **Nothing is hardcoded to four places.** Renderers must work at any row
  count; `toAscii` derives its grid from the encoder's geometry and its
  characters from each line's slope, precisely so no table has to be kept in
  step with the model.
- **Renderers use `Encoder` output only** — never `SegmentModel` or
  `Quadrant`. A test in `test/renderers.test.js` greps for it.
- **Never truncate silently.** Asked for more places than can be held exactly,
  refuse.

## JavaScript-specific

- **Zero dependencies and zero devDependencies.** Tests are `node:test`, types
  are hand-written. Adding a build step or a test framework needs a real
  argument; PHP manages without one too.
- **`index.d.ts` is hand-written**, so nothing keeps it honest on its own.
  `test/types.check.ts` exercises the public surface and is compiled with
  `tsc --strict` in CI. Extend it when you add to the API.
- **A `Number` is exact only to 2^53−1**, which runs out at 15 places — below
  the spec's 18. `digitsOf` therefore accepts `number | bigint | string` and
  refuses an inexact Number rather than encoding a different value than the
  caller passed. `max` is a `bigint` past 15 places and a `number` below.
- `model.json` is loaded with a JSON import attribute, so there is one copy of
  it rather than a generated module that could drift. That needs Node 20.10+
  and a modern browser or bundler.
- `src/renderers/element.js` has a side effect (it registers the custom
  element) and is listed in `sideEffects` so bundlers do not drop it.

## Commands

```bash
npm test                      # node:test, including the fixture compliance suite
npm pack --dry-run            # what actually ships
```

## Conventions

- ESM only, `type: "module"`. No transpilation, no build output.
- JSDoc on exported functions; comments explain *why*, not what.
- The public surface is re-exported from `src/index.js`; deep imports into
  `src/renderers/*` are not part of the contract except `./element`.
