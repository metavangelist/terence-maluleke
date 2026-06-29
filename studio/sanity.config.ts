import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { analyticsPlugin } from "./plugins/analytics";
import { schemaTypes } from "./schemaTypes";
import { structure } from "./structure";

const analyticsApiUrl =
  process.env.SANITY_STUDIO_ANALYTICS_API_URL ||
  "https://maluleke.art/api/analytics";
const analyticsApiSecret = process.env.SANITY_STUDIO_ANALYTICS_API_SECRET || "";

export default defineConfig({
  name: "terence-art",
  title: "Terence Maluleke",
  projectId: "um9my25h",
  dataset: "production",
  plugins: [
    structureTool({ structure }),
    visionTool(),
    analyticsPlugin({
      apiUrl: analyticsApiUrl,
      apiSecret: analyticsApiSecret,
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev,
      {
        id: "printArtwork",
        title: "Print",
        schemaType: "artwork",
        value: {
          medium: "Print",
        },
      },
    ],
  },
});
