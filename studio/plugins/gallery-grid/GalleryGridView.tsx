import { SectionGridView } from "./SectionGridView";
import {
  assamblageGridConfig,
  galleryGridConfig,
  printsGridConfig,
} from "./section-grid-config";

export function GalleryGridView() {
  return <SectionGridView config={galleryGridConfig} />;
}

export function PrintsGridView() {
  return <SectionGridView config={printsGridConfig} />;
}

export function AssamblageGridView() {
  return <SectionGridView config={assamblageGridConfig} />;
}
