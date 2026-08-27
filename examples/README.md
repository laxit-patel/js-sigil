# Examples

## `index.html` — the browser demo

ES modules will not load over `file://`, so serve the directory:

```bash
npx --yes serve .        # from the repo root, then open /examples/
# or
python3 -m http.server   # same idea
```

Three things, in order:

1. **`<sigil-glyph>`** — a gallery of elements, inheriting the page's text
   colour, including two that size themselves past 9999 without being told.
2. **Live input** — type any non-negative integer. Past 9999 the stem grows a
   row rather than splitting into two glyphs. A value it cannot encode shows
   the error instead of breaking the page.
3. **A canvas grid** — 120 glyphs in one canvas. This is why the Canvas
   renderer exists: one path per glyph rather than a DOM node per line.

## `node-basics.js`

```bash
node examples/node-basics.js 7323
node examples/node-basics.js 20260827     # sizes itself to 4 rows
```

Prints the digits, the stem, the resolved segment list, and the same glyph as
ASCII and SVG.
