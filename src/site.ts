// Entry point for the static marketing/FAQ/catalogue pages (about.html, faq.html,
// oefeningen.html). Built by Vite alongside the app (see vite.config.ts) so these pages
// get the app's real, hashed CSS instead of a hand-copied stylesheet — imports below
// pull in the same theme + component rules main.tsx does, plus the page-only rules in
// ./site.css.
import './index.css';
import './site.css';

// Sidebar scroll-spy: highlights the row whose section is currently "at the top" of the
// reading area. Replaces a prior IntersectionObserver version that could light up the
// wrong row — several short sections can intersect the same root-margin band at once,
// in DOM order rather than visual order.
function initSidebarSpy(): void {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.site-aside a[href^="#"]'));
    const items = links
        .map((link) => {
            const id = link.getAttribute('href')!.slice(1);
            const el = id ? document.getElementById(id) : null;
            return el ? { link, el } : null;
        })
        .filter((x): x is { link: HTMLAnchorElement; el: HTMLElement } => x !== null);
    if (!items.length) return;

    const barH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 58;

    function update() {
        // Primary rule: the LAST section whose top has already scrolled up to (or past)
        // the reading edge just under the sticky top bar — the section you're currently
        // reading. Fallback (nothing has reached the edge yet, e.g. right after page
        // load): the nearest upcoming section, as long as it's not more than ~40% of the
        // viewport below that edge.
        const edge = barH + 8;
        const limit = edge + window.innerHeight * 0.4;
        let current: { item: (typeof items)[number]; top: number } | null = null;
        let upcoming: { item: (typeof items)[number]; top: number } | null = null;
        for (const item of items) {
            // offsetParent is null under a display:none ancestor — skips cards hidden by
            // the catalogue filter so a stale entry never wins.
            if (item.el.offsetParent === null) continue;
            const top = item.el.getBoundingClientRect().top;
            if (top <= edge) {
                if (!current || top > current.top) current = { item, top };
            } else if (top <= limit) {
                if (!upcoming || top < upcoming.top) upcoming = { item, top };
            }
        }
        const best = current ?? upcoming ?? (items.length ? { item: items[0], top: 0 } : null);
        links.forEach((a) => a.removeAttribute('aria-current'));
        if (best) best.item.link.setAttribute('aria-current', 'true');
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', update);
    update();
}

// Exercise catalogue filter (oefeningen.html only): clicking a leaf in the sidebar shows
// only that card; "Toon alles" restores the full, crawlable list (the default/no-JS state).
function initCatalogueFilter(): void {
    const cardLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('#catalogue-nav a[data-card]'));
    const allCards = Array.from(document.querySelectorAll<HTMLElement>('.ex-card'));
    const toonAlles = document.getElementById('toon-alles');
    if (!cardLinks.length || !allCards.length || !toonAlles) return;

    // Domain/subdomain headings inside the generated cards block — hidden too while
    // filtered, otherwise an empty "Getallenkennis / Breuken / ..." skeleton is left
    // behind around the one visible card.
    const catalogueHeadings = Array.from(document.querySelectorAll<HTMLElement>('#catalogue-cards h2, #catalogue-cards h3'));

    function showOnly(id: string) {
        allCards.forEach((card) => { card.hidden = card.id !== id; });
        catalogueHeadings.forEach((h) => { h.hidden = true; });
        toonAlles!.hidden = false;
        cardLinks.forEach((a) => a.removeAttribute('aria-current'));
        const active = cardLinks.find((a) => a.getAttribute('data-card') === id);
        if (active) active.setAttribute('aria-current', 'true');
    }
    function showAll() {
        allCards.forEach((card) => { card.hidden = false; });
        catalogueHeadings.forEach((h) => { h.hidden = false; });
        toonAlles!.hidden = true;
        cardLinks.forEach((a) => a.removeAttribute('aria-current'));
    }

    cardLinks.forEach((a) => {
        a.addEventListener('click', () => {
            // Let the anchor scroll happen, then filter.
            const id = a.getAttribute('data-card')!;
            setTimeout(() => showOnly(id), 0);
        });
    });
    toonAlles.addEventListener('click', (e) => { e.preventDefault(); showAll(); });
}

initSidebarSpy();
initCatalogueFilter();
