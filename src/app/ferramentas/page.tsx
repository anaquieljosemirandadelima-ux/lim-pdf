import type { Metadata } from "next";
import { ToolCatalog } from "@/components/ToolCatalog";

export const metadata: Metadata = {
  title: "Todas as ferramentas PDF gratuitas",
  description: "Encontre ferramentas para editar, juntar, dividir, converter, assinar, preencher e otimizar PDF, organizadas por categoria.",
  alternates: { canonical: "/ferramentas" },
};

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ busca?: string | string[] }> }) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.busca) ? params.busca[0] : params.busca;
  const initialQuery = rawQuery?.trim().slice(0, 120) || "";
  return (
    <section className="reference-catalog-page">
      <ToolCatalog key={initialQuery || "catalog"} initialQuery={initialQuery} />
    </section>
  );
}
