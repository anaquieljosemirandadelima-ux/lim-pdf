import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LucideClientIcon } from "@/components/LucideClientIcon";
import { AdSlot } from "@/components/AdSlot";
import { PdfEditorWorkspace } from "@/components/PdfEditorWorkspace";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { ToolCard } from "@/components/ToolCard";
import { ToolIcon } from "@/components/ToolIcon";
import { toolBySlug, tools, type ToolSlug } from "@/lib/tools";
import { getWorkflowsForTool } from "@/lib/workflows";

interface ToolPageProps { params: Promise<{ slug: string }> }

export function generateStaticParams() { return tools.map((tool) => ({ slug: tool.slug })); }

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolBySlug.get(slug as ToolSlug);
  if (!tool) return {};
  const title = `${tool.name} grátis e online`;
  return {
    title,
    description: tool.description,
    keywords: [tool.name, ...tool.keywords, "grátis", "online", "sem cadastro"],
    alternates: { canonical: `/ferramentas/${tool.slug}` },
    openGraph: { title: `${title} | LIM PDF`, description: tool.description, url: `/ferramentas/${tool.slug}`, type: "website" },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = toolBySlug.get(slug as ToolSlug);
  if (!tool) notFound();
  const related = tools
    .filter((item) => item.slug !== tool.slug)
    .sort((a, b) => Number(b.category === tool.category) - Number(a.category === tool.category))
    .slice(0, 4);
  const suggestedWorkflow = getWorkflowsForTool(tool.slug)[0];
  const workflowTools = suggestedWorkflow
    ? suggestedWorkflow.tools.flatMap((item) => {
        const nextTool = toolBySlug.get(item);
        return nextTool && nextTool.slug !== tool.slug ? [nextTool] : [];
      })
    : [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${tool.name} — LIM PDF`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/ferramentas/${tool.slug}`,
    description: tool.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    featureList: ["Gratuito", "Sem cadastro", "Cache temporário no navegador", "Processamento local"],
  };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: tool.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };

  if (tool.slug === "editar-pdf") {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
        <section className="editor-page-heading editor-page-heading-v3">
          <div className="container">
            <div className="editor-heading-copy">
              <Link className="breadcrumb" href="/categorias/editar">Início <span>/</span> Ferramentas <span>/</span> Editar PDF</Link>
              <div className="editor-heading-title"><span className="tool-icon large-icon accent-blue"><ToolIcon icon={tool.icon} /></span><div><h1>Editar PDF</h1><p>Substitua textos visualmente, adicione textos e imagens e baixe o resultado diretamente no navegador.</p></div></div>
            </div>
            <div className="editor-heading-actions">
              <Link className="secondary-button" href="/ferramentas/adicionar-texto-pdf"><LucideClientIcon name="Type" size={17} /> Adicionar texto</Link>
              <Link className="secondary-button" href="/ferramentas/adicionar-imagem-pdf"><LucideClientIcon name="ImagePlus" size={17} /> Adicionar imagem</Link>
              <a className="primary-button" href="#editor-workspace"><LucideClientIcon name="UploadCloud" size={17} /> Selecionar PDF</a>
            </div>
          </div>
        </section>
        <div className="container"><AdSlot placement="tool-inline" format="horizontal" /></div>
        <div className="container editor-page-container" id="editor-workspace"><PdfEditorWorkspace /></div>
        <section className="tool-seo-summary"><div className="container tool-seo-summary-grid"><article><span className="eyebrow">Editor visual</span><h2>Como o editor de PDF funciona</h2><p>{tool.intro}</p><ul>{tool.useCases.map((item) => <li key={item}><LucideClientIcon name="CheckCircle2" size={16} /> {item}</li>)}</ul></article><aside><LucideClientIcon name="Info" size={22} /><h2>Limitações importantes</h2>{tool.limitations.map((item) => <p key={item}>{item}</p>)}</aside></div></section>
      </>
    );
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="tool-screen">
        <div className="container tool-screen-heading">
          <div className="tool-screen-title"><Link className="breadcrumb" href="/ferramentas">Ferramentas PDF <span>/</span> {tool.category}</Link><div><span className={`tool-icon large-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span><span><h1>{tool.name}</h1><p>{tool.description}</p></span></div></div>
          <div className="tool-screen-badges"><span><LucideClientIcon name="CheckCircle2" size={16} /> Ferramenta pronta</span><span><LucideClientIcon name="LockKeyhole" size={16} /> Sessão temporária</span></div>
        </div>
        <div className="container tool-workspace-layout">
          <PdfToolWorkspace tool={tool} />
          <aside className="tool-guide-panel">
            <h2>Como usar</h2>
            <ol><li><span>1</span> Selecione {tool.multiple ? "os arquivos" : "o arquivo"}.</li><li><span>2</span> Ajuste as opções necessárias.</li><li><span>3</span> Processe e baixe o resultado.</li></ol>
            <div className="tool-guide-note"><LucideClientIcon name="ShieldCheck" size={18} /><p>O arquivo permanece no dispositivo e pode ser recuperado temporariamente pelo cache local.</p></div>
            {suggestedWorkflow ? (
              <div className={`tool-next-flow accent-${suggestedWorkflow.accent}`}>
                <span>Sequência sugerida</span>
                <h3>{suggestedWorkflow.title}</h3>
                <p>{suggestedWorkflow.description}</p>
                {workflowTools.slice(0, 3).map((item) => <Link href={`/ferramentas/${item.slug}`} key={item.slug}>{item.name} <LucideClientIcon name="ArrowRight" size={14} /></Link>)}
              </div>
            ) : null}
            <h3>Ferramentas relacionadas</h3>
            {related.slice(0, 3).map((item) => <Link href={`/ferramentas/${item.slug}`} key={item.slug}>{item.name} <LucideClientIcon name="ArrowRight" size={14} /></Link>)}
          </aside>
        </div>
      </section>
      <AdSlot placement="tool-inline" format="horizontal" />
      <section className="tool-seo-summary"><div className="container tool-seo-summary-grid"><article><span className="eyebrow">Sobre a ferramenta</span><h2>{tool.name} sem instalar programa</h2><p>{tool.intro}</p><ul>{tool.useCases.map((item) => <li key={item}><LucideClientIcon name="CheckCircle2" size={16} /> {item}</li>)}</ul></article><aside><LucideClientIcon name="Info" size={22} /><h2>Antes de processar</h2>{tool.limitations.map((item) => <p key={item}>{item}</p>)}</aside></div></section>
      <section className="related-tools-compact"><div className="container"><div className="compact-section-heading"><div><span>Continue trabalhando</span><h2>Outras ferramentas</h2></div></div><div className="tool-grid four-columns">{related.map((item) => <ToolCard key={item.slug} tool={item} />)}</div></div></section>
    </>
  );
}

