import { getCliClient } from "sanity/cli";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { legacyAssetFilenameCandidates } from "../../shared/legacy-asset-candidates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const client = getCliClient({ apiVersion: "2024-01-01" });

const ASSET_DIRS = {
  artwork: join(root, "assets", "gallery-view"),
  assamblage: join(root, "assets", "maquettes"),
};

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

function resolveAssetPath(baseDir, filename, type) {
  const candidates = legacyAssetFilenameCandidates(type, filename);

  for (const candidate of candidates) {
    const direct = join(baseDir, candidate);
    if (existsSync(direct)) return direct;
  }

  const lower = filename.toLowerCase();
  const match = listFiles(baseDir).find((name) => name.toLowerCase() === lower);
  return match ? join(baseDir, match) : null;
}

async function uploadImage(baseDir, filename, type) {
  const filePath = resolveAssetPath(baseDir, filename, type);
  if (!filePath) {
    console.warn(`  missing local file for ${filename}`);
    return null;
  }

  const sizeMb = (statSync(filePath).size / (1024 * 1024)).toFixed(1);
  console.log(`  uploading ${filePath} (${sizeMb} MB)`);

  const asset = await client.assets.upload("image", createReadStream(filePath), {
    filename: filePath.split("/").pop(),
  });

  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
  };
}

async function migrate() {
  const docs = await client.fetch(
    `*[_type in ["artwork", "assamblage"] && !defined(image.asset) && defined(legacyFilename)]{
      _id,
      _type,
      title,
      legacyFilename
    }`
  );

  if (!docs.length) {
    console.log("No documents missing images.");
    return;
  }

  console.log(`Found ${docs.length} documents missing Sanity images.`);

  for (const doc of docs) {
    const baseDir = ASSET_DIRS[doc._type];
    if (!baseDir) {
      console.warn(`Skipping ${doc._id}: no asset directory for type ${doc._type}`);
      continue;
    }

    console.log(`\n${doc.title} (${doc._id}) ← ${doc.legacyFilename}`);
    const image = await uploadImage(baseDir, doc.legacyFilename, doc._type);
    if (!image) continue;

    const resolvedFilename = resolveAssetPath(baseDir, doc.legacyFilename, doc._type)
      ?.split("/")
      .pop();

    const patch = client.patch(doc._id).set({ image });
    if (resolvedFilename && resolvedFilename !== doc.legacyFilename) {
      patch.set({ legacyFilename: resolvedFilename });
    }
    await patch.commit();
    console.log(`  patched ${doc._id}`);
  }

  console.log("\nDone.");
}

await migrate();
