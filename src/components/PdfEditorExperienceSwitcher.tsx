"use client";

import dynamic from "next/dynamic";

const UnifiedPdfEditor = dynamic(
  () => import("@/components/PdfEditorStudio").then((module) => module.PdfEditorStudio),
  {
    ssr: false,
    loading: () => (
      <div className="editor-mode-loading" role="status" aria-live="polite">
        Abrindo o editor…
      </div>
    ),
  },
);

export function PdfEditorExperienceSwitcher() {
  return (
    <section className="editor-experience-switcher unified-editor-experience" aria-label="Editor de PDF" data-editor-experience="studio-premium">
      <UnifiedPdfEditor />
    </section>
  );
}
