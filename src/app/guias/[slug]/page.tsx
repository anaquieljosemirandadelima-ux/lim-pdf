import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { guideBySlug, guides } from "@/lib/guides";
import { toolBySlug } from "@/lib/tools";

interface GuidePageProps { params: Promise<{ slug: string }> }

export function generateStaticParams() { return guides.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guias/${guide.slug}` }, openGraph: { type: "article", title: guide.title, description: guide.description, publishedTime: guide.publishedAt, modifiedTime: guide.updatedAt } };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide) notFound();
  const tool = toolBySlug.get(guide.relatedTool);
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, datePublished: guide.publishedAt, dateModified: guide.updatedAt, author: { "@type": "Organization", name: "LIM PDF" }, publisher: { "@type": "Organization", name: "LIM PDF" }, mainEntityOfPage: `/guias/${guide.slug}` };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: guide.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <article className="article-page"><header className="article-hero"><div className="container article-narrow"><Link className="breadcrumb" href="/guias">Guias <span>/</span> Tutoriais</Link><h1>{guide.title}</h1><p>{guide.description}</p><div className="article-meta"><span><Clock3 size={15} /> {guide.readingTime}</span><span><CalendarDays size={15} /> Atualizado em 18 de julho de 2026</span></div></div></header>
    <div className="container article-layout"><div className="article-body"><p className="article-lead">{guide.intro}</p>{guide.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.tips ? <ul className="article-tips">{section.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul> : null}</section>)}<section><h2>Perguntas frequentes</h2><div className="faq-list">{guide.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section></div>
    <aside className="article-aside">{tool ? <div className="aside-card"><span className="eyebrow">Ferramenta relacionada</span><h2>{tool.name}</h2><p>{tool.shortDescription}</p><Link className="primary-button" href={`/ferramentas/${tool.slug}`}>Usar ferramenta <ArrowRight size={16} /></Link></div> : null}<div className="aside-card"><h2>Conteúdo responsável</h2><p>Os guias explicam recursos e limitações. Revise documentos importantes antes do uso profissional.</p></div></aside></div></article>
  </>;
}
