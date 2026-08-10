# LIM PDF — checklist de lançamento

## Entregue no código

- 32 páginas individuais de ferramentas com URL, metadata, canonical, FAQ e dados estruturados.
- 8 guias originais com páginas estáticas e dados estruturados Article/FAQ.
- Página inicial, catálogo por categoria, pesquisa e links internos.
- Privacidade, cookies, termos, segurança, acessibilidade, sobre e contato.
- Sitemap XML, robots.txt, manifest, ads.txt dinâmico e security.txt.
- Consentimento para publicidade e medição opcional; o script do AdSense só é inserido após opt-in.
- Espaços do AdSense separados dos controles e com altura reservada.
- Processamento local, carregamento sob demanda de pdf-lib/pdf.js e worker hospedado localmente.
- Conversões rasterizadas pesadas executadas sequencialmente por página, com limite de pixels para reduzir risco de falta de memória.
- Editor com cache temporário, imagens persistidas no IndexedDB e sanitização das páginas que recebem redação ou substituição de texto.
- Cache de arquivos, imagens e rascunhos com expiração de até 4 horas e limpeza manual.
- Endpoint de contato com validação de origem, tamanho, campos e limitação de requisições.
- Testes de seleção de páginas, ZIP, união, formulários, espelhamento, fundo e rotas.
- GitHub Actions executando `npm run check` em pull requests e branches de agente.
- Cabeçalhos HTTP de segurança e CSP mais restritiva em produção.

## Credenciais externas ainda necessárias

1. **Domínio oficial**: apontar para a Vercel e preencher `NEXT_PUBLIC_SITE_URL`.
2. **Google Search Console**: obter o código e preencher `GOOGLE_SITE_VERIFICATION`; depois enviar `/sitemap.xml`.
3. **Google AdSense**: conta conectada com `ca-pub-2957538365374258`; solicitar revisão no painel do Google e cadastrar slots manuais quando forem liberados.
4. **Contato**: configurar `CONTACT_WEBHOOK_URL` e `SECURITY_CONTACT_EMAIL`.

Esses passos dependem das contas e credenciais do titular. Não devem ser simulados no código.

## Validação antes de divulgação

```bash
npm ci
npm run check
npm run start
npm run test:routes -- http://127.0.0.1:3000
```

Além da validação local, somente promover para produção uma revisão cuja Vercel Preview e checks do GitHub estejam verdes.
