# Blueprint do editor de PDF Premium — LIM PDF

**Autor:** Manus AI  
**Data:** 18 de agosto de 2026  
**Escopo:** evolução do editor publicado em `/ferramentas/editar-pdf`, sem duplicar as capacidades já existentes no catálogo do LIM PDF.

## 1. Decisão executiva

O editor publicado já possui uma base sólida de processamento local, histórico, seleção de páginas e objetos, substituição visual de texto, imagem, destaque, comentário, redação visual, assinatura desenhada e exportação com `pdf-lib`. O maior problema não é a ausência de um editor, mas a diferença entre o que o repositório contém e o que a rota pública entrega: `PdfEditorStudio` possui recursos adicionais, enquanto `PdfEditorWorkspaceHardened` é a experiência efetivamente publicada.

A estratégia recomendada é consolidar uma única experiência pública Hardened, incorporando somente as capacidades comprovadas do Studio. O núcleo deve evoluir em quatro eixos: **composição visual**, **tipografia e texto**, **garantia de exportação** e **experiência responsiva**. A edição de texto existente deve continuar claramente identificada como substituição visual sanitizada até que exista um pipeline verdadeiramente nativo e preservador de estrutura.

O editor deve superar as plataformas gratuitas não por copiar todos os serviços em nuvem, mas por oferecer um fluxo local mais completo, previsível e transparente. PDFgear é o benchmark mais próximo em privacidade e gratuidade; Smallpdf, Sejda, iLovePDF e PDF24 definem o conjunto mínimo esperado de objetos, organização e anotações.[1] [2] [3] [4] [5]

## 2. Posição competitiva desejada

| Dimensão | Estado/benchmark atual | Meta do LIM PDF |
|---|---|---|
| Privacidade | PDFgear processa localmente; Adobe, Sejda e PDF24 usam fluxos online com políticas de retenção distintas.[1] [4] [5] | Processamento local por padrão, sem upload obrigatório, com indicador visível por operação e explicação de qualquer integração externa. |
| Edição básica | Texto, formas, imagens, destaques, comentários, desenho e assinatura aparecem nos concorrentes.[1] [2] [3] [4] [5] | Oferecer todos os objetos básicos na mesma experiência, com seleção múltipla, alinhamento, camadas e atalhos consistentes. |
| Texto existente | Sejda anuncia edição de texto existente e localizar/substituir; PDF24 orienta converter para Word para editar texto.[4] [5] | Entregar substituição visual com relatório de sanitização; depois evoluir para edição nativa por blocos quando a fidelidade puder ser garantida. |
| Tipografia | O editor atual exporta Helvetica; os concorrentes não documentam uma solução local de fontes tão transparente nas páginas consultadas. | Catálogo curado de fontes locais, família, peso, itálico, cor, alinhamento, espaçamento e preview. Fontes externas são opcionais e nunca bloqueiam a edição básica. |
| Organização | Smallpdf e PDFgear incluem páginas e exportações; PDF24 oferece rearranjo, extração, comparação e redação como ferramentas adjacentes.[1] [2] [5] | Miniaturas com reordenação, duplicação, rotação, extração, inserção e visão de seleção; encadeamento local para enviar o resultado a outra ferramenta. |
| Redação | Sejda oferece whiteout; PDF24 lista redação, mas a simples cobertura visual não prova remoção do conteúdo.[4] [5] | Redação irreversível separada de destaque/comentário, com verificação pós-exportação e relatório de termos removidos. |
| Premium | Serviços pagos agregam integrações, colaboração, conversões e recursos avançados; PDFgear compete como gratuito sem Premium.[1] [2] | Premium baseado em valor profissional: fontes embutidas, comparação, localizar/substituir, presets, versões, lote, workflows, formulários avançados e relatórios. |

## 3. O que já existe e deve ser preservado

O editor não deve recriar upload, cache, rascunho local, histórico, seleção múltipla, copiar/colar, duplicação, nudging, camadas, imagem, destaque, comentário, assinatura desenhada, redação visual ou exportação. A primeira tranche deve aproveitar esses contratos e adicionar capacidades no mesmo modelo transacional de objetos.

O mecanismo de redação deve permanecer semanticamente distinto de anotação. Uma caixa branca, um destaque ou um comentário não podem ser apresentados como remoção segura. A exportação deve continuar achatando somente quando necessário, mas passará a incluir uma etapa de verificação e uma mensagem explícita quando a fidelidade textual/acessível tiver sido alterada.

## 4. Modelo de objetos recomendado

O objeto editorial deve ganhar propriedades opcionais e retrocompatíveis, sem quebrar os rascunhos existentes:

| Grupo | Propriedades prioritárias |
|---|---|
| Texto | `fontFamily`, `fontWeight`, `fontStyle`, `fontSize`, `color`, `opacity`, `textAlign`, `lineHeight`, `letterSpacing`, `rotation`, `backgroundColor`, `padding`, `autoFit` |
| Forma | `kind` para retângulo, elipse, linha, seta, callout, sublinhado e tachado; `strokeColor`, `fillColor`, `strokeWidth`, `dash`, `opacity`, `rotation` |
| Desenho | `points`, `brushColor`, `brushWidth`, `smoothing`, `opacity`; simplificação de pontos para reduzir o tamanho do rascunho |
| Carimbo | `preset`, `label`, `color`, `date`, `userText`, `opacity`, com presets como Aprovado, Rascunho, Confidencial e Revisar |
| Link | `targetType` para URL ou página interna, `target`, `tooltip`, `borderStyle` |
| Comentário | `author`, `status`, `createdAt`, `resolvedAt`, `threadId`, `color`; o status deve ser visual e não deve alterar o conteúdo semântico da página |
| Redação | `reason`, `label`, `color`, `verificationState`, `matchSource`; jamais reutilizar o tipo de destaque |

Todos os comandos devem ser transacionais, com `before`/`after` serializáveis, para que desfazer/refazer, rascunho e recuperação possam ser testados de forma determinística.

## 5. Tranche imediata de maior retorno

A primeira implementação deve priorizar aquilo que aumenta a percepção de qualidade sem exigir um novo backend:

1. Unificar a experiência pública com uma barra de comandos contextual, sem deixar `PdfEditorStudio` como rota paralela.
2. Incorporar formas, linhas, setas, caneta livre, sublinhado, tachado, carimbos e rotação/opacidade.
3. Reforçar o painel de propriedades com campos de texto, cor, alinhamento, camada e dimensões.
4. Transformar o painel de propriedades em drawer ou bottom sheet em telas pequenas, preservando acesso a edição e camadas.
5. Adicionar progresso por página, cancelamento e mensagens de falha no exportador.
6. Adicionar relatório de redação após exportação, com validação visual e extração de texto do resultado quando tecnicamente possível.
7. Criar uma paleta de comandos pesquisável e atalhos visíveis para operações recorrentes.

Esses itens são preferíveis a criar outra ferramenta isolada porque entregam valor diretamente na rota que já recebe tráfego e reutilizam a infraestrutura existente.

## 6. Funções Premium genuínas

| Função | Plano recomendado | Valor entregue | Dependência externa |
|---|---|---|---|
| Fontes locais curadas com incorporação no PDF | Premium | Tipografia profissional e exportação consistente | Nenhuma, além dos arquivos licenciados no pacote |
| Fontes sob demanda do catálogo Google | Premium opcional | Mais famílias e preview; incorporação somente após download/licença validada | Rede opcional; fallback local obrigatório |
| Localizar e substituir com revisão antes/depois | Premium | Edição em lote de termos sem converter para Word | Nenhuma |
| Comparar duas versões visualmente e por texto | Premium/Professional | Identificação de páginas, regiões e termos alterados | Nenhuma |
| Redação irreversível com relatório de garantia | Premium/Professional | Remoção verificável de conteúdo e evidência de cobertura | Nenhuma |
| Formulários avançados | Premium | Criar campos de texto, checkbox, rádio, seleção, data e assinatura | Nenhuma |
| Presets e workflows locais | Premium | Repetir sequência de ações sem enviar documentos à nuvem | Nenhuma |
| Histórico de versões e restauração | Premium | Recuperar estados do documento dentro do limite local | Nenhuma |
| Lote com fila, pausa, retomada e ZIP | Premium/Professional | Operar vários arquivos com controle de memória | Nenhuma |
| Integrações Google Drive/Dropbox | Professional/Team | Entrada e saída em serviços externos | Consentimento explícito e autenticação |
| Colaboração e comentários compartilhados | Team/Enterprise | Revisão multiusuário | Backend e controles de acesso |

A cobrança real não deve ser simulada no frontend. Os badges podem preparar o produto, mas o enforcement de entitlements e o pagamento exigirão backend, provedor de pagamentos, cancelamento, recibos e políticas comerciais próprias.

## 7. Arquitetura segura para Google Fonts

A CSS API v2 do Google Fonts suporta famílias, estilos, pesos e fontes variáveis, mas é adequada principalmente para pré-visualização HTML, não para embutir a fonte em um PDF.[6] A Developer API fornece metadados JSON, mas exige uma chave de API em cada requisição.[7] Portanto, a primeira versão não deve fazer chamadas da Developer API a partir do navegador.

A arquitetura recomendada é:

| Camada | Responsabilidade | Política |
|---|---|---|
| `editor-font-catalog.ts` | Catálogo versionado de famílias aprovadas, pesos, scripts, licença e origem | Funciona offline; fonte de verdade do seletor |
| `FontPreviewProvider` | Carregar CSS da Google Fonts sob demanda para preview | Opcional, com timeout, cache e fallback; não bloqueia edição |
| `FontAssetResolver` | Resolver arquivo de fonte local ou baixado explicitamente | Valida formato, origem, checksum e licença antes do uso |
| `PdfFontEmbedder` | Registrar fonte compatível com o exportador e aplicar fallback | Só embute quando a fonte for compatível e licenciada; caso contrário exporta com fallback informado |
| `FontLicenseNotice` | Mostrar origem/licença e manter referência no catálogo | Não afirmar que toda fonte Google pode ser redistribuída sem verificar a licença |

A documentação oficial de licenciamento recomenda manter uma cópia da licença de cada arquivo de fonte utilizado.[8] O seletor deve exibir uma nota curta de origem e licença, e o relatório de exportação deve identificar quando uma fonte solicitada foi substituída por fallback. A edição básica deve começar com fontes locais empacotadas, como Helvetica/Times/Courier compatíveis com o PDF, e somente depois receber fontes adicionais.

## 8. Exportação, memória e confiabilidade

O exportador deve executar uma fila sequencial por página e publicar progresso com a etapa atual. O usuário precisa poder cancelar a operação sem perder o rascunho. Em páginas achatadas, a resolução e o formato devem ser configuráveis por preset: **Rascunho**, **Equilibrado** e **Alta fidelidade**. Para redação, a verificação deve reabrir ou analisar o PDF final quando possível, extrair texto e verificar termos marcados, registrar exceções e bloquear a mensagem de sucesso se houver indício de conteúdo preservado.

A memória deve ser protegida por limites de canvas, liberação de bitmaps, descarte de páginas fora da janela visível e processamento sequencial. A duplicação de páginas deve manter identidade por instância na exportação para evitar que alterações em uma cópia contaminem a outra.

## 9. Critérios de aceite da próxima implementação

| Área | Critério mensurável |
|---|---|
| Compatibilidade | Rascunhos existentes continuam abrindo sem migração manual e objetos antigos recebem defaults seguros. |
| UX | Toda ferramenta tem estado hover, foco visível, teclado e mensagem de sucesso/erro; no mobile, propriedades ficam acessíveis por drawer. |
| Tipografia | É possível escolher família, peso, tamanho, cor e alinhamento; a exportação informa fallback quando não consegue embutir a fonte. |
| Redação | O relatório diferencia redação verificada de simples anotação e não declara sucesso em caso de falha de verificação. |
| Desempenho | Exportação publica progresso, aceita cancelamento e não mantém canvases desnecessários em memória. |
| Privacidade | Nenhuma chamada Google é obrigatória para abrir, editar ou exportar um PDF básico. |
| Testes | Contratos para modelo, histórico, fontes, exportação e redação; E2E para upload, edição, mobile e download; smoke de rota em produção. |
| SEO/AdSense | A rota mantém conteúdo editorial útil, sem anúncios dentro da área de trabalho e com explicação de processamento local. |

## 10. Ordem de execução

A ordem de maior segurança é: primeiro consolidar o modelo de objetos e os comandos; em seguida incorporar as ferramentas visuais do Studio na experiência Hardened; depois implementar tipografia local; só então adicionar preview Google Fonts e incorporação validada; por fim, avançar para comparação, formulários avançados, workflows e integrações externas.

Não se recomenda começar pela Google Fonts. Sem um exportador de fontes robusto, a integração produziria apenas uma prévia bonita no navegador e uma saída inconsistente no PDF. O diferencial Premium deve ser a combinação de privacidade local, edição visual completa, exportação verificável e tipografia previsível.

## Referências

[1]: https://www.pdfgear.com/edit-pdf/ "PDFgear — Edit PDF Online"
[2]: https://smallpdf.com/edit-pdf "Smallpdf — Free PDF Editor"
[3]: https://www.ilovepdf.com/edit-pdf "iLovePDF — PDF Editor"
[4]: https://www.sejda.com/pdf-editor "Sejda — Online PDF Editor"
[5]: https://tools.pdf24.org/en/edit-pdf "PDF24 — Edit PDF"
[6]: https://developers.google.com/fonts/docs/css2 "Google Fonts — CSS API v2"
[7]: https://developers.google.com/fonts/docs/developer_api "Google Fonts — Developer API"
[8]: https://fonts.google.com/knowledge/glossary/licensing "Google Fonts — Licensing"
