(function () {
  const LEGACY_DIPTYCH_FILES = ["AFTER FAIR 002.jpg", "AFTER FAIR 001.jpg"];

  function isStackedPairSecondary(item) {
    return item?.pairRole === "secondary";
  }

  function isLegacyDiptychFile(file) {
    return LEGACY_DIPTYCH_FILES.includes(file);
  }

  function isStackedPairItem(item) {
    if (!item || isStackedPairSecondary(item)) return false;
    if (item.presentationStyle === "stackedPair") {
      return Boolean(item.secondImageUrl || item.pairedArtworkId);
    }
    return isLegacyDiptychFile(item.file);
  }

  function legacyPartnerFile(file) {
    if (file === LEGACY_DIPTYCH_FILES[0]) return LEGACY_DIPTYCH_FILES[1];
    if (file === LEGACY_DIPTYCH_FILES[1]) return LEGACY_DIPTYCH_FILES[0];
    return null;
  }

  function getStackedPairPanels(item, catalog) {
    if (item.presentationStyle === "stackedPair") {
      const top = item;
      let bottom = null;

      if (item.secondImageUrl) {
        bottom = {
          ...item,
          title: `${item.title} (bottom panel)`,
          remoteViewSrc: item.secondImageUrl,
          remotePreviewSrc: item.secondPreviewUrl || item.secondImageUrl,
        };
      } else if (item.pairedArtworkId && Array.isArray(catalog)) {
        bottom = catalog.find((entry) => entry.sanityId === item.pairedArtworkId) || null;
      }

      if (bottom) return { top, bottom };
    }

    if (isLegacyDiptychFile(item.file) && Array.isArray(catalog)) {
      const partnerFile = legacyPartnerFile(item.file);
      const partner = catalog.find((entry) => entry.file === partnerFile);
      if (!partner) return null;
      const top = item.file === LEGACY_DIPTYCH_FILES[0] ? item : partner;
      const bottom = item.file === LEGACY_DIPTYCH_FILES[1] ? item : partner;
      return { top, bottom };
    }

    return null;
  }

  function findDiptychPrimaryIndex(catalog) {
    if (!Array.isArray(catalog)) return -1;
    return catalog.findIndex((item) => isStackedPairItem(item) && !isStackedPairSecondary(item));
  }

  function findDiptychSecondaryIndex(catalog) {
    if (!Array.isArray(catalog)) return -1;

    for (let i = 0; i < catalog.length; i += 1) {
      const item = catalog[i];
      if (isStackedPairSecondary(item)) return i;
      if (item.presentationStyle === "stackedPair" && item.pairedArtworkId) {
        const partnerIndex = catalog.findIndex((entry) => entry.sanityId === item.pairedArtworkId);
        if (partnerIndex >= 0) return partnerIndex;
      }
      if (isLegacyDiptychFile(item.file)) {
        return catalog.findIndex((entry) => entry.file === legacyPartnerFile(item.file));
      }
    }

    return -1;
  }

  function catalogHasStackedTitle(catalog, title) {
    return catalog.some(
      (item) =>
        item.title === title &&
        (item.presentationStyle === "stackedPair" || isStackedPairSecondary(item))
    );
  }

  window.galleryPairUtils = {
    LEGACY_DIPTYCH_FILES,
    isStackedPairSecondary,
    isLegacyDiptychFile,
    isStackedPairItem,
    getStackedPairPanels,
    findDiptychPrimaryIndex,
    findDiptychSecondaryIndex,
    catalogHasStackedTitle,
  };
})();
