import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileImage,
  FileText,
  HardDrive,
  Images,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ToolIcon } from "@/components/ToolIcon";
import { guides } from "@/lib/guides";
import { navigationGroups } from "@/lib/navigation";
import { toolBySlug, type ToolSlug } from "@/lib/tools";
import { workflows } from "@/lib/workflows";

export const metadata: Metadata = {
  title: "Ferramentas PDF grátis para editar, converter e organizar",
  description: "Tudo o que você precisa para trabalhar com PDF: editar, juntar, converter, assinar, preencher e compactar sem cadastro.",
  alternates: { canonical: "/" },
};

const popularSlugs: ToolSlug[] = [
  "juntar-pdf",
  "editar-pdf",
  "compactar-pdf",
  "pdf-para-jpg",
  "assinar-pdf",
  "dividir-pdf",
  "marca-dagua-pdf",
];

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lim-pdf-preview.vercel.app";
  const popular = popularSlugs.map((slug) => toolBySlug.get(slug)).filter((tool) => tool !== undefined);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "LIM PDF", url: siteUrl, inLanguage: "pt-BR", potentialAction: { "@type": "SearchAction", target: `${siteUrl}/ferramentas?busca={search_term_string}`, "query-input": "required name=search_term_string" } },
      { "@type": "SoftwareApplication", name: "LIM PDF", applicationCategory: "UtilitiesApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }, description: "Ferramentas gratuitas para editar, organizar, converter, assinar e otimizar documentos PDF no navegador." },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="home-hero home-hero-v3">
        <div className="container home-hero-grid">
          <div className="home-hero-copy">
            <span className="hero-badge"><ShieldCheck size={15} /> Grátis, privado e sem cadastro</span>
            <h1>Tudo o que você precisa para <span>trabalhar com PDF.</span></h1>
            <p>Edite, converta, organize, assine e otimize seus documentos gratuitamente. O processamento acontece no seu navegador.</p>
            <div className="hero-actions">
              <Link className="primary-button large-button hero-primary" href="/ferramentas/editar-pdf"><UploadCloud size={19} /> Selecionar arquivo</Link>
              <Link className="secondary-button large-button" href="/ferramentas"><Layers3 size={18} /> Ver ferramentas</Link>
            </div>
            <div className="home-trust">
              <span><CheckCircle2 size={16} /> Sem conta</span>
              <span><HardDrive size={16} /> Cache temporário</span>
              <span><LockKeyhole size={16} /> Sem upload ao servidor</span>
            </div>
          </div>

          <div className="hero-editor-art" aria-hidden="true">
            <div className="editor-window">
              <div className="editor-window-bar"><i /><i /><i /></div>
              <div className="editor-window-body">
                <div className="editor-text-box">Aa</div>
                <div className="editor-lines"><i /><i /><i /></div>
                <div className="editor-image"><FileImage size={48} /></div>
                <div className="editor-signature">LIM</div>
              </div>
            </div>
            <span className="art-chip chip-edit"><FileText size={18} /> Editar</span>
            <span className="art-chip chip-convert"><Sparkles size={18} /> Converter</span>
            <span className="art-chip chip-protect"><ShieldCheck size={18} /> Proteger</span>
            <span className="art-chip chip-compress"><Layers3 size={18} /> Compactar</span>
          </div>
        </div>
      </section>

      <AdSlot placement="home-top" format="horizontal" />

      <section className="home-section home-categories-v3">
        <div className="container">
          <div className="compact-section-heading">
            <div><span>Ferramentas por categoria</span><h2>Encontre a função certa sem rolagem infinita</h2></div>
            <Link href="/ferramentas">Ver todas as ferramentas <ArrowRight size={16} /></Link>
          </div>
          <div className="category-summary-grid">
            {navigationGroups.map((group) => (
              <Link className={`category-summary-card accent-${group.accent}`} href={`/categorias/${group.slug}`} key={group.slug}>
                <span><CategoryIcon icon={group.icon} size={25} /></span>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
                <small>Abrir categoria <ArrowRight size={13} /></small>
              </Link>
            ))}
            <Link className="category-summary-card accent-teal" href="/ferramentas/imagens-para-pdf">
              <span><Images size={25} /></span><h3>Imagens e PDF</h3><p>Converta imagens em PDF ou extraia páginas como JPG e PNG.</p><small>Abrir ferramentas <ArrowRight size={13} /></small>
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section popular-tools-section home-popular-v3">
        <div className="container">
          <div className="compact-section-heading"><div><span>Mais usadas</span><h2>Acesso rápido às funções mais procuradas</h2></div><Link href="/ferramentas">Ver todas <ArrowRight size={16} /></Link></div>
          <div className="popular-tool-row">
            {popular.map((tool) => (
              <Link className="popular-tool-card" href={`/ferramentas/${tool.slug}`} key={tool.slug}>
                <span className={`tool-icon accent-${tool.accent}`}><ToolIcon icon={tool.icon} /></span>
                <div><strong>{tool.name}</strong><small>{tool.shortDescription}</small></div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section workflow-section">
        <div className="container">
          <div className="compact-section-heading"><div><span>Fluxos inteligentes</span><h2>Combine ferramentas para terminar a tarefa inteira</h2></div><Link href="/ferramentas">Abrir catalogo <ArrowRight size={16} /></Link></div>
          <div className="workflow-grid">
            {workflows.slice(0, 4).map((workflow) => {
              const firstTool = toolBySlug.get(workflow.tools[0]);
              return (
                <Link className={`workflow-card accent-${workflow.accent}`} href={firstTool ? `/ferramentas/${firstTool.slug}` : "/ferramentas"} key={workflow.slug}>
                  <strong>{workflow.title}</strong>
                  <p>{workflow.description}</p>
                  <span>{workflow.tools.length} ferramentas conectadas</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-security-v3">
        <div className="container security-panel-v3">
          <div className="security-main"><span><ShieldCheck size={29} /></span><div><h2>Seus arquivos ficam seguros.</h2><p>O processamento acontece localmente. O cache temporário ajuda a recuperar uma tarefa interrompida e expira automaticamente.</p></div></div>
          <div className="security-facts"><div><HardDrive size={20} /><span><strong>100% local</strong><small>Processamento no navegador</small></span></div><div><FileText size={20} /><span><strong>Não armazenamos</strong><small>Arquivos não são enviados</small></span></div><div><ShieldCheck size={20} /><span><strong>Privacidade</strong><small>Dados permanecem no dispositivo</small></span></div></div>
        </div>
      </section>

      <section className="home-section guides-preview-section home-guides-v3">
        <div className="container">
          <div className="compact-section-heading"><div><span>Guias populares</span><h2>Aprenda a trabalhar melhor com PDF</h2></div><Link href="/guias">Ver todos os guias <ArrowRight size={16} /></Link></div>
          <div className="guide-preview-row">
            {guides.slice(0, 3).map((guide, index) => (
              <article className={`guide-preview-card guide-tone-${index + 1}`} key={guide.slug}>
                <span className="guide-preview-visual"><FileText size={28} /><ArrowRight size={17} /><FileImage size={28} /></span>
                <div><small><Clock3 size={13} /> {guide.readingTime}</small><h3>{guide.title}</h3><p>{guide.description}</p><Link href={`/guias/${guide.slug}`}>Ler guia <ArrowRight size={14} /></Link></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AdSlot placement="home-bottom" format="horizontal" />
    </>
  );
}
