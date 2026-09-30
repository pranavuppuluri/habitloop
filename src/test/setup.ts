/** jsdom gaps the app touches on boot. */

// The theme reader asks for the OS preference before React mounts.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// The device backend hashes passwords with SubtleCrypto.
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto')
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

// jsdom has no layout, so every chart would measure zero without this.
if (!Element.prototype.getBoundingClientRect.call(document.body).width) {
  Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, width: 600, height: 300, top: 0, left: 0, right: 600, bottom: 300, toJSON: () => {} }
  }
}
