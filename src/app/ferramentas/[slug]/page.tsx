import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { AdvancedToolWorkspace } from "@/components/AdvancedToolWorkspace";
import { MemorySafePdfWorkspace } from "@/components/MemorySafePdfWorkspace";
import { PdfEditorExperienceSwitcher } from "@/components/PdfEditorExperienceSwitcher";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { PremiumToolExperience } from "@/components/PremiumToolExperience";
import { ProLinksWorkspace } from "@/components/ProLinksWorkspace";
import { ProNavigationWorkspace } from "@/components/ProNavigationWorkspace";
import { ProPdfWorkspace } from "@/components/ProPdfWorkspace";
import { ToolIcon } from "@/components/ToolIcon";
import { ToolTelemetryBridge } from "@/components/ToolTelemetryBridge";
import { UnifiedConverterWorkspace } from "@/components/UnifiedConverterWorkspace";
import type { ConverterOutputSlug } from "@/components/UnifiedConverterWorkspace";
import { allToolBySlug, allTools, isAdvancedToolSlug, type AllToolSlug } from "@/lib/all-tools";
import { proToolBySlug, proTools, type ProToolSlug } from "@/lib/pro-tools";
import type { ToolDefinition, ToolSlug } from "@/lib/tools";

interface ToolPageProps { params: Promise<{ slug: string }> }
type PublicSlug = AllToolSlug | ProToolSlug;

const memorySafeToolSlugs = new Set<ToolSlug>(["pdf-para-jpg", "pdf-para-png", "compactar-pdf", "pdf-em-escala-de-cinza"]);
const converterOutputSet = new Set<AllToolSlug>(["pdf-para-word", "pdf-para-excel", "pdf-para-jpg", "pdf-para-png", "extrair-texto-pdf"]);

const pageDescriptions: Partial<Record<PublicSlug, string>> = {
  "editar-pdf": "Edite textos, imagens, páginas e anotações do seu PDF com rapidez e precisão.",
  "juntar-pdf": "Combine vários arquivos PDF em um só de forma rápida e organizada.",
  "dividir-pdf": "Separe páginas ou intervalos do seu PDF com rapidez e controle.",
  "compactar-pdf": "Reduza o tamanho do seu PDF mantendo a melhor qualidade possível.",
  "pdf-para-jpg": "Converta páginas do seu PDF em imagens JPG e troque a saída sem reenviar o arquivo.",
  "pdf-para-png": "Converta páginas do seu PDF em imagens PNG e troque a saída sem reenviar o arquivo.",
  "pdf-para-word": "Converta o texto do PDF em Word editável e mude a saída no mesmo fluxo.",
  "pdf-para-excel": "Extraia dados do PDF para Excel e mude a saída no mesmo fluxo.",
  "proteger-pdf": "Adicione senha e criptografia AES-256 ao seu PDF.",
  "desbloquear-pdf": "Remova a senha quando você possui a credencial correta.",
  "permissoes-pdf": "Controle impressão, cópia e modificação do documento.",
  "assinatura-digital-pdf": "Assine criptograficamente o PDF com certificado X.509 e chave RSA em arquivo.",
  "links-pdf": "Crie, revise, edite e remova hyperlinks externos ou internos do PDF.",
  "criar-formulario-pdf": "Adicione campos AcroForm preenchíveis às páginas do PDF.",
  "bookmarks-pdf": "Crie marcadores nativos para navegar por capítulos e seções.",
  "comparar-pdfs": "Compare duas versões e destaque alterações visuais e textuais.",
  "reparar-pdf": "Normalize ou reconstrua páginas ainda legíveis de PDFs problemáticos.",
  "pdf-a": "Prepare o documento para um fluxo PDF/A-2B e gere uma pré-validação transparente.",
  "pdf-para-powerpoint": "Transforme páginas PDF em slides PPTX preservando a aparência visual.",
  "powerpoint-para-pdf": "Converta apresentações PPTX em PDF sem executar macros ou animações.",
  "extrair-imagens-pdf": "Extraia imagens raster incorporadas ao PDF e baixe em ZIP.",
  "limpar-documento-digitalizado": "Endireite, clareie e limpe digitalizações antes de OCR ou impressão.",
  "otimizar-pdf-avancado": "Escolha entre otimização estrutural e redução visual mais agressiva.",
  "anotacoes-pdf": "Adicione notas, destaques, sublinhados e tachados como anotações PDF nativas.",
  "processamento-lote-pdf": "Aplique a mesma operação a vários PDFs e reúna as saídas em ZIP.",
  "numeracao-bates": "Aplique sequência Bates com prefixo, número inicial, dígitos e posição.",
  "editar-metadados-pdf": "Edite título, autor, assunto, palavras-chave e outras propriedades básicas do PDF.",
};

function getTool(slug: string) {
  return proToolBySlug.get(slug as ProToolSlug) || allToolBySlug.get(slug as AllToolSlug);
}

export function generateStaticParams() {
  return [...allTools, ...proTools].map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const description = pageDescriptions[tool.slug as PublicSlug] || tool.description;
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
  const proTool = proToolBySlug.get(slug as ProToolSlug);
  const tool = proTool || allToolBySlug.get(slug as AllToolSlug);
  if (!tool) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const description = pageDescriptions[tool.slug as PublicSlug] || tool.description;
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
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Ferramentas", item: `${siteUrl}/ferramentas` },
      { "@type": "ListItem", position: 3, name: tool.name, item: `${siteUrl}/ferramentas/${tool.slug}` },
    ],
  };
  const schemas = <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} /></>;
  const heading = <div className="reference-tool-heading"><div><h1>{tool.name}</h1><p>{description}</p></div><span className={`reference-heading-icon accent-${tool.accent}`} aria-hidden="true"><ToolIcon icon={tool.icon} /></span></div>;
  const inlineAd = <AdSlot placement="tool-inline" format="horizontal" className="tool-ad-slot" />;

  if (proTool) {
    const workspace = proTool.slug === "links-pdf" ? <ProLinksWorkspace /> : proTool.slug === "bookmarks-pdf" ? <ProNavigationWorkspace tool={proTool} /> : <ProPdfWorkspace tool={proTool} />;
    return <section className="reference-tool-page reference-pro-tool-page">{schemas}{heading}<div className="reference-workspace-wrap">{workspace}</div>{inlineAd}</section>;
  }

  if (converterOutputSet.has(tool.slug as AllToolSlug)) {
    const coreTool = tool as (typeof allTools)[number];
    return <section className="reference-tool-page converter-output-page">{schemas}<ToolTelemetryBridge toolSlug={coreTool.slug} />{heading}<PremiumToolExperience toolName={coreTool.name} toolSlug={coreTool.slug} accent={coreTool.accent} /><div className="reference-workspace-wrap"><UnifiedConverterWorkspace initialOutput={coreTool.slug as ConverterOutputSlug} /></div>{inlineAd}</section>;
  }

  if (isAdvancedToolSlug(tool.slug as AllToolSlug)) {
    const advancedTool = tool as (typeof allTools)[number];
    return <section className="reference-tool-page">{schemas}<ToolTelemetryBridge toolSlug={advancedTool.slug} />{heading}<PremiumToolExperience toolName={advancedTool.name} toolSlug={advancedTool.slug} accent={advancedTool.accent} /><div className="reference-workspace-wrap"><AdvancedToolWorkspace tool={advancedTool} /></div>{inlineAd}</section>;
  }

  const baseTool = tool as ToolDefinition;
  if (baseTool.slug === "editar-pdf") {
    return <section className="reference-tool-page reference-editor-page">{schemas}<ToolTelemetryBridge toolSlug={baseTool.slug} />{heading}<div className="reference-editor-wrap"><PdfEditorExperienceSwitcher /></div>{inlineAd}</section>;
  }

  return <section className="reference-tool-page">{schemas}<ToolTelemetryBridge toolSlug={baseTool.slug} />{heading}<PremiumToolExperience toolName={baseTool.name} toolSlug={baseTool.slug} accent={baseTool.accent} /><div className="reference-workspace-wrap">{memorySafeToolSlugs.has(baseTool.slug) ? <MemorySafePdfWorkspace tool={baseTool} /> : <PdfToolWorkspace tool={baseTool} />}</div>{inlineAd}</section>;
}
