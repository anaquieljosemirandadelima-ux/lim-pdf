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
        <span className="eyebrow">Atualizada em 20 de julho de 2026</span>
        <h1>Política de privacidade</h1>
        <p>Esta política explica como o LIM PDF trata documentos, dados técnicos e preferências de privacidade. O objetivo é oferecer transparência sobre o funcionamento real do serviço.</p>

        <h2>1. Processamento dos arquivos</h2>
        <p>As ferramentas atualmente publicadas processam os arquivos diretamente no navegador. O conteúdo dos PDFs e imagens selecionados não é enviado nem armazenado nos servidores do LIM PDF.</p>
        <p>Durante a operação, o navegador mantém dados temporários na memória do dispositivo. Algumas ferramentas também podem guardar uma cópia temporária no IndexedDB do navegador para recuperar tarefas interrompidas.</p>

        <TemporaryCachePanel />

        <h2>2. Dados técnicos e de acesso</h2>
        <p>A infraestrutura de hospedagem pode registrar informações técnicas necessárias à segurança e operação, como endereço IP, data e hora, página acessada, navegador, dispositivo, códigos de resposta e eventos de erro.</p>

        <h2>3. Cookies e armazenamento local</h2>
        <p>O site utiliza armazenamento local essencial para registrar preferências de consentimento, idioma e cache temporário de tarefas. Quando publicidade ou métricas opcionais estiverem autorizadas, fornecedores configurados poderão utilizar cookies conforme a escolha do visitante e suas próprias políticas.</p>

        <h2>4. Publicidade</h2>
        <p>O Google AdSense só é carregado depois que o visitante aceita recursos opcionais. Se o visitante escolher somente recursos essenciais, o script de anúncios não é inserido pelo LIM PDF.</p>

        <h2>5. Finalidades</h2>
        <ul>
          <li>Disponibilizar e proteger o site.</li>
          <li>Processar documentos no navegador.</li>
          <li>Recuperar tarefas interrompidas por cache temporário local.</li>
          <li>Medir uso agregado, quando autorizado.</li>
          <li>Exibir publicidade, quando autorizada e configurada.</li>
          <li>Responder solicitações enviadas por canal oficial.</li>
        </ul>

        <h2>6. Compartilhamento</h2>
        <p>Não vendemos arquivos ou dados pessoais. Informações técnicas poderão ser processadas por fornecedores de hospedagem, segurança, medição e publicidade estritamente para fornecer os respectivos serviços.</p>

        <h2>7. Direitos do titular</h2>
        <p>O titular pode solicitar informações, correção, exclusão ou esclarecimentos sobre dados tratados pelo LIM PDF pela página de contato.</p>

        <h2>8. Segurança</h2>
        <p>Aplicamos HTTPS, cabeçalhos de segurança, processamento local e minimização de dados. Nenhuma medida elimina todos os riscos; documentos altamente sensíveis devem seguir as políticas da organização responsável.</p>

        <h2>9. Alterações</h2>
        <p>Esta política poderá ser atualizada para refletir mudanças técnicas, legais ou de fornecedores. A data de atualização será indicada no topo.</p>
      </article>
    </section>
  );
}
