# Terence Maluleke — Sanity CMS

**Project:** TerenceART (`um9my25h`)  
**Studio:** https://terence-art.sanity.studio  
**Dataset:** `production`

## Local Studio

```bash
cd studio
npm install
npm run dev
```

Opens at http://localhost:3333

## Deploy Studio

```bash
npm run deploy
```

## Seed content from site JSON

```bash
npx sanity exec scripts/seed-content.mjs --with-user-token
```

## Content types

| Type | Section |
|------|---------|
| `siteSettings` | Site title, enquiry email |
| `artistInfo` | Bio |
| `artwork` | Gallery |
| `assamblage` | Assamblage |
| `studyImage` | Study |
| `exhibition` | Calendar |

Gallery and Assamblage use `legacyFilename` to match local image files until images are uploaded in Sanity.
