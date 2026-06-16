import { getCliClient } from "sanity/cli";
import { createReadStream, existsSync, readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const client = getCliClient({ apiVersion: "2024-01-01" });

const GALLERY_FILES = [
  "Glory days 2.jpg",
  "DSC01349.jpg",
  "DSC01668_2.jpg",
  "Crimson Accord 3 small.jpg",
  "cbb.jpg",
  "lamp.jpg",
  "AFTER FAIR 002.jpg",
  "AFTER FAIR 001.jpg",
  "HOME 04 copy.jpg",
  "My buried jesus ii.jpg",
  "CARRY YOURS.jpg",
  "Swallowed.jpg",
  "download - 2026-05-21T073335.434.jpg",
  "T 9.jpg",
  "DSC07737.jpg",
  "T 11.jpg",
  "T 12.jpg",
  "Artwork 1.jpg",
  "Artwork 2.jpg",
  "Shine.jpg",
  "sky.jpg",
  "hidden.jpg",
  "Simone co.jpg",
  "Simone.jpg",
  "yima.jpg",
  "xbf.jpg",
  "wwe.jpg",
  "T 8.jpg",
  "T 7.jpg",
  "T 6.jpg",
  "T 5.jpg",
  "T 4.jpg",
  "T 3.jpg",
  "T 10.jpg",
  "fg.jpg",
  "T 1.jpg",
  "T 2.jpg",
];

const ASSAM_BLAGE_CATALOG = [
  { file: "Apples.png", title: "Apples", year: "2025", medium: "Assamblage", dimensions: "—" },
  { file: "cfg.png", title: "cfg", year: "2025", medium: "Assamblage", dimensions: "—", price: "ZAR 20000" },
  { file: "fg.png", title: "fg", year: "2025", medium: "Assamblage", dimensions: "—", sold: true },
  { file: "hjjjj copy.png", title: "hjjjj copy", year: "2025", medium: "Assamblage", dimensions: "—", sold: true },
];

const EXHIBITIONS = [
  {
    slug: "hidden-parts",
    name: "Hidden Parts",
    day: 8,
    venue: "Southern Guild · Cape Town",
    detail:
      "New paintings and works on paper — ritual, memory, and the hidden life of everyday objects.",
  },
  {
    slug: "kasi-portraits",
    name: "Kasi Portraits",
    day: 16,
    venue: "Gallery MOMO · Johannesburg",
    detail:
      "Solo presentation of new figurative paintings exploring township life and pan-African identity.",
  },
  {
    slug: "crimson-accord",
    name: "Crimson Accord",
    day: 24,
    venue: "Circa Gallery · Johannesburg",
    detail:
      "A group presentation of recent canvases — colour, congregation, and the politics of gathering.",
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function artworkDocumentId(title, file, fileToTitle) {
  const base = slugify(title);
  const panelCount = Object.values(fileToTitle || {}).filter((mappedTitle) => mappedTitle === title)
    .length;
  if (panelCount <= 1) return `artwork-${base}`;
  return `artwork-${slugify(file.replace(/\.[^.]+$/, ""))}`;
}

function resolveAssetPath(baseDir, filename) {
  const direct = join(baseDir, filename);
  if (existsSync(direct)) return direct;

  const lower = filename.toLowerCase();
  const match = readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .find((entry) => entry.name.toLowerCase() === lower);

  return match ? join(baseDir, match.name) : null;
}

async function uploadImage(baseDir, filename) {
  const filePath = resolveAssetPath(baseDir, filename);
  if (!filePath) {
    console.warn(`  missing image: ${filename}`);
    return null;
  }

  const asset = await client.assets.upload("image", createReadStream(filePath), {
    filename,
  });

  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
  };
}

function eventDateFromParts(year, month, day) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

async function seed() {
  const sg = JSON.parse(
    readFileSync(join(root, "pages", "gallery-sg-data.json"), "utf8")
  );
  const study = JSON.parse(
    readFileSync(join(root, "pages", "study-images.json"), "utf8")
  );

  const byTitle = Object.fromEntries(sg.works.map((work) => [work.title, work]));

  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth() + 1;
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();

  const tx = client.transaction();

  tx.createOrReplace({
    _id: "siteSettings",
    _type: "siteSettings",
    siteTitle: "Terence Ntsako Maluleke",
    enquiryEmail: "Contact@maluleke.art",
  });

  tx.createOrReplace({
    _id: "artistInfo",
    _type: "artistInfo",
    bioPlain:
      "Terence Ntsako Maluleke is a digital artist and painter. Born in Soweto, South Africa, Maluleke draws inspiration from the township community he grew up in.",
  });

  console.log(`Seeding ${GALLERY_FILES.length} gallery artworks…`);
  for (let index = 0; index < GALLERY_FILES.length; index += 1) {
    const file = GALLERY_FILES[index];
    const mappedTitle = sg.fileToTitle?.[file];
    const work = mappedTitle ? byTitle[mappedTitle] : null;
    const title = work?.title || file.replace(/\.[^.]+$/, "");
    const slug = slugify(title);
    const image = await uploadImage(join(root, "assets", "gallery-view"), file);

    tx.createOrReplace({
      _id: artworkDocumentId(title, file, sg.fileToTitle),
      _type: "artwork",
      title,
      slug: { _type: "slug", current: slug },
      year: work?.year || "",
      medium: work?.medium || "Acrylic on canvas",
      dimensions: work?.dimensions || "",
      sold: Boolean(work?.sold),
      legacyFilename: file,
      sortOrder: index,
      ...(image ? { image } : {}),
    });
  }

  console.log(`Seeding ${ASSAM_BLAGE_CATALOG.length} assamblage works…`);
  for (let index = 0; index < ASSAM_BLAGE_CATALOG.length; index += 1) {
    const item = ASSAM_BLAGE_CATALOG[index];
    const slug = slugify(item.title);
    const image = await uploadImage(join(root, "assets", "maquettes"), item.file);

    tx.createOrReplace({
      _id: `assamblage-${slug}`,
      _type: "assamblage",
      title: item.title,
      slug: { _type: "slug", current: slug },
      year: item.year,
      medium: item.medium,
      dimensions: item.dimensions,
      price: item.price || "",
      sold: Boolean(item.sold),
      legacyFilename: item.file,
      sortOrder: index,
      ...(image ? { image } : {}),
    });
  }

  console.log(`Seeding ${(study.images || []).length} study images…`);
  for (let index = 0; index < (study.images || []).length; index += 1) {
    const file = study.images[index];
    const slug = slugify(file);
    const image = await uploadImage(join(root, "assets", "study"), file);

    tx.createOrReplace({
      _id: `study-${slug}`,
      _type: "studyImage",
      legacyFilename: file,
      sortOrder: index,
      ...(image ? { image } : {}),
    });
  }

  console.log(`Seeding ${EXHIBITIONS.length} calendar events…`);
  EXHIBITIONS.forEach((show, index) => {
    const day = Math.min(show.day, daysInMonth);
    const eventDate = eventDateFromParts(calYear, calMonth, day);

    tx.createOrReplace({
      _id: `exhibition-${show.slug}`,
      _type: "exhibition",
      name: show.name,
      slug: { _type: "slug", current: show.slug },
      eventDate,
      day,
      month: calMonth,
      year: calYear,
      venue: show.venue,
      detail: show.detail,
    });
  });

  await tx.commit();
  console.log("Done — all gallery, assamblage, study, and calendar content seeded.");
}

await seed();
