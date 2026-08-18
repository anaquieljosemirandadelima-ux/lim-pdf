# LIM PDF — Roadmap executivo das próximas funcionalidades

**Data:** 18 de agosto de 2026  
**Produto:** [limpdf.com.br](https://limpdf.com.br)  
**Estado de referência:** catálogo canônico publicado com 62 ferramentas únicas em sete jornadas, todas gratuitas, com processamento local e suporte central a arquivos de até 500 MB.

## 1. Decisão executiva

A próxima fase do LIM PDF não deve começar por criar dezenas de novas URLs. O produto já tem amplitude suficiente; o maior ganho agora será transformar as ferramentas existentes em **fluxos completos, previsíveis e fáceis de concluir**. A prioridade deve ser uma combinação de Centro de Impressão, fila local universal, Privacy Inspector, evolução do editor e acessibilidade. Essas entregas atacam os pontos em que um utilizador abandona uma suíte PDF: não saber o que fazer depois do upload, perder o controlo durante um processamento pesado, descobrir tarde um problema de privacidade ou gerar um arquivo que não imprime como esperado.

> **Direção do produto:** uma suíte PDF em português, gratuita e local-first, que permite carregar, configurar, revisar, imprimir e baixar sem conta obrigatória, sem paywall, sem créditos e sem enviar o documento para um servidor.

O plano abaixo mantém a decisão de não duplicar ferramentas. Variantes de impressão entram no Centro de Impressão; melhorias de OCR entram no OCR existente; relatórios entram nos respectivos workspaces; e os novos fluxos devem ser adicionados ao índice canônico antes de qualquer alteração visual no catálogo.

## 2. Prioridades imediatas

| Prioridade | Entrega | Motivo | Resultado esperado |
|---|---|---|---|
| **P0** | Centro de Impressão local | Livreto, páginas por folha e redimensionamento já existem, mas ainda não formam uma experiência de saída completa | O utilizador consegue preparar, revisar e imprimir um PDF no computador |
| **P0** | Fila local universal | OCR, lote e documentos grandes precisam de estados claros e recuperação de erro | Processamentos de 500 MB ficam previsíveis, canceláveis e retomáveis |
| **P0** | Privacy Inspector e Preflight 2.0 | O diagnóstico atual já verifica estrutura, mas pode evoluir para uma decisão de entrega | O utilizador sabe se o arquivo está pronto para enviar, imprimir ou arquivar |
| **P0** | Viewer de comparação sincronizado | A comparação atual precisa sair do relatório textual e tornar diferenças visuais verificáveis | Revisão de versões fica mais rápida e confiável |
| **P0** | Acessibilidade e shell de tarefas | A navegação e os workspaces precisam funcionar melhor no teclado, em ecrãs menores e com baixa animação | Menos abandono e melhor qualidade percebida sem aumentar complexidade |
| **P1** | OCR estruturado | O OCR já produz PDF pesquisável, mas o texto reconhecido pode ser mais reutilizável | Exportação para TXT, Markdown, HTML, CSV e JSON com revisão de confiança |
| **P1** | Designer avançado de formulários | O preenchimento e a criação já existem, mas faltam validações e ordem de tabulação | Formulários locais mais profissionais e acessíveis |
| **P1** | Editor Studio 2.1 | A base de edição existe; agora é preciso robustez de revisão e documentos longos | Menos perda de trabalho e melhor controlo sobre páginas, links e histórico |
| **P1** | Pacote de evidência de assinatura | Assinatura digital e PAdES já estão presentes, mas o utilizador precisa de prova compreensível | Relatório local verificável sobre certificado, hash, cadeia e resultado |
| **P2** | Workflows compostos locais | O catálogo já apresenta sequências; falta permitir que o utilizador monte a sua própria sequência | Vários passos são concluídos sem saltar entre páginas |
| **P2** | Histórico e presets locais | Favoritos e recentes já ajudam na descoberta, mas não preservam configurações de forma estruturada | Repetição rápida sem conta e sem sincronizar documentos |

## 3. Fase P0 — primeiro ciclo de produto

### 3.1 Centro de Impressão local

O Centro de Impressão deve ser uma experiência integrada, não uma nova coleção de ferramentas duplicadas. Ele deve receber qualquer PDF e oferecer finalidades como impressão normal, livreto, páginas por folha, pôster e duplex manual. O fluxo recomendado é: selecionar arquivo, escolher finalidade, definir papel, configurar layout, escolher o modo de impressão, revisar o preview, executar o preflight e gerar a saída.

A primeira versão deve suportar A4, A3, Letter e tamanho personalizado; retrato e paisagem; margens e escala; centralização; páginas selecionadas; N-up de 1, 2, 4, 6, 9 e 16 páginas; livreto frente e verso; duplex pela borda longa ou curta; e modo simplex manual com separação clara entre frente e verso. O resultado deve poder ser baixado como PDF pronto, exportado em ZIP quando houver múltiplas saídas e enviado para a caixa de impressão do sistema.

O navegador pode abrir a caixa de impressão com `window.print()`, mas não pode escolher silenciosamente impressora, bandeja ou spooler. Por isso, a interface deve explicar essa fronteira e tratar o botão **Imprimir no PC** como abertura da pré-visualização do sistema, nunca como promessa de controlo direto da impressora [1].

**Critérios de aceite:** o preview deve mostrar folhas reais, frente e verso quando aplicável, ordem de páginas, área imprimível e orientação. O PDF exportado deve ser byte-validado, a saída deve respeitar o número de folhas calculado e a versão impressa deve esconder navegação, anúncios e elementos de edição através de estilos dedicados de impressão.

### 3.2 Fila local universal

A fila deve ser um componente compartilhado por OCR, lote, conversões pesadas, comparação e Centro de Impressão. Cada trabalho precisa de estado `queued`, `running`, `paused`, `success`, `failed` ou `cancelled`, além de nome local, tamanho, etapa atual, progresso, memória estimada e mensagem de erro compreensível.

A implementação deve usar `AbortController` para cancelamento, Workers para operações de CPU e concorrência adaptativa conforme a memória disponível. O retry deve reiniciar somente o item que falhou. O documento original nunca deve ser enviado à rede; os testes devem interceptar chamadas e falhar se um fluxo local tentar transmitir bytes do arquivo.

**Critérios de aceite:** o utilizador consegue pausar quando a operação permitir, cancelar sem travar a página, repetir um item falhado, remover um item e continuar os demais. Em arquivos próximos do limite de 500 MB, a aplicação avisa antes de iniciar, mostra uma estimativa de memória e mantém a interface responsiva ou informa claramente quando a capacidade do dispositivo é insuficiente.

### 3.3 Privacy Inspector e Preflight 2.0

O Preflight existente deve evoluir para um diagnóstico orientado a decisão. O resultado deve separar problemas em quatro níveis: informação, atenção, bloqueio recomendado e risco de privacidade. A análise deve incluir dimensões de página, páginas sem OCR, formulários editáveis, anotações, links externos, metadados, permissões, JavaScript embutido quando detectável, fontes, páginas vazias, rotação inconsistente e conteúdo fora da área imprimível.

O Privacy Inspector deve permitir remover metadados, achatar formulários, remover anotações e revisar links antes da exportação, sempre com confirmação explícita. A verificação de redação deve alertar quando texto aparentemente oculto continua selecionável ou pesquisável. Nenhum alerta deve afirmar que um documento é absolutamente seguro; o relatório deve explicar exatamente o que foi detectado e o que foi alterado.

**Critérios de aceite:** o relatório informa a página ou objeto afetado, oferece ação local quando possível, preserva o original e permite exportar um checklist em Markdown, HTML, JSON ou PDF. O fluxo deve incluir ações rápidas **Pronto para enviar**, **Pronto para imprimir** e **Pronto para arquivar**, sem transformar um aviso em bloqueio artificial.

### 3.4 Viewer de comparação sincronizado

A comparação deve apresentar dois documentos lado a lado com zoom, rolagem e navegação sincronizados. O utilizador deve poder alternar camadas de diferença de texto, geometria e imagem, visualizar apenas páginas alteradas e saltar diretamente para a próxima diferença.

O resultado precisa de um relatório exportável com resumo, páginas afetadas, contagem de diferenças e evidências por página. O relatório deve ter pelo menos os formatos HTML, Markdown, CSV e JSON, além de uma opção PDF para partilha.

**Critérios de aceite:** abrir dois arquivos não envia conteúdo à rede; a sincronização permanece estável em documentos longos; diferenças podem ser revistas sem perder a posição; e o relatório identifica claramente qual documento é a versão anterior e qual é a versão nova.

### 3.5 Acessibilidade, responsividade e shell de tarefas

Antes de adicionar efeitos visuais, o shell deve ser refinado. A busca global e a busca do catálogo devem ter rótulos diferentes; a sidebar deve poder colapsar sem perder contexto; o banner de cookies não pode cobrir filtros, botões ou campos; e cada workspace deve seguir a sequência visual **carregar → configurar → revisar → baixar/imprimir**.

A navegação deve ter foco visível, ordem de tabulação coerente, `aria-live` para progresso e erros, contraste suficiente, alvos de toque adequados e suporte a `prefers-reduced-motion`. As animações devem ser curtas, baseadas sobretudo em `transform` e `opacity`, e nunca impedir uma operação de teclado.

**Critérios de aceite:** cada fluxo P0 pode ser completado apenas com teclado; os estados de carregamento e erro são anunciados; a versão móvel mantém a ação principal visível; e a auditoria visual não identifica sobreposição de cookies, anúncios ou controles essenciais.

## 4. Fase P1 — profundidade funcional

| Frente | Melhorias propostas | Onde implementar |
|---|---|---|
| OCR | Exportar TXT, Markdown, HTML, CSV e JSON; mostrar confiança por palavra ou bloco; permitir revisão de baixa confiança; detectar tabelas; preservar ordem de leitura | `OcrWorkspace` e módulos locais de extração |
| Formulários | Validação de campo, obrigatório/opcional, padrões de e-mail e data, ordem de tabulação, auto-detecção, duplicação de campos e modelos locais | Workspace de criação de formulário |
| Editor | Snapshots nomeados, undo/redo por operação, filmstrip virtualizado, bookmarks em árvore, criação e auditoria de links, recuperação de sessão e aviso de alterações não exportadas | Studio 2.1 |
| Assinatura | Pacote de evidência com certificado, cadeia, algoritmo, hash, período de validade, resultado de validação e arquivo de relatório | Assinatura digital e PAdES |
| Redação | Verificação pós-exportação, teste de seleção e pesquisa, confirmação de objetos removidos, lista de termos redigidos e preservação do original | Editor e Segurança PDF |
| Conversão | Simulador de perda de layout, aviso sobre fontes e tabelas, pré-visualização de páginas problemáticas e relatório de conversão | Conversor unificado |

O OCR estruturado deve distinguir texto reconhecido de dados inferidos. Quando uma tabela não puder ser detectada com segurança, o resultado deve ser marcado como aproximação e permitir correção manual. No editor, cada snapshot deve guardar apenas o estado necessário para restaurar a sessão, com limite de memória adaptativo e opção de limpar o histórico.

## 5. Fase P2 — diferenciação local

A evolução P2 deve transformar as ferramentas isoladas em uma suíte com continuidade. O Composer de Workflows deve permitir escolher uma sequência de operações existentes, por exemplo **limpar → OCR → numerar → assinar** ou **juntar → organizar → preflight → imprimir**. A execução continua local e cada etapa precisa ter uma saída intermediária verificável.

Os presets pessoais devem ser salvos apenas no dispositivo: papel, margem, escala, idioma de OCR, qualidade, convenções de nome e ações pós-processamento. O histórico temporário deve guardar nomes técnicos e estados de execução, nunca o conteúdo do PDF por padrão. Se o utilizador optar por persistir um documento, a interface deve explicar onde ele será guardado e fornecer limpeza imediata.

Uma instalação PWA ou suporte offline parcial pode ser avaliada depois que os Workers, a fila e o armazenamento local estiverem estáveis. O objetivo não é empacotar todo o catálogo de uma vez, mas permitir que as operações mais procuradas funcionem sem rede quando os recursos necessários já estiverem disponíveis no navegador.

## 6. Arquitetura técnica recomendada

| Camada | Direção |
|---|---|
| Catálogo | Manter `catalogGroups` e `catalogToolBySlug` como fonte única; toda ferramenta nova entra primeiro no teste de duplicação e cobertura |
| PDF | Reutilizar `pdf-lib`, `pdfjs-dist` e `@pdf-lib/fontkit`; criar módulos puros para imposição, N-up, pôster, preflight, relatórios e evidência |
| Execução | Separar UI de domínio; mover OCR, renderização e operações pesadas para Workers; padronizar cancelamento com `AbortController` |
| Arquivos | Usar File API como base; avaliar OPFS ou File System Access API como otimização opcional, sempre com fallback e explicação de permissões |
| Estado | Isolar documento, fila, histórico e snapshots por workspace; não partilhar bytes de arquivo entre sessões por padrão |
| Relatórios | Definir um modelo comum e exportadores para Markdown, HTML, CSV, JSON e PDF |
| Impressão | Criar uma superfície própria com `@media print`, preview de folha e chamada explícita a `window.print()` |
| Qualidade | Cobrir módulos puros com testes unitários; adicionar fixtures de PDFs grandes, escaneados, com formulários, links, fontes e diferenças visuais |
| Privacidade | Interceptar rede em E2E; garantir que fontes externas e métricas não recebem bytes, nomes ou conteúdo dos documentos |

## 7. Roadmap de execução

| Período relativo | Entregas | Saída de decisão |
|---|---|---|
| **Semana 1** | Especificação de estados da fila, contratos de domínio, revisão do shell, mapa de anúncios, métricas de base e fixtures | Interfaces e contratos aprovados antes de alterar workspaces |
| **Semanas 2–3** | Centro de Impressão: papel, layout, N-up, livreto, duplex/manual, preview e exportação | Primeiro fluxo de impressão completo em desktop e mobile |
| **Semana 4** | Preflight de impressão, `window.print()`, impressão CSS, checklist e testes de saída | P0 de impressão pronto para validação pública |
| **Semanas 5–6** | Fila universal, Workers, cancelamento, retry, memória estimada e progressão | OCR e lote com comportamento consistente |
| **Semanas 7–8** | Privacy Inspector, redação segura e viewer de comparação sincronizado | Entrega P0 completa e auditável |
| **Semanas 9–12** | OCR estruturado, formulários avançados e Editor Studio 2.1 | Primeira tranche P1 com mais profundidade profissional |
| **Semanas 13–16** | Evidência de assinatura, workflows compostos, presets e histórico local | Diferenciação da suíte sem criar paywall |

Cada fase deve sair em uma branch própria, passar por `npm run check`, smoke de rotas, E2E principal, E2E profissional, OCR, auditoria visual e teste de performance. A publicação deve ocorrer somente depois de verificar a rota pública e o comportamento em uma janela sem estado local anterior.

## 8. Métricas de sucesso

| Métrica | Objetivo inicial |
|---|---|
| Conclusão de tarefas | Aumentar a proporção de sessões que chegam a download ou impressão sem erro |
| Tempo até primeira ação | Reduzir o tempo entre abrir uma ferramenta e iniciar uma configuração válida |
| Falhas em arquivos grandes | Diminuir travamentos e erros não recuperáveis em arquivos próximos de 500 MB |
| Fila | 100% dos itens devem terminar em sucesso, falha explicada ou cancelamento explícito; nunca ficar silenciosamente pendente |
| Privacidade | Zero envio de bytes de PDF nos fluxos declarados como locais |
| Impressão | Reduzir diferenças entre preview e PDF final por meio de fixtures de A4, Letter, livreto e duplex manual |
| Acessibilidade | Completar os fluxos P0 por teclado e sem movimento não essencial |
| Monetização | Nenhum anúncio sobre upload, processamento, resultado, download, impressão ou navegação essencial |
| SEO editorial | Crescer páginas úteis de guias e comparações sem transformar a área de trabalho em uma página publicitária |

## 9. O que não fazer agora

Não criar uma URL separada para cada variante de impressão, OCR ou relatório. Não adicionar conta obrigatória, créditos, limites artificiais ou bloqueio de download. Não introduzir IA que envie documentos para uma API sem consentimento explícito, sem uma política de privacidade específica e sem uma alternativa local. Não colocar anúncios em torno de botões de upload, processamento, download, impressão ou navegação.

Também não é prioritário criar um aplicativo desktop antes de estabilizar a experiência local no navegador. A versão web deve provar a fila, a impressão, a privacidade e a recuperação de erros; somente depois vale avaliar um empacotamento opcional para cenários que exigem integração mais profunda com impressoras ou sistema de arquivos.

## 10. Recomendação final

A execução deve começar pelo **Centro de Impressão local**, mas com a especificação da **fila universal** e do **modelo de preflight** preparada em paralelo. Essa combinação produz o maior ganho percebido: o utilizador não apenas manipula um PDF, mas consegue chegar a uma saída pronta, revisar riscos e imprimir com previsibilidade. Em seguida, a comparação sincronizada, o OCR estruturado e o Editor Studio 2.1 aprofundam a proposta sem fragmentar o catálogo.

O roadmap deve ser tratado como uma sequência de incrementos publicáveis. Cada entrega precisa melhorar uma jornada existente, preservar o processamento local, manter as sete categorias canônicas e demonstrar com testes que a experiência gratuita continua completa.

## Referências

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Window/print "MDN — Window: print() method"

[2]: https://support.google.com/adsense/answer/48182?hl=pt-BR "Google AdSense — Políticas do programa AdSense"

[3]: https://limpdf.com.br/ferramentas "LIM PDF — Todas as ferramentas"
