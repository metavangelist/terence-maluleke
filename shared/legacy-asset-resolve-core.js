/**
 * Browser-safe legacy asset URL resolution (no Node.js APIs).
 * @param {Array<{ file: string; preview?: string; view?: string }>} galleryItems
 */
export function createLegacyAssetResolver(galleryItems = []) {
  const galleryByFile = new Map(
    galleryItems.map((item) => [item.file, { view: item.view, preview: item.preview }])
  );

  const ASSAM_BLAGE_ALIASES = {
    "Apples.png": "Apples-mobile.png",
    "cfg.png": "cfg-mobile.png",
    "cfg.jpg": "cfg-mobile.png",
    "fg.png": "fg.jpg",
    "hjjjj copy.png": "hjjjj copy.jpg",
  };

  const LEGACY_ASSET_BASE = {
    artwork: "assets/gallery-view",
    assamblage: "assets/maquettes",
    studyImage: "assets/study",
  };

  const ARTWORK_PREVIEW_BASE = "assets/gallery-preview";

  function toAssetUrl(siteUrl, relativePath) {
    const parts = relativePath.replace(/^\/+/, "").split("/");
    return `${siteUrl}/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
  }

  function extensionSwapCandidates(filename) {
    const out = [filename];
    if (/\.png$/i.test(filename)) out.push(filename.replace(/\.png$/i, ".jpg"));
    if (/\.jpe?g$/i.test(filename)) out.push(filename.replace(/\.jpe?g$/i, ".png"));
    return [...new Set(out)];
  }

  function legacyAssetFilenameCandidates(documentType, legacyFilename) {
    if (!legacyFilename) return [];

    const names = new Set();
    const add = (name) => {
      if (name) names.add(name);
    };

    add(legacyFilename);
    for (const candidate of extensionSwapCandidates(legacyFilename)) add(candidate);

    if (documentType === "assamblage" && ASSAM_BLAGE_ALIASES[legacyFilename]) {
      add(ASSAM_BLAGE_ALIASES[legacyFilename]);
    }

    if (documentType === "artwork") {
      for (const key of [legacyFilename, ...extensionSwapCandidates(legacyFilename)]) {
        const mapped = galleryByFile.get(key);
        if (mapped?.view) {
          add(mapped.view.replace(/^assets\/gallery-view\//, ""));
        }
        if (mapped?.preview) {
          add(mapped.preview.replace(/^assets\/gallery-preview\//, ""));
        }
      }
    }

    return [...names];
  }

  function legacyPreviewUrlCandidates(documentType, legacyFilename, siteUrl) {
    if (!legacyFilename) return [];

    const viewBase = LEGACY_ASSET_BASE[documentType];
    if (!viewBase) return [];

    const urls = [];
    const push = (url) => {
      if (url && !urls.includes(url)) urls.push(url);
    };

    if (documentType === "artwork") {
      const mapped = galleryByFile.get(legacyFilename);
      if (mapped?.view) push(toAssetUrl(siteUrl, mapped.view));
      if (mapped?.preview) push(toAssetUrl(siteUrl, mapped.preview));

      for (const name of legacyAssetFilenameCandidates(documentType, legacyFilename)) {
        push(toAssetUrl(siteUrl, `${viewBase}/${name}`));
        push(toAssetUrl(siteUrl, `${ARTWORK_PREVIEW_BASE}/${name}`));
      }
    } else {
      for (const name of legacyAssetFilenameCandidates(documentType, legacyFilename)) {
        push(toAssetUrl(siteUrl, `${viewBase}/${name}`));
      }
    }

    return urls;
  }

  return { legacyAssetFilenameCandidates, legacyPreviewUrlCandidates };
}
