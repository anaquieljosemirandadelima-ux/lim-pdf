import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Entenda cookies, armazenamento local, consentimento e publicidade no LIM PDF.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <section className="legal-page">
      <article className="container">
        <span className="eyebrow">Preferências</span>
        <h1>Política de cookies</h1>
        <p>O LIM PDF usa armazenamento local essencial para lembrar preferências, recuperar tarefas temporárias e manter rascunhos do editor. Esses dados ficam no dispositivo e expiram conforme a política de privacidade.</p>
        <h2>Essenciais</h2>
        <p>Incluem consentimento, idioma, cache temporário no IndexedDB e dados locais de rascunho. São usados para funcionamento, privacidade e recuperação de trabalho, não para criar perfil publicitário.</p>
        <h2>Medição e publicidade</h2>
        <p>O script do Google AdSense e outros serviços opcionais de publicidade ou medição somente são carregados pelo LIM PDF depois que o visitante aceita recursos opcionais.</p>
        <h2>Como alterar a escolha</h2>
        <p>Use o botão “Preferências de privacidade” no rodapé para reabrir o painel e mudar a decisão. A página de privacidade também permite apagar os arquivos, imagens e rascunhos temporários mantidos neste navegador.</p>
        <h2>Bloqueio de cookies</h2>
        <p>Bloquear cookies de terceiros não impede o processamento local dos PDFs. Restrições ao armazenamento local do navegador podem impedir a recuperação de tarefas e rascunhos, mas não devem impedir o processamento básico.</p>
      </article>
    </section>
  );
}
