// Testes da conferência da migração no emulador do Firestore (npm run
// test:sessao), num projeto só deles (demo-abte-conferir): contagens e busca
// de endereço do Wix. Dados fictícios; nada sai da máquina.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { conferirMigracao } from "../../src/lib/migracao/conferencia.ts";

let app: App;
let db: Firestore;

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "rode com npm run test:sessao (emuladores)");
  app = initializeApp({ projectId: "demo-abte-conferir" }, "testes-conferencia-migracao");
  db = getFirestore(app);
  const origem = { sistema: "wix", chave: "x", execucao: "20261023-000000-0500" };
  await db.collection("posts").doc("importado").set({ titulo: "Fictício", conteudo: "Texto.\n\n![a](midia:wix:7dce06_abc~mv2.jpg)\n\n![b](midia:doc1)\n", origem, revisarMigracao: true });
  await db.collection("posts").doc("doPainel").set({ titulo: "Do painel", conteudo: "Sem imagem." });
  await db.collection("produtos").doc("comEndereco").set({ nome: "Fictício", descricao: "Veja https://static.wixstatic.com/media/x.jpg", origem, revisarMigracao: true });
  await db.collection("logAlteracoes").doc("r1").set({ origem: "migracao", colecao: "posts" });
});

after(async () => {
  await deleteApp(app);
});

describe("Conferência da migração (emulador)", () => {
  test("conta por coleção e acusa endereço do Wix, sem confundir com a imagem pendente pelo id", async () => {
    const resultado = await conferirMigracao(db);
    const de = (colecao: string) => resultado.colecoes.find((item) => item.colecao === colecao);
    assert.deepEqual([de("posts")?.total, de("posts")?.daMigracao, de("posts")?.paraRevisar, de("posts")?.comEnderecoDoWix], [2, 1, 1, []]);
    assert.deepEqual(de("produtos")?.comEnderecoDoWix, ["comEndereco"]);
    assert.deepEqual([de("logAlteracoes")?.total, de("logAlteracoes")?.daMigracao], [1, 1]);
    assert.deepEqual([resultado.imagensPendentesNoTexto, resultado.postsComImagemPendente, resultado.documentosComEnderecoDoWix], [1, 1, 1]);
  });
});
