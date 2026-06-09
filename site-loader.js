(function () {
  const loader = document.getElementById("siteLoader");
  const bar = document.getElementById("siteLoaderBar");
  const MIN_MS = 1400;
  const MAX_MS = 14000;

  const track = loader?.querySelector('[role="progressbar"]');

  function setProgress(value) {
    const pct = Math.min(100, Math.max(0, value));
    if (bar) bar.style.width = `${pct}%`;
    if (track) track.setAttribute("aria-valuenow", String(Math.round(pct)));
  }

  function loadImage(src) {
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

  function waitForGallery() {
    return new Promise((resolve) => {
      if (window.galleryCatalogReady) {
        resolve();
        return;
      }
      document.addEventListener("gallery:ready", resolve, { once: true });
      window.setTimeout(resolve, 8000);
    });
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

    const tasks = [
      waitForInfoStarVideos(),
      document.fonts?.ready ?? Promise.resolve(),
      loadImage("assets/images/DSC01668_2.jpg"),
      loadImage("videos/exhibitions-bg-poster.jpg"),
      loadVideo("videos/exhibitions-bg-web.mp4"),
      loadVideo("videos/info/muse-5.mp4"),
      warmExhibitionsVideoElement(),
      waitForGallery(),
    ];

    let finished = 0;
    const bump = () => {
      finished += 1;
      setProgress(8 + (finished / tasks.length) * 88);
    };

    await Promise.all(tasks.map((task) => trackTask(task, bump)));

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
