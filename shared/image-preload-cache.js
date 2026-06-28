(function () {
  const cache = new Map();

  async function load(url) {
    if (!url) return null;
    if (cache.has(url)) return cache.get(url);

    const promise = (async () => {
      const img = new Image();
      img.decoding = "async";

      await new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        img.src = url;
        if (img.complete) done();
      });

      if (img.naturalWidth && typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {}
      }

      return img;
    })();

    cache.set(url, promise);
    return promise;
  }

  async function preloadAll(urls, { concurrency = 8, onProgress } = {}) {
    const list = [...new Set(urls.filter(Boolean))];
    if (!list.length) return;

    let index = 0;
    let finished = 0;

    async function worker() {
      while (index < list.length) {
        const current = list[index];
        index += 1;
        await load(current);
        finished += 1;
        onProgress?.(finished, list.length);
      }
    }

    const workers = Math.min(concurrency, list.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
  }

  window.ImagePreloadCache = { load, preloadAll, has: (url) => cache.has(url) };
})();
