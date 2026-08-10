import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemorySafePdfWorkspace } from "@/components/MemorySafePdfWorkspace";
import { PdfEditorWorkspaceHardened } from "@/components/PdfEditorWorkspaceHardened";
import { PdfToolWorkspace } from "@/components/PdfToolWorkspace";
import { ToolIcon } from "@/components/ToolIcon";
import { toolBySlug, tools, type ToolSlug } from "@/lib/tools";

interface ToolPageProps { params: Promise<{ slug: string }> }

const memorySafeToolSlugs = new Set<ToolSlug>([
  "pdf-para-jpg",
  "pdf-para-png",
  "compactar-pdf",
  "pdf-em-escala-de-cinza",
]);

const pageDescriptions: Partial<Record<ToolSlug, string>> = {
  "editar-pdf": "Edite textos, imagens, páginas e anotações do seu PDF com rapidez e precisão.",
  "juntar-pdf": "Combine vários arquivos PDF em um só de forma rápida e organizada.",
  "dividir-pdf": "Separe páginas ou intervalos do seu PDF com rapidez e controle.",
  "compactar-pdf": "Reduza o tamanho do seu PDF mantendo a melhor qualidade possível.",
  "pdf-para-jpg": "Converta páginas do seu PDF em imagens JPG de alta qualidade.",
  "pdf-para-png": "Converta páginas do seu PDF em imagens PNG de alta qualidade.",
  "imagens-para-pdf": "Transforme imagens em um arquivo PDF organizado.",
  "assinar-pdf": "Adicione sua assinatura visual ao PDF diretamente no navegador.",
};

export function generateStaticParams() { return tools.map((tool) => ({ slug: tool.slug })); }

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolBySlug.get(slug as ToolSlug);
  if (!tool) return {};
  return {
    title: `${tool.name} grátis e online`,
    description: pageDescriptions[tool.slug] || tool.description,
    keywords: [tool.name, ...tool.keywords, "grátis", "online", "sem cadastro"],
    alternates: { canonical: `/ferramentas/${tool.slug}` },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = toolBySlug.get(slug as ToolSlug);
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
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    featureList: ["Gratuito", "Sem cadastro", "Processamento local"],
  };

  if (tool.slug === "editar-pdf") {
    return (
      <section className="reference-tool-page reference-editor-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
        <div className="reference-tool-heading">
          <div><h1>{tool.name}</h1><p>{description}</p></div>
        </div>
        <div className="reference-editor-wrap"><PdfEditorWorkspaceHardened /></div>
      </section>
    );
  }

  return (
    <section className="reference-tool-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <div className="reference-tool-heading">
        <div><h1>{tool.name}</h1><p>{description}</p></div>
        <span className={`reference-heading-icon accent-${tool.accent}`} aria-hidden="true"><ToolIcon icon={tool.icon} /></span>
      </div>
      <div className="reference-workspace-wrap">
        {memorySafeToolSlugs.has(tool.slug) ? <MemorySafePdfWorkspace tool={tool} /> : <PdfToolWorkspace tool={tool} />}
      </div>
    </section>
  );
}
