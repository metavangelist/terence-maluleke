(function () {
  const loader = document.getElementById("siteLoader");
  const bar = document.getElementById("siteLoaderBar");
  const MIN_MS = 1400;
  const MAX_MS = 180000;
  const PRELOAD_CONCURRENCY = 8;

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

  function loadVideo(src) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const done = () => {
        video.removeAttribute("src");
        video.load();
        resolve();
      };
      video.muted = true;
      video.preload = "auto";
      video.playsInline = true;
      video.addEventListener("loadeddata", done, { once: true });
      video.addEventListener("error", done, { once: true });
      window.setTimeout(done, 9000);
      video.src = src;
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

  function waitForGallery() {
    return waitForReady("gallery:ready", "galleryCatalogReady", 12000);
  }

  function waitForPrints() {
    return waitForReady("prints:ready", "printsCatalogReady", 12000);
  }

  function waitForMaquettes() {
    return waitForReady("maquettes:ready", "maquettesCatalogReady", 8000);
  }

  function waitForStudy() {
    return waitForReady("study:ready", "studyCatalogReady", 8000);
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
    other.push(...(window.studyPreload?.getAllUrls?.() || []));

    const dedupe = (list) => [...new Set(list.filter(Boolean))];

    return {
      previews: dedupe(previews),
      views: dedupe(views),
      other: dedupe(other),
    };
  }

  async function preloadImageBatch(urls, onStep) {
    if (window.ImagePreloadCache) {
      await window.ImagePreloadCache.preloadAll(urls, {
        concurrency: PRELOAD_CONCURRENCY,
        onProgress: (_done, _total) => onStep?.(),
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
        onStep?.();
      }
    }

    const workers = Math.min(PRELOAD_CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workers }, worker));
  }

  async function preloadSiteArtwork(onProgress) {
    await Promise.all([waitForGallery(), waitForPrints(), waitForMaquettes(), waitForStudy()]);

    const { previews, views, other } = collectArtworkUrls();
    const ordered = [...previews, ...views, ...other];
    const total = ordered.length;

    if (!total) return;

    let finished = 0;
    const bump = () => {
      finished += 1;
      onProgress(finished, total);
    };

    await preloadImageBatch(ordered, bump);
  }

  function trackTask(promise, onStep) {
    return promise.finally(onStep);
  }

  function warmExhibitionsVideoElement() {
    const video = document.getElementById("exhibVideo");
    if (!video) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      if (video.readyState >= 2) {
        done();
        return;
      }
      video.muted = true;
      video.preload = "auto";
      video.addEventListener("loadeddata", done, { once: true });
      video.addEventListener("error", done, { once: true });
      window.setTimeout(done, 12000);
      video.load();
    });
  }

  function waitForInfoStarVideos() {
    if (window.infoStarVideosReady) {
      return window.infoStarVideosReady;
    }

    return new Promise((resolve) => {
      const finish = () => resolve();
      document.addEventListener("info-stars:ready", finish, { once: true });
      window.setTimeout(finish, 20000);
    });
  }

  async function run() {
    const start = Date.now();
    setProgress(4);

    const bootstrapTasks = [
      document.fonts?.ready ?? Promise.resolve(),
      loadImage("assets/images/DSC01668_2.jpg"),
      loadImage("videos/exhibitions-bg-poster.jpg"),
      loadVideo("videos/exhibitions-bg-web.mp4"),
      loadVideo("videos/info/muse-5.mp4"),
      warmExhibitionsVideoElement(),
    ];

    let bootstrapFinished = 0;
    const bumpBootstrap = () => {
      bootstrapFinished += 1;
      setProgress(4 + (bootstrapFinished / bootstrapTasks.length) * 16);
    };

    await Promise.all(bootstrapTasks.map((task) => trackTask(task, bumpBootstrap)));

    setProgress(22);

    await Promise.all([
      trackTask(waitForInfoStarVideos(), () => setProgress(28)),
      trackTask(
        preloadSiteArtwork((done, total) => {
          setProgress(28 + (done / total) * 68);
        }),
        () => {}
      ),
    ]);

    setProgress(100);

    const elapsed = Date.now() - start;
    if (elapsed < MIN_MS) {
      await new Promise((resolve) => window.setTimeout(resolve, MIN_MS - elapsed));
    }

    await finishLoading();
  }

  let loadingFinished = false;

  async function finishLoading() {
    if (loadingFinished) return;
    await waitForInfoStarVideos();
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
