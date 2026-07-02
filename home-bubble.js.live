/**
 * Lava lamp blob that drifts slowly across the page.
 * Reveals the painting and inverted text when it passes over content.
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
  const blobInner = blobContent.querySelector(".blob__content-inner");
  const homeSection = document.getElementById("section-home");
  const anonSection = homeSection?.querySelector(".anon");

  let driftActive = false;
  let started = false;
  let lastPoint = null;
  let layoutCache = null;
  let resizeObserver = null;
  let pulseTimeline = null;
  let lastSyncX = 0;
  let lastSyncY = 0;

  const setPaintX = gsap.quickSetter(blobPainting, "x", "px");
  const setPaintY = gsap.quickSetter(blobPainting, "y", "px");
  const setInnerX = blobContentPos ? gsap.quickSetter(blobContentPos, "x", "px") : null;
  const setInnerY = blobContentPos ? gsap.quickSetter(blobContentPos, "y", "px") : null;

  gsap.set(blobPainting, { x: 0, y: 0, force3D: true });
  if (blobContentPos) gsap.set(blobContentPos, { x: 0, y: 0, force3D: true });
  gsap.set(blob, { x: 0, y: 0, force3D: true });

  function rand(min, max) {
    if (max <= min) return min;
    return min + Math.random() * (max - min);
  }

  function layoutPx(value) {
    return Math.round(value * 100) / 100;
  }

  function getBlobSize() {
    const cssW = parseFloat(getComputedStyle(blob).width);
    return Number.isFinite(cssW) && cssW > 0 ? cssW : 160;
  }

  function isHomeVisible() {
    if (!homeSection) return false;

    const scroller = document.getElementById("siteScroller");
    if (!scroller) return true;

    const root = scroller.getBoundingClientRect();
    const rect = homeSection.getBoundingClientRect();

    return rect.top < root.bottom && rect.bottom > root.top;
  }

  function applyInnerSizing() {
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

    applyInnerSizing();
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

  function getPulseScale() {
    if (!blobPulse) return 1;
    const scale = gsap.getProperty(blobPulse, "scale");
    return typeof scale === "number" && scale > 0 ? scale : 1;
  }

  function applyCounterScale(tx, ty) {
    if (!blobInner || !layoutCache) return;
    const pulseScale = getPulseScale();
    const half = layoutCache.size / 2;
    gsap.set(blobInner, {
      scaleX: 1 / pulseScale,
      scaleY: 1 / pulseScale,
      transformOrigin: `${layoutPx(half - tx)}px ${layoutPx(half - ty)}px`,
      force3D: true,
    });
  }

  function applySync(x, y) {
    const layout = layoutCache;
    if (!layout) return;

    lastSyncX = x;
    lastSyncY = y;

    setPaintX(-x);
    setPaintY(-y);

    if (setInnerX && setInnerY) {
      const tx = layout.anonLeft - x;
      const ty = layout.anonTop - y;
      setInnerX(tx);
      setInnerY(ty);
      applyCounterScale(tx, ty);
    }
  }

  function syncInnerContent(x, y) {
    if (!layoutCache) measureLayout();
    applySync(x, y);
  }

  function pickWaypoint() {
    const { minX, minY, maxX, maxY } = getAreaMetrics();

    let best = null;
    let bestDist = -1;

    for (let i = 0; i < 60; i += 1) {
      const x = rand(minX, maxX);
      const y = rand(minY, maxY);

      if (lastPoint) {
        const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
        if (dist > bestDist) {
          bestDist = dist;
          best = { x, y };
        }
      } else {
        best = { x, y };
        break;
      }
    }

    return best || {
      x: (minX + maxX) * 0.5,
      y: (minY + maxY) * 0.38,
    };
  }

  function defaultStartPoint() {
    const { minX, minY, maxX, maxY } = getAreaMetrics();
    return {
      x: (minX + maxX) * 0.5,
      y: (minY + maxY) * 0.38,
    };
  }

  function clampToArea(x, y) {
    const { minX, minY, maxX, maxY } = getAreaMetrics();
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }

  function repositionFromCurrent() {
    if (!isHomeVisible()) return;

    measureLayout();

    const x = gsap.getProperty(blob, "x") || 0;
    const y = gsap.getProperty(blob, "y") || 0;
    const next = clampToArea(x, y);
    gsap.set(blob, { x: next.x, y: next.y, force3D: true });
    syncInnerContent(next.x, next.y);
    lastPoint = next;
  }

  async function driftTo(point) {
    return new Promise((resolve) => {
      gsap.to(blob, {
        x: point.x,
        y: point.y,
        duration: rand(8, 16),
        ease: "power1.inOut",
        force3D: true,
        onUpdate() {
          syncInnerContent(gsap.getProperty(blob, "x"), gsap.getProperty(blob, "y"));
        },
        onComplete: resolve,
      });
    });
  }

  async function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function driftLoop() {
    while (driftActive) {
      if (!isHomeVisible()) {
        await wait(250);
        continue;
      }

      const point = pickWaypoint();
      lastPoint = point;
      await driftTo(point);

      if (!driftActive) break;
      await wait(rand(3000, 8000));
    }
  }

  function startDrift() {
    if (reduceMotion || driftActive) return;
    driftActive = true;
    driftLoop();
  }

  function stopDrift() {
    driftActive = false;
    gsap.killTweensOf(blob);
  }

  function startPulse() {
    if (reduceMotion || !blobPulse || pulseTimeline) return;

    gsap.set(blobPulse, { scale: 1, transformOrigin: "50% 50%", force3D: true });

    pulseTimeline = gsap.timeline({
      repeat: -1,
      defaults: { ease: "power1.inOut" },
      onUpdate() {
        if (!layoutCache) return;
        const tx = layoutCache.anonLeft - lastSyncX;
        const ty = layoutCache.anonTop - lastSyncY;
        applyCounterScale(tx, ty);
      },
    });

    pulseTimeline
      .to(blobPulse, { scale: 1.1, duration: 3.6 })
      .to(blobPulse, { scale: 1.6, duration: 4.8 })
      .to(blobPulse, { scale: 1.55, duration: 3.6 })
      .to(blobPulse, { scale: 1.5, duration: 3.6 })
      .to(blobPulse, { scale: 1.15, duration: 3.6 })
      .to(blobPulse, { scale: 1, duration: 4.8 });
  }

  function stopPulse() {
    if (!pulseTimeline) return;
    pulseTimeline.kill();
    pulseTimeline = null;
    if (blobPulse) gsap.set(blobPulse, { scale: 1 });
    if (blobInner) gsap.set(blobInner, { scaleX: 1, scaleY: 1 });
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
      if (!reduceMotion && !driftActive) startDrift();
      if (!reduceMotion && !pulseTimeline) startPulse();
      return;
    }

    started = true;

    const start = defaultStartPoint();
    lastPoint = start;

    gsap.set(blob, { x: start.x, y: start.y, force3D: true });
    syncInnerContent(start.x, start.y);
    revealBlob();

    if (reduceMotion) return;
    startPulse();
    startDrift();
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

        if (!reduceMotion && !driftActive) startDrift();
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
