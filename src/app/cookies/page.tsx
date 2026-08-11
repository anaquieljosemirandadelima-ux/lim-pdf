import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de cookies", description: "Entenda cookies, armazenamento local, consentimento e publicidade no LIM PDF.", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return <section className="legal-page"><article className="container"><span className="eyebrow">Preferências</span><h1>Política de cookies</h1><p>O LIM PDF usa armazenamento local essencial para lembrar preferências, recuperar tarefas temporárias e manter rascunhos do editor. Esses dados ficam no dispositivo e expiram conforme a política de privacidade.</p>
    <h2>Essenciais</h2><p>Incluem consentimento, idioma, cache temporário no IndexedDB e dados locais de rascunho. São usados para funcionamento, privacidade e recuperação de trabalho, não para criar perfil publicitário.</p>
    <h2>Medição e publicidade</h2><p>Quando configurado e autorizado, o site pode carregar o Google AdSense. Google e fornecedores participantes podem usar cookies ou tecnologias equivalentes para entrega, limitação de frequência, prevenção de fraude, medição e, quando permitido, personalização de anúncios. O LIM PDF não entrega o conteúdo dos documentos processados localmente aos sistemas de publicidade.</p><p>Nas regiões em que a regulamentação exige uma plataforma de gestão de consentimento específica, a configuração de consentimento apresentada pelos serviços de anúncios pode complementar as preferências locais do site.</p>
    <h2>Como alterar a escolha</h2><p>Use o botão “Preferências de privacidade” no rodapé para reabrir o painel e mudar a decisão. A página de privacidade também permite apagar arquivos, imagens e rascunhos temporários mantidos neste navegador. Controles do próprio Google podem ser usados para gerenciar personalização de anúncios quando aplicável.</p>
    <h2>Bloqueio de cookies</h2><p>Bloquear cookies de terceiros não impede o processamento local dos PDFs. Restrições ao armazenamento local do navegador podem impedir a recuperação de tarefas e rascunhos, mas não devem impedir o processamento básico.</p>
  </article></section>;
}
