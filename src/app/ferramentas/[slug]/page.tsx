import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdvancedToolWorkspace } from "@/components/AdvancedToolWorkspace";
import { MemorySafePdfWorkspace } from "@/components/MemorySafePdfWorkspace";
import { PageNormalizeWorkspace } from "@/components/PageNormalizeWorkspace";
import { PdfEditorExperienceSwitcher } from "@/components/PdfEditorExperienceSwitcher";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { PremiumToolExperience } from "@/components/PremiumToolExperience";
import { PreflightWorkspace } from "@/components/PreflightWorkspace";
import { ProLinksWorkspace } from "@/components/ProLinksWorkspace";
import { ProNavigationWorkspace } from "@/components/ProNavigationWorkspace";
import { ProPdfWorkspace } from "@/components/ProPdfWorkspace";
import { ToolEditorialContent } from "@/components/ToolEditorialContent";
import { ToolIcon } from "@/components/ToolIcon";
import { ToolTelemetryBridge } from "@/components/ToolTelemetryBridge";
import { UnifiedConverterWorkspace } from "@/components/UnifiedConverterWorkspace";
import { allToolBySlug, allTools, isAdvancedToolSlug, type AllToolSlug } from "@/lib/all-tools";
import { proTools, type ProToolSlug } from "@/lib/pro-tools";
import { releaseToolBySlug, releaseTools, type ReleaseToolSlug } from "@/lib/release-tools";
import type { ToolDefinition, ToolSlug } from "@/lib/tools";

interface ToolPageProps { params: Promise<{ slug: string }> }
type PublicSlug = AllToolSlug | ProToolSlug | ReleaseToolSlug;

const proToolBySlug = new Map<ProToolSlug, (typeof proTools)[number]>(proTools.map((tool) => [tool.slug, tool]));
const memorySafeToolSlugs = new Set<ToolSlug>(["compactar-pdf", "pdf-em-escala-de-cinza"]);
const conversionSlugs = new Set<string>(["converter-pdf", "pdf-para-word", "pdf-para-excel", "word-para-pdf", "excel-para-pdf", "pdf-para-powerpoint", "powerpoint-para-pdf", "pdf-para-jpg", "pdf-para-png", "extrair-texto-pdf"]);

const pageDescriptions: Partial<Record<PublicSlug, string>> = {
  "editar-pdf": "Edite texto, imagens, páginas, anotações e conteúdo visual em um Studio completo, com modo preciso e redação segura.",
  "juntar-pdf": "Combine vários arquivos PDF em um só de forma rápida e organizada.",
  "dividir-pdf": "Separe páginas ou intervalos do seu PDF com rapidez e controle.",
  "compactar-pdf": "Reduza o tamanho do seu PDF mantendo a melhor qualidade possível.",
  "pdf-para-jpg": "Converta páginas do seu PDF em imagens JPG e escolha outro formato sem reenviar o arquivo.",
  "pdf-para-png": "Converta páginas do seu PDF em imagens PNG e escolha outro formato sem reenviar o arquivo.",
  "imagens-para-pdf": "Transforme imagens em um arquivo PDF organizado.",
  "assinar-pdf": "Adicione sua assinatura visual ao PDF diretamente no navegador.",
  "pdf-para-word": "Converta PDF em Word editável ou de alta fidelidade visual e troque a saída sem reenviar o arquivo.",
  "pdf-para-excel": "Extraia linhas, tabelas e dados do PDF para Excel e troque a saída sem novo upload.",
  "word-para-pdf": "Converta documentos DOCX em PDF diretamente no navegador.",
  "excel-para-pdf": "Converta planilhas XLSX em PDF diretamente no navegador.",
  "destacar-texto": "Localize termos e destaque as ocorrências no seu PDF.",
  "proteger-pdf": "Adicione senha e criptografia AES-256 ao seu PDF.",
  "desbloquear-pdf": "Remova a senha do PDF quando você possui a credencial correta.",
  "permissoes-pdf": "Controle impressão, cópia e modificação do documento.",
  "marcar-confidencial": "Aplique uma marca visual de confidencialidade ao documento.",
  "ocr-pdf": "Reconheça texto em PDFs escaneados e gere uma cópia pesquisável com OCR real.",
  "assinatura-digital-pdf": "Aplique assinatura criptográfica PAdES básica com certificado X.509 e chave RSA.",
  "links-pdf": "Adicione, localize, edite ou remova hyperlinks externos e internos sem rasterizar o PDF.",
  "bookmarks-pdf": "Crie uma árvore hierárquica de marcadores nativos para navegar pelo documento.",
  "comparar-pdfs": "Compare duas versões de PDF e destaque diferenças visuais e textuais.",
  "reparar-pdf": "Normalize ou reconstrua PDFs com estrutura problemática diretamente no navegador.",
  "pdf-a": "Prepare o documento para fluxo PDF/A-2B e gere um relatório de pré-validação.",
  "pdf-para-powerpoint": "Transforme páginas PDF em slides PPTX preservando a proporção visual.",
  "powerpoint-para-pdf": "Converta apresentações PPTX em páginas PDF diretamente no navegador.",
  "converter-pdf": "Envie o arquivo uma vez e escolha Word, Excel, PowerPoint, JPG, PNG, TXT ou PDF como saída compatível.",
  "normalizar-paginas-pdf": "Dimensione páginas em A3, A4, A5, Carta, Legal ou tamanho personalizado com controle de ajuste.",
  "preflight-pdf": "Faça um check-up de dimensões, texto, formulários, anotações e metadados antes de distribuir o PDF.",
};

function getTool(slug: string) {
  return releaseToolBySlug.get(slug as ReleaseToolSlug) || proToolBySlug.get(slug as ProToolSlug) || allToolBySlug.get(slug as AllToolSlug);
}

export function generateStaticParams() { return [...allTools, ...proTools, ...releaseTools].map((tool) => ({ slug: tool.slug })); }

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const description = pageDescriptions[tool.slug as PublicSlug] || tool.description;
  const canonical = `/ferramentas/${tool.slug}`;
  return {
    title: `${tool.name} grátis e online`, description,
    keywords: [tool.name, ...tool.keywords, "grátis", "online", "sem cadastro", "PDF no navegador"],
    alternates: { canonical }, robots: { index: true, follow: true },
    openGraph: { type: "website", title: `${tool.name} grátis e online | LIM PDF`, description, url: canonical, siteName: "LIM PDF", locale: "pt_BR" },
    twitter: { card: "summary_large_image", title: `${tool.name} grátis e online | LIM PDF`, description },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const releaseTool = releaseToolBySlug.get(slug as ReleaseToolSlug);
  const proTool = proToolBySlug.get(slug as ProToolSlug);
  const tool = releaseTool || proTool || allToolBySlug.get(slug as AllToolSlug);
  if (!tool) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const description = pageDescriptions[tool.slug as PublicSlug] || tool.description;
  const softwareSchema = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: `${tool.name} — LIM PDF`, applicationCategory: "UtilitiesApplication", operatingSystem: "Web", url: `${siteUrl}/ferramentas/${tool.slug}`, description, isAccessibleForFree: true, browserRequirements: "JavaScript e navegador moderno com APIs de arquivo locais", offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }, featureList: ["Gratuito", "Sem cadastro", "Processamento local", "Experiência guiada"] };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Início", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Ferramentas", item: `${siteUrl}/ferramentas` }, { "@type": "ListItem", position: 3, name: tool.name, item: `${siteUrl}/ferramentas/${tool.slug}` }] };
  const heading = <div className="reference-tool-heading"><div><h1>{tool.name}</h1><p>{description}</p></div><span className={`reference-heading-icon accent-${tool.accent}`} aria-hidden="true"><ToolIcon icon={tool.icon} /></span></div>;
  const schemas = <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} /></>;
  const editorial = <ToolEditorialContent tool={tool} />;

  if (releaseTool) {
    const workspace = releaseTool.slug === "converter-pdf" ? <UnifiedConverterWorkspace tool={releaseTool} /> : releaseTool.slug === "normalizar-paginas-pdf" ? <PageNormalizeWorkspace /> : <PreflightWorkspace />;
    return <section className="reference-tool-page reference-release-tool-page">{schemas}<ToolTelemetryBridge toolSlug={releaseTool.slug} />{heading}<PremiumToolExperience toolName={releaseTool.name} toolSlug={releaseTool.slug} accent={releaseTool.accent} /><div className="reference-workspace-wrap">{workspace}</div>{editorial}</section>;
  }

  if (conversionSlugs.has(tool.slug)) {
    return <section className="reference-tool-page reference-converter-page">{schemas}<ToolTelemetryBridge toolSlug={tool.slug} />{heading}<PremiumToolExperience toolName={tool.name} toolSlug={tool.slug} accent={tool.accent} /><div className="reference-workspace-wrap"><UnifiedConverterWorkspace tool={tool} /></div>{editorial}</section>;
  }

  if (proTool) {
    const workspace = proTool.slug === "links-pdf" ? <ProLinksWorkspace /> : proTool.slug === "bookmarks-pdf" ? <ProNavigationWorkspace tool={proTool} /> : <ProPdfWorkspace tool={proTool} />;
    return <section className="reference-tool-page reference-pro-tool-page">{schemas}<ToolTelemetryBridge toolSlug={proTool.slug} />{heading}<PremiumToolExperience toolName={proTool.name} toolSlug={proTool.slug} accent={proTool.accent} /><div className="reference-workspace-wrap">{workspace}</div>{editorial}</section>;
  }

  if (isAdvancedToolSlug(tool.slug as AllToolSlug)) {
    const advancedTool = tool as (typeof allTools)[number];
    return <section className="reference-tool-page">{schemas}<ToolTelemetryBridge toolSlug={advancedTool.slug} />{heading}<PremiumToolExperience toolName={advancedTool.name} toolSlug={advancedTool.slug} accent={advancedTool.accent} /><div className="reference-workspace-wrap"><AdvancedToolWorkspace tool={advancedTool} /></div>{editorial}</section>;
  }

  const baseTool = tool as ToolDefinition;
  if (baseTool.slug === "editar-pdf") {
    return <section className="reference-tool-page reference-editor-page">{schemas}<ToolTelemetryBridge toolSlug={baseTool.slug} />{heading}<PremiumToolExperience toolName={baseTool.name} toolSlug={baseTool.slug} accent={baseTool.accent} editor /><div className="reference-editor-wrap"><PdfEditorExperienceSwitcher /></div>{editorial}</section>;
  }

  return <section className="reference-tool-page">{schemas}<ToolTelemetryBridge toolSlug={baseTool.slug} />{heading}<PremiumToolExperience toolName={baseTool.name} toolSlug={baseTool.slug} accent={baseTool.accent} /><div className="reference-workspace-wrap">{memorySafeToolSlugs.has(baseTool.slug) ? <MemorySafePdfWorkspace tool={baseTool} /> : <PdfToolWorkspace tool={baseTool} />}</div>{editorial}</section>;
}
