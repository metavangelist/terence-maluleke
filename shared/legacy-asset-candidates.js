/**
 * Node.js entry for migration scripts — loads gallery-assets.json from disk.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLegacyAssetResolver } from "./legacy-asset-resolve-core.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {{ items?: Array<{ file: string; preview?: string; view?: string }> }} */
let galleryAssets = { items: [] };
try {
  galleryAssets = JSON.parse(
    readFileSync(join(repoRoot, "pages", "gallery-assets.json"), "utf8")
  );
} catch {
  // Fall back to extension swaps only.
}

const resolver = createLegacyAssetResolver(galleryAssets.items || []);

export const { legacyAssetFilenameCandidates, legacyPreviewUrlCandidates } = resolver;
