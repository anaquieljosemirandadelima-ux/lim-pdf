import Link from "next/link";

type EditorialTool = {
  name: string;
  intro: string;
  description: string;
  useCases: string[];
  limitations: string[];
  faq?: { question: string; answer: string }[];
};

export function ToolEditorialPanel({ tool }: { tool: EditorialTool }) {
  const faq = tool.faq?.slice(0, 2) || [];
  return <section className="tool-editorial-panel" aria-label={`Informações sobre ${tool.name}`}>
    <div className="tool-editorial-intro"><span>Sobre a ferramenta</span><h2>{tool.intro}</h2><p>{tool.description}</p></div>
    <div className="tool-editorial-grid">
      <article><strong>Quando usar</strong>{tool.useCases.slice(0, 4).map((item) => <p key={item}>{item}</p>)}</article>
      <article><strong>O que revisar</strong>{tool.limitations.slice(0, 4).map((item) => <p key={item}>{item}</p>)}</article>
      {faq.length ? <article><strong>Dúvidas desta função</strong>{faq.map((item) => <div key={item.question}><b>{item.question}</b><p>{item.answer}</p></div>)}</article> : null}
    </div>
    <footer><span>Precisa escolher outra operação?</span><Link href="/ferramentas">Ver todas as ferramentas</Link><Link href="/guias">Abrir guias práticos</Link></footer>
  </section>;
}
