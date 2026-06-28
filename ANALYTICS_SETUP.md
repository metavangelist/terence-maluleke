# GA4 analytics setup

The Terence site sends pageviews to Google Analytics 4, and the Sanity Studio **Analytics** tab reads live data through a secure Vercel API route.

## 1. Google Analytics property

1. Create or open your GA4 property for the site.
2. Note these two IDs:
   - **Measurement ID** (client tag): `G-XXXXXXXXXX`
   - **Property ID** (numeric, for the Data API): e.g. `123456789`

## 2. Service account for the Data API

1. In [Google Cloud Console](https://console.cloud.google.com/), create a service account for the project linked to GA4.
2. Create a JSON key for that service account.
3. In GA4 → **Admin → Property access management**, add the service account email as a **Viewer**.

## 3. Vercel environment variables

Add these in the Vercel project for `terence-maluleke-v2`:

```env
GA4_PROPERTY_ID=123456789
GA4_CLIENT_EMAIL=analytics@your-project.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ANALYTICS_API_SECRET=choose-a-long-random-secret
```

`GA4_PRIVATE_KEY` must keep literal `\n` line breaks when pasted into Vercel.

Redeploy after saving env vars so `/api/analytics` is available.

## 4. Sanity Studio environment variables

Create `studio/.env` (not committed):

```env
SANITY_STUDIO_ANALYTICS_API_URL=https://maluleke.art/api/analytics
SANITY_STUDIO_ANALYTICS_API_SECRET=same-secret-as-vercel
```

Restart `npm run dev` in `studio/` after changing env vars.

Deploy Studio with the same vars if you host it on sanity.studio:

```bash
cd studio
SANITY_STUDIO_ANALYTICS_API_URL=... SANITY_STUDIO_ANALYTICS_API_SECRET=... npm run deploy
```

## 5. Site measurement ID in CMS

1. Open Sanity Studio → **Site settings**.
2. Set **GA4 measurement ID** to your `G-XXXXXXXXXX` value and publish.

The public site loads this ID and sends artwork detail views as virtual page paths like:

- `/artworks/paintings/glory-days`
- `/artworks/prints/...`
- `/artworks/assamblage/...`

Those paths power the **Artwork page views** table in the Analytics tab.

## Local API testing

```bash
cd "/Users/kabelomabe/TERENCE NTSAKO-v2"
npm install
vercel dev
```

Then request:

```bash
curl -H "Authorization: Bearer YOUR_SECRET" "http://localhost:3000/api/analytics?range=30d"
```
