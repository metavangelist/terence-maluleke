import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: "um9my25h",
    dataset: "production",
  },
  studioHost: "terence-art",
  deployment: {
    appId: "g695f2ltvrvk5066dwsbu7ik",
    autoUpdates: false,
  },
});
