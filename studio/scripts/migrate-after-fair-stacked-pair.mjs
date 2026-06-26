import { getCliClient } from "sanity/cli";
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const client = getCliClient({ apiVersion: "2024-01-01" });

const DOC_ID = "artwork-after-fair-vertical-diptych";
const TOP_FILE = "AFTER FAIR 002.jpg";
const BOTTOM_FILE = "AFTER FAIR 001.jpg";

async function uploadImage(folder, filename) {
  const path = join(folder, filename);
  const asset = await client.assets.upload("image", createReadStream(path), {
    filename,
  });
  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
  };
}

const topImage = await uploadImage(join(root, "assets", "gallery-view"), TOP_FILE);
const bottomImage = await uploadImage(join(root, "assets", "gallery-view"), BOTTOM_FILE);

await client
  .patch(DOC_ID)
  .set({
    presentationStyle: "stackedPair",
    image: topImage,
    secondImage: bottomImage,
    legacyFilename: TOP_FILE,
    pairRole: "primary",
  })
  .unset(["pairedArtwork"])
  .commit();

console.log("After Fair Vertical Diptych is now a stacked pair (top + bottom on one document).");
