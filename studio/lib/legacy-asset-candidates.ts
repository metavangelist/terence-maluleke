import galleryAssets from "../../pages/gallery-assets.json";
import { createLegacyAssetResolver } from "../../shared/legacy-asset-resolve-core.js";

const resolver = createLegacyAssetResolver(galleryAssets.items || []);

export const { legacyAssetFilenameCandidates, legacyPreviewUrlCandidates } = resolver;
