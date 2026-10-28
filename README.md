# Site da ABTE

Site e painel da ABTE, Associação Brasileira de Tratamento da Escoliose, em Next.js e Firebase.

## Contexto e continuidade

As entregas mais recentes foram feitas pelo Codex; em 28/10/2026, o responsável pediu continuidade no Claude. Comece pelo resumo atualizado, preservando o trabalho existente.

- [Resumo de continuidade para o Claude](docs/CONTINUIDADE_CLAUDE.md): visão do projeto, entregas concluídas, estado do Git e pendências reais.
- [AGENTS.md](AGENTS.md): instruções de trabalho do repositório.
- [Contexto do projeto para o Codex](docs/CONTEXTO_CODEX.md): objetivo, arquitetura, estado verificado, pendências e próximos passos.
- [CLAUDE.md](CLAUDE.md): histórico detalhado das etapas e decisões. Considere as datas dos registros; o nome do arquivo não exige outro assistente.

O projeto já tem site público, painel administrativo, biblioteca de mídia, conta de cliente e carrinho. A migração principal foi executada em desenvolvimento. Em 28/10/2026, todos os 71 posts e cinco artigos cadastrados foram publicados; revisão editorial e preparação do lançamento continuam pendentes. Pagamento online permanece fora do escopo registrado.

## Desenvolvimento

Requisitos: Node.js 22.18 ou superior; Java para os testes com emuladores Firebase.

Para rodar localmente:

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha (veja as instruções no próprio arquivo). O `.env.local` nunca vai para o Git.
3. `npm run dev` e abra http://localhost:3000

Para conferir o código:

- `npm run typecheck`, `npm run lint` e `npm run lint:css`
- `npm run test:unidade` (testes rápidos, sem emulador)
- `npm run test:regras` (regras do Firestore e do Storage nos emuladores; exige Java)
- `npm run test:sessao` (sessões, gravações e migração nos emuladores)
- `npm run build` (compilação de produção)

As credenciais e os dados privados da migração ficam fora do Git. Os testes de integração usam projetos demonstrativos; confira o ambiente antes de executar comandos que gravem ou publiquem dados.
