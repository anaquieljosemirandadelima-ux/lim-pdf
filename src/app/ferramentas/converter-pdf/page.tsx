import type { Metadata } from "next";
import { UnifiedConverterWorkspace } from "@/components/UnifiedConverterWorkspace";

export const metadata: Metadata = {
  title: "Converter PDF grátis — escolha Word, Excel, JPG, PNG ou texto",
  description: "Envie o PDF uma vez e escolha o formato de saída no mesmo fluxo: Word, Excel, JPG, PNG ou texto.",
  alternates: { canonical: "/ferramentas/converter-pdf" },
  openGraph: { title: "Converter PDF grátis | LIM PDF", description: "Escolha o formato depois de enviar o PDF, sem procurar outro botão ou outra página.", url: "/ferramentas/converter-pdf", siteName: "LIM PDF", locale: "pt_BR", type: "website" },
};

export default function ConverterPdfPage() {
  return <section className="reference-tool-page converter-hub-page"><div className="reference-tool-heading"><div><span className="page-kicker">Conversor central</span><h1>Converter PDF</h1><p>Selecione o arquivo primeiro. Depois escolha Word, Excel, JPG, PNG ou texto sem sair desta tela.</p></div></div><div className="reference-workspace-wrap"><UnifiedConverterWorkspace /></div><section className="editorial-unique converter-editorial"><div><span>Um fluxo só</span><h2>O formato não precisa ser uma decisão permanente.</h2><p>Se você entrou pensando em Word e percebeu que precisa de Excel ou imagem, troque a saída no mesmo painel. O arquivo continua selecionado e a ação principal fica logo abaixo das opções.</p></div><div className="editorial-mini-grid"><article><strong>Word</strong><p>Para reaproveitar e editar texto existente em PDFs digitais.</p></article><article><strong>Excel</strong><p>Para extrair linhas e dados para uma planilha editável.</p></article><article><strong>JPG ou PNG</strong><p>Para transformar cada página em imagem e usar em sistemas, redes sociais ou apresentações.</p></article></div></section></section>;
}
