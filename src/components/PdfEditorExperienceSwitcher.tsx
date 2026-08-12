"use client";

import dynamic from "next/dynamic";

const UnifiedPdfEditor = dynamic(
  () => import("@/components/PdfEditorWorkspaceHardened").then((module) => module.PdfEditorWorkspaceHardened),
  { loading: () => <div className="editor-mode-loading" role="status">Abrindo o editor…</div> },
);

export function PdfEditorExperienceSwitcher() {
  return (
    <section className="editor-experience-switcher unified-editor-experience" aria-label="Editor de PDF">
      <UnifiedPdfEditor />
    </section>
  );
}
