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
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, setLogLevel, updateDoc, where } from "firebase/firestore";

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
  "categoriasDeArtigos",
  "tagsDeArtigos",
  "categoriasDePosts",
  "tagsDePosts",
  "produtos",
  "categoriasDeProdutos",
  "logAlteracoes",
  "clientes",
  "carrinhos",
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

// Diretoria com o modelo mínimo da migração (22/10/2026): nem quem tem papel
// lê pelo navegador, nem por consulta pelo campo, nem cria um membro com os
// campos do modelo (o painel e a migração gravam só pelo servidor).
describe("Diretoria (modelo mínimo)", () => {
  const membro = { cargo: "Presidente", nome: "TESTE Pessoa", fotoMidiaId: null, periodo: "2025-2027", ordem: 1, profissionalId: null, origem: { sistema: "wix", chave: "presidente", execucao: "20261023-000000-0000" }, excluidoEm: null };
  const contextos: [string, () => RulesTestContext][] = [
    ["visitante", () => ambiente.unauthenticatedContext()],
    ["administrador", () => ambiente.authenticatedContext("usuario-admin", { papel: "administrador" })],
    ["editor", () => ambiente.authenticatedContext("usuario-editor", { papel: "editor" })],
  ];
  for (const [quem, obterContexto] of contextos) {
    test(`${quem} não lê, não consulta e não grava membros da diretoria`, async () => {
      const db = obterContexto().firestore();
      await assertFails(getDocs(query(collection(db, "diretoria"), where("periodo", "==", "2025-2027"))));
      await assertFails(setDoc(doc(db, "diretoria", "novoMembro"), membro));
      await assertFails(updateDoc(doc(db, "diretoria", "existente"), { profissionalId: "qualquer" }));
      await assertFails(getDoc(doc(db, "diretoria", "existente", "sub", "x")));
    });
  }
});

// Imagens da home (29/10/2026): o documento configuracoes/home só é lido e
// gravado pelo servidor; nem administrador nem editor o leem ou gravam pelo
// navegador.
describe("Configurações da home", () => {
  const home = { banners: [{ chave: "banner-teste0001", ordem: 1, midiaId: "m1", alt: "Teste", href: "/loja", ativo: true }], imagens: { "secao-mutiroes": { midiaId: "m1", alt: "Teste" } } };
  const contextos: [string, () => RulesTestContext][] = [
    ["visitante", () => ambiente.unauthenticatedContext()],
    ["logado sem papel", () => ambiente.authenticatedContext("usuario-sem-papel")],
    ["administrador", () => ambiente.authenticatedContext("usuario-admin", { papel: "administrador" })],
    ["editor", () => ambiente.authenticatedContext("usuario-editor", { papel: "editor" })],
  ];
  for (const [quem, obterContexto] of contextos) {
    test(`${quem} não lê nem grava configuracoes/home`, async () => {
      await ambiente.withSecurityRulesDisabled(async (contexto) => {
        await setDoc(doc(contexto.firestore(), "configuracoes", "home"), home);
      });
      const db = obterContexto().firestore();
      await assertFails(getDoc(doc(db, "configuracoes", "home")));
      await assertFails(setDoc(doc(db, "configuracoes", "home"), home));
      await assertFails(updateDoc(doc(db, "configuracoes", "home"), { banners: [] }));
      await assertFails(deleteDoc(doc(db, "configuracoes", "home")));
    });
  }
});
