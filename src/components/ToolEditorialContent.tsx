import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb, ShieldCheck, TriangleAlert } from "lucide-react";

type ToolContent = {
  slug: string; name: string; description: string; intro?: string; useCases?: string[]; limitations?: string[]; faq?: { question: string; answer: string }[];
};

const nextByIntent: Record<string, { href: string; label: string }[]> = {
  "ocr-pdf": [{ href: "/ferramentas/editar-pdf", label: "Editar o PDF reconhecido" }, { href: "/ferramentas/pdf-para-word", label: "Converter para Word" }],
  "editar-pdf": [{ href: "/ferramentas/preflight-pdf", label: "Revisar o PDF final" }, { href: "/ferramentas/compactar-pdf", label: "Compactar o resultado" }],
  "compactar-pdf": [{ href: "/ferramentas/preflight-pdf", label: "Verificar o arquivo final" }, { href: "/ferramentas/proteger-pdf", label: "Proteger com senha" }],
  "pdf-para-word": [{ href: "/ferramentas/ocr-pdf", label: "Reconhecer PDF escaneado" }, { href: "/ferramentas/converter-pdf", label: "Escolher outro formato" }],
  "pdf-para-excel": [{ href: "/ferramentas/ocr-pdf", label: "Executar OCR" }, { href: "/ferramentas/converter-pdf", label: "Escolher outro formato" }],
  "converter-pdf": [{ href: "/ferramentas/ocr-pdf", label: "OCR para documentos escaneados" }, { href: "/ferramentas/editar-pdf", label: "Editar antes de converter" }],
  "normalizar-paginas-pdf": [{ href: "/ferramentas/preflight-pdf", label: "Conferir dimensões" }, { href: "/ferramentas/compactar-pdf", label: "Compactar PDF" }],
  "preflight-pdf": [{ href: "/ferramentas/ocr-pdf", label: "Aplicar OCR" }, { href: "/ferramentas/normalizar-paginas-pdf", label: "Padronizar páginas" }],
};

export function ToolEditorialContent({ tool }: { tool: ToolContent }) {
  const useCases = tool.useCases?.length ? tool.useCases : ["Trabalhar com documentos no navegador", "Preparar arquivos para compartilhamento", "Organizar um fluxo de PDF sem instalar programa"];
  const limitations = tool.limitations?.length ? tool.limitations : ["Revise o resultado antes de distribuir documentos importantes"];
  const faq = tool.faq?.length ? tool.faq : [{ question: `Como usar ${tool.name}?`, answer: "Selecione o arquivo, ajuste as opções disponíveis, processe e revise o arquivo baixado." }];
  const next = nextByIntent[tool.slug] || [{ href: "/ferramentas", label: "Ver todas as ferramentas" }, { href: "/ferramentas/preflight-pdf", label: "Fazer um check-up do PDF" }];
  return <section className="tool-editorial" aria-label={`Informações sobre ${tool.name}`}>
    <div className="tool-editorial-intro"><span><Lightbulb size={18} /></span><div><h2>Sobre {tool.name}</h2><p>{tool.intro || tool.description}</p></div></div>
    <div className="tool-editorial-columns">
      <article><h3>Quando esta ferramenta ajuda</h3>{useCases.map((item) => <p key={item}><CheckCircle2 size={15} /> <span>{item}</span></p>)}</article>
      <article><h3>O que revisar no resultado</h3>{limitations.map((item) => <p key={item}><TriangleAlert size={15} /> <span>{item}</span></p>)}</article>
      <article><h3>Privacidade por padrão</h3><p><ShieldCheck size={15} /><span>O documento é processado localmente quando a ferramenta informa processamento no navegador. O LIM PDF não usa o conteúdo do arquivo para publicidade.</span></p></article>
    </div>
    <div className="tool-editorial-next"><div><strong>Continue o trabalho</strong><small>Use o arquivo baixado na próxima etapa sem procurar a função de novo.</small></div>{next.map((item) => <Link href={item.href} key={item.href}>{item.label}<ArrowRight size={14} /></Link>)}</div>
    <div className="tool-editorial-faq"><h2>Perguntas sobre {tool.name}</h2>{faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
  </section>;
}
