(function () {
  const loader = document.getElementById("siteLoader");
  const bar = document.getElementById("siteLoaderBar");
  const MIN_MS = 320;
  const MAX_MS = 12000;
  const MEDIA_WAIT_CAP_MS = 5500;
  const PRELOAD_CONCURRENCY = 10;

  const track = loader?.querySelector('[role="progressbar"]');

  function setProgress(value) {
    const pct = Math.min(100, Math.max(0, value));
    if (bar) bar.style.width = `${pct}%`;
    if (track) track.setAttribute("aria-valuenow", String(Math.round(pct)));
  }

  function loadImage(src) {
    if (window.ImagePreloadCache) {
      return window.ImagePreloadCache.load(src).then(() => {});
    }
    return new Promise((resolve) => {
      const img = new Image();
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      img.src = src;
    });
  }

  function waitForReady(eventName, readyFlag, timeoutMs) {
    return new Promise((resolve) => {
      if (window[readyFlag]) {
        resolve();
        return;
      }
      document.addEventListener(eventName, resolve, { once: true });
      window.setTimeout(resolve, timeoutMs);
    });
  }

  function waitForGalleryCatalog() {
    return waitForReady("gallery:ready", "galleryCatalogReady", 15000);
  }

  function waitForPrintsCatalog() {
    return waitForReady("prints:ready", "printsCatalogReady", 15000);
  }

  function waitForMaquettesCatalog() {
    return waitForReady("maquettes:ready", "maquettesCatalogReady", 12000);
  }

  function starsAreVisible() {
    const home = document.getElementById("homeStars");
    const info = document.getElementById("infoStars");
    return Boolean(
      home?.classList.contains("is-ready") && info?.classList.contains("is-ready")
    );
  }

  async function waitForSiteMedia() {
    const mediaPromise = (async () => {
      if (typeof window.ensureSiteMediaReady === "function") {
        await window.ensureSiteMediaReady();
        return;
      }

      if (window.infoStarVideosReady) {
        await window.infoStarVideosReady;
        return;
      }

      await new Promise((resolve) => {
        if (starsAreVisible()) {
          resolve();
          return;
        }
        document.addEventListener("info-stars:ready", resolve, { once: true });
        window.setTimeout(resolve, MEDIA_WAIT_CAP_MS);
      });
    })();

    await Promise.race([
      mediaPromise,
      new Promise((resolve) => window.setTimeout(resolve, MEDIA_WAIT_CAP_MS)),
    ]);
  }

  function collectArtworkUrls() {
    const previews = [];
    const views = [];
    const other = [];

    const galleryUrls = window.galleryPreload?.getAllUrls?.();
    if (galleryUrls) {
      previews.push(...(galleryUrls.previews || []));
      views.push(...(galleryUrls.views || []));
    }

    const printsUrls = window.printsPreload?.getAllUrls?.();
    if (printsUrls) {
      previews.push(...(printsUrls.previews || []));
      views.push(...(printsUrls.views || []));
    }

    other.push(...(window.maquettesPreload?.getAllUrls?.() || []));

    const dedupe = (list) => [...new Set(list.filter(Boolean))];

    return {
      previews: dedupe(previews),
      views: dedupe(views),
      other: dedupe(other),
    };
  }

  async function preloadImageBatch(urls) {
    if (window.ImagePreloadCache) {
      await window.ImagePreloadCache.preloadAll(urls, {
        concurrency: PRELOAD_CONCURRENCY,
      });
      return;
    }

    const queue = [...urls];
    if (!queue.length) return;

    let index = 0;

    async function worker() {
      while (index < queue.length) {
        const current = queue[index];
        index += 1;
        await loadImage(current);
      }
    }

    const workers = Math.min(PRELOAD_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workers }, worker));
  }

  async function preloadSiteArtworkInBackground() {
    await Promise.all([
      waitForGalleryCatalog(),
      waitForPrintsCatalog(),
      waitForMaquettesCatalog(),
    ]);

    const { previews, views, other } = collectArtworkUrls();
    // First page of each grid is enough for instant browse; views can trail.
    const firstWave = [...previews, ...other];
    const secondWave = views;

    if (firstWave.length) await preloadImageBatch(firstWave);
    if (secondWave.length) await preloadImageBatch(secondWave);
  }

  async function run() {
    const start = Date.now();
    setProgress(8);

    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    // Tick progress while media warms so the bar doesn't look stuck.
    let pulse = 8;
    const pulseTimer = window.setInterval(() => {
      pulse = Math.min(88, pulse + 2);
      setProgress(pulse);
    }, 180);

    try {
      await Promise.all([fontsReady, waitForSiteMedia()]);
    } finally {
      window.clearInterval(pulseTimer);
    }

    setProgress(94);

    // Artwork must not block the loader — warm it after first paint.
    preloadSiteArtworkInBackground().catch(() => {});

    const elapsed = Date.now() - start;
    if (elapsed < MIN_MS) {
      await new Promise((resolve) => window.setTimeout(resolve, MIN_MS - elapsed));
    }

    setProgress(100);
    await finishLoading();
  }

  let loadingFinished = false;

  async function finishLoading() {
    if (loadingFinished) return;

    // Do not re-block on the full media pipeline — waitForSiteMedia already
    // raced with a short cap. Just ensure star layers are visible.
    if (!starsAreVisible()) {
      document.getElementById("homeStars")?.classList.add("is-ready");
      document.getElementById("homeStarsBack")?.classList.add("is-ready");
      document.getElementById("infoStars")?.classList.add("is-ready");
      document.getElementById("infoStarsBack")?.classList.add("is-ready");
    }

    if (loadingFinished) return;
    loadingFinished = true;

    document.body.classList.remove("is-loading");
    loader?.setAttribute("aria-busy", "false");
    loader?.classList.add("is-done");
    document.dispatchEvent(new CustomEvent("site:ready"));

    window.setTimeout(() => {
      loader?.remove();
    }, 480);
  }

  window.setTimeout(async () => {
    if (!document.body.classList.contains("is-loading")) return;
    setProgress(100);
    await finishLoading();
  }, MAX_MS);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
