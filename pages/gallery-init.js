/** Image filenames in display order (newest → oldest). */
const FILES = [
  "Glory days 2.jpg",
  "DSC01349.jpg",
  "DSC01668_2.jpg",
  "Crimson Accord 3 small.jpg",
  "cbb.jpg",
  "lamp.jpg",
  "AFTER FAIR 002.jpg",
  "AFTER FAIR 001.jpg",
  "HOME 04 copy.jpg",
  "My buried jesus ii.jpg",
  "CARRY YOURS.jpg",
  "Swallowed.jpg",
  "download - 2026-05-21T073335.434.jpg",
  "T 9.jpg",
  "DSC07737.jpg",
  "T 11.jpg",
  "T 12.jpg",
  "Artwork 1.jpg",
  "Artwork 2.jpg",
  "Shine.jpg",
  "sky.jpg",
  "hidden.jpg",
  "Simone co.jpg",
  "Simone.jpg",
  "yima.jpg",
  "xbf.jpg",
  "wwe.jpg",
  "T 8.jpg",
  "T 7.jpg",
  "T 6.jpg",
  "T 5.jpg",
  "T 4.jpg",
  "T 3.jpg",
  "T 10.jpg",
  "fg.jpg",
  "T 1.jpg",
  "T 2.jpg",
];

const PLACEHOLDER_YEARS = [
  "2026", "2026", "2025", "2025", "2025", "2025",
  "2024", "2024", "2024", "2024", "2024", "2024",
  "2023", "2023", "2023", "2023", "2023", "2023",
  "2022", "2022", "2022", "2022", "2022", "2022",
  "2021", "2021", "2021", "2021", "2021", "2021",
  "2020", "2020", "2020", "2020", "2020", "2019", "2019",
];

const PREVIEW_BASE = "assets/gallery-preview";
const VIEW_BASE = "assets/gallery-view";
const ORIGINAL_BASE = "assets/images";
const CACHE = "?v=20260614c";
const ENQUIRY_EMAIL = "Contact@maluleke.art";

function pairUtils() {
  return window.galleryPairUtils || {};
}

function afterFairDiptychPrimaryIndex() {
  return pairUtils().findDiptychPrimaryIndex?.(catalog) ?? -1;
}

function afterFairDiptychSecondaryIndex() {
  return pairUtils().findDiptychSecondaryIndex?.(catalog) ?? -1;
}

function isStackedPairItem(item) {
  return pairUtils().isStackedPairItem?.(item) ?? false;
}

function getStackedPairPanels(item) {
  return pairUtils().getStackedPairPanels?.(item, catalog) || null;
}

function isPrintMedium(item) {
  return /^print\b/i.test(String(item?.medium || "").trim());
}

function nextGalleryCatalogIndex(from, delta) {
  let next = from + delta;
  const secondary = afterFairDiptychSecondaryIndex();
  if (secondary >= 0) {
    if (delta > 0 && next === secondary) next += 1;
    if (delta < 0 && next === secondary) next -= 1;
  }
  return Math.max(0, Math.min(catalog.length - 1, next));
}

function resolveGalleryNavIndex(index) {
  const secondary = afterFairDiptychSecondaryIndex();
  const primary = afterFairDiptychPrimaryIndex();
  if (secondary >= 0 && primary >= 0 && index === secondary) return primary;
  return index;
}

function enquiryMailto(item, sectionLabel = "Paintings") {
  const subject = encodeURIComponent(`Enquiry: ${item.title}`);
  const body = encodeURIComponent(
    `Hello,\n\nI would like to enquire about the artwork "${item.title}" (${sectionLabel}).\n\n`
  );
  return `mailto:${ENQUIRY_EMAIL}?subject=${subject}&body=${body}`;
}

function syncEnquiryLinks(item, sectionLabel = "Paintings") {
  if (!item?.title) return;

  const href = enquiryMailto(item, sectionLabel);
  const enquireEl = document.getElementById("galleryRicoEnquire");
  const contactEl = document.querySelector(".site-nav__contact");

  if (enquireEl) {
    enquireEl.hidden = Boolean(item.sold);
    if (!item.sold) enquireEl.href = href;
  }
  if (contactEl && !item.sold) contactEl.href = href;
}

function resetEnquiryContact() {
  const contactEl = document.querySelector(".site-nav__contact");
  if (contactEl) contactEl.href = `mailto:${ENQUIRY_EMAIL}`;
}

function galleryStepMs(queueDepth = 0) {
  const q = Math.abs(queueDepth);
  if (q > 5) return 140;
  if (q > 3) return 170;
  if (q > 1) return 200;
  return 240;
}

let catalog = [];
const viewCache = new Map();
let currentGalleryIndex = 0;
let galleryNavInitialized = false;
let galleryInteractionsInitialized = false;
let galleryPageAnimating = false;
let galleryNavQueue = 0;
let galleryEdgeHandoff = false;
let galleryEdgeHitCount = 0;
let galleryEdgeHitTimer = 0;
let gallerySectionEnteredAt = 0;
const GALLERY_EDGE_HITS_REQUIRED = 4;
const GALLERY_EDGE_ARM_DELAY_MS = 1400;
const GALLERY_WHEEL_THRESHOLD = 40;
const GALLERY_NEIGHBOR_EDGE_HITS_REQUIRED = 1;
const GALLERY_NEIGHBOR_EDGE_ARM_DELAY_MS = 200;
const GALLERY_NEIGHBOR_EXIT_ARM_DELAY_MS = 120;
const GALLERY_EXIT_ARM_DELAY_MS = GALLERY_NEIGHBOR_EXIT_ARM_DELAY_MS;
const GALLERY_GRID_EXIT_ARM_DELAY_MS = 480;
let galleryExitToPrintsArmed = false;
let galleryExitArmTimer = 0;
let galleryGridBottomWheelAccum = 0;
let galleryGridBottomWheelResetTimer = 0;
let galleryLastGridPageSeen = -1;
let galleryIndexScrollReady = false;
let galleryIndexScrollReadyToken = 0;
let galleryIndexScrollReadyTimer = 0;
let scheduleGallerySync = null;
let pillScrollSyncing = false;
let galleryViewMode = "grid";
let galleryImmersive = false;
let galleryDetailFitIndex = -1;
let galleryIndexInitialized = false;
let lastIndexPageCount = 0;
let galleryHomeScrollSection = "home";

function getGalleryIndexScroller() {
  return document.getElementById("galleryIndexScroller");
}

function getGalleryIndexPageHeight(scroller = getGalleryIndexScroller()) {
  if (!scroller) return 0;
  return scroller.clientHeight || window.innerHeight;
}

function clampGalleryIndexScroll(scroller = getGalleryIndexScroller()) {
  if (!scroller) return;

  const pageHeight = getGalleryIndexPageHeight(scroller);
  const lastPage = indexPageCount() - 1;
  if (!pageHeight || lastPage < 0) return;

  const maxScrollTop = lastPage * pageHeight;
  if (scroller.scrollTop > maxScrollTop + 1) {
    scroller.scrollTop = maxScrollTop;
  }
}

function syncGalleryIndexPageHeights() {
  const scroller = getGalleryIndexScroller();
  if (!scroller) return 0;

  const pageHeight = getGalleryIndexPageHeight(scroller);
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

  clampGalleryIndexScroll(scroller);

  const expected = logicalPageCount * pageHeight;
  galleryIndexScrollReady =
    logicalPageCount > 0 && scroller.scrollHeight + 4 >= expected;
  return expected;
}

function isGalleryIndexScrollReady(scroller = getGalleryIndexScroller()) {
  if (!scroller) return false;
  const pageHeight = getGalleryIndexPageHeight(scroller);
  const pages = indexPageCount();
  if (!pageHeight || pages < 1) return false;
  const domPages = scroller.querySelectorAll(".gallery-index__page").length;
  return domPages === pages && scroller.scrollHeight + 4 >= pages * pageHeight;
}

function ensureGalleryIndexScrollReadySoon() {
  window.clearTimeout(galleryIndexScrollReadyTimer);
  galleryIndexScrollReadyTimer = window.setTimeout(() => {
    void ensureGalleryIndexScrollReady();
  }, 0);
}

async function ensureGalleryIndexScrollReady() {
  const token = ++galleryIndexScrollReadyToken;
  let retries = 0;

  while (retries <= 48) {
    fixGalleryHeights();
    syncGalleryIndexPageHeights();

    if (isGalleryIndexScrollReady()) {
      galleryIndexScrollReady = true;
      return true;
    }

    retries += 1;
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (token !== galleryIndexScrollReadyToken) return galleryIndexScrollReady;
    if (retries <= 48) {
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    }
  }

  galleryIndexScrollReady = isGalleryIndexScrollReady();
  return galleryIndexScrollReady;
}

function getGalleryIndexScrollHeight(scroller = getGalleryIndexScroller()) {
  if (!scroller) return 0;
  const pageHeight = getGalleryIndexPageHeight(scroller);
  return indexPageCount() * pageHeight;
}

function isGalleryGridAtTop(scroller = getGalleryIndexScroller()) {
  if (!scroller) return true;
  return scroller.scrollTop <= 0;
}

function isGalleryGridAtBottom(scroller = getGalleryIndexScroller()) {
  if (!scroller || !isGalleryIndexScrollReady(scroller)) return false;

  const pageHeight = getGalleryIndexPageHeight(scroller);
  const lastPage = indexPageCount() - 1;
  if (!pageHeight || lastPage < 0) return false;

  const atLastSnap = scroller.scrollTop >= lastPage * pageHeight - 2;
  const canScrollDown =
    scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2;

  return atLastSnap && !canScrollDown;
}

function isInfoHandoff(targetSlug) {
  return targetSlug === "info";
}

function edgeHitsRequired(targetSlug) {
  return isInfoHandoff(targetSlug)
    ? GALLERY_EDGE_HITS_REQUIRED
    : GALLERY_NEIGHBOR_EDGE_HITS_REQUIRED;
}

function galleryEdgesArmedFor(targetSlug) {
  const delay = isInfoHandoff(targetSlug)
    ? GALLERY_EDGE_ARM_DELAY_MS
    : GALLERY_NEIGHBOR_EDGE_ARM_DELAY_MS;
  return Date.now() - gallerySectionEnteredAt >= delay;
}

function markGallerySectionEntered() {
  gallerySectionEnteredAt = Date.now();
  galleryEdgeHitCount = 0;
  galleryExitToPrintsArmed = false;
  galleryGridBottomWheelAccum = 0;
  galleryIndexScrollReady = false;
  window.clearTimeout(galleryExitArmTimer);
  window.clearTimeout(galleryGridBottomWheelResetTimer);
  fixGalleryHeights();
  syncGalleryIndexPageHeights();
  ensureGalleryIndexScrollReadySoon();
  galleryLastGridPageSeen = -1;
}

function galleryEdgesArmed() {
  return galleryEdgesArmedFor("info");
}

function galleryPrintsHandoffReady() {
  return (
    galleryExitToPrintsArmed &&
    Date.now() - gallerySectionEnteredAt >= GALLERY_GRID_EXIT_ARM_DELAY_MS
  );
}

function getGalleryGridPageIndex() {
  const scroller = getGalleryIndexScroller();
  if (!scroller) return 0;

  const pageHeight = getGalleryIndexPageHeight(scroller);
  if (!pageHeight) return 0;

  return Math.min(
    indexPageCount() - 1,
    Math.max(0, Math.floor(scroller.scrollTop / pageHeight))
  );
}

function disarmGalleryExitToPrints() {
  galleryExitToPrintsArmed = false;
  galleryGridBottomWheelAccum = 0;
  window.clearTimeout(galleryGridBottomWheelResetTimer);
  window.clearTimeout(galleryExitArmTimer);
  galleryExitArmTimer = window.setTimeout(() => {
    galleryExitToPrintsArmed = true;
  }, GALLERY_GRID_EXIT_ARM_DELAY_MS);
}

function onGalleryGridPageChange() {
  if (galleryViewMode !== "grid") return;

  const scroller = getGalleryIndexScroller();
  if (scroller) {
    clampGalleryIndexScroll(scroller);
    const pageHeight = getGalleryIndexPageHeight(scroller);
    const expectedHeight = indexPageCount() * pageHeight;
    if (pageHeight > 0 && scroller.scrollHeight + 4 < expectedHeight) {
      syncGalleryIndexPageHeights();
      ensureGalleryIndexScrollReadySoon();
    }
  }

  if (!isGalleryIndexScrollReady()) return;

  const page = getGalleryGridPageIndex();
  const lastPage = indexPageCount() - 1;
  const atBottom = isGalleryGridAtBottom(scroller);

  if (page === lastPage && atBottom) {
    if (galleryLastGridPageSeen !== lastPage) {
      disarmGalleryExitToPrints();
    }
  } else if (page < lastPage) {
    galleryExitToPrintsArmed = false;
    window.clearTimeout(galleryExitArmTimer);
    galleryGridBottomWheelAccum = 0;
  }

  galleryLastGridPageSeen = page;
}

function isPrintsDetailOpen() {
  return document.getElementById("printsLayout")?.dataset.mode === "detail";
}

function setGalleryNavExitMode(on) {
  const homeNav = document.querySelector(".site-nav__home");
  if (!homeNav) return;

  if (on) {
    if (!homeNav.hasAttribute("data-gallery-exit")) {
      galleryHomeScrollSection = homeNav.getAttribute("data-scroll-section") || "home";
    }
    homeNav.textContent = "exit";
    homeNav.removeAttribute("data-scroll-section");
    homeNav.setAttribute("data-gallery-exit", "");
    homeNav.hidden = false;
    return;
  }

  if (isPrintsDetailOpen()) return;

  homeNav.textContent = "home";
  homeNav.setAttribute("data-scroll-section", galleryHomeScrollSection);
  homeNav.removeAttribute("data-gallery-exit");
  homeNav.hidden = !document.body.classList.contains("is-past-home");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stemFromFile(file) {
  return file.replace(/\.[^.]+$/, "");
}

function previewSrc(file) {
  return `${PREVIEW_BASE}/${encodeURIComponent(stemFromFile(file))}.jpg${CACHE}`;
}

function viewSrc(file) {
  return `${VIEW_BASE}/${encodeURIComponent(stemFromFile(file))}.jpg${CACHE}`;
}

function itemPreviewSrc(item) {
  return item?.remotePreviewSrc || previewSrc(item.file);
}

function itemViewSrc(item) {
  return item?.remoteViewSrc || viewSrc(item.file);
}

function sanitySizedImageUrl(url, width) {
  if (!url || !String(url).includes("cdn.sanity.io/")) return url;
  const base = String(url).split("?")[0];
  return `${base}?w=${width}&auto=format&q=82`;
}

function originalSrc(file) {
  return `${ORIGINAL_BASE}/${encodeURIComponent(file)}${CACHE}`;
}

function isPriceSegment(part) {
  const s = part.trim();
  if (!s) return false;
  if (/contact for price|price on request|enquire for price|on application/i.test(s)) return true;
  if (/\bexcl\.?\s*vat\b/i.test(s)) return true;
  if (/^(US\$|USD|ZAR|GBP|EUR|R\$|\$)\s*[\d,]+(?:\.\d+)?/i.test(s)) return true;
  if (/^(US\$|USD|ZAR|GBP|EUR)[\d,]/i.test(s)) return true;
  if (/^(US\$|USD|ZAR|GBP|EUR)\s+[\d,.\s]+$/i.test(s) && !/\d\s*[x×]\s*\d/i.test(s)) return true;
  return false;
}

function splitDimensionsAndPrice(raw) {
  if (!raw) return { dimensions: "", price: "" };

  const parts = String(raw).split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  const dimensions = [];
  const prices = [];

  parts.forEach((part) => {
    if (isPriceSegment(part)) prices.push(part);
    else dimensions.push(part);
  });

  return {
    dimensions: dimensions.join(" · "),
    price: prices.join(" · "),
  };
}

function normalizeCatalogItem(item) {
  const parsed = splitDimensionsAndPrice(item.dimensions);
  return {
    ...item,
    dimensions: parsed.dimensions,
    price: item.price || parsed.price || "",
  };
}

async function loadGallerySgData() {
  try {
    const res = await fetch("pages/gallery-sg-data.json");
    if (res.ok) return await res.json();
  } catch (_) {
    /* offline / missing */
  }
  return { works: [], fileToTitle: {} };
}

function catalogFilesIndex(file, fallback = 0) {
  const index = FILES.indexOf(file);
  return index >= 0 ? index : fallback;
}

function sortCatalogItems(items) {
  return items
    .map((item) => ({
      item,
      filesIndex: catalogFilesIndex(item.file, item.filesIndex ?? 0),
    }))
    .sort((a, b) => {
      const yearA = parseInt(a.item.year, 10) || 0;
      const yearB = parseInt(b.item.year, 10) || 0;
      if (yearB !== yearA) return yearB - yearA;
      return a.filesIndex - b.filesIndex;
    })
    .map(({ item, filesIndex }) => ({ ...item, filesIndex }));
}

function mergeMissingGalleryPanels(catalog, sg, { preserveOrder = false } = {}) {
  const byTitle = Object.fromEntries(sg.works.map((w) => [w.title, w]));
  const presentFiles = new Set(catalog.map((c) => c.file));
  const titlesInCatalog = new Set(catalog.map((c) => c.title));

  for (const file of FILES) {
    if (presentFiles.has(file)) continue;

    const sgTitle = sg.fileToTitle?.[file];
    if (!sgTitle || !titlesInCatalog.has(sgTitle)) continue;

    const w = byTitle[sgTitle];
    if (!w) continue;
    if (pairUtils().catalogHasStackedTitle?.(catalog, w.title)) continue;

    catalog.push(
      normalizeCatalogItem({
        file,
        title: w.title,
        year: w.year,
        medium: w.medium,
        dimensions: w.dimensions,
        price: w.price,
        sold: Boolean(w.sold),
        filesIndex: catalogFilesIndex(file),
      })
    );
    presentFiles.add(file);
  }

  return preserveOrder ? catalog : sortCatalogItems(catalog);
}

function subtitleForItem(item, index) {
  const year = item.year || PLACEHOLDER_YEARS[item.filesIndex ?? index] || "";
  const parts = [];
  if (item.medium) parts.push(item.medium);
  if (year) parts.push(year);
  if (item.dimensions) parts.push(item.dimensions);
  return parts.join(" · ") || `${index + 1} of ${catalog.length}`;
}

function diptychPartnerItem(item) {
  const panels = getStackedPairPanels(item);
  if (!panels) return null;
  if (panels.top === item) return panels.bottom;
  if (panels.bottom === item) return panels.top;
  return panels.bottom;
}

function diptychStackMarkup(topItem, bottomItem, loading = "lazy") {
  const topPreview = itemPreviewSrc(topItem);
  const bottomPreview = itemPreviewSrc(bottomItem);
  const topView = itemViewSrc(topItem);
  const bottomView = itemViewSrc(bottomItem);

  return `
    <div class="gallery-rico__diptych">
      <img
        class="gallery-rico__img gallery-rico__img--diptych-top"
        src="${topPreview}"
        data-preview-src="${topPreview}"
        data-view-src="${topView}"
        alt="${escapeHtml(topItem.title)} (top panel)"
        loading="${loading}"
        decoding="async"
        draggable="false"
      />
      <img
        class="gallery-rico__img gallery-rico__img--diptych-bottom"
        src="${bottomPreview}"
        data-preview-src="${bottomPreview}"
        data-view-src="${bottomView}"
        alt="${escapeHtml(bottomItem.title)} (bottom panel)"
        loading="${loading}"
        decoding="async"
        draggable="false"
      />
    </div>
  `;
}

function frameHtml(item, index, isActive) {
  const panels = getStackedPairPanels(item);
  if (panels?.top && panels?.bottom) {
    const loading = index < 8 ? "eager" : "lazy";
    return `
        <figure class="gallery-rico__frame gallery-rico__frame--diptych${isActive ? " is-active" : ""}" data-art-index="${index}" aria-hidden="${isActive ? "false" : "true"}">
          ${diptychStackMarkup(panels.top, panels.bottom, loading)}
        </figure>
      `;
  }

  const preview = itemPreviewSrc(item);
  const view = itemViewSrc(item);
  const loading = index < 8 ? "eager" : "lazy";

  return `
    <figure class="gallery-rico__frame${isActive ? " is-active" : ""}" data-art-index="${index}" aria-hidden="${isActive ? "false" : "true"}">
      <img
        class="gallery-rico__img"
        src="${isActive ? preview : ""}"
        data-preview-src="${preview}"
        data-view-src="${view}"
        alt="${escapeHtml(item.title)}"
        loading="${loading}"
        decoding="async"
        draggable="false"
      />
    </figure>
  `;
}

function pillsHtml(activeIndex = 0) {
  return catalog
    .map((item, i) => {
      const active = i === activeIndex ? " is-active" : "";
      return `
        <button type="button" class="gallery-rico__pill${active}" data-index="${i}" aria-current="${i === activeIndex ? "true" : "false"}">
          <span class="gallery-rico__pill-label">${escapeHtml(item.title)}</span>
          <span class="gallery-rico__pill-dot" aria-hidden="true"></span>
        </button>
      `;
    })
    .join("");
}

function pillIndexAtCenter(nav) {
  const pills = nav.querySelectorAll(".gallery-rico__pill");
  if (!pills.length) return 0;

  const navRect = nav.getBoundingClientRect();
  const centerY = navRect.top + navRect.height / 2;
  let closest = 0;
  let minDist = Infinity;

  pills.forEach((pill) => {
    const index = Number(pill.dataset.index);
    if (!Number.isFinite(index)) return;

    const rect = pill.getBoundingClientRect();
    const pillCenter = rect.top + rect.height / 2;
    const dist = Math.abs(pillCenter - centerY);
    if (dist < minDist) {
      minDist = dist;
      closest = index;
    }
  });

  return closest;
}

function scrollPillToIndex(index, smooth = false) {
  const nav = document.getElementById("galleryRicoPills");
  const pill = nav?.querySelector(`.gallery-rico__pill[data-index="${index}"]`);
  if (!nav || !pill) return;
  if (pillIndexAtCenter(nav) === index) return;

  pillScrollSyncing = true;
  pill.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { pillScrollSyncing = false; });
  });
}

function syncPillActive(index, scroll = true) {
  const nav = document.getElementById("galleryRicoPills");
  if (!nav) return;

  nav.querySelectorAll(".gallery-rico__pill").forEach((pill) => {
    const i = Number(pill.dataset.index);
    const isActive = i === index;
    pill.classList.toggle("is-active", isActive);
    pill.setAttribute("aria-current", isActive ? "true" : "false");
  });

  if (scroll) scrollPillToIndex(index);
}

function detailsPanelHtml() {
  return `
    <dl class="gallery-rico__details">
      <div class="gallery-rico__detail">
        <dt>Medium</dt>
        <dd id="galleryRicoMedium">—</dd>
      </div>
      <div class="gallery-rico__detail">
        <dt>Year</dt>
        <dd id="galleryRicoYear">—</dd>
      </div>
      <div class="gallery-rico__detail">
        <dt>Dimensions</dt>
        <dd id="galleryRicoDimensions">—</dd>
      </div>
      <div class="gallery-rico__detail gallery-rico__detail--price" id="galleryRicoPriceRow" hidden>
        <dt>Price</dt>
        <dd id="galleryRicoPrice">—</dd>
      </div>
      <div class="gallery-rico__detail">
        <dt>Status</dt>
        <dd id="galleryRicoStatus">—</dd>
      </div>
    </dl>
  `;
}

function gridLayoutApi() {
  return window.galleryGridLayout || {};
}

function isMobileGrid() {
  return typeof window !== "undefined" && window.innerWidth < 600;
}

function gridLayout() {
  return gridLayoutApi().gridLayout?.(isMobileGrid()) || { cols: 3, rows: 2, perPage: 6 };
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

function buildIndexCellMarkup(item, index, placement = null) {
  const preview = itemPreviewSrc(item);
  const view = itemViewSrc(item);
  const loading = index < 6 ? "eager" : "lazy";
  const placementStyle = placement
    ? ` style="grid-column: ${placement.col}; grid-row: ${placement.row};"`
    : "";

  return `
    <button type="button" class="gallery-index__cell" data-art-index="${index}" aria-label="View ${escapeHtml(item.title)}"${placementStyle}>
      <img
        class="gallery-index__img"
        src="${preview}"
        data-preview-src="${preview}"
        data-view-src="${view}"
        alt="${escapeHtml(item.title)}"
        loading="${loading}"
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
    <div class="gallery-index" id="galleryIndex">
      <div class="gallery-index__scroller" id="galleryIndexScroller">${pagesHtml}</div>
    </div>
  `;
}

function coaPanelHtml() {
  return `
    <div class="gallery-rico__coa" id="galleryRicoCoa">
      <button
        type="button"
        class="gallery-rico__coa-toggle"
        id="galleryRicoCoaBtn"
        aria-expanded="false"
        aria-controls="galleryRicoCoaPanel"
      >
        Includes a Certificate of Authenticity
      </button>
      <div class="gallery-rico__coa-panel" id="galleryRicoCoaPanel">
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

function buildDetailShell() {
  return `
    <div class="gallery-rico gallery-rico--detail" id="galleryDetail">
      <header class="gallery-rico__head">
        <p class="gallery-rico__counter">Artwork Title</p>
        <h2 class="gallery-rico__title" id="galleryRicoTitle"></h2>
      </header>

      <div class="gallery-rico__body">
        <aside class="gallery-rico__aside gallery-rico__aside--left">
          <a class="gallery-rico__enquire" id="galleryRicoEnquire" href="mailto:Contact@maluleke.art">Enquire About This Artwork</a>
          ${coaPanelHtml()}
        </aside>

        <div class="gallery-rico__stage-wrap">
          <button type="button" class="gallery-rico__nav gallery-rico__nav--prev" id="galleryRicoPrev" aria-label="Previous artwork"><span aria-hidden="true">←</span></button>
          <div class="gallery-rico__stage" id="galleryRicoStage" aria-live="polite">
            <div
              class="gallery-rico__viewport"
              id="galleryRicoViewport"
              aria-label="Artwork"
            >
              ${catalog.map((item, i) => frameHtml(item, i, i === 0)).join("")}
            </div>
          </div>
          <button type="button" class="gallery-rico__nav gallery-rico__nav--next" id="galleryRicoNext" aria-label="Next artwork"><span aria-hidden="true">→</span></button>
        </div>

        <aside class="gallery-rico__aside gallery-rico__aside--right">
          ${detailsPanelHtml()}
        </aside>
      </div>
    </div>
  `;
}

function buildGalleryShell() {
  return `
    <div class="gallery-layout" id="galleryLayout" data-mode="grid">
      ${buildIndexMarkup()}
      ${buildDetailShell()}
    </div>
  `;
}

function scrollGridToIndex(index) {
  const scroller = document.getElementById("galleryIndexScroller");
  if (!scroller) return;

  const page = catalogPageForIndex(resolveGalleryNavIndex(index));
  const pageEl = scroller.querySelector(`.gallery-index__page[data-page="${page}"]`);
  if (pageEl) pageEl.scrollIntoView({ block: "start" });
}

function showGalleryGrid(options = {}) {
  collapseGalleryCoa();
  setGalleryImmersive(false);
  galleryViewMode = "grid";
  galleryDetailFitIndex = -1;
  galleryNavQueue = 0;
  galleryPageAnimating = false;
  galleryLockedSquareSize = null;
  resetGalleryViewportSize();

  const layout = document.getElementById("galleryLayout");
  if (layout) layout.dataset.mode = "grid";

  const scroller = document.getElementById("galleryIndexScroller");
  if (!scroller) return;

  if (options.resetScroll) scroller.scrollTop = 0;
  else if (Number.isFinite(currentGalleryIndex)) scrollGridToIndex(currentGalleryIndex);

  galleryLastGridPageSeen = -1;
  onGalleryGridPageChange();
  setGalleryNavExitMode(false);
  ensureGalleryIndexScrollReadySoon();
}

function openGalleryDetail(index) {
  index = resolveGalleryNavIndex(index);
  if (index < 0 || index >= catalog.length) return;

  galleryViewMode = "detail";

  const layout = document.getElementById("galleryLayout");
  if (layout) layout.dataset.mode = "detail";

  resetGalleryViewportSize();
  setGalleryNavExitMode(true);
  window.galleryGoToIndex?.(index, false);
  if (index >= catalog.length - 1) disarmGalleryExitToPrints();

  prefetchDetailImage(index);
  prefetchDetailImage(nextGalleryCatalogIndex(index, 1));
  prefetchDetailImage(nextGalleryCatalogIndex(index, -1));
  seedDetailImageFromGrid(index);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      activateDetailFrameImage(index);
      if (galleryImmersive) {
        const img = document
          .getElementById("galleryRicoStage")
          ?.querySelector(`.gallery-rico__frame[data-art-index="${index}"] img`);
        scheduleFitGalleryViewport(img?.dataset?.viewSrc);
      }
    });
  });

  const item = catalog[index];
  if (item && typeof window.trackArtworkView === "function") {
    window.trackArtworkView("paintings", item.title);
  }
}

function setGalleryDetail(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateGalleryDisplay(index, options = {}) {
  const item = catalog[index];
  if (!item) return;

  const titleEl = document.getElementById("galleryRicoTitle");
  const year = item.year || PLACEHOLDER_YEARS[item.filesIndex ?? index] || "";

  if (titleEl) titleEl.textContent = year ? `${item.title}, ${year}` : item.title;

  setGalleryDetail("galleryRicoMedium", item.medium || "—");
  setGalleryDetail("galleryRicoYear", year || "—");
  setGalleryDetail("galleryRicoDimensions", item.dimensions || "—");
  setGalleryDetail("galleryRicoStatus", item.sold ? "Sold" : "Available");

  const priceRow = document.getElementById("galleryRicoPriceRow");
  const showPrice = Boolean(item.price) && !item.sold;
  if (priceRow) priceRow.hidden = !showPrice;
  if (showPrice) setGalleryDetail("galleryRicoPrice", item.price);

  syncEnquiryLinks(item, "Paintings");

  if (galleryViewMode === "detail" && typeof window.trackArtworkView === "function") {
    window.trackArtworkView("paintings", item.title);
  }

  const prevBtn = document.getElementById("galleryRicoPrev");
  const nextBtn = document.getElementById("galleryRicoNext");
  if (prevBtn) {
    prevBtn.disabled = false;
    prevBtn.setAttribute(
      "aria-label",
      index <= 0 ? "Back to gallery grid" : "Previous artwork"
    );
  }
  if (nextBtn) nextBtn.disabled = index >= catalog.length - 1;

  if (options.skipFit || galleryViewMode !== "detail") return;

  const stage = document.getElementById("galleryRicoStage");
  const frame = stage?.querySelector(`.gallery-rico__frame[data-art-index="${index}"]`);
  if (!frame) return;

  resetGalleryViewportSize();
  galleryDetailFitIndex = index;

  const img = activateDetailFrameImage(index);
  if (!img) return;

  if (galleryImmersive) {
    setGalleryImmersiveFitPending(true);
    scheduleFitGalleryViewport(img.dataset.viewSrc);
    return;
  }

  const commitWhenReady = () => {
    if (galleryViewMode !== "detail" || galleryDetailFitIndex !== index) return;
    if (galleryImmersive) scheduleFitGalleryViewport(img.dataset.viewSrc);
  };

  if (img.complete && img.naturalWidth > 0 && imageSrcMatches(img, img.dataset.viewSrc)) {
    commitWhenReady();
    return;
  }

  img.addEventListener("load", commitWhenReady, { once: true });
  img.addEventListener("error", commitWhenReady, { once: true });
}

function initGalleryPageNav() {
  if (galleryNavInitialized) return;

  const stage = document.getElementById("galleryRicoStage");
  const ricoRoot = document.querySelector("#galleryGrid .gallery-rico");
  if (!stage || !ricoRoot) return;

  galleryNavInitialized = true;
  ensureGalleryStageResizeObserver();

  let animTimer = 0;

  function handoffToPrints() {
    if (galleryEdgeHandoff || window.siteScroll?.isTransitioning?.()) {
      galleryNavQueue = 0;
      return;
    }
    if (galleryPageAnimating || !galleryPrintsHandoffReady()) {
      galleryNavQueue = 0;
      return;
    }
    if (galleryViewMode === "grid" && !isGalleryIndexScrollReady()) {
      galleryNavQueue = 0;
      return;
    }
    if (galleryViewMode === "grid" && !isGalleryGridAtBottom()) {
      galleryNavQueue = 0;
      return;
    }

    galleryNavQueue = 0;
    galleryPageAnimating = false;
    window.clearTimeout(animTimer);
    galleryEdgeHandoff = true;
    window.printsRefreshScrollFx?.();
    window.siteScroll?.scrollToSection?.("prints", { resetScroll: false });
    window.setTimeout(() => { galleryEdgeHandoff = false; }, 1040);
  }

  function clampIndex(index) {
    return resolveGalleryNavIndex(Math.max(0, Math.min(catalog.length - 1, index)));
  }

  function clearFrameAnimClasses(frame) {
    frame.classList.remove(
      "is-enter-from-right",
      "is-enter-from-left",
      "is-leave-to-left",
      "is-leave-to-right"
    );
  }

  function applyStepDuration() {
    const ms = galleryStepMs(galleryNavQueue);
    ricoRoot.style.setProperty("--gr-step-ms", `${ms}ms`);
    return ms;
  }

  function finishStep(next) {
    if (!galleryPageAnimating) return;
    window.clearTimeout(animTimer);
    stage.querySelectorAll(".gallery-rico__frame").forEach((frame) => {
      const frameIndex = Number(frame.dataset.artIndex);
      clearFrameAnimClasses(frame);
      frame.classList.toggle("is-active", frameIndex === next);
      frame.setAttribute("aria-hidden", frameIndex === next ? "false" : "true");
    });
    galleryPageAnimating = false;
    activateDetailFrameImage(next);
    if (next >= catalog.length - 1) {
      // Spillover from fast scrolling was meant to reach the last slide, not exit.
      galleryNavQueue = 0;
      galleryWheelLocked = false;
      window.clearTimeout(galleryWheelLockTimer);
      wheelAccum = 0;
      disarmGalleryExitToPrints();
    } else {
      galleryExitToPrintsArmed = true;
      window.clearTimeout(galleryExitArmTimer);
    }
    processNavQueue();
  }

  function performStep(next) {
    const currentFrame = stage.querySelector(
      `.gallery-rico__frame[data-art-index="${currentGalleryIndex}"]`
    );
    const nextFrame = stage.querySelector(`.gallery-rico__frame[data-art-index="${next}"]`);
    if (!currentFrame || !nextFrame) {
      galleryPageAnimating = false;
      processNavQueue();
      return;
    }

    const direction = next > currentGalleryIndex ? 1 : -1;
    const queued = galleryNavQueue !== 0;
    const stepMs = applyStepDuration();

    galleryPageAnimating = true;

    clearFrameAnimClasses(currentFrame);
    clearFrameAnimClasses(nextFrame);

    if (queued) {
      currentFrame.classList.remove("is-active");
      currentFrame.setAttribute("aria-hidden", "true");
    } else {
      currentFrame.classList.add(direction > 0 ? "is-leave-to-left" : "is-leave-to-right");
    }

    nextFrame.classList.add(direction > 0 ? "is-enter-from-right" : "is-enter-from-left");
    nextFrame.classList.add("is-active");
    nextFrame.setAttribute("aria-hidden", "false");

    currentGalleryIndex = next;
    collapseGalleryCoa();
    updateGalleryDisplay(next);

    window.clearTimeout(animTimer);
    animTimer = window.setTimeout(() => finishStep(next), stepMs);
  }

  function processNavQueue() {
    if (galleryPageAnimating || galleryNavQueue === 0) return;

    if (galleryNavQueue > 0) {
      if (currentGalleryIndex >= catalog.length - 1) {
        handoffToPrints();
        return;
      }
      galleryNavQueue -= 1;
      performStep(nextGalleryCatalogIndex(currentGalleryIndex, 1));
      return;
    }

    if (currentGalleryIndex <= 0) {
      galleryNavQueue = 0;
      showGalleryGrid();
      return;
    }

    galleryNavQueue += 1;
    performStep(nextGalleryCatalogIndex(currentGalleryIndex, -1));
  }

  function enqueueStep(delta) {
    if (delta === 0 || galleryEdgeHandoff) return;
    if (window.siteScroll?.isTransitioning?.()) return;
    galleryNavQueue += delta > 0 ? 1 : -1;
    processNavQueue();
  }

  function syncQueueToTarget(targetIndex) {
    const target = clampIndex(targetIndex);
    if (target === currentGalleryIndex && galleryNavQueue === 0) return;

    if (Math.abs(target - currentGalleryIndex) !== 1) {
      galleryNavQueue = 0;
      goToIndex(target, false);
      return;
    }

    const projected = currentGalleryIndex + galleryNavQueue;
    const delta = target - projected;
    if (delta === 0) return;
    galleryNavQueue += delta;
    processNavQueue();
  }

  function goToIndex(index, smooth = true) {
    const next = clampIndex(index);
    if (next === currentGalleryIndex && smooth) return;

    if (!smooth) {
      galleryNavQueue = 0;
      galleryPageAnimating = false;
      window.clearTimeout(animTimer);

      stage.querySelectorAll(".gallery-rico__frame").forEach((frame) => {
        const frameIndex = Number(frame.dataset.artIndex);
        clearFrameAnimClasses(frame);
        frame.classList.toggle("is-active", frameIndex === next);
        frame.setAttribute("aria-hidden", frameIndex === next ? "false" : "true");
      });
      currentGalleryIndex = next;
      collapseGalleryCoa();
      updateGalleryDisplay(next);
      return;
    }

    syncQueueToTarget(next);
  }

  let wheelAccum = 0;
  let wheelResetTimer = 0;
  let galleryWheelLocked = false;
  let galleryWheelLockTimer = 0;

  function lockGalleryWheel(ms) {
    galleryWheelLocked = true;
    wheelAccum = 0;
    window.clearTimeout(galleryWheelLockTimer);
    galleryWheelLockTimer = window.setTimeout(() => {
      galleryWheelLocked = false;
      wheelAccum = 0;
    }, ms);
  }

  function tryGalleryWheelStep(direction) {
    if (galleryWheelLocked || galleryPageAnimating || galleryNavQueue !== 0) return false;
    enqueueStep(direction);
    lockGalleryWheel(galleryStepMs(0) + 160);
    return true;
  }

  function onGalleryWheelInPills(e) {
    if (document.body.dataset.currentSection !== "paintings") return;
    if (galleryViewMode !== "detail") return;
    if (galleryEdgeHandoff || window.siteScroll?.isTransitioning?.()) return;

    const useY = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
    const delta = useY ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 2) return;

    e.preventDefault();
    e.stopPropagation();

    if (galleryPageAnimating) return;

    const atLastSlide = currentGalleryIndex >= catalog.length - 1;

    if (atLastSlide && delta > 0) {
      if (!galleryPrintsHandoffReady()) {
        wheelAccum = 0;
        return;
      }

      wheelAccum += delta;
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => { wheelAccum = 0; }, 150);

      if (wheelAccum >= GALLERY_WHEEL_THRESHOLD) {
        wheelAccum = 0;
        handoffToPrints();
      }
      return;
    }

    if (galleryWheelLocked || galleryNavQueue !== 0) return;

    wheelAccum += delta;
    window.clearTimeout(wheelResetTimer);
    wheelResetTimer = window.setTimeout(() => { wheelAccum = 0; }, 150);

    if (Math.abs(wheelAccum) >= GALLERY_WHEEL_THRESHOLD) {
      const direction = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      tryGalleryWheelStep(direction);
    }
  }

  const navArea = ricoRoot.querySelector(".gallery-rico__stage-wrap") || ricoRoot;
  navArea.addEventListener("wheel", onGalleryWheelInPills, { passive: false });

  let touchStartY = 0;
  navArea.addEventListener("touchstart", (e) => {
    if (galleryViewMode !== "detail") return;
    touchStartY = e.touches[0]?.clientY ?? 0;
  }, { passive: true });

  navArea.addEventListener("touchend", (e) => {
    if (document.body.dataset.currentSection !== "paintings") return;
    if (galleryViewMode !== "detail") return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaY) < 30) return;

    enqueueStep(deltaY < 0 ? 1 : -1);
  }, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (document.body.dataset.currentSection !== "paintings") return;
    if (galleryViewMode !== "detail") return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      enqueueStep(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      enqueueStep(-1);
    }
  });

  window.galleryGoToIndex = goToIndex;
  window.galleryEnqueueStep = enqueueStep;
  window.gallerySyncQueueToTarget = syncQueueToTarget;
  scheduleGallerySync = () => {
    updateGalleryDisplay(currentGalleryIndex);
  };
}

function initGalleryIndexNav() {
  if (galleryIndexInitialized) return;

  const galleryGrid = document.getElementById("galleryGrid");
  const scroller = document.getElementById("galleryIndexScroller");
  if (!galleryGrid || !scroller) return;

  galleryIndexInitialized = true;

  scroller.addEventListener("scroll", onGalleryGridPageChange, { passive: true });
  onGalleryGridPageChange();

  galleryGrid.addEventListener("click", (event) => {
    if (galleryViewMode !== "grid") return;
    const cell = event.target.closest(".gallery-index__cell");
    if (!cell) return;
    const index = Number(cell.dataset.artIndex);
    if (!Number.isFinite(index)) return;
    event.preventDefault();
    openGalleryDetail(index);
  });

  galleryGrid.addEventListener(
    "pointerenter",
    (event) => {
      if (galleryViewMode !== "grid") return;
      const cell = event.target.closest(".gallery-index__cell");
      if (!cell) return;
      const index = Number(cell.dataset.artIndex);
      if (Number.isFinite(index)) prefetchDetailImage(index);
    },
    true
  );

  galleryGrid.addEventListener("keydown", (event) => {
    if (galleryViewMode !== "grid") return;
    if (event.key !== "Enter" && event.key !== " ") return;
    const cell = event.target.closest(".gallery-index__cell");
    if (!cell) return;
    event.preventDefault();
    const index = Number(cell.dataset.artIndex);
    if (Number.isFinite(index)) openGalleryDetail(index);
  });

  const GRID_EDGE_DEBOUNCE_MS = 250;

  let gridDownHitCount = 0;
  let gridDownHitTimer = 0;
  let gridDownLastTime = 0;

  let gridUpHitCount = 0;
  let gridUpHitTimer = 0;
  let gridUpLastTime = 0;

  function prepSectionHandoff(targetSlug) {
    if (targetSlug === "prints") window.printsRefreshScrollFx?.();
    if (targetSlug === "maquettes") window.maquettesRefreshScrollFx?.();
  }

  function doGridHandoff(targetSlug) {
    if (!isGalleryIndexScrollReady()) return;
    if (targetSlug === "prints" && !galleryPrintsHandoffReady()) return;
    if (targetSlug === "prints" && !isGalleryGridAtBottom(scroller)) return;
    prepSectionHandoff(targetSlug);
    if (targetSlug === "prints") {
      syncGalleryIndexPageHeights();
      clampGalleryIndexScroll(scroller);
    }
    galleryEdgeHandoff = true;
    window.siteScroll?.scrollToSection?.(targetSlug, { resetScroll: false });
    window.setTimeout(() => { galleryEdgeHandoff = false; }, 1040);
  }

  scroller.addEventListener(
    "wheel",
    (event) => {
      if (document.body.dataset.currentSection !== "paintings") return;
      if (galleryViewMode !== "grid") return;
      if (galleryEdgeHandoff || window.siteScroll?.isTransitioning?.()) return;

      if (!isGalleryIndexScrollReady()) {
        event.preventDefault();
        event.stopPropagation();
        ensureGalleryIndexScrollReadySoon();
        return;
      }

      const atTop = isGalleryGridAtTop(scroller);
      const atBottom = isGalleryGridAtBottom(scroller);
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

        if (!galleryEdgesArmed()) return;

        const now = Date.now();
        if (now - gridUpLastTime < GRID_EDGE_DEBOUNCE_MS) return;
        gridUpLastTime = now;

        gridDownHitCount = 0;
        gridUpHitCount += 1;
        window.clearTimeout(gridUpHitTimer);
        gridUpHitTimer = window.setTimeout(() => { gridUpHitCount = 0; }, 1200);

        if (gridUpHitCount < edgeHitsRequired("info")) return;

        gridUpHitCount = 0;
        doGridHandoff("info");
        return;
      }

      if (atBottom && event.deltaY > 0) {
        if (!galleryPrintsHandoffReady()) {
          galleryGridBottomWheelAccum = 0;
          if (!galleryEdgesArmedFor("prints")) {
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!galleryEdgesArmedFor("prints")) return;

        galleryGridBottomWheelAccum += event.deltaY;
        window.clearTimeout(galleryGridBottomWheelResetTimer);
        galleryGridBottomWheelResetTimer = window.setTimeout(() => {
          galleryGridBottomWheelAccum = 0;
        }, 150);

        if (galleryGridBottomWheelAccum < GALLERY_WHEEL_THRESHOLD) return;

        galleryGridBottomWheelAccum = 0;
        doGridHandoff("prints");
        return;
      }

      event.stopPropagation();
    },
    { passive: false }
  );

  let indexTouchStartY = 0;

  scroller.addEventListener(
    "touchstart",
    (event) => {
      if (galleryViewMode !== "grid") return;
      indexTouchStartY = event.touches[0]?.clientY ?? 0;
    },
    { passive: true }
  );

  let touchDownHitCount = 0;
  let touchDownHitTimer = 0;
  let touchUpHitCount = 0;
  let touchUpHitTimer = 0;
  let touchBottomHitCount = 0;
  let touchBottomHitTimer = 0;

  scroller.addEventListener(
    "touchend",
    (event) => {
      if (document.body.dataset.currentSection !== "paintings") return;
      if (galleryViewMode !== "grid") return;
      if (galleryEdgeHandoff || window.siteScroll?.isTransitioning?.()) return;
      if (!isGalleryIndexScrollReady()) {
        ensureGalleryIndexScrollReadySoon();
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaY = touch.clientY - indexTouchStartY;
      const atTop = isGalleryGridAtTop(scroller);
      const atBottom = isGalleryGridAtBottom(scroller);

      if (atTop && deltaY > 36) {
        if (!galleryEdgesArmed()) return;

        touchDownHitCount = 0;
        touchUpHitCount += 1;
        window.clearTimeout(touchUpHitTimer);
        touchUpHitTimer = window.setTimeout(() => { touchUpHitCount = 0; }, 1200);

        if (touchUpHitCount < edgeHitsRequired("info")) return;

        touchUpHitCount = 0;
        doGridHandoff("info");
        return;
      }

      if (atBottom && deltaY < -36) {
        if (!galleryPrintsHandoffReady() || !isGalleryIndexScrollReady()) return;
        if (!galleryEdgesArmedFor("prints")) return;

        touchBottomHitCount = 0;
        doGridHandoff("prints");
      }
    },
    { passive: true }
  );
}

function isGalleryMobileDetail() {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth < 768 ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
}

function initGalleryImmersiveTap() {
  const grid = document.getElementById("galleryGrid");
  if (!grid || grid.dataset.immersiveTapBound === "1") return;
  grid.dataset.immersiveTapBound = "1";

  let activePointer = null;

  grid.addEventListener(
    "pointerdown",
    (event) => {
      if (galleryViewMode !== "detail") return;
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

      if (galleryViewMode !== "detail") return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 16) return;

      const hit = document.elementFromPoint(event.clientX, event.clientY);
      if (!hit?.closest(".gallery-rico__frame.is-active")) return;
      if (hit.closest(".gallery-rico__nav")) return;

      event.preventDefault();
      toggleGalleryImmersive();
    },
    { passive: false }
  );

  grid.addEventListener("pointercancel", () => {
    activePointer = null;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (galleryViewMode !== "detail" || !galleryImmersive) return;
    event.preventDefault();
    setGalleryImmersive(false);
  });
}

let galleryImmersiveStageObserver = null;

function observeGalleryStageForImmersiveFit() {
  galleryImmersiveStageObserver?.disconnect();
  galleryImmersiveStageObserver = null;
  if (!galleryImmersive || typeof ResizeObserver === "undefined") return;

  const stageWrap = document.querySelector("#galleryDetail .gallery-rico__stage-wrap");
  const stage = document.getElementById("galleryRicoStage");
  const target = stageWrap || stage;
  if (!target) return;

  galleryImmersiveStageObserver = new ResizeObserver(() => {
    if (!galleryImmersive || galleryViewMode !== "detail") return;
    if (!document.getElementById("galleryDetail")?.classList.contains("is-fit-pending")) return;

    resetGalleryImmersiveStageStability();
    const viewport = document.getElementById("galleryRicoViewport");
    const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
    scheduleFitGalleryViewport(img?.dataset.viewSrc);
  });
  galleryImmersiveStageObserver.observe(target);
}

function setGalleryImmersive(on) {
  galleryImmersive = Boolean(on);
  const detail = document.getElementById("galleryDetail");
  detail?.classList.toggle("is-immersive", galleryImmersive);
  galleryLockedSquareSize = null;
  resetGalleryViewportSize();

  if (!galleryImmersive) {
    setGalleryImmersiveFitPending(false);
    galleryImmersiveStageObserver?.disconnect();
    galleryImmersiveStageObserver = null;
    galleryFitRetries = 0;
  } else {
    galleryFitRetries = 0;
    resetGalleryImmersiveStageStability();
    setGalleryImmersiveFitPending(true);

    const viewport = document.getElementById("galleryRicoViewport");
    const frame = viewport?.querySelector(".gallery-rico__frame.is-active");
    const { nw, nh } = getFrameNaturalSize(frame);
    if (viewport && nw && nh) {
      applyGalleryImmersiveViewportFit(viewport, nw, nh);
      setGalleryImmersiveFitPending(false);
    }
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      observeGalleryStageForImmersiveFit();
      const viewport = document.getElementById("galleryRicoViewport");
      const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
      scheduleFitGalleryViewport(img?.dataset.viewSrc);
    });
  });
}

function toggleGalleryImmersive() {
  setGalleryImmersive(!galleryImmersive);
}

function initGalleryInteractions() {
  if (galleryInteractionsInitialized) return;
  galleryInteractionsInitialized = true;

  const prevBtn = document.getElementById("galleryRicoPrev");
  const nextBtn = document.getElementById("galleryRicoNext");

  prevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    window.galleryEnqueueStep?.(-1);
  });

  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    window.galleryEnqueueStep?.(1);
  });

  initGalleryCoaDisclosure();
}

function collapseGalleryCoa() {
  const root = document.getElementById("galleryRicoCoa");
  const toggle = document.getElementById("galleryRicoCoaBtn");
  if (!root?.classList.contains("is-open")) return;
  root.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");
}

function initGalleryCoaDisclosure() {
  const root = document.getElementById("galleryRicoCoa");
  const toggle = document.getElementById("galleryRicoCoaBtn");
  if (!root || !toggle || root.dataset.coaBound) return;

  root.dataset.coaBound = "1";

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const open = root.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("keydown", (e) => {
    if (document.body.dataset.currentSection !== "paintings") return;
    if (galleryViewMode !== "detail") return;
    if (!root.classList.contains("is-open")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      collapseGalleryCoa();
    }
  });
}

function fixGalleryHeights() {
  const vh = window.innerHeight;
  const section = document.getElementById("section-gallery");
  const page = section?.querySelector(".gallery-page");
  const grid = document.getElementById("galleryGrid");

  if (section) section.style.height = `${vh}px`;
  if (page) page.style.height = `${vh}px`;
  if (grid) {
    grid.style.height = `${vh}px`;
    grid.style.maxHeight = `${vh}px`;
  }

  syncGalleryIndexPageHeights();
}

function normalizeImageUrl(url) {
  if (!url) return "";
  const s = String(url);
  try {
    const parsed = new URL(s, window.location.origin);
    const w = parsed.searchParams.get("w");
    const path = parsed.pathname;
    return w ? `${path}?w=${w}` : path;
  } catch {
    const path = s.split("?")[0];
    if (path.includes("gallery-preview")) return `${path}:preview`;
    if (path.includes("gallery-view")) return `${path}:view`;
    return path;
  }
}

function imageSrcMatches(img, url) {
  if (!img || !url) return false;
  const current = img.currentSrc || img.src || "";
  return normalizeImageUrl(current) === normalizeImageUrl(url);
}

function clearDetailImagePresentation(viewport) {
  viewport?.querySelectorAll(".gallery-rico__img").forEach((img) => {
    img.style.removeProperty("transform");
    img.style.removeProperty("transform-origin");
  });
}

function syncActiveFrameImage(index) {
  const stage = document.getElementById("galleryRicoStage");
  if (!stage) return null;

  let firstImg = null;

  stage.querySelectorAll(".gallery-rico__frame").forEach((frame) => {
    const frameIndex = Number(frame.dataset.artIndex);
    const isTarget = frameIndex === index;
    const isAnimating =
      frame.classList.contains("is-enter-from-right") ||
      frame.classList.contains("is-enter-from-left") ||
      frame.classList.contains("is-leave-to-left") ||
      frame.classList.contains("is-leave-to-right");

    if (!isTarget && !isAnimating && !frame.classList.contains("is-active")) {
      frame.querySelectorAll(".gallery-rico__img").forEach((img) => {
        img.removeAttribute("src");
      });
    }

    if (!isTarget) return;

    const imgs = [...frame.querySelectorAll(".gallery-rico__img")];
    firstImg = imgs[0] || null;

    imgs.forEach((img) => {
      const view = img.dataset.viewSrc;
      const preview = img.dataset.previewSrc;
      if (!view) return;

      img.style.removeProperty("transform");
      img.style.removeProperty("transform-origin");
      img.loading = "eager";

      if (imageSrcMatches(img, view) && img.complete && img.naturalWidth > 0) return;

      const upgradeToView = () => {
        if (Number(frame.dataset.artIndex) !== index) return;
        if (!frame.classList.contains("is-active")) return;
        img.src = view;
        if (galleryViewMode === "detail") {
          scheduleFitGalleryViewport(view);
        }
      };

      if (window.ImagePreloadCache?.has(view)) {
        img.src = view;
        window.ImagePreloadCache.load(view).then((cached) => {
          if (cached?.naturalWidth) upgradeToView();
        });
      } else if (preview && !imageSrcMatches(img, view)) {
        img.src = preview;
        window.ImagePreloadCache?.load(view).then((cached) => {
          if (cached?.naturalWidth) upgradeToView();
        });
      } else {
        img.src = view;
        window.ImagePreloadCache?.load(view);
      }
    });
  });

  return firstImg;
}

function seedDetailImageFromGrid(index) {
  const gridCell = document.querySelector(
    `#galleryGrid .gallery-index__cell[data-art-index="${index}"]`
  );
  const detailFrame = document.querySelector(
    `#galleryRicoStage .gallery-rico__frame[data-art-index="${index}"]`
  );
  if (!gridCell || !detailFrame) return;

  const gridImgs = [...gridCell.querySelectorAll(".gallery-index__img")];
  const detailImgs = [...detailFrame.querySelectorAll(".gallery-rico__img")];

  detailImgs.forEach((img, i) => {
    const gridImg = gridImgs[i] || gridImgs[0];
    const loaded = gridImg?.currentSrc || gridImg?.src;
    if (!loaded || loaded === window.location.href) return;
    if (!imageSrcMatches(img, loaded)) {
      img.src = loaded;
    }
  });
}

function activateDetailFrameImage(index) {
  return syncActiveFrameImage(index);
}

function resetGalleryViewportSize() {
  const viewport = document.getElementById("galleryRicoViewport");
  galleryLockedSquareSize = null;
  if (!viewport) return;
  clearDetailImagePresentation(viewport);
  viewport.classList.remove("is-sized");
  viewport.removeAttribute("data-gallery-aspect");
  viewport.removeAttribute("data-gallery-fit-mode");
  viewport.style.removeProperty("width");
  viewport.style.removeProperty("height");
  viewport.style.removeProperty("max-width");
  viewport.style.removeProperty("max-height");
  viewport.style.removeProperty("aspect-ratio");
  viewport.style.removeProperty("--gallery-art-ratio");
  galleryFitToken += 1;
}

let galleryStageResizeObserver = null;
let galleryFitRetries = 0;
let galleryFitToken = 0;

function looksLikePartialDecode(nw, nh) {
  if (!nw || !nh) return true;
  const ratio = nw / nh;
  // Only catch extreme partial JPEG row decodes (e.g. square 2380×945),
  // not normal landscape/portrait artwork aspects.
  return ratio > 2.35 || ratio < 0.42;
}

function isNearlySquare(nw, nh) {
  return Math.abs(nw - nh) / Math.max(nw, nh) < 0.02;
}

async function waitForGalleryImageReady(img, expectedSrc) {
  if (!img) return;

  const isReady = () =>
    img.complete &&
    img.naturalWidth > 0 &&
    img.naturalHeight > 0 &&
    (!expectedSrc || imageSrcMatches(img, expectedSrc));

  if (!isReady()) {
    await new Promise((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      setTimeout(done, 10000);
    });
  }

  if (typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {}
  }
}

function prefetchDetailImage(index) {
  const item = catalog[index];
  if (!item) return;
  const view = itemViewSrc(item);
  if (!view) return;
  if (window.ImagePreloadCache) {
    window.ImagePreloadCache.load(view);
    return;
  }
  const loader = new Image();
  loader.decoding = "async";
  loader.src = view;
}

function ensureGalleryStageResizeObserver() {
  if (galleryStageResizeObserver) return;
  galleryStageResizeObserver = true;

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    if (galleryViewMode !== "detail" || !galleryImmersive) return;
    galleryLockedSquareSize = null;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const viewport = document.getElementById("galleryRicoViewport");
      const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
      scheduleFitGalleryViewport(img?.dataset.viewSrc);
    }, 150);
  });
}

let pendingFitSrc = null;

function scheduleFitGalleryViewport(expectedSrc) {
  const token = ++galleryFitToken;
  pendingFitSrc = expectedSrc || null;
  window.requestAnimationFrame(() => {
    ensureGalleryViewportFit(token, pendingFitSrc);
  });
}

const GALLERY_VIEWPORT_MAX = 720;
const GALLERY_FIT_MAX_RETRIES = 32;
const GALLERY_DETAIL_HEAD_RESERVE = 96;
const GALLERY_DETAIL_NAV_RESERVE = 96;
const GALLERY_IMMERSIVE_STAGE_H_RATIO = 0.88;

let galleryLockedSquareSize = null;
let galleryImmersiveLastStageH = -1;
let galleryImmersiveStableStageCount = 0;

function resetGalleryImmersiveStageStability() {
  galleryImmersiveLastStageH = -1;
  galleryImmersiveStableStageCount = 0;
}

function getGalleryNavColumnMetrics() {
  const stageWrap = document.querySelector("#galleryDetail .gallery-rico__stage-wrap");
  const prev = document.getElementById("galleryRicoPrev");
  const next = document.getElementById("galleryRicoNext");
  const prevW = prev?.offsetWidth || 36;
  const nextW = next?.offsetWidth || 36;
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

function getGalleryImmersiveStageSize() {
  const stageWrap = document.querySelector("#galleryDetail .gallery-rico__stage-wrap");
  const stage = document.getElementById("galleryRicoStage");
  const prev = document.getElementById("galleryRicoPrev");
  const next = document.getElementById("galleryRicoNext");

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

function getGalleryImmersiveTargetMetrics() {
  const detail = document.getElementById("galleryDetail");
  const style = detail ? getComputedStyle(detail) : null;
  return getGalleryImmersiveWindowMetrics(style);
}

function getGalleryImmersiveTargetStageH() {
  return getGalleryImmersiveTargetMetrics().maxH;
}

function immersiveLayoutReady() {
  const { stageW, stageH } = getGalleryImmersiveStageSize();
  const targetH = getGalleryImmersiveTargetStageH();
  if (stageW < 200 || targetH < 240) return false;
  return stageH >= Math.round(targetH * GALLERY_IMMERSIVE_STAGE_H_RATIO);
}

function immersiveStageSizeStable() {
  if (!immersiveLayoutReady()) {
    resetGalleryImmersiveStageStability();
    return false;
  }

  const { stageH } = getGalleryImmersiveStageSize();
  if (Math.abs(stageH - galleryImmersiveLastStageH) <= 2) {
    galleryImmersiveStableStageCount += 1;
  } else {
    galleryImmersiveLastStageH = stageH;
    galleryImmersiveStableStageCount = 1;
  }

  return galleryImmersiveStableStageCount >= 2;
}

function setGalleryImmersiveFitPending(on) {
  document.getElementById("galleryDetail")?.classList.toggle("is-fit-pending", Boolean(on));
}

function getGalleryImmersiveWindowMetrics(detailStyle) {
  const padTop = detailStyle ? parseFloat(detailStyle.paddingTop) : 56;
  const padBottom = detailStyle ? parseFloat(detailStyle.paddingBottom) : 6;
  const padLeft = detailStyle ? parseFloat(detailStyle.paddingLeft) : 8;
  const padRight = detailStyle ? parseFloat(detailStyle.paddingRight) : 8;
  const { reserve } = getGalleryNavColumnMetrics();

  return {
    maxW: Math.max(240, Math.floor(window.innerWidth - padLeft - padRight - reserve)),
    maxH: Math.max(240, Math.floor(window.innerHeight - padTop - padBottom)),
  };
}

function getGalleryImmersiveFitMetrics(detailStyle) {
  const { stageW, stageH } = getGalleryImmersiveStageSize();
  if (stageW > 80 && stageH > 80) {
    return {
      maxW: Math.max(240, Math.floor(stageW)),
      maxH: Math.max(240, Math.floor(stageH)),
    };
  }
  return getGalleryImmersiveWindowMetrics(detailStyle);
}

function getGalleryDetailFitMetrics() {
  const detail = document.getElementById("galleryDetail");
  const style = detail ? getComputedStyle(detail) : null;
  const padTop = style ? parseFloat(style.paddingTop) : 72;
  const padBottom = style ? parseFloat(style.paddingBottom) : 14;
  const padLeft = style ? parseFloat(style.paddingLeft) : 32;
  const padRight = style ? parseFloat(style.paddingRight) : 32;
  const innerW = window.innerWidth - padLeft - padRight;

  if (galleryImmersive) {
    return getGalleryImmersiveFitMetrics(style);
  }

  if (isGalleryMobileDetail()) {
    const { stageW, stageH } = getGalleryImmersiveStageSize();
    const { reserve } = getGalleryNavColumnMetrics();

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
        Math.round(window.innerHeight * (galleryImmersive ? 0.72 : 0.46))
      ),
    };
  }

  const gap = 28;
  const centerCol = (innerW - 2 * gap) * (2.4 / 4.4);
  const maxW = Math.min(
    Math.max(Math.round(centerCol - GALLERY_DETAIL_NAV_RESERVE), 320),
    GALLERY_VIEWPORT_MAX
  );
  const maxH = Math.max(
    200,
    Math.round(window.innerHeight - padTop - padBottom - GALLERY_DETAIL_HEAD_RESERVE)
  );
  return { maxW, maxH };
}

function computeGalleryViewportSize(nw, nh, maxW, maxH) {
  const scale = Math.min(maxW / nw, maxH / nh);
  return {
    w: Math.max(1, Math.round(nw * scale)),
    h: Math.max(1, Math.round(nh * scale)),
  };
}

function getFrameNaturalSize(frame) {
  if (!frame) return { nw: 0, nh: 0 };

  if (frame.classList.contains("gallery-rico__frame--diptych")) {
    const imgs = [...frame.querySelectorAll(".gallery-rico__img")];
    if (imgs.length !== 2) return { nw: 0, nh: 0 };
    const [topImg, bottomImg] = imgs;
    if (!topImg.naturalWidth || !topImg.naturalHeight || !bottomImg.naturalWidth || !bottomImg.naturalHeight) {
      return { nw: 0, nh: 0 };
    }
    return {
      nw: Math.max(topImg.naturalWidth, bottomImg.naturalWidth),
      nh: topImg.naturalHeight + bottomImg.naturalHeight,
    };
  }

  const img = frame.querySelector(".gallery-rico__img");
  return {
    nw: img?.naturalWidth || 0,
    nh: img?.naturalHeight || 0,
  };
}

function getGalleryTargetViewportSize(nw, nh) {
  const { maxW, maxH } = getGalleryDetailFitMetrics();

  if (galleryImmersive) {
    if (looksLikePartialDecode(nw, nh)) {
      const side = Math.min(maxW, maxH);
      return { w: side, h: side };
    }
    return computeGalleryViewportSize(nw, nh, maxW, maxH);
  }

  if (looksLikePartialDecode(nw, nh)) {
    const side = Math.min(maxW, maxH);
    return { w: side, h: side };
  }

  if (isNearlySquare(nw, nh)) {
    const sized = computeGalleryViewportSize(nw, nh, maxW, maxH);
    const side = Math.min(sized.w, sized.h);
    return { w: side, h: side };
  }

  return computeGalleryViewportSize(nw, nh, maxW, maxH);
}

function viewportNeedsRefit(viewport, frame) {
  if (!viewport || !frame) return true;

  const fitMode = galleryImmersive ? "immersive" : "detail";
  if (viewport.dataset.galleryFitMode !== fitMode) return true;

  if (galleryImmersive) {
    return !viewport.classList.contains("is-sized") || !immersiveLayoutReady();
  }

  const { nw, nh } = getFrameNaturalSize(frame);
  if (!nw || !nh) return true;

  if (!viewport.classList.contains("is-sized")) return true;

  const { w: targetW, h: targetH } = getGalleryTargetViewportSize(nw, nh);
  return (
    Math.abs(viewport.offsetWidth - targetW) > 8 ||
    Math.abs(viewport.offsetHeight - targetH) > 8
  );
}

function applyGalleryImmersiveViewportFit(viewport, nw, nh) {
  viewport.style.removeProperty("width");
  viewport.style.removeProperty("height");
  viewport.style.removeProperty("max-width");
  viewport.style.removeProperty("max-height");
  viewport.style.removeProperty("--gallery-art-ratio");
  viewport.dataset.galleryFitMode = "immersive";
  if (nw && nh) viewport.dataset.galleryAspect = String(nw / nh);
  viewport.classList.add("is-sized");
}

function applyGalleryViewportFit(viewport, nw, nh) {
  if (!galleryImmersive) {
    clearDetailImagePresentation(viewport);
    return;
  }

  applyGalleryImmersiveViewportFit(viewport, nw, nh);
}

function fitGalleryViewportSync(index) {
  const viewport = document.getElementById("galleryRicoViewport");
  const stage = document.getElementById("galleryRicoStage");
  const frame = stage?.querySelector(`.gallery-rico__frame[data-art-index="${index}"]`);
  const img = frame?.querySelector("img");
  if (!viewport || !img || img.naturalWidth === 0 || img.naturalHeight === 0) return false;
  applyGalleryViewportFit(viewport, img.naturalWidth, img.naturalHeight);
  return true;
}

async function waitForGalleryDetailReady(token) {
  if (token !== galleryFitToken || galleryViewMode !== "detail") return false;
  return document.getElementById("galleryLayout")?.dataset.mode === "detail";
}

async function fitActiveDiptychViewport(viewport, token) {
  const frame = viewport.querySelector(".gallery-rico__frame.is-active.gallery-rico__frame--diptych");
  if (!frame) return false;

  const imgs = [...frame.querySelectorAll(".gallery-rico__img")];
  if (imgs.length !== 2) return false;

  await Promise.all(
    imgs.map((img) => waitForGalleryImageReady(img, img.dataset.viewSrc || img.src))
  );
  if (token !== galleryFitToken || galleryViewMode !== "detail") return true;

  const [topImg, bottomImg] = imgs;
  if (!topImg.naturalWidth || !topImg.naturalHeight || !bottomImg.naturalWidth || !bottomImg.naturalHeight) {
    return true;
  }

  const nw = Math.max(topImg.naturalWidth, bottomImg.naturalWidth);
  const nh = topImg.naturalHeight + bottomImg.naturalHeight;
  applyGalleryViewportFit(viewport, nw, nh);
  return true;
}

async function waitForStableFrameNaturalSize(frame, token) {
  let lastKey = "";
  let stableCount = 0;
  let retries = 0;

  while (stableCount < 2 && retries <= GALLERY_FIT_MAX_RETRIES) {
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (token !== galleryFitToken || galleryViewMode !== "detail" || !galleryImmersive) return null;

    const size = getFrameNaturalSize(frame);
    if (!size.nw || !size.nh) {
      retries += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      continue;
    }

    if (looksLikePartialDecode(size.nw, size.nh)) {
      const imgs = frame.classList.contains("gallery-rico__frame--diptych")
        ? [...frame.querySelectorAll(".gallery-rico__img")]
        : [frame.querySelector(".gallery-rico__img")].filter(Boolean);

      await Promise.all(
        imgs.map(async (img) => {
          if (img && typeof img.decode === "function") {
            try {
              await img.decode();
            } catch {}
          }
        })
      );
      if (token !== galleryFitToken || !galleryImmersive) return null;

      lastKey = "";
      stableCount = 0;
      retries += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      continue;
    }

    const key = `${size.nw}x${size.nh}`;
    if (key === lastKey) stableCount += 1;
    else {
      lastKey = key;
      stableCount = 1;
    }

    if (stableCount < 2) {
      retries += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    }
  }

  const finalSize = getFrameNaturalSize(frame);
  if (!finalSize.nw || !finalSize.nh || looksLikePartialDecode(finalSize.nw, finalSize.nh)) {
    return null;
  }
  return finalSize;
}

function maybeRevealImmersiveViewport(viewport, frame) {
  if (!galleryImmersive || !viewport || !frame) return false;
  if (!immersiveLayoutReady() || !immersiveStageSizeStable()) return false;

  const { nw, nh } = getFrameNaturalSize(frame);
  if (!nw || !nh || looksLikePartialDecode(nw, nh)) return false;

  applyGalleryImmersiveViewportFit(viewport, nw, nh);
  setGalleryImmersiveFitPending(false);
  return true;
}

async function waitForImmersiveLayoutAndFit(token, viewport, frame) {
  if (token !== galleryFitToken || galleryViewMode !== "detail" || !galleryImmersive) return;

  const imgs = frame?.classList.contains("gallery-rico__frame--diptych")
    ? [...frame.querySelectorAll(".gallery-rico__img")]
    : [frame?.querySelector(".gallery-rico__img")].filter(Boolean);

  await Promise.all(
    imgs.map((img) => waitForGalleryImageReady(img, img.dataset.viewSrc || img.src))
  );
  if (token !== galleryFitToken || !galleryImmersive) return;

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  if (token !== galleryFitToken || !galleryImmersive) return;

  const { nw, nh } = getFrameNaturalSize(frame);
  applyGalleryImmersiveViewportFit(
    viewport,
    nw || imgs[0]?.naturalWidth || 1,
    nh || imgs[0]?.naturalHeight || 1
  );
  setGalleryImmersiveFitPending(false);
}

async function ensureGalleryViewportFit(token, expectedSrc) {
  if (token !== galleryFitToken || galleryViewMode !== "detail") return;

  const viewport = document.getElementById("galleryRicoViewport");
  if (!viewport) return;

  const frame = viewport.querySelector(".gallery-rico__frame.is-active");
  const img = frame?.querySelector(".gallery-rico__img");
  if (!frame || !img) return;

  if (!(await waitForGalleryDetailReady(token))) return;
  if (token !== galleryFitToken || galleryViewMode !== "detail") return;

  if (!galleryImmersive) {
    if (frame.classList.contains("gallery-rico__frame--diptych")) {
      await Promise.all(
        [...frame.querySelectorAll(".gallery-rico__img")].map((diptychImg) =>
          waitForGalleryImageReady(
            diptychImg,
            diptychImg.dataset.viewSrc || diptychImg.src
          )
        )
      );
    } else {
      const srcToWaitFor = expectedSrc || img.dataset.viewSrc || img.src;
      await waitForGalleryImageReady(img, srcToWaitFor);
    }
    return;
  }

  const srcToWaitFor = expectedSrc || img.dataset.viewSrc || img.src;

  if (frame.classList.contains("gallery-rico__frame--diptych")) {
    await Promise.all(
      [...frame.querySelectorAll(".gallery-rico__img")].map((diptychImg) =>
        waitForGalleryImageReady(diptychImg, diptychImg.dataset.viewSrc || diptychImg.src)
      )
    );
    if (token !== galleryFitToken || galleryViewMode !== "detail") return;

    if (galleryImmersive) {
      await waitForImmersiveLayoutAndFit(token, viewport, frame);
      return;
    }

    await fitActiveDiptychViewport(viewport, token);
    return;
  }

  galleryFitRetries = 0;

  while (galleryFitRetries <= GALLERY_FIT_MAX_RETRIES) {
    await waitForGalleryImageReady(img, srcToWaitFor);
    if (token !== galleryFitToken || galleryViewMode !== "detail") return;

    if (galleryImmersive) {
      await waitForImmersiveLayoutAndFit(token, viewport, frame);
      return;
    }

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      applyGalleryViewportFit(viewport, img.naturalWidth, img.naturalHeight);

      if (typeof img.decode === "function") {
        img.decode()
          .then(() => {
            if (token !== galleryFitToken || galleryViewMode !== "detail") return;
            const decodedW = img.naturalWidth;
            const decodedH = img.naturalHeight;
            if (!decodedW || !decodedH || looksLikePartialDecode(decodedW, decodedH)) return;
            applyGalleryViewportFit(viewport, decodedW, decodedH);
          })
          .catch(() => {});
      }
      return;
    }

    galleryFitRetries += 1;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
}

function fitGalleryViewport() {
  const viewport = document.getElementById("galleryRicoViewport");
  const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
  scheduleFitGalleryViewport(img?.dataset.viewSrc);
}

function wireIndexImages() {
  document.querySelectorAll("#galleryGrid .gallery-index__img").forEach((img) => {
    const cell = img.closest(".gallery-index__cell");
    const index = Number(cell?.dataset.artIndex);
    img.addEventListener(
      "error",
      () => {
        const view = img.dataset.viewSrc;
        if (view && img.src !== view) {
          img.src = view;
          return;
        }
        const item = catalog[index];
        if (item) {
          const original = originalSrc(item.file);
          if (img.src !== original) img.src = original;
        }
      },
      { once: true }
    );
  });
}

async function buildGallery() {
  const galleryGrid = document.getElementById("galleryGrid");
  if (!galleryGrid) return;

  fixGalleryHeights();
  currentGalleryIndex = 0;
  galleryNavInitialized = false;
  galleryInteractionsInitialized = false;
  galleryIndexInitialized = false;
  galleryViewMode = "grid";

  galleryGrid.innerHTML = buildGalleryShell();
  lastIndexPageCount = indexPageCount();
  wireIndexImages();
  fixGalleryHeights();
  syncGalleryIndexPageHeights();
  initGalleryIndexNav();
  initGalleryPageNav();
  initGalleryInteractions();
  updateGalleryDisplay(0);
  showGalleryGrid({ resetScroll: true });
  ensureGalleryIndexScrollReadySoon();
}

async function loadCatalog() {
  const fetchPaintings = window.sanityClient?.fetchPaintings || window.sanityClient?.fetchGallery;
  if (fetchPaintings) {
    try {
      const works = await fetchPaintings();
      if (Array.isArray(works) && works.length > 0) {
        const worksById = Object.fromEntries(works.map((work) => [work._id, work]));
        catalog = works
          .filter((work) => work.pairRole !== "secondary")
          .map((work, index) => {
            let secondImageUrl = work.secondImageUrl || null;
            if (
              work.presentationStyle === "stackedPair" &&
              work.pairedArtworkId &&
              !secondImageUrl
            ) {
              secondImageUrl = worksById[work.pairedArtworkId]?.imageUrl || null;
            }

            return normalizeCatalogItem({
              sanityId: work._id,
              file: work.legacyFilename || `${work.title}.jpg`,
              title: work.title,
              year: work.year || "",
              medium: work.medium || "",
              dimensions: work.dimensions || "",
              price: work.price || "",
              sold: Boolean(work.sold),
              presentationStyle: work.presentationStyle || "single",
              pairRole: work.pairRole || "",
              pairedArtworkId: work.pairedArtworkId || "",
              filesIndex: catalogFilesIndex(work.legacyFilename, index),
              remoteViewSrc: work.imageUrl ? sanitySizedImageUrl(work.imageUrl, 2400) : null,
              remotePreviewSrc: work.imageUrl ? sanitySizedImageUrl(work.imageUrl, 720) : null,
              secondImageUrl: secondImageUrl
                ? sanitySizedImageUrl(secondImageUrl, 2400)
                : null,
              secondPreviewUrl: secondImageUrl
                ? sanitySizedImageUrl(secondImageUrl, 720)
                : null,
            });
          });
        catalog = catalog.filter((item) => !isPrintMedium(item));
        return;
      }
    } catch (_) {
      /* fall back to static JSON */
    }
  }

  const sg = await loadGallerySgData();

  const byTitle = Object.fromEntries(sg.works.map((w) => [w.title, w]));

  catalog = FILES.map((file, filesIndex) => {
    const sgTitle = sg.fileToTitle[file];

    if (sgTitle && byTitle[sgTitle]) {
      const w = byTitle[sgTitle];
      return normalizeCatalogItem({
        file,
        title: w.title,
        year: w.year,
        medium: w.medium,
        dimensions: w.dimensions,
        price: w.price,
        sold: Boolean(w.sold),
        filesIndex,
      });
    }

    const stem = file.replace(/\.[^.]+$/, "");
    return normalizeCatalogItem({
      file,
      title: stem,
      year: PLACEHOLDER_YEARS[filesIndex] || "",
      filesIndex,
    });
  });

  catalog = sortCatalogItems(catalog);
  catalog = catalog.filter((item) => !isPrintMedium(item));
}

function prefetchView(index) {
  const item = catalog[index];
  if (!item) return;

  const src = itemViewSrc(item);
  if (!src || viewCache.has(src)) return;

  const promise = window.ImagePreloadCache
    ? window.ImagePreloadCache.load(src)
    : new Promise((resolve) => {
        const img = new Image();
        const finish = () => resolve();
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
        img.src = src;
      });

  viewCache.set(src, promise);
}

function getAllPreloadUrls() {
  const previews = [];
  const views = [];
  catalog.forEach((item) => {
    previews.push(itemPreviewSrc(item));
    views.push(itemViewSrc(item));
  });
  return { previews, views };
}

function forceGalleryInternalScroll() {
  showGalleryGrid({ resetScroll: true });
}

async function rebuildGalleryLayout() {
  const layout = document.getElementById("galleryLayout");
  if (!layout) {
    await buildGallery();
    return;
  }

  const mode = galleryViewMode;
  const activeIndex = currentGalleryIndex;
  const nextPageCount = indexPageCount();

  if (nextPageCount !== lastIndexPageCount) {
    await buildGallery();
    if (mode === "detail") openGalleryDetail(activeIndex);
    return;
  }

  fixGalleryHeights();
  if (mode === "detail") {
    galleryLockedSquareSize = null;
    resetGalleryViewportSize();
    window.galleryGoToIndex?.(activeIndex, false);
    const viewport = document.getElementById("galleryRicoViewport");
    const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
    scheduleFitGalleryViewport(img?.dataset.viewSrc);
  }
}

async function initGallery() {
  await loadCatalog();
  await buildGallery();
  initGalleryImmersiveTap();
  forceGalleryInternalScroll();

  window.galleryCatalogReady = true;
  window.galleryRebuildPages = rebuildGalleryLayout;

  window.galleryPreload = {
    previewSrc,
    viewSrc,
    originalSrc,
    prefetchView,
    getAllUrls: getAllPreloadUrls,
  };

  window.galleryRefreshScrollFx = () => {
    fixGalleryHeights();
    syncGalleryIndexPageHeights();
    ensureGalleryIndexScrollReadySoon();
    scheduleGallerySync?.();
  };
  window.ensureGalleryIndexScrollReady = ensureGalleryIndexScrollReady;
  window.markGallerySectionEntered = markGallerySectionEntered;
  window.galleryShowGrid = showGalleryGrid;
  window.galleryOpenDetail = openGalleryDetail;
  window.galleryIsImmersive = () => galleryImmersive;
  window.gallerySetImmersive = setGalleryImmersive;
  window.resetEnquiryContact = resetEnquiryContact;

  document.addEventListener("gallery:ready", fixGalleryHeights);

  window.addEventListener("resize", () => {
    fixGalleryHeights();
    window.clearTimeout(window.__galleryResizeTimer);
    window.__galleryResizeTimer = window.setTimeout(rebuildGalleryLayout, 180);
  });

  document.dispatchEvent(new CustomEvent("gallery:ready"));

  if (document.body) {
    let prevSection = document.body.dataset.currentSection || "";
    new MutationObserver(() => {
      const section = document.body.dataset.currentSection || "";
      if (section === "paintings" && prevSection !== "paintings") {
        markGallerySectionEntered();
      }
      prevSection = section;
    }).observe(document.body, { attributes: true, attributeFilter: ["data-current-section"] });
  }

  if (document.body?.dataset.currentSection === "paintings") {
    markGallerySectionEntered();
  }

  if (window.infoGalleryTransition?.measure) {
    window.infoGalleryTransition.measure();
  }

  if (window.siteScroll?.refresh) {
    window.siteScroll.refresh();
  }
}

initGallery();
