# Auditoria do projeto ABTE — 06/11/2026

## Situação encontrada

O projeto é a reconstrução do portal da Associação Brasileira de Tratamento da Escoliose, substituindo o Wix por um site com painel próprio. A base funcional avançou bastante desde a revisão de 30/10: o painel recebeu ações completas de conteúdo, listas compartilhadas, lixeira e importação de profissionais. A rodada de 06/11 acrescentou ajustes da home e proteção dos formulários. O trabalho local de telefones ainda não estava registrado em commit.

A auditoria encontrou problemas reais, inclusive um erro que impedia a compilação e alertas críticos na versão do Next.js. Foram preparadas correções no código, verificadas em uma cópia isolada e aplicadas ao repositório original. O projeto passa nas verificações descritas abaixo, mas ainda possui pendências de segurança, integrações e lançamento. Não deve ser apresentado como pronto para lançamento definitivo.

## Alcance e limites

- Repositório: a pasta do projeto `abte`.
- Inventário inicial: **480 arquivos**, incluindo arquivos novos ainda fora do Git; **477 arquivos textuais** passaram pela varredura automatizada.
- Código principal: **356 arquivos em `src/`**, aproximadamente **36.904 linhas**, e **43 páginas** do App Router. Inicialmente havia **77 arquivos de testes** e **20 scripts**.
- Foram comparados histórico, diferenças locais, configuração, dependências, rotas, acesso, gravações, conteúdo público, loja, mídia, migração e componentes. Os fluxos importantes e as mudanças recentes tiveram revisão manual; os testes e a análise estática cobriram o conjunto do código incluído.
- Bibliotecas instaladas, arquivos gerados, `.git`, segredos de `.env*`, dados privados e relatórios de migração com dados pessoais ficaram fora do inventário de código.
- Nenhum navegador, Claude Chrome ou automação visual foi utilizado. Os registros históricos foram consultados como evidência depois de identificadas anomalias, sem executar instruções antigas.
- Não houve publicação, alteração de dados reais, nova migração, alteração de domínio nem aplicação de configuração na nuvem. O estado atual de produção não foi consultado.

Esta é uma auditoria ampla de código e testes. Não equivale a testar manualmente todas as telas em todos os aparelhos, auditar juridicamente o conteúdo ou provar ausência de qualquer defeito.

## Histórico e alterações anteriores à auditoria

Ponto inicial: branch `feature/midia-upload`, commit **`ebf1be6`**. São **34 commits** depois de `e533db8`, referência de 30/10. A comparação dessa referência com os arquivos rastreados do estado inicial mostrou **150 arquivos alterados, 7.504 linhas acrescentadas e 1.279 removidas**; os novos arquivos de telefones não entram nesse total.

As referências locais `origin/main` e `origin/feature/midia-upload` apontavam para `70e11ab`. A branch local tinha **11 commits posteriores**. As referências remotas não foram atualizadas nesta auditoria, portanto esses números não comprovam o que está publicado hoje.

| Período | Modificações encontradas |
|---|---|
| 31/10 | Texto do banner afastado das laterais, centralização até 1.023 px, composição em pilha e foco vertical das imagens |
| 04/11 — conteúdo | Publicar/despublicar, duplicar, lixeira, restauração, exclusão definitiva com confirmação e registro das alterações |
| 04/11 — painel | Listas comuns com busca, filtros, ordenação e ações em lote; navegação agrupada com ícones; trilha de navegação; botões de salvar; visão geral com atalhos e contagens |
| 04/11 — profissionais | Cadastro em lote com simulação, fotos e desfazer; ícone para perfil sem foto; filtro público por estado; retirada do Facebook dos perfis públicos |
| 06/11 — site | Centralização de blocos da home, novo texto da Missão, identificação de parceiros, ajustes na Diretoria e na página não encontrada, movimentação e indicação do slide atual |
| 06/11 — formulários | Janelas de edição com barra de salvar e aviso de alterações não salvas |
| Trabalho local sem commit | Campo com até três telefones, validação, exibição pública com ligação, alterações do modelo e dos testes, novo importador de telefones |

As alterações locais anteriores foram preservadas. O histórico do Git não permite identificar sozinho qual assistente escreveu cada linha; as conclusões se baseiam no código e nas reproduções das falhas.

## Mapa funcional

| Área | O que existe no código |
|---|---|
| Estrutura | Next.js App Router, React, TypeScript estrito, CSS Modules, tokens visuais e componentes próprios |
| Home | Banners administráveis com imagens específicas para celular/tablet/desktop, texto e botões sobrepostos, navegação lateral, foco da imagem, vídeo e seções institucionais |
| Blog | Lista pública, busca combinada com categoria, prévia curta, página completa, Markdown restrito e imagens da biblioteca |
| Artigos | Categorias, tags, listagem, detalhe, autoria e ligação para a publicação; disponibilidade geral controlada pela configuração do site |
| Profissionais | Tipos, métodos, país/estado/cidades, telerreabilitação, foto ou ícone, contatos, filtros e apresentação em card/popup; os dados enviados ao navegador seguem uma lista explícita de campos públicos |
| Diretoria e páginas | Diretoria pública; páginas institucionais e legais editáveis, com publicação controlada; associação, doação e contato |
| Loja | Produtos físicos/digitais, categorias, galeria, preço e promoção, filtros, conta do cliente, login, recuperação de senha e carrinho persistente |
| Painel | Papéis de administrador/editor, gestão de conteúdo, profissionais, produtos, tópicos, mídia, home, configurações e páginas; listas, lixeira e registro de alterações |
| Segurança de acesso | Sessões do painel e da loja separadas; verificação de cookies e revogação no servidor; permissões por ação; Firestore fechado ao acesso direto do navegador |
| Mídia | Processamento e variantes de imagens no servidor; lixeira e verificação de uso; envio de vídeo autorizado pelo servidor por política assinada ou sessão retomável |
| Migração | Coleta, conversão, classificação, publicação e desfazer; scripts simulam por padrão; testes com projetos `demo-*` |

**Pagamento, checkout, pedidos, cobrança e webhooks não existem no escopo atual.** O carrinho não representa uma compra concluída.

## Anomalias corrigidas nesta auditoria

| Problema confirmado | Correção |
|---|---|
| Next.js 16.3.6 apontado com vulnerabilidades críticas | Next.js e `eslint-config-next` atualizados para **16.4.5**, com lockfile consistente e instalação limpa validada. A atualização removeu os alertas críticos da auditoria de dependências |
| Testes novos de telefones quebravam a checagem TypeScript e o build | Helpers de teste passaram a respeitar o resultado discriminado da validação, sem conversão insegura |
| Teste antigo de migração rejeitava o novo campo `telefones` | Passou a exigir explicitamente a lista vazia, mantendo as verificações que impedem importar campos antigos indevidos |
| Duplicação de post sem categoria e sem tags lançava erro | Consulta vazia ao Firestore eliminada; cópia criada como rascunho com endereço próprio |
| Falha inesperada no segundo item interrompia uma ação em lote | Falhas isoladas por item; resultado parcial preservado e itens seguintes processados |
| Post/artigo podia ser publicado após outra operação enviá-lo para a lixeira | Condição conferida novamente dentro da transação; artigos passaram a gravar conteúdo e registro na mesma transação |
| Listas e detalhes públicos confiavam apenas em `status` | Blog e artigos agora também excluem explicitamente conteúdo na lixeira, inclusive quando o documento está com estado inconsistente |
| Ações genéricas contornavam regras específicas de tópicos | Exclusão/restauração de categorias e tags encaminhadas às regras do gerenciador: vínculo em uso e conflito de nome continuam protegidos |
| Nome de confirmação podia ficar desatualizado antes de excluir definitivamente | Confirmação conferida novamente contra o documento lido na transação |
| Desfazer a importação podia apagar telefone editado entre consulta e gravação | Desfazer transacional, com nova conferência da marca da execução, telefones e WhatsApp; edição posterior preservada |
| Formulário de contato confirmava envio sem enviar mensagem | Confirmação falsa retirada do fluxo real; aviso informa indisponibilidade e mantém a mensagem preenchida. O estado de sucesso continua disponível apenas na demonstração de componentes |
| Legenda de vídeo em outra origem não tinha configuração completa | Player recebe `crossOrigin` quando há legenda; arquivo de CORS inclui GET/HEAD. A aplicação dessa configuração ao bucket continua pendente |
| Cinco violações antigas de CSS e duas cores inexistentes no detalhe do blog | Valores centralizados nos tokens sem mudar os valores fixos existentes; referências inexistentes substituídas por cores já disponíveis |

Foram acrescentados **11 testes**: sete reproduções do painel, três do importador de telefones e um da visibilidade pública. Os sete casos do painel falharam antes das correções e passaram depois. A perda de edição no desfazer dos telefones também foi reproduzida antes da correção.

As vulnerabilidades do Next.js foram conferidas nos avisos publicados: [execução de código na otimização de imagens](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [execução de código em funções com cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr) e [negação de serviço em Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r). Isso identifica versões afetadas; não demonstra que o site foi atacado ou que todas essas condições estavam presentes neste aplicativo.

## Verificação após as correções

Validação feita com os mesmos arquivos de código aplicados ao projeto, em uma cópia sem credenciais reais e com dependências instaladas independentemente.

| Verificação | Resultado |
|---|---|
| Instalação limpa (`npm ci`) | Aprovada com o lockfile atualizado |
| TypeScript | Aprovado, sem erros |
| ESLint | **0 erros**, três avisos existentes de imagens com `<img>` |
| Stylelint | **0 erros**; os cinco anteriores foram resolvidos |
| Unidade | **477/477** |
| Integração/sessão | **207/207**, com emuladores de Auth, Firestore e Storage |
| Regras de acesso | **118/118**, com emuladores |
| Total de testes | **802 aprovados, nenhuma falha** |
| Compilação de publicação | Aprovada com Next.js **16.4.5**, gerando **32 páginas estáticas** e as rotas dinâmicas |

A compilação isolada registrou avisos de credenciais Firebase ausentes ao usar os fallbacks previstos para páginas estáticas. Isso é esperado nessa cópia e não valida a conexão da implantação real ao Firebase. Os avisos de `<img>` são melhorias de desempenho pendentes, não falhas na compilação. A revisão automatizada de permissão de uma execução expirou; a repetição autorizada concluiu os testes normalmente.

## Pendências e riscos restantes

### Prioridade alta

1. **Dependências:** a auditoria final ainda aponta **42 pacotes com alertas**: 16 de severidade alta e 26 moderados, sem críticos. Separando as dependências de produção, são **13 pacotes**: seis altos e sete moderados. Há alertas diretos ou herdados envolvendo Firebase, gRPC e outras bibliotecas. É necessário avaliar os caminhos realmente usados e atualizar as cadeias afetadas. Não foi executado `audit fix --force`: ele sugere inclusive retornos a versões antigas e incompatíveis de Firebase/ferramentas. Contagens de pacotes não equivalem a 42 falhas independentes exploráveis no site.
2. **Exclusão de conta da loja:** apaga carrinho e documento do cliente antes de excluir o usuário no Authentication. Uma falha no último serviço pode deixar a operação incompleta e impedir nova tentativa pelo fluxo normal. Precisa de um procedimento recuperável entre os dois serviços, com testes de falha parcial.
3. **Integridade de vínculos concorrentes:** algumas verificações de categoria/tag/mídia são feitas antes da gravação. Um vínculo criado ou removido ao mesmo tempo pode escapar da conferência. As correções da lixeira não tornam toda a integridade referencial do projeto atômica.

### Funcionalidade e preparação para lançamento

- **Contato:** a interface agora é honesta, mas o serviço real de entrega/armazenamento ainda precisa ser definido e integrado.
- **Validação editorial no servidor:** posts e artigos ainda dependem parcialmente dos campos obrigatórios do navegador. Reforçar título/conteúdo/autoria e validar o endereço do artigo também no servidor; hoje campos vazios ou endereços inadequados podem chegar por uma chamada direta autenticada.
- **Telefones:** o código foi preservado e testado, mas a importação real não foi executada. Antes de executar, revisar o plano, as prioridades entre as duas regras e o limite de três telefones também no importador, que atualmente normaliza número a número e não aplica esse limite ao conjunto importado.
- **Vídeo:** o CORS foi ajustado no arquivo, mas não aplicado ao bucket. Reprodução com legenda e envio de arquivo ainda exigem conferência no ambiente efetivo.
- **SEO:** `robots.txt` e metadata continuam bloqueando indexação de todo o site, deliberadamente. Liberar o público apenas quando houver decisão de lançamento; manter painel e demonstração bloqueados.
- **Artigos e páginas legais:** há interruptores/estados que podem torná-los indisponíveis. O relatório de 05/11 registrava artigos desligados e páginas legais não publicadas. Esses estados não foram consultados nem alterados agora.
- **Conteúdo e infraestrutura:** domínio, ambiente definitivo da ABTE, dados institucionais, Pix, revisão legal, fotos e autorizações editoriais precisam de conferência. O relatório antigo dizia que a implantação pública usava o banco de desenvolvimento; isso é uma informação histórica, sem confirmação remota nesta rodada.
- **Banners:** o código suporta três formatos de imagem por slide. O repositório guarda apenas o logo como arquivo público local; as imagens reais são gerenciadas pela biblioteca/configuração do Firebase. A substituição efetiva pelos nove arquivos enviados anteriormente não pode ser comprovada apenas por este inventário local.
- **Experiência e desempenho:** falta uma rodada visual em celular/tablet/desktop, com navegação por teclado, formulários e upload. Listas que leem coleções inteiras e consulta de todos os carrinhos na exclusão de produto devem ganhar paginação/consulta mais específica se o volume crescer.

## Continuidade recomendada

A próxima etapa deve tratar as dependências restantes e os fluxos de falha parcial, reforçar validações editoriais e concluir o contato. Depois, conferir configurações e conteúdo no ambiente correto, validar as telas e preparar a publicação como uma etapa separada.

As correções desta auditoria ficam **locais, sem commit, push ou deploy automático**. Os registros anteriores permanecem históricos; este documento é a referência da inspeção de código de 06/11/2026.
