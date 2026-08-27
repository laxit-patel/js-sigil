/**
 * <sigil-glyph value="1234"> -- the whole library as one call site.
 *
 * Importing this module registers the element; it is a side effect, which is
 * why package.json marks it as such so a bundler does not tree-shake it away.
 *
 *   import '@laxit/sigil/element';
 *   <sigil-glyph value="7323" stroke="currentColor"></sigil-glyph>
 *
 * The glyph inherits the surrounding text colour by default, so it themes
 * itself. Attributes are reflected: change `value` and it redraws.
 */

import { Encoder } from '../encoder.js';
import { toSvg } from './svg.js';

const OBSERVED = ['value', 'stroke', 'stroke-width', 'stem-stroke-width', 'rows'];

export class SigilGlyphElement extends HTMLElement {
  static observedAttributes = OBSERVED;

  #shadow = this.attachShadow({ mode: 'open' });

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }

  #render() {
    const raw = this.getAttribute('value') ?? '0';
    const rows = this.getAttribute('rows');

    let markup;

    try {
      const encoder = rows === null
        ? Encoder.fitting(raw.trim())
        : new Encoder({ rows: Number(rows) });

      markup = toSvg(encoder, raw.trim(), {
        stroke: this.getAttribute('stroke') ?? 'currentColor',
        strokeWidth: numberAttribute(this, 'stroke-width', 6),
        stemStrokeWidth: numberAttribute(this, 'stem-stroke-width', 8),
        label: this.getAttribute('aria-label') ?? `Sigil glyph for ${raw.trim()}`,
      });
    } catch (error) {
      // A bad attribute should not take the page down with it.
      markup = '';
      this.#shadow.innerHTML = '';
      queueMicrotask(() => {
        this.dispatchEvent(new CustomEvent('sigil-error', { detail: error, bubbles: false }));
      });
    }

    this.#shadow.innerHTML =
      `<style>:host{display:inline-block;line-height:0;color:inherit}svg{width:100%;height:100%;display:block}</style>${markup}`;
  }
}

function numberAttribute(element, name, fallback) {
  const raw = element.getAttribute(name);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

if (typeof customElements !== 'undefined' && !customElements.get('sigil-glyph')) {
  customElements.define('sigil-glyph', SigilGlyphElement);
}
