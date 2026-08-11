import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdvancedToolWorkspace } from "@/components/AdvancedToolWorkspace";
import { MemorySafePdfWorkspace } from "@/components/MemorySafePdfWorkspace";
import { PdfEditorExperienceSwitcher } from "@/components/PdfEditorExperienceSwitcher";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { PremiumToolExperience } from "@/components/PremiumToolExperience";
import { ToolEditorialPanel } from "@/components/ToolEditorialPanel";
import { ToolIcon } from "@/components/ToolIcon";
import { ToolTelemetryBridge } from "@/components/ToolTelemetryBridge";
import { UnifiedConverterWorkspace } from "@/components/UnifiedConverterWorkspace";
import type { ConverterOutputSlug } from "@/components/UnifiedConverterWorkspace";
import { allToolBySlug, allTools, isAdvancedToolSlug, type AllToolSlug } from "@/lib/all-tools";
import type { ToolDefinition, ToolSlug } from "@/lib/tools";

interface ToolPageProps { params: Promise<{ slug: string }> }

const memorySafeToolSlugs = new Set<ToolSlug>([
  "pdf-para-jpg",
  "pdf-para-png",
  "compactar-pdf",
  "pdf-em-escala-de-cinza",
]);
const converterOutputSet = new Set<AllToolSlug>([
  "pdf-para-word",
  "pdf-para-excel",
  "pdf-para-jpg",
  "pdf-para-png",
  "extrair-texto-pdf",
]);

const pageDescriptions: Partial<Record<AllToolSlug, string>> = {
  "editar-pdf": "Edite textos, imagens, páginas e anotações do seu PDF com rapidez e precisão.",
  "juntar-pdf": "Combine vários arquivos PDF em um só de forma rápida e organizada.",
  "dividir-pdf": "Separe páginas ou intervalos do seu PDF com rapidez e controle.",
  "compactar-pdf": "Reduza o tamanho do seu PDF mantendo a melhor qualidade possível.",
  "pdf-para-jpg": "Converta páginas do seu PDF em imagens JPG de alta qualidade.",
  "pdf-para-png": "Converta páginas do seu PDF em imagens PNG de alta qualidade.",
  "imagens-para-pdf": "Transforme imagens em um arquivo PDF organizado.",
  "assinar-pdf": "Adicione sua assinatura visual ao PDF diretamente no navegador.",
  "pdf-para-word": "Converta o texto do seu PDF em um documento Word editável.",
  "pdf-para-excel": "Extraia linhas, tabelas e dados do seu PDF para uma planilha Excel.",
  "word-para-pdf": "Converta documentos DOCX em PDF diretamente no navegador.",
  "excel-para-pdf": "Converta planilhas XLSX em PDF diretamente no navegador.",
  "destacar-texto": "Localize termos e destaque as ocorrências no seu PDF.",
  "proteger-pdf": "Adicione senha e criptografia AES-256 ao seu PDF.",
  "desbloquear-pdf": "Remova a senha do PDF quando você possui a credencial correta.",
  "permissoes-pdf": "Controle impressão, cópia e modificação do documento.",
  "marcar-confidencial": "Aplique uma marca visual de confidencialidade ao documento.",
};

export function generateStaticParams() { return allTools.map((tool) => ({ slug: tool.slug })); }

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = allToolBySlug.get(slug as AllToolSlug);
  if (!tool) return {};
  const description = pageDescriptions[tool.slug] || tool.description;
  const canonical = `/ferramentas/${tool.slug}`;
  return {
    title: `${tool.name} grátis e online`,
    description,
    keywords: [tool.name, ...tool.keywords, "grátis", "online", "sem cadastro", "PDF no navegador"],
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { type: "website", title: `${tool.name} grátis e online | LIM PDF`, description, url: canonical, siteName: "LIM PDF", locale: "pt_BR" },
    twitter: { card: "summary_large_image", title: `${tool.name} grátis e online | LIM PDF`, description },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = allToolBySlug.get(slug as AllToolSlug);
  if (!tool) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const description = pageDescriptions[tool.slug] || tool.description;
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${tool.name} — LIM PDF`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/ferramentas/${tool.slug}`,
    description,
    isAccessibleForFree: true,
    browserRequirements: "JavaScript e navegador moderno com APIs de arquivo locais",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    featureList: ["Gratuito", "Sem cadastro", "Processamento local", "Experiência guiada"],
  };

  if (converterOutputSet.has(tool.slug)) {
    return <section className="reference-tool-page converter-output-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <ToolTelemetryBridge toolSlug={tool.slug} />
      <div className="reference-tool-heading"><div><h1>{tool.name}</h1><p>{description}</p></div><span className={`reference-heading-icon accent-${tool.accent}`} aria-hidden="true"><ToolIcon icon={tool.icon} /></span></div>
      <PremiumToolExperience toolName={tool.name} toolSlug={tool.slug} accent={tool.accent} />
      <div className="reference-workspace-wrap"><UnifiedConverterWorkspace initialOutput={tool.slug as ConverterOutputSlug} /></div>
      <ToolEditorialPanel tool={tool} />
    </section>;
  }

  if (isAdvancedToolSlug(tool.slug)) {
    return <section className="reference-tool-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <ToolTelemetryBridge toolSlug={tool.slug} />
      <div className="reference-tool-heading"><div><h1>{tool.name}</h1><p>{description}</p></div><span className={`reference-heading-icon accent-${tool.accent}`} aria-hidden="true"><ToolIcon icon={tool.icon} /></span></div>
      <PremiumToolExperience toolName={tool.name} toolSlug={tool.slug} accent={tool.accent} />
      <div className="reference-workspace-wrap"><AdvancedToolWorkspace tool={tool} /></div>
      <ToolEditorialPanel tool={tool} />
    </section>;
  }

  const baseTool = tool as ToolDefinition;
  if (baseTool.slug === "editar-pdf") {
    return <section className="reference-tool-page reference-editor-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <ToolTelemetryBridge toolSlug={baseTool.slug} />
      <div className="reference-tool-heading"><div><h1>{baseTool.name}</h1><p>{description}</p></div></div>
      <PremiumToolExperience toolName={baseTool.name} toolSlug={baseTool.slug} accent={baseTool.accent} editor />
      <div className="reference-editor-wrap"><PdfEditorExperienceSwitcher /></div>
      <ToolEditorialPanel tool={tool} />
    </section>;
  }

  return <section className="reference-tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
    <ToolTelemetryBridge toolSlug={baseTool.slug} />
    <div className="reference-tool-heading"><div><h1>{baseTool.name}</h1><p>{description}</p></div><span className={`reference-heading-icon accent-${baseTool.accent}`} aria-hidden="true"><ToolIcon icon={baseTool.icon} /></span></div>
    <PremiumToolExperience toolName={baseTool.name} toolSlug={baseTool.slug} accent={baseTool.accent} />
    <div className="reference-workspace-wrap">{memorySafeToolSlugs.has(baseTool.slug) ? <MemorySafePdfWorkspace tool={baseTool} /> : <PdfToolWorkspace tool={baseTool} />}</div>
    <ToolEditorialPanel tool={tool} />
  </section>;
}
