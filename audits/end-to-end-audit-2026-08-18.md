# Auditoria ponta a ponta do LIM PDF — 18/08/2026

## Estado de execução

A branch `main` está no commit `2fe9598` (`fix: harden audited PDF workflows and search accessibility`). As correções da auditoria — corrida do Centro de Impressão, IDs ARIA únicos do buscador e regressões visuais — já estão publicadas; o working tree contém apenas as evidências finais acrescentadas a este relatório. Rotas e scripts de QA existentes foram levantados.

## QA executado

`test:routes`, `test:e2e` (42 ferramentas principais) e `test:e2e:pro` (16 fluxos avançados) passaram. `test:e2e:p0` apresentou uma falha transitória na primeira execução por timing da mensagem final do Centro de Impressão, mas passou isoladamente na reprodução seguinte. OCR pesquisável, consentimento/telemetria e orçamento de performance no browser passaram.

## Primeiras conclusões visuais

A captura desktop mostra uma hierarquia de hero clara, cartões de ferramentas acessíveis e a busca global posicionada na sidebar sem scrollbar nativa visível. O dropdown, contudo, permanece visualmente sobreposto à navegação lateral quando aberto, reduzindo a legibilidade do menu abaixo; deve ser tratado como comportamento intencional de camada, mas pode beneficiar de um painel mais opaco e uma altura/posição mais previsível.

A captura mobile mostra que a sidebar de navegação permanece visualmente presente como uma coluna alta, apesar do fallback responsivo do buscador existir no DOM. O conteúdo principal fica parcialmente comprimido/encoberto no topo, e a composição perde contexto antes de começar os cartões de ferramentas. Esta é a prioridade visual mais alta encontrada até aqui: confirmar no CSS se a sidebar deve estar totalmente oculta em 390px e se o screenshot corresponde a um estado de teste anterior ou a uma regressão real.

## Correção responsiva implementada durante a auditoria

Foi aplicada uma melhoria de alto impacto em `catalog-discovery-2026.css`: em tablet (621–900px), a sidebar passou para 72px, com ícones e sem recomendação extensa; em mobile (até 620px), a sidebar é ocultada por completo e o conteúdo principal passa a ocupar 100% da viewport. A busca permanece no cabeçalho.

A nova auditoria visual passou com 22 capturas. A captura mobile pós-correção mostra o hero e os cartões ocupando a largura útil, sem a coluna lateral sobreposta. A captura tablet mostra uma rail de ícones estreita e o conteúdo principal sem o corte anterior. Foram adicionadas asserções para garantir `display:none` da sidebar em mobile, largura máxima de 90px no tablet e ocupação adequada do conteúdo principal.

## Produção após o merge

O Vercel publicou o commit `ae410a8e4fdeae6b05483d5f9db0de71d932bfae` em estado `READY`, com destino `production`, após o merge da PR #24. O domínio público foi aberto com cache-bust em `https://limpdf.com.br/?release=ae410a8`.

A página pública confirmou o buscador global, as 7 jornadas canónicas, 62 fluxos gratuitos, os atalhos principais, a mensagem de processamento local, os cartões de descoberta e o rodapé editorial. A captura desktop mostra a sidebar estável, o hero e os cartões sem overflow horizontal. O aviso de cookies continua visível para utilizadores sem preferência; a monetização permanece separada do fluxo de upload/processamento.

## Recomendações priorizadas

### P0 — manter antes de novas funcionalidades

1. Manter a regressão ponta a ponta do Centro de Impressão e do Preflight como gate obrigatório. A corrida de estado encontrada prova que a presença de botões de download não garante que a mensagem de sucesso já foi atualizada.
2. Manter a matriz visual em 390px, 768px e 1440px em cada alteração de descoberta. A sidebar deve continuar oculta no mobile, compacta no tablet e completa no desktop.
3. Repetir testes reais com PDFs grandes em dispositivos com pouca memória antes de elevar limites ou introduzir novas operações que mantenham múltiplos canvases em memória.

### P1 — próxima melhoria de experiência

1. Consolidar as camadas CSS de busca em um único bloco responsivo. Atualmente existem regras sobrepostas em `editor-reference-2026.css`, `sidebar-hotfix.css` e `catalog-discovery-2026.css`; a consolidação reduzirá regressões de posição e de overflow.
2. Transformar o dropdown de busca num painel visualmente opaco e com altura previsível, para que a navegação subjacente não fique visualmente confundida quando há resultados.
3. Reduzir o bloqueio visual do aviso de cookies em ecrãs pequenos, mantendo as opções de consentimento e privacidade sem cobrir o primeiro cartão de ferramenta.
4. Adicionar testes automatizados de acessibilidade para foco visível, `aria-expanded`, `aria-controls`, `aria-activedescendant` e unicidade de IDs nos dois slots do buscador.
5. Medir o tempo de primeira interação das ferramentas mais pesadas, sobretudo editor, OCR e conversões, porque o orçamento atual cobre o carregamento mas não substitui a medição de interação após upload.

### P2 — evolução do produto gratuito

1. Criar presets reutilizáveis no Editor Studio, com undo/redo por operação e filmstrip virtualizado.
2. Implementar workflows compostos locais — por exemplo, OCR → limpeza → compressão → assinatura — sem duplicar ferramentas no catálogo.
3. Evoluir o OCR para exportação estruturada em TXT, Markdown, HTML e CSV/JSON, com revisão de confiança.
4. Melhorar o designer avançado de formulários com tab order, validação e deteção assistida, preservando o processamento local.

Estas recomendações não introduzem assinatura, paywall, bloqueio de download ou anúncios durante processamento. A prioridade é continuar a melhorar descoberta, clareza e previsibilidade da experiência gratuita.

## Achado funcional corrigido: mensagem final do Centro de Impressão

A reprodução do fluxo P0 revelou uma corrida de estado: o PDF era gerado, a fila local ficava `Concluído` e os botões de abrir/baixar apareciam, mas a mensagem ainda podia permanecer em `Arquivo pronto para configurar.` porque a inspeção assíncrona das miniaturas terminava depois da geração.

Foi adicionado um `outputReadyRef` em `PrintCenterWorkspace.tsx` para impedir que a conclusão da inspeção substitua a mensagem final. Após a correção, `test:e2e:p0` passou com `printCenter: true`, `localQueue: true` e `privacyInspector: true`.

## Achado de acessibilidade corrigido: IDs duplicados no buscador

Como o buscador é montado na sidebar e no cabeçalho responsivo, ambos os componentes estavam a emitir `id="header-tool-search"`, `id="global-search-results"` e IDs iguais nas opções. Isso podia quebrar a associação label/combobox/listbox e gerar resultados ambíguos quando Ctrl+K focava as duas instâncias.

O buscador do cabeçalho passou a usar `responsive-tool-search` e `responsive-tool-search-results`; os IDs das opções também passaram a incluir o prefixo da instância. A auditoria visual continua a passar com 22 capturas e o P0 passou novamente, incluindo Centro de Impressão e Preflight.

## Verificação pós-PR #25 — propagação pendente

Após abrir `https://limpdf.com.br/?release=2fe9598`, a medição DOM ainda encontrou `header-tool-search` em duas instâncias e `uniqueIds: false`, com a sidebar desktop em `272px` e o slot de cabeçalho oculto. Isso indica que a produção ainda está a servir o bundle anterior ao commit `2fe9598` ou que o deployment da main ainda não terminou; a validação final do fix de IDs deve ser repetida depois de o Vercel publicar o novo build.

## Deployment final da auditoria

A consulta ao Vercel confirmou o deployment de produção do commit `2fe95987f3cb6866e60eec45957ca7a94f2c4146` em estado `READY`, com destino `production` e URL de inspeção `https://vercel.com/anaquieljosemirandadelima-3691s-projects/lim-pdf/BxFpSuGsux41Lsb9LXkcYuUb1wLf`. A medição anterior com IDs antigos ocorreu antes de o novo bundle chegar ao domínio; deve ser repetida agora com cache-bust.

## Validação final de produção — PR #25

Após o deployment READY do commit `2fe9598`, `https://limpdf.com.br/?release=2fe9598-final` passou a emitir `responsive-tool-search` no slot do cabeçalho e `header-tool-search` na sidebar. A medição confirmou `uniqueIds: true`, `uniqueListboxes: true`, `sidebarDisplay: flex`, `sidebarWidth: 272px` e `headerSearchDisplay: none` no viewport desktop. O bundle final já contém a correção de acessibilidade; o fallback do cabeçalho permanece reservado para tablet/mobile.
