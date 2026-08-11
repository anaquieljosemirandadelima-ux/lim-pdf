import type { Metadata } from "next";
import Link from "next/link";

const guides = [
  { href: "/guias/editar-pdf-sem-perder-formatacao", tag: "Edição", title: "Editar PDF sem perder o controle da página", text: "Entenda quando adicionar uma camada, quando substituir texto e quando usar redação segura." },
  { href: "/guias/ocr-pdf-escaneado", tag: "OCR", title: "PDF escaneado: como torná-lo pesquisável", text: "Veja por que um scanner cria imagens, como o OCR trabalha e o que revisar no resultado." },
  { href: "/guias/comprimir-pdf", tag: "Otimização", title: "Comprimir PDF sem destruir a qualidade", text: "Escolha a intensidade de compressão pelo destino: tela, envio, impressão ou arquivo mestre." },
  { href: "/guias/redacao-segura-pdf", tag: "Segurança", title: "Cobrir não é apagar: redação segura em PDF", text: "Aprenda a diferença entre um retângulo preto e a remoção real do conteúdo subjacente." },
];

export const metadata: Metadata = {
  title: "Guias LIM PDF — edição, OCR, compressão e segurança",
  description: "Guias práticos e específicos para trabalhar com PDF: edição, OCR, compressão e remoção segura de dados.",
  alternates: { canonical: "/guias" },
};

export default function GuidesPage() {
  return <main className="institution-page guides-institution"><header className="institution-hero guides-hero"><span>Guias LIM PDF</span><h1>Aprenda a decidir o que fazer com o arquivo — não só onde clicar.</h1><p>Os guias abaixo explicam problemas reais de PDF, as limitações envolvidas e como revisar o resultado antes de compartilhar.</p></header><section className="guide-feature"><div><span>Comece pelo mais importante</span><h2>Editar PDF não é a mesma coisa que editar um documento do Word.</h2><p>Um PDF pode ter texto em blocos posicionados, imagens, vetores e páginas escaneadas. Saber qual estrutura existe evita tentar “editar texto” que na verdade é uma fotografia.</p><Link href="/guias/editar-pdf-sem-perder-formatacao">Ler guia de edição →</Link></div><aside><strong>Atalho prático</strong><p>Se você não consegue selecionar ou pesquisar o texto, experimente OCR antes de converter ou editar.</p><Link href="/ferramentas/ocr-pdf">Abrir OCR PDF</Link></aside></section><section className="guide-card-list">{guides.map((guide, index) => <Link href={guide.href} key={guide.href}><span className="guide-index">{String(index + 1).padStart(2, "0")}</span><div><small>{guide.tag}</small><h2>{guide.title}</h2><p>{guide.text}</p></div><b>→</b></Link>)}</section></main>;
}
