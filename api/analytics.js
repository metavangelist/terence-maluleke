const { BetaAnalyticsDataClient } = require("@google-analytics/data");

const ALLOWED_ORIGINS = new Set([
  "https://terence-art.sanity.studio",
  "http://localhost:3333",
]);

function getCredentials() {
  const email = process.env.GA4_CLIENT_EMAIL;
  const key = process.env.GA4_PRIVATE_KEY;

  if (!email || !key) {
    return null;
  }

  return {
    client_email: email,
    private_key: key.replace(/\\n/g, "\n"),
  };
}

function getDateRange(range) {
  const map = {
    "7d": "7daysAgo",
    "30d": "30daysAgo",
    "90d": "90daysAgo",
  };

  return map[range] || "30daysAgo";
}

function isAuthorized(req) {
  const secret = process.env.ANALYTICS_API_SECRET;
  if (!secret) {
    return false;
  }

  const header = req.headers.authorization || "";
  return header === `Bearer ${secret}`;
}

function formatGaDate(value) {
  const raw = String(value || "");
  if (raw.length !== 8) {
    return raw;
  }

  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);

  return date.toLocaleDateString("en-ZA", {
    month: "short",
    day: "numeric",
  });
}

function parseMetricRows(response, metricNames) {
  const rows = response?.[0]?.rows || [];

  return rows.map((row) => {
    const entry = {};
    const dimensions = row.dimensionValues || [];
    const metrics = row.metricValues || [];

    dimensions.forEach((dimension, index) => {
      const name = response[0].dimensionHeaders?.[index]?.name;
      if (name) {
        entry[name] = dimension.value;
      }
    });

    metricNames.forEach((name, index) => {
      entry[name] = Number(metrics[index]?.value || 0);
    });

    return entry;
  });
}

function artworkLabelFromPath(path) {
  const segments = String(path || "")
    .split("/")
    .filter(Boolean);

  const slug = segments[segments.length - 1] || path;
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";

  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentials = getCredentials();

  if (!propertyId) {
    return res.status(500).json({ error: "GA4_PROPERTY_ID is not configured" });
  }

  if (!credentials) {
    return res.status(500).json({
      error: "GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY are not configured",
    });
  }

  const range = String(req.query.range || "30d");
  const startDate = getDateRange(range);
  const property = `properties/${propertyId}`;

  try {
    const client = new BetaAnalyticsDataClient({ credentials });

    const [
      trafficTotalsResponse,
      trafficResponse,
      countryResponse,
      cityResponse,
      deviceResponse,
      artworkPathResponse,
    ] = await Promise.all([
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "activeUsers" },
            { name: "sessions" },
          ],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "activeUsers" },
            { name: "sessions" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 15,
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "city" }, { name: "country" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
          limit: 15,
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          dimensionFilter: {
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType: "CONTAINS",
                value: "/artworks/",
              },
            },
          },
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 100,
        }),
      ]);

    const trafficRows = parseMetricRows(trafficResponse, [
      "screenPageViews",
      "activeUsers",
      "sessions",
    ]);

    const trafficTotalsRow = trafficTotalsResponse?.[0]?.rows?.[0]?.metricValues || [];
    const trafficTotals = {
      pageviews: Number(trafficTotalsRow[0]?.value || 0),
      visitors: Number(trafficTotalsRow[1]?.value || 0),
      sessions: Number(trafficTotalsRow[2]?.value || 0),
    };

    const trafficSeries = trafficRows.map((row) => ({
      date: row.date,
      label: formatGaDate(row.date),
      pageviews: row.screenPageViews,
      visitors: row.activeUsers,
      sessions: row.sessions,
    }));

    const countries = parseMetricRows(countryResponse, ["activeUsers"]).map((row) => ({
      name: row.country || "Unknown",
      visits: row.activeUsers,
    }));

    const cities = parseMetricRows(cityResponse, ["activeUsers"]).map((row) => ({
      name: row.city || "Unknown",
      country: row.country || "",
      visits: row.activeUsers,
    }));

    const devices = parseMetricRows(deviceResponse, ["activeUsers"]).map((row) => ({
      category: (row.deviceCategory || "unknown").toLowerCase(),
      visits: row.activeUsers,
    }));

    const artworks = parseMetricRows(artworkPathResponse, ["screenPageViews"])
      .map((row) => ({
        path: row.pagePath,
        name: artworkLabelFromPath(row.pagePath),
        views: row.screenPageViews,
      }))
      .filter((row) => row.path)
      .sort((a, b) => b.views - a.views);

    return res.status(200).json({
      range,
      traffic: {
        totals: trafficTotals,
        series: trafficSeries,
      },
      audience: {
        countries,
        cities,
        devices,
      },
      artworks,
    });
  } catch (error) {
    console.error("GA4 analytics error:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch analytics data",
    });
  }
};
