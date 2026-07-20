import type { Metadata } from "next";

const faqItems = [
  {
    question: "Os arquivos são enviados para o servidor do LIM PDF?",
    answer: "Não nas ferramentas publicadas atualmente. O processamento acontece no navegador, e o conteúdo dos PDFs e imagens permanece no dispositivo do usuário.",
  },
  {
    question: "Por que o site usa cache temporário?",
    answer: "O cache temporário em IndexedDB ajuda a recuperar uma tarefa interrompida. Ele expira automaticamente em até 4 horas e pode ser apagado nas preferências de privacidade.",
  },
  {
    question: "A ferramenta Editar PDF altera o texto original internamente?",
    answer: "Quando a edição estrutural do texto original não é segura, o LIM PDF usa substituição visual: cobre o conteúdo selecionado e escreve o novo texto por cima. Essa limitação é informada na página da ferramenta.",
  },
  {
    question: "A compactação preserva texto selecionável?",
    answer: "A compactação atual é indicada para documentos digitalizados e pode rasterizar páginas. Quando isso acontece, texto selecionável, links e formulários podem deixar de funcionar.",
  },
  {
    question: "A assinatura visual é um certificado digital?",
    answer: "Não. A assinatura visual insere uma imagem ou desenho no PDF. Ela não substitui uma assinatura digital com certificado ICP-Brasil quando esse tipo de assinatura for exigido.",
  },
  {
    question: "Preciso criar conta para usar as ferramentas?",
    answer: "Não. As ferramentas publicadas funcionam sem cadastro e geram uma nova cópia do arquivo para download.",
  },
];

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description: "Respostas sobre privacidade, cache temporário, edição visual, compactação e assinatura no LIM PDF.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <article className="container">
        <span className="eyebrow">Ajuda</span>
        <h1>Perguntas frequentes</h1>
        <p>Respostas objetivas sobre o funcionamento real das ferramentas, privacidade, cache temporário e limitações importantes.</p>
        <div className="faq-list standalone-faq-list">
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </article>
    </section>
  );
}
