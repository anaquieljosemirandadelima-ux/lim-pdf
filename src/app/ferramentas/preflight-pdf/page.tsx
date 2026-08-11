import type { Metadata } from "next";
import Link from "next/link";
import { PreflightWorkspace } from "@/components/PreflightWorkspace";
import { ToolTelemetryBridge } from "@/components/ToolTelemetryBridge";

export const metadata: Metadata = {
  title: "Preflight PDF grátis — verificar páginas, OCR, formulários e metadados",
  description: "Faça um check-up local do PDF antes de enviar, imprimir ou arquivar: dimensões, texto pesquisável, formulários, anotações e metadados.",
  alternates: { canonical: "/ferramentas/preflight-pdf" },
  openGraph: { title: "Preflight PDF grátis | LIM PDF", description: "Verifique problemas comuns do documento sem alterar o arquivo.", url: "/ferramentas/preflight-pdf", siteName: "LIM PDF", locale: "pt_BR", type: "website" },
};

export default function PreflightPdfPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const schema = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Preflight PDF — LIM PDF", applicationCategory: "UtilitiesApplication", operatingSystem: "Web", url: `${siteUrl}/ferramentas/preflight-pdf`, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }, featureList: ["Dimensões das páginas", "Camada de texto", "Formulários", "Anotações", "Metadados"] };
  return <section className="reference-tool-page preflight-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><ToolTelemetryBridge toolSlug="preflight-pdf" /><div className="reference-tool-heading"><div><span className="page-kicker">Check-up do documento</span><h1>Preflight PDF</h1><p>Revise a estrutura do arquivo antes da versão final, sem modificar o PDF durante o diagnóstico.</p></div></div><div className="reference-workspace-wrap"><PreflightWorkspace /></div><section className="editorial-unique"><div><span>Antes de entregar</span><h2>Um PDF pode parecer correto na tela e ainda carregar problemas importantes.</h2><p>Páginas de tamanhos diferentes, trechos sem OCR, formulários editáveis, comentários esquecidos e metadados internos costumam passar despercebidos numa revisão puramente visual.</p></div><div className="editorial-mini-grid"><article><strong>Páginas</strong><p>Detecte dimensões misturadas antes de imprimir ou montar um documento único.</p></article><article><strong>Conteúdo</strong><p>Veja quais páginas não possuem texto pesquisável e podem precisar de <Link href="/ferramentas/ocr-pdf">OCR</Link>.</p></article><article><strong>Privacidade</strong><p>Confira formulários, anotações e metadados antes de distribuir um arquivo sensível.</p></article></div></section></section>;
}
