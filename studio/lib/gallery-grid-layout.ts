import "../../shared/gallery-grid-layout.js";

type GalleryGridLayoutApi = {
  packGalleryPages: (
    entries: unknown[],
    options?: { mobile?: boolean }
  ) => Array<Array<{ entry: unknown; placement: unknown }>>;
  pagesToEntries: (pages: unknown[][]) => unknown[][];
  gridLayout: (mobile?: boolean) => { cols: number; rows: number; perPage: number; mobile: boolean };
  listOpenGridSlots: (
    page: Array<{ placement: { col: number; row: number; rowSpan?: number; colSpan?: number } }>,
    mobile?: boolean
  ) => Array<{ col: number; row: number }>;
  placementStyle: (placement: unknown) => string;
};

const api = (globalThis as typeof globalThis & { galleryGridLayout?: GalleryGridLayoutApi })
  .galleryGridLayout;

if (!api) {
  throw new Error("galleryGridLayout failed to load");
}

export const {
  packGalleryPages,
  pagesToEntries,
  gridLayout,
  listOpenGridSlots,
  placementStyle,
} = api;
