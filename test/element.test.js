import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The web component is the whole library as one call site, so it is worth
 * testing even without a browser. Node has no DOM, so stub the three globals
 * the element actually touches -- enough to prove it registers, renders, and
 * reacts to attribute changes.
 */
const registry = new Map();

class ShadowRoot {
  innerHTML = '';
}

globalThis.HTMLElement = class {
  #attributes = new Map();
  isConnected = true;
  shadowRoot = null;

  attachShadow() {
    this.shadowRoot = new ShadowRoot();
    return this.shadowRoot;
  }

  getAttribute(name) {
    return this.#attributes.has(name) ? this.#attributes.get(name) : null;
  }

  setAttribute(name, value) {
    this.#attributes.set(name, String(value));
    this.attributeChangedCallback?.(name);
  }

  dispatchEvent() {
    return true;
  }
};

globalThis.CustomEvent = class {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

globalThis.customElements = {
  define: (name, ctor) => registry.set(name, ctor),
  get: (name) => registry.get(name),
};

const { SigilGlyphElement } = await import('../src/renderers/element.js');

test('importing the module registers <sigil-glyph>', () => {
  assert.equal(customElements.get('sigil-glyph'), SigilGlyphElement);
});

test('it renders an svg for its value', () => {
  const el = new SigilGlyphElement();
  el.setAttribute('value', '7323');
  el.connectedCallback();

  assert.match(el.shadowRoot.innerHTML, /<svg /);
  assert.equal(el.shadowRoot.innerHTML.match(/<line /g).length, 6, '5 segments + the stem');
  assert.match(el.shadowRoot.innerHTML, /stroke="currentColor"/, 'inherits text colour by default');
  assert.match(el.shadowRoot.innerHTML, /aria-label="Sigil glyph for 7323"/);
});

test('it redraws when value changes', () => {
  const el = new SigilGlyphElement();
  el.setAttribute('value', '0');
  el.connectedCallback();
  assert.equal(el.shadowRoot.innerHTML.match(/<line /g).length, 1, 'zero is the stem alone');

  el.setAttribute('value', '9999');
  assert.equal(el.shadowRoot.innerHTML.match(/<line /g).length, 13);
});

test('it sizes itself to numbers past 9999 without being told', () => {
  const el = new SigilGlyphElement();
  el.setAttribute('value', '12345678');
  el.connectedCallback();

  // 4 rows: the stem spans 400 units, so the viewBox is taller than the default.
  assert.match(el.shadowRoot.innerHTML, /viewBox="[\d.\- ]+ 428"/);
});

test('a bad value empties the element instead of throwing', () => {
  const el = new SigilGlyphElement();
  el.setAttribute('value', 'not-a-number');

  assert.doesNotThrow(() => el.connectedCallback());
  assert.doesNotMatch(el.shadowRoot.innerHTML, /<svg /);
});
