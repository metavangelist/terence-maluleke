/**
 * Shared gallery grid packing — used by the live site and Sanity Studio.
 *
 * Page 0 (desktop): bento — up to 4 singles in cols 1–2 + combined piece in col 3.
 * Page 0 (mobile): bento — up to 2 singles in col 1 + combined piece in col 2.
 * A 5th single (desktop) or 3rd single (mobile) bumps the combined piece to the next page.
 * Later pages: standard grid; combined pieces shift col 1 → 2 → 3 as the page fills.
 */

const DESKTOP_BENTO_SINGLE_SLOTS = [
  { col: 1, row: 1 },
  { col: 2, row: 1 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
];

const MOBILE_BENTO_SINGLE_SLOTS = [
  { col: 1, row: 1 },
  { col: 1, row: 2 },
];

const DESKTOP_DIPTYCH = { col: 3, row: 1, rowSpan: 2, colSpan: 1 };
const MOBILE_DIPTYCH = { col: 2, row: 1, rowSpan: 2, colSpan: 1 };

function gridLayout(mobile = false) {
  if (mobile) return { cols: 2, rows: 2, perPage: 4, mobile: true };
  return { cols: 3, rows: 2, perPage: 6, mobile: false };
}

/** Desktop/mobile fixed slot positions for empty placeholders in CMS preview. */
function listOpenGridSlots(page, mobile = false) {
  const { cols, rows } = gridLayout(mobile);
  const occupied = new Set();
  for (const { placement } of page) {
    const rowSpan = placement.rowSpan || 1;
    const colSpan = placement.colSpan || 1;
    for (let r = placement.row; r < placement.row + rowSpan; r += 1) {
      for (let c = placement.col; c < placement.col + colSpan; c += 1) {
        occupied.add(`${c},${r}`);
      }
    }
  }
  const open = [];
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      if (!occupied.has(`${col},${row}`)) open.push({ col, row });
    }
  }
  return open;
}

function placementStyle(placement) {
  if (!placement) return "";
  const rowPart =
    placement.rowSpan && placement.rowSpan > 1
      ? `grid-row: ${placement.row} / span ${placement.rowSpan};`
      : `grid-row: ${placement.row};`;
  const colPart =
    placement.colSpan && placement.colSpan > 1
      ? `grid-column: ${placement.col} / span ${placement.colSpan};`
      : `grid-column: ${placement.col};`;
  return ` style="${colPart} ${rowPart}"`;
}

function occupiedCells(page, cols, rows) {
  const occupied = new Set();
  for (const { placement } of page) {
    const rowSpan = placement.rowSpan || 1;
    const colSpan = placement.colSpan || 1;
    for (let r = placement.row; r < placement.row + rowSpan; r += 1) {
      for (let c = placement.col; c < placement.col + colSpan; c += 1) {
        occupied.add(`${c},${r}`);
      }
    }
  }
  return occupied;
}

function findDiptychOnPage(page) {
  return page.find((placed) => placed.entry.kind === "diptych") || null;
}

function shiftDiptychRight(page, cols) {
  const diptych = findDiptychOnPage(page);
  if (!diptych || diptych.placement.col >= cols) return;
  diptych.placement.col += 1;
}

function firstFreeCell(page, cols, rows) {
  const occupied = occupiedCells(page, cols, rows);
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      if (!occupied.has(`${col},${row}`)) return { col, row, rowSpan: 1, colSpan: 1 };
    }
  }
  return null;
}

function columnFreeForDiptych(page, col, rows = 2) {
  const occupied = occupiedCells(page, col, rows);
  for (let row = 1; row <= rows; row += 1) {
    if (occupied.has(`${col},${row}`)) return false;
  }
  return true;
}

function placeDiptychOnStandardPage(page, entry, cols) {
  const preferred = Math.min(
    1 + page.filter((placed) => placed.entry.kind !== "diptych").length,
    cols
  );
  const tryOrder = [];
  for (let col = preferred; col <= cols; col += 1) tryOrder.push(col);
  for (let col = 1; col < preferred; col += 1) tryOrder.push(col);

  for (const col of tryOrder) {
    if (!columnFreeForDiptych(page, col)) continue;
    page.push({
      entry,
      placement: { col, row: 1, rowSpan: 2, colSpan: 1 },
    });
    return true;
  }
  return false;
}

function placeSingleOnStandardPage(page, entry, cols, rows) {
  if (findDiptychOnPage(page)) shiftDiptychRight(page, cols);
  const placement = firstFreeCell(page, cols, rows);
  if (!placement) return false;
  page.push({ entry, placement });
  return true;
}

function addToStandardPage(page, entry, mobile) {
  const { cols, rows } = gridLayout(mobile);
  if (entry.kind === "diptych") {
    return placeDiptychOnStandardPage(page, entry, cols);
  }
  return placeSingleOnStandardPage(page, entry, cols, rows);
}

function isPageFull(page, mobile) {
  const { cols, rows, perPage } = gridLayout(mobile);
  return occupiedCells(page, cols, rows).size >= perPage;
}

function flushPage(pages, page) {
  if (page.length) pages.push(page);
  return [];
}

function placeDiptychOnBentoPage0(page, entry, mobile) {
  const placement = mobile ? { ...MOBILE_DIPTYCH } : { ...DESKTOP_DIPTYCH };
  page.push({ entry, placement });
}

function placeSingleOnBentoPage0(page, entry, slotIndex, mobile) {
  const slots = mobile ? MOBILE_BENTO_SINGLE_SLOTS : DESKTOP_BENTO_SINGLE_SLOTS;
  const placement = slots[slotIndex];
  if (!placement) return false;
  page.push({
    entry,
    placement: { ...placement, rowSpan: 1, colSpan: 1 },
  });
  return true;
}

function removeDiptychFromPage(page) {
  const index = page.findIndex((placed) => placed.entry.kind === "diptych");
  if (index < 0) return null;
  const [removed] = page.splice(index, 1);
  return removed.entry;
}

function firstFreeCellOnPage0Standard(page, mobile) {
  const cols = mobile ? 2 : 3;
  return firstFreeCell(page, cols, 2);
}

/** @typedef {{ kind: 'single'|'diptych', catalogIndex: number, item: object, bottomItem?: object, indices?: number[], id?: string }} GridEntry */
/** @typedef {{ col: number, row: number, rowSpan?: number, colSpan?: number }} GridPlacement */
/** @typedef {{ entry: GridEntry, placement: GridPlacement }} PlacedEntry */

/**
 * @param {GridEntry[]} entries
 * @param {{ mobile?: boolean }} [options]
 * @returns {PlacedEntry[][]}
 */
function packGalleryPages(entries, options = {}) {
  const mobile = Boolean(options.mobile);
  const maxSinglesWithDiptych = mobile ? 2 : 4;
  const pages = [];
  let page = [];
  let page0Mode = "bento";
  let page0SingleCount = 0;
  let page0HasDiptych = false;
  let pendingDiptych = null;

  function finishPage0() {
    page = flushPage(pages, page);
    page0Mode = "done";
  }

  for (const entry of entries) {
    const onPage0 = pages.length === 0 && page0Mode === "bento";

    if (onPage0) {
      if (entry.kind === "diptych") {
        if (!page0HasDiptych && page0SingleCount <= maxSinglesWithDiptych) {
          placeDiptychOnBentoPage0(page, entry, mobile);
          page0HasDiptych = true;
        } else {
          // Too many singles for bento + diptych — defer diptych and keep filling page 0.
          pendingDiptych = entry;
        }
        continue;
      }

      if (!page0HasDiptych && page0SingleCount < maxSinglesWithDiptych) {
        placeSingleOnBentoPage0(page, entry, page0SingleCount, mobile);
        page0SingleCount += 1;
        if (isPageFull(page, mobile)) finishPage0();
        continue;
      }

      if (page0HasDiptych && page0SingleCount < maxSinglesWithDiptych) {
        placeSingleOnBentoPage0(page, entry, page0SingleCount, mobile);
        page0SingleCount += 1;
        if (isPageFull(page, mobile)) finishPage0();
        continue;
      }

      if (page0SingleCount === maxSinglesWithDiptych && page0HasDiptych) {
        // Page 0 bento is full (max singles + diptych). More singles go to page 2+.
        finishPage0();
        if (!addToStandardPage(page, entry, mobile)) {
          page = flushPage(pages, page);
          addToStandardPage(page, entry, mobile);
        }
        continue;
      }

      // Singles beyond bento slots but page 0 still has free cells (diptych deferred).
      const placement = firstFreeCellOnPage0Standard(page, mobile);
      if (placement) {
        page.push({ entry, placement });
        page0SingleCount += 1;
        if (isPageFull(page, mobile)) finishPage0();
        continue;
      }

      finishPage0();
    }

    if (pendingDiptych) {
      const diptychEntry = pendingDiptych;
      pendingDiptych = null;
      if (!addToStandardPage(page, diptychEntry, mobile)) {
        page = flushPage(pages, page);
        addToStandardPage(page, diptychEntry, mobile);
      }
    }

    if (!addToStandardPage(page, entry, mobile)) {
      page = flushPage(pages, page);
      addToStandardPage(page, entry, mobile);
    }

    if (isPageFull(page, mobile)) page = flushPage(pages, page);
  }

  if (pendingDiptych) {
    if (!addToStandardPage(page, pendingDiptych, mobile)) {
      page = flushPage(pages, page);
      addToStandardPage(page, pendingDiptych, mobile);
    }
    pendingDiptych = null;
  }

  flushPage(pages, page);
  return pages.length ? pages : [[]];
}

/** @param {PlacedEntry[][]} pages */
function pagesToEntries(pages) {
  return pages.map((page) => page.map((placed) => placed.entry));
}

const api = {
  packGalleryPages,
  pagesToEntries,
  listOpenGridSlots,
  gridLayout,
  placementStyle,
  DESKTOP_BENTO_SINGLE_SLOTS,
  MOBILE_BENTO_SINGLE_SLOTS,
  DESKTOP_DIPTYCH,
  MOBILE_DIPTYCH,
};

if (typeof globalThis !== "undefined") {
  globalThis.galleryGridLayout = api;
}
