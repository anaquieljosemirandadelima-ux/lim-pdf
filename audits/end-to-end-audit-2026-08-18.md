# Auditoria ponta a ponta do LIM PDF — 18/08/2026

## Estado de execução

A branch `main` está no commit `a1723ce` (`fix: hide global search scrollbar (#23)`). O working tree contém apenas o relatório de evidência de produção não versionado. Rotas e scripts de QA existentes foram levantados.

## QA executado

`test:routes`, `test:e2e` (42 ferramentas principais) e `test:e2e:pro` (16 fluxos avançados) passaram. `test:e2e:p0` apresentou uma falha transitória na primeira execução por timing da mensagem final do Centro de Impressão, mas passou isoladamente na reprodução seguinte. OCR pesquisável, consentimento/telemetria e orçamento de performance no browser passaram.

## Primeiras conclusões visuais

A captura desktop mostra uma hierarquia de hero clara, cartões de ferramentas acessíveis e a busca global posicionada na sidebar sem scrollbar nativa visível. O dropdown, contudo, permanece visualmente sobreposto à navegação lateral quando aberto, reduzindo a legibilidade do menu abaixo; deve ser tratado como comportamento intencional de camada, mas pode beneficiar de um painel mais opaco e uma altura/posição mais previsível.

A captura mobile mostra que a sidebar de navegação permanece visualmente presente como uma coluna alta, apesar do fallback responsivo do buscador existir no DOM. O conteúdo principal fica parcialmente comprimido/encoberto no topo, e a composição perde contexto antes de começar os cartões de ferramentas. Esta é a prioridade visual mais alta encontrada até aqui: confirmar no CSS se a sidebar deve estar totalmente oculta em 390px e se o screenshot corresponde a um estado de teste anterior ou a uma regressão real.

## Correção responsiva implementada durante a auditoria

Foi aplicada uma melhoria de alto impacto em `catalog-discovery-2026.css`: em tablet (621–900px), a sidebar passou para 72px, com ícones e sem recomendação extensa; em mobile (até 620px), a sidebar é ocultada por completo e o conteúdo principal passa a ocupar 100% da viewport. A busca permanece no cabeçalho.

A nova auditoria visual passou com 22 capturas. A captura mobile pós-correção mostra o hero e os cartões ocupando a largura útil, sem a coluna lateral sobreposta. A captura tablet mostra uma rail de ícones estreita e o conteúdo principal sem o corte anterior. Foram adicionadas asserções para garantir `display:none` da sidebar em mobile, largura máxima de 90px no tablet e ocupação adequada do conteúdo principal.
