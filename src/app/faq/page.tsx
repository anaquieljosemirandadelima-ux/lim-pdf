import type { Metadata } from "next";

const faqItems = [
  {
    question: "Os arquivos são enviados para o servidor do LIM PDF?",
    answer: "Não nas ferramentas publicadas atualmente. O processamento acontece no navegador. Arquivos, imagens do editor e rascunhos temporários permanecem no dispositivo e expiram conforme a política de privacidade.",
  },
  {
    question: "Por que o site usa cache temporário?",
    answer: "O cache local ajuda a recuperar uma tarefa interrompida. Arquivos e imagens podem ficar no IndexedDB e metadados do rascunho no armazenamento local. Esses dados expiram em até 4 horas e podem ser apagados manualmente.",
  },
  {
    question: "O Editar PDF remove o conteúdo que foi substituído?",
    answer: "Quando um texto detectado é substituído, a página correspondente é rasterizada e a área antiga é apagada antes de o novo texto ser inserido. Isso remove o conteúdo subjacente daquela área, mas a página sanitizada perde recursos estruturais como texto selecionável, links e formulários.",
  },
  {
    question: "A ferramenta de redação apenas coloca uma tarja preta?",
    answer: "Não. Na exportação, a página que contém redação é achatada e os pixels da área redigida são apagados antes da geração do PDF final. Ainda assim, o resultado deve ser revisado antes de distribuição de documentos sensíveis.",
  },
  {
    question: "A compactação preserva texto selecionável?",
    answer: "O modo de compactação atual é rasterizado e indicado principalmente para digitalizações. Ele pode remover texto selecionável, links, camadas e formulários em troca de uma saída visual mais compacta.",
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
  description: "Respostas sobre privacidade, cache temporário, edição sanitizada, redação, compactação e assinatura no LIM PDF.",
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
