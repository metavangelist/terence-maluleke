import { BarChartIcon } from "@sanity/icons";
import { createElement } from "react";
import { definePlugin } from "sanity";
import { AnalyticsTool } from "./AnalyticsTool";

type AnalyticsPluginConfig = {
  apiUrl?: string;
  apiSecret?: string;
};

export function analyticsPlugin(config: AnalyticsPluginConfig = {}) {
  const apiUrl = config.apiUrl || "";
  const apiSecret = config.apiSecret || "";

  return definePlugin({
    name: "analytics",
    tools: [
      {
        name: "analytics",
        title: "Analytics",
        icon: BarChartIcon,
        component: () => createElement(AnalyticsTool, { apiUrl, apiSecret }),
      },
    ],
  });
}
