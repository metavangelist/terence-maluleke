export type DateRange = "7d" | "30d" | "90d";

export type TrafficSeriesPoint = {
  date: string;
  label: string;
  pageviews: number;
  visitors: number;
  sessions: number;
};

export type TrafficData = {
  totals: {
    pageviews: number;
    visitors: number;
    sessions: number;
  };
  series: TrafficSeriesPoint[];
};

export type RankedLocation = {
  name: string;
  visits: number;
};

export type RankedCity = RankedLocation & {
  country: string;
};

export type DeviceBreakdown = {
  category: string;
  visits: number;
};

export type ArtworkView = {
  path: string;
  name: string;
  views: number;
};

export type AnalyticsResponse = {
  range: DateRange;
  traffic: TrafficData;
  audience: {
    countries: RankedLocation[];
    cities: RankedCity[];
    devices: DeviceBreakdown[];
  };
  artworks: ArtworkView[];
};
