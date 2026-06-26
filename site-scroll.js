(function () {
  const ROUTES = {
    home: {
      slug: "home",
      title: "Terence Ntsako Maluleke",
      topSection: "section-home",
    },
    info: {
      slug: "info",
      title: "Info",
      topSection: "section-info",
    },
    paintings: {
      slug: "paintings",
      title: "Paintings",
      topSection: "section-gallery",
    },
    prints: {
      slug: "prints",
      title: "Prints",
      topSection: "section-prints",
    },
    maquettes: {
      slug: "maquettes",
      title: "Assamblage",
      topSection: "section-maquettes",
    },
    study: {
      slug: "study",
      title: "Study",
      topSection: "section-study",
    },
    calendar: {
      slug: "calendar",
      title: "Calendar",
      topSection: "section-calendar",
    },
  };

  const HASH_ALIASES = {
    "": "home",
    home: "home",
    index: "home",
    info: "info",
    gallery: "paintings",
    paintings: "paintings",
    prints: "prints",
    maquettes: "maquettes",
    study: "study",
    spotify: "study",
    calendar: "calendar",
    shows: "calendar",
    exhibitions: "calendar",
  };

  const SECTION_ORDER = [
    "section-home",
    "section-info",
    "section-gallery",
    "section-prints",
    "section-maquettes",
    "section-study",
    "section-calendar",
  ];

  const SLUG_BY_SECTION = Object.fromEntries(
    Object.values(ROUTES).map((route) => [route.topSection, route.slug])
  );

  let activeSlug = "home";
  let scrollingProgrammatically = false;
  let sectionTransitionLock = false;
  let scrollEndTimer = 0;
  let pendingResetRoute = null;
  let scrollAnimationFrame = 0;

  const SECTION_SCROLL_DURATION_MS = 920;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
  }

  function cancelScrollAnimation() {
    if (scrollAnimationFrame) {
      cancelAnimationFrame(scrollAnimationFrame);
      scrollAnimationFrame = 0;
    }
  }

  function animateScrollerTo(top, durationMs, onDone) {
    const scroller = getScroller();
    if (!scroller) {
      onDone?.();
      return;
    }

    cancelScrollAnimation();

    const startTop = scroller.scrollTop;
    const delta = top - startTop;

    if (Math.abs(delta) < 1 || durationMs <= 0 || prefersReducedMotion()) {
      scroller.scrollTop = top;
      onDone?.();
      return;
    }

    scroller.classList.add("is-scroll-animating");
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - startTime) / durationMs);
      scroller.scrollTop = startTop + delta * easeOutCubic(progress);

      if (progress < 1) {
        scrollAnimationFrame = requestAnimationFrame(frame);
        return;
      }

      scroller.scrollTop = top;
      scrollAnimationFrame = 0;
      scroller.classList.remove("is-scroll-animating");
      onDone?.();
    }

    scrollAnimationFrame = requestAnimationFrame(frame);
  }

  function normaliseSlug(slug) {
    const clean = String(slug || "")
      .replace(/^#/, "")
      .replace(/^section-/, "")
      .toLowerCase();

    return HASH_ALIASES[clean] || clean || "home";
  }

  function slugFromHash() {
    return normaliseSlug(window.location.hash);
  }

  function getRoute(slug) {
    return ROUTES[normaliseSlug(slug)] || ROUTES.home;
  }

  function getScroller() {
    return document.getElementById("siteScroller");
  }

  function getSectionElement(slug) {
    const route = getRoute(slug);
    return document.getElementById(route.topSection);
  }

  function revealAllSections() {
    SECTION_ORDER.forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.hidden = false;
    });
  }

  function sectionScrollTop(section) {
    const scroller = getScroller();
    if (!scroller || !section) return 0;

    const scrollerRect = scroller.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();

    return scroller.scrollTop + (sectionRect.top - scrollerRect.top);
  }

  function updateHash(slug, replace = false) {
    const nextHash = `#${slug}`;

    if (window.location.hash === nextHash) return;

    if (replace) {
      history.replaceState(null, "", nextHash);
    } else {
      history.pushState(null, "", nextHash);
    }
  }

  function updateNav(route) {
    const nav = document.getElementById("siteNav");
    const pastHome = route.slug !== "home";

    if (nav) {
      nav.classList.toggle(
        "site-nav--inverse",
        route.slug === "calendar" ||
          route.slug === "info" ||
          route.slug === "study" ||
          route.slug === "paintings" ||
          route.slug === "prints" ||
          route.slug === "maquettes"
      );
      nav.classList.toggle("site-nav--with-home", pastHome);

      const homeEl = nav.querySelector(".site-nav__home");
      const titleEl = nav.querySelector(".site-nav__section-title");

      if (titleEl) {
        const showTitle = pastHome;
        titleEl.textContent = showTitle ? route.title || "" : "";
        titleEl.hidden = !showTitle;
        titleEl.setAttribute("aria-hidden", showTitle ? "false" : "true");
      }

      if (homeEl && !homeEl.hasAttribute("data-gallery-exit")) {
        homeEl.hidden = !pastHome;
      }
    }

    document.body.classList.toggle("is-past-home", pastHome);
    document.body.dataset.currentSection = route.slug;
    document.documentElement.dataset.currentSection = route.slug;

    document.title = route.title || "Terence Ntsako Maluleke";
  }

  function isTransitioning() {
    return sectionTransitionLock || scrollingProgrammatically;
  }

  let lastSettledSlug = null;

  function runPostSectionSettle(route) {
    if (route.slug === lastSettledSlug) return;
    lastSettledSlug = route.slug;

    if (route.slug === "maquettes" && typeof window.refreshMaquettesLayout === "function") {
      requestAnimationFrame(() => window.refreshMaquettesLayout());
    }

    if (route.slug === "paintings" && typeof window.galleryRefreshScrollFx === "function") {
      requestAnimationFrame(() => {
        window.galleryRefreshScrollFx();
        window.ensureGalleryIndexScrollReady?.();
      });
    }

    if (route.slug === "prints" && typeof window.printsRefreshScrollFx === "function") {
      requestAnimationFrame(() => {
        window.printsRefreshScrollFx();
        window.ensurePrintsIndexScrollReady?.();
      });
    }
  }

  function finishSectionTransition() {
    if (!sectionTransitionLock && !scrollingProgrammatically) return;

    clearTimeout(scrollEndTimer);
    cancelScrollAnimation();
    getScroller()?.classList.remove("is-scroll-animating");
    scrollingProgrammatically = false;
    sectionTransitionLock = false;

    if (pendingResetRoute) {
      resetInternalScroll(pendingResetRoute);
      pendingResetRoute = null;
    }

    const route = getRoute(activeSlug);
    runPostSectionSettle(route);
  }

  function resetInternalScroll(route) {
    if (route.slug === "paintings") {
      window.galleryShowGrid?.({ resetScroll: true });
    }

    if (route.slug === "prints") {
      window.printsShowGrid?.({ resetScroll: true });
    }

    if (route.slug === "maquettes") {
      window.maquettesShowGrid?.({ resetScroll: true });
    }

    if (route.slug === "info") {
      const info = document.getElementById("section-info");
      if (info) info.scrollTop = 0;
    }
  }

  function onSectionActivated(route, previousSlug) {
    if (previousSlug === route.slug) return;

    if (route.slug !== "paintings" && route.slug !== "prints" && route.slug !== "maquettes") {
      window.resetEnquiryContact?.();
    }

    if (route.slug === "calendar" && typeof window.playShowsVideo === "function") {
      window.playShowsVideo();
    } else if (typeof window.pauseShowsVideo === "function") {
      window.pauseShowsVideo();
    }

    if (route.slug === "study" && typeof window.playStudyVideo === "function") {
      window.playStudyVideo();
    } else if (typeof window.pauseStudyVideo === "function") {
      window.pauseStudyVideo();
    }

    if (route.slug === "paintings") {
      window.markGallerySectionEntered?.();
    }

    if (route.slug === "prints") {
      window.markPrintsSectionEntered?.();
      window.printsRefreshScrollFx?.();
    }

    if (route.slug === "maquettes") {
      window.markMaquettesSectionEntered?.();
      window.maquettesRefreshScrollFx?.();
    }
  }

  function setActiveSection(slug, options = {}) {
    const route = getRoute(slug);
    const previousSlug = activeSlug;

    activeSlug = route.slug;
    updateNav(route);
    onSectionActivated(route, previousSlug);

    if (options.updateHash) {
      updateHash(route.slug, Boolean(options.replaceHash));
    }

    if (options.resetScroll && !isTransitioning()) {
      resetInternalScroll(route);
    }

  }

  function scrollToSection(slug, options = {}) {
    const route = getRoute(slug);
    const section = document.getElementById(route.topSection);
    const scroller = getScroller();

    if (!section || !scroller) return;

    const instant = Boolean(options.instant);

    if (sectionTransitionLock && route.slug === activeSlug && !instant) return;

    const shouldReset = Boolean(options.resetScroll);
    const targetTop = sectionScrollTop(section);

    sectionTransitionLock = true;
    scrollingProgrammatically = true;
    pendingResetRoute = shouldReset ? route : null;
    clearTimeout(scrollEndTimer);
    cancelScrollAnimation();

    setActiveSection(route.slug, {
      updateHash: options.pushHash !== false,
      replaceHash: Boolean(options.replaceHash),
      resetScroll: false,
    });

    if (instant) {
      scroller.scrollTop = targetTop;
      scrollEndTimer = window.setTimeout(finishSectionTransition, 80);
      return;
    }

    animateScrollerTo(targetTop, SECTION_SCROLL_DURATION_MS, finishSectionTransition);
    scrollEndTimer = window.setTimeout(
      finishSectionTransition,
      SECTION_SCROLL_DURATION_MS + 120
    );
  }

  function scrollBySection(delta, options = {}) {
    const currentIdx = SECTION_ORDER.findIndex((id) => SLUG_BY_SECTION[id] === activeSlug);
    const targetIdx = currentIdx + delta;

    if (targetIdx < 0 || targetIdx >= SECTION_ORDER.length) return;

    const slug = SLUG_BY_SECTION[SECTION_ORDER[targetIdx]];
    scrollToSection(slug, options);
  }

  function scrollToNextSection(options = {}) {
    scrollBySection(1, options);
  }

  function scrollToPreviousSection(options = {}) {
    scrollBySection(-1, options);
  }

  function bindSectionLinks() {
    document.addEventListener("click", (event) => {
      const galleryExit = event.target.closest("[data-gallery-exit]");

      if (galleryExit) {
        event.stopImmediatePropagation();
        event.preventDefault();
        if (typeof window.maquettesViewer?.isOpen === "function" && window.maquettesViewer.isOpen()) {
          window.maquettesViewer.close();
        } else if (
          document.getElementById("galleryLayout")?.dataset.mode === "detail" &&
          window.galleryIsImmersive?.()
        ) {
          window.gallerySetImmersive?.(false);
        } else if (document.getElementById("galleryLayout")?.dataset.mode === "detail") {
          window.galleryShowGrid?.();
        } else if (
          document.getElementById("printsLayout")?.dataset.mode === "detail" &&
          window.printsIsImmersive?.()
        ) {
          window.printsSetImmersive?.(false);
        } else if (document.getElementById("printsLayout")?.dataset.mode === "detail") {
          window.printsShowGrid?.();
        } else if (
          document.getElementById("maquettesLayout")?.dataset.mode === "detail" &&
          window.maquettesIsImmersive?.()
        ) {
          window.maquettesSetImmersive?.(false);
        } else if (document.getElementById("maquettesLayout")?.dataset.mode === "detail") {
          window.maquettesShowGrid?.();
        }
        return;
      }

      const link = event.target.closest("[data-scroll-section]");
      if (!link) return;

      const slug = normaliseSlug(link.getAttribute("data-scroll-section"));

      if (!ROUTES[slug]) return;

      event.preventDefault();

      scrollToSection(slug, {
        pushHash: true,
        replaceHash: false,
        resetScroll: true,
      });
    });
  }

  function bindHashNavigation() {
    window.addEventListener("popstate", () => {
      scrollToSection(slugFromHash(), {
        pushHash: false,
        replaceHash: true,
        resetScroll: false,
        instant: false,
      });
    });

    window.addEventListener("hashchange", () => {
      const nextSlug = slugFromHash();

      if (nextSlug === activeSlug) return;

      scrollToSection(nextSlug, {
        pushHash: false,
        replaceHash: true,
        resetScroll: false,
        instant: false,
      });
    });
  }

  function watchActiveSection() {
    const scroller = getScroller();
    if (!scroller) return;

    let scrollSyncTimer = 0;

    function syncActiveSectionFromScroll() {
      if (scrollingProgrammatically || sectionTransitionLock) return;

      const viewportMid = scroller.scrollTop + scroller.clientHeight * 0.5;
      let bestSection = null;
      let bestDistance = Infinity;

      SECTION_ORDER.forEach((id) => {
        const section = document.getElementById(id);
        if (!section) return;

        const top = sectionScrollTop(section);
        const mid = top + section.offsetHeight * 0.5;
        const distance = Math.abs(viewportMid - mid);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestSection = section;
        }
      });

      if (!bestSection) return;

      const slug = SLUG_BY_SECTION[bestSection.id];
      if (!slug || slug === activeSlug) return;

      setActiveSection(slug, {
        updateHash: true,
        replaceHash: true,
        resetScroll: false,
      });
    }

    scroller.addEventListener(
      "scroll",
      () => {
        if (scrollingProgrammatically || sectionTransitionLock) return;
        window.clearTimeout(scrollSyncTimer);
        scrollSyncTimer = window.setTimeout(syncActiveSectionFromScroll, 140);
      },
      { passive: true }
    );
  }

  function init() {
    revealAllSections();
    bindSectionLinks();
    bindHashNavigation();
    watchActiveSection();

    const initialSlug = slugFromHash();

    requestAnimationFrame(() => {
      scrollToSection(initialSlug, {
        pushHash: true,
        replaceHash: true,
        resetScroll: false,
        instant: true,
      });
    });
  }

  function refresh() {
    revealAllSections();
    scrollToSection(activeSlug, {
      pushHash: false,
      replaceHash: false,
      resetScroll: false,
      instant: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.siteScroll = {
    scrollToSection,
    scrollToNextSection,
    scrollToPreviousSection,
    scrollBySection,
    scrollToFrame: scrollToSection,
    isTransitioning,
    getSnapFrames: function () {
      return SECTION_ORDER.map((id) => document.getElementById(id)).filter(Boolean);
    },
    refresh,
    SECTIONS: [
      { id: "section-home", slug: "home", title: "Terence Ntsako Maluleke" },
      { id: "section-info", slug: "info", title: "Info" },
      { id: "section-gallery", slug: "paintings", title: "Paintings" },
      { id: "section-prints", slug: "prints", title: "Prints" },
      { id: "section-maquettes", slug: "maquettes", title: "Assamblage" },
      { id: "section-study", slug: "study", title: "Study" },
      { id: "section-calendar", slug: "calendar", title: "Calendar" },
    ],
    onInfoGalleryScroll: function () {},
  };
})();
