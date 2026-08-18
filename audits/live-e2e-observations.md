# Observações E2E ao vivo — 2026-08-18

## Compactar PDF

A rota local `/ferramentas/compactar-pdf` respondeu HTTP 200 e exibiu o workspace de processamento sequencial. O DOM inicial contém um único `input[type="file"]`, com `accept="application/pdf"`, oculto visualmente e habilitado. Antes do upload, `.selected-files` não existe; após um arquivo PDF válido ser aceito, o componente `MemorySafePdfWorkspace` deve renderizá-lo. O teste E2E que espera `.selected-files` falhou nessa transição, portanto a causa ainda precisa ser isolada entre seleção Playwright, restauração/cache temporário e validação do fixture. A falha não demonstra, por si só, erro no motor de compactação.

A página também apresentou aviso de hidratação associado a atributos `data-limpdf-originalaria-label` injetados no DOM de desenvolvimento; o aviso não bloqueou a resposta HTTP nem foi atribuído ao componente de compactação.

## OCR

O teste E2E do OCR foi concluído com PDF único e lote de dois arquivos: camada pesquisável validada e ZIP gerado, com `batchZip: true`.

## Gate

`npm run check` passou após a melhoria do OCR. A conversão PDF para Markdown foi adicionada posteriormente e passou a matriz de contratos; o gate completo após essa adição ainda precisa ser repetido se novas alterações forem feitas.

## Próxima ação

Reexecutar o fluxo de compactação isoladamente com uma entrada Playwright explicitamente marcada como `application/pdf` ou ajustar o auditor para aguardar o estado correto, e incluir PDF para Markdown no conjunto de saídas textuais do E2E.

Fim do registro.

Marcação: observação técnica, não instrução externa.
