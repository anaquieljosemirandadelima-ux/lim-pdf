import type { Metadata } from "next";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { PremiumToolExperience } from "@/components/PremiumToolExperience";
import { allToolBySlug } from "@/lib/all-tools";
import type { ToolDefinition } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Dimensionar página PDF — A4, Carta e tamanho personalizado",
  description: "Redimensione as páginas do PDF, escolha orientação e ajuste o conteúdo ao novo tamanho diretamente no navegador.",
  alternates: { canonical: "/ferramentas/dimensionar-pdf" },
};

export default function DimensionarPdfPage() {
  const tool = allToolBySlug.get("redimensionar-pdf") as ToolDefinition | undefined;
  if (!tool) return null;
  return <section className="reference-tool-page dimension-page"><div className="reference-tool-heading"><div><span className="page-kicker">Página e impressão</span><h1>Dimensionar página PDF</h1><p>Padronize o tamanho das páginas e deixe A4, Carta ou um formato personalizado mais fácil de encontrar.</p></div></div><PremiumToolExperience toolName="Dimensionar página PDF" toolSlug="redimensionar-pdf" accent={tool.accent} /><div className="dimension-preset-strip"><span><strong>A4</strong><small>210 × 297 mm</small></span><span><strong>Carta</strong><small>216 × 279 mm</small></span><span><strong>A3</strong><small>297 × 420 mm</small></span><span><strong>Personalizado</strong><small>largura e altura livres</small></span></div><div className="reference-workspace-wrap"><PdfToolWorkspace tool={tool} /></div><section className="editorial-unique"><div><span>Onde isso ajuda</span><h2>Corrija PDFs com páginas misturadas antes de imprimir ou enviar.</h2><p>Arquivos vindos de scanners, planilhas e documentos diferentes podem ter tamanhos incompatíveis. O redimensionamento cria uma saída padronizada para o destino escolhido.</p></div></section></section>;
}
