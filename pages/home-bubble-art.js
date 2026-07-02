(function () {
  const DEFAULT_SRC = "assets/images/DSC01668_2.jpg";
  const DEFAULT_OBJECT_POSITION = "52% 42%";

  let cached = null;

  function sizedSanityUrl(url, width = 2800) {
    if (!url || !String(url).includes("cdn.sanity.io/")) return url;
    const base = String(url).split("?")[0];
    return `${base}?w=${width}&auto=format&q=85`;
  }

  function hotspotToObjectPosition(hotspot) {
    if (!hotspot || typeof hotspot.x !== "number" || typeof hotspot.y !== "number") {
      return DEFAULT_OBJECT_POSITION;
    }

    const x = Math.round(hotspot.x * 1000) / 10;
    const y = Math.round(hotspot.y * 1000) / 10;
    return `${x}% ${y}%`;
  }

  function pickBubbleRecord(data) {
    if (data?.bubble?.imageUrl) return data.bubble;
    if (data?.legacy?.imageUrl) return data.legacy;
    return data?.bubble || data?.legacy || null;
  }

  function resolveFromRecord(record) {
    const src = record?.imageUrl ? sizedSanityUrl(record.imageUrl) : DEFAULT_SRC;
    const objectPosition =
      record?.objectPosition?.trim() ||
      hotspotToObjectPosition(record?.hotspot) ||
      DEFAULT_OBJECT_POSITION;

    return { src, objectPosition };
  }

  async function resolve() {
    if (cached) return cached;

    if (!window.sanityClient?.fetchHomeBubble) {
      cached = { src: DEFAULT_SRC, objectPosition: DEFAULT_OBJECT_POSITION };
      return cached;
    }

    try {
      const data = await window.sanityClient.fetchHomeBubble();
      cached = resolveFromRecord(pickBubbleRecord(data));
    } catch (_) {
      cached = { src: DEFAULT_SRC, objectPosition: DEFAULT_OBJECT_POSITION };
    }

    return cached;
  }

  function applyToDom(art) {
    const img = document.querySelector("#blobPainting img");
    if (!img) return;

    const resolved = art || cached;
    if (!resolved?.src) return;

    img.style.objectPosition = resolved.objectPosition || DEFAULT_OBJECT_POSITION;
    img.removeAttribute("width");
    img.removeAttribute("height");

    const absoluteSrc = new URL(resolved.src, window.location.href).href;
    if (img.src !== absoluteSrc) {
      img.src = resolved.src;
    }
  }

  window.homeBubbleArt = {
    DEFAULT_SRC,
    DEFAULT_OBJECT_POSITION,
    resolve,
    applyToDom,
    resolveFromRecord,
    pickBubbleRecord,
  };
})();
