# Auditoria ao vivo — 18/08/2026

## Homepage publicada

A homepage apresenta navegação lateral persistente, busca global, categorias de ferramentas, ações principais para editar/converter/OCR/preflight e um catálogo resumido. O texto comunica 61 fluxos, processamento local quando indicado, guias editoriais, revisão de resultados e privacidade. A página possui o painel de cookies sobreposto na área inferior direita durante a auditoria.

## OCR PDF publicado

URL: https://limpdf.com.br/ferramentas/ocr-pdf

O fluxo exibido contém: seleção de PDF escaneado, seletor de idiomas, botão "Reconhecer texto e baixar PDF", explicação de saída pesquisável e cartão de privacidade. O texto informa "Até 500 MB · até 80 páginas por execução · OCR no navegador". A página explica que o documento não é enviado ao LIM PDF e que o navegador baixa o motor OCR e os modelos necessários.

A página editorial do OCR explica quando usar, como preparar a digitalização, como revisar o resultado e como abrir o PDF pesquisável no editor ou converter para Word.

Pontos a verificar na interação: upload real, carregamento dos modelos OCR, progresso, tempo de processamento, resultado pesquisável, comportamento com documento grande, escolha de idioma e sobreposição do banner de cookies.

## Upload no navegador

Foi gerado um fixture controlado de uma página escaneada (`audits/ocr-fixture-scanned.pdf`). O domínio exibe o botão "Escolher PDF" e o DOM contém um `input[type=file]` com `accept="application/pdf,.pdf"`, mas o upload automatizado não conseguiu localizar o input, inclusive depois de acionar o botão. Isso pode ser limitação do ambiente de automação com input oculto ou um problema de hidratação/associação do seletor; ainda não é evidência suficiente de falha do OCR em si. O próximo passo é inspecionar visibilidade, `label`/`ref` e eventos do input sem alterar o site publicado.

## Diagnóstico do input

O input real é `<input hidden accept="application/pdf,.pdf" type="file">`, com `display: none` e retângulo de tamanho zero, dentro da `.drop-zone`. O botão chama o fluxo de seleção por referência. A falha do upload automatizado é compatível com a política da ferramenta de automação de não localizar inputs ocultos; não demonstra, por si só, falha para um usuário real no seletor nativo.

## Upload com input exposto

Ao expor temporariamente o input na sessão, ele passou a aparecer como elemento interativo 22 na página. A tentativa anterior com índice 0 continuou falhando porque o índice usado pelo upload precisa corresponder à lista de elementos visíveis atualizada. O botão e o campo continuam funcionais visualmente; será feita nova tentativa usando o índice visível 22.

## Processamento OCR observado

O upload do `ocr-fixture-scanned.pdf` foi aceito: 147 KB, arquivo exibido no cartão e botão de remoção disponível. Ao iniciar, o botão mudou para "Preparando OCR…" e o progresso começou em 1%. O estado de processamento ficou visível e o documento permaneceu no navegador, conforme a mensagem de privacidade.

## Resultado concluído

O OCR terminou no site publicado com a mensagem: "OCR concluído. O PDF pesquisável foi baixado. 1 página(s), 48 palavra(s) posicionada(s)." O arquivo `/home/ubuntu/Downloads/ocr-fixture-scanned-ocr.pdf` foi criado com 1 página e 124907 bytes. `pdftotext` confirmou uma camada de texto pesquisável com 93 linhas extraídas, incluindo `OCR-2026-0818`, `R$ 1.250,00`, `18/08/2026`, acentos e o texto do fixture.

Diagnóstico atual: o OCR existente funciona de ponta a ponta em produção para uma página escaneada pequena; há progresso, escolha de idiomas, processamento local, download e camada pesquisável. As melhorias recomendadas devem focar precisão/ordenação do texto, pré-processamento, limites operacionais, lote e experiência de revisão, não na criação de um segundo OCR.
