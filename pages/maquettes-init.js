(function () {
  const STATIC_CATALOG = [
    {
      file: "Apples.png",
      title: "Eves Pro Max I",
      year: "2025",
      medium: "Assamblage",
      dimensions: "32 x 37cm",
      price: "ZAR 15000 USD 950",
      sold: false,
    },
    {
      file: "cfg-mobile.png",
      title: "Sugar Ray Leonard x Sugar Ray Robinson",
      year: "2025",
      medium: "Assamblage",
      dimensions: "7 × 7 cm",
      price: "ZAR 20000 USD 1250",
      sold: false,
    },
    {
      file: "fg.png",
      title: "A man who refused to fall",
      year: "2025",
      medium: "Assamblage",
      dimensions: "7 x 3.5 cm",
      price: "ZAR 20000 USD 1250",
      sold: true,
    },
    {
      file: "hjjjj copy.png",
      title: "Still fight of the century",
      year: "2025",
      medium: "Assamblage",
      dimensions: "7 x 7 cm",
      price: "ZAR 20000 USD 1250",
      sold: true,
    },
  ];

  let catalog = [];
  let lastIndexPageCount = 0;

  const ASSET_BASE = "assets/maquettes";
  const CACHE = "?v=20260630a";
  const ENQUIRY_EMAIL = "Contact@maluleke.art";
  const MAQ_MOBILE_FILES = {
    "Apples.png": "Apples-mobile.png",
    "fg.png": "fg-mobile.png",
    "hjjjj copy.png": "hjjjj copy-mobile.png",
  };
  /** Desktop / CMS legacy filenames that map to files actually on disk. */
  const MAQ_FILE_ALIASES = {
    "Apples.png": "Apples-mobile.png",
    "cfg.png": "cfg-mobile.png",
    "cfg.jpg": "cfg-mobile.png",
    "fg.png": "fg.jpg",
    "hjjjj copy.png": "hjjjj copy.jpg",
  };

  let currentIndex = 0;
  let viewMode = "grid";
  let navInitialized = false;
  let indexInitialized = false;
  let interactionsInitialized = false;
  let navHomeSection = "home";
  let lastGridCols = 0;
  let lastGridRows = 0;
  let isBuilt = false;
  let maqFitToken = 0;
  let maqFitRetries = 0;
  let maqResizeBound = false;
  const MAQ_VIEWPORT_MAX = 720;
  const MAQ_FIT_MIN_STAGE_H = 120;
  const MAQ_FIT_MAX_RETRIES = 32;
  const MAQ_DETAIL_HEAD_RESERVE = 88;
  const MAQ_NEIGHBOR_EDGE_HITS_REQUIRED = 1;
  const MAQ_NEIGHBOR_EDGE_ARM_DELAY_MS = 200;
  const MAQ_NEIGHBOR_EXIT_ARM_DELAY_MS = 120;

  let maquettesEdgeHandoff = false;
  let maquettesSectionEnteredAt = 0;
  let maqExitToStudyArmed = true;
  let maqExitArmTimer = 0;
  let maqIndexScrollReady = false;
  let maqLastGridPageSeen = -1;
  let maqIndexScrollReadyToken = 0;
  let maqIndexScrollReadyTimer = 0;

  let maquettesImmersive = false;
  let maqImmersiveStageObserver = null;
  let maqImmersiveLastStageH = -1;
  let maqImmersiveStableStageCount = 0;
  const MAQ_IMMERSIVE_STAGE_H_RATIO = 0.88;

  function getMaqStageSize(stage) {
    let stageW = stage.clientWidth;
    let stageH = stage.clientHeight;

    if (stageH < MAQ_FIT_MIN_STAGE_H) {
      const wrap = stage.closest(".gallery-rico__stage-wrap");
      if (wrap?.clientHeight >= MAQ_FIT_MIN_STAGE_H) stageH = wrap.clientHeight;
    }
    if (stageH < MAQ_FIT_MIN_STAGE_H) {
      const body = stage.closest(".gallery-rico__body");
      if (body?.clientHeight >= MAQ_FIT_MIN_STAGE_H) stageH = body.clientHeight;
    }

    return { stageW, stageH };
  }

  function computeMaqViewportSize(nw, nh, maxW, maxH) {
    const safeMaxW = Math.max(120, maxW || MAQ_VIEWPORT_MAX);
    const safeMaxH = Math.max(120, maxH || Math.round(window.innerHeight * 0.55));
    const scale = Math.min(safeMaxW / nw, safeMaxH / nh);
    return {
      w: Math.max(1, Math.round(nw * scale)),
      h: Math.max(1, Math.round(nh * scale)),
    };
  }

  const MAQ_CONTENT_BOUNDS_CACHE = new Map();
  const MAQ_CONTENT_MEASURE_MAX = 1024;
  const MAQ_CONTENT_FILL_MIN = 0.93;
  const MAQ_NAV_CONTENT_GAP = 10;
  const MAQ_SCREEN_EDGE_GAP = 10;

  function isMaqContentPixel(r, g, b, a) {
    if (a < 12) return false;
    if (r > 232 && g > 232 && b > 232) return false;
    return true;
  }

  function measureMaqImageContentBounds(img) {
    const key = img.currentSrc || img.src;
    if (MAQ_CONTENT_BOUNDS_CACHE.has(key)) {
      return MAQ_CONTENT_BOUNDS_CACHE.get(key);
    }

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return null;

    const sampleScale = Math.min(1, MAQ_CONTENT_MEASURE_MAX / Math.max(nw, nh));
    const sw = Math.max(1, Math.round(nw * sampleScale));
    const sh = Math.max(1, Math.round(nh * sampleScale));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    let data;
    try {
      ctx.drawImage(img, 0, 0, sw, sh);
      data = ctx.getImageData(0, 0, sw, sh).data;
    } catch {
      return null;
    }

    let minX = sw;
    let minY = sh;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < sh; y += 1) {
      for (let x = 0; x < sw; x += 1) {
        const i = (y * sw + x) * 4;
        if (isMaqContentPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return null;

    const inv = 1 / sampleScale;
    const bounds = {
      x0: Math.max(0, Math.floor(minX * inv)),
      y0: Math.max(0, Math.floor(minY * inv)),
      x1: Math.min(nw, Math.ceil((maxX + 1) * inv)),
      y1: Math.min(nh, Math.ceil((maxY + 1) * inv)),
    };
    MAQ_CONTENT_BOUNDS_CACHE.set(key, bounds);
    return bounds;
  }

  function computeMaqContentBoost(img, viewportW, viewportH) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const bounds = measureMaqImageContentBounds(img);

    if (!bounds || !nw || !nh || !viewportW || !viewportH) return 1;

    const cw = bounds.x1 - bounds.x0;
    const ch = bounds.y1 - bounds.y0;
    const fill = Math.min(cw / nw, ch / nh);

    if (fill >= MAQ_CONTENT_FILL_MIN) return 1;

    const containScale = Math.min(viewportW / nw, viewportH / nh);
    if (!containScale) return 1;

    const contentW = cw * containScale;
    const contentH = ch * containScale;
    if (!contentW || !contentH) return 1;

    const boost = Math.min(viewportW / contentW, viewportH / contentH);
    return boost <= 1.02 ? 1 : boost;
  }

  function syncMaqImageContentPresentation(img, viewport) {
    if (!img) return;

    if (maquettesImmersive) {
      img.style.removeProperty("transform");
      img.style.removeProperty("transform-origin");
      return;
    }

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const bounds = measureMaqImageContentBounds(img);
    const viewportW = viewport?.clientWidth || 0;
    const viewportH = viewport?.clientHeight || 0;
    const boost = computeMaqContentBoost(img, viewportW, viewportH);

    if (!bounds || !nw || !nh || boost <= 1.02) {
      img.style.removeProperty("transform");
      img.style.removeProperty("transform-origin");
      return;
    }

    const originX = (((bounds.x0 + bounds.x1) / 2) / nw) * 100;
    const originY = (((bounds.y0 + bounds.y1) / 2) / nh) * 100;
    img.style.transform = `scale(${boost})`;
    img.style.transformOrigin = `${originX}% ${originY}%`;
  }

  function clearMaqImagePresentationStyles(img) {
    if (!img) return;
    [
      "transform",
      "transform-origin",
      "width",
      "height",
      "max-width",
      "max-height",
      "position",
      "left",
      "top",
      "object-fit",
    ].forEach((prop) => img.style.removeProperty(prop));
  }

  function clearMaqImageContentPresentation(viewport) {
    viewport?.querySelectorAll(".gallery-rico__img").forEach(clearMaqImagePresentationStyles);
  }

  function getMaqDetailFitMetrics() {
    const detail = document.getElementById("maquettesDetail");
    const style = detail ? getComputedStyle(detail) : null;
    const padTop = style ? parseFloat(style.paddingTop) : 72;
    const padBottom = style ? parseFloat(style.paddingBottom) : 14;
    const padLeft = style ? parseFloat(style.paddingLeft) : 32;
    const padRight = style ? parseFloat(style.paddingRight) : 32;
    const innerW = window.innerWidth - padLeft - padRight;

    if (maquettesImmersive) {
      return getMaqImmersiveWindowMetrics();
    }

    if (isMaquettesMobileView()) {
      const { stageW, stageH } = getMaqImmersiveStageSize();
      const { reserve } = getMaqNavColumnMetrics();

      if (stageW > 80 && stageH > 160) {
        return {
          maxW: Math.max(240, Math.floor(stageW)),
          maxH: Math.max(240, Math.floor(stageH)),
        };
      }

      return {
        maxW: Math.max(240, Math.round(innerW - reserve)),
        maxH: Math.max(
          240,
          Math.round(window.innerHeight * 0.48 - MAQ_DETAIL_HEAD_RESERVE * 0.35)
        ),
      };
    }

    const { stageW, stageH } = getMaqStageSize(
      document.getElementById("maqRicoStage")
    );

    if (stageW > 80 && stageH > 160) {
      return {
        maxW: Math.min(MAQ_VIEWPORT_MAX, Math.floor(stageW)),
        maxH: Math.max(200, Math.floor(stageH)),
      };
    }

    return {
      maxW: Math.min(MAQ_VIEWPORT_MAX, Math.max(320, Math.round(innerW * 0.55))),
      maxH: Math.max(
        200,
        Math.round(window.innerHeight - padTop - padBottom - MAQ_DETAIL_HEAD_RESERVE)
      ),
    };
  }

  function applyMaqViewportFit(viewport, img) {
    if (!maquettesImmersive) {
      clearMaqImageContentPresentation(viewport);
      viewport.classList.remove("is-sized");
      viewport.style.removeProperty("width");
      viewport.style.removeProperty("height");
      viewport.style.removeProperty("max-width");
      viewport.style.removeProperty("max-height");
      viewport.removeAttribute("data-gallery-fit-mode");
      viewport.removeAttribute("data-gallery-aspect");
      return;
    }

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const { maxW, maxH } = getMaqDetailFitMetrics();
    const { w, h } = computeMaqViewportSize(nw, nh, maxW, maxH);
    viewport.style.width = `${w}px`;
    viewport.style.height = `${h}px`;
    viewport.style.removeProperty("max-width");
    viewport.style.removeProperty("max-height");
    viewport.dataset.galleryFitMode = "detail";
    if (nw && nh) viewport.dataset.galleryAspect = String(nw / nh);
    viewport.classList.add("is-sized");
    syncMaqImageContentPresentation(img, viewport);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isMaquettesMobileView() {
    return (
      window.innerWidth < 768 ||
      window.matchMedia("(hover: none) and (pointer: coarse)").matches
    );
  }

  function resolveAssetFile(file) {
    if (isMaquettesMobileView() && MAQ_MOBILE_FILES[file]) {
      return MAQ_MOBILE_FILES[file];
    }
    if (MAQ_FILE_ALIASES[file]) {
      return MAQ_FILE_ALIASES[file];
    }
    return file;
  }

  function assetSrc(file) {
    return `${ASSET_BASE}/${encodeURI(resolveAssetFile(file))}${CACHE}`;
  }

  function prefetchMaquetteAsset(index) {
    const item = catalog[index];
    if (!item) return;
    const src = itemPreviewSrc(item);
    if (window.ImagePreloadCache) {
      window.ImagePreloadCache.load(src);
    }
  }

  function syncActiveFrameAsset(index) {
    const item = catalog[index];
    const stage = document.getElementById("maqRicoStage");
    if (!stage) return;

    stage.querySelectorAll(".gallery-rico__frame").forEach((frame) => {
      const frameIndex = Number(frame.dataset.artIndex);
      const isTarget = frameIndex === index;
      const isAnimating =
        frame.classList.contains("is-enter-from-right") ||
        frame.classList.contains("is-enter-from-left") ||
        frame.classList.contains("is-leave-to-left") ||
        frame.classList.contains("is-leave-to-right");

      if (!isTarget && !isAnimating && !frame.classList.contains("is-active")) {
        frame.querySelectorAll("img").forEach((img) => img.removeAttribute("src"));
        return;
      }

      if (!isTarget) return;

      const img = frame.querySelector("img");
      if (!item || !img) return;

      const targetSrc = itemViewSrc(item);
      const gridImg = document.querySelector(
        `#maquettesGrid .gallery-index__cell[data-art-index="${index}"] img`
      );
      const gridSrc = gridImg?.currentSrc || gridImg?.src || itemPreviewSrc(item);

      img.loading = "eager";
      img.dataset.assetFile = item.file;

      const applyTarget = () => {
        if (Number(frame.dataset.artIndex) !== index) return;
        if (!frame.classList.contains("is-active")) return;
        applyMaquetteImageSrc(img, targetSrc);
        if (viewMode === "detail") scheduleFitViewport();
      };

      if (window.ImagePreloadCache) {
        window.ImagePreloadCache.load(targetSrc).then((cached) => {
          if (cached?.naturalWidth) applyTarget();
        });
      }

      if (gridSrc && gridSrc !== window.location.href) {
        applyMaquetteImageSrc(img, gridSrc);
      } else {
        applyMaquetteImageSrc(img, targetSrc);
      }
    });
  }

  function wireMaquetteImage(img) {
    img.addEventListener("error", () => {}, { once: true });
  }

  function pairUtils() {
    return window.galleryPairUtils || {};
  }

  function getStackedPairPanels(item) {
    return pairUtils().getStackedPairPanels?.(item, catalog) || null;
  }

  function diptychPartnerItem(item) {
    const panels = getStackedPairPanels(item);
    if (!panels) return null;
    if (panels.top === item) return panels.bottom;
    if (panels.bottom === item) return panels.top;
    return panels.bottom;
  }

  function gridLayoutApi() {
    return window.galleryGridLayout || {};
  }

  function isMobileGrid() {
    return typeof window !== "undefined" && window.innerWidth < 600;
  }

  function gridLayout() {
    return gridLayoutApi().gridLayout?.(isMobileGrid()) || {
      cols: isMobileGrid() ? 2 : 3,
      rows: 2,
      perPage: isMobileGrid() ? 4 : 6,
    };
  }

  function buildGridEntries() {
    const entries = [];
    const seenDiptychKeys = new Set();

    for (let i = 0; i < catalog.length; i += 1) {
      const item = catalog[i];
      if (pairUtils().isStackedPairSecondary?.(item)) continue;

      const panels = getStackedPairPanels(item);
      if (panels?.top && panels?.bottom) {
        const diptychKey =
          panels.top.sanityId ||
          panels.top.file ||
          panels.top.title ||
          String(i);
        if (seenDiptychKeys.has(diptychKey)) continue;
        seenDiptychKeys.add(diptychKey);

        const bottomIndex = catalog.findIndex(
          (entry) =>
            entry === panels.bottom ||
            (panels.bottom.sanityId && entry.sanityId === panels.bottom.sanityId) ||
            (panels.bottom.file && entry.file === panels.bottom.file)
        );

        entries.push({
          kind: "diptych",
          catalogIndex: i,
          indices: bottomIndex >= 0 ? [i, bottomIndex] : [i],
          item: panels.top,
          bottomItem: panels.bottom,
        });
        continue;
      }

      entries.push({ kind: "single", catalogIndex: i, item });
    }

    return entries;
  }

  function getPackedGridPages() {
    const mobile = isMobileGrid();
    const entries = buildGridEntries();
    const pack = gridLayoutApi().packGalleryPages;
    if (!pack) {
      return [entries.map((entry) => ({ entry, placement: null }))];
    }
    return pack(entries, { mobile });
  }

  function getGridPages() {
    const toEntries = gridLayoutApi().pagesToEntries;
    if (toEntries) return toEntries(getPackedGridPages());
    return getPackedGridPages();
  }

  function indexPageCount() {
    return getPackedGridPages().length;
  }

  function catalogPageForIndex(index) {
    const pages = getGridPages();
    for (let page = 0; page < pages.length; page += 1) {
      for (const entry of pages[page]) {
        if (entry.kind === "diptych" && entry.indices.includes(index)) return page;
        if (entry.kind === "single" && entry.catalogIndex === index) return page;
      }
    }
    return 0;
  }

  function sanitySizedImageUrl(url, width) {
    if (!url || !String(url).includes("cdn.sanity.io/")) return url;
    const base = String(url).split("?")[0];
    return `${base}?w=${width}&auto=format&q=82`;
  }

  function normalizeCatalogItem(item) {
    return { ...item };
  }

  function mapWorkFromSanity(work, worksById, index) {
    let secondImageUrl = work.secondImageUrl || null;
    if (
      work.presentationStyle === "stackedPair" &&
      work.pairedArtworkId &&
      !secondImageUrl
    ) {
      secondImageUrl = worksById[work.pairedArtworkId]?.imageUrl || null;
    }

    const file = work.legacyFilename || `${work.title}.png`;
    return normalizeCatalogItem({
      sanityId: work._id,
      file,
      title: work.title,
      year: work.year || "",
      medium: work.medium || "Assamblage",
      dimensions: work.dimensions || "",
      price: work.price || "",
      sold: Boolean(work.sold),
      presentationStyle: work.presentationStyle || "single",
      pairRole: work.pairRole || "",
      pairedArtworkId: work.pairedArtworkId || "",
      filesIndex: index,
      remoteViewSrc: work.imageUrl ? sanitySizedImageUrl(work.imageUrl, 2400) : null,
      remotePreviewSrc: work.imageUrl ? sanitySizedImageUrl(work.imageUrl, 720) : null,
      secondImageUrl: secondImageUrl ? sanitySizedImageUrl(secondImageUrl, 2400) : null,
      secondPreviewUrl: secondImageUrl ? sanitySizedImageUrl(secondImageUrl, 720) : null,
    });
  }

  async function loadCatalog() {
    if (window.sanityClient?.fetchAssamblage) {
      try {
        const works = await window.sanityClient.fetchAssamblage();
        if (Array.isArray(works) && works.length > 0) {
          const worksById = Object.fromEntries(works.map((work) => [work._id, work]));
          catalog = works
            .filter((work) => work.pairRole !== "secondary")
            .map((work, index) => mapWorkFromSanity(work, worksById, index));
          return;
        }
      } catch (_) {
        /* fall back to static catalog */
      }
    }

    catalog = STATIC_CATALOG.map((item, index) => normalizeCatalogItem({ ...item, filesIndex: index }));
  }

  function enquiryMailto(item) {
    const subject = encodeURIComponent(`Enquiry: ${item.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI would like to enquire about the artwork "${item.title}" (Assamblage).\n\n`
    );
    return `mailto:${ENQUIRY_EMAIL}?subject=${subject}&body=${body}`;
  }

  function shouldUseLocalAssamblageAsset(item) {
    const file = item?.file;
    if (!file) return false;
    if (/^cfg(-mobile)?\.(png|jpe?g)$/i.test(file)) return true;
    if (MAQ_FILE_ALIASES[file]) return true;
    if (file.endsWith("-mobile.png")) return true;
    return false;
  }

  function applyMaquetteImageSrc(img, src) {
    if (!img || !src) return;
    if (String(src).includes("cdn.sanity.io/")) {
      img.crossOrigin = "anonymous";
    } else {
      img.removeAttribute("crossorigin");
    }
    if (img.src !== src) img.src = src;
  }

  function itemPreviewSrc(item) {
    const local = assetSrc(item.file);
    if (shouldUseLocalAssamblageAsset(item)) return local;
    return item?.remotePreviewSrc || local;
  }

  function itemViewSrc(item) {
    const local = assetSrc(item.file);
    if (shouldUseLocalAssamblageAsset(item)) return local;
    return item?.remoteViewSrc || local;
  }

  function getMaquettesIndexScroller() {
    return document.getElementById("maquettesIndexScroller");
  }

  function getMaquettesIndexPageHeight(scroller = getMaquettesIndexScroller()) {
    if (!scroller) return 0;
    return scroller.clientHeight || window.innerHeight;
  }

  function clampMaquettesIndexScroll(scroller = getMaquettesIndexScroller()) {
    if (!scroller) return;

    const pageHeight = getMaquettesIndexPageHeight(scroller);
    const lastPage = indexPageCount() - 1;
    if (!pageHeight || lastPage < 0) return;

    const maxScrollTop = lastPage * pageHeight;
    if (scroller.scrollTop > maxScrollTop + 1) {
      scroller.scrollTop = maxScrollTop;
    }
  }

  function syncMaquettesIndexPageHeights() {
    const scroller = getMaquettesIndexScroller();
    if (!scroller) return 0;

    const pageHeight = getMaquettesIndexPageHeight(scroller);
    if (!pageHeight) return 0;

    const logicalPageCount = indexPageCount();
    const domPages = [...scroller.querySelectorAll(".gallery-index__page")];

    domPages.forEach((page, i) => {
      if (i >= logicalPageCount) {
        page.remove();
        return;
      }
      page.style.minHeight = `${pageHeight}px`;
      page.style.height = `${pageHeight}px`;
    });

    clampMaquettesIndexScroll(scroller);

    const expected = logicalPageCount * pageHeight;
    maqIndexScrollReady =
      logicalPageCount > 0 && scroller.scrollHeight + 4 >= expected;
    return expected;
  }

  function isMaquettesIndexScrollReady(scroller = getMaquettesIndexScroller()) {
    if (!scroller) return false;
    const pageHeight = getMaquettesIndexPageHeight(scroller);
    const pages = indexPageCount();
    if (!pageHeight || pages < 1) return false;
    const domPages = scroller.querySelectorAll(".gallery-index__page").length;
    return domPages === pages && scroller.scrollHeight + 4 >= pages * pageHeight;
  }

  function ensureMaquettesIndexScrollReadySoon() {
    window.clearTimeout(maqIndexScrollReadyTimer);
    maqIndexScrollReadyTimer = window.setTimeout(() => {
      void ensureMaquettesIndexScrollReady();
    }, 0);
  }

  async function ensureMaquettesIndexScrollReady() {
    const token = ++maqIndexScrollReadyToken;
    let retries = 0;

    while (retries <= 48) {
      fixMaquettesHeights();
      syncMaquettesIndexPageHeights();

      if (isMaquettesIndexScrollReady()) {
        maqIndexScrollReady = true;
        return true;
      }

      retries += 1;
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      if (token !== maqIndexScrollReadyToken) return maqIndexScrollReady;
      if (retries <= 48) {
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      }
    }

    maqIndexScrollReady = isMaquettesIndexScrollReady();
    return maqIndexScrollReady;
  }

  function getMaquettesIndexScrollHeight(scroller = getMaquettesIndexScroller()) {
    if (!scroller) return 0;
    const pageHeight = getMaquettesIndexPageHeight(scroller);
    return indexPageCount() * pageHeight;
  }

  function getMaquettesGridPageIndex() {
    const scroller = getMaquettesIndexScroller();
    if (!scroller) return 0;

    const pageHeight = getMaquettesIndexPageHeight(scroller);
    if (!pageHeight) return 0;

    return Math.min(
      indexPageCount() - 1,
      Math.max(0, Math.round(scroller.scrollTop / pageHeight))
    );
  }

  function isMaquettesGridAtTop(scroller = getMaquettesIndexScroller()) {
    if (!scroller) return true;
    return scroller.scrollTop <= 0;
  }

  function isMaquettesGridAtBottom(scroller = getMaquettesIndexScroller()) {
    if (!scroller || !isMaquettesIndexScrollReady(scroller)) return false;
    if (getMaquettesGridPageIndex() < indexPageCount() - 1) return false;

    const scrollHeight = getMaquettesIndexScrollHeight(scroller);
    return scroller.scrollTop + scroller.clientHeight >= scrollHeight - 2;
  }

  function maquettesEdgesArmed() {
    return Date.now() - maquettesSectionEnteredAt >= MAQ_NEIGHBOR_EDGE_ARM_DELAY_MS;
  }

  function markMaquettesSectionEntered() {
    maquettesSectionEnteredAt = Date.now();
    maqExitToStudyArmed = false;
    maqIndexScrollReady = false;
    window.clearTimeout(maqExitArmTimer);
    fixMaquettesHeights();
    syncMaquettesIndexPageHeights();
    ensureMaquettesIndexScrollReadySoon();
    maqExitArmTimer = window.setTimeout(() => {
      maqExitToStudyArmed = true;
    }, MAQ_NEIGHBOR_EXIT_ARM_DELAY_MS);
  }

  function disarmMaqExitToStudy() {
    maqExitToStudyArmed = false;
    window.clearTimeout(maqExitArmTimer);
    maqExitArmTimer = window.setTimeout(() => {
      maqExitToStudyArmed = true;
    }, MAQ_NEIGHBOR_EXIT_ARM_DELAY_MS);
  }

  function onMaquettesGridPageChange() {
    if (viewMode !== "grid") return;

    const scroller = getMaquettesIndexScroller();
    if (scroller) {
      clampMaquettesIndexScroll(scroller);
      const pageHeight = getMaquettesIndexPageHeight(scroller);
      const expectedHeight = indexPageCount() * pageHeight;
      if (pageHeight > 0 && scroller.scrollHeight + 4 < expectedHeight) {
        syncMaquettesIndexPageHeights();
        ensureMaquettesIndexScrollReadySoon();
      }
    }

    if (!isMaquettesIndexScrollReady()) return;

    const page = getMaquettesGridPageIndex();
    const lastPage = indexPageCount() - 1;

    if (page === lastPage && maqLastGridPageSeen !== lastPage) {
      disarmMaqExitToStudy();
    } else if (page !== lastPage) {
      maqExitToStudyArmed = true;
      window.clearTimeout(maqExitArmTimer);
    }

    maqLastGridPageSeen = page;
  }

  function fixMaquettesHeights() {
    const vh = window.innerHeight;
    const section = document.getElementById("section-maquettes");
    const page = section?.querySelector(".gallery-page");
    const grid = document.getElementById("maquettesGrid");

    if (section) section.style.height = `${vh}px`;
    if (page) page.style.height = `${vh}px`;
    if (grid) {
      grid.style.height = `${vh}px`;
      grid.style.maxHeight = `${vh}px`;
    }

    syncMaquettesIndexPageHeights();
  }

  function isPaintingsDetailOpen() {
    return document.getElementById("galleryLayout")?.dataset.mode === "detail";
  }

  function isPrintsDetailOpen() {
    return document.getElementById("printsLayout")?.dataset.mode === "detail";
  }

  function setNavExitMode(on) {
    const homeNav = document.querySelector(".site-nav__home");
    if (!homeNav) return;

    if (on) {
      if (!homeNav.hasAttribute("data-gallery-exit")) {
        navHomeSection = homeNav.getAttribute("data-scroll-section") || "home";
      }
      homeNav.textContent = "exit";
      homeNav.removeAttribute("data-scroll-section");
      homeNav.setAttribute("data-gallery-exit", "");
      homeNav.hidden = false;
      return;
    }

    if (isPaintingsDetailOpen() || isPrintsDetailOpen()) return;

    homeNav.textContent = "home";
    homeNav.setAttribute("data-scroll-section", navHomeSection);
    homeNav.removeAttribute("data-gallery-exit");
    homeNav.hidden = !document.body.classList.contains("is-past-home");
  }

  function frameHtml(item, index, isActive) {
    const panels = getStackedPairPanels(item);
    if (panels?.top && panels?.bottom) {
      const loading = index === 0 ? "eager" : "lazy";
      return `
        <figure class="gallery-rico__frame gallery-rico__frame--diptych${isActive ? " is-active" : ""}" data-art-index="${index}" aria-hidden="${isActive ? "false" : "true"}">
          <div class="gallery-rico__diptych">
            <img
              class="gallery-rico__img gallery-rico__img--diptych-top"
              src="${isActive ? itemPreviewSrc(panels.top) : ""}"
              data-preview-src="${itemPreviewSrc(panels.top)}"
              data-view-src="${itemViewSrc(panels.top)}"
              alt="${escapeHtml(panels.top.title)} (top panel)"
              loading="${loading}"
              decoding="async"
              draggable="false"
            />
            <img
              class="gallery-rico__img gallery-rico__img--diptych-bottom"
              src="${isActive ? itemPreviewSrc(panels.bottom) : ""}"
              data-preview-src="${itemPreviewSrc(panels.bottom)}"
              data-view-src="${itemViewSrc(panels.bottom)}"
              alt="${escapeHtml(panels.bottom.title)} (bottom panel)"
              loading="${loading}"
              decoding="async"
              draggable="false"
            />
          </div>
        </figure>
      `;
    }

    const preview = itemPreviewSrc(item);
    const view = itemViewSrc(item);
    const crossAttr = view.includes("cdn.sanity.io/") ? ' crossorigin="anonymous"' : "";
    return `
      <figure class="gallery-rico__frame${isActive ? " is-active" : ""}" data-art-index="${index}" aria-hidden="${isActive ? "false" : "true"}">
        <img
          class="gallery-rico__img"
          src="${isActive ? preview : ""}"
          data-preview-src="${preview}"
          data-view-src="${view}"
          data-asset-file="${escapeHtml(item.file)}"
          alt="${escapeHtml(item.title)}"
          loading="${index === 0 ? "eager" : "lazy"}"
          decoding="async"
          draggable="false"${crossAttr}
        />
      </figure>
    `;
  }

  function detailsPanelHtml() {
    return `
      <dl class="gallery-rico__details">
        <div class="gallery-rico__detail">
          <dt>Medium</dt>
          <dd id="maqRicoMedium">—</dd>
        </div>
        <div class="gallery-rico__detail">
          <dt>Year</dt>
          <dd id="maqRicoYear">—</dd>
        </div>
        <div class="gallery-rico__detail">
          <dt>Dimensions</dt>
          <dd id="maqRicoDimensions">—</dd>
        </div>
        <div class="gallery-rico__detail">
          <dt>Status</dt>
          <dd id="maqRicoStatus">—</dd>
        </div>
        <div class="gallery-rico__detail gallery-rico__detail--price" id="maqRicoPriceRow" hidden>
          <dt>Price</dt>
          <dd id="maqRicoPrice">—</dd>
        </div>
      </dl>
    `;
  }

  function coaPanelHtml() {
    return `
      <div class="gallery-rico__coa" id="maqRicoCoa">
        <button
          type="button"
          class="gallery-rico__coa-toggle"
          id="maqRicoCoaBtn"
          aria-expanded="false"
          aria-controls="maqRicoCoaPanel"
        >
          Includes a Certificate of Authenticity
        </button>
        <div class="gallery-rico__coa-panel" id="maqRicoCoaPanel">
          <div class="gallery-rico__coa-panel-inner">
            <div class="gallery-rico__coa-body">
              <p>A certificate of authenticity (COA) is a document from an authoritative source that verifies the artwork&rsquo;s authenticity. While many COAs are signed by the artist, others will be signed by the representing gallery or the printmaker who collaborated with the artist on the work. For secondary market works, authorized estates or foundations are often the issuing party.</p>
              <p>COAs typically include the name of the artist, the details (title, date, medium, dimensions) of the work in question, and whenever possible an image of the work.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function collapseMaquettesCoa() {
    const root = document.getElementById("maqRicoCoa");
    const toggle = document.getElementById("maqRicoCoaBtn");
    if (!root?.classList.contains("is-open")) return;
    root.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  }

  let coaKeydownBound = false;

  function initMaquettesCoaDisclosure() {
    const root = document.getElementById("maqRicoCoa");
    const toggle = document.getElementById("maqRicoCoaBtn");
    if (!root || !toggle || root.dataset.coaBound) return;

    root.dataset.coaBound = "1";

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = root.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    if (coaKeydownBound) return;
    coaKeydownBound = true;

    document.addEventListener("keydown", (e) => {
      if (document.body.dataset.currentSection !== "maquettes") return;
      if (viewMode !== "detail") return;
      const panel = document.getElementById("maqRicoCoa");
      if (!panel?.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        collapseMaquettesCoa();
      }
    });
  }

  function buildIndexCellMarkup(item, index, placement = null) {
    const preview = itemPreviewSrc(item);
    const placementStyle = placement
      ? ` style="grid-column: ${placement.col}; grid-row: ${placement.row};"`
      : "";

    return `
      <button type="button" class="gallery-index__cell" data-art-index="${index}" aria-label="View ${escapeHtml(item.title)}"${placementStyle}>
        <img
          class="gallery-index__img"
          src="${preview}"
          data-preview-src="${preview}"
          data-view-src="${itemViewSrc(item)}"
          data-asset-file="${escapeHtml(item.file)}"
          alt="${escapeHtml(item.title)}"
          loading="${index < 6 ? "eager" : "lazy"}"
          decoding="async"
          draggable="false"
        />
      </button>
    `;
  }

  function buildDiptychCellMarkup(entry, placement) {
    const topItem = entry.item;
    const bottomItem = entry.bottomItem || diptychPartnerItem(topItem);
    if (!bottomItem) return buildIndexCellMarkup(topItem, entry.catalogIndex, placement);

    const topPreview = itemPreviewSrc(topItem);
    const bottomPreview = itemPreviewSrc(bottomItem);
    const topView = itemViewSrc(topItem);
    const bottomView = itemViewSrc(bottomItem);
    const col = placement?.col ?? 3;
    const row = placement?.row ?? 1;
    const rowSpan = placement?.rowSpan ?? 2;
    const gridStyle = ` style="--diptych-col: ${col}; grid-column: ${col}; grid-row: ${row} / span ${rowSpan};"`;

    return `
      <button
        type="button"
        class="gallery-index__cell gallery-index__cell--diptych"
        data-art-index="${entry.catalogIndex}"
        data-diptych="true"
        ${gridStyle}
        aria-label="View ${escapeHtml(topItem.title)}"
      >
        <div class="gallery-index__diptych">
          <img
            class="gallery-index__img gallery-index__img--diptych-top"
            src="${topPreview}"
            data-preview-src="${topPreview}"
            data-view-src="${topView}"
            alt="${escapeHtml(topItem.title)} (top panel)"
            loading="eager"
            decoding="async"
            draggable="false"
          />
          <img
            class="gallery-index__img gallery-index__img--diptych-bottom"
            src="${bottomPreview}"
            data-preview-src="${bottomPreview}"
            data-view-src="${bottomView}"
            alt="${escapeHtml(bottomItem.title)} (bottom panel)"
            loading="eager"
            decoding="async"
            draggable="false"
          />
        </div>
      </button>
    `;
  }

  function buildPlacedCellMarkup(placed) {
    const { entry, placement } = placed;
    if (entry.kind === "diptych") return buildDiptychCellMarkup(entry, placement);
    return buildIndexCellMarkup(entry.item, entry.catalogIndex, placement);
  }

  function buildIndexMarkup() {
    const { cols, rows } = gridLayout();
    const pages = getPackedGridPages();
    const pagesHtml = pages
      .map((placedPage, page) => {
        const cells = placedPage.map((placed) => buildPlacedCellMarkup(placed)).join("");

        return `
        <div class="gallery-index__page" data-page="${page}" style="--gi-cols: ${cols}; --gi-rows: ${rows}">
          <div class="gallery-index__grid" role="list">${cells}</div>
        </div>
      `;
      })
      .join("");

    return `
      <div class="gallery-index" id="maquettesIndex">
        <div class="gallery-index__scroller" id="maquettesIndexScroller">${pagesHtml}</div>
      </div>
    `;
  }

  function buildDetailShell() {
    return `
      <div class="gallery-rico gallery-rico--detail" id="maquettesDetail">
        <header class="gallery-rico__head">
          <p class="gallery-rico__counter">Artwork Title</p>
          <h2 class="gallery-rico__title" id="maqRicoTitle"></h2>
        </header>

        <div class="gallery-rico__body">
          <aside class="gallery-rico__aside gallery-rico__aside--left">
            <a class="gallery-rico__enquire" id="maqRicoEnquire" href="mailto:${ENQUIRY_EMAIL}">Enquire About This Artwork</a>
            ${coaPanelHtml()}
          </aside>

          <div class="gallery-rico__stage-wrap">
            <button type="button" class="gallery-rico__nav gallery-rico__nav--prev" id="maqRicoPrev" aria-label="Previous artwork"><span aria-hidden="true">←</span></button>
            <div class="gallery-rico__stage" id="maqRicoStage" aria-live="polite">
              <div class="gallery-rico__viewport" id="maqRicoViewport" aria-label="Assamblage artwork">
                ${catalog.map((item, i) => frameHtml(item, i, i === 0)).join("")}
              </div>
            </div>
            <button type="button" class="gallery-rico__nav gallery-rico__nav--next" id="maqRicoNext" aria-label="Next artwork"><span aria-hidden="true">→</span></button>
          </div>

          <aside class="gallery-rico__aside gallery-rico__aside--right">
            ${detailsPanelHtml()}
          </aside>
        </div>
      </div>
    `;
  }

  function buildShell() {
    return `
      <div class="gallery-layout" id="maquettesLayout" data-mode="grid">
        ${buildIndexMarkup()}
        ${buildDetailShell()}
      </div>
    `;
  }

  function setDetail(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function resetViewportSize() {
    const viewport = document.getElementById("maqRicoViewport");
    if (!viewport) return;
    clearMaqImageContentPresentation(viewport);
    viewport.classList.remove("is-sized");
    viewport.style.removeProperty("width");
    viewport.style.removeProperty("height");
    viewport.style.removeProperty("max-width");
    viewport.style.removeProperty("max-height");
    viewport.style.removeProperty("aspect-ratio");
    viewport.style.removeProperty("--maq-fit-w");
    viewport.style.removeProperty("--maq-fit-h");
    viewport.style.removeProperty("--maq-viewport-offset-y");
    viewport.removeAttribute("data-gallery-fit-mode");
    viewport.removeAttribute("data-gallery-aspect");
    maqFitToken += 1;
  }

  function getMaqNavColumnMetrics() {
    const prev = document.getElementById("maqRicoPrev");
    const next = document.getElementById("maqRicoNext");
    const stageWrap = document.querySelector("#maquettesDetail .gallery-rico__stage-wrap");
    let prevW = prev?.offsetWidth || 0;
    let nextW = next?.offsetWidth || 0;
    let gap = 12;

    if (stageWrap) {
      const wrapStyle = getComputedStyle(stageWrap);
      gap = parseFloat(wrapStyle.columnGap || wrapStyle.gap || "12") || 12;
    }

    return {
      prevW,
      nextW,
      gap,
      reserve: prevW + nextW + gap * 2,
    };
  }

  function getMaqImmersiveStageSize() {
    const stageWrap = document.querySelector("#maquettesDetail .gallery-rico__stage-wrap");
    const stage = document.getElementById("maqRicoStage");
    const prev = document.getElementById("maqRicoPrev");
    const next = document.getElementById("maqRicoNext");

    let stageH = stageWrap?.clientHeight || 0;
    let stageW = stage?.clientWidth || 0;

    if (stageWrap && prev && next) {
      const wrapStyle = getComputedStyle(stageWrap);
      const gap = parseFloat(wrapStyle.columnGap || wrapStyle.gap || "4") || 4;
      const innerW = next.offsetLeft - (prev.offsetLeft + prev.offsetWidth) - gap;
      if (innerW > 80) stageW = innerW;
    }

    return { stageW, stageH };
  }

  function getMaqImmersiveSafeZone() {
    const detail = document.getElementById("maquettesDetail");
    const detailStyle = detail ? getComputedStyle(detail) : null;
    const padBottom = detailStyle ? parseFloat(detailStyle.paddingBottom) : 6;
    const nav = document.querySelector(".site-nav");
    const navBottom = nav ? nav.getBoundingClientRect().bottom : 68;
    const top = navBottom + MAQ_NAV_CONTENT_GAP;
    const bottom = window.innerHeight - Math.max(padBottom, MAQ_SCREEN_EDGE_GAP);
    const height = Math.max(240, Math.floor(bottom - top));

    return {
      top,
      bottom,
      height,
      centerY: (top + bottom) / 2,
    };
  }

  function getMaqImmersiveWindowMetrics() {
    const detail = document.getElementById("maquettesDetail");
    const detailStyle = detail ? getComputedStyle(detail) : null;
    const padLeft = detailStyle ? parseFloat(detailStyle.paddingLeft) : 8;
    const padRight = detailStyle ? parseFloat(detailStyle.paddingRight) : 8;
    const { reserve } = getMaqNavColumnMetrics();
    const { stageW, stageH } = getMaqImmersiveStageSize();
    const safe = getMaqImmersiveSafeZone();

    const maxW = stageW > 200
      ? Math.max(240, Math.floor(stageW))
      : Math.max(240, Math.floor(window.innerWidth - padLeft - padRight - reserve));
    const maxH = Math.max(240, Math.min(
      stageH > 200 ? stageH : safe.height,
      safe.height
    ));

    return { maxW, maxH, safe };
  }

  function applyMaqViewportVerticalCenter(viewport, viewportH) {
    const stage = document.getElementById("maqRicoStage");
    if (!stage || !viewport || !viewportH) return;

    const stageRect = stage.getBoundingClientRect();
    const safe = getMaqImmersiveSafeZone();
    const stageCenterY = stageRect.top + stageRect.height / 2;
    let offsetY = Math.round(safe.centerY - stageCenterY);

    const flexTop = stageRect.top + (stageRect.height - viewportH) / 2;
    let viewportTop = flexTop + offsetY;
    if (viewportTop < safe.top) {
      offsetY += Math.round(safe.top - viewportTop);
    }
    const viewportBottom = viewportTop + viewportH;
    if (viewportBottom > safe.bottom) {
      offsetY -= Math.round(viewportBottom - safe.bottom);
    }

    viewport.style.setProperty("--maq-viewport-offset-y", `${offsetY}px`);
  }

  function getMaqImmersiveTargetStageH() {
    return getMaqImmersiveWindowMetrics().maxH;
  }

  function resetMaqImmersiveStageStability() {
    maqImmersiveLastStageH = -1;
    maqImmersiveStableStageCount = 0;
  }

  function maqImmersiveLayoutReady() {
    const { stageW, stageH } = getMaqImmersiveStageSize();
    const targetH = getMaqImmersiveTargetStageH();
    if (stageW < 200 || targetH < 240) return false;
    return stageH >= Math.round(targetH * MAQ_IMMERSIVE_STAGE_H_RATIO);
  }

  function maqImmersiveStageSizeStable() {
    if (!maqImmersiveLayoutReady()) {
      resetMaqImmersiveStageStability();
      return false;
    }

    const { stageH } = getMaqImmersiveStageSize();
    if (Math.abs(stageH - maqImmersiveLastStageH) <= 2) {
      maqImmersiveStableStageCount += 1;
    } else {
      maqImmersiveLastStageH = stageH;
      maqImmersiveStableStageCount = 1;
    }

    return maqImmersiveStableStageCount >= 2;
  }

  function setMaquettesImmersiveFitPending(on) {
    document.getElementById("maquettesDetail")?.classList.toggle("is-fit-pending", Boolean(on));
  }

  function applyMaquettesImmersiveViewportFit(viewport, img) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh || !viewport) return;

    clearMaqImagePresentationStyles(img);
    viewport.style.removeProperty("width");
    viewport.style.removeProperty("height");
    viewport.style.removeProperty("max-width");
    viewport.style.removeProperty("max-height");
    viewport.style.removeProperty("aspect-ratio");

    const { maxW, maxH } = getMaqImmersiveWindowMetrics();
    const bounds = measureMaqImageContentBounds(img);
    const cw = bounds ? bounds.x1 - bounds.x0 : nw;
    const ch = bounds ? bounds.y1 - bounds.y0 : nh;
    const { w, h } = computeMaqViewportSize(cw, ch, maxW, maxH);

    viewport.style.setProperty("--maq-fit-w", `${w}px`);
    viewport.style.setProperty("--maq-fit-h", `${h}px`);
    viewport.dataset.galleryFitMode = "immersive";
    viewport.dataset.galleryAspect = String(nw / nh);
    viewport.classList.add("is-sized");
    applyMaqViewportVerticalCenter(viewport, h);

    const fill = Math.min(cw / nw, ch / nh);
    if (!bounds || fill >= MAQ_CONTENT_FILL_MIN) {
      return;
    }

    const scale = Math.min(w / cw, h / ch);
    const cx = (bounds.x0 + bounds.x1) / 2;
    const cy = (bounds.y0 + bounds.y1) / 2;

    img.style.position = "absolute";
    img.style.width = `${Math.round(nw * scale)}px`;
    img.style.height = `${Math.round(nh * scale)}px`;
    img.style.maxWidth = "none";
    img.style.maxHeight = "none";
    img.style.left = `${Math.round(w / 2 - cx * scale)}px`;
    img.style.top = `${Math.round(h / 2 - cy * scale)}px`;
  }

  function observeMaquettesStageForImmersiveFit() {
    maqImmersiveStageObserver?.disconnect();
    maqImmersiveStageObserver = null;
    if (!maquettesImmersive || typeof ResizeObserver === "undefined") return;

    const stageWrap = document.querySelector("#maquettesDetail .gallery-rico__stage-wrap");
    const stage = document.getElementById("maqRicoStage");
    const target = stageWrap || stage;
    if (!target) return;

    maqImmersiveStageObserver = new ResizeObserver(() => {
      if (!maquettesImmersive || viewMode !== "detail") return;
      if (!document.getElementById("maquettesDetail")?.classList.contains("is-fit-pending")) return;

      resetMaqImmersiveStageStability();
      scheduleFitViewport();
    });
    maqImmersiveStageObserver.observe(target);
  }

  function setMaquettesImmersive(on) {
    maquettesImmersive = Boolean(on);
    const detail = document.getElementById("maquettesDetail");
    detail?.classList.toggle("is-immersive", maquettesImmersive);
    resetViewportSize();
    setMaquettesImmersiveFitPending(maquettesImmersive);

    if (!maquettesImmersive) {
      maqImmersiveStageObserver?.disconnect();
      maqImmersiveStageObserver = null;
      maqFitRetries = 0;
    } else {
      maqFitRetries = 0;
      resetMaqImmersiveStageStability();
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        observeMaquettesStageForImmersiveFit();
        scheduleFitViewport();
      });
    });
  }

  function toggleMaquettesImmersive() {
    setMaquettesImmersive(!maquettesImmersive);
  }

  function initMaquettesImmersiveTap() {
    const grid = document.getElementById("maquettesGrid");
    if (!grid || grid.dataset.immersiveTapBound === "1") return;
    grid.dataset.immersiveTapBound = "1";

    let activePointer = null;

    grid.addEventListener(
      "pointerdown",
      (event) => {
        if (viewMode !== "detail") return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (!event.target.closest(".gallery-rico__frame.is-active")) return;
        if (event.target.closest(".gallery-rico__nav")) return;
        activePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      },
      { passive: true }
    );

    grid.addEventListener(
      "pointerup",
      (event) => {
        if (!activePointer || event.pointerId !== activePointer.id) return;

        const start = activePointer;
        activePointer = null;

        if (viewMode !== "detail") return;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 16) return;

        const hit = document.elementFromPoint(event.clientX, event.clientY);
        if (!hit?.closest(".gallery-rico__frame.is-active")) return;
        if (hit.closest(".gallery-rico__nav")) return;

        event.preventDefault();
        toggleMaquettesImmersive();
      },
      { passive: false }
    );

    grid.addEventListener("pointercancel", () => {
      activePointer = null;
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (document.body.dataset.currentSection !== "maquettes") return;
      if (viewMode !== "detail" || !maquettesImmersive) return;
      event.preventDefault();
      setMaquettesImmersive(false);
    });
  }

  async function waitForMaqImmersiveLayoutAndFit(token, viewport, img) {
    maqFitRetries = 0;
    resetMaqImmersiveStageStability();

    while (maqFitRetries <= MAQ_FIT_MAX_RETRIES) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      if (token !== maqFitToken || viewMode !== "detail" || !maquettesImmersive) return;

      if (!maqImmersiveLayoutReady() || !maqImmersiveStageSizeStable()) {
        maqFitRetries += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 60));
        continue;
      }

      if (!img.naturalWidth || !img.naturalHeight) {
        maqFitRetries += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 60));
        continue;
      }

      applyMaquettesImmersiveViewportFit(viewport, img);
      setMaquettesImmersiveFitPending(false);
      return;
    }

    applyMaquettesImmersiveViewportFit(viewport, img);
    setMaquettesImmersiveFitPending(false);
  }

  function waitForImageReady(img) {
    if (!img) return Promise.resolve();

    if (img.complete && img.naturalWidth) {
      if (typeof img.decode === "function") {
        return img.decode().catch(() => {});
      }
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const finish = () => {
        if (typeof img.decode === "function") {
          img.decode().catch(() => {}).finally(resolve);
        } else {
          resolve();
        }
      };
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
    });
  }

  function scheduleFitViewport() {
    const token = ++maqFitToken;
    requestAnimationFrame(() => {
      ensureViewportFit(token);
    });
  }

  async function ensureViewportFit(token) {
    if (token !== maqFitToken || viewMode !== "detail") return;

    const stage = document.getElementById("maqRicoStage");
    const viewport = document.getElementById("maqRicoViewport");
    if (!stage || !viewport) return;

    const img = viewport.querySelector(".gallery-rico__frame.is-active img");
    if (!img) return;

    await waitForImageReady(img);
    if (token !== maqFitToken || viewMode !== "detail") return;

    if (!maquettesImmersive) {
      clearMaqImageContentPresentation(viewport);
      return;
    }

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    if (!nw || !nh) {
      if (maqFitRetries < MAQ_FIT_MAX_RETRIES) {
        maqFitRetries += 1;
        window.setTimeout(() => scheduleFitViewport(), 60);
      }
      return;
    }

    if (document.fonts && document.fonts.status !== "loaded") {
      try { await document.fonts.ready; } catch {}
      if (token !== maqFitToken || viewMode !== "detail") return;
    }

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (token !== maqFitToken || viewMode !== "detail") return;

    const { stageW, stageH } = getMaqStageSize(stage);

    if (
      (stageH < MAQ_FIT_MIN_STAGE_H || stageW < 80) &&
      maqFitRetries < 8
    ) {
      maqFitRetries += 1;
      window.setTimeout(() => scheduleFitViewport(), 60);
      return;
    }

    maqFitRetries = 0;
    await waitForMaqImmersiveLayoutAndFit(token, viewport, img);
  }

  function fitViewport() {
    scheduleFitViewport();
  }

  function updateDisplay(index) {
    const item = catalog[index];
    if (!item) return;

    const titleEl = document.getElementById("maqRicoTitle");
    if (titleEl) {
      titleEl.textContent = item.year ? `${item.title}, ${item.year}` : item.title;
    }

    setDetail("maqRicoMedium", item.medium || "—");
    setDetail("maqRicoYear", item.year || "—");
    setDetail("maqRicoDimensions", item.dimensions || "—");
    setDetail("maqRicoStatus", item.sold ? "Sold" : "Available");

    const priceRow = document.getElementById("maqRicoPriceRow");
    const showPrice = Boolean(item.price) && !item.sold;
    if (priceRow) priceRow.hidden = !showPrice;
    if (showPrice) setDetail("maqRicoPrice", item.price);

    const enquireEl = document.getElementById("maqRicoEnquire");
    if (enquireEl) {
      enquireEl.hidden = Boolean(item.sold);
      if (!item.sold) enquireEl.href = enquiryMailto(item);
    }

    const contactEl = document.querySelector(".site-nav__contact");
    if (contactEl && document.body.dataset.currentSection === "maquettes") {
      if (item.sold) contactEl.href = `mailto:${ENQUIRY_EMAIL}`;
      else contactEl.href = enquiryMailto(item);
    }

    if (viewMode === "detail" && typeof window.trackArtworkView === "function") {
      window.trackArtworkView("assamblage", item.title);
    }

    const prevBtn = document.getElementById("maqRicoPrev");
    const nextBtn = document.getElementById("maqRicoNext");
    if (prevBtn) {
      prevBtn.disabled = false;
      prevBtn.setAttribute(
        "aria-label",
        index <= 0 ? "Back to Assamblage grid" : "Previous artwork"
      );
    }
    if (nextBtn) nextBtn.disabled = index >= catalog.length - 1;

    resetViewportSize();
    fitViewport();
  }

  function scrollGridToIndex(index) {
    const scroller = document.getElementById("maquettesIndexScroller");
    if (!scroller) return;
    const page = catalogPageForIndex(index);
    const pageEl = scroller.querySelector(`.gallery-index__page[data-page="${page}"]`);
    if (pageEl) pageEl.scrollIntoView({ block: "start" });
  }

  function showGrid(options = {}) {
    collapseMaquettesCoa();
    setMaquettesImmersive(false);
    viewMode = "grid";
    resetViewportSize();
    const layout = document.getElementById("maquettesLayout");
    if (layout) layout.dataset.mode = "grid";

    const scroller = document.getElementById("maquettesIndexScroller");
    if (scroller) {
      if (options.resetScroll) scroller.scrollTop = 0;
      else if (Number.isFinite(currentIndex)) scrollGridToIndex(currentIndex);
    }

    setNavExitMode(false);
  }

  function openDetail(index) {
    if (index < 0 || index >= catalog.length) return;

    viewMode = "detail";
    currentIndex = index;

    const layout = document.getElementById("maquettesLayout");
    if (layout) layout.dataset.mode = "detail";

    fixMaquettesHeights();
    resetViewportSize();
    maqFitRetries = 0;

    const stage = document.getElementById("maqRicoStage");
    const frames = stage?.querySelectorAll(".gallery-rico__frame") || [];
    frames.forEach((frame, i) => {
      frame.classList.toggle("is-active", i === index);
      frame.setAttribute("aria-hidden", i === index ? "false" : "true");
    });

    syncActiveFrameAsset(index);
    prefetchMaquetteAsset(index);
    prefetchMaquetteAsset(index + 1);
    prefetchMaquetteAsset(index - 1);
    setNavExitMode(true);
    updateDisplay(index);

    const item = catalog[index];
    if (item && typeof window.trackArtworkView === "function") {
      window.trackArtworkView("assamblage", item.title);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fixMaquettesHeights();
        scheduleFitViewport();
      });
    });
  }

  function goToIndex(index) {
    if (index < 0 || index >= catalog.length) return;
    if (index === currentIndex) return;

    resetViewportSize();
    maqFitRetries = 0;

    const stage = document.getElementById("maqRicoStage");
    const frames = stage?.querySelectorAll(".gallery-rico__frame") || [];
    frames.forEach((frame, i) => {
      frame.classList.toggle("is-active", i === index);
      frame.setAttribute("aria-hidden", i === index ? "false" : "true");
    });

    currentIndex = index;
    syncActiveFrameAsset(index);
    collapseMaquettesCoa();
    updateDisplay(index);
  }

  function initIndexNav() {
    if (indexInitialized) return;
    const grid = document.getElementById("maquettesGrid");
    const scroller = document.getElementById("maquettesIndexScroller");
    if (!grid || !scroller) return;

    indexInitialized = true;

    scroller.addEventListener("scroll", onMaquettesGridPageChange, { passive: true });
    onMaquettesGridPageChange();

    grid.addEventListener("click", (event) => {
      if (viewMode !== "grid") return;
      const cell = event.target.closest(".gallery-index__cell");
      if (!cell) return;
      const index = Number(cell.dataset.artIndex);
      if (!Number.isFinite(index)) return;
      event.preventDefault();
      prefetchMaquetteAsset(index);
      openDetail(index);
    });

    grid.addEventListener(
      "pointerenter",
      (event) => {
        if (viewMode !== "grid") return;
        const cell = event.target.closest(".gallery-index__cell");
        if (!cell) return;
        const index = Number(cell.dataset.artIndex);
        if (Number.isFinite(index)) prefetchMaquetteAsset(index);
      },
      true
    );

    const GRID_EDGE_DEBOUNCE_MS = 250;

    let gridUpHitCount = 0;
    let gridUpHitTimer = 0;
    let gridUpLastTime = 0;

    function prepSectionHandoff(targetSlug) {
      if (targetSlug === "prints") window.printsRefreshScrollFx?.();
    }

    function doGridHandoff(targetSlug) {
      if (!isMaquettesIndexScrollReady()) return;
      if (targetSlug === "study" && !maqExitToStudyArmed) return;
      prepSectionHandoff(targetSlug);
      maquettesEdgeHandoff = true;
      window.siteScroll?.scrollToSection?.(targetSlug, { resetScroll: false });
      window.setTimeout(() => { maquettesEdgeHandoff = false; }, 1040);
    }

    scroller.addEventListener(
      "wheel",
      (event) => {
        if (document.body.dataset.currentSection !== "maquettes") return;
        if (viewMode !== "grid") return;
        if (maquettesEdgeHandoff || window.siteScroll?.isTransitioning?.()) return;

        if (!isMaquettesIndexScrollReady()) {
          event.preventDefault();
          event.stopPropagation();
          ensureMaquettesIndexScrollReadySoon();
          return;
        }

        const atTop = isMaquettesGridAtTop(scroller);
        const atBottom = isMaquettesGridAtBottom(scroller);
        const canScrollDown =
          scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2;
        const canScrollUp = scroller.scrollTop > 0;

        if ((event.deltaY > 0 && canScrollDown) || (event.deltaY < 0 && canScrollUp)) {
          event.stopPropagation();
          return;
        }

        if (atTop && event.deltaY < 0) {
          event.preventDefault();
          event.stopPropagation();

          if (!maquettesEdgesArmed()) return;

          const now = Date.now();
          if (now - gridUpLastTime < GRID_EDGE_DEBOUNCE_MS) return;
          gridUpLastTime = now;

          gridUpHitCount += 1;
          window.clearTimeout(gridUpHitTimer);
          gridUpHitTimer = window.setTimeout(() => { gridUpHitCount = 0; }, 1200);

          if (gridUpHitCount < MAQ_NEIGHBOR_EDGE_HITS_REQUIRED) return;

          gridUpHitCount = 0;
          doGridHandoff("prints");
          return;
        }

        if (atBottom && event.deltaY > 0) {
          event.preventDefault();
          event.stopPropagation();

          if (!maqExitToStudyArmed) return;
          if (!maquettesEdgesArmed()) return;

          doGridHandoff("study");
        }
      },
      { passive: false }
    );

    let indexTouchStartY = 0;

    scroller.addEventListener(
      "touchstart",
      (event) => {
        if (viewMode !== "grid") return;
        indexTouchStartY = event.touches[0]?.clientY ?? 0;
      },
      { passive: true }
    );

    let touchUpHitCount = 0;
    let touchUpHitTimer = 0;

    scroller.addEventListener(
      "touchend",
      (event) => {
        if (document.body.dataset.currentSection !== "maquettes") return;
        if (viewMode !== "grid") return;
        if (maquettesEdgeHandoff || window.siteScroll?.isTransitioning?.()) return;
        if (!isMaquettesIndexScrollReady()) {
          ensureMaquettesIndexScrollReadySoon();
          return;
        }

        const touch = event.changedTouches[0];
        if (!touch) return;

        const deltaY = touch.clientY - indexTouchStartY;
        const atTop = isMaquettesGridAtTop(scroller);
        const atBottom = isMaquettesGridAtBottom(scroller);

        if (atTop && deltaY > 36) {
          if (!maquettesEdgesArmed()) return;

          touchUpHitCount += 1;
          window.clearTimeout(touchUpHitTimer);
          touchUpHitTimer = window.setTimeout(() => { touchUpHitCount = 0; }, 1200);

          if (touchUpHitCount < MAQ_NEIGHBOR_EDGE_HITS_REQUIRED) return;

          touchUpHitCount = 0;
          doGridHandoff("prints");
          return;
        }

        if (atBottom && deltaY < -36) {
          if (!maqExitToStudyArmed || !isMaquettesIndexScrollReady()) return;
          if (!maquettesEdgesArmed()) return;

          doGridHandoff("study");
        }
      },
      { passive: true }
    );
  }

  function initDetailNav() {
    if (navInitialized) return;
    const prevBtn = document.getElementById("maqRicoPrev");
    const nextBtn = document.getElementById("maqRicoNext");
    const stageWrap = document.querySelector("#section-maquettes .gallery-rico__stage-wrap");
    if (!prevBtn || !nextBtn || !stageWrap) return;

    navInitialized = true;

    prevBtn.addEventListener("click", () => {
      if (viewMode !== "detail") return;
      if (currentIndex <= 0) showGrid();
      else goToIndex(currentIndex - 1);
    });

    nextBtn.addEventListener("click", () => {
      if (viewMode !== "detail") return;
      if (currentIndex < catalog.length - 1) goToIndex(currentIndex + 1);
    });

    document.addEventListener("keydown", (e) => {
      if (document.body.dataset.currentSection !== "maquettes") return;
      if (viewMode !== "detail") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex < catalog.length - 1) goToIndex(currentIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex <= 0) showGrid();
        else goToIndex(currentIndex - 1);
      }
    });
  }

  function initInteractions() {
    if (interactionsInitialized) return;
    interactionsInitialized = true;

    if (!maqResizeBound) {
      maqResizeBound = true;
      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        if (viewMode !== "detail") return;
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => scheduleFitViewport(), 150);
      });
    }

    document.querySelectorAll("#maquettesGrid .gallery-rico__img, #maquettesGrid .gallery-index__img").forEach((img) => {
      wireMaquetteImage(img);
      img.addEventListener("load", () => {
        if (viewMode !== "detail") return;
        const frame = img.closest(".gallery-rico__frame");
        if (!frame?.classList.contains("is-active")) return;
        const vp = document.getElementById("maqRicoViewport");
        if (vp?.classList.contains("is-sized")) return;
        fitViewport();
      });
    });

    const viewport = document.getElementById("maqRicoViewport");
    initMaquettesCoaDisclosure();
  }

  function buildMaquettes(force = false) {
    const grid = document.getElementById("maquettesGrid");
    if (!grid) return;

    const { cols, rows } = gridLayout();
    const nextPageCount = indexPageCount();

    if (isBuilt && !force && cols === lastGridCols && rows === lastGridRows && nextPageCount === lastIndexPageCount) {
      return;
    }

    lastGridCols = cols;
    lastGridRows = rows;
    lastIndexPageCount = nextPageCount;

    currentIndex = 0;
    viewMode = "grid";
    navInitialized = false;
    indexInitialized = false;
    interactionsInitialized = false;

    grid.innerHTML = buildShell();
    initIndexNav();
    initDetailNav();
    initInteractions();

    fixMaquettesHeights();
    updateDisplay(0);
    showGrid({ resetScroll: true });
    ensureMaquettesIndexScrollReadySoon();
    isBuilt = true;
  }

  function getAllPreloadUrls() {
    return catalog.map((item) => itemPreviewSrc(item));
  }

  async function init() {
    await loadCatalog();
    buildMaquettes();

    window.maquettesPreload = { getAllUrls: getAllPreloadUrls };
    window.maquettesCatalogReady = true;
    document.dispatchEvent(new CustomEvent("maquettes:ready"));
    initMaquettesImmersiveTap();

    window.maquettesShowGrid = showGrid;
    window.maquettesIsImmersive = () => maquettesImmersive;
    window.maquettesSetImmersive = setMaquettesImmersive;
    window.maquettesRefreshScrollFx = () => {
      fixMaquettesHeights();
      syncMaquettesIndexPageHeights();
      ensureMaquettesIndexScrollReadySoon();
    };
    window.markMaquettesSectionEntered = markMaquettesSectionEntered;
    window.ensureMaquettesIndexScrollReady = ensureMaquettesIndexScrollReady;
    window.refreshMaquettesLayout = async () => {
      const { cols, rows } = gridLayout();
      const nextPageCount = indexPageCount();
      if (cols !== lastGridCols || rows !== lastGridRows || nextPageCount !== lastIndexPageCount) {
        const savedIndex = currentIndex;
        const savedMode = viewMode;
        buildMaquettes(true);
        if (savedMode === "detail") openDetail(savedIndex);
      } else if (viewMode === "detail") {
        fitViewport();
      }
    };

    window.addEventListener("resize", () => {
      window.clearTimeout(window.__maquettesResizeTimer);
      window.__maquettesResizeTimer = window.setTimeout(() => {
        void window.refreshMaquettesLayout?.();
      }, 180);
    });

    window.addEventListener("resize", () => {
      fixMaquettesHeights();
    });

    markMaquettesSectionEntered();

    if (document.body) {
      new MutationObserver(() => {
        if (document.body.dataset.currentSection === "maquettes") {
          markMaquettesSectionEntered();
        }
      }).observe(document.body, { attributes: true, attributeFilter: ["data-current-section"] });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void init();
    });
  } else {
    void init();
  }
})();
