import type { Metadata } from "next";
import { TemporaryCachePanel } from "@/components/TemporaryCachePanel";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Saiba como o LIM PDF trata arquivos, dados de navegação, cache temporário, cookies e publicidade.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return (
    <section className="legal-page">
      <article className="container">
        <span className="eyebrow">Atualizada em 10 de agosto de 2026</span>
        <h1>Política de privacidade</h1>
        <p>Esta política explica como o LIM PDF trata documentos, dados técnicos e preferências de privacidade. O objetivo é oferecer transparência sobre o funcionamento real do serviço.</p>

        <h2>1. Processamento dos arquivos</h2>
        <p>As ferramentas publicadas processam PDFs e imagens diretamente no navegador. O conteúdo selecionado para as ferramentas não é enviado aos servidores do LIM PDF.</p>
        <p>Durante a operação, o navegador mantém dados temporários na memória. Para recuperar tarefas interrompidas, arquivos podem ser mantidos temporariamente no IndexedDB. O editor também pode guardar imagens de camadas no IndexedDB e metadados do rascunho no armazenamento local.</p>
        <p>Esses dados locais têm expiração de até 4 horas e também podem ser apagados manualmente no painel abaixo.</p>

        <TemporaryCachePanel />

        <h2>2. Dados técnicos e de acesso</h2>
        <p>A infraestrutura de hospedagem pode registrar informações técnicas necessárias à segurança e operação, como endereço IP, data e hora, página acessada, navegador, dispositivo, códigos de resposta e eventos de erro. O formulário de contato também usa limitação temporária por endereço de rede para reduzir abuso automatizado.</p>

        <h2>3. Cookies e armazenamento local</h2>
        <p>O site utiliza armazenamento local essencial para consentimento, idioma, cache temporário e recuperação de rascunhos. Esses recursos locais não exigem autorização para publicidade. Serviços opcionais de anúncios ou medição só são carregados após a escolha correspondente do visitante.</p>

        <h2>4. Publicidade</h2>
        <p>O script do Google AdSense só é inserido pelo LIM PDF depois que o visitante aceita recursos opcionais. Se a escolha for “Somente essenciais”, o script publicitário não é carregado pelo site.</p>

        <h2>5. Finalidades</h2>
        <ul>
          <li>Disponibilizar e proteger o site.</li>
          <li>Processar documentos localmente no navegador.</li>
          <li>Recuperar tarefas e rascunhos interrompidos por tempo limitado.</li>
          <li>Prevenir abuso dos canais públicos.</li>
          <li>Medir uso agregado, quando autorizado.</li>
          <li>Exibir publicidade, quando autorizada e configurada.</li>
          <li>Responder solicitações enviadas pelo canal oficial.</li>
        </ul>

        <h2>6. Compartilhamento</h2>
        <p>Não vendemos arquivos ou dados pessoais. Informações técnicas poderão ser processadas por fornecedores de hospedagem, segurança, medição e publicidade estritamente para fornecer os respectivos serviços e conforme as preferências aplicáveis.</p>

        <h2>7. Direitos do titular</h2>
        <p>O titular pode solicitar informações, correção, exclusão ou esclarecimentos sobre dados tratados pelo LIM PDF pela página de contato. Dados temporários mantidos apenas no dispositivo podem ser removidos imediatamente pelo próprio painel de privacidade.</p>

        <h2>8. Segurança</h2>
        <p>Aplicamos HTTPS, cabeçalhos de segurança, processamento local, expiração de cache e minimização de dados. No editor, páginas que recebem redação ou substituição de texto são sanitizadas e achatadas para impedir que o conteúdo visual coberto permaneça como texto subjacente na saída.</p>
        <p>Nenhuma medida elimina todos os riscos; documentos altamente sensíveis devem seguir as políticas da organização responsável e o arquivo final deve ser revisado antes de distribuição.</p>

        <h2>9. Alterações</h2>
        <p>Esta política poderá ser atualizada para refletir mudanças técnicas, legais ou de fornecedores. A data de atualização será indicada no topo.</p>
      </article>
    </section>
  );
}
