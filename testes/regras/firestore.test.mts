// Testes das regras do Firestore, rodando no emulador (npm run test:regras).
// Confirmam que o navegador não lê nem grava nada diretamente: nem visitante,
// nem usuário logado sem papel, nem mesmo quem tem papel no painel (o painel
// acessa os dados só pelo servidor, com o Admin SDK).
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, setLogLevel, updateDoc } from "firebase/firestore";

// Os "PERMISSION_DENIED" são o resultado esperado; não precisam aparecer no terminal.
setLogLevel("silent");

// Projeto "demo-": o emulador não conversa com nenhum projeto real.
const PROJETO = "demo-abte-regras";

// Coleções previstas no modelo de dados (etapa 3) e uma qualquer.
// Toda coleção nova deve entrar nesta lista.
const COLECOES = [
  "configuracoes",
  "usuarios",
  "midias",
  "profissionais",
  "diretoria",
  "posts",
  "artigos",
  "produtos",
  "logAlteracoes",
  "qualquerColecao",
];

let ambiente: RulesTestEnvironment;

before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: PROJETO,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await ambiente.cleanup();
});

beforeEach(async () => {
  await ambiente.clearFirestore();
  // Um documento em cada coleção, criado sem regras, para testar leitura e edição.
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();
    for (const colecao of COLECOES) {
      await setDoc(doc(db, colecao, "existente"), { titulo: "exemplo" });
    }
  });
});

function testarSemAcesso(descricao: string, obterContexto: () => RulesTestContext) {
  describe(descricao, () => {
    for (const colecao of COLECOES) {
      test(`não lê nem grava em ${colecao}`, async () => {
        const db = obterContexto().firestore();
        await assertFails(getDoc(doc(db, colecao, "existente")));
        await assertFails(getDocs(collection(db, colecao)));
        await assertFails(setDoc(doc(db, colecao, "novo"), { titulo: "novo" }));
        await assertFails(updateDoc(doc(db, colecao, "existente"), { titulo: "alterado" }));
        await assertFails(deleteDoc(doc(db, colecao, "existente")));
      });
    }
  });
}

testarSemAcesso("Visitante sem login", () => ambiente.unauthenticatedContext());
testarSemAcesso("Usuário logado sem papel", () => ambiente.authenticatedContext("usuario-sem-papel"));
testarSemAcesso("Usuário com papel administrador (pelo navegador)", () =>
  ambiente.authenticatedContext("usuario-admin", { papel: "administrador" }),
);
testarSemAcesso("Usuário com papel editor (pelo navegador)", () =>
  ambiente.authenticatedContext("usuario-editor", { papel: "editor" }),
);
