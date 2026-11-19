// Barba.js MPA page transitions (no build tools, local dependency)
// Header and hero persist outside the Barba container; only page content swaps.
// The hero height/subtitle animates, and the active card moves into place.
(() => {
  const DURATION = 450;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrames = (count = 2) =>
    new Promise((resolve) => {
      const step = () => {
        count -= 1;
        if (count <= 0) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

  function reducedMotion() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function cardSelectorForNamespace(ns) {
    switch (ns) {
      case 'subpage1':
        return '.card1';
      case 'subpage2':
        return '.card2';
      case 'subpage3':
        return '.card3';
      default:
        return null;
    }
  }

  function resolveCardSelector(data) {
    const nextNs = data && data.next && data.next.namespace;
    const currentNs = data && data.current && data.current.namespace;

    const nextSelector = cardSelectorForNamespace(nextNs);
    if (nextSelector) return nextSelector;

    const currentSelector = cardSelectorForNamespace(currentNs);
    if (currentSelector) return currentSelector;

    const trigger = data && data.trigger;
    if (trigger && typeof trigger.closest === 'function') {
      const card = trigger.closest('.card');
      if (card) {
        if (card.classList.contains('card1')) return '.card1';
        if (card.classList.contains('card2')) return '.card2';
        if (card.classList.contains('card3')) return '.card3';
      }
    }

    const href =
      (trigger && trigger.getAttribute && trigger.getAttribute('href')) ||
      (data && data.next && data.next.url && data.next.url.path) ||
      '';
    if (href.indexOf('subpage1') !== -1) return '.card1';
    if (href.indexOf('subpage2') !== -1) return '.card2';
    if (href.indexOf('subpage3') !== -1) return '.card3';

    return null;
  }

  function syncPersistentUI(container) {
    if (!container) return;

    const pageClass = container.dataset.pageClass || container.className || '';
    const subtitle = container.dataset.heroSubtitle || '';
    const hero = document.getElementById('persistent-hero');
    const subtitleEl = document.getElementById('hero-subtitle');

    // Keep wrapper/body classes aligned with the active page so hero height can animate.
    if (pageClass) {
      document.body.className = pageClass;
    }

    if (subtitleEl && subtitle) {
      subtitleEl.textContent = subtitle;
    }

    if (hero) {
      hero.classList.remove('hero-subpage1', 'hero-subpage2', 'hero-subpage3');
      const cls = pageClass;
      if (cls.indexOf('page-subpage1') !== -1) hero.classList.add('hero-subpage1');
      else if (cls.indexOf('page-subpage2') !== -1) hero.classList.add('hero-subpage2');
      else if (cls.indexOf('page-subpage3') !== -1) hero.classList.add('hero-subpage3');
    }
  }

  function ensureStagePlacement(nextContainer) {
    const stage = document.querySelector('.content-stage');
    if (stage && nextContainer && nextContainer.parentElement !== stage) {
      stage.appendChild(nextContainer);
    }
  }

  async function runTransition(data) {
    const current = data.current && data.current.container;
    const next = data.next && data.next.container;
    if (!current || !next) return;

    const duration = reducedMotion() ? 1 : DURATION;

    ensureStagePlacement(next);

    // Sync persistent header/hero state to the destination page (hero height animates via CSS).
    syncPersistentUI(next);

    // Keep layout/measurements stable during the transition
    window.scrollTo(0, 0);

    current.classList.add('is-leaving');
    next.classList.add('is-entering');

    const selector = resolveCardSelector(data);
    const fromEl = selector ? current.querySelector(selector) : null;
    const toEl = selector ? next.querySelector(selector) : null;

    let clone = null;
    let fromHidden = false;
    let toHidden = false;

    if (fromEl && toEl) {
      await nextFrames(2);
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      if (fromRect.width && fromRect.height && toRect.width && toRect.height) {
        clone = fromEl.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.classList.add('transition-card-clone');
        Object.assign(clone.style, {
          position: 'fixed',
          left: fromRect.left + 'px',
          top: fromRect.top + 'px',
          width: fromRect.width + 'px',
          height: fromRect.height + 'px',
          margin: '0',
          zIndex: '10000',
          pointerEvents: 'none',
          transform: 'translate(0px, 0px)',
          transition: 'transform ' + duration + 'ms ' + EASE,
        });

        document.body.appendChild(clone);
        fromEl.style.visibility = 'hidden';
        toEl.style.visibility = 'hidden';
        fromHidden = true;
        toHidden = true;

        await nextFrames(2);
        clone.style.transform =
          'translate(' +
          (toRect.left - fromRect.left) +
          'px, ' +
          (toRect.top - fromRect.top) +
          'px)';
      }
    }

    // Crossfade swapped content below the persistent hero while the card moves
    await nextFrames(1);
    next.classList.add('is-entered');

    await wait(duration + 30);

    if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
    if (fromHidden) fromEl.style.visibility = '';
    if (toHidden) toEl.style.visibility = '';

    current.classList.remove('is-leaving');
    next.classList.remove('is-entering', 'is-entered');
    window.scrollTo(0, 0);
  }

  function initBarba() {
    if (typeof barba === 'undefined' || !barba.init) {
      console.warn('[page-transition-test-2] Barba.js not found. Falling back to normal navigation.');
      return;
    }

    barba.init({
      sync: true,
      transitions: [
        {
          name: 'card-move-transition',
          async leave() {
            // Sync transition work is handled in enter so both containers are available.
          },
          async enter(data) {
            await runTransition(data);
          },
          async once(data) {
            const next = data && data.next && data.next.container;
            if (!next) return;
            ensureStagePlacement(next);
            syncPersistentUI(next);
            next.classList.remove('is-entering', 'is-leaving', 'is-entered');
          },
        },
      ],
      preventRunning: true,
    });

    console.info('[page-transition-test-2] Barba.js initialized with persistent header/hero and card-move transition.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBarba);
  } else {
    initBarba();
  }
})();
