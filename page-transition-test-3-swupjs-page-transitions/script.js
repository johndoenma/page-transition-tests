// Swup.js MPA page transitions (no build tools, local dependency)
// Header and hero persist outside the Swup container; only page content swaps.
// The active card animates into its destination position during navigation.
(() => {
  const DURATION = 450;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  let pendingCard = null;

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

  function selectorFromCard(cardEl) {
    if (!cardEl) return null;
    if (cardEl.classList.contains('card1')) return '.card1';
    if (cardEl.classList.contains('card2')) return '.card2';
    if (cardEl.classList.contains('card3')) return '.card3';
    return null;
  }

  function selectorFromPath(path) {
    const p = String(path || '');
    if (p.indexOf('subpage1') !== -1) return '.card1';
    if (p.indexOf('subpage2') !== -1) return '.card2';
    if (p.indexOf('subpage3') !== -1) return '.card3';
    return null;
  }

  function selectorFromContainer(container) {
    if (!container) return null;
    if (container.classList.contains('page-subpage1')) return '.card1';
    if (container.classList.contains('page-subpage2')) return '.card2';
    if (container.classList.contains('page-subpage3')) return '.card3';
    return null;
  }

  function syncPersistentUI(container) {
    const c = container || document.querySelector('#swup');
    if (!c) return;

    const pageClass = c.dataset.pageClass || '';
    const subtitle = c.dataset.heroSubtitle || '';
    const hero = document.getElementById('persistent-hero');
    const subtitleEl = document.getElementById('hero-subtitle');

    if (pageClass) {
      document.body.className = pageClass;
    }

    if (subtitleEl) {
      subtitleEl.textContent = subtitle;
    }

    if (hero) {
      hero.classList.remove('hero-subpage1', 'hero-subpage2', 'hero-subpage3');
      if (pageClass.indexOf('page-subpage1') !== -1) hero.classList.add('hero-subpage1');
      else if (pageClass.indexOf('page-subpage2') !== -1) hero.classList.add('hero-subpage2');
      else if (pageClass.indexOf('page-subpage3') !== -1) hero.classList.add('hero-subpage3');
    }
  }

  function rememberCard(el, toUrl) {
    if (!el || typeof el.closest !== 'function') return;
    const card = el.closest('.card');
    const selector = selectorFromCard(card);
    if (!card || !selector) return;

    const rect = card.getBoundingClientRect();
    pendingCard = {
      selector,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      toUrl: String(toUrl || ''),
      clone: card.cloneNode(true),
    };
  }

  async function animateCardToNewContainer(visit) {
    const container = document.querySelector('#swup');
    const info = pendingCard;
    pendingCard = null;

    if (!container || !info) return;

    const fromSelector = selectorFromContainer(container);
    const targetSelector =
      info.selector || fromSelector || selectorFromPath(visit && visit.to && visit.to.url);
    if (!targetSelector) return;

    const target = container.querySelector(targetSelector);
    if (!target) return;

    await nextFrames(2);
    const toRect = target.getBoundingClientRect();
    const fromRect = info.rect;
    if (!fromRect.width || !fromRect.height || !toRect.width || !toRect.height) return;

    const duration = reducedMotion() ? 1 : DURATION;
    const clone = info.clone;
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

    // Keep the real destination card visible so it never "disappears" if the
    // animated clone is interrupted; the clone renders on top while moving.
    document.body.appendChild(clone);

    try {
      await nextFrames(2);
      clone.style.transform =
        'translate(' + (toRect.left - fromRect.left) + 'px, ' + (toRect.top - fromRect.top) + 'px)';

      await wait(duration + 30);
    } finally {
      if (clone.parentNode) clone.parentNode.removeChild(clone);
    }
  }

  function initSwup() {
    const SwupCtor = window.Swup;
    if (typeof SwupCtor !== 'function') {
      console.warn('[page-transition-test-3] Swup not found. Falling back to normal navigation.');
      return;
    }

    const swup = new SwupCtor({
      containers: ['#swup'],
      animateHistoryBrowsing: true,
      animationSelector: false,
      cache: true,
    });

    swup.hooks.on('link:click', (visit, args) => {
      const el = args && args.el;
      const href = el && (el.getAttribute('href') || el.href);
      rememberCard(el, href || (visit && visit.to && visit.to.url));
    });

    // Keep persistent header/hero in sync with the incoming page content.
    swup.hooks.replace('content:replace', async (visit, args, defaultHandler) => {
      await defaultHandler(visit, args);

      const container = document.querySelector('#swup');
      if (container) {
        // Swup replaces the #swup element during content:replace. Ensure the new
        // content stays visible (header/hero persist and the card animates).
        container.style.transition = 'none';
        container.style.setProperty('opacity', '1', 'important');
      }

      try {
        window.scrollTo(0, 0);
        syncPersistentUI(document.querySelector('#swup'));
        await animateCardToNewContainer(visit);
      } finally {
        const current = document.querySelector('#swup');
        if (current) {
          current.style.transition = 'none';
          current.style.setProperty('opacity', '1', 'important');
        }
      }
    });

    swup.hooks.on('visit:end', () => {
      const current = document.querySelector('#swup');
      if (current) {
        current.style.setProperty('opacity', '1', 'important');
      }
    });

    // Ensure initial state is consistent (useful if markup differs after edits).
    syncPersistentUI(document.querySelector('#swup'));
    const initial = document.querySelector('#swup');
    if (initial) initial.style.setProperty('opacity', '1', 'important');

    console.info('[page-transition-test-3] Swup initialized with persistent header/hero and card-move transition.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSwup);
  } else {
    initSwup();
  }
})();
