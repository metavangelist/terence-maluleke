(function () {
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
const AFTER_FAIR_DIPTYCH_FILES = ["AFTER FAIR 002.jpg", "AFTER FAIR 001.jpg"];

function isPrintMedium(item) {
  return /^print\b/i.test(String(item?.medium || "").trim());
}

function afterFairDiptychPrimaryIndex() {
  return catalog.findIndex((item) => item.file === AFTER_FAIR_DIPTYCH_FILES[0]);
}

function afterFairDiptychSecondaryIndex() {
  return catalog.findIndex((item) => item.file === AFTER_FAIR_DIPTYCH_FILES[1]);
}

function isAfterFairDiptychItem(item) {
  return AFTER_FAIR_DIPTYCH_FILES.includes(item?.file);
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

function enquiryMailto(item, sectionLabel = "Prints") {
  const subject = encodeURIComponent(`Enquiry: ${item.title}`);
  const body = encodeURIComponent(
    `Hello,\n\nI would like to enquire about the artwork "${item.title}" (${sectionLabel}).\n\n`
  );
  return `mailto:${ENQUIRY_EMAIL}?subject=${subject}&body=${body}`;
}

function syncEnquiryLinks(item, sectionLabel = "Prints") {
  if (!item?.title) return;

  const href = enquiryMailto(item, sectionLabel);
  const enquireEl = document.getElementById("printsRicoEnquire");
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
let printsExitToMaquettesArmed = true;
let galleryExitArmTimer = 0;
let printsGridBottomWheelAccum = 0;
let printsGridBottomWheelResetTimer = 0;
let galleryLastGridPageSeen = -1;
let printsIndexScrollReady = false;
let printsIndexScrollReadyToken = 0;
let printsIndexScrollReadyTimer = 0;
let scheduleGallerySync = null;
let pillScrollSyncing = false;
let galleryViewMode = "grid";
let galleryImmersive = false;
let printsIndexInitialized = false;
let lastIndexPageCount = 0;
let galleryHomeScrollSection = "home";

function getGalleryIndexScroller() {
  return document.getElementById("printsIndexScroller");
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
  printsIndexScrollReady =
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

function ensurePrintsIndexScrollReadySoon() {
  window.clearTimeout(printsIndexScrollReadyTimer);
  printsIndexScrollReadyTimer = window.setTimeout(() => {
    void ensurePrintsIndexScrollReady();
  }, 0);
}

async function ensurePrintsIndexScrollReady() {
  const token = ++printsIndexScrollReadyToken;
  let retries = 0;

  while (retries <= 48) {
    fixGalleryHeights();
    syncGalleryIndexPageHeights();

    if (isGalleryIndexScrollReady()) {
      printsIndexScrollReady = true;
      return true;
    }

    retries += 1;
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (token !== printsIndexScrollReadyToken) return printsIndexScrollReady;
    if (retries <= 48) {
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    }
  }

  printsIndexScrollReady = isGalleryIndexScrollReady();
  return printsIndexScrollReady;
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
  if (getGalleryGridPageIndex() < indexPageCount() - 1) return false;

  const scrollHeight = getGalleryIndexScrollHeight(scroller);
  return scroller.scrollTop + scroller.clientHeight >= scrollHeight - 2;
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

function markPrintsSectionEntered() {
  gallerySectionEnteredAt = Date.now();
  galleryEdgeHitCount = 0;
  printsExitToMaquettesArmed = false;
  printsGridBottomWheelAccum = 0;
  printsIndexScrollReady = false;
  window.clearTimeout(galleryExitArmTimer);
  window.clearTimeout(printsGridBottomWheelResetTimer);
  fixGalleryHeights();
  syncGalleryIndexPageHeights();
  ensurePrintsIndexScrollReadySoon();
  galleryExitArmTimer = window.setTimeout(() => {
    printsExitToMaquettesArmed = true;
  }, GALLERY_NEIGHBOR_EXIT_ARM_DELAY_MS);
}

function galleryEdgesArmed() {
  return galleryEdgesArmedFor("paintings");
}

function getGalleryGridPageIndex() {
  const scroller = getGalleryIndexScroller();
  if (!scroller) return 0;

  const pageHeight = getGalleryIndexPageHeight(scroller);
  if (!pageHeight) return 0;

  return Math.min(
    indexPageCount() - 1,
    Math.max(0, Math.round(scroller.scrollTop / pageHeight))
  );
}

function disarmPrintsExitToMaquettes() {
  printsExitToMaquettesArmed = false;
  printsGridBottomWheelAccum = 0;
  window.clearTimeout(printsGridBottomWheelResetTimer);
  window.clearTimeout(galleryExitArmTimer);
  galleryExitArmTimer = window.setTimeout(() => {
    printsExitToMaquettesArmed = true;
  }, GALLERY_EXIT_ARM_DELAY_MS);
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
      ensurePrintsIndexScrollReadySoon();
    }
  }

  if (!isGalleryIndexScrollReady()) return;

  const page = getGalleryGridPageIndex();
  const lastPage = indexPageCount() - 1;

  if (page === lastPage && galleryLastGridPageSeen !== lastPage) {
    disarmPrintsExitToMaquettes();
  } else if (page !== lastPage) {
    printsExitToMaquettesArmed = true;
    window.clearTimeout(galleryExitArmTimer);
    printsGridBottomWheelAccum = 0;
  }

  galleryLastGridPageSeen = page;
}

function isPaintingsDetailOpen() {
  return document.getElementById("galleryLayout")?.dataset.mode === "detail";
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

  if (isPaintingsDetailOpen()) return;

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

function mergeMissingGalleryPanels(catalog, sg) {
  const byTitle = Object.fromEntries(sg.works.map((w) => [w.title, w]));
  const presentFiles = new Set(catalog.map((c) => c.file));
  const titlesInCatalog = new Set(catalog.map((c) => c.title));

  for (const file of FILES) {
    if (presentFiles.has(file)) continue;

    const sgTitle = sg.fileToTitle?.[file];
    if (!sgTitle || !titlesInCatalog.has(sgTitle)) continue;

    const w = byTitle[sgTitle];
    if (!w) continue;

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

  return sortCatalogItems(catalog);
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
  if (!isAfterFairDiptychItem(item)) return null;
  const partnerFile =
    item.file === AFTER_FAIR_DIPTYCH_FILES[0]
      ? AFTER_FAIR_DIPTYCH_FILES[1]
      : AFTER_FAIR_DIPTYCH_FILES[0];
  return catalog.find((entry) => entry.file === partnerFile) || null;
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
        src="${topView}"
        data-preview-src="${topPreview}"
        data-view-src="${topView}"
        alt="${escapeHtml(topItem.title)} (top panel)"
        loading="${loading}"
        decoding="async"
        draggable="false"
      />
      <img
        class="gallery-rico__img gallery-rico__img--diptych-bottom"
        src="${bottomView}"
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
  if (isAfterFairDiptychItem(item)) {
    const topItem =
      item.file === AFTER_FAIR_DIPTYCH_FILES[0] ? item : diptychPartnerItem(item) || item;
    const bottomItem =
      item.file === AFTER_FAIR_DIPTYCH_FILES[1] ? item : diptychPartnerItem(item);
    if (bottomItem) {
      const loading = index < 8 ? "eager" : "lazy";
      return `
        <figure class="gallery-rico__frame gallery-rico__frame--diptych${isActive ? " is-active" : ""}" data-art-index="${index}" aria-hidden="${isActive ? "false" : "true"}">
          ${diptychStackMarkup(topItem, bottomItem, loading)}
        </figure>
      `;
    }
  }

  const preview = itemPreviewSrc(item);
  const view = itemViewSrc(item);
  const loading = index < 8 ? "eager" : "lazy";

  return `
    <figure class="gallery-rico__frame${isActive ? " is-active" : ""}" data-art-index="${index}" aria-hidden="${isActive ? "false" : "true"}">
      <img
        class="gallery-rico__img"
        src="${view}"
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
  const nav = document.getElementById("printsRicoPills");
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
  const nav = document.getElementById("printsRicoPills");
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
        <dd id="printsRicoMedium">—</dd>
      </div>
      <div class="gallery-rico__detail">
        <dt>Year</dt>
        <dd id="printsRicoYear">—</dd>
      </div>
      <div class="gallery-rico__detail">
        <dt>Dimensions</dt>
        <dd id="printsRicoDimensions">—</dd>
      </div>
      <div class="gallery-rico__detail gallery-rico__detail--price" id="printsRicoPriceRow" hidden>
        <dt>Price</dt>
        <dd id="printsRicoPrice">—</dd>
      </div>
      <div class="gallery-rico__detail">
        <dt>Status</dt>
        <dd id="printsRicoStatus">—</dd>
      </div>
    </dl>
  `;
}

function gridLayout() {
  if (typeof window !== "undefined" && window.innerWidth < 600) {
    return { cols: 2, rows: 2, perPage: 4 };
  }
  return { cols: 3, rows: 2, perPage: 6 };
}

function buildGridEntries() {
  const [topFile, bottomFile] = AFTER_FAIR_DIPTYCH_FILES;
  const topIdx = catalog.findIndex((item) => item.file === topFile);
  const bottomIdx = catalog.findIndex((item) => item.file === bottomFile);
  const hasDiptych = topIdx >= 0 && bottomIdx >= 0;
  const entries = [];

  for (let i = 0; i < catalog.length; i += 1) {
    const item = catalog[i];
    if (hasDiptych && item.file === bottomFile) continue;
    if (hasDiptych && item.file === topFile) {
      entries.push({
        kind: "diptych",
        catalogIndex: topIdx,
        indices: [topIdx, bottomIdx],
        item: catalog[topIdx],
      });
      continue;
    }
    entries.push({ kind: "single", catalogIndex: i, item });
  }

  return entries;
}

function firstGridPageEntries(entries, mobile) {
  const byTitle = (title) =>
    entries.find((entry) => entry.kind === "single" && entry.item?.title === title);
  const diptych = entries.find((entry) => entry.kind === "diptych");

  if (mobile) {
    return [byTitle("Towards Glory"), byTitle("Before Glory"), diptych].filter(Boolean);
  }

  return [
    byTitle("Towards Glory"),
    byTitle("Before Glory"),
    diptych,
    byTitle("Crimson Accord"),
    byTitle("Anima"),
  ].filter(Boolean);
}

function getGridPages() {
  const { perPage } = gridLayout();
  const mobile = perPage === 4;
  const entries = buildGridEntries();
  const page0 = firstGridPageEntries(entries, mobile);
  const used = new Set(page0);
  const rest = entries.filter((entry) => !used.has(entry));
  const pages = [page0];

  for (let offset = 0; offset < rest.length; offset += perPage) {
    pages.push(rest.slice(offset, offset + perPage));
  }

  const nonEmpty = pages.filter((page) => page.length > 0);
  return nonEmpty.length ? nonEmpty : [[]];
}

function indexPageCount() {
  return getGridPages().length;
}

function page0Placement(slotIndex, mobile) {
  if (mobile) {
    return [{ col: 1, row: 1 }, { col: 1, row: 2 }, null][slotIndex] ?? null;
  }
  return [
    { col: 1, row: 1 },
    { col: 2, row: 1 },
    null,
    { col: 1, row: 2 },
    { col: 2, row: 2 },
  ][slotIndex] ?? null;
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

function buildDiptychCellMarkup(entry, mobile) {
  const [topIdx, bottomIdx] = entry.indices;
  const topItem = catalog[topIdx];
  const bottomItem = catalog[bottomIdx];
  const topPreview = itemPreviewSrc(topItem);
  const bottomPreview = itemPreviewSrc(bottomItem);
  const topView = itemViewSrc(topItem);
  const bottomView = itemViewSrc(bottomItem);
  const diptychCol = mobile ? 2 : 3;

  return `
    <button
      type="button"
      class="gallery-index__cell gallery-index__cell--diptych"
      data-art-index="${topIdx}"
      data-diptych="true"
      style="--diptych-col: ${diptychCol}; grid-column: var(--diptych-col); grid-row: 1 / span 2;"
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

function buildGridCellMarkup(entry, slotIndex, page) {
  const mobile = gridLayout().perPage === 4;
  if (entry.kind === "diptych") return buildDiptychCellMarkup(entry, mobile);
  const placement = page === 0 ? page0Placement(slotIndex, mobile) : null;
  return buildIndexCellMarkup(entry.item, entry.catalogIndex, placement);
}

function buildIndexMarkup() {
  const { cols, rows } = gridLayout();
  const pages = getGridPages();
  const pagesHtml = pages
    .map((entries, page) => {
      const cells = entries
        .map((entry, slotIndex) => buildGridCellMarkup(entry, slotIndex, page))
        .join("");

      return `
      <div class="gallery-index__page" data-page="${page}" style="--gi-cols: ${cols}; --gi-rows: ${rows}">
        <div class="gallery-index__grid" role="list">${cells}</div>
      </div>
    `;
    })
    .join("");

  return `
    <div class="gallery-index" id="printsIndex">
      <div class="gallery-index__scroller" id="printsIndexScroller">${pagesHtml}</div>
    </div>
  `;
}

function coaPanelHtml() {
  return `
    <div class="gallery-rico__coa" id="printsRicoCoa">
      <button
        type="button"
        class="gallery-rico__coa-toggle"
        id="printsRicoCoaBtn"
        aria-expanded="false"
        aria-controls="printsRicoCoaPanel"
      >
        Includes a Certificate of Authenticity
      </button>
      <div class="gallery-rico__coa-panel" id="printsRicoCoaPanel">
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
    <div class="gallery-rico gallery-rico--detail" id="printsDetail">
      <header class="gallery-rico__head">
        <p class="gallery-rico__counter">Artwork Title</p>
        <h2 class="gallery-rico__title" id="printsRicoTitle"></h2>
      </header>

      <div class="gallery-rico__body">
        <aside class="gallery-rico__aside gallery-rico__aside--left">
          <a class="gallery-rico__enquire" id="printsRicoEnquire" href="mailto:Contact@maluleke.art">Enquire About This Artwork</a>
          ${coaPanelHtml()}
        </aside>

        <div class="gallery-rico__stage-wrap">
          <button type="button" class="gallery-rico__nav gallery-rico__nav--prev" id="printsRicoPrev" aria-label="Previous artwork"><span aria-hidden="true">←</span></button>
          <div class="gallery-rico__stage" id="printsRicoStage" aria-live="polite">
            <div
              class="gallery-rico__viewport"
              id="printsRicoViewport"
              aria-label="Artwork"
            >
              ${catalog.map((item, i) => frameHtml(item, i, i === 0)).join("")}
            </div>
          </div>
          <button type="button" class="gallery-rico__nav gallery-rico__nav--next" id="printsRicoNext" aria-label="Next artwork"><span aria-hidden="true">→</span></button>
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
    <div class="gallery-layout" id="printsLayout" data-mode="grid">
      ${buildIndexMarkup()}
      ${buildDetailShell()}
    </div>
  `;
}

function scrollGridToIndex(index) {
  const scroller = document.getElementById("printsIndexScroller");
  if (!scroller) return;

  const page = catalogPageForIndex(resolveGalleryNavIndex(index));
  const pageEl = scroller.querySelector(`.gallery-index__page[data-page="${page}"]`);
  if (pageEl) pageEl.scrollIntoView({ block: "start" });
}

function showGalleryGrid(options = {}) {
  collapseGalleryCoa();
  setGalleryImmersive(false);
  galleryViewMode = "grid";
  galleryNavQueue = 0;
  galleryPageAnimating = false;
  galleryLockedSquareSize = null;
  resetGalleryViewportSize();

  const layout = document.getElementById("printsLayout");
  if (layout) layout.dataset.mode = "grid";

  const scroller = document.getElementById("printsIndexScroller");
  if (!scroller) return;

  if (options.resetScroll) scroller.scrollTop = 0;
  else if (Number.isFinite(currentGalleryIndex)) scrollGridToIndex(currentGalleryIndex);

  galleryLastGridPageSeen = -1;
  onGalleryGridPageChange();
  setGalleryNavExitMode(false);
  ensurePrintsIndexScrollReadySoon();
}

function openGalleryDetail(index) {
  index = resolveGalleryNavIndex(index);
  if (index < 0 || index >= catalog.length) return;

  galleryViewMode = "detail";

  const layout = document.getElementById("printsLayout");
  if (layout) layout.dataset.mode = "detail";

  resetGalleryViewportSize();
  setGalleryNavExitMode(true);
  window.printsGoToIndex?.(index, false);
  if (index >= catalog.length - 1) disarmPrintsExitToMaquettes();
}

function setGalleryDetail(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateGalleryDisplay(index, options = {}) {
  const item = catalog[index];
  if (!item) return;

  const titleEl = document.getElementById("printsRicoTitle");
  const year = item.year || PLACEHOLDER_YEARS[item.filesIndex ?? index] || "";

  if (titleEl) titleEl.textContent = year ? `${item.title}, ${year}` : item.title;

  setGalleryDetail("printsRicoMedium", item.medium || "—");
  setGalleryDetail("printsRicoYear", year || "—");
  setGalleryDetail("printsRicoDimensions", item.dimensions || "—");
  setGalleryDetail("printsRicoStatus", item.sold ? "Sold" : "Available");

  const priceRow = document.getElementById("printsRicoPriceRow");
  const showPrice = Boolean(item.price) && !item.sold;
  if (priceRow) priceRow.hidden = !showPrice;
  if (showPrice) setGalleryDetail("printsRicoPrice", item.price);

  syncEnquiryLinks(item, "Prints");

  const prevBtn = document.getElementById("printsRicoPrev");
  const nextBtn = document.getElementById("printsRicoNext");
  if (prevBtn) {
    prevBtn.disabled = false;
    prevBtn.setAttribute(
      "aria-label",
      index <= 0 ? "Back to gallery grid" : "Previous artwork"
    );
  }
  if (nextBtn) nextBtn.disabled = index >= catalog.length - 1;

  if (options.skipFit) return;

  const viewport = document.getElementById("printsRicoViewport");
  const stage = document.getElementById("printsRicoStage");
  const frame = stage?.querySelector(`.gallery-rico__frame[data-art-index="${index}"]`);
  const { img } = promoteDetailImage(index);
  if (!frame || !img) return;

  if (!viewportNeedsRefit(viewport, frame)) return;

  if (galleryImmersive) {
    setGalleryImmersiveFitPending(true);
  }

  if (viewport?.classList.contains("is-sized")) {
    resetGalleryViewportSize();
  }
  scheduleFitGalleryViewport(img.dataset.viewSrc);
}

function initPrintsPageNav() {
  if (galleryNavInitialized) return;

  const stage = document.getElementById("printsRicoStage");
  const ricoRoot = document.querySelector("#printsGrid .gallery-rico");
  if (!stage || !ricoRoot) return;

  galleryNavInitialized = true;
  ensureGalleryStageResizeObserver();

  let animTimer = 0;

  function handoffToMaquettes() {
    if (galleryEdgeHandoff || window.siteScroll?.isTransitioning?.()) {
      galleryNavQueue = 0;
      return;
    }
    if (galleryPageAnimating || !printsExitToMaquettesArmed) {
      galleryNavQueue = 0;
      return;
    }
    if (galleryViewMode === "grid" && !isGalleryIndexScrollReady()) {
      galleryNavQueue = 0;
      return;
    }

    galleryNavQueue = 0;
    galleryPageAnimating = false;
    window.clearTimeout(animTimer);
    galleryEdgeHandoff = true;
    window.siteScroll?.scrollToNextSection?.({ resetScroll: false });
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
    const frames = [...stage.querySelectorAll(".gallery-rico__frame")];
    frames.forEach((frame, i) => {
      clearFrameAnimClasses(frame);
      frame.classList.toggle("is-active", i === next);
      frame.setAttribute("aria-hidden", i === next ? "false" : "true");
    });
    galleryPageAnimating = false;
    if (next >= catalog.length - 1) {
      // Spillover from fast scrolling was meant to reach the last slide, not exit.
      galleryNavQueue = 0;
      galleryWheelLocked = false;
      window.clearTimeout(galleryWheelLockTimer);
      wheelAccum = 0;
      disarmPrintsExitToMaquettes();
    } else {
      printsExitToMaquettesArmed = true;
      window.clearTimeout(galleryExitArmTimer);
    }
    processNavQueue();
  }

  function performStep(next) {
    const frames = [...stage.querySelectorAll(".gallery-rico__frame")];
    const currentFrame = frames[currentGalleryIndex];
    const nextFrame = frames[next];
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
        handoffToMaquettes();
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

      const frames = [...stage.querySelectorAll(".gallery-rico__frame")];
      frames.forEach((frame, i) => {
        clearFrameAnimClasses(frame);
        frame.classList.toggle("is-active", i === next);
        frame.setAttribute("aria-hidden", i === next ? "false" : "true");
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
    if (document.body.dataset.currentSection !== "prints") return;
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
      if (!printsExitToMaquettesArmed) {
        wheelAccum = 0;
        return;
      }

      wheelAccum += delta;
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => { wheelAccum = 0; }, 150);

      if (wheelAccum >= GALLERY_WHEEL_THRESHOLD) {
        wheelAccum = 0;
        handoffToMaquettes();
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
    if (document.body.dataset.currentSection !== "prints") return;
    if (galleryViewMode !== "detail") return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaY) < 30) return;

    enqueueStep(deltaY < 0 ? 1 : -1);
  }, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (document.body.dataset.currentSection !== "prints") return;
    if (galleryViewMode !== "detail") return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      enqueueStep(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      enqueueStep(-1);
    }
  });

  window.printsGoToIndex = goToIndex;
  window.printsEnqueueStep = enqueueStep;
  scheduleGallerySync = () => {
    updateGalleryDisplay(currentGalleryIndex);
  };
}

function initPrintsIndexNav() {
  if (printsIndexInitialized) return;

  const printsGrid = document.getElementById("printsGrid");
  const scroller = document.getElementById("printsIndexScroller");
  if (!printsGrid || !scroller) return;

  printsIndexInitialized = true;

  scroller.addEventListener("scroll", onGalleryGridPageChange, { passive: true });
  onGalleryGridPageChange();

  printsGrid.addEventListener("click", (event) => {
    if (galleryViewMode !== "grid") return;
    const cell = event.target.closest(".gallery-index__cell");
    if (!cell) return;
    const index = Number(cell.dataset.artIndex);
    if (!Number.isFinite(index)) return;
    event.preventDefault();
    openGalleryDetail(index);
  });

  printsGrid.addEventListener(
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

  printsGrid.addEventListener("keydown", (event) => {
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
    if (targetSlug === "paintings") window.galleryRefreshScrollFx?.();
    if (targetSlug === "maquettes") window.maquettesRefreshScrollFx?.();
  }

  function doGridHandoff(targetSlug) {
    if (!isGalleryIndexScrollReady()) return;
    if (targetSlug === "maquettes" && !printsExitToMaquettesArmed) return;
    prepSectionHandoff(targetSlug);
    galleryEdgeHandoff = true;
    window.siteScroll?.scrollToSection?.(targetSlug, { resetScroll: false });
    window.setTimeout(() => { galleryEdgeHandoff = false; }, 1040);
  }

  scroller.addEventListener(
    "wheel",
    (event) => {
      if (document.body.dataset.currentSection !== "prints") return;
      if (galleryViewMode !== "grid") return;
      if (galleryEdgeHandoff || window.siteScroll?.isTransitioning?.()) return;

      if (!isGalleryIndexScrollReady()) {
        event.preventDefault();
        event.stopPropagation();
        ensurePrintsIndexScrollReadySoon();
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

        if (!galleryEdgesArmedFor("paintings")) return;

        const now = Date.now();
        if (now - gridUpLastTime < GRID_EDGE_DEBOUNCE_MS) return;
        gridUpLastTime = now;

        gridDownHitCount = 0;
        gridUpHitCount += 1;
        window.clearTimeout(gridUpHitTimer);
        gridUpHitTimer = window.setTimeout(() => { gridUpHitCount = 0; }, 1200);

        if (gridUpHitCount < edgeHitsRequired("paintings")) return;

        gridUpHitCount = 0;
        doGridHandoff("paintings");
        return;
      }

      if (atBottom && event.deltaY > 0) {
        event.preventDefault();
        event.stopPropagation();

        if (!printsExitToMaquettesArmed) {
          printsGridBottomWheelAccum = 0;
          return;
        }

        if (!galleryEdgesArmedFor("maquettes")) return;

        printsGridBottomWheelAccum = 0;
        doGridHandoff("maquettes");
        return;
      }
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
      if (document.body.dataset.currentSection !== "prints") return;
      if (galleryViewMode !== "grid") return;
      if (galleryEdgeHandoff || window.siteScroll?.isTransitioning?.()) return;
      if (!isGalleryIndexScrollReady()) {
        ensurePrintsIndexScrollReadySoon();
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaY = touch.clientY - indexTouchStartY;
      const atTop = isGalleryGridAtTop(scroller);
      const atBottom = isGalleryGridAtBottom(scroller);

      if (atTop && deltaY > 36) {
        if (!galleryEdgesArmedFor("paintings")) return;

        touchDownHitCount = 0;
        touchUpHitCount += 1;
        window.clearTimeout(touchUpHitTimer);
        touchUpHitTimer = window.setTimeout(() => { touchUpHitCount = 0; }, 1200);

        if (touchUpHitCount < edgeHitsRequired("paintings")) return;

        touchUpHitCount = 0;
        doGridHandoff("paintings");
        return;
      }

      if (atBottom && deltaY < -36) {
        if (!printsExitToMaquettesArmed || !isGalleryIndexScrollReady()) return;
        if (!galleryEdgesArmedFor("maquettes")) return;

        touchBottomHitCount = 0;
        doGridHandoff("maquettes");
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

function initPrintsImmersiveTap() {
  const grid = document.getElementById("printsGrid");
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
    if (document.body.dataset.currentSection !== "prints") return;
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

  const stageWrap = document.querySelector("#printsDetail .gallery-rico__stage-wrap");
  const stage = document.getElementById("printsRicoStage");
  const target = stageWrap || stage;
  if (!target) return;

  galleryImmersiveStageObserver = new ResizeObserver(() => {
    if (!galleryImmersive || galleryViewMode !== "detail") return;
    if (!document.getElementById("printsDetail")?.classList.contains("is-fit-pending")) return;

    resetGalleryImmersiveStageStability();
    const viewport = document.getElementById("printsRicoViewport");
    const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
    scheduleFitGalleryViewport(img?.dataset.viewSrc);
  });
  galleryImmersiveStageObserver.observe(target);
}

function setGalleryImmersive(on) {
  galleryImmersive = Boolean(on);
  const detail = document.getElementById("printsDetail");
  detail?.classList.toggle("is-immersive", galleryImmersive);
  galleryLockedSquareSize = null;
  resetGalleryViewportSize();
  setGalleryImmersiveFitPending(galleryImmersive);

  if (!galleryImmersive) {
    galleryImmersiveStageObserver?.disconnect();
    galleryImmersiveStageObserver = null;
    galleryFitRetries = 0;
  } else {
    galleryFitRetries = 0;
    resetGalleryImmersiveStageStability();
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      observeGalleryStageForImmersiveFit();
      const viewport = document.getElementById("printsRicoViewport");
      const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
      scheduleFitGalleryViewport(img?.dataset.viewSrc);
    });
  });
}

function toggleGalleryImmersive() {
  setGalleryImmersive(!galleryImmersive);
}

function initPrintsInteractions() {
  if (galleryInteractionsInitialized) return;
  galleryInteractionsInitialized = true;

  const prevBtn = document.getElementById("printsRicoPrev");
  const nextBtn = document.getElementById("printsRicoNext");

  prevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    window.printsEnqueueStep?.(-1);
  });

  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    window.printsEnqueueStep?.(1);
  });

  initPrintsCoaDisclosure();
}

function collapseGalleryCoa() {
  const root = document.getElementById("printsRicoCoa");
  const toggle = document.getElementById("printsRicoCoaBtn");
  if (!root?.classList.contains("is-open")) return;
  root.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");
}

function initPrintsCoaDisclosure() {
  const root = document.getElementById("printsRicoCoa");
  const toggle = document.getElementById("printsRicoCoaBtn");
  if (!root || !toggle || root.dataset.coaBound) return;

  root.dataset.coaBound = "1";

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const open = root.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("keydown", (e) => {
    if (document.body.dataset.currentSection !== "prints") return;
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
  const section = document.getElementById("section-prints");
  const page = section?.querySelector(".gallery-page");
  const grid = document.getElementById("printsGrid");

  if (section) section.style.height = `${vh}px`;
  if (page) page.style.height = `${vh}px`;
  if (grid) {
    grid.style.height = `${vh}px`;
    grid.style.maxHeight = `${vh}px`;
  }

  syncGalleryIndexPageHeights();
}

function promoteDetailImage(index) {
  const stage = document.getElementById("printsRicoStage");
  const frame = stage?.querySelector(`.gallery-rico__frame[data-art-index="${index}"]`);
  const img = frame?.querySelector("img");
  const view = img?.dataset.viewSrc;
  if (!img || !view) return { promoted: false, img };
  if (img.src === view) return { promoted: false, img };
  img.src = view;
  return { promoted: true, img };
}

function resetGalleryViewportSize() {
  const viewport = document.getElementById("printsRicoViewport");
  galleryLockedSquareSize = null;
  if (!viewport) return;
  viewport.classList.remove("is-sized");
  viewport.removeAttribute("data-gallery-aspect");
  viewport.removeAttribute("data-gallery-fit-mode");
  viewport.style.removeProperty("width");
  viewport.style.removeProperty("height");
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

  const expectedFile = expectedSrc
    ? decodeURIComponent(expectedSrc.split("?")[0].split("/").pop())
    : null;

  const hasCorrectSrc = () => {
    if (!expectedFile) return true;
    const current = img.currentSrc || img.src || "";
    try {
      return decodeURIComponent(current.split("?")[0].split("/").pop()) === expectedFile;
    } catch {
      return current.includes(expectedFile);
    }
  };

  const isReady = () =>
    img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && hasCorrectSrc();

  if (!isReady()) {
    await new Promise((resolve) => {
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      setTimeout(done, 1500);
    });
  }

  if (typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {}
  }
}

function prefetchDetailImage(index) {
  const stage = document.getElementById("printsRicoStage");
  const img = stage?.querySelector(`.gallery-rico__frame[data-art-index="${index}"] img`);
  if (!img || !img.dataset.viewSrc) return;
  if (img.src !== img.dataset.viewSrc) img.src = img.dataset.viewSrc;
  if (typeof img.decode === "function") img.decode().catch(() => {});
}

function ensureGalleryStageResizeObserver() {
  if (galleryStageResizeObserver) return;
  galleryStageResizeObserver = true;

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    if (galleryViewMode !== "detail") return;
    galleryLockedSquareSize = null;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const viewport = document.getElementById("printsRicoViewport");
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
  const stageWrap = document.querySelector("#printsDetail .gallery-rico__stage-wrap");
  const prev = document.getElementById("printsRicoPrev");
  const next = document.getElementById("printsRicoNext");
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
  const stageWrap = document.querySelector("#printsDetail .gallery-rico__stage-wrap");
  const stage = document.getElementById("printsRicoStage");
  const prev = document.getElementById("printsRicoPrev");
  const next = document.getElementById("printsRicoNext");

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
  const detail = document.getElementById("printsDetail");
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
  document.getElementById("printsDetail")?.classList.toggle("is-fit-pending", Boolean(on));
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
  const detail = document.getElementById("printsDetail");
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
  if (galleryImmersive) {
    applyGalleryImmersiveViewportFit(viewport, nw, nh);
    return;
  }

  const { maxW, maxH } = getGalleryDetailFitMetrics();
  let w;
  let h;

  if (looksLikePartialDecode(nw, nh)) {
    const side = galleryLockedSquareSize?.w ?? Math.min(maxW, maxH);
    w = side;
    h = side;
    if (!galleryLockedSquareSize) galleryLockedSquareSize = { w, h };
  } else if (isNearlySquare(nw, nh) && galleryLockedSquareSize) {
    ({ w, h } = galleryLockedSquareSize);
  } else {
    ({ w, h } = computeGalleryViewportSize(nw, nh, maxW, maxH));
    if (isNearlySquare(nw, nh)) {
      const side = Math.min(w, h);
      w = side;
      h = side;
      galleryLockedSquareSize = { w, h };
    }
  }

  viewport.style.removeProperty("--gallery-art-ratio");
  viewport.style.width = `${w}px`;
  viewport.style.height = `${h}px`;
  viewport.dataset.galleryAspect = String(w / h);
  viewport.dataset.galleryFitMode = galleryImmersive ? "immersive" : "detail";
  viewport.classList.add("is-sized");

  if (viewport.offsetWidth < w - 2 || viewport.offsetHeight < h - 2) {
    viewport.style.setProperty("max-width", "none", "important");
    viewport.style.setProperty("max-height", "none", "important");
    viewport.style.width = `${w}px`;
    viewport.style.height = `${h}px`;
  }
}

function fitGalleryViewportSync(index) {
  const viewport = document.getElementById("printsRicoViewport");
  const stage = document.getElementById("printsRicoStage");
  const frame = stage?.querySelector(`.gallery-rico__frame[data-art-index="${index}"]`);
  const img = frame?.querySelector("img");
  if (!viewport || !img || img.naturalWidth === 0 || img.naturalHeight === 0) return false;
  applyGalleryViewportFit(viewport, img.naturalWidth, img.naturalHeight);
  return true;
}

async function waitForGalleryDetailReady(token) {
  if (token !== galleryFitToken || galleryViewMode !== "detail") return false;
  return document.getElementById("printsLayout")?.dataset.mode === "detail";
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
  galleryFitRetries = 0;
  resetGalleryImmersiveStageStability();

  while (galleryFitRetries <= GALLERY_FIT_MAX_RETRIES) {
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (token !== galleryFitToken || galleryViewMode !== "detail" || !galleryImmersive) return;

    if (!immersiveLayoutReady() || !immersiveStageSizeStable()) {
      galleryFitRetries += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      continue;
    }

    const finalSize = await waitForStableFrameNaturalSize(frame, token);
    if (token !== galleryFitToken || !galleryImmersive) return;
    if (!finalSize) {
      galleryFitRetries += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      continue;
    }

    if (maybeRevealImmersiveViewport(viewport, frame)) return;

    galleryFitRetries += 1;
    await new Promise((resolve) => window.setTimeout(resolve, 60));
  }

  const fallbackSize = getFrameNaturalSize(frame);
  applyGalleryImmersiveViewportFit(viewport, fallbackSize.nw, fallbackSize.nh);
  setGalleryImmersiveFitPending(false);
}

async function ensureGalleryViewportFit(token, expectedSrc) {
  if (token !== galleryFitToken || galleryViewMode !== "detail") return;

  const viewport = document.getElementById("printsRicoViewport");
  if (!viewport) return;

  const frame = viewport.querySelector(".gallery-rico__frame.is-active");
  const img = frame?.querySelector(".gallery-rico__img");
  if (!frame || !img) return;

  if (!(await waitForGalleryDetailReady(token))) return;
  if (token !== galleryFitToken || galleryViewMode !== "detail") return;

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

  await waitForGalleryImageReady(img, srcToWaitFor);
  if (token !== galleryFitToken || galleryViewMode !== "detail") return;

  if (galleryImmersive) {
    await waitForImmersiveLayoutAndFit(token, viewport, frame);
    return;
  }

  galleryFitRetries = 0;

  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    applyGalleryViewportFit(viewport, img.naturalWidth, img.naturalHeight);
  }

  if (typeof img.decode !== "function") return;

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

function fitGalleryViewport() {
  const viewport = document.getElementById("printsRicoViewport");
  const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
  scheduleFitGalleryViewport(img?.dataset.viewSrc);
}

function wireIndexImages() {
  document.querySelectorAll("#printsGrid .gallery-index__img").forEach((img) => {
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

function wireGalleryImages() {
  document.querySelectorAll("#printsGrid .gallery-rico__img").forEach((img) => {
    const frame = img.closest(".gallery-rico__frame");
    const index = Number(frame?.dataset.artIndex);
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
  const printsGrid = document.getElementById("printsGrid");
  if (!printsGrid) return;

  fixGalleryHeights();
  currentGalleryIndex = 0;
  galleryNavInitialized = false;
  galleryInteractionsInitialized = false;
  printsIndexInitialized = false;
  galleryViewMode = "grid";

  printsGrid.innerHTML = buildGalleryShell();
  lastIndexPageCount = indexPageCount();
  wireIndexImages();
  wireGalleryImages();
  fixGalleryHeights();
  syncGalleryIndexPageHeights();
  initPrintsIndexNav();
  initPrintsPageNav();
  initPrintsInteractions();
  updateGalleryDisplay(0);
  showGalleryGrid({ resetScroll: true });
  ensurePrintsIndexScrollReadySoon();
}

async function loadCatalog() {
  if (window.sanityClient?.fetchGallery) {
    try {
      const works = await window.sanityClient.fetchGallery();
      if (Array.isArray(works) && works.length > 0) {
        catalog = works.map((work, index) =>
          normalizeCatalogItem({
            file: work.legacyFilename || `${work.title}.jpg`,
            title: work.title,
            year: work.year || "",
            medium: work.medium || "",
            dimensions: work.dimensions || "",
            price: work.price || "",
            sold: Boolean(work.sold),
            filesIndex: catalogFilesIndex(work.legacyFilename, index),
            remoteViewSrc: work.imageUrl || null,
            remotePreviewSrc: work.imageUrl || null,
          })
        );
        const sg = await loadGallerySgData();
        catalog = mergeMissingGalleryPanels(catalog, sg);
        catalog = catalog.filter((item) => isPrintMedium(item));
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
  catalog = catalog.filter((item) => isPrintMedium(item));
}

function prefetchView(index) {
  const item = catalog[index];
  if (!item) return;

  const src = viewSrc(item.file);
  if (viewCache.has(src)) return;

  const img = new Image();
  viewCache.set(
    src,
    new Promise((resolve) => {
      const finish = () => resolve();
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      img.src = src;
    })
  );
}

function forceGalleryInternalScroll() {
  showGalleryGrid({ resetScroll: true });
}

async function rebuildGalleryLayout() {
  const layout = document.getElementById("printsLayout");
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
    window.printsGoToIndex?.(activeIndex, false);
    const viewport = document.getElementById("printsRicoViewport");
    const img = viewport?.querySelector(".gallery-rico__frame.is-active img");
    scheduleFitGalleryViewport(img?.dataset.viewSrc);
  }
}

async function initPrints() {
  await loadCatalog();
  await buildGallery();
  initPrintsImmersiveTap();
  forceGalleryInternalScroll();

  window.printsCatalogReady = true;
  window.printsRebuildPages = rebuildGalleryLayout;

  window.printsPreload = {
    previewSrc,
    viewSrc,
    originalSrc,
    prefetchView,
  };

  window.printsRefreshScrollFx = () => {
    fixGalleryHeights();
    syncGalleryIndexPageHeights();
    ensurePrintsIndexScrollReadySoon();
    scheduleGallerySync?.();
  };
  window.ensurePrintsIndexScrollReady = ensurePrintsIndexScrollReady;
  window.markPrintsSectionEntered = markPrintsSectionEntered;
  window.printsShowGrid = showGalleryGrid;
  window.printsOpenDetail = openGalleryDetail;
  window.printsIsImmersive = () => galleryImmersive;
  window.printsSetImmersive = setGalleryImmersive;

  document.addEventListener("prints:ready", fixGalleryHeights);

  window.addEventListener("resize", () => {
    fixGalleryHeights();
    window.clearTimeout(window.__printsResizeTimer);
    window.__printsResizeTimer = window.setTimeout(rebuildGalleryLayout, 180);
  });

  document.dispatchEvent(new CustomEvent("prints:ready"));

  markPrintsSectionEntered();

  if (document.body) {
    new MutationObserver(() => {
      if (document.body.dataset.currentSection === "prints") {
        markPrintsSectionEntered();
      }
    }).observe(document.body, { attributes: true, attributeFilter: ["data-current-section"] });
  }

}

initPrints();
})();
