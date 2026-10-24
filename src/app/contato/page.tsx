import type { Metadata } from "next";
import Link from "next/link";
import { LucideClientIcon } from "@/components/LucideClientIcon";

export const metadata: Metadata = {
  title: "Contato e suporte | LIM PDF",
  description: "Fale com o LIM PDF para relatar erros, pedir melhorias de acessibilidade, sugerir guias ou tirar dúvidas sobre o produto.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contato@limpdf.com.br";

  return (
    <main className="editorial-page contact-page">
      <section className="editorial-hero trust-hero">
        <div className="editorial-hero-copy">
          <span className="editorial-kicker">Contato e suporte</span>
          <h1>Ajude a tornar o trabalho com PDF mais simples.</h1>
          <p>Use este canal para relatar um erro, pedir uma melhoria de acessibilidade, sugerir um guia ou tirar dúvidas sobre o LIM PDF.</p>
        </div>
        <div className="editorial-hero-card">
          <strong>Antes de escrever</strong>
          <p>Inclua o endereço da página, o navegador usado e os passos para reproduzir o problema. Nunca envie senhas, certificados ou documentos confidenciais.</p>
          <Link href="/seguranca">Ver orientações de segurança <LucideClientIcon name="ArrowRight" size={16} /></Link>
        </div>
      </section>

      <section className="contact-content-grid">
        <div className="contact-main-column">
          <div className="contact-channel-card">
            <span className="contact-icon"><LucideClientIcon name="Files" size={24} /></span>
            <div>
              <span className="editorial-kicker">Canal principal</span>
              <h2>{contactEmail}</h2>
              <p>Escreva para este endereço e informe como podemos ajudar. Para sua segurança, não anexe documentos pessoais ou confidenciais.</p>
              <a className="editorial-primary-link" href={`mailto:${contactEmail}`}>Enviar e-mail <LucideClientIcon name="ArrowRight" size={16} /></a>
            </div>
          </div>

          <section className="contact-request-grid">
            <article><span><LucideClientIcon name="FileQuestion" size={20} /></span><h3>Relatar um erro</h3><p>Envie a rota, o navegador, o tipo de arquivo e o que aconteceu. Não anexe documentos pessoais.</p></article>
            <article><span><LucideClientIcon name="CheckCircle2" size={20} /></span><h3>Acessibilidade</h3><p>Informe a tecnologia assistiva, o teclado ou a dificuldade encontrada para que possamos reproduzir o cenário.</p></article>
            <article><span><LucideClientIcon name="ListChecks" size={20} /></span><h3>Sugerir uma melhoria</h3><p>Explique qual tarefa você quer resolver e por que o fluxo atual não é suficiente.</p></article>
            <article><span><LucideClientIcon name="BookOpen" size={20} /></span><h3>Sugerir um guia</h3><p>Conte qual dúvida sobre PDF você gostaria de ver explicada com exemplos e limites reais.</p></article>
          </section>
        </div>

        <aside className="contact-side-column">
          <div className="editorial-side-card">
            <h2>Links úteis</h2>
            <nav className="trust-link-list">
              <Link href="/guias">Guias práticos <LucideClientIcon name="ArrowRight" size={15} /></Link>
              <Link href="/ferramentas">Catálogo de ferramentas <LucideClientIcon name="ArrowRight" size={15} /></Link>
              <Link href="/privacidade">Privacidade <LucideClientIcon name="ArrowRight" size={15} /></Link>
              <Link href="/sobre">Sobre o LIM PDF <LucideClientIcon name="ArrowRight" size={15} /></Link>
            </nav>
          </div>
          <div className="editorial-side-card muted">
            <h2>Proteja seus dados</h2>
            <p>O suporte não precisa do seu PDF. Use uma descrição, uma imagem sem dados sensíveis ou um documento de teste.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
