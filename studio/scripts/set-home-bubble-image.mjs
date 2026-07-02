import { getCliClient } from "sanity/cli";
import { createReadStream, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const imagePath = join(root, "assets", "images", "DSC01668_2.jpg");
const client = getCliClient({ apiVersion: "2024-01-01" });

if (!existsSync(imagePath)) {
  console.error(`Missing file: ${imagePath}`);
  process.exit(1);
}

const existing = await client.fetch(`*[_id == "homeBubble"][0]{ defaultArtwork }`);

if (existing?.defaultArtwork?.asset?._ref) {
  console.log("Home bubble default artwork already set — skipped.");
  process.exit(0);
}

const asset = await client.assets.upload("image", createReadStream(imagePath), {
  filename: "DSC01668_2.jpg",
});

const defaultArtwork = {
  _type: "image",
  asset: { _type: "reference", _ref: asset._id },
  hotspot: { x: 0.52, y: 0.42, height: 0.45, width: 0.45 },
};

await client.createOrReplace({
  _id: "homeBubble",
  _type: "homeBubble",
  defaultArtwork,
});

console.log("Stored the site default home bubble artwork.");
