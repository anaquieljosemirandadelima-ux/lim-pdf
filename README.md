# LIM PDF

Portal gratuito de ferramentas PDF com processamento local no navegador, páginas SEO individuais, guias editoriais e preparação para Google Search Console e AdSense.

## Recursos

- 32 ferramentas funcionais.
- 32 páginas estáticas de ferramentas.
- Editor visual com rascunho temporário, persistência local de imagens e sanitização de páginas com redação/substituição de texto.
- Conversão e compactação pesada com processamento sequencial por página para reduzir uso de memória.
- Cache local com expiração automática de até 4 horas e limpeza manual pela página de privacidade.
- 8 guias originais.
- Sitemap, robots, dados estruturados e canonical.
- Consentimento, políticas legais, acessibilidade e cabeçalhos de segurança.
- AdSense carregado somente após consentimento opcional e Search Console configurável por variáveis de ambiente.
- Sem armazenamento dos documentos nos servidores do LIM PDF.

## Desenvolvimento

```bash
npm ci
npm run dev
```

## Validação

```bash
npm run check
```

O mesmo comando é executado no GitHub Actions em pull requests e branches de agente.

## Produção

```bash
npm run build
npm run start
```

Consulte `docs/LANCAMENTO.md` para as credenciais externas necessárias.
