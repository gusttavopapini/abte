# ABTE: site e painel em código próprio

## Resumo do projeto

Reconstrução do site da **ABTE, Associação Brasileira de Tratamento da Escoliose**, que hoje está no Wix, em código próprio (saída 100% do Wix). O site público mostra conteúdo institucional, diretório de profissionais, blog, artigos, loja (só vitrine) e doação. O conteúdo é mantido por um **painel administrativo sob medida** (sem CMS pronto), usado pela **Bianca como administradora** e pela **diretoria da ABTE como editores**.

A Bianca é designer e gestora do projeto, não desenvolvedora: revisa pela tela (390, 768, 1280 e 1710 px). Sempre que ela precisar agir no console do Firebase ou no GitHub, explique passo a passo, em linguagem simples.

## Stack e versões instaladas (etapa 1)

| Item | Versão |
|---|---|
| Node.js (máquina de desenvolvimento) | 26.10 (mínimo 22.18, por causa dos scripts `.mts`) |
| Next.js (App Router, TypeScript) | 16.3.6 |
| React | 19.2.8 |
| TypeScript | 5.9 |
| firebase (SDK web, só no login) | 12.19.0 |
| firebase-admin (só no servidor) | 14.5.0 |
| server-only | 0.0.1 |
| firebase-tools (CLI e emuladores, dev) | 15.31.0 |
| @firebase/rules-unit-testing (dev) | 5.0.2 |
| ESLint (eslint-config-next) | 9.39 |
| Stylelint | 17.15 |

CSS puro com CSS Modules e `src/styles/tokens.css` global. **Sem Tailwind, Bootstrap ou kits de UI.** Public Sans (400 e 600) via `next/font/google`, auto-hospedada no build.

Atenção ao Next.js 16: o antigo `middleware.ts` agora se chama **`proxy.ts`** (`src/proxy.ts`); `cookies()` é assíncrono. Antes de escrever código, consulte a documentação em `node_modules/next/dist/docs/`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Site em http://localhost:3000 |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run lint:css` | Stylelint: falha com cor em hex/rgb/hsl/nome ou font-size em px fora do tokens.css |
| `npm run typecheck` | Checagem de tipos (tsc) |
| `npm run test:regras` | Testes das regras do Firestore no emulador (exige Java) |
| `npm run admin:conceder -- email@exemplo.com` | Dá o papel "administrador" a um usuário existente (usa o .env.local) |

## Estrutura de pastas

```
docs/                     arquivos de referência (design system, tokens, contexto)
firestore.rules           regras do Firestore (nega tudo)
firebase.json, .firebaserc  Firebase CLI (Firestore + emulador; projeto padrão abte-dev)
scripts/                  scripts de linha de comando (Admin SDK)
testes/regras/            testes das regras (node:test + emulador)
src/
  proxy.ts                checagem rápida de cookie no /admin (redireciona ao login)
  styles/tokens.css       tokens v3.1 (única fonte de valores visuais)
  app/
    globals.css           reset, base, classes tipográficas, .container, .texto-sobre-destaque
    layout.tsx            layout raiz (html pt-BR, fonte)
    page.tsx              home provisória
    not-found.tsx         404 provisória
    componentes/          página de revisão visual (noindex)
    admin/                painel: entrar, recuperar senha, página protegida, ações de servidor
  components/<Nome>/      um componente por pasta, com seu CSS Module
  config/navegacao.ts     menu, rodapé, e-mail e redes (um único arquivo)
  lib/firebase/cliente.ts SDK web (navegador, só login)
  lib/firebase/servidor.ts Admin SDK (server-only)
  lib/auth/               sessão, papéis e constantes
```

## Arquivos de referência (ordem de prioridade em caso de conflito)

1. `docs/tokens.css` e `docs/tokens.json`: valores visuais oficiais v3.1 (a cópia usada no código é `src/styles/tokens.css`, com os tamanhos de fonte convertidos para rem)
2. `docs/design-system.md`
3. `docs/ABTE_design_redesign.md`
4. `docs/ABTE_contexto_redesign.md`

## Arquitetura Firebase

- **Desenvolvimento:** projeto `abte-dev`, na conta Google da Bianca (plano gratuito, Firestore em southamerica-east1, Authentication por e-mail e senha).
- **Produção:** projeto próprio, em conta da ABTE, criado na etapa 9. Nada no código depende do `abte-dev`: tudo que identifica o projeto vem de variáveis de ambiente (`.env.example` lista todas). O `.firebaserc` só define o alias padrão da CLI.
- **Acesso aos dados sempre pelo servidor**, com o Admin SDK. O navegador não lê nem grava no Firestore.
- **Regras do Firestore negam todo acesso direto do navegador.** Toda coleção nova continua negada e ganha teste em `testes/regras/`. Qualquer exceção precisa de regra específica e teste.
- **Papéis por custom claim** `papel` no Authentication: `administrador` ou `editor`. Sem papel, nada do painel.
- **Sessão por cookie** de sessão do Firebase (`__session`, httpOnly, secure em produção, sameSite strict, 5 dias, caminho `/admin`), validado no servidor em toda página do painel com checagem de revogação (`exigirSessaoDoPainel()` em `src/lib/auth/sessao.ts`). "Sair" revoga a sessão e apaga o cookie.
- **Admin SDK só no servidor:** `src/lib/firebase/servidor.ts` e `src/lib/auth/sessao.ts` importam `server-only`.
- **Testes:** toda etapa que mexe com dados inclui testes de regras e de permissões (sessão e papel) das ações de servidor.

## Plano de etapas

1. **Base** em fechamento (falta testar login, publicar regras e enviar ao GitHub)
2. Páginas públicas estáticas (inclui a página Doe com Pix estático, se confirmado)
3. Modelo de dados no Firestore, papéis administrador e editor, cadastro de usuários pelo painel, registro de alterações, lixeira, "Configurações do site" com os dados do Pix (editável só pelo administrador), regras e testes; SEM coleções de pedidos, doações e cupons
4. Painel administrativo, em partes com revisão entre elas: 4a profissionais e diretoria; 4b blog e artigos; 4c produtos; 4d biblioteca de mídia (Cloud Storage, que exige o plano Blaze)
5. Páginas dinâmicas (inclui vitrine da loja e página de produto SEM compra, com aviso "Em breve")
6. Migração de conteúdo
7. Loja com pagamento: DESATIVADO (quando ativado, via Stripe)
8. Doação com pagamento online: DESATIVADO (quando ativado, via Stripe)
9. SEO e lançamento (inclui projeto Firebase de produção na conta da ABTE, hospedagem e alerta de orçamento no Google Cloud)

## Decisões tomadas sobre pagamento

- Pagamento online **desativado**.
- Gateway definido para quando for ativado: **Stripe**.
- Loja como **vitrine**, com aviso "Em breve".
- Doação por **Pix estático** (QR code e código copia e cola, valores sugeridos de R$25, R$50, R$100 e valor livre, sem registro automático das doações), **a confirmar com a Bianca**.
- **Nunca** instalar gateway, carrinho, checkout ou webhook sem pedido explícito.

## Decisões em aberto: NUNCA assumir

Confirmação da doação por Pix e dados do Pix da ABTE (chave, titular, cidade, exibição do CNPJ); hospedagem (Firebase App Hosting é candidata, não decidida); região do projeto de produção; registro do domínio; serviço de e-mail do formulário de contato; papéis no painel; associação (Google Forms ou formulário próprio); newsletter; área de membros; comentários no blog; marca "Tratando Escoliose"; logo em vetor; fotos; números oficiais; depoimentos; logos de parceiros; e, quando o pagamento for ativado, frete, recorrência, recibo e nota fiscal.

## Regras permanentes

- **Design:** usar somente os tokens. Nenhuma cor, fonte, tamanho ou espaçamento fora do tokens.css. Raio 0, sem sombra.
- **Tipografia:** tamanhos só pelos tokens convertidos na etapa 1 (clamp em rem, âncoras 390 e 1710 px).
- **Regra do #76ACF5:** nenhum texto abaixo de 24px sobre essa cor, em nenhuma tela (use a classe `.texto-sobre-destaque`).
- **Responsivo:** o mesmo design em todas as telas. Só mudam tamanhos (pelos clamp), colunas (design-system.md seção 9) e altura mínima de 44px nos controles até 767px. Nada é escondido no celular, nada muda de ordem. Abaixo de 1024px, única exceção: o menu vira hambúrguer. Breakpoints literais: 767px e 1023px.
- **Acessibilidade:** um H1 por página, hierarquia sem saltos, foco visível com `--focus-ring`, tudo operável por teclado, textos alternativos em português, `prefers-reduced-motion` respeitado, erro e sucesso em caixa branca.
- **Idioma:** tudo em português do Brasil, inclusive textos do sistema, rótulos acessíveis, mensagens de validação e de erro do Firebase (nunca exibir a mensagem técnica em inglês). Em textos visíveis, não use travessão (o sinal longo de pontuação); use vírgula, dois-pontos ou ponto.
- **Dados:** nunca inventar profissionais, registros, preços, números, depoimentos, parcerias, CNPJ ou chave Pix. Use placeholders claramente marcados como exemplo.
- **Pagamento:** desativado. Não instalar Stripe nem qualquer outro gateway, não criar carrinho, checkout, rotas de webhook ou variáveis de ambiente de pagamento até pedido explícito.
- **Imagens:** nunca linkar static.wixstatic.com nem outro CDN do Wix.
- **Firebase:** acesso aos dados sempre pelo servidor com Admin SDK, com checagem de sessão e papel; regras negam todo acesso direto do navegador por padrão; toda exceção precisa de regra específica e teste; o Admin SDK nunca vai para o navegador.
- **Segurança:** segredos só no .env.local, nunca no código, nunca em commit, nunca exibidos no terminal. Painel com noindex. Cookies de sessão httpOnly e sameSite strict.
- **Organização:** componentes pequenos e reutilizáveis, um por pasta com seu CSS Module. Comentários do código em português.

@AGENTS.md
