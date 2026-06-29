const GRID_DOC_FIELDS = `{
  _id,
  title,
  orderRank,
  presentationStyle,
  pairRole,
  "pairedArtworkId": pairedArtwork._ref,
  image,
  secondImage,
  legacyFilename
}`;

/** GROQ needs parentheses: !lower(x) match "y" parses as (!lower(x)) match "y". */
const notPrintFilter = `!(lower(coalesce(medium, "")) match "print*")`;
const isPrintFilter = `lower(coalesce(medium, "")) match "print*"`;

export type SectionGridConfig = {
  id: string;
  title: string;
  heading: string;
  documentType: "artwork" | "assamblage";
  query: string;
  listenQuery: string;
  addButtonLabel: string;
  createIntentPath: string;
  helpText: string;
};

const gridDocsBase = (type: string, extraFilter: string) =>
  `*[_type == "${type}" && !(pairRole == "secondary")${extraFilter}] | order(orderRank asc, title asc) ${GRID_DOC_FIELDS}`;

export const galleryGridConfig: SectionGridConfig = {
  id: "gallery",
  title: "Gallery",
  heading: "Gallery",
  documentType: "artwork",
  query: gridDocsBase("artwork", ` && ${notPrintFilter}`),
  listenQuery: `*[_type == "artwork" && ${notPrintFilter}]`,
  addButtonLabel: "Add artwork",
  createIntentPath: "/intent/create/template=artwork;type=artwork/",
  helpText:
    "Hover the pencil icon to edit, or the trash icon to remove from the website. Numbers show display order — change a number in the order list to move without dragging. Drag the handle to reorder. Desktop: 6 per page; mobile: 4 per page.",
};

export const printsGridConfig: SectionGridConfig = {
  id: "prints",
  title: "Prints",
  heading: "Prints",
  documentType: "artwork",
  query: gridDocsBase("artwork", ` && ${isPrintFilter}`),
  listenQuery: `*[_type == "artwork" && ${isPrintFilter}]`,
  addButtonLabel: "Add print",
  createIntentPath: "/intent/create/template=artwork;type=artwork/",
  helpText:
    "Hover the pencil icon to edit, or the trash icon to remove from the website. Numbers show display order — change a number in the order list to move without dragging. Medium must start with “Print”. Desktop: 6 per page; mobile: 4 per page.",
};

export const assamblageGridConfig: SectionGridConfig = {
  id: "assamblage",
  title: "Assamblage",
  heading: "Assamblage",
  documentType: "assamblage",
  query: gridDocsBase("assamblage", ""),
  listenQuery: '*[_type == "assamblage"]',
  addButtonLabel: "Add assamblage",
  createIntentPath: "/intent/create/template=assamblage;type=assamblage/",
  helpText:
    "Hover the pencil icon to edit, or the trash icon to remove from the website. Numbers show display order — change a number in the order list to move without dragging. Desktop: 6 per page; mobile: 4 per page.",
};
