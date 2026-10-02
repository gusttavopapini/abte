# Site da ABTE

Site e painel da ABTE, Associação Brasileira de Tratamento da Escoliose, em Next.js e Firebase.

Toda a documentação do projeto (stack, comandos, arquitetura, etapas, regras e pendências) está em [CLAUDE.md](CLAUDE.md).

Para rodar localmente:

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha (veja as instruções no próprio arquivo). O `.env.local` nunca vai para o Git.
3. `npm run dev` e abra http://localhost:3000

Para conferir o código:

- `npm run typecheck`, `npm run lint` e `npm run lint:css`
- `npm run test:unidade` (testes rápidos, sem emulador)
- `npm run test:regras` (regras do Firestore no emulador; exige Java)
