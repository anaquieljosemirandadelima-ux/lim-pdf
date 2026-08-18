# Plano-mestre de evolução do LIM PDF

**Versão:** 1.0  
**Produto:** LIM PDF — limpdf.com.br  
**Objetivo:** organizar o catálogo existente e evoluir o produto para uma suíte Premium de processamento, edição, segurança e produtividade em PDF.

> **Princípio central:** o LIM PDF deve vender produtividade, previsibilidade, automação, conformidade e privacidade — não apenas um limite maior de upload.

## 1. Estado atual e ponto de partida

A primeira tranche Premium já foi implementada e publicada na `main`, com deployment READY na Vercel. Ela inclui o limite central de **500 MB**, avisos adaptativos de memória, colagem de PDF pelo clipboard, refinamentos de botões e microinterações, textos multilíngues de capacidade, testes de contrato e estabilização do E2E de senha.

O processamento continua prioritariamente **local no navegador**. Isso é uma vantagem competitiva importante, mas também impõe uma regra técnica: aceitar um arquivo de 500 MB não significa que todas as operações terão desempenho idêntico em todos os dispositivos. Operações que precisam reconstruir, renderizar ou duplicar o documento podem exigir muito mais memória do que o tamanho do arquivo original. O produto deve comunicar essa diferença claramente e escolher estratégias seguras por operação.

### 1.1. Inventário do catálogo atual

O catálogo base possui 32 ferramentas públicas e o catálogo avançado registra 9 ferramentas adicionais. O catálogo Pro possui 18 capacidades profissionais, enquanto a matriz E2E atual cobre 16 fluxos profissionais. A organização abaixo não substitui o registry existente; ela é a proposta de agrupamento comercial e de navegação.

| Grupo atual | Ferramentas existentes |
|---|---|
| **Organizar páginas** | Juntar PDF, Dividir PDF, Extrair páginas, Excluir páginas, Organizar páginas, Girar PDF, Duplicar páginas, Inserir página em branco, Alternar dois PDFs, Sobrepor PDFs, Criar livreto PDF, Páginas por folha, Espelhar PDF. |
| **Editar e compor** | Editar PDF, Numerar páginas, Marca-d’água em PDF, Adicionar texto, Adicionar imagem, Assinar PDF, Recortar PDF, Redimensionar PDF, Cabeçalho e rodapé, Adicionar fundo ao PDF, Marcar como confidencial, Destacar texto, Anotações PDF nativas, Links no PDF. |
| **Converter a partir do PDF** | PDF para JPG, PDF para PNG, Extrair texto PDF, PDF para Word, PDF para Excel, PDF para PowerPoint, Extrair imagens do PDF. |
| **Converter para PDF** | Imagens para PDF, Word para PDF, Excel para PDF, PowerPoint para PDF. |
| **Otimizar e proteger** | Compactar PDF, PDF em escala de cinza, Remover metadados, Proteger PDF, Desbloquear PDF, Permissões PDF, Reparar PDF, Preparar PDF/A, Limpar digitalização, Otimizar PDF avançado. |
| **Formulários** | Preencher formulário PDF, Achatar formulário PDF, Criar formulário PDF. |
| **Navegação documental** | Marcadores PDF, Numeração Bates. |
| **Fluxos Pro já registrados** | OCR PDF, Assinatura digital PDF, Links PDF, Criar formulário PDF, Bookmarks PDF, Comparar PDFs, Reparar PDF, PDF/A, PDF para PowerPoint, PowerPoint para PDF, Extrair imagens PDF, Limpar documento digitalizado, Otimizar PDF avançado, Anotações PDF, Processamento em lote PDF, Numeração Bates, Editar metadados PDF. |

Há sobreposição intencional entre algumas ferramentas públicas, avançadas e Pro. Essa sobreposição deve ser resolvida por **experiência e nível de profundidade**, não necessariamente pela remoção de rotas. Por exemplo, “Assinar PDF” pode continuar como assinatura visual gratuita, enquanto “Assinatura digital PDF” fica como assinatura criptográfica Premium/Profissional.

### 1.2. Problemas de organização que devem ser resolvidos

O catálogo atual é rico, mas o usuário pode não entender imediatamente qual ferramenta escolher. Algumas funções aparecem em categorias amplas demais, como “Otimizar e proteger”, enquanto recursos de conformidade, privacidade, formulários e produtividade merecem agrupamentos próprios. Também é necessário separar visualmente “ferramenta simples”, “ferramenta avançada” e “fluxo profissional”, mantendo cada URL indexável e com uma explicação editorial própria.

A primeira etapa do plano não é criar mais dezenas de páginas isoladas. É construir um **registro único de capacidades**, no qual cada ferramenta informa categoria, nível, modo de processamento, suporte a lote, limite recomendado, entrada e saída, risco de memória, dependências e disponibilidade por plano.

## 2. Arquitetura de planos e proposta comercial

A separação dos planos deve ser compreensível para o usuário e tecnicamente verificável. Nenhuma tela deve exibir um selo “Premium” para uma função que ainda não possui controle real de acesso ou que seja apenas um placeholder.

### 2.1. Planos propostos

| Plano | Público | Conteúdo recomendado |
|---|---|---|
| **Gratuito** | Uso ocasional e descoberta | Ferramentas essenciais locais, operações básicas de organização, conversões simples, preenchimento básico, processamento sem conta e anúncios condicionados ao consentimento. |
| **Premium Individual** | Usuários frequentes | Sem anúncios, suporte de 500 MB, clipboard, histórico local, presets, fila de operações, processamento em lote, OCR avançado, comparação, redação permanente, exportações avançadas e suporte prioritário. |
| **Premium Profissional** | Escritórios, contabilidade, jurídico e autônomos | Tudo do Individual, mais PDF/A, Bates, relatórios de segurança, assinatura digital, validação de assinaturas, formulários avançados, links, bookmarks, anotações nativas e conversões profissionais. |
| **Equipe** | Pequenas empresas | Tudo do Profissional, presets compartilhados, permissões, espaços de trabalho, relatórios de uso, auditoria e faturamento por equipe. |
| **Enterprise** | Organizações com compliance | SSO, políticas de retenção, implantação privada, integração, logs de auditoria, suporte dedicado, SLA e opções de processamento controlado. |

### 2.2. Regras de produto

O **Gratuito** deve continuar útil. Bloquear tudo o que é relevante gera frustração e reduz confiança. O Premium deve remover fricção e adicionar profundidade: lote, comparação, automação, conformidade, histórico, presets, maior controle, ausência de anúncios e suporte.

Recursos que exigem servidor — tradução, colaboração, armazenamento, assinatura com múltiplos signatários ou cobrança — devem ser declarados como **serviços opcionais em nuvem**. Eles não podem ser apresentados como processamento local nem compartilhar arquivos sem consentimento explícito.

A implementação de cobrança deve acontecer apenas depois de definir entitlements, autenticação, política de cancelamento, faturamento, suporte e retenção. Não criar uma tela de preço que apenas simula assinatura.

## 3. Fase 1 — Registro único e organização das ferramentas

### 3.1. Criar o registry de produto

A estrutura atual de `tools.ts`, `all-tools.ts` e `pro-tools.ts` deve evoluir para um registry comum, mantendo compatibilidade com as rotas existentes. Cada entrada deve ter, no mínimo:

| Campo | Finalidade |
|---|---|
| `slug` | URL estável e compatível com SEO. |
| `name` e `shortDescription` | Exibição em cards, busca e breadcrumbs. |
| `category` e `subCategory` | Organização na navegação. |
| `tier` | `free`, `premium`, `professional` ou `enterprise`. |
| `processingMode` | `local`, `optional-cloud` ou `cloud-required`. |
| `inputTypes` e `outputTypes` | Aceitação e resultado esperado. |
| `supportsBatch` | Indica fila e processamento múltiplo. |
| `maxBytes` e `recommendedBytes` | Limite absoluto e limite confortável por operação. |
| `memoryProfile` | `low`, `medium`, `high` ou `very-high`. |
| `privacyLevel` | Explica se bytes deixam o navegador. |
| `availability` | Implementado, beta, planejado ou indisponível. |
| `relatedTools` | Ligações para a jornada seguinte. |
| `faq`, `useCases`, `limitations` | Conteúdo editorial e suporte ao usuário. |
| `telemetryKey` | Medição opcional e não invasiva, sempre subordinada ao consentimento. |

### 3.2. Classificar as ferramentas atuais

A classificação inicial sugerida é:

| Classe | Ferramentas |
|---|---|
| **Free Essential** | Juntar, dividir, extrair páginas, excluir páginas, organizar páginas, girar, comprimir, imagens para PDF, PDF para JPG/PNG, extrair texto, preencher formulário e conversões simples. |
| **Free com limite de profundidade** | Editar PDF, adicionar texto/imagem, marca-d’água, cabeçalho/rodapé, recortar, redimensionar e assinar visualmente. A versão básica permanece acessível; recursos avançados entram no Premium. |
| **Premium Local** | OCR em lote, comparação, redação permanente, anotações nativas, links, bookmarks, processamento em lote, histórico, presets, PDF/A pré-validado, limpeza avançada, inspeção de segurança e extração estruturada. |
| **Professional Local** | Assinatura digital PAdES, validação de assinatura, Bates, formulários avançados, PDF para Excel profissional, Office avançado, relatórios de conformidade e operações de alta complexidade. |
| **Cloud Optional** | Tradução de PDF, armazenamento, colaboração, fluxo de assinatura com múltiplos usuários, SSO, APIs, processamento remoto e classificação por modelos de IA. |

Essa divisão deve ser validada por telemetria consentida e entrevistas com usuários antes de bloquear funções que atualmente são gratuitas.

## 4. Fase 2 — Reestruturar a arquitetura de informação

### 4.1. Navegação recomendada

A página `/ferramentas` deve usar uma navegação por intenção, não apenas por implementação técnica:

1. **Organizar páginas** — juntar, dividir, extrair, reordenar, girar, duplicar, intercalar e criar livreto.
2. **Editar e revisar** — editor, texto, imagens, anotações, marca-d’água, marca confidencial, links e comparação.
3. **Converter** — PDF para imagens, texto, Word, Excel, PowerPoint e conversões para PDF.
4. **Otimizar e reduzir** — compressão, escala de cinza, limpeza, reparo, redimensionamento e PDF/A.
5. **Proteger e assinar** — senha, permissões, desbloqueio, metadados, assinatura visual e assinatura digital.
6. **Formulários e dados** — preencher, criar, achatar, extrair campos e exportar tabelas.
7. **Automação Pro** — lote, presets, renomeação, classificação, Bates, relatórios e histórico.

### 4.2. Componentes de navegação

Implementar uma busca global com tolerância a termos como “unir”, “mesclar”, “tirar páginas” e “converter para Word”. Cada card deve mostrar um selo claro de nível, indicação de processamento local, formatos aceitos, limite recomendado e tempo relativo sem prometer duração exata.

Adicionar páginas de coleção, como `/ferramentas/organizar-pdf`, `/ferramentas/seguranca-pdf` e `/ferramentas/converter-pdf`, sem remover os slugs atuais. Essas páginas devem ter introdução editorial, tabela de escolha, links internos e uma ferramenta principal destacada.

### 4.3. Fluxos guiados

Criar assistentes de intenção:

| Intenção do usuário | Jornada guiada |
|---|---|
| “Preciso reduzir o arquivo” | Compactar → comparar tamanho/qualidade → escala de cinza opcional → download. |
| “Preciso enviar um documento seguro” | Remover metadados → inspeção de segurança → proteger com senha → relatório. |
| “Preciso revisar duas versões” | Comparar → destacar mudanças → anotações → exportar relatório. |
| “Tenho muitos PDFs” | Selecionar operação → carregar lote → fila → amostra → ZIP final. |
| “Tenho um PDF escaneado” | Limpar digitalização → OCR → revisar texto → exportar Word/Excel ou PDF pesquisável. |
| “Preciso arquivar” | Metadados → formulário achatado → PDF/A pré-validação → relatório de conformidade. |

## 5. Fase 3 — Fundação técnica Premium e capacidade de 500 MB

A primeira tranche já elevou o limite para 500 MB. A evolução seguinte deve transformar esse limite em uma política de capacidade por operação, sem fingir que o browser oferece memória ilimitada.

### 5.1. Compatibilidade por tamanho

| Faixa | Comportamento |
|---|---|
| Até 20 MB | Fluxo normal, pré-visualização imediata e operações comuns. |
| 20–100 MB | Aviso informativo; usar processamento sequencial quando possível. |
| 100–250 MB | Aviso de memória e recomendação de fechar abas; reduzir renderização simultânea. |
| 250–500 MB | Modo cauteloso, sem pré-renderização de todas as páginas, progresso detalhado, cancelamento e indicação de operações compatíveis. |
| Acima de 500 MB | Bloquear com mensagem clara e alternativa de dividir o arquivo antes. |

### 5.2. Medidas técnicas

1. Centralizar limites, faixas, mensagens e `memoryProfile` no validador comum.
2. Evitar `arrayBuffer()` duplicado e cópias desnecessárias; liberar `ArrayBuffer`, canvas e object URLs depois do uso.
3. Mover renderização pesada e OCR para Web Workers quando a biblioteca permitir.
4. Renderizar apenas páginas visíveis ou solicitadas, em vez de criar miniaturas de todo o documento.
5. Processar lotes sequencialmente com fila, cancelamento, retry e limpeza garantida.
6. Exibir progresso por etapa: leitura, análise, renderização, escrita, compactação e download.
7. Criar uma matriz de compatibilidade por ferramenta; 500 MB é teto de entrada, não promessa de que toda operação será confortável nessa faixa.
8. Usar IndexedDB apenas para sessão local opcional, com limite, limpeza e consentimento; nunca gravar bytes sensíveis silenciosamente.
9. Manter fallback seguro: se uma operação exceder a capacidade estimada, sugerir dividir, reduzir resolução ou executar uma etapa por vez.
10. Testar arquivos sintéticos e reais representativos de 20, 100, 250 e 500 MB em Chrome, Edge, Firefox e Safari quando possível.

### 5.3. Contrato de saída

Todo workspace deve informar se o resultado preserva texto, vetores, formulários, assinaturas, metadados, links e bookmarks. A tela de sucesso deve comparar tamanho de entrada e saída, oferecer nome editável, permitir repetir a operação e revogar object URLs depois do download.

## 6. Fase 4 — Produtividade, lote e automação local

### 6.1. Fila de processamento

Criar uma fila visual compartilhada para todas as operações Premium: pendente, lendo, processando, concluído, falhou, cancelado e aguardando ação. Cada item precisa apresentar nome, tamanho, etapa atual, progresso, tempo decorrido e ação disponível.

### 6.2. Presets

Permitir salvar presets locais como “Contrato para envio”, “Scan para arquivo”, “PDF leve para WhatsApp” e “Lote confidencial”. O preset deve armazenar apenas configurações, nunca os bytes dos arquivos. O usuário deve poder renomear, duplicar, exportar e apagar presets.

### 6.3. Histórico local

Criar histórico local com data, ferramenta, quantidade de arquivos, tamanho original, tamanho final e status. O histórico não deve permitir recuperar o arquivo automaticamente sem uma ação explícita; deve registrar configurações e resultados, não conteúdo sensível.

### 6.4. Renomeação e ZIP

Adicionar padrão de nome com variáveis como `{nome}`, `{data}`, `{pagina}`, `{operacao}` e `{sequencia}`. No lote, gerar ZIP com relatório `processamento.csv` ou `processamento.json`, sem incluir dados que o usuário não escolheu exportar.

### 6.5. Clipboard e entrada rápida

A ação “Colar PDF” já foi publicada. Evoluir para suporte a múltiplos itens colados quando o navegador fornecer arquivos, feedback de permissão, atalhos documentados e fallback para seleção manual. Adicionar suporte a soltar arquivos em qualquer zona de upload e, quando seguro, colar imagens para o fluxo Imagens para PDF.

## 7. Fase 5 — Edição, comparação, redação e revisão

### 7.1. Editor Premium

Evoluir o editor endurecido atual com seleção múltipla, alinhamento, guias, grade opcional, duplicação de objetos, copiar/colar dentro do documento, painel de camadas, histórico de desfazer/refazer, atalhos, zoom preciso e painel de propriedades.

A edição deve continuar informando que a substituição visual cobre o conteúdo original. Não declarar edição semântica perfeita quando o PDF tiver fontes ou estruturas complexas.

### 7.2. Comparar PDFs

Entregar comparação lado a lado e sobreposta, navegação sincronizada, diferenças de texto, diferenças visuais, páginas adicionadas/removidas, exportação de relatório e opção de ignorar metadados. O resultado deve permitir revisar cada diferença sem afirmar que uma decisão jurídica foi tomada automaticamente.

### 7.3. Redação permanente

Criar fluxo em duas etapas: localizar e revisar; aplicar e confirmar. Detectar padrões configuráveis para CPF, CNPJ, e-mail, telefone, datas, números de contrato e termos personalizados. Depois de aplicar a tarja, remover o texto selecionável correspondente e oferecer inspeção para confirmar que a informação não permanece em camada oculta.

A interface deve alertar que uma tarja apenas desenhada não é redação segura. O recurso Premium deve ter relatório das páginas e regiões afetadas.

### 7.4. Anotações e revisão

Expandir anotações nativas para comentário, destaque, sublinhado, tachado, nota e autor local. Oferecer filtro por tipo, lista de anotações, exportação de comentários e achatamento opcional.

## 8. Fase 6 — OCR, conversões, extração e conformidade

### 8.1. OCR profissional

Adicionar OCR em lote com idiomas selecionáveis, detecção automática opcional, deskew, limpeza, contraste, remoção de páginas em branco, camada pesquisável, progresso por página e exportação para PDF pesquisável, TXT, Markdown e DOCX quando aplicável.

O usuário deve ver a diferença entre “OCR local” e qualquer futuro OCR em nuvem. O processamento local deve indicar idiomas e qualidade esperada sem garantir precisão absoluta.

### 8.2. PDF para Word e Excel

A conversão para Word deve ter modo visual e modo estruturado. A conversão para Excel deve detectar tabelas, permitir revisão de colunas, mostrar prévia e exportar uma aba por página ou uma planilha consolidada.

Adicionar correção manual de cabeçalhos, agrupamento de linhas e tipos de dados. Marcar claramente quando o PDF é escaneado e exige OCR antes da conversão.

### 8.3. PowerPoint, imagens e texto

Manter o modo visual de PDF para PowerPoint e oferecer modo estruturado apenas quando houver suporte real. Adicionar exportação de imagens por página e extração de imagens incorporadas como funções distintas. Para texto, oferecer TXT, Markdown, CSV e JSON com metadados de página quando esses dados existirem.

### 8.4. PDF/A e relatório de conformidade

O recurso PDF/A deve preparar e pré-validar, mas não declarar certificação normativa sem validador dedicado. Criar checklist de fontes, perfis de cor, XMP, formulários, JavaScript, anexos e transparência. Exportar relatório técnico e indicar o que ainda precisa de validação externa.

## 9. Fase 7 — Segurança, assinatura e recursos profissionais

### 9.1. Segurança documental

Criar um painel de segurança com criptografia, permissões, metadados, anexos, scripts, formulários, links externos, objetos ocultos e assinatura. Adicionar “modo privacidade máxima”, que desativa histórico local, cache temporário e telemetria opcional para aquela sessão.

### 9.2. Assinatura

Manter a assinatura visual como recurso simples. Evoluir a assinatura digital para PAdES com certificado, validação de integridade, cadeia de confiança, data, perfil e relatório. Recursos A3, token, cartão, TSA, LTV e revogação devem ser tratados como integrações específicas e não prometidos antes de serem implementados.

### 9.3. Formulários

Evoluir o criador de formulários para posicionamento visual, redimensionamento, alinhamento, duplicação, propriedades, ordem de tabulação e campos de assinatura. Adicionar extração de campos, validação e preenchimento em lote apenas quando o contrato do PDF permitir.

### 9.4. Bookmarks, links e Bates

Adicionar editor visual de bookmarks com hierarquia, arrastar e soltar, destinos e importação de títulos. Para links, permitir criação por região, destino interno, URL, validação e remoção em lote. Para Bates, configurar prefixo, início, dígitos, posição, formato e relatório.

## 10. Fase 8 — Recursos opcionais em nuvem e colaboração

Esta fase deve ocorrer depois da fundação local. Ela muda o modelo de privacidade e exige comunicação específica.

| Recurso em nuvem | Dependências obrigatórias |
|---|---|
| Conta e sincronização | Autenticação, recuperação, sessões, consentimento, exclusão e política de retenção. |
| Armazenamento | Criptografia, isolamento por usuário, expiração, quotas, download e exclusão verificável. |
| Assinatura com vários signatários | Identidade, convite, ordem, auditoria, carimbo de tempo e requisitos jurídicos. |
| Colaboração | Permissões, comentários, versões, conflito e trilha de auditoria. |
| Tradução de PDF | Serviço de tradução, tratamento de dados, limites, revisão humana e transparência. |
| API e integrações | Chaves, quotas, logs, documentação, versionamento e proteção contra abuso. |
| Equipes e SSO | Organização, papéis, SCIM/SSO quando aplicável, faturamento e suporte. |

Não enviar arquivos para uma API externa apenas para implementar uma função que pode ser local. Para cada recurso em nuvem, mostrar o destino dos dados, finalidade, tempo de retenção, região quando disponível e ação para apagar.

## 11. Fase 9 — Sistema visual e experiência Premium

### 11.1. Botões

Padronizar variantes `primary`, `secondary`, `ghost`, `danger`, `success`, `premium` e `loading`. Cada botão deve ter altura, raio, contraste, foco, estado desabilitado e ícone consistentes. A ação principal deve ter uma única hierarquia por tela. Evitar cinco botões competindo pela mesma atenção.

### 11.2. Estados

Todo workspace deve possuir estados vazios, arquivo selecionado, validação, processamento, sucesso, erro recuperável, erro fatal, cancelamento e limite de memória. O usuário deve saber o que aconteceu, o que pode fazer agora e se o arquivo original foi preservado.

### 11.3. Animação

Manter transições curtas, baseadas em `transform` e `opacity`, com entradas suaves de 180–280 ms, feedback de clique e shimmer somente em carregamentos reais. Não animar layout de forma que cause deslocamento inesperado. Respeitar `prefers-reduced-motion` e oferecer interface funcional sem animação.

### 11.4. Experiência Premium

Adicionar painel de ações rápidas, command palette, atalhos, modo foco, tela cheia, indicação de privacidade, progresso por etapa, preview antes/depois, comparação de tamanho, botão de repetir operação e download com nome configurável.

### 11.5. Mobile

No telemóvel, priorizar upload, escolha de operação, progresso e download. Menus avançados devem abrir em drawer acessível, sem esconder a ação principal. Testar documentos grandes em dispositivos com memória limitada e impedir que prévias excessivas congelem a interface.

## 12. Fase 10 — Monetização, SEO, AdSense e confiança

A página de preços deve explicar limites, privacidade, recursos e cancelamento sem afirmações vagas. O plano Premium deve ter uma comparação real com o gratuito, exemplos concretos e indicação de quais recursos permanecem locais.

Manter anúncios somente em áreas gratuitas e após consentimento. Não colocar anúncios sobre controles de upload, download, processamento ou mensagens de erro. O Premium pode ser “sem anúncios” apenas quando houver implementação real de entitlement.

Cada nova ferramenta deve ter página indexável com descrição original, casos de uso, limitações, FAQ, ferramenta relacionada e indicação de processamento. Criar conteúdo editorial para jornadas como “como comparar contratos”, “como redigir dados pessoais” e “como preparar PDF/A”, sem produzir páginas quase idênticas apenas para SEO.

Atualizar sitemap, breadcrumbs, canonical, Open Graph, schema de SoftwareApplication/HowTo/FAQ quando aplicável e links entre ferramentas. Manter Sobre, Contacto, privacidade, termos e política de anúncios acessíveis.

## 13. Fase 11 — Testes e critérios de aceitação

### 13.1. Testes funcionais

Cada ferramenta deve ter teste positivo, teste negativo, arquivo inválido, arquivo protegido quando aplicável, cancelamento, saída baixável e preservação do original. Os testes devem cobrir níveis Free, Premium e Professional sem depender apenas de texto visual.

### 13.2. Matriz de capacidade

| Cenário | Critério |
|---|---|
| PDF pequeno | Processa normalmente e oferece preview. |
| PDF de 20–100 MB | Exibe orientação sem bloquear operações compatíveis. |
| PDF de 100–250 MB | Exibe aviso de memória, progresso e cancelamento. |
| PDF de 250–500 MB | Usa modo cauteloso e evita pré-renderização completa. |
| PDF acima de 500 MB | Bloqueia antes do processamento com instrução para dividir. |
| Dispositivo com pouca memória | Reduz concorrência e informa alternativa. |
| `prefers-reduced-motion` | Remove motion não essencial. |
| Clipboard sem permissão | Mostra fallback para selecionar arquivo. |
| PDF sensível | Não envia bytes e limpa temporários ao concluir. |

### 13.3. Gates de qualidade

Executar TypeScript, lint, testes unitários, testes PDF, matriz de ferramentas, E2E público, E2E Pro, OCR, telemetria, auditoria visual, performance de build, performance no navegador, smoke de rotas e verificação manual em Chrome, Firefox, Edge e Safari quando possível.

### 13.4. Observabilidade sem violar privacidade

Medir somente eventos consentidos e não enviar nomes, conteúdo, hash de documentos ou texto extraído. Eventos úteis incluem ferramenta aberta, operação concluída/falhou, faixa de tamanho, duração aproximada e motivo genérico de erro. O usuário deve poder revogar o consentimento.

## 14. Roadmap de execução por tranches

| Tranche | Entregas | Resultado esperado |
|---|---|---|
| **T0 — já publicada** | 500 MB, avisos adaptativos, clipboard, botões refinados, animações, testes e acessibilidade. | Base Premium mais robusta em produção. |
| **T1 — organização** | Registry único, níveis, badges, novas categorias, busca por intenção, páginas de coleção e mapa de relações. | Usuário encontra a ferramenta certa mais rapidamente. |
| **T2 — produtividade local** | Fila, lote, presets, histórico local, renomeação, ZIP com relatório, repetição de operação e atalhos. | Redução real de trabalho repetitivo. |
| **T3 — revisão profissional** | Comparar PDFs, redação permanente, anotações nativas, editor melhorado e inspeção de conteúdo oculto. | Diferenciação forte para contratos e documentos sensíveis. |
| **T4 — documentos empresariais** | OCR em lote, PDF para Excel, PDF/A, Bates, formulários avançados, relatórios e assinatura digital. | Produto útil para escritórios, contabilidade e compliance. |
| **T5 — conversões avançadas** | Word/Excel/PowerPoint estruturados, extração JSON/CSV/Markdown, limpeza de scans e presets de qualidade. | Aumenta o valor por operação e o público profissional. |
| **T6 — comercial** | Entitlements reais, preço, conta opcional, pagamento, Premium sem anúncios e suporte prioritário. | Monetização sustentável sem bloquear a utilidade gratuita. |
| **T7 — nuvem e equipes** | Armazenamento, colaboração, assinatura multiusuário, SSO, API e Enterprise. | Produto SaaS corporativo, somente se houver demanda validada. |

## 15. Dependências e ordem correta

A ordem obrigatória é: registry e arquitetura de informação; entitlements e limites; fila e histórico; comparação e redação; OCR e conversões; segurança e conformidade; cobrança; nuvem e colaboração. Não iniciar assinatura corporativa, armazenamento ou SSO antes de ter políticas de segurança, retenção, auditoria e suporte.

Também não transformar todas as ferramentas em Premium simultaneamente. Primeiro medir quais operações são usadas, quais falham, quais têm maior valor percebido e quais podem ser executadas localmente com estabilidade.

## 16. Definição de pronto do produto Premium

O LIM PDF será considerado pronto para a próxima grande promoção quando:

1. Todas as ferramentas tiverem classificação de plano, modo de processamento, limite recomendado e página editorial.
2. O usuário encontrar uma ferramenta por intenção em poucos passos, sem conhecer o nome técnico da operação.
3. Operações em lote tiverem fila, cancelamento, progresso, retry e ZIP verificável.
4. Arquivos entre 250 e 500 MB exibirem comportamento cauteloso e não congelarem a interface sem explicação.
5. Comparação, redação permanente, OCR e PDF/A apresentarem limitações honestas e relatórios verificáveis.
6. Assinatura digital e recursos de nuvem não forem confundidos com assinatura visual ou processamento local.
7. Premium tiver controle de acesso real, preço, cancelamento, suporte e ausência de anúncios implementada de fato.
8. O site mantiver acessibilidade, SEO editorial, privacidade, páginas institucionais e experiência compatível com AdSense.
9. Os gates automatizados e a verificação manual forem executados em cada tranche.
10. Cada promoção para `main` tiver rollback claro, deployment monitorado e validação das rotas públicas.

## 17. Próxima implementação recomendada

A próxima tranche deve ser a **T1 — organização do produto**. Ela deve criar o registry único, classificar as ferramentas, separar categorias de navegação, mostrar badges Free/Premium/Professional, corrigir sobreposições entre ferramentas públicas e Pro e criar páginas de coleção. Depois dela, a T2 deve implementar fila, histórico e presets, porque essas capacidades serão reutilizadas por OCR, lote, comparação, conversão e segurança.

Essa ordem reduz retrabalho, preserva o processamento local e permite que o LIM PDF evolua de um catálogo amplo de utilitários para uma suíte Premium coerente, escalável e compreensível.
