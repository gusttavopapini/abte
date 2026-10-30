# ABTE: contexto do projeto para o Codex

Registro histórico iniciado em **27/10/2026**, com atualizações e conferências em **28/10/2026**. Em **30/10**, o responsável pediu novo mapeamento e retomada neste chat do Codex: leia primeiro [MAPEAMENTO_ATUAL.md](MAPEAMENTO_ATUAL.md). O encaminhamento ao Claude e a exclusividade anterior do Codex são históricos. As seções abaixo mantêm suas datas e podem ter sido superadas pelas entregas de 29 e 30/10; não representam nova consulta remota nem autorização para repetir comandos.

## Atualização de 28/10/2026: cartões dos profissionais

- Pedido do responsável, com captura: reunir foto e todas as informações em cartão único, destacar o conjunto no hover, personalizar contatos com logos, tornar métodos etiquetas pequenas com cores próprias e ajustar os espaçamentos.
- Cada profissional agora possui cartão branco com borda, cantos arredondados e destaque no conjunto ao passar o mouse ou usar um contato pelo teclado. Foto continua quadrada e alinhada ao alto; apresentação integral preservada.
- Botões mantêm os nomes visíveis e recebem logos de WhatsApp, Instagram, Facebook e envelope de e-mail; cores próprias e hover por contato. Destinos, abertura em nova aba, `rel` e textos acessíveis preservados. Nenhum contato externo foi acionado nos testes.
- Métodos com cores vinculadas ao nome, cinco variantes e fallback; fonte de 12 px e altura típica de 21 px. Paleta e medidas em tokens próprios, sem redefinir os valores existentes do site.
- Nome separado dos dados por 16 px; entrelinha das informações reduzida para 1,25. Removida a margem automática dos contatos: intervalo de 8 px após as tags, sem empurrar os botões ao rodapé.
- Navegador: 96 cartões e 241 contatos conferidos antes/depois, com dados e links idênticos; todos os contatos com SVG decorativo e área mínima de 44 px. Os cinco métodos aparecem com cores distintas.
- Responsividade conferida em 390, 768, 1024, 1280 e 1710 px, sem rolagem horizontal, etiquetas cortadas ou contatos fora dos cartões. Hover do cartão completo e foco visível por Tab verificados; filtro Fisioterapeutas preservado.
- TypeScript, ESLint dos componentes, Stylelint dos arquivos alterados e compilação isolada com Webpack aprovados. Contraste das novas cores verificado; revisão independente do diff sem problema concreto. Não foram adicionados testes que apenas espelhassem esta mudança de apresentação.
- Commit `8aa4f16`, somente quatro arquivos de apresentação. Deployment de produção `7395076667` concluído pelo fluxo existente GitHub-Vercel. Conferência pública anônima confirmou os 96 profissionais e 241 contatos com os mesmos dados/destinos, novo cartão branco, ícones e tags. Captura final da primeira linha de Fisioterapeutas salva, com o primeiro cartão em hover.

## Atualização de 28/10/2026: busca e títulos no desktop

- Pedido do responsável: tornar a tipografia também mais compacta no desktop e inserir busca no canto superior direito, alinhada ao subtítulo.
- Cabeçalho do blog em grade: título acima, subtítulo à esquerda e busca à direita a partir de 1024 px; abaixo disso, busca empilhada após o subtítulo.
- H1 do blog 15% menor no desktop; títulos dos cards desktop usam `--font-size-text-lg` (22,048 px em 1280 px e até 24 px). Os tamanhos móveis do título foram preservados. Prévias continuam limitadas a 120 caracteres e três linhas.
- Formulário GET acessível com rótulo e botão de lupa; busca por todas as palavras em título, resumo e corpo completo dos posts publicados, ignorando caixa e acentos. A busca é textual, sem interpretar expressões regulares.
- Parâmetro `busca` na URL; filtros de categoria conservam a busca, enviar conserva a categoria e limpar conserva somente a categoria. Há contagem de resultados e mensagem específica para nenhum resultado.
- Texto integral e banco preservados. Sem nova dependência. Regras puras em `src/lib/buscaBlog.ts` e seis testes novos.
- Validação: TypeScript, ESLint/Stylelint dos arquivos alterados e compilação isolada com Webpack aprovados; 23 testes pertinentes (busca, tópicos e Markdown) aprovados. Revisão independente identificou ajuste de foco da lupa, corrigido antes da publicação.
- Conferência no navegador em 390, 1024, 1280 e 1710 px sem rolagem horizontal; topo da busca coincide com o topo do subtítulo no desktop. Campo abaixo do subtítulo no celular. Enter, combinação com categoria, resultado vazio e limpeza verificados.
- Produção `f2742de`, deployment `7394644068`. No domínio público, busca “Schroth” retorna 22 posts, ou dez ao combinar “Exercícios e fisioterapia”; sem filtro, as 71 publicações continuam presentes. Commit contém somente os cinco arquivos do recurso; documentação anterior preservada.

## Ajuste de 28/10/2026: cards do blog

- Pedido do responsável, com captura de tela: reduzir um pouco o tamanho dos títulos dos cards e a quantidade de texto de prévia.
- Título dos cards reduzido em 15% sobre o token H3, incluindo no celular. Texto completo do título preservado.
- Prévias da listagem limitadas a 120 caracteres, com corte em palavra inteira e reticência quando necessário, além do limite visual de três linhas. A regra também abrange resumos importados longos.
- Conteúdo integral, resumos armazenados, banco, URLs e página individual do post preservados.
- Validação local no navegador: 390 e 1280 px, sem rolagem horizontal; 71 cards presentes, todas as prévias com até 120 caracteres e limite de três linhas. Primeiro título em 20,4 px no celular; post individual com texto completo (34 parágrafos no exemplo conferido).
- TypeScript, ESLint do arquivo alterado, Stylelint do card e compilação isolada com Webpack aprovados. Revisão independente do diff sem problema concreto.
- Commit `3ff75d9`: dois arquivos de implementação. Branches remotas `main` e `feature/midia-upload` atualizadas por avanço normal, sem força. Site público recarregado e novo título/prévia conferidos no navegador, inclusive pelo primeiro card da captura enviada.

## Atualização de 28/10/2026: publicações no site público

Esta atualização substitui o estado de rascunhos/publicação pendente descrito nas seções históricas abaixo.

- Pedido atual do responsável: tornar todos os posts e artigos cadastrados visíveis e catalogar individualmente os artigos, criando os tópicos necessários.
- Firebase conferido diretamente: **71 de 71 posts e cinco de cinco artigos publicados; zero rascunhos**. Os dois posts e um artigo de exemplo que já estavam publicados foram preservados.
- Os quatro artigos científicos foram examinados pelo título e catalogados em **Exercícios e fisioterapia (três)** e **Gestação e escoliose (um)**. Foram criadas essas duas categorias e 11 tags. Títulos, autores, textos, imagens, datas originais e marcações de revisão foram preservados. A categoria “A classificar” continua inativa.
- Um endereço duplicado dos posts de exemplo recebeu o sufixo `-2`, para que cada um dos 71 posts tenha um endereço distinto.
- Produção anterior confirmada: commit `207c9b1`, de setembro. A branch remota `main` foi avançada sem força para `10eaa9b`, versão já compilada com sucesso, pelo fluxo existente GitHub-Vercel. Deployment de produção `7390529358` concluído com sucesso. Domínio conferido: https://abte-lovat.vercel.app.
- Publicação e catalogação gravadas num único lote, com cópia dos campos anteriores, precondição por versão do documento e log por alteração. Execução `codex-publicacao-2026-10-28T16-03-04-145Z`.
- Verificação pública anônima: **88 páginas/filtros**, incluindo os 71 posts, cinco artigos, duas listas, três categorias de artigos em uso e sete filtros do blog. Todos os títulos/links/conjuntos conferidos; zero falhas HTTP ou de correspondência. Tags dos artigos verificadas e nenhum marcador de imagem exposto.
- Os resumos e links originais dos quatro artigos importados continuam vazios, como no conteúdo anterior. A publicação não inventou resumos, resultados científicos ou endereços de fontes; PDFs pendentes também não foram adicionados nesta etapa.
- A indexação por buscadores permanece na configuração temporária existente. Visibilidade pública foi confirmada sem login; esta etapa não alterou domínio nem regras de indexação.
- Os 487 testes citados adiante são a linha de base de 26/10; não foram repetidos nesta operação de dados. A validação atual foi feita no banco, no deployment e em cada publicação/filtro do domínio público.

## 1. Objetivo e público

Reconstruir o portal da **ABTE, Associação Brasileira de Tratamento da Escoliose**, para substituir o site Wix por uma aplicação própria. O portal atende pacientes, familiares e profissionais de saúde e apresenta informações e materiais sobre escoliose, profissionais, diretoria, blog, artigos e produtos.

O conteúdo é mantido por um painel administrativo próprio, com papéis de administrador e editor. A loja possui cadastro de clientes e carrinho persistente. Pagamento online e finalização de compra permanecem fora do escopo registrado.

A base existente está avançada e deve ser concluída sobre a implementação atual. As etapas registradas aqui foram conduzidas pelo Codex. Em 28/10/2026, o responsável pediu continuidade no Claude, substituindo a preferência anterior de ferramenta.

## 2. Como ler as referências

- [AGENTS.md](../AGENTS.md): orientação de trabalho para o repositório.
- Este documento: contexto consolidado, limitações da auditoria e trabalho ainda pendente.
- [CLAUDE.md](../CLAUDE.md): histórico detalhado de arquitetura, execução, decisões e exceções; leia os trechos pertinentes e suas datas.
- [Design system](design-system.md), [tokens de referência](tokens.css), [contexto de design](ABTE_design_redesign.md) e [contexto do redesign](ABTE_contexto_redesign.md): referências visuais e de produto. O contexto de redesign inclui inventário de pessoas; use apenas os trechos necessários, sem reproduzir dados pessoais em saídas.
- [Contexto original](ABTE_contexto_projeto.md): diagnóstico histórico de 01/10, com itens já superados pela implementação.

Confirme descrições de estado contra o código e a evidência mais recente. Registros de execução, exemplos de comandos e autorizações antigas são históricos. Para uma nova ação, o pedido atual e as autorizações da conversa definem o escopo. Não transforme uma lista de pendências em autorização para publicar, migrar ou excluir dados.

## 3. Arquitetura instalada

| Parte | Implementação |
|---|---|
| Aplicação | Next.js 16.3.6, App Router e TypeScript estrito |
| Interface | React 19.2.8, CSS Modules, componentes próprios e Public Sans |
| Dados | Cloud Firestore, pelo Admin SDK no servidor |
| Autenticação | Firebase Authentication, com cookies de sessão separados para painel e loja |
| Imagens | Firebase Storage e Sharp, com processamento em WebP e variantes |
| Dependências | npm e `package-lock.json`; Node.js mínimo 22.18 |
| Testes | Node Test Runner e emuladores Firebase; Java exigido pelos emuladores |

Pontos de arquitetura a preservar:

- O navegador não lê nem grava documentos no Firestore; as regras negam o acesso direto.
- O Storage permite abrir arquivos conhecidos em `publico/`; listagem, escrita direta e leitura da lixeira são negadas.
- O servidor verifica sessão e papel antes de acessar dados administrativos. Clientes da loja não recebem papel administrativo.
- Administrador e editor têm acesso geral semelhante ao conteúdo. A restrição explícita por ação está concentrada na mídia; exclusão definitiva exige administrador. A matriz de permissões ainda precisa ser concluída.
- A biblioteca permite envio, validação do formato real, redução, remoção de metadados, variantes WebP, texto alternativo, lixeira, restauração e exclusão definitiva.
- Os tokens usados pela aplicação ficam em `src/styles/tokens.css`. As decisões visuais de 25/10 incluem raio de 10 px e novas grades/cards. Há diferenças conhecidas em relação aos documentos visuais originais.

## 4. Mapa do código

| Caminho | Responsabilidade |
|---|---|
| `src/app/` | Rotas públicas, layouts e páginas |
| `src/app/admin/` | Login, páginas do painel e ações administrativas |
| `src/app/loja/` | Catálogo, produto, conta, autenticação e carrinho |
| `src/components/` | Componentes públicos e compartilhados |
| `src/config/` | Navegação e classificações de profissionais |
| `src/lib/firebase/`, `src/lib/auth/` | Firebase, sessões e acesso |
| `src/lib/dados/`, `src/lib/gravacao/` | Tipos, leitura e persistência |
| `src/lib/midia/` | Processamento, biblioteca e exibição de imagens |
| `src/lib/loja/` | Cadastro, contas e regras do carrinho |
| `src/lib/migracao/`, `scripts/` | Coleta, conversão, importação, conferência, publicação e reversão |
| `testes/unidade/`, `testes/regras/`, `testes/sessao/` | Suítes automatizadas |
| `docs/dados-privados/`, `tmp-migracao/` | Origem e relatórios da migração, fora do Git |

Rotas principais: `/`, `/profissionais`, `/diretoria`, `/blog`, `/blog/[slug]`, `/artigos`, `/artigos/[slug]`, `/artigos/categoria/[slug]`, `/contato`, `/loja`, `/loja/produto/[slug]`, páginas de conta/carrinho e `/admin`. `/doe` e `/seja-associado` são provisórias. As páginas legais também são preliminares. `/componentes` é uma página de revisão visual.

## 5. O que já existe

- Navegação pública, menu móvel, apresentação institucional e estrutura responsiva do site.
- Diretório de profissionais com fotos, contatos, ordenação e filtro por especialidade.
- Blog com categorias/tags, datas de publicação, Markdown restrito e imagens da biblioteca.
- Artigos com categorias, tags, autores, resumo e link original; diretoria agrupada por período.
- Loja com categorias, preços em centavos, promoção, galeria e relacionados.
- Cadastro/login, recuperação de senha, conta de cliente e carrinho com quantidade, disponibilidade e preços conferidos no servidor.
- Painel de posts, artigos, profissionais, produtos, tópicos e mídia. Logs e lixeira existem em partes do sistema.
- Scripts de migração com simulação padrão, verificação de projeto, idempotência e reversão.

Isso representa implementação identificada no código. Não significa que todos os fluxos tenham sido validados em navegador ou em produção nesta auditoria.

## 6. Migração: evidência local até 25/10/2026

**Registro histórico:** a situação de rascunhos/simulação abaixo era a de 25/10. Em 28/10, a conferência remota e a publicação foram executadas, como registrado no início deste documento; todos os posts e artigos cadastrados estão visíveis.

A importação já foi executada no `abte-dev`, em 23/10. Houve publicação parcial depois e classificação/organização em 25/10. **Não reiniciar a migração completa por considerar a importação pendente.**

| Conteúdo importado | Quantidade | Última situação registrada localmente |
|---|---:|---|
| Imagens | 267 | Importadas |
| Profissionais | 96 | Ativados na publicação parcial |
| Produtos | 9 | Publicados na publicação parcial |
| Posts | 69 | Importados/classificados; publicação apenas simulada |
| Artigos | 4 | Títulos/autores organizados; publicação apenas simulada |
| Diretoria | 7 | Ativados na publicação parcial |
| Categorias de posts | 7 | Criadas e aplicadas aos posts |

As quantidades se referem ao conteúdo importado; algumas coleções também possuíam documentos anteriores de exemplo. A publicação parcial registrada ativou 113 documentos. A simulação mais recente mostrava 69 posts e quatro artigos a publicar. Nenhuma leitura do banco remoto foi feita na auditoria inicial de 26/10; a leitura e a execução de publicação ocorreram depois, em 28/10, conforme os registros acima.

Pendências editoriais e de preservação:

- Uma capa GIF e uma imagem interna AVIF foram recusadas; falta resolver sua apresentação.
- Há 79 profissionais sinalizados para revisão, com 186 pontos no conjunto de origem.
- Posts e artigos seguem com marcação de revisão; há 29 sugestões de autoria de posts a conferir.
- A conferência das imagens importadas e das descrições alternativas ainda precisa ser fechada.
- Treze PDFs ficaram fora: oito de artigos e cinco de cartilhas. O modelo atual não possui campos próprios para esses arquivos.
- Doze páginas antigas foram convertidas só para conferência, sem importação. Cinco páginas ficaram fora da coleta. História institucional, triagem e cartilha precisam de destino definido na nova estrutura.
- Há 131 propostas únicas de redirecionamentos, desativadas no arquivo gerado; a aplicação ainda não as aplica.
- Os quatro artigos já receberam títulos reais/autores em 25/10. “A classificar” foi desativada. Publicar indiscriminadamente todas as categorias pode reativá-la.

O histórico informa que uma versão antiga de produção compartilhava `abte-dev`. Isso não foi revalidado remotamente. A versão publicada, o banco e a sequência de atualização/publicação precisam ser conferidos antes de promover conteúdo.

## 7. Pendências técnicas e funcionais

| Prioridade de trabalho | Problema | Evidência no código |
|---|---|---|
| Estabilização | Contato mostra sucesso sem enviar nem armazenar a mensagem | `src/components/BlocoContato/BlocoContato.tsx` |
| Estabilização | Exclusão de cliente apaga documento/carrinho antes do Auth; falha na última chamada deixa conta sem repetição normal pela interface | `src/lib/loja/contas.ts` |
| Estabilização | Campos obrigatórios de posts/artigos e URL do artigo precisam de validação no servidor | `src/app/admin/acoes-conteudo.ts`, `src/lib/validacao.ts` |
| Estabilização | Resumo persistido de post importado não acompanha a edição do corpo nem possui edição no painel | `src/app/blog/page.tsx`, `src/app/admin/_componentes/FormularioPost/` |
| Estabilização | Exclusão de tópico verifica uso fora da transação, com janela para concorrência | `src/lib/gravacao/topicos.ts` |
| Operação | Faltam usuários/papéis, configurações, gestão da diretoria e tela de histórico | `src/app/admin/` |
| Operação | Logs de alterações e fluxos de lixeira ainda não cobrem todos os tipos de conteúdo | `src/lib/gravacao/`, `src/lib/log/` |
| Operação | Painel sem adaptação móvel correspondente à barra lateral fixa de 280 px | `src/app/admin/_componentes/LayoutPainel/` |
| Experiência | Home com imagens/vídeo provisórios e números a confirmar | `src/app/page.tsx` |
| Experiência | Carrossel sem pausa visível; filtros sem anúncio completo de seleção; saltos de níveis de títulos | `src/components/Hero/`, `src/app/profissionais/` |
| Experiência | Diretoria sem link na navegação; “Mais lidos da semana” não mede leituras | `src/config/navegacao.ts`, `src/app/artigos/page.tsx` |
| Fluxos | Cadastro sem controle de frequência localizado na aplicação; recuperação de senha mascara erros de serviço como sucesso, exceto erro de conexão já tratado | `src/lib/loja/cadastro.ts`, `src/components/FormularioRecuperarSenha/` |
| Institucional | Contato real, associação, doação, política/termos e consentimento definitivos | Páginas públicas e `src/lib/loja/contas.ts` |
| Lançamento | Redirecionamentos, sitemap, metadados, produção/domínio e liberação de indexação | `next.config.ts`, `src/app/layout.tsx`, `src/app/robots.ts` |

Existem três variáveis de estilo usadas sem definição: `--space-12`, `--font-size-base` e `--color-text-muted`.

A conta e o carrinho não geram pedidos ou pagamentos. Não adicionar checkout, Stripe, cobranças ou webhooks sem mudança de escopo solicitada pelo responsável. Pix, regras de associação, contatos oficiais, números, textos legais e autorizações de imagem dependem de informações reais; não preencher por suposição.

## 8. Linha de base verificada em 26/10/2026

| Verificação | Resultado |
|---|---|
| TypeScript | Passou |
| ESLint | Zero erros e quatro avisos de imagens |
| Stylelint | Sete violações: uma em Botao, duas em Hero e quatro em Modal |
| Unidade | 269 de 269 aprovados |
| Regras Firestore/Storage | 91 de 91 aprovados |
| Sessões/persistência/migração | 127 de 127 aprovados |
| Compilação | Passou em cópia isolada, com Webpack |

Total: **487 testes aprovados**. Não é uma nova execução em 27/10, nem uma declaração de que todos os problemas listados têm cobertura. A falha parcial de exclusão da conta foi reproduzida com serviços fictícios em memória.

A compilação padrão com Turbopack não foi validada na cópia isolada que compartilhou dependências por ligação local. Portas locais e download da fonte exigiram acesso fora da restrição inicial do ambiente. A execução posterior passou. Em mudanças futuras, execute o comando adequado no ambiente real de trabalho e registre seu resultado.

Na auditoria inicial de 26/10 não houve nova revisão visual nem consulta aos serviços remotos. Depois, em 28/10, foram conferidos banco, deployments, publicações e as alterações de interface no navegador, inclusive busca e teclado, conforme os registros acima. Não foi identificada suíte automatizada de navegador. A validação completa de autenticação/conta/painel e por leitor de tela continua pendente.

## 9. Comandos disponíveis

```sh
npm run dev
npm run typecheck
npm run lint
npm run lint:css
npm run test:unidade
npm run test:regras
npm run test:sessao
npm run build
```

`dev` inicia o site local. `build` precisa obter a fonte Public Sans no processo de compilação. Testes de regras/sessão exigem Java e usam projetos demonstrativos nos emuladores. Para verificações somente leitura de tipos sem atualizar cache, use `npm run typecheck -- --incremental false`.

As variáveis são descritas em `.env.example`; os valores reais ficam fora do Git. Não copiar credenciais nem dados privados para documentação, saídas de terminal, commits ou testes. Os relatórios de `tmp-migracao/` e a origem de `docs/dados-privados/` também permanecem fora do Git.

## 10. Sequência de continuidade

1. **Estabilizar fluxos existentes:** contato, exclusão de conta, validação de conteúdo, resumo, concorrência e estilos.
2. **Completar a operação:** painel móvel, usuários/papéis, configurações, diretoria e histórico.
3. **Fechar conteúdo:** revisão dos importados, imagens recusadas, autoria, PDFs e páginas antigas.
4. **Fechar fluxos institucionais:** associação, doação, dados oficiais, textos legais e consentimento.
5. **Revisar a versão completa:** site público, painel, contas e carrinho em diferentes telas e com teclado.
6. **Preparar lançamento:** ambiente, domínio, SEO, redirecionamentos e publicação coordenada do site/conteúdo.

Esta sequência é o plano de continuidade proposto. Os itens não devem ser apresentados como concluídos antes da implementação e da validação. Ao avançar no escopo solicitado pelo responsável, use a base existente e mantenha este documento atualizado com o que foi efetivamente concluído e testado.

## 11. Estado do repositório e registro desta etapa

- Em 27/10, o código-base era `10eaa9b`. Em 28/10, a branch de trabalho e as referências remotas chegaram a `8aa4f16`; a `main` local continua antiga. Consulte `CONTINUIDADE_CLAUDE.md` para o estado de retomada.
- Na auditoria de 26/10, a referência remota local `origin/feature/midia-upload` continha esse commit. Não houve sincronização com o servidor para afirmar o estado remoto atual.
- Auditoria inicial: 257 arquivos em `src`, 39 arquivos de páginas e 46 arquivos de testes.
- **27/10/2026, contextualização do Codex:** instruções acrescentadas em `AGENTS.md`, criação deste documento e atualização do README. Sem alteração de lógica, credenciais, dados ou ambiente publicado. Verificação: revisão do diff e do conteúdo por outro agente, links resolvidos e bloco gerado pelo Next.js preservado byte a byte.
- Próximo trabalho concreto proposto: estabilizar contato e exclusão de conta. O serviço/destinatário do contato ainda precisa ser identificado ou definido.
