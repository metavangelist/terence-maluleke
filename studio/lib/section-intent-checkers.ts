import type { IntentChecker } from "sanity/structure";

function handlesDocumentIntent(documentType: string): IntentChecker {
  return (intent, params) => {
    if (params.type !== documentType) return false;
    if (intent === "create") return true;
    if (intent === "edit") return Boolean(params.id);
    return false;
  };
}

export const galleryArtworkIntentChecker = handlesDocumentIntent("artwork");
export const printsArtworkIntentChecker = handlesDocumentIntent("artwork");
export const assamblageIntentChecker = handlesDocumentIntent("assamblage");
export const studyImageIntentChecker = handlesDocumentIntent("studyImage");
export const exhibitionIntentChecker = handlesDocumentIntent("exhibition");
