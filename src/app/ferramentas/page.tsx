import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolCatalog } from "@/components/ToolCatalog";

export const metadata: Metadata = {
  title: "Todas as ferramentas PDF gratuitas",
  description: "Encontre ferramentas para editar, juntar, dividir, converter, assinar, preencher e otimizar PDF, organizadas por categoria.",
  alternates: { canonical: "/ferramentas" },
};

export default function ToolsPage() {
  return (
    <section className="reference-catalog-page">
      <Suspense fallback={<div className="reference-catalog-loading" role="status">Carregando ferramentas…</div>}>
        <ToolCatalog />
      </Suspense>
    </section>
  );
}
