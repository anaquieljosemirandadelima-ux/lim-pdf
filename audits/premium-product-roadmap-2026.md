# LIM PDF — Plano final de evolução Premium (2026)

## Objetivo

Transformar o LIM PDF numa suíte Premium de PDF orientada a fluxos completos, processamento local, privacidade explícita e ferramentas profissionais verificáveis, sem duplicar os 58 recursos já catalogados.

## Estado consolidado

O produto já oferece editor Studio 2.0, Google Fonts incorporáveis, substituição visual segura, OCR com pré-processamento e lote, suporte a ficheiros até 500 MB, comparação de PDFs, preflight, processamento em lote, formulários, anotações nativas, PDF/A preparatório, assinatura digital, conversões profissionais e catálogo com favoritos e recentes.

A principal lacuna deixou de ser amplitude. O foco passa a ser **integração, profundidade, previsibilidade e clareza comercial**: fluxos compostos navegáveis, relatórios exportáveis, operações reversíveis quando possível, melhor feedback de progresso, acessibilidade, cobertura de testes e comunicação alinhada com o que está realmente disponível.

## Prioridades de implementação

| Prioridade | Entrega | Estado | Critério de aceite |
|---|---|---|---|
| P0 | Workflows locais no catálogo | Em implementação | Utilizador consegue abrir cada etapa sem criar nova ferramenta e recebe indicação de processamento local |
| P0 | Alinhamento da página Premium | Em implementação | Recursos já publicados aparecem como disponíveis; roadmap não promete recursos existentes como futuros |
| P0 | Relatórios profissionais | Próxima | Comparação, preflight, OCR e lote permitem rever ou descarregar um resumo legível |
| P1 | Formulários com gestão de campos | Próxima | Campos podem ser revistos, removidos e reordenados antes da exportação |
| P1 | Fila e memória para operações pesadas | Próxima | Operações de lote exibem progresso por ficheiro, limites e falhas individuais sem perder o lote |
| P1 | Editor Studio 2.0 | Publicado | Contador, páginas, fontes Google, redação e responsividade funcionam em produção |
| P1 | OCR e documentos digitalizados | Publicado / reforçar | Pré-processamento, lote ZIP, confiança e orientação para páginas sem texto ficam expostos com clareza |
| P1 | Acessibilidade e UX | Contínuo | Foco visível, labels, live regions, reduced motion e navegação por teclado cobrem fluxos principais |
| P2 | Conformidade e assinatura | Publicado / reforçar | Limites técnicos ficam explícitos; PDF/A não é apresentado como certificação ISO automática |
| P2 | Integrações de nuvem opcionais | Não iniciar por padrão | Só entram com consentimento explícito e sem comprometer o processamento local |
| P2 | Cobrança e planos | Não simular | Não apresentar checkout ou assinatura fictícia antes de existir infraestrutura de cobrança aprovada |

## Sequência desta execução

1. Expor workflows já definidos no catálogo público.
2. Atualizar a página Premium para diferenciar recursos disponíveis, em reforço e futuros.
3. Adicionar relatórios exportáveis onde os motores já devolvem dados estruturados.
4. Melhorar a gestão dos campos do criador de formulários.
5. Executar lint, TypeScript, testes unitários, build, performance e E2E.
6. Rever o diff, abrir PR, acompanhar CI/Vercel, fazer merge e verificar a rota pública.

## Regras de produto

- Não criar uma ferramenta quando a capacidade pode ser uma opção, preset, relatório ou etapa de um recurso existente.
- Priorizar processamento local e declarar qualquer dependência de servidor.
- Não declarar certificação, assinatura legal ou garantia normativa que o motor não comprova.
- Não recolher ficheiros, nomes de documentos ou chaves privadas para telemetria.
- Toda operação destrutiva deve gerar uma nova cópia para download e explicar as limitações.
- Toda função Premium deve ter um critério de aceite testável e uma mensagem de erro útil.
