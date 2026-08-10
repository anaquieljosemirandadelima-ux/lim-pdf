import type { Metadata } from "next";
import { ToolCatalog } from "@/components/ToolCatalog";

export const metadata: Metadata = {
  title: "Todas as ferramentas PDF gratuitas",
  description: "Encontre ferramentas para editar, juntar, dividir, converter, assinar, preencher e otimizar PDF, organizadas por categoria.",
  alternates: { canonical: "/ferramentas" },
};

export default function ToolsPage() {
  return (
    <section className="reference-catalog-page">
      <ToolCatalog />
    </section>
  );
}
