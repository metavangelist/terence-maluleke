import type { ComponentType } from "react";
import type { StructureResolver } from "sanity/structure";
import {
  CogIcon,
  UserIcon,
  ImagesIcon,
  ComponentIcon,
  ImageIcon,
  CalendarIcon,
} from "@sanity/icons";

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
        .id("gallery")
        .title("Gallery")
        .icon(ImagesIcon)
        .child(
          S.documentTypeList("artwork")
            .title("Gallery artworks")
            .defaultOrdering([{ field: "sortOrder", direction: "asc" }])
        ),
      S.listItem()
        .id("assamblage")
        .title("Assamblage")
        .icon(ComponentIcon)
        .child(
          S.documentTypeList("assamblage")
            .title("Assamblage")
            .defaultOrdering([{ field: "sortOrder", direction: "asc" }])
        ),
      S.listItem()
        .id("study")
        .title("Study")
        .icon(ImageIcon)
        .child(
          S.documentTypeList("studyImage")
            .title("Study images")
            .defaultOrdering([{ field: "sortOrder", direction: "asc" }])
        ),
      S.listItem()
        .id("calendar")
        .title("Calendar")
        .icon(CalendarIcon)
        .child(
          S.documentTypeList("exhibition")
            .title("Upcoming events")
            .defaultOrdering([{ field: "eventDate", direction: "asc" }])
        ),
    ]);
