/**
 * Lava lamp blob — fixed at page center.
 * Reveals the painting and inverted text over the name.
 */
(function initBlob() {
  const blob = document.getElementById("blob");
  const blobPainting = document.getElementById("blobPainting");
  const blobContent = document.getElementById("blobContent");

  if (!blob || !blobPainting || !blobContent || typeof gsap === "undefined") {
    console.warn("Blob init failed");
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const blobPulse = blob.querySelector(".blob__pulse");
  const blobContentPos = blobContent.querySelector(".blob__content-pos");
  const homeSection = document.getElementById("section-home");
  const anonSection = homeSection?.querySelector(".anon");

  let started = false;
  let lastPoint = null;
  let layoutCache = null;
  let resizeObserver = null;
  let pulseTimeline = null;
  let lastSyncX = 0;
  let lastSyncY = 0;

  const setPaintX = gsap.quickSetter(blobPainting, "x", "px");
  const setPaintY = gsap.quickSetter(blobPainting, "y", "px");

  gsap.set(blobPainting, { x: 0, y: 0, force3D: true });
  gsap.set(blob, { x: 0, y: 0, force3D: true });
  gsap.set(blobContent, { scale: 1, transformOrigin: "50% 50%", force3D: true });
  if (blobContentPos) {
    gsap.set(blobContentPos, { x: 0, y: 0, scaleX: 1, scaleY: 1, force3D: true });
  }

  function layoutPx(value) {
    return Math.round(value * 100) / 100;
  }

  function getBlobSize() {
    const cssW = parseFloat(getComputedStyle(blob).width);
    return Number.isFinite(cssW) && cssW > 0 ? cssW : 160;
  }

  function getPulseScale() {
    if (!blobPulse) return 1;
    const scale = gsap.getProperty(blobPulse, "scale");
    return typeof scale === "number" && scale > 0 ? scale : 1;
  }

  function isHomeVisible() {
    if (!homeSection) return false;

    const scroller = document.getElementById("siteScroller");
    if (!scroller) return true;

    const root = scroller.getBoundingClientRect();
    const rect = homeSection.getBoundingClientRect();

    return rect.top < root.bottom && rect.bottom > root.top;
  }

  function applyContentSizing() {
    if (!blobContentPos || !layoutCache) return;
    blobContentPos.style.width = `${layoutPx(layoutCache.anonWidth)}px`;
    blobContentPos.style.height = `${layoutPx(layoutCache.anonHeight)}px`;
  }

  function measureLayout() {
    if (!homeSection || !anonSection || !isHomeVisible()) {
      layoutCache = null;
      return null;
    }

    const homeRect = homeSection.getBoundingClientRect();
    const anonRect = anonSection.getBoundingClientRect();
    const size = getBlobSize();
    const margin = Math.max(12, size * 0.12);
    const areaW = Math.max(size, homeSection.clientWidth);
    const areaH = Math.max(size, homeSection.clientHeight);
    const minX = margin;
    const minY = margin;
    const maxX = Math.max(minX, areaW - size - margin);
    const maxY = Math.max(minY, areaH - size - margin);

    layoutCache = {
      anonLeft: anonRect.left - homeRect.left,
      anonTop: anonRect.top - homeRect.top,
      anonWidth: anonRect.width,
      anonHeight: anonRect.height,
      size,
      minX,
      minY,
      maxX,
      maxY,
    };

    applyContentSizing();
    return layoutCache;
  }

  function getAreaMetrics() {
    const layout = layoutCache || measureLayout();
    if (!layout) {
      const size = getBlobSize();
      const margin = Math.max(12, size * 0.12);
      const areaW = homeSection?.clientWidth || window.innerWidth;
      const areaH = homeSection?.clientHeight || window.innerHeight;
      return {
        size,
        minX: margin,
        minY: margin,
        maxX: Math.max(margin, areaW - size - margin),
        maxY: Math.max(margin, areaH - size - margin),
      };
    }

    return {
      size: layout.size,
      minX: layout.minX,
      minY: layout.minY,
      maxX: layout.maxX,
      maxY: layout.maxY,
    };
  }

  function syncGhostPosition(x, y) {
    const layout = layoutCache;
    if (!layout || !blobContentPos) return;

    lastSyncX = x;
    lastSyncY = y;

    const pulseScale = getPulseScale();
    const half = layout.size / 2;

    let tx = layout.anonLeft - x;
    let ty = layout.anonTop - y;

    gsap.set(blobContent, {
      scale: pulseScale,
      transformOrigin: "50% 50%",
      force3D: true,
    });

    const posX = tx / pulseScale;
    const posY = ty / pulseScale;

    gsap.set(blobContentPos, {
      x: layoutPx(posX),
      y: layoutPx(posY),
      scaleX: 1 / pulseScale,
      scaleY: 1 / pulseScale,
      transformOrigin: `${layoutPx(half - posX)}px ${layoutPx(half - posY)}px`,
      force3D: true,
    });

    const realTagline = anonSection?.querySelector(".anon__tagline");
    const ghostTagline = blobContent.querySelector(".anon__tagline");
    if (!realTagline || !ghostTagline) return;

    const realRect = realTagline.getBoundingClientRect();
    const ghostRect = ghostTagline.getBoundingClientRect();
    tx = posX + (realRect.left - ghostRect.left);
    ty = posY + (realRect.top - ghostRect.top);

    gsap.set(blobContentPos, {
      x: layoutPx(tx),
      y: layoutPx(ty),
      transformOrigin: `${layoutPx(half - tx)}px ${layoutPx(half - ty)}px`,
      force3D: true,
    });
  }

  function applySync(x, y) {
    if (!layoutCache) return;

    setPaintX(-x);
    setPaintY(-y);
    syncGhostPosition(x, y);
  }

  function syncInnerContent(x, y) {
    if (!layoutCache) measureLayout();
    applySync(x, y);
  }

  function centerPoint() {
    const { minX, minY, maxX, maxY } = getAreaMetrics();
    return {
      x: (minX + maxX) * 0.5,
      y: (minY + maxY) * 0.5,
    };
  }

  function repositionFromCurrent() {
    if (!isHomeVisible()) return;

    measureLayout();

    const next = centerPoint();
    gsap.set(blob, { x: next.x, y: next.y, force3D: true });
    syncInnerContent(next.x, next.y);
    lastPoint = next;
  }

  function stopDrift() {
    gsap.killTweensOf(blob);
  }

  function startPulse() {
    /* size stays fixed — no pulse scaling */
    if (blobPulse) gsap.set(blobPulse, { scale: 1, transformOrigin: "50% 50%", force3D: true });
    gsap.set(blobContent, { scale: 1 });
    if (blobContentPos) gsap.set(blobContentPos, { scaleX: 1, scaleY: 1 });
  }

  function stopPulse() {
    if (!pulseTimeline) return;
    pulseTimeline.kill();
    pulseTimeline = null;
    if (blobPulse) gsap.set(blobPulse, { scale: 1 });
    gsap.set(blobContent, { scale: 1 });
    if (blobContentPos) gsap.set(blobContentPos, { scaleX: 1, scaleY: 1 });
    syncGhostPosition(lastSyncX, lastSyncY);
  }

  function revealBlob() {
    blob.classList.remove("blob--pending");
    blob.classList.add("blob--ready");
  }

  function init() {
    if (!isHomeVisible()) return;

    measureLayout();

    if (started) {
      repositionFromCurrent();
      if (!reduceMotion && !pulseTimeline) startPulse();
      return;
    }

    started = true;

    const start = centerPoint();
    lastPoint = start;

    gsap.set(blob, { x: start.x, y: start.y, force3D: true });
    syncInnerContent(start.x, start.y);
    revealBlob();

    if (reduceMotion) return;
    startPulse();
  }

  function whenLayoutReady(cb) {
    const run = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch (_) {
        /* ignore */
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(cb);
      });
    };

    if (!document.body.classList.contains("is-loading")) {
      run();
      return;
    }

    document.addEventListener("site:ready", run, { once: true });

    document.addEventListener(
      "site:ready",
      () => {
        window.setTimeout(scheduleLayoutRefresh, 520);
      },
      { once: true }
    );

    window.setTimeout(() => {
      if (!started) run();
    }, 3000);
  }

  function scheduleLayoutRefresh() {
    window.requestAnimationFrame(() => {
      if (!started || !isHomeVisible()) return;
      measureLayout();
      repositionFromCurrent();
    });
  }

  function bindResizeObserver() {
    if (!homeSection || resizeObserver || typeof ResizeObserver === "undefined") return;

    resizeObserver = new ResizeObserver(scheduleLayoutRefresh);
    resizeObserver.observe(homeSection);
    if (anonSection) resizeObserver.observe(anonSection);
  }

  whenLayoutReady(init);
  bindResizeObserver();

  if (homeSection && "IntersectionObserver" in window) {
    const scroller = document.getElementById("siteScroller");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio > 0.2
        );

        if (!visible) {
          stopDrift();
          stopPulse();
          return;
        }

        scheduleLayoutRefresh();

        if (!started) {
          init();
          return;
        }

        if (!reduceMotion && !pulseTimeline) startPulse();
      },
      { root: scroller || null, threshold: [0, 0.2, 0.45] }
    );

    observer.observe(homeSection);
  }

  let resizeTimer;
  function onViewportChange() {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(scheduleLayoutRefresh, 160);
  }

  window.addEventListener("resize", onViewportChange, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onViewportChange, { passive: true });
  }

  window.addEventListener("pagehide", () => {
    stopDrift();
    stopPulse();
  });
})();
