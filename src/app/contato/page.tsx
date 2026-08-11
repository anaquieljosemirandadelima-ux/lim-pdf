import type { Metadata } from "next";
import Link from "next/link";

const supportEmail = "anaquieljosemirandadelima@gmail.com";
const topics = [
  { title: "Falha em ferramenta", text: "Informe a ferramenta, navegador, aparelho e a mensagem de erro. Não envie o PDF confidencial.", subject: "LIM PDF - Falha em ferramenta" },
  { title: "Sugestão de função", text: "Explique qual tarefa você precisa resolver e em que ponto o fluxo atual atrapalha.", subject: "LIM PDF - Sugestão de função" },
  { title: "Privacidade ou segurança", text: "Descreva o risco, a rota afetada e como reproduzir sem compartilhar dados pessoais desnecessários.", subject: "LIM PDF - Privacidade ou segurança" },
  { title: "Direitos autorais ou abuso", text: "Identifique a página ou conteúdo do site relacionado ao pedido e inclua os dados necessários para análise.", subject: "LIM PDF - Direitos autorais ou abuso" },
];

export const metadata: Metadata = {
  title: "Contato LIM PDF — suporte, privacidade e sugestões",
  description: "Canal direto para relatar falhas, enviar sugestões e tratar de privacidade, segurança ou abuso no LIM PDF.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  return <main className="institution-page contact-institution"><header className="institution-hero contact-hero"><span>Contato</span><h1>Escolha o assunto e já abra a mensagem pronta.</h1><p>O LIM PDF não pede que você envie documentos para atendimento. Descreva o problema e, quando necessário, use um arquivo de teste sem informações pessoais.</p></header><section className="contact-topic-list">{topics.map((topic, index) => <article key={topic.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{topic.title}</h2><p>{topic.text}</p></div><a className="contact-mail-button" href={`mailto:${supportEmail}?subject=${encodeURIComponent(topic.subject)}`}>Abrir e-mail</a></article>)}</section><section className="contact-direct"><div><span>Canal direto</span><strong>{supportEmail}</strong><p>Esse endereço é o destino real do contato. Não há formulário intermediário nem webhook pendente.</p></div><div><h2>Antes de escrever</h2><ul><li>Não envie CPF, senha, certificado ou chave privada.</li><li>Não anexe o documento original se ele contiver informação sensível.</li><li>Para erro técnico, informe o nome da ferramenta e os passos até o problema.</li></ul></div></section><section className="contact-links"><Link href="/privacidade">Política de privacidade</Link><Link href="/seguranca">Segurança</Link><Link href="/termos">Termos</Link></section></main>;
}
