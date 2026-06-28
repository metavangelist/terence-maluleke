import type { ComponentType } from "react";
import { createElement } from "react";
import type { StructureResolver } from "sanity/structure";
import {
  CogIcon,
  UserIcon,
  ImagesIcon,
  ComponentIcon,
  ImageIcon,
  CalendarIcon,
  BarChartIcon,
  DocumentsIcon,
} from "@sanity/icons";
import { AnalyticsTool } from "./plugins/analytics/AnalyticsTool";
import {
  AssamblageGridView,
  GalleryGridView,
  PrintsGridView,
} from "./plugins/gallery-grid/GalleryGridView";
import { CalendarListView } from "./plugins/section-list/CalendarListView";
import { StudyListView } from "./plugins/section-list/StudyListView";
import {
  assamblageIntentChecker,
  exhibitionIntentChecker,
  galleryArtworkIntentChecker,
  printsArtworkIntentChecker,
  studyImageIntentChecker,
} from "./lib/section-intent-checkers";

const analyticsApiUrl =
  process.env.SANITY_STUDIO_ANALYTICS_API_URL ||
  "https://maluleke.art/api/analytics";
const analyticsApiSecret = process.env.SANITY_STUDIO_ANALYTICS_API_SECRET || "";

function singleton(
  S: Parameters<StructureResolver>[0],
  typeName: string,
  title: string,
  icon?: ComponentType
) {
  return S.listItem()
    .id(typeName)
    .title(title)
    .icon(icon)
    .child(
      S.document().schemaType(typeName).documentId(typeName).title(title)
    );
}

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Terence Maluleke")
    .items([
      singleton(S, "siteSettings", "Site settings", CogIcon),
      singleton(S, "artistInfo", "Artist bio", UserIcon),
      S.divider(),
      S.listItem()
        .id("gallery-grid")
        .title("Gallery")
        .icon(ImagesIcon)
        .child(
          S.component(GalleryGridView)
            .title("Gallery")
            .canHandleIntent(galleryArtworkIntentChecker)
            .child((documentId) =>
              S.document().schemaType("artwork").documentId(documentId)
            )
        ),
      S.listItem()
        .id("prints-grid")
        .title("Prints")
        .icon(DocumentsIcon)
        .child(
          S.component(PrintsGridView)
            .title("Prints")
            .canHandleIntent(printsArtworkIntentChecker)
            .child((documentId) =>
              S.document().schemaType("artwork").documentId(documentId)
            )
        ),
      S.listItem()
        .id("assamblage-grid")
        .title("Assamblage")
        .icon(ComponentIcon)
        .child(
          S.component(AssamblageGridView)
            .title("Assamblage")
            .canHandleIntent(assamblageIntentChecker)
            .child((documentId) =>
              S.document().schemaType("assamblage").documentId(documentId)
            )
        ),
      S.listItem()
        .id("study-list")
        .title("Study")
        .icon(ImageIcon)
        .child(
          S.component(StudyListView)
            .title("Study")
            .canHandleIntent(studyImageIntentChecker)
            .child((documentId) =>
              S.document().schemaType("studyImage").documentId(documentId)
            )
        ),
      S.listItem()
        .id("calendar")
        .title("Calendar")
        .icon(CalendarIcon)
        .child(
          S.component(CalendarListView)
            .title("Upcoming events")
            .canHandleIntent(exhibitionIntentChecker)
            .child((documentId) =>
              S.document().schemaType("exhibition").documentId(documentId)
            )
        ),
      S.divider(),
      S.listItem()
        .id("analytics")
        .title("Analytics")
        .icon(BarChartIcon)
        .child(
          S.component(() =>
            createElement(AnalyticsTool, {
              apiUrl: analyticsApiUrl,
              apiSecret: analyticsApiSecret,
            })
          ).title("Analytics")
        ),
    ]);
