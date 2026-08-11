import type { Metadata } from "next";
import Link from "next/link";
import { OcrWorkspace } from "@/components/OcrWorkspace";
import { ToolTelemetryBridge } from "@/components/ToolTelemetryBridge";

export const metadata: Metadata = {
  title: "OCR PDF grátis — tornar PDF escaneado pesquisável",
  description: "Reconheça texto em PDFs escaneados em português, inglês e espanhol e gere um PDF pesquisável diretamente no navegador.",
  alternates: { canonical: "/ferramentas/ocr-pdf" },
  openGraph: { title: "OCR PDF grátis | LIM PDF", description: "Transforme páginas escaneadas em PDF pesquisável sem enviar o documento ao LIM PDF.", url: "/ferramentas/ocr-pdf", siteName: "LIM PDF", locale: "pt_BR", type: "website" },
};

export default function OcrPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://limpdf.com.br";
  const schema = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "OCR PDF — LIM PDF", applicationCategory: "UtilitiesApplication", operatingSystem: "Web", url: `${siteUrl}/ferramentas/ocr-pdf`, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" }, featureList: ["OCR em português", "OCR em inglês", "OCR em espanhol", "PDF pesquisável", "Processamento local"] };
  return <section className="reference-tool-page ocr-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><ToolTelemetryBridge toolSlug="ocr-pdf" /><div className="reference-tool-heading"><div><span className="page-kicker">Reconhecimento de texto</span><h1>OCR PDF</h1><p>Transforme um PDF escaneado em um documento pesquisável, mantendo a aparência original de cada página.</p></div></div><div className="reference-workspace-wrap"><OcrWorkspace /></div><section className="editorial-unique ocr-editorial"><div><span>Quando usar</span><h2>Quando o PDF parece texto, mas você não consegue pesquisar nada.</h2><p>Scanners e aplicativos de câmera costumam criar páginas que são apenas imagens. O OCR analisa os pixels, identifica palavras e adiciona uma camada de texto à página.</p></div><div className="editorial-mini-grid"><article><strong>Antes do OCR</strong><p>Se a página estiver torta, escura ou com sombras, melhorar a digitalização aumenta a precisão do reconhecimento.</p></article><article><strong>Depois do OCR</strong><p>Teste a busca por nomes, valores e números importantes. OCR é reconhecimento automático e documentos críticos ainda precisam de revisão.</p></article><article><strong>Para editar</strong><p>Depois de gerar o PDF pesquisável, abra o <Link href="/ferramentas/editar-pdf">Editar PDF</Link> ou converta para Word.</p></article></div></section></section>;
}
