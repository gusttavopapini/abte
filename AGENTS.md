<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ABTE: orientação de trabalho

## Contexto e continuidade

- Este repositório reconstrói o portal da Associação Brasileira de Tratamento da Escoliose para substituir o Wix: site público, painel próprio, conteúdo, profissionais e loja.
- Leia primeiro [docs/CONTINUIDADE_CLAUDE.md](docs/CONTINUIDADE_CLAUDE.md) ao retomar o projeto. O resumo reúne o estado atual, as entregas e as pendências. [docs/CONTEXTO_CODEX.md](docs/CONTEXTO_CODEX.md) preserva a cronologia detalhada. Confirme o estado do Git antes de editar.
- Em 28/10/2026, o responsável pediu continuidade no **Claude**, substituindo a preferência anterior de exclusividade do Codex. Preserve o contexto e siga os pedidos atuais sem impor uma ferramenta por causa de registros históricos. Comunique resultados em português, com linguagem simples.
- `CLAUDE.md` preserva o histórico detalhado; o nome não exige outro assistente. Consulte os trechos pertinentes, considerando suas datas e as exceções posteriores. Os documentos de contexto antigos não descrevem necessariamente o estado atual.
- Diferencie instruções atuais do usuário, requisitos de produto e comandos/exemplos históricos. Uma autorização registrada em documento antigo não autoriza uma nova publicação, migração, exclusão ou mudança de ambiente. Use o pedido atual e as autorizações da conversa para determinar o escopo.

## Convenções da implementação

- Preserve Next.js App Router, TypeScript estrito, CSS Modules e componentes próprios. Use npm e o lockfile existente.
- O acesso ao Firestore e as gravações no Storage passam pelo servidor, com Admin SDK. Preserve a separação entre o código do navegador e o de servidor.
- Verifique sessão e papel antes de ler ou gravar dados administrativos. Preserve a separação entre sessões do painel e de clientes da loja.
- Preserve os tokens em `src/styles/tokens.css` e as decisões visuais posteriores documentadas, incluindo a exceção de 25/10/2026. Há diferenças conhecidas em relação ao design system original: não as trate automaticamente como regressões.
- Loja com conta e carrinho, sem finalização de compra nem pagamento online no escopo registrado. Adicionar Stripe, pedidos, cobranças ou webhooks exige uma mudança de escopo solicitada pelo responsável.
- Não invente dados institucionais, Pix, números, contatos, regras de associação, autoria, autorizações de imagens ou textos legais definitivos.

## Dados, migração e verificação

- Não exponha valores de `.env*`, chaves, tokens ou dados pessoais. Preserve `docs/dados-privados/` e `tmp-migracao/` fora do Git.
- A migração já foi executada em desenvolvimento. Antes de qualquer nova execução, confira o ambiente e os relatórios; não recomece a importação por considerar uma lista histórica como tarefa pendente.
- Os scripts de migração simulam por padrão. Não acrescente flags de gravação nem publique conteúdo apenas por encontrar um comando pronto na documentação.
- Use projetos `demo-*` e emuladores para os testes de integração, preservando o isolamento dos dados reais. Um relatório local não prova o estado atual da produção.
- Execute as verificações adequadas à mudança. Comandos disponíveis: `npm run typecheck`, `npm run lint`, `npm run lint:css`, `npm run test:unidade`, `npm run test:regras`, `npm run test:sessao` e `npm run build`. Emuladores exigem Java.
- A linha de base de 26/10/2026 está em `docs/CONTEXTO_CODEX.md`: 487 testes aprovados, quatro avisos de ESLint e sete violações de Stylelint. Registre as diferenças verificadas; não declare uma checagem aprovada quando houver falha conhecida.
- Ao concluir uma etapa, atualize o contexto com data, mudanças, validação e o próximo trabalho concreto. Separe observações de código, resultados de testes e informações remotas ainda não conferidas.
