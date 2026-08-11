export {
  addBates,
  addBookmarks,
  addHyperlink,
  addInternalPageLink,
  addNativeAnnotation,
  createFormPdf,
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
