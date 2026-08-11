export {
  addBates,
  addHyperlink,
  addInternalPageLink,
  addNativeAnnotation,
  editMetadata,
  preparePdfA,
  processBatch,
  readMetadata,
  safeBaseName,
  type BookmarkDraft,
  type FormFieldDraft,
  type MetadataDraft,
  type Progress,
} from "@/lib/pro-pdf-core";

export { createFormPdfAdvanced as createFormPdf } from "@/lib/pro-pdf-form";

export {
  addBookmarksAdvanced as addBookmarks,
  removeAllHyperlinks,
} from "@/lib/pro-pdf-navigation";

export {
  cleanScannedPdf,
  comparePdfs,
  extractEmbeddedImages,
  ocrPdf,
  optimizePdfAdvanced,
  repairPdf,
} from "@/lib/pro-pdf-visual";

export { pdfToPptx, pptxToPdf, readZipEntries } from "@/lib/pro-pdf-office";
export { signPdfPades } from "@/lib/pro-pdf-sign";
