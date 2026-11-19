// Native cross-document view transitions are enabled via CSS:
// @view-transition { navigation: auto; }
//
// This file is kept for progressive enhancement hooks and debugging.
(() => {
  const supported =
    typeof document.startViewTransition === 'function' ||
    (typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      (CSS.supports('view-transition-name: hero') ||
        CSS.supports('selector(::view-transition-group(root))')));

  if (!supported) {
    console.info(
      '[page-transition-test-1] View Transitions API is not supported in this browser. Navigation will work without animated transitions.'
    );
    return;
  }

  window.addEventListener('pageswap', (event) => {
    if (event.viewTransition) {
      console.debug('[page-transition-test-1] pageswap', {
        url: location.href,
        activation: event.activation ? { from: event.activation.from?.url, entry: event.activation.entry?.url } : null,
      });
    }
  });

  window.addEventListener('pagereveal', (event) => {
    if (event.viewTransition) {
      console.debug('[page-transition-test-1] pagereveal', { url: location.href });
    }
  });
})();
