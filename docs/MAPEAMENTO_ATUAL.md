# ABTE — mapeamento atual e continuidade

**Revisão: 30/10/2026. Código analisado: `1a19af4`.** Este é o ponto de entrada atual do projeto. Para as correções posteriores, veja o registro de retomada ao fim deste arquivo. Reúne a implementação existente, as entregas anteriores, o estado conferido de produção e as pendências. Registros antigos permanecem como histórico, com suas respectivas datas.

## 1. Continuidade e objetivo

Em 30/10, o responsável pediu: “refaça o mapeamento de tudo o que foi feito e vamos prosseguir aqui”. A continuidade voltou a este chat no Codex, substituindo o encaminhamento ao Claude de 28/10. Não há exigência permanente de assistente exclusivo: vale o pedido humano mais recente.

O projeto reconstrói o portal da **ABTE, Associação Brasileira de Tratamento da Escoliose**, para substituir o Wix por site e painel próprios. O público inclui pacientes, familiares e profissionais de saúde. O responsável acompanha por revisão visual e capturas; comunicar em português claro.

Este remapeamento revisou o histórico, a documentação, as áreas públicas e administrativas, a arquitetura e os testes. Não publicou código, não executou migrações, não alterou dados reais e não configurou infraestrutura. As alterações desta etapa são de documentação.

## 2. Estado do código, GitHub e produção

| Referência | Estado conferido em 30/10 |
|---|---|
| Repositório | `gusttavopapini/abte` |
| Site público | [abte-lovat.vercel.app](https://abte-lovat.vercel.app) |
| Branch local de trabalho | `feature/midia-upload`, HEAD `1a19af438b5f436f442f001bfbdb89914ba03840` |
| Branch remota de trabalho | `f9b16509b8e6d88cb9fd953c2b3a13d15672bcb8` |
| `main` remota | `dfe8d8d998df45c6d65f0d8b3de040035f8a674c` |
| Último deployment de Produção no GitHub | `7449312744`, `success`, código `dfe8d8d`, criado em 30/10 às 18h34 de Recife |
| `main` local | `207c9b1`, 203 commits atrás da referência remota |
| Árvore antes deste remapeamento | Limpa; as cinco implementações locais já estavam em commits |

Branches remotas e deployment foram consultados diretamente no GitHub, sem `fetch`, push ou promoção. HEAD está seis commits à frente da `main` remota: um registro de documentação e **cinco commits de implementação ainda locais**. Esses cinco commits não estão na produção conferida.

**Não partir da `main` local antiga nem promovê-la.** Antes de editar ou publicar, reconferir Git e mudanças concorrentes. Os documentos atualizados nesta revisão ficam inicialmente sem commit.

### Cinco implementações locais posteriores à produção

| Commit | O que existe no HEAD |
|---|---|
| `58ab0ca` | Validador compartilhado dos links do banner, opções de páginas, mensagens de erro que somem ao corrigir os campos |
| `433388a` | Texto do banner alinhado ao container/logo, título menor e ajuste para manter palavras inteiras |
| `6564aae` | Botão Configurações do site em todo o painel, com formulário compartilhado em modal, só para administrador |
| `334dbf9` | Vídeo com capa e play central, capa automática do YouTube, suporte a `/live/`, envio retomável até 1 GB em partes de 8 MB |
| `1a19af4` | Modal renderizado no `body` por portal, foco inicial sem campos escondidos e Escape tratado pela janela superior |

## 3. Conferência pública desta revisão

Leitura anônima por HTTP do domínio público, sem login nem envio de formulários:

| Página | Resultado |
|---|---|
| Home, blog, artigos, profissionais, loja, diretoria, contato, doação e associação | HTTP 200, um H1 por página |
| Blog | 71 links distintos de posts na listagem |
| Artigos | Cinco links distintos de artigos na listagem |
| Loja | Nove links distintos de produtos na listagem |
| Privacidade, termos e acessibilidade | HTTP 404; páginas ainda não publicadas no novo modelo |
| `/admin/home` e `/admin/configuracoes`, sem sessão | Redirecionam ao login |
| `/doe` | Sem botão “Copiar chave” no HTML público conferido |
| `robots.txt` e metadados | Continuam bloqueando indexação (`Disallow: /`, `noindex, nofollow`) |

Essa conferência confirma acessibilidade e listagens no momento da leitura. Não equivale a conferir novamente cada detalhe das 71 publicações, a todos os filtros ou às interações visuais. A verificação completa de 88 páginas/filtros registrada em 28/10 continua sendo evidência daquela data. Não foram lidos documentos privados do Firebase nesta revisão.

## 4. Arquitetura e organização

| Camada | Implementação |
|---|---|
| Aplicação | Next.js 16.3.6, App Router, React 19.2.8, TypeScript estrito |
| Interface | CSS Modules, componentes próprios, Public Sans, tokens em `src/styles/tokens.css`; sem kit pronto de UI |
| Identidade e dados | Firebase Authentication, Firestore e Storage; Admin SDK no servidor |
| Imagens | Sharp, WebP e variantes de tamanho; biblioteca com alt, origem, uso e lixeira |
| Sessões | Cookie do painel separado do cookie de cliente da loja; validação no servidor e checagem de revogação |
| Ferramentas | npm e lockfile; Node mínimo 22.18; Java para emuladores |
| Inventário atual | 335 arquivos em `src`, 43 arquivos `page.tsx`, 66 arquivos de testes e 18 scripts |

Firestore nega acesso direto do navegador, inclusive de administradores. Ações administrativas verificam sessão e papel antes de ler/gravar. O SDK web é usado para autenticação, sem oferecer acesso direto às coleções.

**Imagens** são processadas e enviadas pelo servidor. **Vídeos** têm uma exceção deliberada: o servidor autoriza um caminho específico por política assinada ou sessão retomável, e o navegador envia o arquivo diretamente ao bucket. As regras continuam negando escrita genérica. Não reintroduzir a afirmação antiga de que nenhum arquivo pode ser enviado do navegador ao Storage.

Papéis atuais: administrador e editor gerenciam conteúdo e home/vídeo. Configurações do site, páginas institucionais e exclusão definitiva de mídia são restritas ao administrador. Cliente da loja não recebe papel do painel.

Pastas principais:

- `src/app/`: páginas públicas, painel, ações de servidor e loja.
- `src/components/`: componentes públicos compartilhados, incluindo Hero, Modal, cards, vídeo e Pix.
- `src/app/admin/_componentes/`: formulários, tabelas, imagem do item, configurações e estrutura do painel.
- `src/lib/dados/`: leituras tipadas e caches de configurações/páginas.
- `src/lib/gravacao/`: gravações, validações de referências e transações.
- `src/lib/auth/`: sessões, cookies, papéis e permissões.
- `src/lib/midia/`: processamento, regras, dono, variantes e biblioteca.
- `src/lib/site/`: regras de home, banners, vídeo, âncoras, configurações e páginas.
- `src/lib/loja/`: conta e carrinho; `src/lib/filtrosDaLoja.ts`: filtros e URL.
- `src/lib/migracao/` e `scripts/`: importação, conferência e operações auxiliares.
- `testes/unidade`, `testes/regras`, `testes/sessao`: testes puros e com emuladores.

Coleções centrais: posts, artigos, profissionais, diretoria, produtos, classificações de cada área, midias, clientes, carrinhos, logAlteracoes, configuracoes (`home` e `site`) e paginasInstitucionais.

Segredos e dados privados permanecem fora do Git: `.env*` (exceto modelo), `docs/dados-privados/` e `tmp-migracao/`. Não copiar valores para relatórios. O portal publicado usa o ambiente de desenvolvimento documentado; a preparação do ambiente institucional de produção continua separada do deploy do código.

## 5. O que já está implementado

### Site e home

- Header responsivo, menus de profissionais, rodapé, layouts e estados de página.
- Cabeçalhos das páginas internas centralizados, ritmo vertical compartilhado e sistema de hover sem sublinhado.
- Banner de tela cheia com ponto de foco; até oito slides administráveis, ordem e ativação.
- Imagens de banner para computador, tablet e celular, com substituição quando faltar uma versão.
- Título, trecho em destaque, subtítulo, posição do texto, botão e destino: página, URL externa ou seção da home.
- Imagens de Mutirões e Faça parte com versões computador/celular e reutilização da biblioteca.
- Quem Somos com missão, visão e valores; vídeo vertical por arquivo ou YouTube.
- Produtos em destaque: até quatro elegíveis; seção não aparece quando não houver produtos válidos.
- Diretoria pública agrupada por período. O link no menu/rodapé segue pendência de decisão histórica.

Home configurável não significa conteúdo final preenchido. Imagens, textos, vídeo e números institucionais devem ser conferidos com a ABTE.

### Blog e artigos

- Posts com conteúdo integral, Markdown restrito, capa, categorias, tags e páginas individuais.
- Títulos menores, prévia limitada a 120 caracteres em palavra inteira e até três linhas.
- Busca do blog por título, resumo e corpo, com todas as palavras, sem distinção de acentos/caixa; categoria e busca se preservam na URL.
- Artigos com autores, imagem, resumo/link quando preenchidos e classificação temática.
- Cards de artigos padronizados; retirada da data de importação e do rótulo de ranking sem medição.
- Administrador pode desativar Artigos em `configuracoes/site`: menus e links somem e as rotas de lista, detalhes e categorias retornam 404. **Atualmente, a listagem pública conferida está ativa.**

Em 28/10 foram publicados 69 posts e quatro artigos que ainda eram rascunhos; os dois posts e o artigo de exemplo anteriores foram preservados. Resultado naquela conferência: 71 posts e cinco artigos, sem rascunhos. Foram criadas duas categorias temáticas e 11 tags para os quatro artigos científicos: três em Exercícios e fisioterapia e um em Gestação e escoliose. Um slug duplicado de exemplo recebeu `-2`.

Os quatro artigos importados não ganharam textos científicos, resumos ou links de origem inventados. Na última conferência editorial registrada, resumo textual e URL de origem desses quatro ainda faltavam. Cinco artigos cadastrados incluem um exemplo; não significam cinco científicos.

### Profissionais

- Cards únicos com foto, nome, registro, localização, telerreabilitação, etiquetas pequenas por método e contatos com ícones/cores.
- Apresentação curta de até 140 caracteres; card/Ver mais abre popup com dados e texto completo.
- Lista fechada dos campos públicos enviados ao navegador, preservando campos internos.
- Filtro por tipo de profissional. Busca por nome/local/método ainda não existe.
- Em 28/10 foram conferidos 96 profissionais e 241 contatos antes/depois dos ajustes, sem mudança dos destinos; números não recontados no banco nesta revisão.

### Loja

- Catálogo, páginas de produto, galeria, preço, desconto, selos, disponibilidade e relacionados.
- Filtros por busca, categoria, físico/digital, disponibilidade, preço, promoção, selos e ordem; contagens e etiquetas; estado compartilhável pela URL.
- Barra lateral no desktop e painel no celular/tablet; grade final de até quatro colunas.
- Menu flutuante com Produtos, Carrinho e Entrar/Minha conta, coordenado com o botão móvel de filtros.
- Cadastro/login/recuperação de senha, conta de cliente e carrinho persistido na conta.
- Carrinho guarda id/quantidade; preço e disponibilidade são lidos no servidor.

**Não há checkout, pagamento online, pedidos, cupons ou webhooks.** O botão de finalizar segue indisponível. Stripe aparece como decisão futura. A descrição antiga “só vitrine” foi superada pela conta/carrinho, sem autorizar pagamento.

### Associação, doação, legais e contato

- Associação tem Google Forms separados para médicos e fisioterapeutas, definidos por decisão provisória de 30/10.
- Pix estático pode ser preenchido pelo administrador: tipo, chave, favorecido e orientação. Há cópia da chave; sem QR Code, gateway ou registro automático de doações.
- Privacidade, termos e acessibilidade podem ser editados em Markdown restrito e publicados pelo painel. Sem publicação, ficam fora do rodapé e retornam 404. Publicação sem corpo usa o texto preliminar anterior; com corpo vale o conteúdo do painel.
- Contato tem formulário e consentimento visual, mas o envio real ainda não está implementado.

### Painel e biblioteca

- Login e acesso por papel; painel responsivo com lateral no desktop e gaveta no celular.
- Visão geral, busca/filtro de situação nas tabelas, estados vazios, trilhas e mensagens em português.
- Formulários divididos em seções, contadores, barra de salvar e aviso ao sair com alterações.
- Gestão de posts/artigos/classificações, profissionais, produtos/categorias e biblioteca de imagens.
- Envio de imagem no próprio cadastro, alt obrigatório, aviso de menores, reordenação de galeria e reutilização de imagens.
- Vínculo `dono` da mídia ao item/campo; biblioteca mostra enviada por/usada em e filtra o tipo de item.
- `/admin/home`, `/admin/configuracoes`, `/admin/paginas` e editor por slug.
- Lixeira/restauração e exclusão definitiva de mídia com restrição de papel; ferramentas de conferência de órfãs.
- Configurações e páginas usam cache com etiquetas, `updateTag` e revalidação para refletir salvamento na primeira visita.
- Logs já cobrem algumas áreas, incluindo home/configurações/páginas/mídia/profissionais/categorias de artigos e categorias de posts; cobertura ainda não é geral.

## 6. Linha do tempo consolidada

| Data | Entregas principais |
|---|---|
| 02–25/10 | Base própria, autenticação, painel/conteúdo/mídia, loja com conta/carrinho, páginas dinâmicas e migração do Wix |
| 26/10 | Auditoria ampla, 487 testes aprovados na época, diagnóstico e backlog |
| 27/10 | Contextualização em AGENTS, README e contexto do Codex |
| 28/10 | Publicação/catalogação; cards e busca do blog; cards e popup dos profissionais; produtos em destaque e card de produto |
| 29/10 | Filtros da loja, quatro colunas, menu flutuante; reformulação de home/cabeçalhos/artigos e espaçamento |
| 29–30/10 | Hover global; imagens enviadas por item; home administrável; revisão móvel e de usabilidade do painel |
| 30/10 | Versões responsivas de imagens, foco/banner de tela cheia; associação por Forms; Artigos opcional; Pix; páginas editáveis; texto/âncoras nos banners; vídeo administrável |
| Após última promoção de 30/10 | Cinco commits locais de banner, configurações em modal, vídeo com capa/1 GB e correção do Modal |
| Este remapeamento | Reconferência do código/GitHub/site/testes, reprodução de perda da confirmação do vídeo e atualização de contexto; sem promoção ou mudança de dados |

Desde `8aa4f16`, o histórico revisado tem 69 commits (incluindo documentação). As entregas foram promovidas em lotes; a última promoção foi `dfe8d8d`. Não confundir cada registro antigo “sem promover” com o estado final depois da promoção posterior.

## 7. Migração: concluído e pendente

Relatórios de execução anteriores registram 267 mídias, 96 profissionais, nove produtos, 69 posts, quatro artigos e sete membros da diretoria importados. Há conteúdo de exemplo adicional. Classificação dos posts e títulos/autores dos artigos foram tratados antes da publicação de 28/10.

**Não repetir importação, publicação ou classificação automaticamente.** A revisão atual não executou scripts operacionais. Comandos de execução/reversão no histórico são referências, não autorizações atuais.

Pendências históricas ainda não encerradas por evidência nova: 13 PDFs (oito de artigos e cinco de folhetos), uma capa GIF e uma imagem de corpo AVIF recusadas, páginas institucionais antigas apenas convertidas para referência e 131 redirecionamentos propostos ainda não ativados. Revisões editoriais e de autoria/menores permanecem separadas da publicação técnica.

## 8. Problemas confirmados e trabalho restante

### Prioridade imediata: estabilizar o código local antes de promover

1. **Confirmação de menores no vídeo:** `src/lib/gravacao/videoQuemSomos.ts`, função `salvarVideoQuemSomos`, substitui o objeto inteiro, mas só acrescenta autor/data quando a marcação muda de falso para verdadeiro. Reprodução com a função real e Firestore em memória confirmou: primeira gravação preserva a confirmação; segunda gravação do mesmo vídeo apaga autor/data. Trocar a fonte mantendo a marcação também não recria o registro. Corrigir a preservação e definir tratamento de nova fonte; cobrir com teste de comportamento.
2. **Teste desatualizado de vídeo:** `testes/sessao/video-quem-somos.test.mts:75` ainda espera 60 MB na política, enquanto o código atual aceita 1 GB. Ajustar a expectativa ao requisito aprovado e preservar testes reais de limite/recusa. Não reduzir o limite apenas para fazer o teste passar.
3. **Envio real de vídeo e CORS:** `docs/infra/cors.json` contém POST/PUT/DELETE para o fluxo atual. A configuração efetiva do bucket não foi conferida/aplicada nesta revisão. Validar em ambiente apropriado antes de declarar upload em produção pronto. YouTube independe desse upload.
4. **Revisão visual dos cinco commits locais:** compilação/testes não substituem interação no navegador; conferir banner, modal global/aninhado, foco/Escape, capa e envio/cancelamento/retomada antes da promoção.

### Correções funcionais antigas que continuam no código

| Problema | Local principal e consequência |
|---|---|
| Contato com falso sucesso | `src/components/BlocoContato/BlocoContato.tsx:61`: apenas muda o estado para enviado; não envia nem grava. Serviço/destinatário ainda precisam de definição |
| Exclusão parcial de cliente | `src/lib/loja/contas.ts:54`: apaga carrinho e documento antes do Authentication; falha final deixa login órfão, e a sessão exige o documento ausente |
| Validação incompleta no servidor | `src/app/admin/acoes-conteudo.ts:38`: leitor limita tipo/tamanho, mas não exige efetivamente título e corpo obrigatório de post; link do artigo sem validação de protocolo |
| Resumo antigo do post | `src/lib/gravacao/posts.ts:77`: editar corpo não recalcula o resumo persistido; limitar a prévia visual não resolveu esse dado editorial |
| Exclusão de tópico concorrente | `src/lib/gravacao/topicos.ts:195`: verifica uso antes da transação; outro cadastro pode passar a usar o tópico nesse intervalo |
| Recuperação de senha | `src/components/FormularioRecuperarSenha/FormularioRecuperarSenha.tsx:47`: mascara falhas operacionais além de usuário inexistente, exceto erro de rede |

### Recursos ainda incompletos

- Gestão de usuários/papéis, diretoria pelo painel e visualizador de logs.
- Logs das gravações de posts, artigos, produtos, tags e categorias de produto.
- Excluir/restaurar posts e artigos pelo painel.
- Filtros/busca de profissionais por nome, estado/cidade e método; estado acessível do filtro atual (`aria-pressed`).
- Pausa visível e persistente do carrossel; hoje pausa por mouse/foco/aba oculta/movimento reduzido.
- Vídeos antigos/removidos fora da coleção de imagens: o script de órfãs não cobre `publico/videos/`; definir limpeza e retenção.
- Verificação do vídeo usa tamanho/tipo dos metadados; não equivale a analisar assinatura e codec do conteúdo.
- Sinalização de subitem ativo de profissionais por `?tag=` e pequena inconsistência de metadata da doação (“Em breve” mesmo com Pix configurado).

### Conteúdo, decisões e lançamento

- Publicar textos legais revisados pela ABTE; hoje as três páginas públicas retornam 404 por configuração.
- Receber/preencher dados oficiais do Pix; confirmar associação e seus formulários.
- Conferir vídeo/capas/legendas, imagens e autorização de uso/menores; atualizar política se usar serviços externos.
- Confirmar números institucionais e conteúdo de exemplo; não inventar nem excluir exemplos sem pedido.
- Completar revisão editorial dos profissionais, autoria dos posts e fontes/resumos/PDFs dos artigos.
- Preparar domínio, ambiente Firebase institucional, backups/monitoramento/custos, metadados/sitemap e redirecionamentos.
- Remover bloqueio de indexação somente na etapa de lançamento autorizada. Site acessível publicamente continua fora dos buscadores por decisão temporária.
- Checkout, pagamentos online e doações com gateway continuam fora do escopo atual.

## 9. Verificações desta revisão

**Data: 30/10.** TypeScript e linters executados no projeto; testes e build adicional em cópia isolada de arquivos versionados, sem `.env`, credenciais ou dados de migração. Emuladores somente com projetos `demo-*`.

| Verificação | Resultado |
|---|---|
| TypeScript (`--incremental false`) | Aprovado |
| Unidade | 425/425 aprovados |
| Regras Firestore/Storage | 103/103 aprovados |
| Sessão/integração | 158/159 aprovados; uma falha na expectativa antiga de 60 MB do teste de vídeo |
| ESLint | Zero erros; três avisos de imagens em `src` e um aviso de variável em script local ignorado de `tmp-migracao` |
| Stylelint | Cinco erros conhecidos: Botao (uma cor literal) e Modal (duas cores e dois tamanhos de fonte); não corrigidos nesta revisão |
| Build | Webpack aprovado em cópia sem credenciais; leituras de configuração no pré-render usaram fallback, com mensagens de credenciais ausentes. Não valida conteúdo real ou upload remoto |
| Produção | GitHub e 15 endereços públicos/administrativos por HTTP; sem testes visuais/interativos novos |
| Novo achado de vídeo | Reproduzido com função real e mock em memória; sem banco/bucket/rede |

A primeira tentativa de unidade não pôde concluir o teste de servidor HTTP por restrição de porta local; foi encerrada e substituída pela execução isolada aprovada. A primeira execução combinada de integração usou um projeto demo diferente do previsto no login e teve falhas de ambiente; a suíte de sessões foi repetida com `demo-abte-sessao`. Não atribuir essas falhas de configuração à aplicação.

Os números históricos 487 (26/10) e 674 (última promoção) não representam o resultado do HEAD atual. Resultado atual: **686 testes aprovados e um reprovado, de 687 executados**, sem contar duas vezes as repetições de ambiente. O teste de limite de vídeo falhou; a perda da confirmação também foi reproduzida separadamente.

## 10. Ordem de continuidade

1. Corrigir preservação da confirmação do vídeo e alinhar o teste ao limite de 1 GB.
2. Conferir o fluxo de vídeo/CORS e os cinco commits locais no navegador; só então preparar uma promoção concreta para revisão.
3. Corrigir exclusão parcial da conta e validações no servidor; tratar resumo e concorrência de tópicos com testes pertinentes.
4. Implementar o envio real do contato depois de definida a entrega, sem continuar informando sucesso sem envio.
5. Finalizar conteúdo/legal/Pix/editorial e os recursos administrativos necessários ao lançamento.
6. Preparar ambiente institucional, domínio, SEO e operação. Pagamentos ficam para mudança explícita de escopo.

Antes de trabalhar, conferir `git status` e a branch. Preservar alterações locais, não reimportar dados, não executar comandos históricos de promoção/reversão. Usar a documentação instalada do Next.js pertinente à mudança e atualizar este mapa ao concluir cada etapa.

## 11. Documentos e evidências

- `AGENTS.md`: convenções de trabalho e bloco gerenciado do Next.js.
- `CLAUDE.md`: histórico detalhado datado; nome do arquivo não determina o assistente.
- `docs/CONTEXTO_CODEX.md`: auditoria/contextualização inicial e entregas de 28/10.
- `docs/CONTINUIDADE_CLAUDE.md`: resumo histórico da transferência anterior, com trechos superados por este mapa.
- Documentos de design e tokens: referências com exceções posteriores registradas; não restaurar regras antigas automaticamente.
- Relatórios públicos anteriores: diagnóstico de 26/10, publicação de 28/10 e capturas dos cards/busca.
- Evidências desta revisão no workspace: `work/remapeamento-2026-10-30/` (logs de unidade, integração, sessão e build; resposta pública resumida; reprodução da confirmação do vídeo). Não incluem credenciais.

O projeto tem base funcional ampla e conteúdo público, mas ainda precisa de estabilização, conteúdo oficial e preparação de lançamento. Publicação de posts ou sucesso de deployment não significam conclusão do projeto inteiro.


## Retomada no Codex em 30/10/2026: ajustes A a D

Continuidade a partir de `1a19af4`, preservando os cinco commits locais anteriores. Nenhuma migração, gravação no abte-dev, alteração de regras ou configuração do bucket executada nesta etapa.

- A: `/blog` já era aceito; mensagens antigas e campos confusos foram tratados no commit anterior. Nesta retomada, validador compartilhado recusa HTTPS malformado e escapes percentuais inválidos; erro de botão sem destino passa ao campo de link. Testes ampliados.
- B: mesma `.container` do cabeçalho e Hero, agora com safe-area; coluna respeita metade do espaço no desktop; piso de 24px e atualização ao redimensionar a altura. Prévia usa unidades relativas à tela virtual. Medidas de 390/768/1024/1280/1440/1710: título 30/41,38/49,09/50,4/56/69,74px. Diferença logo/texto 0px também em1536 e1600; nenhuma palavra partida, conjunto dentro do Hero e sem rolagem lateral. Em1024, o título longo conferido ocupa cinco linhas: não foi cortado para impor quatro. O alinhamento central/direito e o segundo título do roteiro ainda não receberam nova medição nesta retomada.
- C: botão de configurações movido da lateral para barra superior no desktop; gaveta móvel preservada. Cancelar Pix restaura os quatro campos da última gravação bem-sucedida. Ligar/desligar Artigos,404/200, menus, modal aninhado e Escape conferidos em emulador. `/artigos` não tem filtros nem paginação; não foram criados. Sitemap ainda ausente.
- D: limite único de1GB preservado e teste antigo de60MB atualizado. Gravação conserva autor/data da confirmação de menores em edições da mesma fonte e renova ao trocar a fonte; desmarcar remove os campos. Novo teste de regressão. Capa automática avisa quando o recorte difere de9:16. Play central: diferença inferior a1px nas seis larguras; zero chamadas YouTube/ytimg antes do clique; aviso de1GB e prévias do painel conferidos. Upload real do bucket depende de CORS e não foi executado.

Verificações:426 unidade,160 sessão e103 regras aprovados (689); typecheck e buildWebpack aprovados. ESLint sem erros, três avisos de imagens no código e um aviso no roteiro local ignorado. Stylelint mantém os cinco erros conhecidos em Botao/Modal, sem novos. Navegador:42/42 verificações de interação; oito medidas do Hero com dados fictícios. Evidências no workspace da tarefa, pasta `work/retomada-ajustes-2026-10-30/`.

CORS não executado: `gcloud storage buckets update gs://NOME_DO_BUCKET --cors-file=docs/infra/cors.json`. Substituir pelo bucket correto antes de executar. Sem segredos no relatório. Código desta retomada não promovido; produção conferida anteriormente permanece em `dfe8d8d`. Completar a matriz visual restante antes de promover, sem tratar comandos históricos como execução já realizada.
