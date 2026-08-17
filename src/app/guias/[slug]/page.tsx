import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { LucideClientIcon } from "@/components/LucideClientIcon";
import { guideBySlug, guides } from "@/lib/guides";

interface GuidePageProps { params: Promise<{ slug: string }> }

function sectionId(label: string) { return label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function generateStaticParams() { return guides.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide) return {};
  return { title: `${guide.title} | LIM PDF`, description: guide.description, authors: [{ name: guide.author }], alternates: { canonical: `/guias/${guide.slug}` }, openGraph: { type: "article", title: guide.title, description: guide.description, url: `/guias/${guide.slug}`, publishedTime: "2026-08-17", modifiedTime: "2026-08-17", authors: [guide.author], section: guide.category } };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const articleUrl = `${siteUrl}/guias/${guide.slug}`;
  const articleSchema = { "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, url: articleUrl, datePublished: "2026-08-17", dateModified: "2026-08-17", inLanguage: "pt-BR", author: { "@type": "Organization", name: guide.author, url: `${siteUrl}/sobre` }, publisher: { "@type": "Organization", name: "LIM PDF", url: siteUrl } };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: guide.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Início", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Guias", item: `${siteUrl}/guias` }, { "@type": "ListItem", position: 3, name: guide.title, item: articleUrl }] };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    <main className="editorial-page guide-detail-page">
      <div className="guide-breadcrumb"><Link href="/">Início</Link><span>/</span><Link href="/guias">Guias</Link><span>/</span><span>{guide.title}</span></div>
      <article className="guide-article-layout">
        <div className="guide-article-main">
          <header className="guide-article-header"><div className="guide-card-meta"><span>{guide.category}</span><span>{guide.readingTime}</span></div><h1>{guide.title}</h1><p className="guide-article-dek">{guide.description}</p><div className="guide-byline"><span className="guide-author-avatar"><LucideClientIcon name="PencilLine" size={18} /></span><span>Por <strong>{guide.author}</strong><small>Atualizado em {guide.updatedAt}</small></span></div></header>
          <div className="guide-article-lead"><p>{guide.intro}</p></div>
          <AdSlot placement="tool-inline" format="horizontal" className="editorial-ad-slot guide-lead-ad" />
          <div className="guide-article-body">{guide.sections.map((section) => <section id={sectionId(section.heading)} key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</section>)}
            <section className="guide-faq" id="perguntas-frequentes"><h2>Perguntas frequentes</h2>{guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
          </div>
          <footer className="guide-article-footer"><span>Este guia foi preparado para ajudar na decisão e na revisão do arquivo. Ele não substitui orientação jurídica, técnica ou de segurança específica.</span><Link href="/sobre">Como o LIM PDF prepara conteúdo <LucideClientIcon name="ArrowRight" size={16} /></Link></footer>
        </div>
        <aside className="guide-article-aside"><div className="guide-toc"><strong>Neste guia</strong><nav aria-label="Seções do guia">{guide.sections.map((section) => <a href={`#${sectionId(section.heading)}`} key={section.heading}>{section.heading}</a>)}<a href="#perguntas-frequentes">Perguntas frequentes</a></nav></div><div className="guide-related"><strong>Ferramentas relacionadas</strong>{guide.relatedTools.map((tool) => <Link href={tool.href} key={tool.href}>{tool.label}<LucideClientIcon name="ArrowRight" size={15} /></Link>)}</div><AdSlot placement="catalog-side" format="rectangle" /></aside>
      </article>
    </main>
  </>;
}
