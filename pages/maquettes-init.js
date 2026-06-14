(function () {
  const CATALOG = [
    {
      file: "Apples.png",
      title: "Apples",
      year: "2025",
      medium: "Assamblage",
      dimensions: "—",
      sold: false,
    },
    {
      file: "cfg.png",
      title: "cfg",
      year: "2025",
      medium: "Assamblage",
      dimensions: "—",
      price: "ZAR 20000",
      sold: false,
    },
    {
      file: "fg.png",
      title: "fg",
      year: "2025",
      medium: "Assamblage",
      dimensions: "—",
      sold: true,
    },
    {
      file: "hjjjj copy.png",
      title: "hjjjj copy",
      year: "2025",
      medium: "Assamblage",
      dimensions: "—",
      sold: true,
    },
  ];

  const ASSET_BASE = "assets/maquettes";
  const CACHE = "?v=20260614g";
  const ENQUIRY_EMAIL = "terence.ntsako@gmail.com";

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
  const MAQ_FIT_MAX_RETRIES = 24;

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

  function computeMaqViewportSize(nw, nh, stageW, stageH) {
    const maxW = Math.min(stageW || MAQ_VIEWPORT_MAX, MAQ_VIEWPORT_MAX);
    const maxH = stageH || Math.round(window.innerHeight * 0.55);
    const scale = Math.min(maxW / nw, maxH / nh);
    return {
      w: Math.max(1, Math.round(nw * scale)),
      h: Math.max(1, Math.round(nh * scale)),
    };
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function assetSrc(file) {
    return `${ASSET_BASE}/${encodeURI(file)}${CACHE}`;
  }

  function assetFallbackSrc(file) {
    if (!/\.png$/i.test(file)) return null;
    return assetSrc(file.replace(/\.png$/i, ".jpg"));
  }

  function wireMaquetteImage(img) {
    img.addEventListener(
      "error",
      () => {
        const fallback = assetFallbackSrc(img.dataset.assetFile || "");
        if (fallback && img.src !== fallback) img.src = fallback;
      },
      { once: true }
    );
  }

  function enquiryMailto(item) {
    const subject = encodeURIComponent(`Enquiry: ${item.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI would like to enquire about the artwork "${item.title}" (Assamblage).\n\n`
    );
    return `mailto:${ENQUIRY_EMAIL}?subject=${subject}&body=${body}`;
  }

  function gridLayout() {
    const mobile = window.innerWidth < 600;
    return {
      cols: mobile ? 2 : 3,
      rows: mobile ? 2 : 2,
      perPage: mobile ? 4 : 6,
    };
  }

  function indexPageCount() {
    const { perPage } = gridLayout();
    return Math.max(1, Math.ceil(CATALOG.length / perPage));
  }

  function isGalleryDetailOpen() {
    return document.getElementById("galleryLayout")?.dataset.mode === "detail";
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

    if (isGalleryDetailOpen()) return;

    homeNav.textContent = "home";
    homeNav.setAttribute("data-scroll-section", navHomeSection);
    homeNav.removeAttribute("data-gallery-exit");
    homeNav.hidden = !document.body.classList.contains("is-past-home");
  }

  function frameHtml(item, index, isActive) {
    const src = assetSrc(item.file);
    return `
      <figure class="gallery-rico__frame${isActive ? " is-active" : ""}" data-art-index="${index}" aria-hidden="${isActive ? "false" : "true"}">
        <img
          class="gallery-rico__img"
          src="${src}"
          data-asset-file="${escapeHtml(item.file)}"
          alt="${escapeHtml(item.title)}"
          loading="${index === 0 ? "eager" : "lazy"}"
          decoding="async"
          draggable="false"
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

  function buildIndexCellMarkup(item, index) {
    const src = assetSrc(item.file);
    return `
      <button type="button" class="gallery-index__cell" data-art-index="${index}" aria-label="View ${escapeHtml(item.title)}">
        <img
          class="gallery-index__img"
          src="${src}"
          data-asset-file="${escapeHtml(item.file)}"
          alt="${escapeHtml(item.title)}"
          loading="${index < 6 ? "eager" : "lazy"}"
          decoding="async"
          draggable="false"
        />
      </button>
    `;
  }

  function buildIndexMarkup() {
    const { cols, rows, perPage } = gridLayout();
    const pages = indexPageCount();
    let pagesHtml = "";

    for (let page = 0; page < pages; page += 1) {
      const start = page * perPage;
      const cells = CATALOG.slice(start, start + perPage)
        .map((item, offset) => buildIndexCellMarkup(item, start + offset))
        .join("");

      pagesHtml += `
        <div class="gallery-index__page" data-page="${page}" style="--gi-cols: ${cols}; --gi-rows: ${rows}">
          <div class="gallery-index__grid" role="list">${cells}</div>
        </div>
      `;
    }

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
                ${CATALOG.map((item, i) => frameHtml(item, i, i === 0)).join("")}
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
    viewport.classList.remove("is-sized");
    viewport.style.removeProperty("width");
    viewport.style.removeProperty("height");
    viewport.style.removeProperty("aspect-ratio");
    maqFitToken += 1;
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

    if (stageH < MAQ_FIT_MIN_STAGE_H) {
      if (maqFitRetries < MAQ_FIT_MAX_RETRIES) {
        maqFitRetries += 1;
        window.setTimeout(() => scheduleFitViewport(), 60);
      }
      return;
    }

    maqFitRetries = 0;

    const { w, h } = computeMaqViewportSize(nw, nh, stageW, stageH);
    viewport.style.width = `${w}px`;
    viewport.style.height = `${h}px`;

    viewport.classList.add("is-sized");
  }

  function fitViewport() {
    scheduleFitViewport();
  }

  function updateDisplay(index) {
    const item = CATALOG[index];
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

    const prevBtn = document.getElementById("maqRicoPrev");
    const nextBtn = document.getElementById("maqRicoNext");
    if (prevBtn) {
      prevBtn.disabled = false;
      prevBtn.setAttribute(
        "aria-label",
        index <= 0 ? "Back to Assamblage grid" : "Previous artwork"
      );
    }
    if (nextBtn) nextBtn.disabled = index >= CATALOG.length - 1;

    resetViewportSize();
    fitViewport();
  }

  function scrollGridToIndex(index) {
    const scroller = document.getElementById("maquettesIndexScroller");
    if (!scroller) return;
    const { perPage } = gridLayout();
    const page = Math.floor(index / perPage);
    const pageEl = scroller.querySelector(`.gallery-index__page[data-page="${page}"]`);
    if (pageEl) pageEl.scrollIntoView({ block: "start" });
  }

  function showGrid(options = {}) {
    collapseMaquettesCoa();
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
    if (index < 0 || index >= CATALOG.length) return;

    viewMode = "detail";
    currentIndex = index;

    const layout = document.getElementById("maquettesLayout");
    if (layout) layout.dataset.mode = "detail";

    resetViewportSize();

    const stage = document.getElementById("maqRicoStage");
    const frames = stage?.querySelectorAll(".gallery-rico__frame") || [];
    frames.forEach((frame, i) => {
      frame.classList.toggle("is-active", i === index);
      frame.setAttribute("aria-hidden", i === index ? "false" : "true");
    });

    setNavExitMode(true);
    updateDisplay(index);
  }

  function goToIndex(index) {
    if (index < 0 || index >= CATALOG.length) return;
    if (index === currentIndex) return;

    resetViewportSize();

    const stage = document.getElementById("maqRicoStage");
    const frames = stage?.querySelectorAll(".gallery-rico__frame") || [];
    frames.forEach((frame, i) => {
      frame.classList.toggle("is-active", i === index);
      frame.setAttribute("aria-hidden", i === index ? "false" : "true");
    });

    currentIndex = index;
    collapseMaquettesCoa();
    updateDisplay(index);
  }

  function initIndexNav() {
    if (indexInitialized) return;
    const grid = document.getElementById("maquettesGrid");
    const scroller = document.getElementById("maquettesIndexScroller");
    if (!grid || !scroller) return;

    indexInitialized = true;

    grid.addEventListener("click", (event) => {
      if (viewMode !== "grid") return;
      const cell = event.target.closest(".gallery-index__cell");
      if (!cell) return;
      const index = Number(cell.dataset.artIndex);
      if (!Number.isFinite(index)) return;
      event.preventDefault();
      openDetail(index);
    });
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
      if (currentIndex < CATALOG.length - 1) goToIndex(currentIndex + 1);
    });

    document.addEventListener("keydown", (e) => {
      if (document.body.dataset.currentSection !== "maquettes") return;
      if (viewMode !== "detail") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex < CATALOG.length - 1) goToIndex(currentIndex + 1);
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
    if (typeof window.initDetailMagnifier === "function") {
      window.initDetailMagnifier(viewport, {
        isActive: () =>
          viewMode === "detail" && document.body.dataset.currentSection === "maquettes",
      });
    }

    initMaquettesCoaDisclosure();
  }

  function buildMaquettes(force = false) {
    const grid = document.getElementById("maquettesGrid");
    if (!grid) return;

    const { cols, rows } = gridLayout();

    if (isBuilt && !force && cols === lastGridCols && rows === lastGridRows) {
      return;
    }

    lastGridCols = cols;
    lastGridRows = rows;

    currentIndex = 0;
    viewMode = "grid";
    navInitialized = false;
    indexInitialized = false;
    interactionsInitialized = false;

    grid.innerHTML = buildShell();
    initIndexNav();
    initDetailNav();
    initInteractions();


    updateDisplay(0);
    showGrid({ resetScroll: true });
    isBuilt = true;
  }

  function init() {
    buildMaquettes();

    window.maquettesShowGrid = showGrid;
    window.maquettesOpenDetail = openDetail;
    window.maquettesGoToIndex = goToIndex;
    window.refreshMaquettesLayout = () => {
      const { cols, rows } = gridLayout();
      if (cols !== lastGridCols || rows !== lastGridRows) {
        buildMaquettes(true);
      } else if (viewMode === "detail") {
        fitViewport();
      }
    };

    window.addEventListener("resize", () => {
      window.clearTimeout(window.__maquettesResizeTimer);
      window.__maquettesResizeTimer = window.setTimeout(() => {
        const { cols, rows } = gridLayout();
        if (cols !== lastGridCols || rows !== lastGridRows) {
          const savedIndex = currentIndex;
          const savedMode = viewMode;
          buildMaquettes(true);
          if (savedMode === "detail") openDetail(savedIndex);
        } else if (viewMode === "detail") {
          fitViewport();
        }
      }, 180);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
