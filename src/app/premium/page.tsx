import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Layers3, LockKeyhole, Repeat2, ShieldCheck, Sparkles } from "lucide-react";
import { getPlanEntitlements, type ProductPlan } from "@/lib/premium-entitlements";

export const metadata: Metadata = {
  title: "LIM PDF Premium | Mais produtividade, privacidade e controle",
  description: "Conheça a evolução Premium do LIM PDF: arquivos grandes, processamento em lote, OCR, comparação, segurança e fluxos profissionais.",
  alternates: { canonical: "/premium" },
  openGraph: {
    title: "LIM PDF Premium | Mais produtividade, privacidade e controle",
    description: "Recursos avançados para trabalhar com PDFs com mais velocidade, automação e segurança.",
    url: "/premium",
    type: "website",
  },
};

const availableNow = [
  "Suporte a arquivos de até 500 MB, com orientação adaptativa de memória",
  "Processamento local no navegador para as ferramentas compatíveis",
  "Colagem de PDFs pelo clipboard e atalhos de upload",
  "Editor, OCR, conversões, proteção, formulários e ferramentas profissionais",
  "Favoritos, ferramentas recentes e catálogo organizado por intenção",
  "Interface com foco acessível, reduced motion e estados de processamento claros",
];

const premiumCapabilityMap = [
  { title: "Editor Studio 2.0", text: "Edite páginas, textos, imagens, formas e carimbos; use Google Fonts com incorporação local e substituição segura." },
  { title: "Comparação visual e textual", text: "Compare duas versões, identifique palavras adicionadas ou removidas e gere um PDF lado a lado com mapa de diferenças." },
  { title: "OCR com lote e confiança", text: "Torne digitalizações pesquisáveis, faça pré-processamento local e receba métricas para revisar resultados." },
  { title: "Preflight e PDF/A preparatório", text: "Cheque dimensões, texto, formulários, anotações e metadados antes de enviar; prepare uma cópia de arquivamento sem declarar certificação automática." },
  { title: "Formulários, anotações e assinatura", text: "Crie campos AcroForm, adicione anotações nativas e aplique assinatura digital PAdES básica com os limites técnicos explícitos." },
  { title: "Lote, 500 MB e privacidade", text: "Processe conjuntos sequencialmente, com orientação de memória e processamento local nas ferramentas compatíveis." },
];

const premiumRoadmap = [
  { title: "Relatórios exportáveis em todas as áreas", text: "Unificar preflight, OCR, lote e revisão em relatórios reutilizáveis com resumo, avisos e evidências." },
  { title: "Presets e fila de trabalho local", text: "Guardar configurações recorrentes no dispositivo e retomar operações interrompidas sem enviar documentos ao servidor." },
  { title: "Reconhecimento avançado de tabelas", text: "Aprofundar a conversão para Excel com detecção de colunas e revisão visual antes do download." },
  { title: "Integrações opcionais com consentimento", text: "Adicionar armazenamento ou colaboração em nuvem somente quando houver consentimento explícito e separação clara do modo local." },
];

const plans: Array<{ plan: ProductPlan; name: string; label: string; features: string[] }> = [
  { plan: "free", name: "Gratuito", label: "Para uso ocasional", features: ["Ferramentas essenciais", "Processamento local", "Editor e conversões disponíveis", "Sem cadastro obrigatório"] },
  { plan: "premium", name: "Premium", label: "Para quem trabalha com PDF toda semana", features: ["Tudo do Gratuito", "Recursos avançados e automação", "Lotes maiores e presets", "Sem anúncios no ambiente Premium"] },
  { plan: "professional", name: "Profissional", label: "Para escritórios e equipes", features: ["Tudo do Premium", "Redação e conformidade", "Assinatura digital e relatórios", "Suporte e fluxos corporativos"] },
];

export default function PremiumPage() {
  return (
    <main className="premium-page editorial-page">
      <section className="premium-hero editorial-hero">
        <div className="premium-hero-copy">
          <span className="editorial-kicker"><Sparkles size={16} /> Experiência Premium em evolução</span>
          <h1>Mais controle para trabalhar com PDFs todos os dias.</h1>
          <p>O LIM PDF Premium combina ferramentas profissionais, processamento local e automação responsável para você produzir mais sem abrir mão da privacidade.</p>
          <div className="premium-hero-actions"><Link className="button button-primary" href="/ferramentas">Explorar ferramentas <ArrowRight size={17} /></Link><Link className="button button-secondary" href="/contato">Falar com o LIM PDF</Link></div>
        </div>
        <div className="premium-hero-panel" aria-label="Princípios do LIM PDF Premium">
          <div><Repeat2 size={22} /><strong>Local primeiro</strong><small>O navegador processa o arquivo sempre que a ferramenta permite.</small></div>
          <div><LockKeyhole size={22} /><strong>Privacidade explícita</strong><small>Sem prometer segurança abstrata: explicamos limites e comportamento.</small></div>
          <div><Layers3 size={22} /><strong>Fluxos profissionais</strong><small>Fila, lote, revisão e presets para reduzir trabalho repetitivo.</small></div>
        </div>
      </section>

      <section className="premium-section">
        <div className="section-heading"><span className="editorial-kicker">Já disponível</span><h2>Uma base Premium já está no produto</h2><p>A versão publicada já recebeu melhorias de capacidade e interação. O catálogo não esconde recursos incompletos atrás de promessas: cada capacidade abaixo corresponde a uma ferramenta testada e publicada.</p></div>
        <div className="premium-feature-grid">{availableNow.map((feature) => <article className="premium-feature-card" key={feature}><Check size={20} /><p>{feature}</p></article>)}</div>
      </section>

      <section className="premium-section premium-section-muted">
        <div className="section-heading"><span className="editorial-kicker">Capacidades publicadas</span><h2>O que já torna o LIM PDF profissional</h2><p>O foco não é cobrar apenas por tamanho de arquivo. É oferecer economia de tempo, previsibilidade, segurança e automação para tarefas recorrentes, mantendo o processamento local sempre que possível.</p></div>
        <div className="premium-roadmap-grid">{premiumCapabilityMap.map((feature) => <article className="premium-roadmap-card" key={feature.title}><span className="premium-roadmap-number"><Check size={16} /></span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></article>)}</div>
      </section>

      <section className="premium-section">
        <div className="section-heading"><span className="editorial-kicker">Próxima evolução</span><h2>O que ainda está sendo aprofundado</h2><p>As próximas entregas ampliam previsibilidade e integração, sem duplicar as ferramentas que já existem.</p></div>
        <div className="premium-roadmap-grid">{premiumRoadmap.map((feature, index) => <article className="premium-roadmap-card" key={feature.title}><span className="premium-roadmap-number">{index + 1}</span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></article>)}</div>
      </section>

      <section className="premium-section">
        <div className="section-heading"><span className="editorial-kicker">Planos planejados</span><h2>Uma oferta clara, sem confundir acesso com promessa</h2><p>Os preços e o checkout serão definidos antes da cobrança. Esta página apresenta a arquitetura do produto sem simular uma assinatura que ainda não está disponível.</p></div>
        <div className="premium-plans-grid">{plans.map((plan, index) => <article className={`premium-plan-card ${index === 1 ? "is-featured" : ""}`} key={plan.name}><span className="premium-plan-label">{plan.label}</span><h3>{plan.name}</h3><span className="premium-plan-limit">Até {Math.round(getPlanEntitlements(plan.plan).maxFileBytes / (1024 * 1024))} MB · {getPlanEntitlements(plan.plan).maxBatchFiles} arquivos por lote</span><ul>{plan.features.map((feature) => <li key={feature}><Check size={16} /> {feature}</li>)}</ul><Link href="/contato">Quero acompanhar <ArrowRight size={16} /></Link></article>)}</div>
      </section>

      <section className="premium-trust-panel"><ShieldCheck size={23} /><div><h2>Local por padrão, nuvem apenas quando fizer sentido</h2><p>OCR, tradução, colaboração, armazenamento, cobrança e recursos de equipe podem exigir serviços de servidor. Quando uma função depender de nuvem, o LIM PDF deverá informar isso claramente, pedir consentimento quando necessário e separar o recurso da experiência local.</p></div></section>
    </main>
  );
}
