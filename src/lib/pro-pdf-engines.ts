export {
  addBates,
  addHyperlink,
  addInternalPageLink,
  addNativeAnnotation,
  preparePdfA,
  readMetadata,
  safeBaseName,
  type BookmarkDraft,
  type FormFieldDraft,
  type MetadataDraft,
  type Progress,
} from "@/lib/pro-pdf-core";
export { editMetadataEnhanced as editMetadata, processBatchEnhanced as processBatch } from "@/lib/pro-pdf-document";
export { createFormPdfAdvanced as createFormPdf } from "@/lib/pro-pdf-form";
export { addBookmarksAdvanced as addBookmarks, removeAllHyperlinks } from "@/lib/pro-pdf-navigation";
export { readHyperlinks, editHyperlink, removeHyperlink, type PdfHyperlinkInfo } from "@/lib/pro-pdf-links";
export { comparePdfs } from "@/lib/pro-pdf-compare";
export { cleanScannedPdfEnhanced as cleanScannedPdf, type ScanRotation } from "@/lib/pro-pdf-scan";
export { optimizePdfAdvancedEnhanced as optimizePdfAdvanced, type AdvancedOptimizeOptions } from "@/lib/pro-pdf-optimize";
export { extractEmbeddedImages, ocrPdf, repairPdf } from "@/lib/pro-pdf-visual";
export { pdfToPptx, pptxToPdf, readZipEntries } from "@/lib/pro-pdf-office";
export { signPdfPades } from "@/lib/pro-pdf-sign";
