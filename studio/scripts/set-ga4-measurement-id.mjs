import { getCliClient } from "sanity/cli";

const client = getCliClient({ apiVersion: "2024-01-01" });

await client
  .patch("siteSettings")
  .set({ ga4MeasurementId: "G-MB93ZL0LNQ" })
  .commit();

console.log("Published GA4 measurement ID: G-MB93ZL0LNQ");
