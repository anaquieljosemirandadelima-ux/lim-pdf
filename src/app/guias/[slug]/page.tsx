import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { guideBySlug, guides } from "@/lib/guides";

interface Props { params: Promise<{ slug: string }> }
export function generateStaticParams() { return guides.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const guide = guideBySlug.get(slug); if (!guide) return {};
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guias/${guide.slug}` }, openGraph: { type: "article", title: guide.title, description: guide.description, url: `/guias/${guide.slug}`, siteName: "LIM PDF", locale: "pt_BR" } };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params; const guide = guideBySlug.get(slug); if (!guide) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, dateModified: "2026-08-11", author: { "@type": "Organization", name: "LIM PDF" }, publisher: { "@type": "Organization", name: "LIM PDF" }, mainEntityOfPage: `${siteUrl}/guias/${guide.slug}`, inLanguage: "pt-BR" };
  return <article className="guide-article"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><nav className="guide-back"><Link href="/guias"><ArrowLeft size={14} /> Todos os guias</Link></nav><header><span className="guide-kicker"><BookOpen size={16} /> Guia LIM PDF</span><h1>{guide.title}</h1><p>{guide.description}</p><small><CalendarDays size={14} /> Atualizado em {guide.updated}</small></header><div className="guide-body">{guide.sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets?.length ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}</section>)}</div><aside className="guide-cta"><div><strong>Faça no seu arquivo</strong><p>Abra a ferramenta correspondente e aplique o fluxo descrito neste guia.</p></div><Link className="primary-button" href={guide.toolHref}>{guide.toolLabel}<ArrowRight size={15} /></Link></aside></article>;
}
