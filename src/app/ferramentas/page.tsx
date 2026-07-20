import type { Metadata } from "next";
import { AdSlot } from "@/components/AdSlot";
import { ToolCatalog } from "@/components/ToolCatalog";

export const metadata: Metadata = {
  title: "Todas as ferramentas PDF gratuitas",
  description: "Encontre ferramentas para editar, juntar, dividir, converter, assinar, preencher e otimizar PDF, organizadas por categoria.",
  alternates: { canonical: "/ferramentas" },
};

export default function ToolsPage() {
  return (
    <div className="catalog-page">
      <div className="container catalog-layout">
        <ToolCatalog />
        <AdSlot placement="catalog-side" format="rectangle" className="catalog-ad" />
      </div>
      <AdSlot placement="catalog-inline" format="horizontal" />
    </div>
  );
}
