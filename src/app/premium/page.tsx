import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FileOutput, Files, Layers3, LockKeyhole, PencilLine, Repeat2, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "LIM PDF gratuito | Ferramentas PDF locais e completas",
  description: "Use ferramentas PDF gratuitas para editar, organizar, converter, proteger, comparar, criar livreto e imprimir com processamento local.",
  alternates: { canonical: "/premium" },
  openGraph: {
    title: "LIM PDF gratuito | Ferramentas PDF locais e completas",
    description: "Uma suíte PDF gratuita, fluida e privada para editar, converter, organizar e preparar documentos para impressão.",
    url: "/premium",
    type: "website",
  },
};

const availableNow = [
  "Todas as ferramentas publicadas permanecem gratuitas, sem assinatura obrigatória",
  "Processamento local no navegador sempre que a capacidade permitir",
  "Arquivos de até 500 MB com orientação adaptativa de memória",
  "Editor Studio, OCR, lote, comparação, formulários, assinatura e PDF/A preparatório",
  "Livreto, páginas por folha e preparação de documentos para impressão",
  "Favoritos, recentes, workflows locais e catálogo agrupado por jornada",
];

const journeys = [
  { title: "Organizar e combinar", text: "Junte, divida, extraia, reordene, alterne, sobreponha e crie marcadores.", href: "/ferramentas/juntar-pdf", icon: Files, accent: "blue" },
  { title: "Editar, anotar e navegar", text: "Use o Studio, links, anotações, marca-d’água, texto, imagem e paginação.", href: "/ferramentas/editar-pdf", icon: PencilLine, accent: "green" },
  { title: "Converter e extrair", text: "Passe entre PDF, Word, Excel, Markdown, PowerPoint, imagens e texto.", href: "/ferramentas/converter-pdf", icon: Repeat2, accent: "teal" },
  { title: "Formulários e assinaturas", text: "Preencha, crie, revise, achate e assine documentos no navegador.", href: "/ferramentas/criar-formulario-pdf", icon: FileOutput, accent: "purple" },
  { title: "Proteger e conformidade", text: "Controle senhas, permissões, metadados, PDF/A preparatório e Bates.", href: "/ferramentas/proteger-pdf", icon: ShieldCheck, accent: "rose" },
  { title: "Otimizar e imprimir", text: "Comprima, limpe, repare, redimensione e prepare livreto ou páginas por folha.", href: "/ferramentas/criar-livreto-pdf", icon: Sparkles, accent: "orange" },
  { title: "Comparar e processar em lote", text: "Revise versões e aplique operações repetitivas a vários PDFs localmente.", href: "/ferramentas/comparar-pdfs", icon: Layers3, accent: "blue" },
];

const freeRoadmap = [
  { title: "Centro de Impressão", text: "Unificar livreto, N-up, orientação, margens, escala, preview de folhas, duplex frente e verso e botão para abrir a impressão do computador." },
  { title: "Fila local universal", text: "Permitir adicionar várias tarefas, pausar, cancelar, repetir uma etapa e acompanhar memória sem enviar documentos para um servidor." },
  { title: "Revisão e relatórios", text: "Exportar diagnósticos de preflight, OCR, comparação, segurança e impressão em formatos legíveis e reutilizáveis." },
  { title: "Acessibilidade e foco", text: "Consolidar teclado, foco visível, mensagens aria-live, contraste, modo de movimento reduzido e estados vazios orientados." },
  { title: "Busca por intenção", text: "Manter uma busca única que entende termos como imprimir, juntar, OCR, senha, formulário e converter." },
  { title: "Qualidade sustentável", text: "Usar anúncios apenas em páginas editoriais e de descoberta, nunca durante upload, processamento, resultado, download ou impressão." },
];

export default function PremiumPage() {
  return (
    <main className="premium-page editorial-page">
      <section className="premium-hero editorial-hero">
        <div className="premium-hero-copy">
          <span className="editorial-kicker"><Sparkles size={16} /> LIM PDF gratuito</span>
          <h1>Uma suíte PDF completa, fluida e local.</h1>
          <p>O LIM PDF reúne edição, organização, conversão, OCR, formulários, segurança, comparação, livreto e impressão numa experiência gratuita, sem obrigar você a criar conta ou enviar o documento para a nuvem.</p>
          <div className="premium-hero-actions"><Link className="button button-primary" href="/ferramentas">Explorar todas as ferramentas <ArrowRight size={17} /></Link><Link className="button button-secondary" href="/ferramentas/criar-livreto-pdf">Preparar para impressão</Link></div>
        </div>
        <div className="premium-hero-panel" aria-label="Princípios gratuitos do LIM PDF">
          <div><Repeat2 size={22} /><strong>Local por padrão</strong><small>O navegador processa o arquivo quando a ferramenta permite e o documento continua no seu aparelho.</small></div>
          <div><LockKeyhole size={22} /><strong>Sem paywall</strong><small>Não existem planos pagos obrigatórios, créditos ou bloqueio artificial de download.</small></div>
          <div><Layers3 size={22} /><strong>Jornadas completas</strong><small>Funções relacionadas ficam agrupadas para você concluir a tarefa sem procurar em várias categorias.</small></div>
        </div>
      </section>

      <section className="premium-section">
        <div className="section-heading"><span className="editorial-kicker">Compromisso do produto</span><h2>Tudo o que está publicado continua gratuito</h2><p>Os rótulos Essencial, Avançado ou Profissional podem organizar a descoberta, mas não representam cobrança. O objetivo é oferecer uma alternativa gratuita de alta qualidade para tarefas simples e complexas.</p></div>
        <div className="premium-feature-grid">{availableNow.map((feature) => <article className="premium-feature-card" key={feature}><Check size={20} /><p>{feature}</p></article>)}</div>
      </section>

      <section className="premium-section premium-section-muted">
        <div className="section-heading"><span className="editorial-kicker">Jornadas gratuitas</span><h2>Encontre a tarefa certa sem duplicação</h2><p>Cada ferramenta tem uma intenção principal e aparece numa única jornada. Os recursos relacionados são acessados dentro do mesmo fluxo, em vez de competir por espaço em vários cards.</p></div>
        <div className="premium-roadmap-grid">{journeys.map((journey) => { const Icon = journey.icon; return <Link className={`premium-roadmap-card journey-card accent-${journey.accent}`} href={journey.href} key={journey.title}><span className="premium-roadmap-number"><Icon size={17} /></span><div><h3>{journey.title}</h3><p>{journey.text}</p><span className="journey-card-link">Abrir jornada <ArrowRight size={15} /></span></div></Link>; })}</div>
      </section>

      <section className="premium-section">
        <div className="section-heading"><span className="editorial-kicker">Próxima evolução gratuita</span><h2>Mais profundidade, não mais paywalls</h2><p>As próximas entregas melhoram a experiência de quem já usa o site. Nenhuma delas deve retirar o acesso ao núcleo gratuito ou transformar uma função existente em duplicata paga.</p></div>
        <div className="premium-roadmap-grid">{freeRoadmap.map((feature, index) => <article className="premium-roadmap-card" key={feature.title}><span className="premium-roadmap-number">{index + 1}</span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></article>)}</div>
      </section>

      <section className="premium-trust-panel"><ShieldCheck size={23} /><div><h2>Gratuito, privado e transparente</h2><p>O LIM PDF não promete que uma ferramenta é local quando ela depende de um serviço externo. Cada fluxo deve informar o que acontece com o arquivo, os limites do navegador e o resultado produzido. A publicidade, quando existir, fica separada da operação do documento.</p></div></section>
    </main>
  );
}
