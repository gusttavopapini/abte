# Projeto ABTE: contexto completo

> Texto de contexto para um Projeto do Claude. Atualizado em 01/10/2026, com base no código deste repositório e nos documentos em `docs/`.
>
> As seções 8 e 9 registram o diagnóstico feito ANTES da limpeza de código da branch `limpeza/codigo-limpo`. O estado mais recente fica no `CLAUDE.md`, seção "Divergências conhecidas e pendentes".

---

## 1. O que é o projeto

A **ABTE, Associação Brasileira de Tratamento da Escoliose**, é uma associação sem fins lucrativos fundada em agosto de 2021. Ela nasceu do projeto **Tratando Escoliose** (existente desde 2018), e o nome antigo ainda aparece no e-mail e no Facebook. A ABTE atua no Brasil, no Paraguai e na Bolívia.

- **Foco:** tratamento conservador da escoliose baseado em evidências. Os métodos usados são Schroth ISST, BSPTS Conceito Rigo, SEAS, SSOL e Lyon.
- **Público:**
  - pacientes, muitos deles adolescentes;
  - pais e famílias;
  - profissionais de saúde (fisioterapeutas, médicos, ortesistas e psicólogos).
- **Missão (texto oficial):** "Compartilhar informações, promover ações sociais e desenvolver materiais com embasamento técnico-científico a respeito da escoliose de forma gratuita, universalmente acessível e útil para todos. Além de promover a união de profissionais especializados no tratamento da escoliose."
- **Visão:** ser referência em Tratamento Conservador da Escoliose na América Latina.
- **Site atual:** abteescoliose.com.br, hoje feito no **Wix**.
- **Contatos:** e-mail tratandoescoliose@gmail.com, Instagram @abte.escoliose e Facebook /tratando.escoliose.
- **Diretoria:** gestão 2025-2027; o nome da presidência fica nos registros internos da ABTE, fora deste repositório.

### O objetivo do projeto
Reconstruir o site da ABTE em **código próprio**, saindo 100% do Wix. O site novo terá duas partes.

**1. Site público:**
- institucional (home, sobre e história);
- diretório de profissionais com filtros;
- blog;
- artigos científicos;
- loja só como vitrine, sem compra;
- página de doação;
- contato.

**2. Painel administrativo próprio, sem CMS pronto.** Com ele, a equipe cuida do conteúdo sem depender de desenvolvedor:
- profissionais;
- diretoria;
- posts;
- artigos;
- produtos;
- mídias;
- configurações.

### Papéis e revisão
- **Administrador do painel:** acesso total. A gestão do projeto não é feita por desenvolvedores: a revisão é visual, nas larguras de 390, 768, 1280 e 1710 px. Toda ação no console do Firebase, no GitHub ou na Vercel precisa ser explicada **passo a passo, em linguagem simples**.
- **Editores:** usarão o painel para cadastrar e editar conteúdo.
- **Repositório:** GitHub (privado; verificar: gh api indicou público em 21/10/2026), branch `main`.

### Volume de conteúdo a migrar do Wix
- 66 posts do blog;
- 9 produtos;
- 4 artigos, com 8 PDFs;
- cerca de 69 fisioterapeutas, 23 médicos e 11 parceiros;
- mais de 2 mil e-mails na lista de contatos;
- 33 membros na área de membros do Wix.

Todos esses números precisam ser confirmados antes do uso.

---

## 2. Stack técnica

| Item | Versão / escolha |
|---|---|
| Framework | **Next.js 16.3.6** (App Router, TypeScript 5.9) |
| React | 19.2.8 |
| Estilo | **CSS puro com CSS Modules** + `src/styles/tokens.css` global. Sem Tailwind, Bootstrap ou kit de UI |
| Fonte | Public Sans via `next/font/google` (auto-hospedada) |
| Banco | **Cloud Firestore** (projeto de desenvolvimento `abte-dev`, região southamerica-east1) |
| Login | **Firebase Authentication** (e-mail e senha, sem cadastro público) |
| Arquivos | Cloud Storage for Firebase (planejado para a etapa 4d, exige plano Blaze) |
| SDKs | `firebase` 12.19 (navegador, só no login) e `firebase-admin` 14.5 (só no servidor) |
| Testes | Emulador do Firestore + `@firebase/rules-unit-testing` + `node:test` (exige Java) |
| Qualidade | ESLint (eslint-config-next) e Stylelint (proíbe cor em hex/rgb/nome e font-size em px fora do tokens.css) |
| Animação | framer-motion (adicionado depois, fora do plano original) |
| Node | mínimo 22.18 |

### Particularidades do Next.js 16
- O antigo `middleware.ts` agora se chama **`proxy.ts`**. Neste projeto ele fica em `src/proxy.ts`.
- `cookies()` e `params` são assíncronos.
- A documentação da versão instalada fica em `node_modules/next/dist/docs/` e deve ser consultada antes de escrever código.
- A documentação do Next 16 alerta que **checar a sessão só no layout não basta**: a checagem tem que ficar perto do dado, em cada página e em cada ação de servidor.

### Comandos
| Comando | O que faz |
|---|---|
| `npm run dev` | Site em http://localhost:3000 |
| `npm run build` | Build de produção |
| `npm run lint` / `npm run lint:css` | ESLint / Stylelint |
| `npm run typecheck` | Checagem de tipos |
| `npm run test:regras` | Testes das regras do Firestore no emulador |
| `npm run admin:conceder -- email@exemplo.com [--nome "Nome"]` | Dá o papel de administrador a um usuário existente |

---

## 3. Arquitetura

### Dados e segurança
- O navegador **nunca** lê nem grava no Firestore. Todo acesso passa pelo **servidor**, com o Admin SDK.
- As **regras do Firestore negam tudo**. Toda coleção nova continua negada e ganha teste. Qualquer exceção precisa de regra específica e de teste.
- **Papéis** ficam na custom claim `papel` do Authentication:
  - `administrador`: acesso total, usuários e configurações, inclusive o Pix;
  - `editor`: edita conteúdo, mas não mexe em usuários nem em configurações;
  - sem papel: nada do painel.
- **Sessão:**
  - fica num cookie de sessão do Firebase chamado `__session` (httpOnly, sameSite strict, secure em produção, 5 dias, caminho `/admin`);
  - é validada no servidor, com checagem de revogação, por `exigirSessaoDoPainel()` em `src/lib/auth/sessao.ts`;
  - "Sair" revoga a sessão e apaga o cookie.
- O Admin SDK só existe no servidor: `src/lib/firebase/servidor.ts`, `admin-auth.ts` e `sessao.ts` importam `server-only`.
- O painel e a página `/componentes` têm noindex.
- Toda configuração vem de variáveis de ambiente. Nada no código depende do projeto `abte-dev`.

### Estrutura de pastas
```
docs/                      documentos de referência (design system, tokens, contexto, design)
firestore.rules            regras do Firestore (negam tudo)
scripts/                   scripts de linha de comando (Admin SDK)
testes/regras/             testes das regras
src/
  proxy.ts                 checagem rápida do cookie no /admin
  styles/tokens.css        tokens v3.1 (única fonte de valores visuais)
  app/                     rotas públicas, /componentes (revisão visual) e /admin (painel)
  components/<Nome>/       um componente por pasta, com seu CSS Module
  config/navegacao.ts      menu, rodapé, e-mail e redes
  lib/firebase/            cliente (navegador) e servidor (Admin SDK)
  lib/auth/                sessão, papéis e constantes
```

### Modelo de dados planejado (Firestore, a validar na etapa 3)
- **Documentos e coleções de conteúdo:**
  - `configuracoes/site`: Pix, CNPJ, e-mail e redes. Só o administrador edita.
  - `usuarios`, `midias`, `profissionais`, `diretoria`, `posts`, `artigos` e `produtos`.
  - `logAlteracoes`: registro de quem fez o quê e quando. Só o servidor grava.
- **Lixeira:** o campo `excluidoEm` preenchido indica um item na lixeira, que pode ser restaurado.
- **Slugs** de posts e produtos são únicos e verificados no servidor.
- **Coleções que NÃO devem ser criadas:** `pedidos`, `doacoes` e `cupons`, porque o pagamento está desativado.

---

## 4. Design

- **Origem:** o visual aprovado vem de um template do Wix ("Justir" / "Medical Company"). O projeto **recria o visual** e **não copia código** do Wix.
- **Fonte da verdade, em ordem de prioridade:**
  1. `docs/tokens.css` e `docs/tokens.json` (v3.1);
  2. `docs/design-system.md`;
  3. `docs/ABTE_design_redesign.md`;
  4. `docs/ABTE_contexto_redesign.md`.
- **Linguagem visual:**
  - monocromia azul: textos, títulos e botões em `#00449F`;
  - blocos chapados em branco, `#76ACF5` e `#ADD8E6` sobre fundo `#E0F2F7`;
  - **raio 0 e sem sombra**, pelo design system original;
  - títulos leves;
  - rótulos entre colchetes, como [A] e [01];
  - foto sangrada com cartão branco sobreposto.
- **Regra do #76ACF5:** nenhum texto abaixo de 24px sobre essa cor (use a classe `.texto-sobre-destaque`).
- **Tipografia:** tamanhos só pelos tokens, com clamp em rem e âncoras em 390 e 1710 px.
- **Responsivo:**
  - o mesmo design em todas as telas; só mudam tamanhos, colunas e a altura mínima de 44px nos controles até 767px;
  - nada é escondido nem muda de ordem;
  - breakpoints em 767px e 1023px;
  - única exceção: abaixo de 1024px o menu vira hambúrguer.

---

## 5. Regras permanentes do projeto

- **Design:** só tokens. Nenhuma cor, fonte, tamanho ou espaçamento fora do tokens.css.
- **Acessibilidade:**
  - um H1 por página, com hierarquia sem saltos;
  - foco visível com `--focus-ring` e tudo operável por teclado;
  - textos alternativos em português;
  - `prefers-reduced-motion` respeitado;
  - erro e sucesso em caixa branca.
- **Idioma:** tudo em português do Brasil, inclusive mensagens de erro do Firebase, que nunca aparecem em inglês.
- **Travessão:** em textos visíveis não se usa travessão (o sinal longo); usa-se vírgula, dois-pontos ou ponto.
- **Dados:** **nunca inventar** profissionais, registros, preços, números, depoimentos, parcerias, CNPJ ou chave Pix. Quando faltar um dado, usar placeholder claramente marcado como exemplo.
- **Pagamento: DESATIVADO.**
  - Não instalar Stripe nem nenhum outro gateway.
  - Não criar carrinho, checkout, webhook nem variáveis de pagamento sem pedido explícito.
  - Quando for ativado, o gateway será a **Stripe**.
- **Loja:** vitrine com o aviso "Em breve".
- **Doação:** Pix estático (QR code e copia e cola; valores de R$25, R$50, R$100 e valor livre; sem registro automático). **Ainda a confirmar.**
- **Imagens:** nunca linkar `static.wixstatic.com` nem outro CDN do Wix. As imagens precisam ser baixadas e reenviadas.
- **Segredos:** só em arquivo `.env*` local, nunca no código, num commit ou no terminal.
- **Organização:** componentes pequenos, um por pasta com seu CSS Module, e comentários do código em português.

---

## 6. Plano de etapas (original)

1. **Base** ✅ concluída
2. Páginas públicas estáticas (inclui a página Doe com Pix, se confirmado)
3. Modelo de dados, papéis, cadastro de usuários pelo painel, registro de alterações, lixeira, configurações do site, regras e testes
4. Painel administrativo, em partes: 4a profissionais e diretoria; 4b blog e artigos; 4c produtos; 4d biblioteca de mídia (Cloud Storage)
5. Páginas dinâmicas (inclui vitrine da loja e página de produto SEM compra)
6. Migração de conteúdo do Wix (script com relatório)
7. Loja com pagamento: DESATIVADO
8. Doação com pagamento online: DESATIVADO
9. SEO e lançamento (projeto Firebase de produção na conta da ABTE, hospedagem, domínio, redirects 301, alerta de orçamento)

---

## 7. Histórico: o que aconteceu até agora

O desenvolvimento passou por **duas fases com ferramentas de IA diferentes**.

**Fase 1, de 26 a 27/09/2026, com o Claude (cerca de 10 commits):** a etapa 1 foi feita de forma organizada e testada. Ela entregou:
- projeto Next.js com tokens e Stylelint;
- header, menus, bloco de contato e rodapé;
- login do painel com cookie de sessão e papéis;
- regras do Firestore negando tudo, com 40 testes passando;
- o `CLAUDE.md` com todas as regras.

**Fase 2, de 27 a 29/09/2026, com o Gemini (cerca de 110 commits pequenos):** partes das etapas 2, 4 e 5 foram feitas fora de ordem, e **a etapa 3 (modelo de dados) foi pulada**. Nessa fase:
- foi criada a home com hero em carrossel, estatísticas, missão, visão e valores;
- foram criadas as páginas de profissionais (com filtro por tag), blog, artigos, contato e loja (só título);
- um painel simples passou a gravar posts, artigos e profissionais no Firestore;
- foi feito deploy na **Vercel**, com ajustes no `next.config.ts` e no `package.json` para contornar erros de ESM do firebase-admin;
- o design visual foi alterado (cantos de 5px, sombras, fonte peso 300, animações com framer-motion) sem que o `CLAUDE.md` fosse atualizado.

---

## 8. Estado atual (diagnóstico de 01/10/2026)

### Verificações automáticas
| Verificação | Resultado |
|---|---|
| typecheck | passa |
| build | passa |
| testes das regras (40) | passam |
| lint | 7 erros (`any`) e 9 avisos |
| lint:css | 11 erros (rgba, hex e px em `Hero`, `Modal` e `Botao`) |

### O que está pronto
- Login, recuperação de senha, sessão, "Sair", proxy do `/admin` e noindex.
- Layout público (header com hide-on-scroll, menu, rodapé) e página de revisão `/componentes`.
- Leitura do Firestore nas páginas públicas de blog, artigos e profissionais.
- **Painel:**
  - blog e artigos: listar, criar e editar;
  - profissionais: CRUD completo num modal.

### O que está incompleto ou quebrado
- **Formulário de contato:** mostra "enviado" sem enviar nada (TODO em `BlocoContato.tsx`).
- **Conteúdo inventado:** `/artigos/categoria/[slug]` mostra 4 artigos falsos com autores fictícios, e as categorias estão fixas no código.
- **Links que dão 404:** `/doe`, `/seja-associado`, `/acessibilidade`, `/politica-de-privacidade` e `/termos-de-uso`.
- **Loja:** só tem título.
- **Imagens provisórias externas:** picsum.photos e placehold.co.
- **Painel:**
  - não diferencia administrador de editor;
  - não tem lixeira nem registro de alterações, e a exclusão de profissional é definitiva;
  - não valida as entradas;
  - as ações de servidor ignoram o resultado "sem-papel";
  - as páginas só checam a sessão no layout.
  - Um teste com cookie falso confirmou que não há vazamento, mas a proteção está abaixo do padrão definido.
- **Acessibilidade:**
  - a home está sem H1;
  - o carrossel avança sozinho, sem botão de pausa e sem respeitar `reduced-motion`;
  - as animações também ignoram `reduced-motion`;
  - o alt das imagens é genérico ("Slide 1").
- **Ambiente:**
  - o `.env.example` foi apagado;
  - as credenciais do Firebase migraram para `.env`, e o `.env.local` foi sobrescrito pela Vercel;
  - por isso `npm run admin:conceder` não funciona.
- **Desvios do design system:**
  - 41 cantos arredondados ou sombras no CSS;
  - 69 usos de pesos 300, 500 ou 700;
  - 164 estilos inline no TSX, 44 com hex, rgba ou px, que escapam do Stylelint.
- **Código duplicado e nomes divergentes:**
  - a função de slug está repetida;
  - as tags de profissionais aparecem em 3 lugares;
  - a mesma informação tem nomes diferentes (`imagem` × `imagemUrl`, `autores` × `autor`);
  - há imports não usados;
  - editar um post muda o slug e quebra links antigos.

---

## 9. Plano de continuidade proposto (aguardando aprovação)

1. **Higiene do ambiente:** restaurar o `.env.example`, consertar o `admin:conceder` e zerar os erros de lint de TypeScript.
2. **Segurança do painel:**
   - checar o papel em todas as ações e páginas, numa camada única de acesso a dados;
   - validar as entradas;
   - trocar o `confirm()` por uma confirmação acessível;
   - escrever testes de permissão.
3. **Tirar o que engana o visitante:** remover os artigos falsos, desativar o envio do contato com um aviso honesto e resolver os links que dão 404.
4. **Acessibilidade:** colocar o H1 na home, dar ao carrossel um botão de pausa e respeitar `reduced-motion`.
5. **Design:** alinhar o código ao design system ou atualizar as regras, conforme a decisão de design.
6. **Retomar o plano oficial pela etapa 3** (modelo de dados, usuários, registro de alterações, lixeira e configurações) e depois completar a etapa 4.
7. **Atualizar o `CLAUDE.md`** com o estado real.

---

## 10. Decisões em aberto: NUNCA assumir, sempre perguntar

- Confirmação da doação por Pix e dados do Pix da ABTE: chave, titular, cidade e se o CNPJ será exibido.
- **Hospedagem:** a Vercel já está em uso, mas o plano dizia "a decidir". O Firebase App Hosting era a candidata.
- Região do projeto de produção, registro do domínio e quem tem acesso a ele.
- Serviço de e-mail do formulário de contato.
- Divisão de papéis no painel.
- Associação: Google Forms ou formulário próprio no site.
- Newsletter, área de membros e comentários no blog.
- Marca "Tratando Escoliose": continua visível ou fica só como legado.
- Logo em vetor, fotos, números oficiais, depoimentos e logos de parceiros.
- **Design pós-Gemini:** os cantos de 5px, as sombras, o peso 300 e as animações foram aprovados?
- **Quando o pagamento for ativado:** frete, recorrência, recibo e nota fiscal.

---

## 11. Como trabalhar neste projeto

- Responder sempre em **português do Brasil**, sem travessão em textos visíveis do site.
- Trabalhar em **etapas pequenas**, uma por vez, explicando o que mudou e por quê, e validando com build, lint e testes no fim de cada uma.
- **Não reescrever** partes que funcionam sem consultar antes.
- Na dúvida, **perguntar** em vez de assumir, principalmente sobre os itens da seção 10.
- Explicar qualquer ação no Firebase, no GitHub ou na Vercel passo a passo, para quem não é desenvolvedor.
